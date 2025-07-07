#!/usr/bin/env python3

import sys
import json
import os
import time
import random

def validate_dataset(data):
    """Validate dataset format and quality"""
    try:
        dataset_path = data['dataset_path']

        if not os.path.exists(dataset_path):
            return {"error": "Dataset file not found"}

        # Basic validation
        if dataset_path.endswith('.csv'):
            try:
                with open(dataset_path, 'r') as f:
                    lines = f.readlines()
                sample_count = len(lines) - 1  # subtract header
            except:
                return {"error": "Failed to read CSV file"}
        elif dataset_path.endswith('.txt'):
            try:
                with open(dataset_path, 'r') as f:
                    content = f.read()
                # Count lines with | separator (question|answer format)
                lines = [l.strip() for l in content.split('\n') if '|' in l.strip()]
                sample_count = len(lines)
            except:
                return {"error": "Failed to read text file"}
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
    """Simulate model training"""
    try:
        config = data.get('config', {})
        dataset_path = data['dataset_path']
        
        # Send training progress updates directly to stdout as JSON
        for i in range(1, 11):
            time.sleep(0.3)  # Simulate training time
            loss = 2.5 - (i * 0.2) + random.uniform(-0.1, 0.1)
            
            # Send progress update as separate JSON line
            progress_data = {
                "type": "training_progress",
                "progress": i * 10,
                "epoch": i,
                "loss": round(loss, 4),
                "status": f"Training epoch {i}/10"
            }
            sys.stdout.write(json.dumps(progress_data) + '\n')
            sys.stdout.flush()
        
        # Simulate model saving
        model_path = f"./models/trained_model_{int(time.time())}.json"
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        with open(model_path, 'w') as f:
            json.dump({
                "model_type": "simulated",
                "dataset_path": dataset_path,
                "config": config,
                "trained_at": time.time()
            }, f)
        
        return {
            "success": True,
            "model_path": model_path,
            "final_loss": round(loss, 4),
            "epochs_completed": 10,
            "training_time": 3.0
        }
    except Exception as e:
        return {"error": str(e)}

def test_model(data):
    """Test a trained model"""
    try:
        model_path = data['model_path']
        prompt = data.get('prompt', 'Hello')
        
        if not os.path.exists(model_path):
            return {"error": "Model not found"}
        
        # Simulate inference
        simulated_responses = [
            f"This is a simulated response to: {prompt}",
            f"Based on the training data, I would say: {prompt} is interesting.",
            f"My analysis of '{prompt}' suggests it's a valid input.",
            f"Responding to your prompt '{prompt}': This is a test response."
        ]
        
        response = random.choice(simulated_responses)
        
        return {
            "success": True,
            "response": response,
            "model_used": model_path,
            "confidence": round(random.uniform(0.7, 0.95), 2)
        }
    except Exception as e:
        return {"error": str(e)}

def get_system_info():
    """Get system information"""
    try:
        return {
            "python_version": sys.version,
            "platform": sys.platform,
            "available_memory": "Unknown",
            "status": "ready"
        }
    except Exception as e:
        return {"error": str(e)}

def main():
    """Main service loop"""
    try:
        for line in sys.stdin:
            try:
                data = json.loads(line.strip())
                action = data.get('action')
                
                if action == 'validate_dataset' or action == 'validate':
                    result = validate_dataset(data)
                elif action == 'train_model' or action == 'train':
                    result = train_model(data)
                elif action == 'test_model' or action == 'test':
                    result = test_model(data)
                elif action == 'get_system_info':
                    result = get_system_info()
                else:
                    result = {"error": f"Unknown action: {action}"}
                
                print(json.dumps(result))
                sys.stdout.flush()
                
            except json.JSONDecodeError:
                print(json.dumps({"error": "Invalid JSON input"}))
                sys.stdout.flush()
            except Exception as e:
                print(json.dumps({"error": str(e)}))
                sys.stdout.flush()
                
    except KeyboardInterrupt:
        print(json.dumps({"status": "Service stopped"}))
    except Exception as e:
        print(json.dumps({"error": f"Service error: {str(e)}"}))

if __name__ == "__main__":
    main()