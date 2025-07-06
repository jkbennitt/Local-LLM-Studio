/**
 * Production-Ready ML Job Queue Manager
 * Handles efficient queuing, prioritization, and resource management for ML training jobs
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { TrainingJob } from '@shared/schema';
import { storage } from './storage';
import { deployment } from './deployment_config';
import { CustomError, ErrorFactory, ErrorRecovery } from './error_handler';
import { EducationalContentGenerator } from './educational_content';

export interface QueuedJob {
  id: number;
  userId: number;
  priority: 'high' | 'normal' | 'low';
  estimatedMemory: number;
  estimatedTime: number;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  config: any;
  datasetPath: string;
}

export interface JobMetrics {
  queueLength: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export class MLJobQueueManager extends EventEmitter {
  private queue: QueuedJob[] = [];
  private activeJobs: Map<number, ChildProcess> = new Map();
  private jobMetrics: JobMetrics = {
    queueLength: 0,
    activeJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    averageWaitTime: 0,
    averageProcessingTime: 0,
    memoryUsage: 0,
    cpuUsage: 0
  };
  
  private processingInterval: NodeJS.Timer | null = null;
  private metricsInterval: NodeJS.Timer | null = null;
  private readonly maxConcurrentJobs: number;
  private readonly memoryThreshold: number;
  
  constructor() {
    super();
    const config = deployment.getConfig();
    this.maxConcurrentJobs = config.ml.maxConcurrentJobs;
    this.memoryThreshold = config.ml.memoryLimit * 0.8; // Use 80% of available memory
    
    // Start queue processor
    this.startQueueProcessor();
    this.startMetricsCollector();
  }
  
  /**
   * Add a new job to the queue with intelligent prioritization
   */
  async enqueueJob(job: TrainingJob, datasetPath: string): Promise<QueuedJob> {
    // Estimate resource requirements
    const datasetStats = await this.analyzeDataset(datasetPath);
    const estimatedMemory = this.estimateMemoryRequirements(datasetStats, job.config);
    const estimatedTime = this.estimateTrainingTime(datasetStats, job.config);
    
    // Determine priority based on multiple factors
    const priority = this.calculatePriority(job, estimatedTime, estimatedMemory);
    
    const queuedJob: QueuedJob = {
      id: job.id,
      userId: job.userId!,
      priority,
      estimatedMemory,
      estimatedTime,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      config: job.config,
      datasetPath
    };
    
    // Insert into queue based on priority
    this.insertIntoQueue(queuedJob);
    
    // Update job status
    await storage.updateTrainingJob(job.id, { 
      status: 'pending',
      metrics: {
        ...job.metrics,
        queuePosition: this.getQueuePosition(job.id),
        estimatedStartTime: this.estimateStartTime(job.id)
      }
    });
    
    this.emit('job:queued', queuedJob);
    return queuedJob;
  }
  
  /**
   * Start processing queued jobs
   */
  private startQueueProcessor() {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000); // Check every 5 seconds
  }
  
  /**
   * Process the job queue with resource-aware scheduling
   */
  private async processQueue() {
    // Check if we can process more jobs
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      return;
    }
    
    // Check available memory
    const availableMemory = await this.getAvailableMemory();
    if (availableMemory < this.memoryThreshold * 0.2) {
      console.log('Insufficient memory for new jobs');
      return;
    }
    
    // Find next eligible job
    const nextJob = this.findNextEligibleJob(availableMemory);
    if (!nextJob) {
      return;
    }
    
    // Start the job
    await this.startJob(nextJob);
  }
  
  /**
   * Find the next job that can be processed with available resources
   */
  private findNextEligibleJob(availableMemory: number): QueuedJob | null {
    for (let i = 0; i < this.queue.length; i++) {
      const job = this.queue[i];
      if (job.estimatedMemory <= availableMemory) {
        // Remove from queue
        this.queue.splice(i, 1);
        return job;
      }
    }
    return null;
  }
  
  /**
   * Start processing a job
   */
  private async startJob(queuedJob: QueuedJob) {
    try {
      queuedJob.startedAt = new Date();
      
      // Update job status
      await storage.updateTrainingJob(queuedJob.id, {
        status: 'running',
        startedAt: queuedJob.startedAt
      });
      
      // Spawn Python ML process
      const pythonProcess = spawn(
        deployment.getConfig().ml.pythonPath,
        [
          path.join(__dirname, 'ml_service.py'),
          'train',
          '--job-id', queuedJob.id.toString(),
          '--dataset', queuedJob.datasetPath,
          '--config', JSON.stringify(queuedJob.config)
        ],
        {
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            OMP_NUM_THREADS: '1', // Limit threads for stability
            TOKENIZERS_PARALLELISM: 'false'
          }
        }
      );
      
      // Store active process
      this.activeJobs.set(queuedJob.id, pythonProcess);
      
      // Handle process output
      pythonProcess.stdout.on('data', (data) => {
        this.handleJobOutput(queuedJob.id, data.toString());
      });
      
      pythonProcess.stderr.on('data', (data) => {
        this.handleJobError(queuedJob.id, data.toString());
      });
      
      pythonProcess.on('exit', async (code) => {
        await this.handleJobCompletion(queuedJob, code);
      });
      
      this.emit('job:started', queuedJob);
      
    } catch (error) {
      await this.handleJobFailure(queuedJob, error);
    }
  }
  
  /**
   * Handle job output and parse progress updates
   */
  private async handleJobOutput(jobId: number, output: string) {
    try {
      // Parse JSON output from Python
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.startsWith('{') && line.endsWith('}')) {
          const data = JSON.parse(line);
          
          if (data.type === 'progress') {
            await storage.updateTrainingJob(jobId, {
              metrics: data.metrics
            });
            this.emit('job:progress', { jobId, ...data });
          } else if (data.type === 'checkpoint') {
            // Save checkpoint for recovery
            await this.saveCheckpoint(jobId, data.checkpoint);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing job output:', error);
    }
  }
  
  /**
   * Handle job errors with recovery strategies
   */
  private async handleJobError(jobId: number, error: string) {
    console.error(`Job ${jobId} error:`, error);
    
    // Check for recoverable errors
    if (error.includes('CUDA out of memory') || error.includes('OOM')) {
      // Attempt recovery with reduced batch size
      const job = await storage.getTrainingJob(jobId);
      if (job && job.config.batch_size > 1) {
        console.log(`Attempting to recover job ${jobId} with reduced batch size`);
        await ErrorRecovery.recoverFromTrainingError(
          ErrorFactory.trainingOutOfMemory(job.config.batch_size * 512, 256),
          jobId
        );
      }
    }
    
    this.emit('job:error', { jobId, error });
  }
  
  /**
   * Handle job completion
   */
  private async handleJobCompletion(queuedJob: QueuedJob, exitCode: number | null) {
    this.activeJobs.delete(queuedJob.id);
    
    if (exitCode === 0) {
      // Success
      await storage.updateTrainingJob(queuedJob.id, {
        status: 'completed',
        completedAt: new Date()
      });
      
      this.jobMetrics.completedJobs++;
      this.emit('job:completed', queuedJob);
      
    } else if (queuedJob.retryCount < queuedJob.maxRetries) {
      // Retry with backoff
      queuedJob.retryCount++;
      const backoffDelay = Math.min(queuedJob.retryCount * 30000, 300000); // Max 5 min
      
      setTimeout(() => {
        this.insertIntoQueue(queuedJob);
      }, backoffDelay);
      
      await storage.updateTrainingJob(queuedJob.id, {
        status: 'pending',
        error: `Retry attempt ${queuedJob.retryCount}/${queuedJob.maxRetries}`
      });
      
    } else {
      // Final failure
      await storage.updateTrainingJob(queuedJob.id, {
        status: 'failed',
        completedAt: new Date(),
        error: `Job failed after ${queuedJob.maxRetries} retries`
      });
      
      this.jobMetrics.failedJobs++;
      this.emit('job:failed', queuedJob);
    }
  }
  
  /**
   * Handle job failure
   */
  private async handleJobFailure(queuedJob: QueuedJob, error: any) {
    console.error(`Failed to start job ${queuedJob.id}:`, error);
    
    await storage.updateTrainingJob(queuedJob.id, {
      status: 'failed',
      error: error.message || 'Unknown error'
    });
    
    this.jobMetrics.failedJobs++;
    this.emit('job:failed', queuedJob);
  }
  
  /**
   * Calculate job priority based on multiple factors
   */
  private calculatePriority(
    job: TrainingJob, 
    estimatedTime: number, 
    estimatedMemory: number
  ): 'high' | 'normal' | 'low' {
    let score = 0;
    
    // Smaller jobs get higher priority (quick wins)
    if (estimatedTime < 300) score += 2; // < 5 minutes
    if (estimatedMemory < 1024 * 1024 * 1024) score += 1; // < 1GB
    
    // User tier priority (would be based on subscription in production)
    // score += getUserTierScore(job.userId);
    
    // Age in queue (prevent starvation)
    const ageMinutes = (Date.now() - new Date(job.createdAt).getTime()) / 60000;
    if (ageMinutes > 30) score += 2;
    
    if (score >= 4) return 'high';
    if (score >= 2) return 'normal';
    return 'low';
  }
  
  /**
   * Insert job into queue maintaining priority order
   */
  private insertIntoQueue(job: QueuedJob) {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (priorityOrder[job.priority] < priorityOrder[this.queue[i].priority]) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, job);
    this.jobMetrics.queueLength = this.queue.length;
  }
  
  /**
   * Analyze dataset to estimate resource requirements
   */
  private async analyzeDataset(datasetPath: string): Promise<any> {
    try {
      const stats = await fs.stat(datasetPath);
      const fileSize = stats.size;
      
      // Sample first few lines to estimate complexity
      // In production, would use more sophisticated analysis
      
      return {
        fileSize,
        estimatedRows: Math.floor(fileSize / 100), // Rough estimate
        complexity: 'medium'
      };
    } catch (error) {
      return {
        fileSize: 0,
        estimatedRows: 100,
        complexity: 'low'
      };
    }
  }
  
  /**
   * Estimate memory requirements for training
   */
  private estimateMemoryRequirements(datasetStats: any, config: any): number {
    const baseMemory = 512 * 1024 * 1024; // 512MB base
    const modelMemory = this.getModelMemoryEstimate(config.model_name);
    const batchMemory = config.batch_size * 10 * 1024 * 1024; // 10MB per batch item
    const datasetMemory = Math.min(datasetStats.fileSize * 2, 1024 * 1024 * 1024); // Max 1GB
    
    return baseMemory + modelMemory + batchMemory + datasetMemory;
  }
  
  /**
   * Get model memory estimate
   */
  private getModelMemoryEstimate(modelName: string): number {
    const estimates: Record<string, number> = {
      'gpt2': 512 * 1024 * 1024,        // 512MB
      'distilbert-base-uncased': 256 * 1024 * 1024,  // 256MB
      'google/bert_uncased_L-2_H-128_A-2': 128 * 1024 * 1024  // 128MB
    };
    
    return estimates[modelName] || 512 * 1024 * 1024;
  }
  
  /**
   * Estimate training time based on dataset and config
   */
  private estimateTrainingTime(datasetStats: any, config: any): number {
    const rowsPerSecond = 10; // Conservative estimate
    const totalRows = datasetStats.estimatedRows * config.max_epochs;
    const baseTime = totalRows / rowsPerSecond;
    
    // Add overhead for model complexity
    const complexityMultiplier = {
      'gpt2': 2,
      'distilbert-base-uncased': 1.5,
      'google/bert_uncased_L-2_H-128_A-2': 1
    };
    
    const multiplier = complexityMultiplier[config.model_name] || 1.5;
    return Math.ceil(baseTime * multiplier);
  }
  
  /**
   * Get available memory
   */
  private async getAvailableMemory(): Promise<number> {
    const os = await import('os');
    return os.freemem();
  }
  
  /**
   * Get queue position for a job
   */
  private getQueuePosition(jobId: number): number {
    const index = this.queue.findIndex(job => job.id === jobId);
    return index + 1; // 1-based position
  }
  
  /**
   * Estimate when a job will start
   */
  private estimateStartTime(jobId: number): Date {
    const position = this.getQueuePosition(jobId);
    if (position === 0) return new Date();
    
    // Calculate based on current processing rate
    const averageJobTime = this.jobMetrics.averageProcessingTime || 300; // 5 min default
    const estimatedSeconds = position * averageJobTime / this.maxConcurrentJobs;
    
    return new Date(Date.now() + estimatedSeconds * 1000);
  }
  
  /**
   * Save training checkpoint
   */
  private async saveCheckpoint(jobId: number, checkpoint: any) {
    const checkpointPath = path.join(
      deployment.getConfig().storage.modelPath,
      `checkpoint_${jobId}_${Date.now()}.json`
    );
    
    await fs.writeFile(checkpointPath, JSON.stringify(checkpoint));
  }
  
  /**
   * Start metrics collection
   */
  private startMetricsCollector() {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 10000); // Every 10 seconds
  }
  
  /**
   * Collect and update metrics
   */
  private async collectMetrics() {
    // Update active jobs count
    this.jobMetrics.activeJobs = this.activeJobs.size;
    this.jobMetrics.queueLength = this.queue.length;
    
    // Calculate average wait time
    const waitTimes = this.queue
      .filter(job => job.startedAt)
      .map(job => job.startedAt!.getTime() - job.createdAt.getTime());
    
    if (waitTimes.length > 0) {
      this.jobMetrics.averageWaitTime = 
        waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length / 1000; // seconds
    }
    
    // Get memory usage
    const memUsage = process.memoryUsage();
    this.jobMetrics.memoryUsage = memUsage.heapUsed;
    
    // CPU usage would require more sophisticated monitoring
    this.jobMetrics.cpuUsage = process.cpuUsage().user / 1000000; // seconds
    
    this.emit('metrics:updated', this.jobMetrics);
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): JobMetrics {
    return { ...this.jobMetrics };
  }
  
  /**
   * Cancel a job
   */
  async cancelJob(jobId: number): Promise<boolean> {
    // Check if job is in queue
    const queueIndex = this.queue.findIndex(job => job.id === jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      await storage.updateTrainingJob(jobId, {
        status: 'cancelled',
        completedAt: new Date()
      });
      return true;
    }
    
    // Check if job is active
    const process = this.activeJobs.get(jobId);
    if (process) {
      process.kill('SIGTERM');
      this.activeJobs.delete(jobId);
      await storage.updateTrainingJob(jobId, {
        status: 'cancelled',
        completedAt: new Date()
      });
      return true;
    }
    
    return false;
  }
  
  /**
   * Cleanup resources
   */
  async shutdown() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    // Kill all active jobs
    for (const [jobId, process] of this.activeJobs) {
      process.kill('SIGTERM');
      await storage.updateTrainingJob(jobId, {
        status: 'cancelled',
        error: 'System shutdown'
      });
    }
    
    this.activeJobs.clear();
    this.queue = [];
  }
}

// Export singleton instance
export const jobQueueManager = new MLJobQueueManager();