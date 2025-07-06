export interface ModelTemplate {
  id: number;
  name: string;
  description: string;
  modelType: string;
  useCase: string;
  config: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}

export interface TrainingJob {
  id: number;
  userId?: number;
  templateId?: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  progress: number;
  currentEpoch: number;
  totalEpochs: number;
  trainingLoss?: string;
  datasetPath?: string;
  modelPath?: string;
  config: Record<string, any>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dataset {
  id: number;
  userId?: number;
  name: string;
  filename: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  sampleCount?: number;
  preprocessed: boolean;
  createdAt: Date;
}

export interface TrainedModel {
  id: number;
  jobId?: number;
  userId?: number;
  name: string;
  version: string;
  modelPath: string;
  performance?: Record<string, any>;
  deployed: boolean;
  apiEndpoint?: string;
  createdAt: Date;
}

export interface WebSocketMessage {
  type: string;
  job?: TrainingJob;
  [key: string]: any;
}
