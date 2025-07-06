import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTrainingJobSchema, insertDatasetSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import os from "os";
import { 
  CustomError, 
  ErrorFactory, 
  ErrorRecovery,
  globalErrorHandler,
  handleWebSocketError,
  asyncHandler 
} from "./error_handler";
import { EducationalContentGenerator } from "./educational_content";

const upload = multer({ dest: 'uploads/' });

// WebSocket connections for real-time updates
const wsConnections = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket setup for real-time training updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    const connectionId = Math.random().toString(36).substr(2, 9);
    wsConnections.set(connectionId, ws);
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'subscribe' && data.jobId) {
          (ws as any).jobId = data.jobId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      wsConnections.delete(connectionId);
    });
  });

  // API Routes

  // Get model templates with educational content
  app.get('/api/templates', asyncHandler(async (req: any, res: any) => {
    const templates = await storage.getModelTemplates();
    
    // Add educational content to each template
    const templatesWithEducation = templates.map(template => ({
      ...template,
      educationalContent: EducationalContentGenerator.getTemplateEducation(template.useCase)
    }));
    
    res.json(templatesWithEducation);
  }));

  // Get specific template
  app.get('/api/templates/:id', async (req, res) => {
    try {
      const template = await storage.getModelTemplate(parseInt(req.params.id));
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  });

  // Upload dataset with advanced validation
  app.post('/api/datasets', upload.single('file'), asyncHandler(async (req: any, res: any) => {
    if (!req.file) {
      throw ErrorFactory.datasetInvalidFormat('No file', ['.csv', '.json', '.txt']);
    }

    const { originalname, filename, size, mimetype } = req.file;
    const fileExtension = path.extname(originalname).toLowerCase();
    
    // Validate file type
    const allowedTypes = ['.csv', '.json', '.txt'];
    if (!allowedTypes.includes(fileExtension)) {
      // Clean up uploaded file
      fs.unlinkSync(path.join('uploads', filename));
      throw ErrorFactory.datasetInvalidFormat(originalname, allowedTypes);
    }

    // Check file size (50MB limit)
    const maxSizeMB = 50;
    const sizeMB = size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      fs.unlinkSync(path.join('uploads', filename));
      throw ErrorFactory.datasetTooLarge(sizeMB, maxSizeMB);
    }

    // Count samples and validate quality
    let sampleCount = 0;
    let validationIssues: string[] = [];
    const filePath = path.join('uploads', filename);
    
    try {
      if (fileExtension === '.csv') {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        sampleCount = lines.length - 1; // Subtract header
        
        if (sampleCount < 10) {
          validationIssues.push('too_small');
        }
      } else if (fileExtension === '.json') {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        sampleCount = Array.isArray(data) ? data.length : 1;
        
        if (sampleCount < 10) {
          validationIssues.push('too_small');
        }
      } else if (fileExtension === '.txt') {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        sampleCount = lines.length;
        
        if (sampleCount < 10) {
          validationIssues.push('too_small');
        }
      }
    } catch (error) {
      fs.unlinkSync(filePath);
      throw new CustomError('Failed to parse dataset file', 1005, 400, true, { error: (error as Error).message });
    }

    // Validate dataset quality with Python service
    const validationResult = await callMLService('validate', {
      dataset_path: filePath
    });

    if (validationResult.warnings) {
      validationIssues.push(...validationResult.warnings);
    }

    const dataset = await storage.createDataset({
      userId: 1, // Default user for now
      name: originalname,
      filename: originalname,
      filePath,
      fileSize: size,
      fileType: fileExtension.slice(1),
      sampleCount,
      preprocessed: false
    });

    // Include educational content if there are issues
    const response: any = { ...dataset };
    if (validationIssues.length > 0) {
      response.educationalContent = EducationalContentGenerator.getDatasetQualityEducation(validationIssues);
      response.validationWarnings = validationIssues;
    }

    res.json(response);
  }));

  // Get datasets
  app.get('/api/datasets', async (req, res) => {
    try {
      const datasets = await storage.getDatasets();
      res.json(datasets);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch datasets' });
    }
  });

  // Start training job
  app.post('/api/training/start', async (req, res) => {
    try {
      const { templateId, datasetId, name } = req.body;
      
      const template = await storage.getModelTemplate(templateId);
      const dataset = await storage.getDataset(datasetId);
      
      if (!template || !dataset) {
        return res.status(404).json({ error: 'Template or dataset not found' });
      }

      const job = await storage.createTrainingJob({
        userId: 1,
        templateId,
        name,
        status: 'pending',
        progress: 0,
        currentEpoch: 0,
        totalEpochs: (template.config as any).max_epochs as number,
        datasetPath: dataset.filePath,
        config: template.config as any
      });

      // Start training process
      startTrainingProcess(job.id);

      res.json(job);
    } catch (error) {
      console.error('Training start error:', error);
      res.status(500).json({ error: 'Failed to start training' });
    }
  });

  // Get training jobs
  app.get('/api/training/jobs', async (req, res) => {
    try {
      const jobs = await storage.getTrainingJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch training jobs' });
    }
  });

  // Get specific training job
  app.get('/api/training/jobs/:id', async (req, res) => {
    try {
      const job = await storage.getTrainingJob(parseInt(req.params.id));
      if (!job) {
        return res.status(404).json({ error: 'Training job not found' });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch training job' });
    }
  });

  // Stop training job
  app.post('/api/training/jobs/:id/stop', async (req, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const job = await storage.updateTrainingJob(jobId, { status: 'stopped' });
      
      // Broadcast update to WebSocket clients
      broadcastTrainingUpdate(job);
      
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop training job' });
    }
  });

  // Test trained model
  app.post('/api/models/:id/test', async (req, res) => {
    try {
      const { prompt } = req.body;
      const modelId = parseInt(req.params.id);
      
      const model = await storage.getTrainedModel(modelId);
      if (!model) {
        return res.status(404).json({ error: 'Model not found' });
      }

      // Call Python ML service for inference
      const result = await callMLService('inference', {
        model_path: model.modelPath,
        prompt,
        max_length: 100
      });

      res.json({ response: result.response });
    } catch (error) {
      console.error('Model testing error:', error);
      res.status(500).json({ error: 'Failed to test model' });
    }
  });

  // Get trained models
  app.get('/api/models', async (req, res) => {
    try {
      const models = await storage.getTrainedModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch models' });
    }
  });

  // Training process management
  async function startTrainingProcess(jobId: number) {
    try {
      const job = await storage.getTrainingJob(jobId);
      if (!job) return;

      // Update job status to running
      const runningJob = await storage.updateTrainingJob(jobId, { status: 'running' });
      broadcastTrainingUpdate(runningJob);

      // Simulate training progress updates
      const progressInterval = setInterval(async () => {
        const currentJob = await storage.getTrainingJob(jobId);
        if (!currentJob || currentJob.status !== 'running') {
          clearInterval(progressInterval);
          return;
        }

        const newProgress = Math.min((currentJob.progress || 0) + 10, 90);
        const newEpoch = Math.floor(newProgress / 30) + 1;
        const trainingLoss = (2.5 - (newProgress / 100) * 2).toFixed(3);

        const updatedJob = await storage.updateTrainingJob(jobId, { 
          progress: newProgress,
          currentEpoch: newEpoch,
          trainingLoss: trainingLoss
        });
        
        broadcastTrainingUpdate(updatedJob);

        if (newProgress >= 90) {
          clearInterval(progressInterval);
          
          // Call Python ML service for training
          const result = await callMLService('train', {
            job_id: jobId,
            dataset_path: job.datasetPath,
            config: job.config
          });

          if (result.success) {
            // Create trained model record
            const trainedModel = await storage.createTrainedModel({
              jobId,
              userId: job.userId!,
              name: job.name,
              version: "1.0.0",
              modelPath: result.model_path,
              performance: result.performance,
              deployed: false
            });

            // Update job as completed
            const completedJob = await storage.updateTrainingJob(jobId, { 
              status: 'completed',
              progress: 100,
              modelPath: result.model_path
            });
            
            broadcastTrainingUpdate(completedJob);
          } else {
            // Update job as failed
            const failedJob = await storage.updateTrainingJob(jobId, { 
              status: 'failed',
              error: result.error
            });
            
            broadcastTrainingUpdate(failedJob);
          }
        }
      }, 2000); // Update every 2 seconds

    } catch (error) {
      console.error('Training process error:', error);
      const failedJob = await storage.updateTrainingJob(jobId, { 
        status: 'failed',
        error: (error as Error).message
      });
      broadcastTrainingUpdate(failedJob);
    }
  }

  // WebSocket broadcast function
  function broadcastTrainingUpdate(job: any) {
    const message = JSON.stringify({
      type: 'training_update',
      job
    });

    wsConnections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send to all connections or specific job subscribers
        if (!(ws as any).jobId || (ws as any).jobId === job.id) {
          ws.send(message);
        }
      } else {
        wsConnections.delete(connectionId);
      }
    });
  }

  // Call Python ML service with advanced error handling
  async function callMLService(operation: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', ['server/ml_service.py', operation, JSON.stringify(data)]);
      
      let stdout = '';
      let stderr = '';
      let timeout: NodeJS.Timeout;

      // Set timeout for long operations
      const timeoutMs = operation === 'train' ? 3600000 : 60000; // 1 hour for training, 1 min for others
      timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(ErrorFactory.pythonServiceUnavailable());
      }, timeoutMs);

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(ErrorFactory.pythonServiceUnavailable());
      });

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new CustomError('Failed to parse ML service response', 5000, 500, true, { stdout, stderr }));
          }
        } else {
          // Check for specific error patterns
          if (stderr.includes('out of memory') || stderr.includes('CUDA out of memory')) {
            reject(ErrorFactory.trainingOutOfMemory(8, 4)); // Example values
          } else {
            reject(new CustomError(`ML service error: ${stderr}`, 5000, 500, true, { code, stderr }));
          }
        }
      });
    });
  }

  // System monitoring endpoints
  app.get('/api/system/metrics', asyncHandler(async (req: any, res: any) => {
    const { deployment } = await import('./deployment_config');
    const metrics = deployment.getPerformanceMetrics();
    const memInfo = os.totalmem();
    const freeMemInfo = os.freemem();
    
    res.json({
      cpu: {
        usage: metrics.cpu,
        cores: os.cpus().length
      },
      memory: {
        total: memInfo / (1024 * 1024), // MB
        used: (memInfo - freeMemInfo) / (1024 * 1024),
        available: freeMemInfo / (1024 * 1024),
        percentage: ((memInfo - freeMemInfo) / memInfo) * 100
      },
      ml: {
        activeJobs: 0, // Will track from storage
        maxJobs: deployment.getConfig().ml.maxConcurrentJobs,
        queuedJobs: 0, // Will track from storage
        pythonStatus: 'healthy' // Will be updated by health check
      },
      uptime: metrics.uptime,
      errors: 0 // Would track real errors in production
    });
  }));
  
  app.get('/api/system/health', asyncHandler(async (req: any, res: any) => {
    const { deployment } = await import('./deployment_config');
    const health = await deployment.healthCheck();
    res.json(health);
  }));

  // Add global error handler at the end
  app.use(globalErrorHandler);
  
  return httpServer;
}
