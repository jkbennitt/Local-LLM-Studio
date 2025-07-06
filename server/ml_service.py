#!/usr/bin/env python3

import sys
import json
import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling,
    pipeline
)
from datasets import Dataset
import pandas as pd
import numpy as np
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLService:
    def __init__(self):
        self.models_dir = Path("models")
        self.models_dir.mkdir(exist_ok=True)
        
        # Check for GPU availability
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")
        
    def load_dataset(self, dataset_path: str, file_type: str) -> Dataset:
        """Load and preprocess dataset based on file type"""
        try:
            if file_type == 'csv':
                df = pd.read_csv(dataset_path)
                # Assume first column is input, second is target
                if len(df.columns) >= 2:
                    texts = df.iloc[:, 0].astype(str).tolist()
                    if len(df.columns) >= 2:
                        # For paired data (question-answer)
                        texts = [f"{row[0]} {row[1]}" for _, row in df.iterrows()]
                    else:
                        texts = df.iloc[:, 0].astype(str).tolist()
                else:
                    texts = df.iloc[:, 0].astype(str).tolist()
                    
            elif file_type == 'json':
                with open(dataset_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                if isinstance(data, list):
                    if isinstance(data[0], dict):
                        # Extract text from dictionary
                        texts = []
                        for item in data:
                            if 'text' in item:
                                texts.append(item['text'])
                            elif 'input' in item and 'output' in item:
                                texts.append(f"{item['input']} {item['output']}")
                            else:
                                texts.append(str(item))
                    else:
                        texts = [str(item) for item in data]
                else:
                    texts = [str(data)]
                    
            elif file_type == 'txt':
                with open(dataset_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    texts = [line.strip() for line in content.split('\n') if line.strip()]
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
                
            # Create dataset
            dataset = Dataset.from_dict({"text": texts})
            logger.info(f"Loaded dataset with {len(dataset)} samples")
            return dataset
            
        except Exception as e:
            logger.error(f"Error loading dataset: {str(e)}")
            raise
    
    def preprocess_data(self, dataset: Dataset, tokenizer, max_length: int = 256) -> Dataset:
        """Tokenize and preprocess the dataset"""
        def tokenize_function(examples):
            return tokenizer(
                examples["text"],
                truncation=True,
                padding=True,
                max_length=max_length,
                return_tensors="pt"
            )
        
        tokenized_dataset = dataset.map(tokenize_function, batched=True)
        return tokenized_dataset
    
    def train_model(self, job_id: int, dataset_path: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Train a model with the given configuration"""
        try:
            logger.info(f"Starting training for job {job_id}")
            
            # Extract config
            model_name = config.get("model_name", "gpt2")
            learning_rate = config.get("learning_rate", 5e-5)
            batch_size = config.get("batch_size", 8)
            max_epochs = config.get("max_epochs", 3)
            max_length = config.get("max_length", 256)
            
            # Determine file type
            file_type = Path(dataset_path).suffix[1:].lower()
            
            # Load dataset
            dataset = self.load_dataset(dataset_path, file_type)
            
            # Load tokenizer and model
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token
            
            model = AutoModelForCausalLM.from_pretrained(model_name)
            model.to(self.device)
            
            # Preprocess data
            tokenized_dataset = self.preprocess_data(dataset, tokenizer, max_length)
            
            # Split dataset
            train_size = int(0.8 * len(tokenized_dataset))
            val_size = len(tokenized_dataset) - train_size
            train_dataset, val_dataset = torch.utils.data.random_split(
                tokenized_dataset, [train_size, val_size]
            )
            
            # Data collator
            data_collator = DataCollatorForLanguageModeling(
                tokenizer=tokenizer,
                mlm=False,
                return_tensors="pt",
            )
            
            # Training arguments
            output_dir = self.models_dir / f"job_{job_id}"
            training_args = TrainingArguments(
                output_dir=str(output_dir),
                num_train_epochs=max_epochs,
                per_device_train_batch_size=batch_size,
                per_device_eval_batch_size=batch_size,
                learning_rate=learning_rate,
                warmup_steps=100,
                logging_steps=10,
                save_steps=500,
                evaluation_strategy="steps",
                eval_steps=500,
                save_total_limit=2,
                load_best_model_at_end=True,
                metric_for_best_model="eval_loss",
                greater_is_better=False,
                dataloader_pin_memory=False,
                remove_unused_columns=False,
            )
            
            # Create trainer
            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=train_dataset,
                eval_dataset=val_dataset,
                data_collator=data_collator,
            )
            
            # Train model
            logger.info("Starting training...")
            trainer.train()
            
            # Save model
            model_path = output_dir / "final_model"
            trainer.save_model(str(model_path))
            tokenizer.save_pretrained(str(model_path))
            
            # Get training metrics
            train_results = trainer.state.log_history
            final_loss = train_results[-1].get("train_loss", 0.0) if train_results else 0.0
            
            logger.info(f"Training completed for job {job_id}")
            
            return {
                "success": True,
                "model_path": str(model_path),
                "final_loss": final_loss,
                "performance": {
                    "train_loss": final_loss,
                    "eval_loss": train_results[-1].get("eval_loss", 0.0) if train_results else 0.0,
                    "epochs_completed": max_epochs,
                    "training_samples": len(train_dataset),
                    "validation_samples": len(val_dataset)
                }
            }
            
        except Exception as e:
            logger.error(f"Training error for job {job_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def inference(self, model_path: str, prompt: str, max_length: int = 100) -> Dict[str, Any]:
        """Generate text using a trained model"""
        try:
            # Load model and tokenizer
            tokenizer = AutoTokenizer.from_pretrained(model_path)
            model = AutoModelForCausalLM.from_pretrained(model_path)
            model.to(self.device)
            
            # Create pipeline
            generator = pipeline(
                "text-generation",
                model=model,
                tokenizer=tokenizer,
                device=0 if self.device.type == "cuda" else -1,
                do_sample=True,
                temperature=0.7,
                max_length=max_length,
                pad_token_id=tokenizer.eos_token_id
            )
            
            # Generate text
            results = generator(prompt, max_length=max_length, num_return_sequences=1)
            response = results[0]["generated_text"]
            
            # Clean up response (remove original prompt)
            if response.startswith(prompt):
                response = response[len(prompt):].strip()
            
            return {
                "success": True,
                "response": response
            }
            
        except Exception as e:
            logger.error(f"Inference error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "response": "Error generating response"
            }

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing operation and data arguments"}))
        sys.exit(1)
    
    operation = sys.argv[1]
    data_json = sys.argv[2]
    
    try:
        data = json.loads(data_json)
        ml_service = MLService()
        
        if operation == "train":
            result = ml_service.train_model(
                data["job_id"],
                data["dataset_path"],
                data["config"]
            )
        elif operation == "inference":
            result = ml_service.inference(
                data["model_path"],
                data["prompt"],
                data.get("max_length", 100)
            )
        else:
            result = {"error": f"Unknown operation: {operation}"}
        
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
