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
import { jobQueueManager } from "./ml_job_queue";
import { memoryManager } from "./memory_manager";
import { adaptiveEducation } from "./adaptive_education";
import { deployment } from "./deployment_config";
import { pythonServiceMonitor } from "./python_service_monitor";
import { resourceDetector } from "./resource_detector";

const upload = multer({ dest: 'uploads/' });

// WebSocket connections for real-time updates
const wsConnections = new Map<string, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Server-Sent Events for training updates (more stable than WebSocket)
  const sseClients = new Map<string, Response>();
  
  // SSE endpoint for training updates
  app.get('/api/training/stream', (req, res) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    
    // More aggressive headers for connection stability
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering
    
    sseClients.set(clientId, res);
    console.log(`SSE client connected: ${clientId}`);
    
    // Send initial connection message
    try {
      res.write(`data: ${JSON.stringify({
        type: 'connection',
        status: 'connected',
        clientId: clientId,
        timestamp: Date.now()
      })}\n\n`);
    } catch (error) {
      console.error(`Failed to send initial message to ${clientId}:`, error);
      sseClients.delete(clientId);
      return;
    }
    
    // Keep connection alive with more frequent pings
    const keepAlive = setInterval(() => {
      if (!res.destroyed && sseClients.has(clientId)) {
        try {
          res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
        } catch (error) {
          console.error(`Ping failed for ${clientId}:`, error);
          clearInterval(keepAlive);
          sseClients.delete(clientId);
        }
      } else {
        clearInterval(keepAlive);
        sseClients.delete(clientId);
      }
    }, 15000); // Reduced to 15 seconds for better stability
    
    req.on('close', () => {
      console.log(`SSE client disconnected: ${clientId}`);
      clearInterval(keepAlive);
      sseClients.delete(clientId);
    });

    req.on('error', (error) => {
      console.error(`SSE client error for ${clientId}:`, error);
      clearInterval(keepAlive);
      sseClients.delete(clientId);
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
    console.log('Upload request received:', req.file ? 'File present' : 'No file');
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        message: 'Please select a file to upload' 
      });
    }

    const { originalname, filename, size, mimetype } = req.file;
    const fileExtension = path.extname(originalname).toLowerCase();
    
    console.log(`Processing file: ${originalname}, size: ${size}, type: ${fileExtension}`);
    
    // Validate file type
    const allowedTypes = ['.csv', '.json', '.txt'];
    if (!allowedTypes.includes(fileExtension)) {
      // Clean up uploaded file
      try {
        fs.unlinkSync(path.join('uploads', filename));
      } catch (cleanupError) {
        console.warn('Failed to cleanup file:', cleanupError);
      }
      return res.status(400).json({
        error: 'Invalid file type',
        message: `File type ${fileExtension} is not supported. Please upload CSV, JSON, or TXT files.`,
        allowedTypes
      });
    }

    // Check file size (50MB limit)
    const maxSizeMB = 50;
    const sizeMB = size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      try {
        fs.unlinkSync(path.join('uploads', filename));
      } catch (cleanupError) {
        console.warn('Failed to cleanup file:', cleanupError);
      }
      return res.status(400).json({
        error: 'File too large',
        message: `File size (${sizeMB.toFixed(2)}MB) exceeds the 50MB limit.`
      });
    }

    // Count samples and validate quality
    let sampleCount = 0;
    let validationIssues: string[] = [];
    const filePath = path.join('uploads', filename);
    
    try {
      if (fileExtension === '.csv') {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        sampleCount = Math.max(0, lines.length - 1); // Subtract header
        
        if (sampleCount < 10) {
          validationIssues.push('too_small');
        }
      } else if (fileExtension === '.json') {
        const content = fs.readFileSync(filePath, 'utf8');
        try {
          const data = JSON.parse(content);
          sampleCount = Array.isArray(data) ? data.length : 1;
        } catch (jsonError) {
          throw new Error('Invalid JSON format');
        }
        
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
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file:', cleanupError);
      }
      
      return res.status(400).json({
        error: 'Failed to parse dataset file',
        message: `Error reading file: ${(error as Error).message}`,
        details: 'Please check that your file is properly formatted and not corrupted.'
      });
    }

    // Try to validate dataset quality with Python service, but don't fail if service is unavailable
    let validationResult: any = {};
    try {
      validationResult = await callMLService('validate', {
        dataset_path: filePath
      });

      if (validationResult.warnings) {
        validationIssues.push(...validationResult.warnings);
      }
    } catch (pythonError) {
      console.warn('Python validation service unavailable:', pythonError);
      // Continue without Python validation
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

  // Delete dataset
  app.delete('/api/datasets/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const dataset = await storage.getDataset(id);
      
      if (!dataset) {
        return res.status(404).json({ error: 'Dataset not found' });
      }
      
      // Delete file from filesystem
      const fs = await import('fs');
      try {
        if (fs.existsSync(dataset.filePath)) {
          fs.unlinkSync(dataset.filePath);
        }
      } catch (fileError) {
        console.warn('Failed to delete file:', fileError);
      }
      
      // Delete from storage
      await storage.deleteDataset(id);
      
      res.json({ message: 'Dataset deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete dataset' });
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

  // Training process management with production job queue
  async function startTrainingProcess(jobId: number) {
    try {
      const job = await storage.getTrainingJob(jobId);
      if (!job) return;

      // Get dataset from datasetPath in job
      let dataset = null;
      if (job.datasetPath) {
        // Find dataset by path
        const datasets = await storage.getDatasets();
        dataset = datasets.find(d => d.filePath === job.datasetPath);
      }
      
      if (!dataset) {
        console.error(`Dataset not found for job ${jobId}, using default config`);
        // Use default dataset info for memory calculation
        dataset = {
          id: 0,
          name: 'Unknown',
          filePath: job.datasetPath || '',
          fileSize: 10 * 1024 * 1024 // 10MB default
        } as any;
      }

      // Check memory before queuing
      const memMetrics = await memoryManager.getMemoryMetrics();
      if (memMetrics.percentage > 95) {
        await storage.updateTrainingJob(jobId, { 
          status: 'failed',
          error: 'Insufficient memory. Please try again later.'
        });
        broadcastTrainingUpdate(await storage.getTrainingJob(jobId)!);
        return;
      }

      // Parse config properly
      const config = typeof job.config === 'object' ? job.config as any : {};
      const modelName = config.model_name || 'gpt2';

      // Optimize configuration based on available memory
      const modelMemory = memoryManager.getModelMemoryEstimate(modelName);
      const { optimizedConfig, strategies } = await memoryManager.optimizeForMLTraining(
        modelMemory,
        dataset.fileSize || 0,
        config
      );

      // Update job with optimized config
      await storage.updateTrainingJob(jobId, {
        config: optimizedConfig
      });

      // Reload job with updated config
      const updatedJob = await storage.getTrainingJob(jobId);
      if (!updatedJob) return;

      // Queue the job with production job queue manager
      const queuedJob = await jobQueueManager.enqueueJob(updatedJob, dataset.filePath);
      
      // Track user interaction
      if (updatedJob.userId) {
        await adaptiveEducation.trackInteraction(
          updatedJob.userId,
          'start_training',
          `Training ${modelName} with dataset ${dataset.name}`,
          true,
          0
        );
      }

      // Listen for job progress updates from queue manager
      jobQueueManager.on('job:progress', (data) => {
        if (data.jobId === jobId) {
          broadcastTrainingUpdate({
            id: jobId,
            status: 'running',
            progress: data.progress,
            currentEpoch: data.epoch,
            trainingLoss: data.loss
          });
        }
      });

      // Listen for job completion
      jobQueueManager.on('job:completed', async (completedJob) => {
        if (completedJob.id === jobId) {
          const finalJob = await storage.getTrainingJob(jobId);
          if (finalJob) {
            broadcastTrainingUpdate(finalJob);
          }
        }
      });

      // Listen for job failure
      jobQueueManager.on('job:failed', async (failedJob) => {
        if (failedJob.id === jobId) {
          const finalJob = await storage.getTrainingJob(jobId);
          if (finalJob) {
            broadcastTrainingUpdate(finalJob);
          }
        }
      });

    } catch (error) {
      console.error('Error starting training process:', error);
      await storage.updateTrainingJob(jobId, { 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      const failedJob = await storage.getTrainingJob(jobId);
      if (failedJob) {
        broadcastTrainingUpdate(failedJob);
      }
    }
  }

  // SSE broadcast function
  function broadcastTrainingUpdate(job: any) {
    const message = JSON.stringify({
      type: 'training_update',
      job
    });

    sseClients.forEach((res, clientId) => {
      if (!res.destroyed) {
        try {
          res.write(`data: ${message}\n\n`);
        } catch (error) {
          console.error(`Failed to send SSE message to ${clientId}:`, error);
          sseClients.delete(clientId);
        }
      } else {
        sseClients.delete(clientId);
      }
    });
  }

  // Call Python ML service with unified communication
  async function callMLService(operation: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonScript = 'server/ml_service_unified.py';
      const pythonProcess = spawn('python3', [pythonScript]);
      
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

      // Send the request data to the Python service via stdin
      const requestData = JSON.stringify({ action: operation, ...data }) + '\n';
      pythonProcess.stdin.write(requestData);
      pythonProcess.stdin.end();

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          try {
            // Parse the last valid JSON line of stdout as the result
            const lines = stdout.trim().split('\n');
            let result = null;
            
            // Find the last valid JSON line
            for (let i = lines.length - 1; i >= 0; i--) {
              try {
                if (lines[i].trim().startsWith('{') || lines[i].trim().startsWith('[')) {
                  result = JSON.parse(lines[i].trim());
                  break;
                }
              } catch (e) {
                continue;
              }
            }
            
            if (!result) {
              reject(new CustomError('No valid JSON response found', 5000, 500, true, { stdout, stderr }));
            } else if (result.error) {
              reject(new CustomError(result.error, 5000, 500, true, { stdout, stderr }));
            } else {
              resolve(result);
            }
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
  
  // Adaptive education endpoints
  app.get('/api/education/content/:topic', asyncHandler(async (req: any, res: any) => {
    const { topic } = req.params;
    const userId = req.query.userId ? parseInt(req.query.userId) : 1;
    
    const content = await adaptiveEducation.generateAdaptiveContent(
      userId,
      topic,
      req.query.context || 'general'
    );
    
    res.json(content);
  }));
  
  app.get('/api/education/tips', asyncHandler(async (req: any, res: any) => {
    const userId = req.query.userId ? parseInt(req.query.userId) : 1;
    const action = req.query.action || 'general';
    const state = req.query.state || {};
    
    const tips = await adaptiveEducation.generateContextualTips(userId, action, state);
    res.json({ tips });
  }));
  
  app.post('/api/education/track', asyncHandler(async (req: any, res: any) => {
    const { userId, action, context, success, timeSpent, errors } = req.body;
    
    await adaptiveEducation.trackInteraction(
      userId,
      action,
      context,
      success,
      timeSpent,
      errors
    );
    
    res.json({ success: true });
  }));
  
  // Memory management endpoints
  app.get('/api/memory/report', asyncHandler(async (req: any, res: any) => {
    const report = await memoryManager.createMemoryReport();
    res.json({ report });
  }));
  
  // Job queue status
  app.get('/api/jobs/metrics', asyncHandler(async (req: any, res: any) => {
    const metrics = await jobQueueManager.getMetrics();
    res.json(metrics);
  }));
  
  app.delete('/api/jobs/:id', asyncHandler(async (req: any, res: any) => {
    const jobId = parseInt(req.params.id);
    const cancelled = await jobQueueManager.cancelJob(jobId);
    res.json({ success: cancelled });
  }));

  // Python Service Monitoring Endpoints
  app.get('/api/python-service/health', asyncHandler(async (req: any, res: any) => {
    const health = pythonServiceMonitor.getHealth();
    res.json(health);
  }));

  app.post('/api/python-service/restart', asyncHandler(async (req: any, res: any) => {
    const success = await pythonServiceMonitor.restartService();
    res.json({ success, message: success ? 'Service restarted successfully' : 'Failed to restart service' });
  }));

  app.get('/api/python-service/logs', asyncHandler(async (req: any, res: any) => {
    const lines = parseInt(req.query.lines as string) || 100;
    const logs = pythonServiceMonitor.getRecentLogs(lines);
    res.json({ logs });
  }));

  // Resource Detection and Optimization Endpoints
  app.get('/api/resources/detect', asyncHandler(async (req: any, res: any) => {
    const resources = await resourceDetector.detectResources();
    res.json(resources);
  }));

  app.post('/api/resources/optimize', asyncHandler(async (req: any, res: any) => {
    const { modelName, datasetSize, priority } = req.body;
    
    if (!modelName || !datasetSize) {
      return res.status(400).json({ 
        error: 'Missing required parameters: modelName, datasetSize' 
      });
    }

    const optimizedConfig = await resourceDetector.generateOptimizedConfig(
      modelName, 
      datasetSize, 
      priority || 'memory'
    );
    
    res.json(optimizedConfig);
  }));

  app.get('/api/resources/requirements/:modelName', asyncHandler(async (req: any, res: any) => {
    const { modelName } = req.params;
    const datasetSize = parseInt(req.query.datasetSize as string) || 1000;
    
    const resources = await resourceDetector.detectResources();
    const optimizedConfig = await resourceDetector.generateOptimizedConfig(
      modelName,
      datasetSize,
      'memory'
    );

    // Check if current resources meet requirements
    const memoryRequired = optimizedConfig.training.batchSize * 100; // Simplified calculation
    const canRun = resources.memory.available >= memoryRequired;
    
    res.json({
      canRun,
      currentResources: resources,
      optimizedConfig,
      recommendations: optimizedConfig.fallback.alternatives.map(alt => ({
        name: alt.name,
        description: alt.description,
        memoryRequired: alt.config.training?.batchSize ? alt.config.training.batchSize * 50 : memoryRequired / 2
      }))
    });
  }));

  // Enhanced System Health with Bulletproof Features
  app.get('/api/system/health-detailed', asyncHandler(async (req: any, res: any) => {
    const [
      deploymentHealth,
      pythonHealth,
      resources,
      memoryMetrics,
      jobMetrics
    ] = await Promise.all([
      deployment.healthCheck(),
      pythonServiceMonitor.getHealth(),
      resourceDetector.detectResources(),
      memoryManager.getMemoryMetrics(),
      Promise.resolve(jobQueueManager.getMetrics())
    ]);

    const overallHealth = 
      deploymentHealth.status === 'healthy' &&
      pythonHealth.isHealthy &&
      resources.memory.usage < 90 &&
      memoryMetrics.percentage < 85;

    res.json({
      overall: {
        status: overallHealth ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: pythonHealth.uptime
      },
      services: {
        deployment: deploymentHealth,
        pythonService: {
          status: pythonHealth.isHealthy ? 'healthy' : 'unhealthy',
          uptime: pythonHealth.uptime,
          restartCount: pythonHealth.restartCount,
          lastError: pythonHealth.lastError,
          memoryUsage: pythonHealth.memoryUsage,
          cpuUsage: pythonHealth.cpuUsage
        }
      },
      resources: {
        memory: {
          total: resources.memory.total,
          available: resources.memory.available,
          usage: resources.memory.usage,
          recommendations: memoryMetrics.recommendations
        },
        cpu: {
          cores: resources.cpu.cores,
          usage: resources.cpu.usage,
          model: resources.cpu.model
        },
        gpu: resources.gpu,
        storage: resources.storage
      },
      jobs: {
        active: jobMetrics.activeJobs,
        queued: jobMetrics.queueLength,
        completed: jobMetrics.completedJobs,
        failed: 0, // Will be tracked in future version
        successRate: jobMetrics.completedJobs > 0 ? (jobMetrics.completedJobs / (jobMetrics.completedJobs + 1)) * 100 : 0
      },
      optimizations: {
        memoryOptimizationHistory: memoryManager.getOptimizationHistory(),
        autoResourceOptimization: true,
        gracefulDegradationEnabled: true
      }
    });
  }));

  // Graceful Degradation Control
  app.post('/api/system/fallback/:modelName', asyncHandler(async (req: any, res: any) => {
    const { modelName } = req.params;
    const { datasetSize, force } = req.body;
    
    const resources = await resourceDetector.detectResources();
    const config = await resourceDetector.generateOptimizedConfig(modelName, datasetSize, 'memory');
    
    // Check if we need fallback mode
    const needsFallback = resources.memory.available < 512 || resources.cpu.cores < 2;
    
    if (needsFallback || force) {
      const fallbackConfig = config.fallback.alternatives[0]; // Use ultra light mode
      res.json({
        fallbackActivated: true,
        reason: needsFallback ? 'Insufficient resources detected' : 'Manual fallback requested',
        fallbackConfig,
        originalConfig: config,
        resourceAnalysis: {
          memory: {
            available: resources.memory.available,
            required: config.training.batchSize * 100,
            fallbackRequired: fallbackConfig.config.training?.batchSize ? fallbackConfig.config.training.batchSize * 50 : 50
          }
        }
      });
    } else {
      res.json({
        fallbackActivated: false,
        message: 'Sufficient resources available for normal operation',
        config
      });
    }
  }));

  // WebSocket connection quality monitoring
  app.get('/api/websocket/status', asyncHandler(async (req: any, res: any) => {
    const connections = Array.from(wsConnections.entries()).map(([id, ws]) => ({
      id,
      readyState: ws.readyState,
      isAlive: ws.readyState === WebSocket.OPEN
    }));

    res.json({
      totalConnections: wsConnections.size,
      activeConnections: connections.filter(c => c.isAlive).length,
      connections: connections
    });
  }));

  // Add global error handler at the end
  app.use(globalErrorHandler);
  
  return httpServer;
}
