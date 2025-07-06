import { useState } from "react";
import { MessageSquare, PenTool, Code, Check, HelpCircle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ModelTemplate } from "@/types";

interface TemplateSelectionProps {
  templates: ModelTemplate[];
  selectedTemplate: number | null;
  onTemplateSelect: (templateId: number) => void;
  onNext: () => void;
}

export default function TemplateSelection({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onNext
}: TemplateSelectionProps) {
  const getTemplateIcon = (useCase: string) => {
    switch (useCase) {
      case 'customer_service':
        return MessageSquare;
      case 'creative_writing':
        return PenTool;
      case 'code_assistant':
        return Code;
      default:
        return MessageSquare;
    }
  };

  const getTemplateColor = (useCase: string) => {
    switch (useCase) {
      case 'customer_service':
        return 'bg-primary text-white';
      case 'creative_writing':
        return 'bg-purple-500 text-white';
      case 'code_assistant':
        return 'bg-green-500 text-white';
      default:
        return 'bg-primary text-white';
    }
  };

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <Card>
      {/* Educational Header */}
      <div className="gradient-bg-dataset border rounded-t-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Info className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Step 1: Choose Your Model Template</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Select a pre-configured template optimized for your specific use case. Each template includes 
          the best model architecture, training parameters, and example data formats.
        </p>
        
        {/* Educational Callout */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Why templates matter</h4>
              <p className="text-sm text-blue-800">
                Templates eliminate the complexity of choosing model architectures and hyperparameters. 
                Each template is optimized for specific tasks and includes pre-trained weights that make 
                learning faster and more effective.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Template Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {templates.map((template) => {
            const Icon = getTemplateIcon(template.useCase);
            const isSelected = selectedTemplate === template.id;
            
            return (
              <div
                key={template.id}
                className={cn(
                  "border-2 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all",
                  isSelected
                    ? "border-primary bg-orange-50"
                    : "border-gray-200 hover:border-primary"
                )}
                onClick={() => onTemplateSelect(template.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center",
                    getTemplateColor(template.useCase)
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <Badge variant={isSelected ? "default" : "secondary"}>
                    {isSelected ? "Selected" : "Available"}
                  </Badge>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm text-gray-700">
                      {template.config.model_name} ({template.modelType})
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm text-gray-700">
                      Optimized for {template.useCase.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm text-gray-700">
                      {template.config.max_epochs} epochs training
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Expected accuracy:</span>
                    <span className="font-semibold text-gray-900">
                      {template.config.expected_accuracy}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Template Details */}
        {selectedTemplateData && (
          <div className="p-6 bg-gray-50 rounded-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Selected Template: {selectedTemplateData.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Configuration</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Model: {selectedTemplateData.config.model_name}</li>
                  <li>• Learning rate: {selectedTemplateData.config.learning_rate}</li>
                  <li>• Batch size: {selectedTemplateData.config.batch_size}</li>
                  <li>• Training epochs: {selectedTemplateData.config.max_epochs}</li>
                  <li>• Temperature: {selectedTemplateData.config.temperature}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Expected Data Format</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {selectedTemplateData.useCase === 'customer_service' && (
                    <>
                      <li>• Question-answer pairs (CSV/JSON)</li>
                      <li>• Customer service transcripts</li>
                      <li>• FAQ documents</li>
                      <li>• Support ticket responses</li>
                    </>
                  )}
                  {selectedTemplateData.useCase === 'creative_writing' && (
                    <>
                      <li>• Stories and narratives</li>
                      <li>• Poetry and creative text</li>
                      <li>• Writing samples</li>
                      <li>• Creative prompts</li>
                    </>
                  )}
                  {selectedTemplateData.useCase === 'code_assistant' && (
                    <>
                      <li>• Code snippets and examples</li>
                      <li>• Programming documentation</li>
                      <li>• Function definitions</li>
                      <li>• Code comments</li>
                    </>
                  )}
                  <li>• Minimum 100 examples recommended</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Next Step Button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p>You can change your template selection at any time during the process</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-sm text-gray-600">Template can be changed later</span>
          </div>
          <Button 
            onClick={onNext}
            disabled={!selectedTemplate}
            className="bg-primary hover:bg-primary/90"
          >
            Continue to Data Upload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
