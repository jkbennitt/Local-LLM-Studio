/**
 * Smart Resource Detection System
 * Automatically detects available resources and adjusts training parameters
 */

import { promisify } from 'util';
import { exec } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { memoryManager } from './memory_manager';

const execAsync = promisify(exec);

export interface SystemResources {
  cpu: {
    cores: number;
    usage: number;
    model: string;
    architecture: string;
  };
  memory: {
    total: number;
    available: number;
    usage: number;
    swapTotal: number;
    swapAvailable: number;
  };
  gpu: {
    available: boolean;
    model?: string;
    memoryTotal?: number;
    memoryAvailable?: number;
    cudaVersion?: string;
  };
  storage: {
    totalSpace: number;
    availableSpace: number;
    ioSpeed: number;
  };
  network: {
    bandwidth: number;
    latency: number;
  };
}

export interface OptimizedTrainingConfig {
  model: {
    name: string;
    variant: string;
    size: string;
    quantization: boolean;
  };
  training: {
    batchSize: number;
    gradientAccumulationSteps: number;
    maxLength: number;
    epochs: number;
    learningRate: number;
    warmupSteps: number;
  };
  optimization: {
    fp16: boolean;
    gradientCheckpointing: boolean;
    dataloader: {
      numWorkers: number;
      pinMemory: boolean;
    };
  };
  fallback: {
    enabled: boolean;
    alternatives: Array<{
      name: string;
      description: string;
      config: Partial<OptimizedTrainingConfig>;
    }>;
  };
}

export class ResourceDetector {
  private cachedResources?: SystemResources;
  private cacheExpiry?: Date;
  private readonly cacheLifetime = 60000; // 1 minute

  /**
   * Detect all available system resources
   */
  async detectResources(): Promise<SystemResources> {
    // Return cached resources if still valid
    if (this.cachedResources && this.cacheExpiry && new Date() < this.cacheExpiry) {
      return this.cachedResources;
    }

    const resources: SystemResources = {
      cpu: await this.detectCPU(),
      memory: await this.detectMemory(),
      gpu: await this.detectGPU(),
      storage: await this.detectStorage(),
      network: await this.detectNetwork()
    };

    // Cache resources
    this.cachedResources = resources;
    this.cacheExpiry = new Date(Date.now() + this.cacheLifetime);

    return resources;
  }

  /**
   * Generate optimized training configuration based on available resources
   */
  async generateOptimizedConfig(
    modelName: string,
    datasetSize: number,
    priority: 'speed' | 'quality' | 'memory' = 'memory'
  ): Promise<OptimizedTrainingConfig> {
    const resources = await this.detectResources();
    
    // Base configuration
    const config: OptimizedTrainingConfig = {
      model: {
        name: modelName,
        variant: 'base',
        size: 'small',
        quantization: false
      },
      training: {
        batchSize: 1,
        gradientAccumulationSteps: 1,
        maxLength: 512,
        epochs: 3,
        learningRate: 5e-5,
        warmupSteps: 100
      },
      optimization: {
        fp16: false,
        gradientCheckpointing: false,
        dataloader: {
          numWorkers: 1,
          pinMemory: false
        }
      },
      fallback: {
        enabled: true,
        alternatives: []
      }
    };

    // Optimize based on available resources
    this.optimizeForMemory(config, resources);
    this.optimizeForCPU(config, resources);
    this.optimizeForGPU(config, resources);
    this.optimizeForDataset(config, datasetSize);
    
    // Apply priority-based adjustments
    this.applyPriorityOptimizations(config, priority, resources);
    
    // Generate fallback alternatives
    this.generateFallbackAlternatives(config, resources);

    return config;
  }

