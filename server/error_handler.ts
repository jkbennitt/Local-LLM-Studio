import { Request, Response, NextFunction } from 'express';
import { WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';

export enum ErrorCode {
  // Dataset Errors (1000-1999)
  DATASET_NOT_FOUND = 1001,
  DATASET_INVALID_FORMAT = 1002,
  DATASET_TOO_LARGE = 1003,
  DATASET_TOO_SMALL = 1004,
  DATASET_CORRUPTED = 1005,
  
  // Training Errors (2000-2999)
  TRAINING_FAILED = 2001,
  TRAINING_OUT_OF_MEMORY = 2002,
  TRAINING_TIMEOUT = 2003,
  TRAINING_INVALID_CONFIG = 2004,
  TRAINING_MODEL_NOT_FOUND = 2005,
  
  // Model Errors (3000-3999)
  MODEL_NOT_FOUND = 3001,
  MODEL_CORRUPTED = 3002,
  MODEL_INCOMPATIBLE = 3003,
  MODEL_INFERENCE_FAILED = 3004,
  
  // System Errors (4000-4999)
  SYSTEM_RESOURCE_EXHAUSTED = 4001,
  SYSTEM_PYTHON_SERVICE_UNAVAILABLE = 4002,
  SYSTEM_STORAGE_FULL = 4003,
  SYSTEM_PERMISSION_DENIED = 4004,
  
  // General Errors (5000+)
  UNKNOWN_ERROR = 5000,
  VALIDATION_ERROR = 5001,
  AUTHENTICATION_ERROR = 5002,
  RATE_LIMIT_EXCEEDED = 5003
}

export interface AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: any;
  isOperational: boolean;
  timestamp: Date;
  context?: string;
}

export class CustomError extends Error implements AppError {
  code: ErrorCode;
  statusCode: number;
  details?: any;
  isOperational: boolean;
  timestamp: Date;
  context?: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error factory for common errors
export class ErrorFactory {
  static datasetNotFound(filename: string): CustomError {
    return new CustomError(
      `Dataset "${filename}" not found`,
      ErrorCode.DATASET_NOT_FOUND,
      404,
      true,
      { filename }
    );
  }

  static datasetInvalidFormat(filename: string, expectedFormat: string[]): CustomError {
    return new CustomError(
      `Invalid dataset format. Expected one of: ${expectedFormat.join(', ')}`,
      ErrorCode.DATASET_INVALID_FORMAT,
      400,
      true,
      { filename, expectedFormat }
    );
  }

  static datasetTooLarge(size: number, maxSize: number): CustomError {
    return new CustomError(
      `Dataset too large. Size: ${size}MB, Max allowed: ${maxSize}MB`,
      ErrorCode.DATASET_TOO_LARGE,
      413,
      true,
      { size, maxSize }
    );
  }

  static trainingOutOfMemory(requiredMemory: number, availableMemory: number): CustomError {
    return new CustomError(
      'Training failed: Insufficient memory. Consider reducing batch size or dataset size.',
      ErrorCode.TRAINING_OUT_OF_MEMORY,
      507,
      true,
      { 
        requiredMemory: `${requiredMemory}GB`,
        availableMemory: `${availableMemory}GB`,
        suggestions: [
          'Reduce batch size in training configuration',
          'Use a smaller model variant',
          'Enable gradient checkpointing',
          'Split dataset into smaller chunks'
        ]
      }
    );
  }

  static pythonServiceUnavailable(): CustomError {
    return new CustomError(
      'ML service is temporarily unavailable. Please try again in a few moments.',
      ErrorCode.SYSTEM_PYTHON_SERVICE_UNAVAILABLE,
      503,
      true,
      { 
        retryAfter: 30,
        suggestions: ['Check Python service logs', 'Ensure Python dependencies are installed']
      }
    );
  }

