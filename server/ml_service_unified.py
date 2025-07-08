#!/usr/bin/env python3
"""
Unified ML Service Handler
Handles all ML operations with consistent JSON input/output
"""

import json
import sys
import os
import logging
import time
import threading
from typing import Dict, Any, Optional
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
import socket

# Configure logging to stderr to keep stdout clean for JSON responses
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# Check ML dependencies
ML_AVAILABLE = True
try:
    import torch
    import transformers
    import datasets
    import pandas as pd
    import numpy as np
    logger.info("All ML dependencies available")
except ImportError as e:
    ML_AVAILABLE = False
    logger.warning(f"ML dependencies not available: {e}")

class UnifiedMLService:
    """Unified service for all ML operations"""

    def __init__(self):
        self.operations = {
            'health_check': self.health_check,
            'validate_dataset': self.validate_dataset,
            'train_model': self.train_model,
            'test_model': self.test_model,
            'inference': self.inference,
            'get_system_info': self.get_system_info
        }

    def health_check(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Check service health and dependencies"""
        try:
            if ML_AVAILABLE:
                import torch
                import transformers
                import datasets

                return {
                    'success': True,
                    'status': 'healthy',
                    'dependencies': {
                        'torch': torch.__version__,
                        'transformers': transformers.__version__,
                        'datasets': datasets.__version__
                    }
                }
            else:
                return {
                    'success': True,
                    'status': 'healthy',
                    'dependencies': {},
                    'note': 'Running in fallback mode'
                }
        except ImportError as e:
            return {
                'success': False,
                'status': 'unhealthy',
                'error': f'Missing dependency: {str(e)}'
            }

    def get_system_info(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Get system information"""
        import platform

        return {
            'success': True,
            'status': 'ready',
            'python_version': sys.version,
            'platform': platform.system(),
            'ml_available': ML_AVAILABLE,
            'service': 'unified_ml_service'
        }

    def validate_dataset(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate dataset format and quality"""
        try:
            dataset_path = data.get('dataset_path')
            if not dataset_path:
                return {"error": "Dataset path is required"}

            if not os.path.exists(dataset_path):
                return {"error": "Dataset file not found"}

            # Basic validation
            if dataset_path.endswith('.csv'):
                if ML_AVAILABLE:
                    df = pd.read_csv(dataset_path)
                    sample_count = len(df)
                else:
                    with open(dataset_path, 'r') as f:
                        sample_count = len(f.readlines())
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
                "success": True,
                "valid": True,
                "sample_count": sample_count,
                "warnings": warnings
            }
        except Exception as e:
            return {"error": str(e)}

    def train_model(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Train a model (simplified for demo)"""
        if not ML_AVAILABLE:
            return {
                "success": False,
                "error": "ML dependencies not available"
            }

        try:
            config = data.get('config', {})
            dataset_path = data.get('dataset_path')

            if not dataset_path or not os.path.exists(dataset_path):
                return {"error": "Valid dataset path required"}

            # Simulate training process
            return {
                "success": True,
                "model_path": f"./models/trained_{config.get('name', 'model')}",
                "training_loss": 0.5,
                "epochs_completed": config.get('epochs', 1)
            }
        except Exception as e:
            return {"error": str(e)}

    def test_model(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Test a trained model"""
        try:
            model_path = data.get('model_path')
            test_data = data.get('test_data', 'Hello, world!')

            if not model_path:
                return {"error": "Model path required"}

            # Simulate inference
            return {
                "success": True,
                "result": f"Mock inference result for: {test_data}",
                "confidence": 0.95
            }
        except Exception as e:
            return {"error": str(e)}

    def inference(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Run inference on trained model"""
        try:
            model_path = data.get('model_path')
            prompt = data.get('prompt', 'Hello')

            if not model_path:
                return {"error": "Model path required"}

            # Simulate inference
            return {
                "success": True,
                "response": f"Generated response for: {prompt}",
                "tokens_generated": 10
            }
        except Exception as e:
            return {"error": str(e)}

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            health_data = {
                'status': 'healthy',
                'timestamp': time.time(),
                'service': 'unified_ml_service',
                'version': '1.0.0',
                'ml_available': ML_AVAILABLE
            }

            self.wfile.write(json.dumps(health_data).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Suppress default logging
        pass

def start_health_server():
    """Start health check server"""
    for port in [8000, 8001, 8002]:
        try:
            server = HTTPServer(('0.0.0.0', port), HealthHandler)
            server_thread = threading.Thread(target=server.serve_forever)
            server_thread.daemon = True
            server_thread.start()

            logger.info(f"Health server started on port {port}")
            return server
        except socket.error:
            continue

    logger.warning("Could not start health server")
    return None

def main():
    """Main service entry point"""
    service = UnifiedMLService()

    # Start health server
    health_server = start_health_server()

    # Signal service is ready
    print(json.dumps({"status": "ready", "service": "unified_ml_service"}))
    sys.stdout.flush()

    try:
        while True:
            try:
                # Read JSON input from stdin
                line = sys.stdin.readline()
                if not line:
                    break

                data = json.loads(line.strip())
                operation = data.get('action')

                if operation in service.operations:
                    result = service.operations[operation](data)
                    print(json.dumps(result))
                    sys.stdout.flush()
                else:
                    print(json.dumps({"error": f"Unknown operation: {operation}"}))
                    sys.stdout.flush()

            except json.JSONDecodeError:
                print(json.dumps({"error": "Invalid JSON input"}))
                sys.stdout.flush()
            except Exception as e:
                print(json.dumps({"error": str(e)}))
                sys.stdout.flush()

    except KeyboardInterrupt:
        logger.info("Service shutting down...")
        if health_server:
            health_server.shutdown()

if __name__ == "__main__":
    main()