  /**
   * Detect CPU specifications
   */
  private async detectCPU(): Promise<SystemResources['cpu']> {
    try {
      const cpuInfo = await this.getCPUInfo();
      const usage = await this.getCPUUsage();
      
      return {
        cores: cpuInfo.cores,
        usage,
        model: cpuInfo.model,
        architecture: cpuInfo.architecture
      };
    } catch (error) {
      return {
        cores: 1,
        usage: 50,
        model: 'Unknown',
        architecture: 'x86_64'
      };
    }
  }

  /**
   * Detect memory specifications
   */
  private async detectMemory(): Promise<SystemResources['memory']> {
    try {
      const memInfo = await memoryManager.getMemoryMetrics();
      
      return {
        total: memInfo.total,
        available: memInfo.available,
        usage: memInfo.percentage,
        swapTotal: await this.getSwapTotal(),
        swapAvailable: await this.getSwapAvailable()
      };
    } catch (error) {
      return {
        total: 1024,
        available: 512,
        usage: 50,
        swapTotal: 0,
        swapAvailable: 0
      };
    }
  }

  /**
   * Detect GPU specifications
   */
  private async detectGPU(): Promise<SystemResources['gpu']> {
    try {
      // Check for NVIDIA GPU
      const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.free --format=csv,noheader,nounits');
      const lines = stdout.trim().split('\n');
      
      if (lines.length > 0 && lines[0].trim()) {
        const [model, memoryTotal, memoryAvailable] = lines[0].split(',').map(s => s.trim());
        
        return {
          available: true,
          model,
          memoryTotal: parseInt(memoryTotal),
          memoryAvailable: parseInt(memoryAvailable),
          cudaVersion: await this.getCudaVersion()
        };
      }
    } catch (error) {
      // No NVIDIA GPU, check for other GPUs
      try {
        const { stdout } = await execAsync('lspci | grep -i vga');
        if (stdout.includes('Intel') || stdout.includes('AMD')) {
          return {
            available: true,
            model: 'Integrated Graphics',
            memoryTotal: 0,
            memoryAvailable: 0
          };
        }
      } catch (error) {
        // No GPU detected
      }
    }

    return {
      available: false
    };
  }

  /**
   * Detect storage specifications
   */
  private async detectStorage(): Promise<SystemResources['storage']> {
    try {
      const { stdout } = await execAsync('df -BM . | tail -1');
      const parts = stdout.trim().split(/\s+/);
      const totalSpace = parseInt(parts[1].replace('M', ''));
      const availableSpace = parseInt(parts[3].replace('M', ''));
      
      const ioSpeed = await this.measureIOSpeed();
      
      return {
        totalSpace,
        availableSpace,
        ioSpeed
      };
    } catch (error) {
      return {
        totalSpace: 10000,
        availableSpace: 5000,
        ioSpeed: 100
      };
    }
  }

  /**
   * Detect network specifications
   */
  private async detectNetwork(): Promise<SystemResources['network']> {
    try {
      const bandwidth = await this.measureNetworkBandwidth();
      const latency = await this.measureNetworkLatency();
      
      return {
        bandwidth,
        latency
      };
    } catch (error) {
      return {
        bandwidth: 100,
        latency: 50
      };
    }
  }

  /**
   * Optimize configuration for memory constraints
   */
  private optimizeForMemory(config: OptimizedTrainingConfig, resources: SystemResources): void {
    const availableMemory = resources.memory.available;
    
    if (availableMemory < 512) {
      // Very low memory
      config.model.size = 'tiny';
      config.model.quantization = true;
      config.training.batchSize = 1;
      config.training.gradientAccumulationSteps = 8;
      config.training.maxLength = 256;
      config.optimization.fp16 = true;
      config.optimization.gradientCheckpointing = true;
    } else if (availableMemory < 1024) {
      // Low memory
      config.model.size = 'small';
      config.training.batchSize = 2;
      config.training.gradientAccumulationSteps = 4;
      config.training.maxLength = 512;
      config.optimization.fp16 = true;
      config.optimization.gradientCheckpointing = true;
    } else if (availableMemory < 2048) {
      // Medium memory
      config.model.size = 'base';
      config.training.batchSize = 4;
      config.training.gradientAccumulationSteps = 2;
      config.training.maxLength = 512;
      config.optimization.fp16 = true;
    } else {
      // High memory
      config.model.size = 'large';
      config.training.batchSize = 8;
      config.training.gradientAccumulationSteps = 1;
      config.training.maxLength = 1024;
    }
  }

