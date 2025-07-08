
#!/usr/bin/env python3
"""
Standalone model deployment for external use
Usage: python deploy_model.py <model_path> <port>
"""
import sys
import os
from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

app = Flask(__name__)

# Global model variables
model = None
tokenizer = None
model_name = "Unknown"

def load_model(model_path):
    global model, tokenizer, model_name
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_path)
        model = AutoModelForCausalLM.from_pretrained(model_path)
        model_name = os.path.basename(model_path)
        print(f"Model {model_name} loaded successfully")
        return True
    except Exception as e:
        print(f"Failed to load model: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model': model_name,
        'loaded': model is not None
    })

@app.route('/generate', methods=['POST'])
def generate():
    if not model or not tokenizer:
        return jsonify({'error': 'Model not loaded'}), 500
    
    data = request.json
    prompt = data.get('prompt', '')
    max_length = data.get('max_length', 100)
    temperature = data.get('temperature', 0.7)
    
    if not prompt:
        return jsonify({'error': 'Prompt required'}), 400
    
    try:
        inputs = tokenizer(prompt, return_tensors='pt')
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=len(inputs['input_ids'][0]) + max_length,
                temperature=temperature,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        response = response[len(prompt):].strip()
        
        return jsonify({
            'generated_text': response,
            'prompt': prompt,
            'model': model_name
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python deploy_model.py <model_path> [port]")
        sys.exit(1)
    
    model_path = sys.argv[1]
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    
    if not os.path.exists(model_path):
        print(f"Model path {model_path} does not exist")
        sys.exit(1)
    
    if load_model(model_path):
        print(f"Starting model server on port {port}")
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        print("Failed to start model server")
        sys.exit(1)
