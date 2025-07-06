import { Database, Settings, Play, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrainingJob } from "@/types";

interface SidebarProps {
  activeStep: string;
  onStepChange: (step: 'template' | 'data' | 'training' | 'testing') => void;
  currentJob: number | null;
  jobs: TrainingJob[];
}

export default function Sidebar({ activeStep, onStepChange, currentJob, jobs }: SidebarProps) {
  const currentJobData = jobs.find(job => job.id === currentJob);
  
  const steps = [
    { id: 'template', label: 'Template Selection', icon: Database },
    { id: 'data', label: 'Data Upload', icon: Settings },
    { id: 'training', label: 'Training', icon: Play },
    { id: 'testing', label: 'Testing', icon: FlaskConical },
  ];

  return (
    <div className="lg:col-span-1">
      <Card>
        <CardContent className="p-6">
          {/* Workflow Navigation */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow</h3>
            <nav className="space-y-2">
              {steps.map((step) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;
                
                return (
                  <Button
                    key={step.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      isActive
                        ? "bg-orange-50 text-primary hover:bg-orange-50"
                        : "text-gray-700 hover:bg-gray-50"
                    )}
                    onClick={() => onStepChange(step.id as any)}
                  >
                    <Icon className="w-4 h-4 mr-3" />
                    {step.label}
                  </Button>
                );
              })}
            </nav>
          </div>

          {/* Training Status */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Training Status</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Model</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentJobData ? 'Training...' : 'GPT-2 Small'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentJobData ? `${currentJobData.progress}%` : '0%'}
                </span>
              </div>
              <Progress 
                value={currentJobData ? currentJobData.progress : 0} 
                className="h-2"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Training Loss</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentJobData?.trainingLoss || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status</span>
                <span className="text-sm font-medium text-gray-900">
                  {currentJobData ? 
                    currentJobData.status.charAt(0).toUpperCase() + currentJobData.status.slice(1) : 
                    'Ready'
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
