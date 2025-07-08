import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import WorkflowOverview from "@/components/workflow-overview";
import TemplateSelection from "@/components/template-selection";
import DataUpload from "@/components/data-upload";
import Training from "@/components/training";
import Testing from "@/components/testing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Brain, 
  Database, 
  Settings, 
  BarChart3, 
  Zap, 
  Users, 
  BookOpen, 
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Upload,
  Play,
  Eye
} from 'lucide-react';

interface QuickStat {
  label: string;
  value: string;
  change: string;
  icon: React.ReactNode;
}

interface RecentActivity {
  id: string;
  type: 'training' | 'dataset' | 'model';
  title: string;
  status: 'completed' | 'running' | 'failed';
  timestamp: string;
}

type WorkflowStep = 'template' | 'data' | 'training' | 'testing';

export default function Home() {
  const [activeStep, setActiveStep] = useState<WorkflowStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);
  const [currentJob, setCurrentJob] = useState<number | null>(null);

  // Fetch initial data
  const { data: templates } = useQuery({
    queryKey: ['/api/templates'],
  });

  const { data: datasets } = useQuery({
    queryKey: ['/api/datasets'],
  });

  const { data: jobs } = useQuery({
    queryKey: ['/api/training/jobs'],
  });

  const { data: models } = useQuery({
    queryKey: ['/api/models'],
  });

  const renderContent = () => {
    switch (activeStep) {
      case 'template':
        return (
          <TemplateSelection
            templates={templates || []}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={setSelectedTemplate}
            onNext={() => setActiveStep('data')}
          />
        );
      case 'data':
        return (
          <DataUpload
            datasets={datasets || []}
            selectedDataset={selectedDataset}
            onDatasetSelect={setSelectedDataset}
            onNext={() => setActiveStep('training')}
            onBack={() => setActiveStep('template')}
          />
        );
      case 'training':
        return (
          <Training
            selectedTemplate={selectedTemplate}
            selectedDataset={selectedDataset}
            jobs={jobs || []}
            currentJob={currentJob}
            onJobStart={setCurrentJob}
            onNext={() => setActiveStep('testing')}
            onBack={() => setActiveStep('data')}
          />
        );
      case 'testing':
        return (
          <Testing
            models={models || []}
            currentJob={currentJob}
            onBack={() => setActiveStep('training')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Sidebar
            activeStep={activeStep}
            onStepChange={setActiveStep}
            currentJob={currentJob}
            jobs={jobs || []}
          />

          <div className="lg:col-span-3">
            <WorkflowOverview
              activeStep={activeStep}
              onStepChange={setActiveStep}
              selectedTemplate={selectedTemplate}
              selectedDataset={selectedDataset}
              currentJob={currentJob}
            />

            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}