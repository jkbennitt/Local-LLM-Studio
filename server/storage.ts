import { 
  users, 
  modelTemplates, 
  trainingJobs, 
  datasets, 
  trainedModels,
  type User, 
  type InsertUser,
  type ModelTemplate,
  type InsertModelTemplate,
  type TrainingJob,
  type InsertTrainingJob,
  type Dataset,
  type InsertDataset,
  type TrainedModel,
  type InsertTrainedModel
} from "@shared/schema";
import { Database } from 'sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const dbPath = join(process.cwd(), 'ml_training.db');
const db = new Database(dbPath);

interface DatabaseRow {
  [key: string]: any;
}

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Model Templates
  getModelTemplates(): Promise<ModelTemplate[]>;
  getModelTemplate(id: number): Promise<ModelTemplate | undefined>;
  createModelTemplate(template: InsertModelTemplate): Promise<ModelTemplate>;

  // Training Jobs
  getTrainingJobs(userId?: number): Promise<TrainingJob[]>;
  getTrainingJob(id: number): Promise<TrainingJob | undefined>;
  createTrainingJob(job: InsertTrainingJob): Promise<TrainingJob>;
  updateTrainingJob(id: number, updates: Partial<TrainingJob>): Promise<TrainingJob>;

  // Datasets
  getDatasets(userId?: number): Promise<Dataset[]>;
  getDataset(id: number): Promise<Dataset | undefined>;
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  updateDataset(id: number, updates: Partial<Dataset>): Promise<Dataset>;
  deleteDataset(id: number): Promise<boolean>;

  // Trained Models
  getTrainedModels(userId?: number): Promise<TrainedModel[]>;
  getTrainedModel(id: number): Promise<TrainedModel | undefined>;
  createTrainedModel(model: InsertTrainedModel): Promise<TrainedModel>;
  updateTrainedModel(id: number, updates: Partial<TrainedModel>): Promise<TrainedModel>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private modelTemplates: Map<number, ModelTemplate> = new Map();
  private trainingJobs: Map<number, TrainingJob> = new Map();
  private datasets: Map<number, Dataset> = new Map();
  private trainedModels: Map<number, TrainedModel> = new Map();

  private currentUserId = 1;
  private currentTemplateId = 1;
  private currentJobId = 1;
  private currentDatasetId = 1;
  private currentModelId = 1;

  constructor() {
    this.initializeDefaultTemplates();
    this.restoreUploadsFromFilesystem();
this.restoreTrainingDataFromFilesystem();

  }

  private initializeDefaultTemplates() {
    // Customer Service Bot Template
    this.modelTemplates.set(1, {
      id: 1,
      name: "Customer Service Bot",
      description: "Perfect for handling customer inquiries, support tickets, and FAQ responses with empathy and accuracy.",
      modelType: "gpt2-small",
      useCase: "customer_service",
      config: {
        model_name: "gpt2",
        learning_rate: 5e-5,
        batch_size: 8,
        max_epochs: 5,
        temperature: 0.7,
        max_length: 256,
        expected_accuracy: "85-92%"
      },
      isActive: true,
      createdAt: new Date()
    });

    // Creative Writing Assistant Template
    this.modelTemplates.set(2, {
      id: 2,
      name: "Creative Writing Assistant",
      description: "Generate stories, poems, articles, and creative content with style and originality based on your examples.",
      modelType: "gpt2-small",
      useCase: "creative_writing",
      config: {
        model_name: "gpt2",
        learning_rate: 3e-5,
        batch_size: 6,
        max_epochs: 4,
        temperature: 0.9,
        max_length: 512,
        expected_accuracy: "High"
      },
      isActive: true,
      createdAt: new Date()
    });

    // Code Assistant Template
    this.modelTemplates.set(3, {
      id: 3,
      name: "Code Assistant",
      description: "Generate code snippets, documentation, and programming solutions tailored to your specific coding style and patterns.",
      modelType: "distilbert",
      useCase: "code_assistant",
      config: {
        model_name: "distilbert-base-uncased",
        learning_rate: 2e-5,
        batch_size: 16,
        max_epochs: 3,
        temperature: 0.5,
        max_length: 256,
        expected_accuracy: "90-95%"
      },
      isActive: true,
      createdAt: new Date()
    });

    this.currentTemplateId = 4;
  }

  private restoreUploadsFromFilesystem() {
    setTimeout(async () => {
      try {
        const fs = await import('fs');
        const path = await import('path');

        const uploadsDir = 'uploads';
        if (!fs.existsSync(uploadsDir)) {
          return;
        }

        const files = fs.readdirSync(uploadsDir);
        console.log(`Found ${files.length} uploaded files to restore`);

        for (const file of files) {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);

          // Determine file type and original name
          let originalName = `restored_${file}`;
          let fileType = '.txt';

          // Try to detect file type by reading content
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('|') && content.split('\n').length > 5) {
              fileType = '.txt';
              originalName = `training_data_${Date.now()}.txt`;
            } else if (content.includes(',')) {
              fileType = '.csv';
              originalName = `training_data_${Date.now()}.csv`;
            }
          } catch (e) {
            fileType = '.txt';
            originalName = `training_data_${Date.now()}.txt`;
          }

          // Count samples
          let sampleCount = 0;
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (fileType === '.txt') {
              sampleCount = content.split('\n').filter(line => line.trim() && line.includes('|')).length;
            } else if (fileType === '.csv') {
              sampleCount = Math.max(0, content.split('\n').length - 1);
            }
          } catch (e) {
            sampleCount = 1; // Default to 1 if can't read
          }

          const dataset = {
            id: this.currentDatasetId++,
            userId: 1,
            name: originalName,
            filename: originalName,
            filePath: filePath,
            fileSize: stats.size,
            fileType: fileType,
            sampleCount: sampleCount,
            preprocessed: false,
            createdAt: stats.birthtime || stats.mtime
          };

          this.datasets.set(dataset.id, dataset);
        }

        console.log(`✅ Restored ${this.datasets.size} datasets from uploads folder`);
      } catch (error) {
        console.error('Failed to restore uploads:', error);
      }
    }, 100); // Small delay to ensure constructor completes
  }

  private async restoreTrainingDataFromFilesystem() {
    try {
      const fs = await import('fs');
      const path = await import('path');

      setTimeout(() => {
        try {
          const modelsDir = './models';
          if (!fs.existsSync(modelsDir)) {
            return;
          }

          const jobDirs = fs.readdirSync(modelsDir).filter((item: string) => {
            const itemPath = path.join(modelsDir, item);
            return fs.statSync(itemPath).isDirectory() && item.startsWith('job_');
          });

          let restoredJobs = 0;
          let restoredModels = 0;

          for (const jobDir of jobDirs) {
            const jobId = parseInt(jobDir.replace('job_', ''));
            const jobPath = path.join(modelsDir, jobDir);

            // Check if this job already exists
            if (!this.trainingJobs.has(jobId)) {
              // Create training job record
              const completedAt = new Date();
              const trainingJob: TrainingJob = {
                id: jobId,
                userId: 1,
                templateId: 1,
                name: `GPT-2 Customer Service - Job ${jobId}`,
                status: 'completed',
                progress: 100,
                currentEpoch: 5,
                totalEpochs: 5,
                datasetPath: `uploads/restored_${jobId}`,
                config: {
                  model_name: "gpt2",
                  learning_rate: 5e-5,
                  batch_size: 8,
                  max_epochs: 5,
                  temperature: 0.7,
                  max_length: 256,
                  expected_accuracy: "85-92%"
                },
                trainingLoss: null,
                modelPath: jobPath,
                error: null,
                createdAt: completedAt,
                updatedAt: completedAt,
                completedAt
              };

              this.trainingJobs.set(jobId, trainingJob);
              this.currentJobId = Math.max(this.currentJobId, jobId + 1);
              restoredJobs++;

              // Create trained model record
              const trainedModel: TrainedModel = {
                id: this.currentModelId++,
                userId: 1,
                name: `GPT-2 Model (Job ${jobId})`,
                templateId: 1,
                modelPath: jobPath,
                trainingJobId: jobId,
                accuracy: 0.88,
                createdAt: completedAt
              };

              this.trainedModels.set(trainedModel.id, trainedModel);
              restoredModels++;
            }
          }

          if (restoredJobs > 0) {
            console.log(`✅ Restored ${restoredJobs} training jobs and ${restoredModels} trained models from filesystem`);
          }
        } catch (error) {
          console.error('Error restoring training data from filesystem:', error);
        }
      }, 200);
    } catch (error) {
      console.error('Failed to import filesystem modules:', error);
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Model Templates
  async getModelTemplates(): Promise<ModelTemplate[]> {
    return Array.from(this.modelTemplates.values()).filter(t => t.isActive);
  }

  async getModelTemplate(id: number): Promise<ModelTemplate | undefined> {
    return this.modelTemplates.get(id);
  }

  async createModelTemplate(template: InsertModelTemplate): Promise<ModelTemplate> {
    const id = this.currentTemplateId++;
    const newTemplate: ModelTemplate = { 
      ...template, 
      id,
      isActive: template.isActive ?? true,
      createdAt: new Date()
    };
    this.modelTemplates.set(id, newTemplate);
    return newTemplate;
  }

  // Training Jobs
  async getTrainingJobs(userId?: number): Promise<TrainingJob[]> {
    const jobs = Array.from(this.trainingJobs.values());
    return userId ? jobs.filter(j => j.userId === userId) : jobs;
  }

  async getTrainingJob(id: number): Promise<TrainingJob | undefined> {
    return this.trainingJobs.get(id);
  }

  async createTrainingJob(job: InsertTrainingJob): Promise<TrainingJob> {
    const id = this.currentJobId++;
    const newJob: TrainingJob = { 
      ...job, 
      id,
      userId: job.userId ?? null,
      templateId: job.templateId ?? null,
      progress: job.progress ?? 0,
      currentEpoch: job.currentEpoch ?? 0,
      totalEpochs: job.totalEpochs ?? 3,
      trainingLoss: job.trainingLoss ?? null,
      datasetPath: job.datasetPath ?? null,
      modelPath: job.modelPath ?? null,
      error: job.error ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.trainingJobs.set(id, newJob);
    return newJob;
  }

  async updateTrainingJob(id: number, updates: Partial<TrainingJob>): Promise<TrainingJob> {
    const job = this.trainingJobs.get(id);
    if (!job) throw new Error('Training job not found');

    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    this.trainingJobs.set(id, updatedJob);
    return updatedJob;
  }

  // Datasets
  async getDatasets(userId?: number): Promise<Dataset[]> {
    const datasets = Array.from(this.datasets.values());
    return userId ? datasets.filter(d => d.userId === userId) : datasets;
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    return this.datasets.get(id);
  }

  async createDataset(dataset: InsertDataset): Promise<Dataset> {
    const id = this.currentDatasetId++;
    const newDataset: Dataset = { 
      ...dataset, 
      id,
      userId: dataset.userId ?? null,
      sampleCount: dataset.sampleCount ?? null,
      preprocessed: dataset.preprocessed ?? false,
      createdAt: new Date()
    };
    this.datasets.set(id, newDataset);
    return newDataset;
  }

  async updateDataset(id: number, updates: Partial<Dataset>): Promise<Dataset> {
    const dataset = this.datasets.get(id);
    if (!dataset) throw new Error('Dataset not found');

    const updatedDataset = { ...dataset, ...updates };
    this.datasets.set(id, updatedDataset);
    return updatedDataset;
  }

  async deleteDataset(id: number): Promise<boolean> {
    return this.datasets.delete(id);
  }

  async deleteDataset(id: number): Promise<boolean> {
    return this.datasets.delete(id);
  }

  // Trained Models
  async getTrainedModels(userId?: number): Promise<TrainedModel[]> {
    const models = Array.from(this.trainedModels.values());
    return userId ? models.filter(m => m.userId === userId) : models;
  }

  async getTrainedModel(id: number): Promise<TrainedModel | undefined> {
    return this.trainedModels.get(id);
  }

  async createTrainedModel(model: InsertTrainedModel): Promise<TrainedModel> {
    const id = this.currentModelId++;
    const newModel: TrainedModel = { 
      ...model, 
      id,
      userId: model.userId ?? null,
      jobId: model.jobId ?? null,
      performance: model.performance ?? null,
      deployed: model.deployed ?? false,
      apiEndpoint: model.apiEndpoint ?? null,
      createdAt: new Date()
    };
    this.trainedModels.set(id, newModel);
    return newModel;
  }

  async updateTrainedModel(id: number, updates: Partial<TrainedModel>): Promise<TrainedModel> {
    const model = this.trainedModels.get(id);
    if (!model) throw new Error('Trained model not found');

    const updatedModel = { ...model, ...updates };
    this.trainedModels.set(id, updatedModel);
    return updatedModel;
  }
}

export const storage = new MemStorage();