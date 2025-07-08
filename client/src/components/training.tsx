import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Play, 
  Pause, 
  Square, 
  Download, 
  Upload, 
  Settings, 
  BarChart3, 
  Zap, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Brain,
  Target
} from 'lucide-react';

interface TrainingConfig {
  model_name: string;
  learning_rate: number;
  batch_size: number;
  epochs: number;
  max_length: number;
  warmup_steps: number;
  weight_decay: number;
  save_steps: number;
  eval_steps: number;
  logging_steps: number;
}

interface TrainingMetrics {
  epoch: number;
  loss: number;
  learning_rate: number;
  eval_loss?: number;
  perplexity?: number;
  timestamp: number;
}
import { useState, useEffect } from "react";
import { Play, Square, TrendingUp, Clock, Zap, Info, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { startTraining, stopTraining } from "@/lib/api";
import { TrainingJob, WebSocketMessage } from "@/types";
import AdaptiveEducation from "./adaptive-education";
import PerformanceMonitor from "./performance-monitor";

interface TrainingProps {
  selectedTemplate: number | null;
  selectedDataset: number | null;
  jobs: TrainingJob[];
  currentJob: number | null;
  onJobStart: (jobId: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Training({
  selectedTemplate,
  selectedDataset,
  jobs,
  currentJob,
  onJobStart,
  onNext,
  onBack
}: TrainingProps) {
  const [trainingStarted, setTrainingStarted] = useState(false);
  const [currentJobData, setCurrentJobData] = useState<TrainingJob | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  const { isConnected, subscribeToJob } = useWebSocket((message: WebSocketMessage) => {
    if (message.type === 'training_update' && message.job) {
      setCurrentJobData(message.job);
      queryClient.setQueryData(['/api/training/jobs'], (old: TrainingJob[] | undefined) => {
        if (!old) return [message.job];
        return old.map(job => job.id === message.job.id ? message.job : job);
      });
    }
  });

  // Get templates and datasets for display
  const { data: templates } = useQuery({
    queryKey: ['/api/templates'],
  });

  const { data: datasets } = useQuery({
    queryKey: ['/api/datasets'],
  });

  const selectedTemplateData = templates?.find(t => t.id === selectedTemplate);
  const selectedDatasetData = datasets?.find(d => d.id === selectedDataset);

  // Training mutations
  const startTrainingMutation = useMutation({
    mutationFn: startTraining,
    onSuccess: (data) => {
      onJobStart(data.id);
      setCurrentJobData(data);
      setTrainingStarted(true);
      subscribeToJob(data.id);
      toast({
        title: "Training started",
        description: `Training job "${data.name}" has been started successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to start training",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopTrainingMutation = useMutation({
    mutationFn: stopTraining,
    onSuccess: () => {
      toast({
        title: "Training stopped",
        description: "Training has been stopped successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to stop training",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (currentJob) {
      const job = jobs.find(j => j.id === currentJob);
      if (job) {
        setCurrentJobData(job);
        setTrainingStarted(true);
        subscribeToJob(job.id);
      }
    }
  }, [currentJob, jobs, subscribeToJob]);

  const handleStartTraining = () => {
    if (!selectedTemplate || !selectedDataset || !selectedTemplateData) {
      toast({
        title: "Missing requirements",
        description: "Please select both a template and dataset before starting training.",
        variant: "destructive",
      });
      return;
    }

    const jobName = `${selectedTemplateData.name} - ${new Date().toLocaleString()}`;

    startTrainingMutation.mutate({
      templateId: selectedTemplate,
      datasetId: selectedDataset,
      name: jobName,
    });
  };

  const handleStopTraining = () => {
    if (currentJob) {
      stopTrainingMutation.mutate(currentJob);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'running':
        return <Play className="w-5 h-5 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'running':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-destructive';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      {/* Educational Header */}
      <div className="gradient-bg-training border rounded-t-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="w-6 h-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Step 3: Train Your Model</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Start the training process with one click. Our platform automatically optimizes hyperparameters 
          and provides real-time monitoring of your model's progress.
        </p>

        {/* Educational Callout */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 mb-2">Training Process</h4>
              <p className="text-sm text-green-800">
                Training fine-tunes a pre-trained model on your specific data. The process adapts the model 
                to your use case while preserving its general language understanding. You can monitor progress 
                and stop training at any time.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Performance Monitor */}
        <div className="mb-6">
          <PerformanceMonitor compact />
        </div>

        {/* Adaptive Education */}
        {selectedTemplate && (
          <AdaptiveEducation
            topic="model-training"
            context="training-setup"
            currentAction={trainingStarted ? "monitor_training" : "configure_training"}
            className="mb-6"
          />
        )}

        {/* Training Configuration */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Selected Template</h4>
              {selectedTemplateData ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">{selectedTemplateData.name}</p>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      Model: {selectedTemplateData.config.model_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Learning Rate: {selectedTemplateData.config.learning_rate}
                    </p>
                    <p className="text-xs text-gray-500">
                      Epochs: {selectedTemplateData.config.max_epochs}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No template selected</p>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Selected Dataset</h4>
              {selectedDatasetData ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">{selectedDatasetData.name}</p>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                      Type: {selectedDatasetData.fileType.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Samples: {selectedDatasetData.sampleCount || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Size: {(selectedDatasetData.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No dataset selected</p>
              )}
            </div>
          </div>
        </div>

        {/* Training Controls */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Training Controls</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {!trainingStarted || currentJobData?.status === 'completed' || currentJobData?.status === 'failed' ? (
              <Button
                onClick={handleStartTraining}
                disabled={!selectedTemplate || !selectedDataset || startTrainingMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                <Play className="w-4 h-4 mr-2" />
                {startTrainingMutation.isPending ? "Starting..." : "Start Training"}
              </Button>
            ) : (
              <Button
                onClick={handleStopTraining}
                variant="destructive"
                disabled={stopTrainingMutation.isPending}
              >
                <Square className="w-4 h-4 mr-2" />
                {stopTrainingMutation.isPending ? "Stopping..." : "Stop Training"}
              </Button>
            )}

            {currentJobData && (
              <Badge className={getStatusColor(currentJobData.status)}>
                {currentJobData.status.charAt(0).toUpperCase() + currentJobData.status.slice(1)}
              </Badge>
            )}
          </div>
        </div>

        {/* Training Progress */}
        {currentJobData && (
          <div className="p-6 bg-gray-50 rounded-lg mb-8">
            <div className="flex items-center space-x-3 mb-4">
              {getStatusIcon(currentJobData.status)}
              <h3 className="text-lg font-semibold text-gray-900">
                Training Progress: {currentJobData.name}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {currentJobData.progress}%
                </div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {currentJobData.currentEpoch}/{currentJobData.totalEpochs}
                </div>
                <div className="text-sm text-gray-600">Epochs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {currentJobData.trainingLoss || '—'}
                </div>
                <div className="text-sm text-gray-600">Loss</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {currentJobData.status === 'running' ? 
                    `${Math.max(0, 20 - Math.round(currentJobData.progress * 0.2))} min` : 
                    '—'
                  }
                </div>
                <div className="text-sm text-gray-600">ETA</div>
              </div>
            </div>

            <Progress value={currentJobData.progress} className="mb-4" />

            {currentJobData.status === 'running' && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span>Training in progress... Loss is decreasing steadily.</span>
              </div>
            )}

            {currentJobData.status === 'completed' && (
              <div className="flex items-center space-x-2 text-sm text-success">
                <CheckCircle className="w-4 h-4" />
                <span>Training completed successfully! Model is ready for testing.</span>
              </div>
            )}

            {currentJobData.status === 'failed' && (
              <div className="flex items-center space-x-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span>Training failed: {currentJobData.error || 'Unknown error'}</span>
              </div>
            )}
          </div>
        )}

        {/* Training History */}
        {jobs.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Training History</h3>
            <div className="space-y-3">
              {jobs.slice(0, 5).map((job) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium text-gray-900">{job.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {job.progress}%
                    </Badge>
                    <Badge className={getStatusColor(job.status)}>
                      {job.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            Back to Data Upload
          </Button>

          <Button 
            onClick={onNext}
            disabled={!currentJobData || currentJobData.status !== 'completed'}
            className="bg-primary hover:bg-primary/90"
          >
            Test Model
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}