  static modelInferenceFailed(error: string): CustomError {
    return new CustomError(
      'Model inference failed. Please check your prompt and try again.',
      ErrorCode.MODEL_INFERENCE_FAILED,
      500,
      true,
      { 
        originalError: error,
        suggestions: [
          'Ensure model is properly trained',
          'Check prompt format',
          'Verify model compatibility'
        ]
      }
    );
  }
}

// Error recovery strategies
export class ErrorRecovery {
  static async recoverFromTrainingError(error: AppError, jobId: number): Promise<any> {
    console.log(`Attempting recovery for training job ${jobId}`);
    
    switch (error.code) {
      case ErrorCode.TRAINING_OUT_OF_MEMORY:
        // Attempt to reduce batch size and retry
        return {
          action: 'retry',
          modifications: {
            batch_size: 1,
            gradient_accumulation_steps: 8,
            fp16: true
          }
        };
        
      case ErrorCode.TRAINING_TIMEOUT:
        // Resume from checkpoint if available
        return {
          action: 'resume',
          checkpoint: await this.findLatestCheckpoint(jobId)
        };
        
      case ErrorCode.SYSTEM_PYTHON_SERVICE_UNAVAILABLE:
        // Queue for retry
        return {
          action: 'queue',
          retryAfter: 60,
          maxRetries: 3
        };
        
      default:
        return { action: 'fail' };
    }
  }

  static async findLatestCheckpoint(jobId: number): Promise<string | null> {
    const checkpointDir = path.join('models', `job_${jobId}`);
    try {
      const files = await fs.promises.readdir(checkpointDir);
      const checkpoints = files.filter(f => f.startsWith('checkpoint-'));
      if (checkpoints.length > 0) {
        checkpoints.sort((a, b) => {
          const numA = parseInt(a.split('-')[1]);
          const numB = parseInt(b.split('-')[1]);
          return numB - numA;
        });
        return path.join(checkpointDir, checkpoints[0]);
      }
    } catch (error) {
      console.error('Error finding checkpoint:', error);
    }
    return null;
  }
}

// Global error handler middleware
export function globalErrorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Default error
  let error: AppError = err as AppError;
  
  // Convert regular errors to CustomError
  if (!(err instanceof CustomError)) {
    error = new CustomError(
      err.message || 'An unexpected error occurred',
      ErrorCode.UNKNOWN_ERROR,
      500,
      false
    );
  }

  // Log error details
  console.error('Error:', {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    timestamp: error.timestamp,
    path: req.path,
    method: req.method,
    ip: req.ip,
    details: error.details,
    stack: error.stack
  });

  // Log to error file in production
  if (process.env.NODE_ENV === 'production') {
    logErrorToFile(error, req);
  }

  // Send error response
  res.status(error.statusCode).json({
    error: {
      message: error.message,
      code: error.code,
      timestamp: error.timestamp,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        details: error.details 
      })
    }
  });
}

// WebSocket error handler
export function handleWebSocketError(ws: WebSocket, error: Error | AppError) {
  let appError: AppError = error as AppError;
  
  if (!(error instanceof CustomError)) {
    appError = new CustomError(
      error.message || 'WebSocket error',
      ErrorCode.UNKNOWN_ERROR,
      500,
      false
    );
  }

  // Send error to client
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      error: {
        message: appError.message,
        code: appError.code,
        timestamp: appError.timestamp
      }
    }));
  }

  console.error('WebSocket Error:', appError);
}

// Error logging
function logErrorToFile(error: AppError, req: Request) {
  const errorLog = {
    timestamp: error.timestamp,
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    details: error.details,
    stack: error.stack
  };

  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, `errors-${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logFile, JSON.stringify(errorLog) + '\n');
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation error handler
export function handleValidationError(errors: any[]): CustomError {
  const messages = errors.map(err => 
    `${err.field}: ${err.message}`
  ).join(', ');
  
  return new CustomError(
    `Validation failed: ${messages}`,
    ErrorCode.VALIDATION_ERROR,
    400,
    true,
    { errors }
  );
}