  /**
   * Optimize configuration for CPU
   */
  private optimizeForCPU(config: OptimizedTrainingConfig, resources: SystemResources): void {
    const cores = resources.cpu.cores;
    
    // Adjust data loader workers based on CPU cores
    config.optimization.dataloader.numWorkers = Math.min(cores - 1, 4);
    
    // Adjust batch size based on CPU capability
    if (cores <= 2) {
      config.training.batchSize = Math.min(config.training.batchSize, 2);
    } else if (cores <= 4) {
      config.training.batchSize = Math.min(config.training.batchSize, 4);
    }
  }

  /**
   * Optimize configuration for GPU
   */
  private optimizeForGPU(config: OptimizedTrainingConfig, resources: SystemResources): void {
    if (resources.gpu.available && resources.gpu.memoryTotal) {
      // Enable GPU optimizations
      config.optimization.dataloader.pinMemory = true;
      
      // Adjust batch size based on GPU memory
      if (resources.gpu.memoryTotal < 2048) {
        config.training.batchSize = Math.min(config.training.batchSize, 2);
      } else if (resources.gpu.memoryTotal < 4096) {
        config.training.batchSize = Math.min(config.training.batchSize, 4);
      } else {
        config.training.batchSize = Math.min(config.training.batchSize, 8);
      }
    }
  }

  /**
   * Optimize configuration for dataset size
   */
  private optimizeForDataset(config: OptimizedTrainingConfig, datasetSize: number): void {
    // Adjust epochs based on dataset size
    if (datasetSize < 100) {
      config.training.epochs = 10;
    } else if (datasetSize < 1000) {
      config.training.epochs = 5;
    } else {
      config.training.epochs = 3;
    }
    
    // Adjust warmup steps
    config.training.warmupSteps = Math.min(datasetSize * 0.1, 500);
  }

  /**
   * Apply priority-based optimizations
   */
  private applyPriorityOptimizations(
    config: OptimizedTrainingConfig,
    priority: 'speed' | 'quality' | 'memory',
    resources: SystemResources
  ): void {
    switch (priority) {
      case 'speed':
        config.training.epochs = Math.max(1, config.training.epochs - 1);
        config.training.batchSize = Math.min(config.training.batchSize * 2, 16);
        config.optimization.fp16 = true;
        break;
      
      case 'quality':
        config.training.epochs = config.training.epochs + 2;
        config.training.learningRate = config.training.learningRate * 0.8;
        config.training.warmupSteps = config.training.warmupSteps * 1.5;
        break;
      
      case 'memory':
        config.training.batchSize = Math.max(1, Math.floor(config.training.batchSize / 2));
        config.training.gradientAccumulationSteps = config.training.gradientAccumulationSteps * 2;
        config.optimization.gradientCheckpointing = true;
        break;
    }
  }

