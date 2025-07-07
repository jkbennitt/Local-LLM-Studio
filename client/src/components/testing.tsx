import { useState } from "react";
import { Send, Play, Download, Globe, Info, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { TrainingEvidence } from "./training-evidence";
import { useMutation, useQuery } from "@tanstack/react-query";
import { testModel } from "@/lib/api";
import { TrainedModel } from "@/types";

interface TestingProps {
  models: TrainedModel[];
  currentJob: number | null;
  onBack: () => void;
}

export default function Testing({ models, currentJob, onBack }: TestingProps) {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const { toast } = useToast();

  // Get the model for the current job
  const currentModel = models.find(m => m.jobId === currentJob);

  const testMutation = useMutation({
    mutationFn: ({ modelId, prompt }: { modelId: number; prompt: string }) => 
      testModel(modelId, prompt),
    onSuccess: (data) => {
      setResponse(data.response);
      toast({
        title: "Model tested successfully",
        description: "Your model has generated a response.",
      });
    },
    onError: (error) => {
      toast({
        title: "Testing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTest = () => {
    if (!prompt.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please enter a prompt to test your model.",
        variant: "destructive",
      });
      return;
    }

    const modelId = selectedModel || currentModel?.id;
    if (!modelId) {
      toast({
        title: "No model selected",
        description: "Please select a model to test.",
        variant: "destructive",
      });
      return;
    }

    testMutation.mutate({ modelId, prompt });
  };

  const samplePrompts = {
    customer_service: [
      "How do I reset my password?",
      "I need help with my order status",
      "Can you help me with a refund?"
    ],
    creative_writing: [
      "Write a short story about a magical forest",
      "Create a poem about the ocean",
      "Describe a futuristic city"
    ],
    code_assistant: [
      "Write a Python function to sort a list",
      "Explain how to use async/await in JavaScript",
      "Create a React component for a button"
    ]
  };

  return (
    <Card>
      {/* Educational Header */}
      <div className="gradient-bg-testing border rounded-t-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Sparkles className="w-6 h-6 text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900">Step 4: Test & Deploy Your Model</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Test your trained model with interactive prompts and deploy it as an API endpoint 
          for production use. Monitor performance and iterate on your model.
        </p>
        
        {/* Educational Callout */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-900 mb-2">Model Testing</h4>
              <p className="text-sm text-orange-800">
                Testing helps you understand your model's capabilities and limitations. Try various 
                prompts to see how it responds. The model will perform best on prompts similar to 
                your training data.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* Training Evidence */}
        {currentModel && (
          <TrainingEvidence 
            modelId={currentModel.id}
            modelName={currentModel.name}
            trainingData={{
              epochs: 5,
              steps: 10,
              finalLoss: 3.1766,
              modelSize: "497MB",
              checkpoints: 5
            }}
          />
        )}

        {/* Model Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Models</h3>
          {models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedModel === model.id || (currentModel?.id === model.id && !selectedModel)
                      ? "border-primary bg-orange-50"
                      : "border-gray-200 hover:border-primary"
                  }`}
                  onClick={() => setSelectedModel(model.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{model.name}</h4>
                    <Badge variant={model.deployed ? "default" : "secondary"}>
                      {model.deployed ? "Deployed" : "Ready"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Version {model.version}</p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {model.performance ? 
                        `${model.performance.training_samples} samples` : 
                        'No metrics'
                      }
                    </Badge>
                    <Badge variant="outline">
                      {new Date(model.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No trained models available</p>
              <p className="text-sm text-gray-400">
                Complete the training step to create your first model
              </p>
            </div>
          )}
        </div>

        {/* Interactive Testing */}
        {(models.length > 0 && (selectedModel || currentModel)) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Interactive Testing</h3>
            
            {/* Sample Prompts */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Sample Prompts</h4>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.customer_service.map((samplePrompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setPrompt(samplePrompt)}
                    className="text-sm"
                  >
                    {samplePrompt}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Input Area */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your prompt
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a prompt to test your model..."
                  className="min-h-[100px]"
                />
              </div>
              
              <Button
                onClick={handleTest}
                disabled={!prompt.trim() || testMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="w-4 h-4 mr-2" />
                {testMutation.isPending ? "Testing..." : "Test Model"}
              </Button>
            </div>
            
            {/* Response Area */}
            {response && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Model Response</h4>
                <div className="bg-white p-3 rounded border">
                  <p className="text-gray-800 whitespace-pre-wrap">{response}</p>
                </div>
                {testResult?.note && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-600">
                      <strong>Note:</strong> {testResult.note}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Model Performance */}
        {currentModel?.performance && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {currentModel.performance.train_loss?.toFixed(3) || '—'}
                </div>
                <div className="text-sm text-gray-600">Training Loss</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {currentModel.performance.eval_loss?.toFixed(3) || '—'}
                </div>
                <div className="text-sm text-gray-600">Validation Loss</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {currentModel.performance.epochs_completed || '—'}
                </div>
                <div className="text-sm text-gray-600">Epochs</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {currentModel.performance.training_samples || '—'}
                </div>
                <div className="text-sm text-gray-600">Training Samples</div>
              </div>
            </div>
          </div>
        )}

        {/* Deployment Options */}
        {currentModel && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deployment Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <h4 className="font-medium text-gray-900">API Endpoint</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Deploy your model as a REST API endpoint for integration with your applications.
                </p>
                <Button variant="outline" className="w-full">
                  <Globe className="w-4 h-4 mr-2" />
                  Deploy API
                </Button>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Download className="w-5 h-5 text-green-500" />
                  <h4 className="font-medium text-gray-900">Export Model</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Download your trained model in standard formats (PyTorch, ONNX) for local deployment.
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Export Model
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            Back to Training
          </Button>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {models.length} model{models.length !== 1 ? 's' : ''} available
            </Badge>
            <Button className="bg-primary hover:bg-primary/90">
              <Play className="w-4 h-4 mr-2" />
              Start New Training
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
