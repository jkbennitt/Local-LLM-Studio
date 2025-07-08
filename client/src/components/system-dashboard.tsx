import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, 
  Server, 
  Brain, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Trash2
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PerformanceMonitor from "./performance-monitor";
import { cn } from "@/lib/utils";

interface JobMetrics {
  queueLength: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageWaitTime: number;
  averageProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export default function SystemDashboard() {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Fetch job queue metrics
  const { data: jobMetrics } = useQuery({
    queryKey: ['/api/jobs/metrics'],
    refetchInterval: 5000
  });

  // Fetch memory report
  const { data: memoryReport } = useQuery({
    queryKey: ['/api/memory/report'],
    refetchInterval: 30000
  });

  // Fetch training jobs
  const { data: jobs } = useQuery({
    queryKey: ['/api/training/jobs'],
    refetchInterval: 5000
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: (jobId: number) => apiRequest(`/api/jobs/${jobId}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs/metrics'] });
    }
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage your ML training infrastructure
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Activity className="w-4 h-4 mr-2" />
          Production Mode
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobMetrics?.activeJobs || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              of {jobMetrics?.activeJobs + (jobMetrics?.queueLength || 0)} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Queue Length
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobMetrics?.queueLength || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Avg wait: {formatDuration(jobMetrics?.averageWaitTime || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobMetrics?.completedJobs && jobMetrics?.failedJobs
                ? Math.round((jobMetrics.completedJobs / (jobMetrics.completedJobs + jobMetrics.failedJobs)) * 100)
                : 100}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {jobMetrics?.completedJobs || 0} completed, {jobMetrics?.failedJobs || 0} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Processing Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(jobMetrics?.averageProcessingTime || 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              per training job
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Monitor */}
        <div className="lg:col-span-2">
          <PerformanceMonitor />
        </div>

        {/* Memory Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Memory Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memoryReport?.report ? (
              <ScrollArea className="h-[300px]">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {memoryReport.report}
                </pre>
              </ScrollArea>
            ) : (
              <p className="text-sm text-gray-500">Loading memory report...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Job Queue Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active & Queued</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              <div className="space-y-2">
                {jobs?.filter((job: any) => 
                  job.status === 'running' || job.status === 'pending'
                ).map((job: any) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={cn("text-white", getJobStatusColor(job.status))}>
                        {job.status}
                      </Badge>
                      <div>
                        <p className="font-medium">{job.name}</p>
                        <p className="text-xs text-gray-500">
                          Job #{job.id} • Started {new Date(job.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {job.progress > 0 && (
                        <span className="text-sm font-medium">{job.progress}%</span>
                      )}
                      {job.status === 'running' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelJobMutation.mutate(job.id)}
                          disabled={cancelJobMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {jobs?.filter((job: any) => 
                  job.status === 'running' || job.status === 'pending'
                ).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No active or queued jobs
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <div className="space-y-2">
                {jobs?.filter((job: any) => job.status === 'completed')
                  .slice(0, 5)
                  .map((job: any) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="font-medium">{job.name}</p>
                        <p className="text-xs text-gray-500">
                          Completed {new Date(job.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      Success
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="failed" className="mt-4">
              <div className="space-y-2">
                {jobs?.filter((job: any) => job.status === 'failed')
                  .slice(0, 5)
                  .map((job: any) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="font-medium">{job.name}</p>
                        <p className="text-xs text-gray-500">
                          Failed: {job.error || 'Unknown error'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-red-600">
                      Failed
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* System Recommendations */}
      {jobMetrics && (jobMetrics.memoryUsage > 80 || jobMetrics.cpuUsage > 80) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Resources Alert:</strong> Your system is under high load. 
            Consider reducing batch sizes or pausing some training jobs to improve performance.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}