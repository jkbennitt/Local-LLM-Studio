import { apiRequest } from "./queryClient";

export async function uploadDataset(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/datasets', {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('Failed to upload dataset');
  }
  
  return response.json();
}

export async function startTraining(data: {
  templateId: number;
  datasetId: number;
  name: string;
}): Promise<any> {
  const response = await apiRequest('POST', '/api/training/start', data);
  return response.json();
}

export async function stopTraining(jobId: number): Promise<any> {
  const response = await apiRequest('POST', `/api/training/jobs/${jobId}/stop`, {});
  return response.json();
}

export async function deleteDataset(id: number): Promise<any> {
  const response = await fetch(`/api/datasets/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete dataset');
  }
  
  return response.json();
}

export async function testModel(modelId: number, prompt: string): Promise<any> {
  const response = await apiRequest('POST', `/api/models/${modelId}/test`, { prompt });
  return response.json();
}
