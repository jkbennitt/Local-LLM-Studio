/**
 * Memory Management System for Replit Infrastructure
 * Optimizes ML training for constrained environments
 */

import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface MemoryMetrics {
  total: number;
  available: number;
  used: number;
  percentage: number;
  mlProcesses: ProcessMemory[];
  recommendations: string[];
}

export interface ProcessMemory {
  pid: number;
  name: string;
  memory: number;
  cpu: number;
  jobId?: number;
}

export interface MemoryOptimizationStrategy {
  name: string;
  description: string;
  apply: () => Promise<void>;
  estimatedSavings: number;
  risk: 'low' | 'medium' | 'high';
}

export class MemoryManager {
  private readonly lowMemoryThreshold = 0.85; // 85% usage
  private readonly criticalMemoryThreshold = 0.95; // 95% usage
  private memoryAlerts: Map<string, Date> = new Map();
  private optimizationHistory: string[] = [];
  
  /**
   * Get current memory metrics
   */
  async getMemoryMetrics(): Promise<MemoryMetrics> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const percentage = (usedMemory / totalMemory) * 100;
    
    // Get ML process memory usage
    const mlProcesses = await this.getMLProcessMemory();
    
    // Generate recommendations
    const recommendations = this.generateMemoryRecommendations(percentage, mlProcesses);
    
