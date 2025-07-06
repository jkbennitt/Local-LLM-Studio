import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { storage } from './storage';

interface QueuedJob {
  id: number;
  userId: number;
  priority: number;
  config: any;
  datasetPath: string;
  createdAt: Date;
  process?: ChildProcess;
}

export class MLJobQueueManager extends EventEmitter {
  private queue: QueuedJob[] = [];
  private activeJobs = new Map<number, QueuedJob>();
  private maxConcurrentJobs = 1; // Conservative for Replit
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.startProcessing();
  }

  async enqueueJob(job: any, datasetPath: string): Promise<QueuedJob> {
    const queuedJob: QueuedJob = {
      id: job.id,
      userId: job.userId,
      priority: 1,
      config: job.config,
      datasetPath,
      createdAt: new Date()
    };

    this.queue.push(queuedJob);
    this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first

    await storage.updateTrainingJob(job.id, { status: 'queued' });

    console.log(`Job ${job.id} queued. Queue length: ${this.queue.length}`);
    return queuedJob;
  }

  async cancelJob(jobId: number): Promise<boolean> {
    // Remove from queue
    const queueIndex = this.queue.findIndex(job => job.id === jobId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      await storage.updateTrainingJob(jobId, { status: 'cancelled' });
      return true;
    }

    // Kill active job
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob && activeJob.process) {
      activeJob.process.kill('SIGTERM');
      this.activeJobs.delete(jobId);
      await storage.updateTrainingJob(jobId, { status: 'cancelled' });
      return true;
    }

    return false;
  }

  private startProcessing() {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000); // Check every 5 seconds
  }

  private async processQueue() {
    if (this.activeJobs.size >= this.maxConcurrentJobs || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    try {
      await this.startTraining(job);
    } catch (error) {
      console.error(`Failed to start job ${job.id}:`, error);
      await storage.updateTrainingJob(job.id, { 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.emit('job:failed', job);
    }
  }

  private async startTraining(job: QueuedJob) {
    console.log(`Starting training for job ${job.id}`);

    this.activeJobs.set(job.id, job);
    await storage.updateTrainingJob(job.id, { status: 'running', progress: 0 });

    const trainingData = {
      dataset_path: job.datasetPath,
      config: job.config,
      job_id: job.id
    };

    const pythonProcess = spawn('python', [
      'server/ml_service.py',
      'train',
      JSON.stringify(trainingData)
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    job.process = pythonProcess;

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();

      // Parse progress updates (if any)
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('PROGRESS:')) {
          try {
            const progress = parseInt(line.split('PROGRESS:')[1]);
            this.emit('job:progress', {
              jobId: job.id,
              progress,
              epoch: Math.floor(progress / 10),
              loss: 0.5 - (progress / 200) // Mock decreasing loss
            });
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(`Job ${job.id} error:`, data.toString());
    });

    pythonProcess.on('close', async (code) => {
      this.activeJobs.delete(job.id);

      if (code === 0) {
        try {
          const result = JSON.parse(stdout);
          if (result.success) {
            await storage.updateTrainingJob(job.id, {
              status: 'completed',
              progress: 100,
              modelPath: result.model_path,
              completedAt: new Date()
            });

            // Create trained model record
            await storage.createTrainedModel({
              userId: job.userId,
              name: `Trained Model ${job.id}`,
              templateId: 1, // Default template
              modelPath: result.model_path,
              trainingJobId: job.id,
              accuracy: 0.85, // Mock
              createdAt: new Date()
            });

            this.emit('job:completed', job);
          } else {
            throw new Error(result.error || 'Training failed');
          }
        } catch (error) {
          await storage.updateTrainingJob(job.id, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Failed to parse training result'
          });
          this.emit('job:failed', job);
        }
      } else {
        await storage.updateTrainingJob(job.id, {
          status: 'failed',
          error: `Training process exited with code ${code}: ${stderr}`
        });
        this.emit('job:failed', job);
      }
    });

    pythonProcess.on('error', async (error) => {
      this.activeJobs.delete(job.id);
      await storage.updateTrainingJob(job.id, {
        status: 'failed',
        error: `Process error: ${error.message}`
      });
      this.emit('job:failed', job);
    });

    // Set timeout for training jobs
    setTimeout(() => {
      if (this.activeJobs.has(job.id) && job.process) {
        job.process.kill('SIGTERM');
        this.cancelJob(job.id);
      }
    }, 10 * 60 * 1000); // 10 minute timeout for demo
  }

  getMetrics() {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs.size,
      completedJobs: 0, // Would track from storage
      maxConcurrentJobs: this.maxConcurrentJobs
    };
  }

  destroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Kill all active jobs
    for (const [jobId, job] of this.activeJobs) {
      if (job.process) {
        job.process.kill('SIGTERM');
      }
    }
    this.activeJobs.clear();
  }
}

export const jobQueueManager = new MLJobQueueManager();