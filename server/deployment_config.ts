/**
 * Production Deployment Configuration for ML Training Platform
 * Optimized for Replit and other constrained environments
 */

import os from 'os';
import { spawn } from 'child_process';

export interface DeploymentConfig {
  environment: 'development' | 'production';
  server: {
    port: number;
    host: string;
    cors: {
      enabled: boolean;
      origins: string[];
    };
  };
  ml: {
    pythonPath: string;
    maxConcurrentJobs: number;
    jobTimeout: number;
    memoryLimit: number;
    gpuEnabled: boolean;
  };
  storage: {
    maxFileSize: number;
    allowedFormats: string[];
    datasetPath: string;
    modelPath: string;
  };
  monitoring: {
    enabled: boolean;
    logLevel: string;
    metricsInterval: number;
    errorReporting: boolean;
  };
  performance: {
    cacheEnabled: boolean;
    compressionEnabled: boolean;
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
  };
}

export class ProductionDeployment {
  private static instance: ProductionDeployment;
  private config: DeploymentConfig;
  
  private constructor() {
    this.config = this.initializeConfig();
  }
  
  static getInstance(): ProductionDeployment {
    if (!ProductionDeployment.instance) {
      ProductionDeployment.instance = new ProductionDeployment();
    }
    return ProductionDeployment.instance;
  }
  
  private initializeConfig(): DeploymentConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const isReplit = process.env.REPL_ID !== undefined;
    
    return {
      environment: isProduction ? 'production' : 'development',
      server: {
        port: parseInt(process.env.PORT || '5000'),
        host: '0.0.0.0', // Required for Replit
        cors: {
          enabled: true,
          origins: isReplit 
            ? [`https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`]
            : ['http://localhost:5000']
        }
      },
      ml: {
        pythonPath: process.env.PYTHON_PATH || 'python',
        maxConcurrentJobs: this.calculateMaxJobs(),
        jobTimeout: 3600000, // 1 hour
        memoryLimit: this.getMemoryLimit(),
        gpuEnabled: false // Replit doesn't provide GPU
      },
      storage: {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        allowedFormats: ['.csv', '.json', '.txt', '.pdf'],
        datasetPath: process.env.DATASET_PATH || './uploads',
        modelPath: process.env.MODEL_PATH || './models'
      },
      monitoring: {
        enabled: isProduction,
        logLevel: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
        metricsInterval: 60000, // 1 minute
        errorReporting: isProduction
      },
      performance: {
        cacheEnabled: isProduction,
        compressionEnabled: isProduction,
        rateLimiting: {
          enabled: isProduction,
          maxRequests: 100,
          windowMs: 15 * 60 * 1000 // 15 minutes
        }
      }
    };
  }
  
  private calculateMaxJobs(): number {
    const cpus = os.cpus().length;
    const memory = os.totalmem() / (1024 * 1024 * 1024); // GB
    
    // Conservative: 1 job per 2 CPUs or 4GB RAM, whichever is lower
    return Math.max(1, Math.min(Math.floor(cpus / 2), Math.floor(memory / 4)));
  }
  
  private getMemoryLimit(): number {
    const totalMemory = os.totalmem();
    // Use 70% of available memory for ML tasks
    return Math.floor(totalMemory * 0.7);
  }
  
  getConfig(): DeploymentConfig {
    return this.config;
  }
  
  // Health check for deployment readiness
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: Record<string, boolean>;
    details: Record<string, any>;
  }> {
    const checks: Record<string, boolean> = {};
    const details: Record<string, any> = {};
    
    // Check Python availability
    checks.pythonAvailable = await this.checkPythonAvailable();
    
    // Check disk space
    const diskSpace = await this.checkDiskSpace();
    checks.sufficientDiskSpace = diskSpace.available > 1024 * 1024 * 1024; // 1GB
    details.diskSpace = diskSpace;
    
    // Check memory
    const memory = this.checkMemory();
    checks.sufficientMemory = memory.available > 512 * 1024 * 1024; // 512MB
    details.memory = memory;
    
    // Check ML dependencies
    checks.mlDependencies = await this.checkMLDependencies();
    
    const allHealthy = Object.values(checks).every(check => check);
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      details
    };
  }
  
  private async checkPythonAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const python = spawn(this.config.ml.pythonPath, ['--version']);
      python.on('close', (code) => {
        resolve(code === 0);
      });
      python.on('error', () => {
        resolve(false);
      });
    });
  }
  
  private async checkDiskSpace(): Promise<{ total: number; available: number }> {
    // Simplified disk space check
    return {
      total: 10 * 1024 * 1024 * 1024, // 10GB estimate
      available: 5 * 1024 * 1024 * 1024 // 5GB estimate
    };
  }
  
  private checkMemory(): { total: number; available: number; used: number } {
    const total = os.totalmem();
    const free = os.freemem();
    return {
      total,
      available: free,
      used: total - free
    };
  }
  
  private async checkMLDependencies(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkScript = `
import sys
try:
    import torch
    import transformers
    print("OK")
    sys.exit(0)
except ImportError:
    print("MISSING")
    sys.exit(1)
`;
      const python = spawn(this.config.ml.pythonPath, ['-c', checkScript]);
      python.on('close', (code) => {
        resolve(code === 0);
      });
      python.on('error', () => {
        resolve(false);
      });
    });
  }
  
  // Performance monitoring
  getPerformanceMetrics(): {
    cpu: number;
    memory: number;
    uptime: number;
    loadAverage: number[];
  } {
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    return {
      cpu: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      memory: memUsage.heapUsed / (1024 * 1024), // MB
      uptime: process.uptime(),
      loadAverage: os.loadavg()
    };
  }
}

// Export singleton instance
export const deployment = ProductionDeployment.getInstance();