    return {
      total: totalMemory,
      available: freeMemory,
      used: usedMemory,
      percentage,
      mlProcesses,
      recommendations
    };
  }
  
  /**
   * Get memory usage of ML processes
   */
  private async getMLProcessMemory(): Promise<ProcessMemory[]> {
    try {
      // Get Python processes (ML training)
      const { stdout } = await execAsync(
        'ps aux | grep python | grep -v grep | awk \'{print $2 " " $3 " " $4 " " $11}\''
      );
      
      const processes: ProcessMemory[] = [];
      const lines = stdout.trim().split('\n').filter(line => line);
      
      for (const line of lines) {
        const [pid, cpu, mem, ...cmdParts] = line.split(' ');
        const cmd = cmdParts.join(' ');
        
        // Check if it's an ML process
        if (cmd.includes('ml_service.py')) {
          processes.push({
            pid: parseInt(pid),
            name: 'ML Training',
            memory: parseFloat(mem),
            cpu: parseFloat(cpu),
            jobId: this.extractJobId(cmd)
          });
        }
      }
      
      return processes;
    } catch (error) {
      console.error('Error getting ML process memory:', error);
      return [];
    }
  }
  
  /**
   * Extract job ID from command line
   */
  private extractJobId(cmd: string): number | undefined {
    const match = cmd.match(/--job-id\s+(\d+)/);
    return match ? parseInt(match[1]) : undefined;
  }
  
  /**
   * Generate memory optimization recommendations
   */
  private generateMemoryRecommendations(
    memoryPercentage: number,
    mlProcesses: ProcessMemory[]
  ): string[] {
    const recommendations: string[] = [];
    
    if (memoryPercentage > this.criticalMemoryThreshold) {
      recommendations.push('⚠️ Critical memory usage! Consider stopping non-essential jobs.');
      recommendations.push('💡 Reduce batch sizes for running jobs to free memory.');
    } else if (memoryPercentage > this.lowMemoryThreshold) {
      recommendations.push('⚡ Memory usage is high. Monitor closely.');
      recommendations.push('💡 Consider using gradient checkpointing for large models.');
    }
    
    // Check for memory-hungry processes
    const highMemoryProcesses = mlProcesses.filter(p => p.memory > 10);
    if (highMemoryProcesses.length > 0) {
      recommendations.push(
        `📊 ${highMemoryProcesses.length} ML process(es) using significant memory.`
      );
    }
    
    // Suggest optimizations based on current state
    if (mlProcesses.length > 2) {
      recommendations.push('💡 Multiple training jobs running. Consider queuing some.');
    }
    
    return recommendations;
  }
  
  /**
   * Optimize memory for ML training
   */
  async optimizeForMLTraining(
    modelSize: number,
    datasetSize: number,
    currentConfig: any
  ): Promise<{
    optimizedConfig: any;
    strategies: MemoryOptimizationStrategy[];
  }> {
    const metrics = await this.getMemoryMetrics();
    const availableMemory = metrics.available;
    
    // Calculate memory requirements
    const estimatedMemory = this.estimateMemoryRequirements(
      modelSize,
      datasetSize,
      currentConfig
    );
    
    // Generate optimization strategies
    const strategies = this.generateOptimizationStrategies(
      estimatedMemory,
      availableMemory,
      currentConfig
    );
    
    // Apply automatic optimizations
    const optimizedConfig = await this.applyAutomaticOptimizations(
      currentConfig,
      estimatedMemory,
      availableMemory
    );
    
    return { optimizedConfig, strategies };
  }
  
  /**
   * Estimate memory requirements
   */
  private estimateMemoryRequirements(
    modelSize: number,
    datasetSize: number,
    config: any
  ): number {
    // Base memory for Python and libraries
    const baseMemory = 512 * 1024 * 1024; // 512MB
    
    // Model memory (parameters + gradients + optimizer states)
    const modelMemory = modelSize * 4 * 3; // 4 bytes per param, 3x for gradients/optimizer
    
    // Batch memory
    const batchMemory = config.batch_size * config.max_length * 4 * 1024; // Rough estimate
    
    // Dataset memory (loaded portion)
    const datasetMemory = Math.min(datasetSize, 500 * 1024 * 1024); // Cap at 500MB
    
    // Add safety buffer
    const totalMemory = (baseMemory + modelMemory + batchMemory + datasetMemory) * 1.2;
    
    return totalMemory;
  }
  
  /**
   * Generate optimization strategies
   */
  private generateOptimizationStrategies(
    requiredMemory: number,
    availableMemory: number,
    config: any
  ): MemoryOptimizationStrategy[] {
    const strategies: MemoryOptimizationStrategy[] = [];
    
    if (requiredMemory > availableMemory) {
      // Critical: Need aggressive optimization
      strategies.push({
        name: 'Reduce Batch Size',
        description: `Reduce batch size from ${config.batch_size} to ${Math.max(1, Math.floor(config.batch_size / 2))}`,
        apply: async () => {
          config.batch_size = Math.max(1, Math.floor(config.batch_size / 2));
        },
        estimatedSavings: requiredMemory * 0.3,
        risk: 'low'
      });
      
      strategies.push({
        name: 'Enable Gradient Checkpointing',
        description: 'Trade computation for memory by recomputing activations',
        apply: async () => {
          config.gradient_checkpointing = true;
        },
        estimatedSavings: requiredMemory * 0.4,
        risk: 'low'
      });
      
      strategies.push({
        name: 'Use Mixed Precision (FP16)',
        description: 'Use 16-bit floating point to reduce memory usage',
        apply: async () => {
          config.mixed_precision = true;
        },
        estimatedSavings: requiredMemory * 0.3,
        risk: 'medium'
      });
    }
    
    // Always available optimizations
    strategies.push({
      name: 'Clear Cache',
      description: 'Clear Python and system caches',
      apply: async () => {
        await this.clearCaches();
      },
      estimatedSavings: 200 * 1024 * 1024, // 200MB estimate
      risk: 'low'
    });
    
    strategies.push({
      name: 'Optimize Dataset Loading',
      description: 'Use streaming dataset loading instead of loading all at once',
      apply: async () => {
        config.streaming = true;
      },
      estimatedSavings: 500 * 1024 * 1024, // 500MB estimate
      risk: 'low'
    });
    
    return strategies;
  }
  
  /**
   * Apply automatic optimizations
   */
  private async applyAutomaticOptimizations(
    config: any,
    requiredMemory: number,
    availableMemory: number
  ): Promise<any> {
    const optimized = { ...config };
    
    // Calculate memory pressure
    const memoryPressure = requiredMemory / availableMemory;
    
    if (memoryPressure > 1.5) {
      // Severe memory pressure - apply all optimizations
      optimized.batch_size = Math.max(1, Math.floor(config.batch_size / 4));
      optimized.gradient_checkpointing = true;
      optimized.mixed_precision = true;
      optimized.gradient_accumulation_steps = 4;
      optimized.streaming = true;
      
      this.logOptimization('Severe memory pressure: Applied all optimizations');
      
    } else if (memoryPressure > 1.2) {
      // High memory pressure - apply moderate optimizations
      optimized.batch_size = Math.max(2, Math.floor(config.batch_size / 2));
      optimized.gradient_checkpointing = true;
      optimized.gradient_accumulation_steps = 2;
      
      this.logOptimization('High memory pressure: Applied moderate optimizations');
      
    } else if (memoryPressure > 0.9) {
      // Moderate pressure - apply light optimizations
      optimized.batch_size = Math.max(4, Math.floor(config.batch_size * 0.75));
      optimized.mixed_precision = true;
      
      this.logOptimization('Moderate memory pressure: Applied light optimizations');
    }
    
    // Replit-specific optimizations
    if (process.env.REPL_ID) {
      optimized.num_workers = 0; // Disable multiprocessing on Replit
      optimized.pin_memory = false; // Disable pinned memory
      optimized.persistent_workers = false;
      
      this.logOptimization('Applied Replit-specific optimizations');
    }
    
    return optimized;
  }
  
  /**
   * Clear system and Python caches
   */
  private async clearCaches(): Promise<void> {
    try {
      // Clear Python cache
      await execAsync('find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true');
      
      // Clear pip cache
      await execAsync('pip cache purge 2>/dev/null || true');
      
      // Force garbage collection in Node
      if (global.gc) {
        global.gc();
      }
      
      this.logOptimization('Cleared system and Python caches');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }
  
  /**
   * Monitor memory and trigger alerts
   */
  async monitorMemory(): Promise<void> {
    const metrics = await this.getMemoryMetrics();
    
    if (metrics.percentage > this.criticalMemoryThreshold) {
      this.triggerMemoryAlert('critical', metrics);
    } else if (metrics.percentage > this.lowMemoryThreshold) {
      this.triggerMemoryAlert('warning', metrics);
    }
  }
  
  /**
   * Trigger memory alert
   */
  private triggerMemoryAlert(level: 'warning' | 'critical', metrics: MemoryMetrics) {
    const lastAlert = this.memoryAlerts.get(level);
    const now = new Date();
    
    // Don't spam alerts - wait at least 5 minutes between same level
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < 5 * 60 * 1000) {
      return;
    }
    
    this.memoryAlerts.set(level, now);
    
    console.log(`[MEMORY ${level.toUpperCase()}] Usage at ${metrics.percentage.toFixed(1)}%`);
    console.log(`Available: ${(metrics.available / (1024 * 1024)).toFixed(0)}MB`);
    
    if (metrics.recommendations.length > 0) {
      console.log('Recommendations:');
      metrics.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
  }
  
  /**
   * Estimate memory for different model architectures
   */
  getModelMemoryEstimate(modelName: string): number {
    const estimates: Record<string, number> = {
      // Transformer models (in bytes)
      'gpt2': 124 * 1024 * 1024 * 4,              // 124M params * 4 bytes
      'distilbert-base-uncased': 66 * 1024 * 1024 * 4,    // 66M params
      'google/bert_uncased_L-2_H-128_A-2': 4 * 1024 * 1024 * 4,  // 4M params
      
      // Custom models
      'small-transformer': 10 * 1024 * 1024 * 4,   // 10M params
      'tiny-transformer': 2 * 1024 * 1024 * 4,     // 2M params
    };
    
    return estimates[modelName] || 100 * 1024 * 1024 * 4; // Default 100M params
  }
  
  /**
   * Get memory-efficient training configuration
   */
  getEfficientConfig(modelName: string, availableMemory: number): any {
    const modelMemory = this.getModelMemoryEstimate(modelName);
    const memoryRatio = modelMemory / availableMemory;
    
    if (memoryRatio > 0.5) {
      // Very constrained - minimal configuration
      return {
        batch_size: 1,
        gradient_accumulation_steps: 8,
        gradient_checkpointing: true,
        mixed_precision: true,
        max_length: 128,
        streaming: true,
        num_workers: 0
      };
    } else if (memoryRatio > 0.3) {
      // Constrained - conservative configuration
      return {
        batch_size: 2,
        gradient_accumulation_steps: 4,
        gradient_checkpointing: true,
        mixed_precision: true,
        max_length: 256,
        streaming: true,
        num_workers: 0
      };
    } else {
      // Comfortable - balanced configuration
      return {
        batch_size: 4,
        gradient_accumulation_steps: 2,
        gradient_checkpointing: false,
        mixed_precision: true,
        max_length: 512,
        streaming: false,
        num_workers: 0
      };
    }
  }
  
  /**
   * Log optimization action
   */
  private logOptimization(action: string) {
    const timestamp = new Date().toISOString();
    this.optimizationHistory.push(`[${timestamp}] ${action}`);
    
    // Keep only last 100 entries
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory = this.optimizationHistory.slice(-100);
    }
  }
  
  /**
   * Get optimization history
   */
  getOptimizationHistory(): string[] {
    return [...this.optimizationHistory];
  }
  
  /**
   * Create memory usage report
   */
  async createMemoryReport(): Promise<string> {
    const metrics = await this.getMemoryMetrics();
    
    const report = `
Memory Usage Report
==================
Timestamp: ${new Date().toISOString()}

System Memory:
- Total: ${(metrics.total / (1024 * 1024 * 1024)).toFixed(2)} GB
- Used: ${(metrics.used / (1024 * 1024 * 1024)).toFixed(2)} GB (${metrics.percentage.toFixed(1)}%)
- Available: ${(metrics.available / (1024 * 1024 * 1024)).toFixed(2)} GB

ML Processes:
${metrics.mlProcesses.map(p => 
  `- PID ${p.pid}: ${p.name} (Job ${p.jobId || 'N/A'}) - Memory: ${p.memory.toFixed(1)}%, CPU: ${p.cpu.toFixed(1)}%`
).join('\n')}

Recommendations:
${metrics.recommendations.map(r => `- ${r}`).join('\n')}

Recent Optimizations:
${this.optimizationHistory.slice(-5).join('\n')}
`;
    
    return report;
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();