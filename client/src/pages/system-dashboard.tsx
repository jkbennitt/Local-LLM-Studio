import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings,
  TrendingUp,
  Database,
  Network,
  Clock,
  Gauge,
  ArrowLeft,
  HelpCircle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface SystemHealth {
  overall: {
    status: string;
    timestamp: string;
    uptime: number;
  };
  services: {
    deployment: any;
    pythonService: {
      status: string;
      uptime: number;
      restartCount: number;
      lastError?: string;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  resources: {
    memory: {
      total: number;
      available: number;
      usage: number;
      recommendations: string[];
    };
    cpu: {
      cores: number;
      usage: number;
      model: string;
    };
    gpu?: any;
    storage: {
      total: number;
      available: number;
      usage: number;
    };
  };
  jobs: {
    active: number;
    queued: number;
    completed: number;
    failed: number;
    successRate: number;
  };
  optimizations: {
    memoryOptimizationHistory: string[];
    autoResourceOptimization: boolean;
    gracefulDegradationEnabled: boolean;
  };
}

interface WebSocketStatus {
  totalConnections: number;
  activeConnections: number;
  connections: Array<{
    id: string;
    readyState: number;
    isAlive: boolean;
  }>;
}

interface ResourceDetection {
  memory: {
    total: number;
    available: number;
    usage: number;
  };
  cpu: {
    cores: number;
    usage: number;
    model: string;
  };
  gpu?: {
    available: boolean;
    memory?: number;
    name?: string;
  };
  storage: {
    total: number;
    available: number;
    usage: number;
  };
  platform: string;
  recommendations: string[];
}

export default function SystemDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [wsStatus, setWsStatus] = useState<WebSocketStatus | null>(null);
  const [resources, setResources] = useState<ResourceDetection | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/system/health-detailed');
      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      toast({
        title: "Health Check Failed",
        description: "Unable to fetch system health data",
        variant: "destructive"
      });
    }
  };

  const fetchWebSocketStatus = async () => {
    try {
      const response = await fetch('/api/websocket/status');
      const data = await response.json();
      setWsStatus(data);
    } catch (error) {
      console.error('Failed to fetch WebSocket status:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/resources/detect');
      const data = await response.json();
      setResources(data);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    }
  };

  const restartPythonService = async () => {
    try {
      const response = await fetch('/api/python-service/restart', {
        method: 'POST'
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Service Restarted",
          description: "Python ML service restarted successfully",
        });
        fetchSystemHealth();
      } else {
        toast({
          title: "Restart Failed",
          description: "Failed to restart Python ML service",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Restart Error",
        description: "Error restarting Python ML service",
        variant: "destructive"
      });
    }
  };

  const optimizeResources = async () => {
    try {
      const response = await fetch('/api/resources/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelName: 'gpt2',
          datasetSize: 1000,
          priority: 'memory'
        })
      });
      const data = await response.json();

      toast({
        title: "Resources Optimized",
        description: "System configuration optimized for current resources",
      });

      fetchSystemHealth();
    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: "Failed to optimize system resources",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const fetchAllData = async (isInitialLoad = false) => {
      if (isInitialLoad) {
        setLoading(true);
      }
      await Promise.all([
        fetchSystemHealth(),
        fetchWebSocketStatus(),
        fetchResources()
      ]);
      if (isInitialLoad) {
        setLoading(false);
      }
    };

    fetchAllData(true); // Initial load

    if (autoRefresh) {
      const interval = setInterval(() => fetchAllData(false), 10000); // Refresh every 10 seconds without loading overlay
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <span className="ml-2 text-lg">Loading system dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-sm">
                    <p className="font-medium mb-2">What is this page?</p>
                    <p>This shows how well your AI training system is running:</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li>• 🟢 <strong>Green</strong> = Everything working perfectly!</li>
                      <li>• 🟡 <strong>Yellow</strong> = Minor issues, but still working</li>
                      <li>• 🔴 <strong>Red</strong> = Problems that need your attention</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-muted-foreground">Check if your AI training system is ready to train models</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Training
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                  {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>When ON, this page updates every 10 seconds automatically<br/>
                to show you the latest system status</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={optimizeResources}>
                  <Settings className="w-4 h-4 mr-2" />
                  Optimize
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Automatically adjust system settings to work better<br/>
                with your computer's available resources</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

      {/* Overall Health Status */}
      {systemHealth && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(systemHealth.overall.status)}
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <span>System Status</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-sm">
                          <p className="font-medium mb-2">What does this mean?</p>
                          <p><strong>Healthy:</strong> Ready to train AI models!</p>
                          <p><strong>Degraded:</strong> Minor issues, training may still work</p>
                          <p><strong>Unhealthy:</strong> Fix problems before training</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription className="text-base">
                    {systemHealth.overall.status === 'healthy' 
                      ? "✅ Everything working great! Ready to train models."
                      : systemHealth.overall.status === 'degraded'
                      ? "⚠️ Minor issues detected, but training should work."
                      : "❌ Issues found - please check details below."
                    }
                  </CardDescription>
                </div>
                <Badge 
                  variant={systemHealth.overall.status === 'healthy' ? 'default' : 'destructive'}
                  className="text-lg px-3 py-1"
                >
                  {systemHealth.overall.status.toUpperCase()}
                </Badge>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hover:bg-muted p-1 rounded cursor-help">
                      Running: {formatUptime(systemHealth.overall.uptime)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>How long your system has been running without restart</p>
                  </TooltipContent>
                </Tooltip>
                <div className="text-xs">
                  Last check: {new Date(systemHealth.overall.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="services" title="Check if the core AI training services are running properly">
            Services
          </TabsTrigger>
          <TabsTrigger value="resources" title="See how much CPU, memory, and storage your system is using">
            Resources
          </TabsTrigger>
          <TabsTrigger value="jobs" title="Monitor active training jobs and queue status">
            Jobs
          </TabsTrigger>
          <TabsTrigger value="websocket" title="Real-time connection status for live training updates">
            Connection
          </TabsTrigger>
          <TabsTrigger value="optimizations" title="System optimizations and performance settings">
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          {systemHealth && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* AI Training Engine */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="w-5 h-5" />
                    <span>🤖 AI Training Engine</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-sm">
                          <p className="font-medium mb-2">What is this?</p>
                          <p>This is the core system that actually trains your AI models. 
                          When you start training, this service does all the heavy work!</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    {getStatusIcon(systemHealth.services?.pythonService?.status || 'unknown')}
                  </CardTitle>
                  <CardDescription>
                    {systemHealth.services?.pythonService?.status === 'healthy' 
                      ? "Ready to train your AI models"
                      : "Having issues - may need restart"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="hover:bg-muted p-2 rounded cursor-help">
                          <span className="text-muted-foreground">Running for:</span>
                          <p className="font-medium">{formatUptime(systemHealth.services?.pythonService?.uptime || 0)}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>How long the AI training engine has been running<br/>without needing a restart</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="hover:bg-muted p-2 rounded cursor-help">
                          <span className="text-muted-foreground">Restarts:</span>
                          <p className="font-medium">{systemHealth.services?.pythonService?.restartCount || 0}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>How many times the service has restarted<br/>Lower numbers are better</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="hover:bg-muted p-2 rounded cursor-help">
                          <span className="text-muted-foreground">Memory used:</span>
                          <p className="font-medium">{formatBytes(systemHealth.services?.pythonService?.memoryUsage || 0)}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>How much RAM the training engine is currently using<br/>More memory = can train larger models</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="hover:bg-muted p-2 rounded cursor-help">
                          <span className="text-muted-foreground">CPU usage:</span>
                          <p className="font-medium">{(systemHealth.services?.pythonService?.cpuUsage || 0).toFixed(1)}%</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>How much processing power is being used<br/>Higher during training is normal</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {systemHealth.services?.pythonService?.lastError && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Issue found:</strong> {systemHealth.services.pythonService.lastError}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={restartPythonService}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Restart Training Engine
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>If you're having issues, this restarts the AI training engine<br/>
                      This will stop any active training!</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              {/* Deployment Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="w-5 h-5" />
                    <span>Deployment Service</span>
                    {getStatusIcon(systemHealth.services.deployment.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-muted-foreground">Environment:</span>
                      <Badge variant="outline" className="ml-2">
                        {systemHealth.services?.deployment?.environment || 'Unknown'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Python Available:</span>
                      <Badge variant={systemHealth.services?.deployment?.pythonAvailable ? 'default' : 'destructive'} className="ml-2">
                        {systemHealth.services?.deployment?.pythonAvailable ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ML Dependencies:</span>
                      <Badge variant={systemHealth.services?.deployment?.mlDependencies ? 'default' : 'destructive'} className="ml-2">
                        {systemHealth.services?.deployment?.mlDependencies ? 'Ready' : 'Missing'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-4">
          {systemHealth && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Memory */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MemoryStick className="w-5 h-5" />
                    <span>Memory</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span>{(systemHealth.resources?.memory?.usage || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={systemHealth.resources?.memory?.usage || 0} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Available: {formatBytes(systemHealth.resources?.memory?.available || 0)}</span>
                      <span>Total: {formatBytes(systemHealth.resources?.memory?.total || 0)}</span>
                    </div>
                  </div>

                  {systemHealth.resources?.memory?.recommendations?.length > 0 && (
                    <div className="text-xs space-y-1">
                      <span className="text-muted-foreground">Recommendations:</span>
                      {systemHealth.resources.memory.recommendations.map((rec, idx) => (
                        <p key={idx} className="text-yellow-600 dark:text-yellow-400">• {rec}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CPU */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Cpu className="w-5 h-5" />
                    <span>CPU</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Usage</span>
                      <span>{(systemHealth.resources?.cpu?.usage || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={systemHealth.resources?.cpu?.usage || 0} className="w-full" />
                    <div className="text-xs text-muted-foreground">
                      <p>Cores: {systemHealth.resources?.cpu?.cores || 0}</p>
                      <p>Model: {systemHealth.resources?.cpu?.model || 'Unknown'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Storage */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <HardDrive className="w-5 h-5" />
                    <span>Storage</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span>{(systemHealth.resources?.storage?.usage || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={systemHealth.resources?.storage?.usage || 0} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Available: {formatBytes(systemHealth.resources?.storage?.available || 0)}</span>
                      <span>Total: {formatBytes(systemHealth.resources?.storage?.total || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          {systemHealth && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Active Jobs</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemHealth.jobs.active}</div>
                  <p className="text-xs text-muted-foreground">Currently running</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5" />
                    <span>Queued Jobs</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemHealth.jobs.queued}</div>
                  <p className="text-xs text-muted-foreground">Waiting to start</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5" />
                    <span>Completed</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemHealth.jobs.completed}</div>
                  <p className="text-xs text-muted-foreground">Successfully finished</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Gauge className="w-5 h-5" />
                    <span>Success Rate</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                 <div className="text-2xl font-bold">{(systemHealth.jobs?.successRate || 0).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Overall success rate</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* WebSocket Tab */}
        <TabsContent value="websocket" className="space-y-4">
          {wsStatus && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="w-5 h-5" />
                  <span>WebSocket Connections</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">Total Connections:</span>
                    <p className="text-2xl font-bold">{wsStatus.totalConnections}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Active Connections:</span>
                    <p className="text-2xl font-bold">{wsStatus.activeConnections}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">Connection Details:</h4>
                  {wsStatus.connections.map((conn, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm font-mono">{conn.id}</span>
                      <Badge variant={conn.isAlive ? 'default' : 'destructive'}>
                        {conn.isAlive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Optimizations Tab */}
        <TabsContent value="optimizations" className="space-y-4">
          {systemHealth && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Optimization Features</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Auto Resource Optimization</span>
                      <Badge variant={systemHealth.optimizations.autoResourceOptimization ? 'default' : 'secondary'}>
                        {systemHealth.optimizations.autoResourceOptimization ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Graceful Degradation</span>
                      <Badge variant={systemHealth.optimizations.gracefulDegradationEnabled ? 'default' : 'secondary'}>
                        {systemHealth.optimizations.gracefulDegradationEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5" />
                    <span>Recent Optimizations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {systemHealth.optimizations.memoryOptimizationHistory.length > 0 ? (
                      systemHealth.optimizations.memoryOptimizationHistory.map((opt, idx) => (
                        <div key={idx} className="text-sm p-2 bg-muted rounded">
                          {opt}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No recent optimizations</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </TooltipProvider>
  );
}