  /**
   * Generate fallback alternatives
   */
  private generateFallbackAlternatives(config: OptimizedTrainingConfig, resources: SystemResources): void {
    config.fallback.alternatives = [
      {
        name: 'Ultra Light Mode',
        description: 'Minimal resource usage with basic training',
        config: {
          model: { 
            name: config.model.name,
            variant: 'tiny',
            size: 'tiny', 
            quantization: true 
          },
          training: { 
            batchSize: 1, 
            gradientAccumulationSteps: 8,
            maxLength: 128,
            epochs: 2,
            learningRate: 3e-5,
            warmupSteps: 50
          },
          optimization: { 
            fp16: true, 
            gradientCheckpointing: true,
            dataloader: { numWorkers: 1, pinMemory: false }
          }
        }
      },
      {
        name: 'CPU Only Mode',
        description: 'Optimized for CPU-only training',
        config: {
          training: { 
            batchSize: 1, 
            gradientAccumulationSteps: 8,
            maxLength: config.training.maxLength,
            epochs: config.training.epochs,
            learningRate: config.training.learningRate,
            warmupSteps: config.training.warmupSteps
          },
          optimization: { 
            fp16: false, 
            gradientCheckpointing: true,
            dataloader: { numWorkers: 1, pinMemory: false } 
          }
        }
      }
    ];

    if (resources.memory.available < 256) {
      config.fallback.alternatives.push({
        name: 'Extreme Memory Saving',
        description: 'For systems with very limited memory',
        config: {
          model: { 
            name: config.model.name,
            variant: 'nano',
            size: 'nano', 
            quantization: true 
          },
          training: { 
            batchSize: 1, 
            gradientAccumulationSteps: 16,
            maxLength: 64, 
            epochs: 1,
            learningRate: 2e-5,
            warmupSteps: 25
          },
          optimization: { 
            fp16: true, 
            gradientCheckpointing: true,
            dataloader: { numWorkers: 1, pinMemory: false }
          }
        }
      });
    }
  }

  /**
   * Helper methods for resource detection
   */
  private async getCPUInfo(): Promise<{ cores: number; model: string; architecture: string }> {
    try {
      const { stdout } = await execAsync('lscpu');
      const lines = stdout.split('\n');
      
      const coresLine = lines.find(line => line.includes('CPU(s):'));
      const modelLine = lines.find(line => line.includes('Model name:'));
      const archLine = lines.find(line => line.includes('Architecture:'));
      
      return {
        cores: parseInt(coresLine?.split(':')[1].trim() || '1'),
        model: modelLine?.split(':')[1].trim() || 'Unknown',
        architecture: archLine?.split(':')[1].trim() || 'x86_64'
      };
    } catch (error) {
      return { cores: 1, model: 'Unknown', architecture: 'x86_64' };
    }
  }

  private async getCPUUsage(): Promise<number> {
    try {
      const { stdout } = await execAsync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\'');
      return parseFloat(stdout.replace('%us,', ''));
    } catch (error) {
      return 50;
    }
  }

  private async getSwapTotal(): Promise<number> {
    try {
      const { stdout } = await execAsync('free -m | grep Swap | awk \'{print $2}\'');
      return parseInt(stdout.trim());
    } catch (error) {
      return 0;
    }
  }

  private async getSwapAvailable(): Promise<number> {
    try {
      const { stdout } = await execAsync('free -m | grep Swap | awk \'{print $4}\'');
      return parseInt(stdout.trim());
    } catch (error) {
      return 0;
    }
  }

  private async getCudaVersion(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync('nvcc --version | grep "release"');
      return stdout.match(/release (\d+\.\d+)/)?.[1];
    } catch (error) {
      return undefined;
    }
  }

  private async measureIOSpeed(): Promise<number> {
    try {
      const { stdout } = await execAsync('dd if=/dev/zero of=/tmp/test_io bs=1M count=10 2>&1 | grep copied');
      const match = stdout.match(/(\d+\.?\d*)\s+MB\/s/);
      return match ? parseFloat(match[1]) : 100;
    } catch (error) {
      return 100;
    }
  }

  private async measureNetworkBandwidth(): Promise<number> {
    // Simple bandwidth estimation (placeholder)
    return 100; // Mbps
  }

  private async measureNetworkLatency(): Promise<number> {
    try {
      const { stdout } = await execAsync('ping -c 1 8.8.8.8 | grep "time="');
      const match = stdout.match(/time=(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 50;
    } catch (error) {
      return 50;
    }
  }
}

export const resourceDetector = new ResourceDetector();