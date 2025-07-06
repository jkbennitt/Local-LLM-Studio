import { Info, CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkflowOverviewProps {
  activeStep: string;
  onStepChange: (step: 'template' | 'data' | 'training' | 'testing') => void;
  selectedTemplate: number | null;
  selectedDataset: number | null;
  currentJob: number | null;
}

export default function WorkflowOverview({
  activeStep,
  onStepChange,
  selectedTemplate,
  selectedDataset,
  currentJob
}: WorkflowOverviewProps) {
  const steps = [
    {
      id: 'template',
      title: 'Choose Template',
      description: 'Select from customer service, creative writing, or code assistance templates',
      time: '2 min',
      completed: selectedTemplate !== null,
      active: activeStep === 'template'
    },
    {
      id: 'data',
      title: 'Upload Data',
      description: 'Drag and drop your training data (CSV, JSON, or text files)',
      time: '5 min',
      completed: selectedDataset !== null,
      active: activeStep === 'data'
    },
    {
      id: 'training',
      title: 'Start Training',
      description: 'One-click training with automatic optimization and monitoring',
      time: '15-30 min',
      completed: currentJob !== null,
      active: activeStep === 'training'
    },
    {
      id: 'testing',
      title: 'Test & Deploy',
      description: 'Interactive testing with instant API endpoint deployment',
      time: '5 min',
      completed: false,
      active: activeStep === 'testing'
    }
  ];

  const getStepIcon = (step: any) => {
    if (step.completed) return CheckCircle;
    if (step.active) return Clock;
    return AlertCircle;
  };

  const getStepIconColor = (step: any) => {
    if (step.completed) return 'text-success';
    if (step.active) return 'text-blue-500';
    return 'text-gray-400';
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <Info className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-900">ML Workflow Overview</h2>
      </div>
      <p className="text-gray-700 mb-6">
        Train your own AI model in 4 simple steps. No machine learning experience required - 
        our platform handles the complexity while you focus on your use case.
      </p>
      
      {/* Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((step, index) => {
          const Icon = getStepIcon(step);
          const iconColor = getStepIconColor(step);
          
          return (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "workflow-card bg-white border-2 rounded-lg p-4 cursor-pointer flex-1",
                  step.active ? "border-primary bg-orange-50" : "border-gray-200"
                )}
                onClick={() => onStepChange(step.id as any)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    step.active ? "bg-primary" : "bg-gray-300"
                  )}>
                    <Icon className={cn("w-4 h-4", step.active ? "text-white" : "text-gray-600")} />
                  </div>
                  <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                <Badge variant={step.completed ? "default" : step.active ? "secondary" : "outline"}>
                  {step.time}
                </Badge>
              </div>
              
              {/* Arrow between steps */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center mx-2">
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
