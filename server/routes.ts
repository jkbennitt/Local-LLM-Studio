import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTrainingJobSchema, insertDatasetSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

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

  // Get model templates
  app.get('/api/templates', async (req, res) => {
    try {
      const templates = await storage.getModelTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

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

  // Upload dataset
  app.post('/api/datasets', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { originalname, filename, size, mimetype } = req.file;
      const fileExtension = path.extname(originalname).toLowerCase();
      
      // Validate file type
      const allowedTypes = ['.csv', '.json', '.txt'];
      if (!allowedTypes.includes(fileExtension)) {
        return res.status(400).json({ error: 'Invalid file type. Only CSV, JSON, and TXT files are allowed.' });
      }

      // Count samples based on file type
      let sampleCount = 0;
      const filePath = path.join('uploads', filename);
      
      if (fileExtension === '.csv') {
        const content = fs.readFileSync(filePath, 'utf8');
        sampleCount = content.split('\n').filter(line => line.trim()).length - 1; // Subtract header
      } else if (fileExtension === '.json') {
        const content = fs.readFileSync(filePath, 'utf8');
        try {
          const data = JSON.parse(content);
          sampleCount = Array.isArray(data) ? data.length : 1;
        } catch {
          sampleCount = 1;
        }
      } else if (fileExtension === '.txt') {
        const content = fs.readFileSync(filePath, 'utf8');
        sampleCount = content.split('\n').filter(line => line.trim()).length;
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

      res.json(dataset);
    } catch (error) {
      console.error('Dataset upload error:', error);
      res.status(500).json({ error: 'Failed to upload dataset' });
    }
  });

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
        totalEpochs: template.config.max_epochs as number,
        datasetPath: dataset.filePath,
        config: template.config
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
      await storage.updateTrainingJob(jobId, { status: 'running' });
      broadcastTrainingUpdate(job);

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
        await storage.updateTrainingJob(jobId, { 
          status: 'completed',
          progress: 100,
          modelPath: result.model_path
        });
      } else {
        // Update job as failed
        await storage.updateTrainingJob(jobId, { 
          status: 'failed',
          error: result.error
        });
      }

      const updatedJob = await storage.getTrainingJob(jobId);
      if (updatedJob) {
        broadcastTrainingUpdate(updatedJob);
      }
    } catch (error) {
      console.error('Training process error:', error);
      await storage.updateTrainingJob(jobId, { 
        status: 'failed',
        error: error.message
      });
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

  // Call Python ML service
  async function callMLService(operation: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', ['server/ml_service.py', operation, JSON.stringify(data)]);
      
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            reject(new Error('Failed to parse ML service response'));
          }
        } else {
          reject(new Error(`ML service error: ${stderr}`));
        }
      });
    });
  }

  return httpServer;
}
