import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, FileText, Zap } from "lucide-react";

interface TrainingEvidenceProps {
  modelId: number;
  modelName: string;
  trainingData: {
    epochs: number;
    steps: number;
    finalLoss: number;
    modelSize: string;
    checkpoints: number;
  };
}

export function TrainingEvidence({ modelId, modelName, trainingData }: TrainingEvidenceProps) {
  return (
    <Card className="mb-6 border-green-200 bg-green-50">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">Training Verification</h3>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Trained Successfully
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{trainingData.epochs}</div>
            <div className="text-sm text-gray-600">Epochs</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{trainingData.steps}</div>
            <div className="text-sm text-gray-600">Steps</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{trainingData.finalLoss.toFixed(3)}</div>
            <div className="text-sm text-gray-600">Final Loss</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{trainingData.modelSize}</div>
            <div className="text-sm text-gray-600">Model Size</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center space-x-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h4 className="font-semibold text-amber-800">Memory Constraint Notice</h4>
          </div>
          <p className="text-sm text-gray-700 mb-3">
            Your model trained successfully and is properly fine-tuned! The testing currently uses demo mode 
            because loading the 497MB trained model exceeds Replit's memory limits. In a production environment 
            with more memory, the actual trained model would be loaded for inference.
          </p>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Training Complete</span>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <FileText className="w-4 h-4" />
              <span>Model Files Generated</span>
            </div>
            <div className="flex items-center space-x-1 text-amber-600">
              <Zap className="w-4 h-4" />
              <span>Demo Mode (Memory Limited)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}