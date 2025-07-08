import { useState, useCallback } from "react";
import { Upload, File, FileText, Table, X, Info, HelpCircle, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { uploadDataset, deleteDataset } from "@/lib/api";
import { Dataset } from "@/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DataUploadProps {
  datasets: Dataset[];
  selectedDataset: number | null;
  onDatasetSelect: (datasetId: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function DataUpload({
  datasets,
  selectedDataset,
  onDatasetSelect,
  onNext,
  onBack
}: DataUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: uploadDataset,
    onSuccess: (data) => {
      toast({
        title: "Dataset uploaded successfully",
        description: `${data.name} has been processed and is ready for training.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
      onDatasetSelect(data.id);
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      
      let errorMessage = 'An unexpected error occurred';
      let errorTitle = 'Upload failed';
      
      // Handle different types of errors
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Provide helpful suggestions based on error type
      if (errorMessage.includes('file type') || errorMessage.includes('Invalid file')) {
        errorTitle = 'Invalid file type';
        errorMessage += ' Please ensure you upload CSV, JSON, TXT, or PDF files only.';
      } else if (errorMessage.includes('too large') || errorMessage.includes('size')) {
        errorTitle = 'File too large';
        errorMessage += ' Please use files smaller than 50MB.';
      } else if (errorMessage.includes('No file')) {
        errorTitle = 'No file selected';
        errorMessage = 'Please select a file to upload.';
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
      toast({
        title: "Dataset deleted",
        description: "Dataset has been permanently removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed", 
        description: error.message || "Failed to delete dataset",
        variant: "destructive",
      });
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    console.log('Uploading file:', file.name, 'Size:', file.size);
    
    const allowedTypes = ['.csv', '.json', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid file type",
        description: `File type "${fileExtension}" is not supported. Please upload CSV, JSON, or TXT files only.`,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast({
        title: "File too large",
        description: `File size (${sizeMB}MB) exceeds the 50MB limit. Please use a smaller file.`,
        variant: "destructive",
      });
      return;
    }

    if (file.size === 0) {
      toast({
        title: "Empty file",
        description: "The selected file is empty. Please choose a file with data.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await uploadMutation.mutateAsync(file);
      setUploadProgress(100);
    } catch (error) {
      // Error handled in mutation
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      clearInterval(progressInterval);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'csv':
        return Table;
      case 'json':
        return File;
      case 'txt':
        return FileText;
      case 'pdf':
        return FileText;
      default:
        return File;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const selectedDatasetData = datasets.find(d => d.id === selectedDataset);

  return (
    <Card>
      {/* Educational Header */}
      <div className="gradient-bg-architecture border rounded-t-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Upload className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Step 2: Upload Your Training Data</h2>
        </div>
        <p className="text-gray-700 mb-4">
          Upload your training data in CSV, JSON, or TXT format. The platform will automatically 
          preprocess and validate your data for optimal training results.
        </p>
        
        {/* Educational Callout */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-900 mb-2">Data Quality Tips</h4>
              <p className="text-sm text-purple-800">
                High-quality, diverse data is crucial for good model performance. Ensure your data is 
                clean, representative of your use case, and includes varied examples. We recommend 
                at least 100 examples for effective training.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        {/* File Upload Area */}
        <div className="mb-8">
          <div
            className={cn(
              "drag-zone rounded-lg p-8 text-center transition-all",
              isDragging ? "dragover" : "border-gray-300",
              isUploading ? "opacity-50 pointer-events-none" : ""
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isUploading ? (uploadProgress > 80 ? "Processing file..." : "Uploading...") : "Drop your files here"}
            </h3>
            <p className="text-gray-600 mb-4">
              Supports CSV, JSON, TXT, and PDF files up to 50MB
            </p>
            
            {isUploading && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {uploadProgress < 80 ? `${uploadProgress}% uploaded` : 
                   uploadProgress < 95 ? "Extracting text from PDF..." : 
                   "Finalizing..."}
                </p>
              </div>
            )}
            
            <div className="relative">
              <input
                type="file"
                accept=".csv,.json,.txt,.pdf"
                onChange={handleFileInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button variant="outline" disabled={isUploading}>
                Choose File
              </Button>
            </div>
          </div>
        </div>

        {/* Uploaded Datasets */}
        {datasets.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Datasets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {datasets.map((dataset) => {
                const Icon = getFileIcon(dataset.fileType);
                const isSelected = selectedDataset === dataset.id;
                
                return (
                  <div
                    key={dataset.id}
                    className={cn(
                      "border-2 rounded-lg p-4 cursor-pointer transition-all",
                      isSelected 
                        ? "border-primary bg-orange-50" 
                        : "border-gray-200 hover:border-primary"
                    )}
                    onClick={() => onDatasetSelect(dataset.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {dataset.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(dataset.fileSize)}
                        </p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="secondary">
                            {dataset.fileType.toUpperCase()}
                          </Badge>
                          {dataset.sampleCount && (
                            <Badge variant="outline">
                              {dataset.sampleCount} samples
                            </Badge>
                          )}
                          {dataset.preprocessed && (
                            <Badge variant="default">
                              Preprocessed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(dataset.id);
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {isSelected && (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Preview */}
        {selectedDatasetData && (
          <div className="p-6 bg-gray-50 rounded-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Selected Dataset: {selectedDatasetData.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">File Info</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Type: {selectedDatasetData.fileType.toUpperCase()}</li>
                  <li>• Size: {formatFileSize(selectedDatasetData.fileSize)}</li>
                  <li>• Samples: {selectedDatasetData.sampleCount || 'Unknown'}</li>
                  <li>• Status: {selectedDatasetData.preprocessed ? 'Preprocessed' : 'Ready'}</li>
                  {selectedDatasetData.fileType === 'pdf' && (
                    <li>• OCR Processing: Completed</li>
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Quality Check</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    Format validation passed
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    No duplicate entries
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                    Sufficient data volume
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• Data quality: Good</li>
                  <li>• Training readiness: Ready</li>
                  <li>• Expected performance: High</li>
                  <li>• Estimated training time: 15-20 min</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            Back to Templates
          </Button>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>You can upload multiple datasets and switch between them</p>
                </TooltipContent>
              </Tooltip>
              <span className="text-sm text-gray-600">Multiple datasets supported</span>
            </div>
            
            <Button 
              onClick={onNext}
              disabled={!selectedDataset}
              className="bg-primary hover:bg-primary/90"
            >
              Start Training
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
