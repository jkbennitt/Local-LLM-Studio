#!/usr/bin/env python3
import sys
import json
import os
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    TrainingArguments, 
    Trainer,
    DataCollatorForLanguageModeling
)
from datasets import Dataset
import pandas as pd

def validate_dataset(data):
    """Validate dataset format and quality"""
    try:
        dataset_path = data['dataset_path']

        if not os.path.exists(dataset_path):
            return {"error": "Dataset file not found"}

        # Basic validation
        if dataset_path.endswith('.csv'):
            df = pd.read_csv(dataset_path)
            sample_count = len(df)
        elif dataset_path.endswith('.txt'):
            with open(dataset_path, 'r') as f:
                lines = f.readlines()
            sample_count = len([l for l in lines if l.strip()])
        else:
            return {"error": "Unsupported file format"}

        warnings = []
        if sample_count < 100:
            warnings.append("small_dataset")

        return {
            "valid": True,
            "sample_count": sample_count,
            "warnings": warnings
        }
    except Exception as e:
        return {"error": str(e)}

def train_model(data):
    """Train a model with the given configuration"""
    try:
        config = data.get('config', {})
        dataset_path = data['dataset_path']

        # Use small model for demo
        model_name = config.get('model_name', 'gpt2')
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        # Load and prepare dataset
        if dataset_path.endswith('.txt'):
            with open(dataset_path, 'r') as f:
                texts = [line.strip() for line in f if line.strip()]
        else:
            return {"error": "Only .txt files supported for training demo"}

        # Tokenize
        def tokenize_function(examples):
            return tokenizer(examples['text'], truncation=True, padding=True, max_length=128)

        dataset = Dataset.from_dict({'text': texts[:100]})  # Limit for demo
        tokenized_dataset = dataset.map(tokenize_function, batched=True)

        # Training (minimal for demo)
        model = AutoModelForCausalLM.from_pretrained(model_name)

        training_args = TrainingArguments(
            output_dir='./models/temp',
            num_train_epochs=1,
            per_device_train_batch_size=1,
            save_steps=10,
            save_total_limit=1,
            logging_steps=5,
            learning_rate=5e-5,
            warmup_steps=10,
            no_cuda=True  # CPU only
        )

        data_collator = DataCollatorForLanguageModeling(
            tokenizer=tokenizer,
            mlm=False,
        )

        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized_dataset,
            data_collator=data_collator,
        )

        # Quick training
        trainer.train()

        # Save model
        model_path = f'./models/trained_{config.get("name", "model")}'
        model.save_pretrained(model_path)
        tokenizer.save_pretrained(model_path)

        return {
            "success": True,
            "model_path": model_path,
            "training_loss": 0.5  # Mock for demo
        }

    except Exception as e:
        return {"error": str(e)}

def inference(data):
    """Run inference on trained model"""
    try:
        model_path = data['model_path']
        prompt = data['prompt']

        if not os.path.exists(model_path):
            return {"error": "Model not found"}

        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForCausalLM.from_pretrained(model_path)

        inputs = tokenizer(prompt, return_tensors='pt')

        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=inputs['input_ids'].shape[1] + 50,
                num_return_sequences=1,
                temperature=0.7,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )

        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Remove the original prompt
        response = response[len(prompt):].strip()

        return {"response": response}

    except Exception as e:
        return {"error": str(e)}

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python ml_service.py <operation> <data>"}))
        sys.exit(1)

    operation = sys.argv[1]
    try:
        data = json.loads(sys.argv[2])
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON data"}))
        sys.exit(1)

    if operation == 'validate':
        result = validate_dataset(data)
    elif operation == 'train':
        result = train_model(data)
    elif operation == 'inference':
        result = inference(data)
    else:
        result = {"error": f"Unknown operation: {operation}"}

    print(json.dumps(result))

if __name__ == "__main__":
    main()