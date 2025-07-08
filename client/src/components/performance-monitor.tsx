import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Cpu, HardDrive, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  ml: {
    activeJobs: number;
    maxJobs: number;
    queuedJobs: number;
    pythonStatus: 'healthy' | 'unhealthy';
  };
  uptime: number;
  errors: number;
}

interface PerformanceMonitorProps {
  className?: string;
  compact?: boolean;
}

export default function PerformanceMonitor({ className, compact = false }: PerformanceMonitorProps) {
  const [realtimeMetrics, setRealtimeMetrics] = useState<Partial<SystemMetrics>>({});

  // Fetch system metrics
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/system/metrics'],
    refetchInterval: 5000, // Update every 5 seconds
  });

  // Health check
  const { data: health } = useQuery({
    queryKey: ['/api/system/health'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  useEffect(() => {
    // Simulate real-time metrics updates
    const interval = setInterval(() => {
      setRealtimeMetrics(prev => ({
        ...prev,
        cpu: {
          usage: Math.random() * 100,
          cores: 4
        }
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-500';
    if (percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthBadge = (status: string) => {
    if (status === 'healthy') {
      return <Badge className="bg-green-500 text-white">Healthy</Badge>;
    }
    return <Badge className="bg-red-500 text-white">Issues Detected</Badge>;
  };

  if (compact) {
    return (
      <div className={cn("flex items-center space-x-4 text-sm", className)}>
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-gray-500" />
          <span className={getStatusColor(realtimeMetrics?.cpu?.usage || 0)}>
            {Math.round(realtimeMetrics?.cpu?.usage || 0)}%
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <HardDrive className="w-4 h-4 text-gray-500" />
          <span className={getStatusColor(metrics?.memory?.percentage || 0)}>
            {Math.round(metrics?.memory?.percentage || 0)}%
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <span>
            {metrics?.ml?.activeJobs || 0}/{metrics?.ml?.maxJobs || 0}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>System Performance</span>
          </div>
          {health && getHealthBadge(health.status)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* CPU Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">CPU Usage</span>
              </div>
              <span className={cn("text-sm font-semibold", getStatusColor(realtimeMetrics?.cpu?.usage || 0))}>
                {Math.round(realtimeMetrics?.cpu?.usage || 0)}%
              </span>
            </div>
            <Progress value={realtimeMetrics?.cpu?.usage || 0} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {realtimeMetrics?.cpu?.cores || 0} cores available
            </p>
          </div>

          {/* Memory Usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <span className={cn("text-sm font-semibold", getStatusColor(metrics?.memory?.percentage || 0))}>
                {Math.round(metrics?.memory?.percentage || 0)}%
              </span>
            </div>
            <Progress value={metrics?.memory?.percentage || 0} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">
              {(metrics?.memory?.used / 1024).toFixed(1)}GB / {(metrics?.memory?.total / 1024).toFixed(1)}GB
            </p>
          </div>

          {/* ML Jobs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">ML Training Jobs</span>
              </div>
              <Badge variant="secondary">
                {metrics?.ml?.activeJobs || 0} Active
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-lg font-semibold">{metrics?.ml?.activeJobs || 0}</p>
                <p className="text-xs text-gray-500">Running</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-lg font-semibold">{metrics?.ml?.queuedJobs || 0}</p>
                <p className="text-xs text-gray-500">Queued</p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-lg font-semibold">{metrics?.ml?.maxJobs || 0}</p>
                <p className="text-xs text-gray-500">Max</p>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Uptime</span>
                <span className="font-medium">{formatUptime(metrics?.uptime || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Python ML</span>
                <div className="flex items-center space-x-1">
                  {metrics?.ml?.pythonStatus === 'healthy' ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className="font-medium">
                    {metrics?.ml?.pythonStatus === 'healthy' ? 'Ready' : 'Error'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Health Checks */}
          {health?.checks && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Health Checks</p>
              <div className="space-y-1">
                {Object.entries(health.checks).map(([check, status]) => (
                  <div key={check} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{check.replace(/([A-Z])/g, ' $1').trim()}</span>
                    {status ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}