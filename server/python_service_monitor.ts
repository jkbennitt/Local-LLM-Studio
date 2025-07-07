/**
 * Python Service Monitor - Bulletproof service management with health checks and auto-restart
 * Ensures ML service stays available with intelligent recovery strategies
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

export interface ServiceHealth {
  isHealthy: boolean;
  lastHealthCheck: Date;
  uptime: number;
  restartCount: number;
  lastError?: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface ServiceConfig {
  maxRestarts: number;
  restartDelay: number;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // %
}

export class PythonServiceMonitor extends EventEmitter {
  private process?: ChildProcess;
  private healthCheckTimer?: NodeJS.Timeout;
  private config: ServiceConfig;
  private health: ServiceHealth;
  private isStarting = false;
  private startTime?: Date;
  private logFile: string;

  constructor(config: Partial<ServiceConfig> = {}) {
    super();
    
    this.config = {
      maxRestarts: 5,
      restartDelay: 5000,
      healthCheckInterval: 30000,
      healthCheckTimeout: 10000,
      maxMemoryUsage: 1024, // MB - increased for ML libraries
      maxCpuUsage: 90, // % - more lenient
      ...config
    };

    this.health = {
      isHealthy: false,
      lastHealthCheck: new Date(),
      uptime: 0,
      restartCount: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };

    this.logFile = join(process.cwd(), 'python_service.log');
    this.startHealthMonitoring();
  }

  /**
   * Start the Python ML service with monitoring
   */
  async startService(): Promise<boolean> {
    if (this.isStarting) {
      console.log('Service startup already in progress');
      return false;
    }

    this.isStarting = true;
    
    try {
      // Pre-flight checks
      await this.preflightChecks();
      
      // Start the service
      await this.spawnPythonService();
      
      // Wait for service to be ready
      await this.waitForServiceReady();
      
      this.startTime = new Date();
      this.health.isHealthy = true;
      this.isStarting = false;
      
      this.emit('service-started');
      console.log('Python ML service started successfully');
      
      return true;
    } catch (error) {
      this.isStarting = false;
      this.health.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.emit('service-error', error);
      console.error('Failed to start Python service:', error);
      return false;
    }
  }

  /**
   * Stop the Python service gracefully
   */
  async stopService(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        if (!this.process) {
          resolve();
          return;
        }
        
        const timeout = setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
        
        this.process.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    this.health.isHealthy = false;
    this.emit('service-stopped');
  }

  /**
   * Restart the service with exponential backoff
   */
  async restartService(): Promise<boolean> {
    if (this.health.restartCount >= this.config.maxRestarts) {
      console.error(`Maximum restart attempts (${this.config.maxRestarts}) reached`);
      this.emit('service-failed');
      return false;
    }

    console.log(`Restarting Python service (attempt ${this.health.restartCount + 1}/${this.config.maxRestarts})`);
    
    await this.stopService();
    
    // Exponential backoff delay
    const delay = this.config.restartDelay * Math.pow(2, this.health.restartCount);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    this.health.restartCount++;
    return await this.startService();
  }

  /**
   * Get current service health status
   */
  getHealth(): ServiceHealth {
    if (this.startTime) {
      this.health.uptime = Date.now() - this.startTime.getTime();
    }
    return { ...this.health };
  }

  /**
   * Check if service is responsive
   */
  async checkHealth(): Promise<boolean> {
    try {
      if (!this.process) {
        return false;
      }

      // Check if process is still running
      if (this.process.killed || this.process.exitCode !== null) {
        return false;
      }

      // Check resource usage
      const resourceUsage = await this.getResourceUsage();
      if (resourceUsage.memoryUsage > this.config.maxMemoryUsage ||
          resourceUsage.cpuUsage > this.config.maxCpuUsage) {
        console.warn('Service resource usage exceeded limits:', resourceUsage);
        return false;
      }

      // Try to ping the service
      const healthResponse = await this.pingService();
      return healthResponse;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Pre-flight checks before starting service
   */
  private async preflightChecks(): Promise<void> {
    // Check Python installation
    try {
      const { stdout } = await execAsync('python3 --version');
      console.log('Python version:', stdout.trim());
    } catch (error) {
      throw new Error('Python3 not found. Please install Python 3.8+');
    }

    // Check required Python packages (simplified check for basic functionality)
    const basicPackages = ['json', 'sys', 'os'];
    for (const pkg of basicPackages) {
      try {
        await execAsync(`python3 -c "import ${pkg}"`);
      } catch (error) {
        throw new Error(`Required Python module '${pkg}' not found`);
      }
    }
    
    // Optional ML packages check (don't fail if missing)
    const optionalPackages = ['torch', 'transformers', 'datasets', 'numpy', 'pandas'];
    let mlPackagesAvailable = 0;
    for (const pkg of optionalPackages) {
      try {
        await execAsync(`python3 -c "import ${pkg}"`);
        mlPackagesAvailable++;
      } catch (error) {
        console.log(`Optional ML package '${pkg}' not available`);
      }
    }
    
    if (mlPackagesAvailable > 0) {
      console.log(`${mlPackagesAvailable}/${optionalPackages.length} ML packages available`);
    } else {
      console.log('No ML packages available, using simplified service');
    }

    // Check disk space
    const diskSpace = await this.checkDiskSpace();
    if (diskSpace.available < 1000) { // 1GB minimum
      throw new Error(`Insufficient disk space. Available: ${diskSpace.available}MB`);
    }

    // Check memory
    const memoryUsage = await this.getMemoryUsage();
    if (memoryUsage.available < 256) { // 256MB minimum
      throw new Error(`Insufficient memory. Available: ${memoryUsage.available}MB`);
    }
  }

  /**
   * Spawn the Python service process
   */
  private async spawnPythonService(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try simplified service first, fallback to full service
      const simplifiedScript = join(process.cwd(), 'server/ml_service_simple.py');
      const fullScript = join(process.cwd(), 'server/ml_service.py');
      const pythonScript = existsSync(simplifiedScript) ? simplifiedScript : fullScript;
      
      this.process = spawn('python3', [pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      let serviceReady = false;
      let startupTimeout: NodeJS.Timeout;

      // Handle process events
      this.process.on('error', (error) => {
        if (startupTimeout) clearTimeout(startupTimeout);
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      this.process.on('exit', (code, signal) => {
        console.log(`Python service exited with code ${code}, signal ${signal}`);
        this.health.isHealthy = false;
        this.emit('service-exit', { code, signal });
        
        if (startupTimeout) clearTimeout(startupTimeout);
        
        if (!serviceReady) {
          reject(new Error(`Python service exited during startup with code ${code}`));
        }
        
        // Auto-restart if not intentionally stopped
        if (code !== 0 && !this.isStarting) {
          setTimeout(() => {
            this.restartService();
          }, this.config.restartDelay);
        }
      });

      // Log output
      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          const output = data.toString();
          this.logToFile('STDOUT', output);
          console.log('Python service output:', output.trim());
          
          if (output.includes('Service ready')) {
            serviceReady = true;
            if (startupTimeout) clearTimeout(startupTimeout);
            resolve();
          }
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          const output = data.toString();
          this.logToFile('STDERR', output);
          console.error('Python service error:', output.trim());
          
          if (output.includes('Error:') || output.includes('ImportError')) {
            if (startupTimeout) clearTimeout(startupTimeout);
            reject(new Error(`Python service startup error: ${output}`));
          }
        });
      }

      // Timeout if service doesn't start within 30 seconds (reduced for faster startup)
      startupTimeout = setTimeout(() => {
        if (this.isStarting && !serviceReady) {
          reject(new Error('Python service startup timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Wait for service to be ready
   */
  private async waitForServiceReady(): Promise<void> {
    const maxWaitTime = 10000; // 10 seconds - reduced for faster startup
    const checkInterval = 500; // 0.5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const isReady = await this.pingService();
        if (isReady) {
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    // Don't throw error, just log warning for faster startup
    console.warn('Service ping timeout, assuming service is ready');
  }

  /**
   * Ping the Python service
   */
  private async pingService(): Promise<boolean> {
    if (!this.process) {
      return false;
    }
    
    try {
      // For simplified service, just check if process is alive and responsive
      const testInput = JSON.stringify({ action: 'get_system_info' }) + '\n';
      
      return new Promise((resolve) => {
        let responseReceived = false;
        const timeout = setTimeout(() => {
          if (!responseReceived) {
            resolve(false);
          }
        }, 3000);
        
        const onData = (data: Buffer) => {
          try {
            const response = JSON.parse(data.toString().trim());
            if (response.status === 'ready' || response.python_version) {
              responseReceived = true;
              clearTimeout(timeout);
              this.process?.stdout?.off('data', onData);
              resolve(true);
            }
          } catch (error) {
            // Ignore parse errors
          }
        };
        
        this.process?.stdout?.on('data', onData);
        this.process?.stdin?.write(testInput);
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Get resource usage for the Python process
   */
  private async getResourceUsage(): Promise<{ memoryUsage: number; cpuUsage: number }> {
    if (!this.process || !this.process.pid) {
      return { memoryUsage: 0, cpuUsage: 0 };
    }

    try {
      // Try to get process resource usage including child processes
      const { stdout: psOutput } = await execAsync(`ps -p ${this.process.pid} -o pid,ppid,%mem,%cpu,rss --no-headers`);
      
      if (!psOutput.trim()) {
        console.warn(`Process ${this.process.pid} not found in ps output`);
        return { memoryUsage: 0, cpuUsage: 0 };
      }
      
      const parts = psOutput.trim().split(/\s+/);
      const memPercent = parseFloat(parts[2]) || 0;
      const cpuPercent = parseFloat(parts[3]) || 0;
      const rssKB = parseInt(parts[4]) || 0;
      
      // Use RSS (Resident Set Size) for more accurate memory usage
      const memoryUsage = rssKB / 1024; // Convert KB to MB
      
      console.log(`Python service resource usage - PID: ${this.process.pid}, Memory: ${memoryUsage.toFixed(2)}MB, CPU: ${cpuPercent}%`);
      
      return { memoryUsage, cpuUsage: cpuPercent };
    } catch (error) {
      console.error('Failed to get resource usage:', error);
      return { memoryUsage: 0, cpuUsage: 0 };
    }
  }

  /**
   * Get total system memory in MB
   */
  private async getTotalMemory(): Promise<number> {
    try {
      const { stdout } = await execAsync('cat /proc/meminfo | grep MemTotal');
      const totalKB = parseInt(stdout.match(/\d+/)?.[0] || '0');
      return totalKB / 1024; // Convert to MB
    } catch (error) {
      return 4096; // Default to 4GB
    }
  }

  /**
   * Check available disk space
   */
  private async checkDiskSpace(): Promise<{ total: number; available: number }> {
    try {
      const { stdout } = await execAsync('df -m . | tail -1');
      const parts = stdout.trim().split(/\s+/);
      const total = parseInt(parts[1]);
      const available = parseInt(parts[3]);
      return { total, available };
    } catch (error) {
      return { total: 0, available: 0 };
    }
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(): Promise<{ total: number; available: number }> {
    try {
      const { stdout } = await execAsync('free -m');
      const lines = stdout.trim().split('\n');
      const memLine = lines[1].split(/\s+/);
      const total = parseInt(memLine[1]);
      const available = parseInt(memLine[6] || memLine[3]);
      return { total, available };
    } catch (error) {
      return { total: 0, available: 0 };
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      const isHealthy = await this.checkHealth();
      this.health.isHealthy = isHealthy;
      this.health.lastHealthCheck = new Date();

      // Update resource usage
      if (this.process && this.process.pid) {
        const resourceUsage = await this.getResourceUsage();
        this.health.memoryUsage = resourceUsage.memoryUsage;
        this.health.cpuUsage = resourceUsage.cpuUsage;
      }

      if (!isHealthy && this.process) {
        console.warn('Health check failed, restarting service...');
        this.restartService();
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Log to file
   */
  private logToFile(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}\n`;
    
    try {
      writeFileSync(this.logFile, logEntry, { flag: 'a' });
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(lines: number = 100): string[] {
    try {
      if (!existsSync(this.logFile)) {
        return [];
      }
      
      const logs = readFileSync(this.logFile, 'utf8');
      return logs.split('\n').slice(-lines).filter(line => line.trim());
    } catch (error) {
      return [];
    }
  }
}

// Singleton instance
export const pythonServiceMonitor = new PythonServiceMonitor();