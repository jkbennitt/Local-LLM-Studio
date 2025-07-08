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
OCR_AVAILABLE = False
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

# Check OCR dependencies
try:
    import pytesseract
    import pdf2image
    from PIL import Image, ImageFilter, ImageEnhance
    import cv2
    OCR_AVAILABLE = True
    logger.info("OCR dependencies available")
except ImportError as e:
    OCR_AVAILABLE = False
    logger.warning(f"OCR dependencies not available: {e}")

# Check PDF processing
try:
    import pdfplumber
    import PyPDF2
    logger.info("PDF processing available")
except ImportError as e:
    logger.warning(f"PDF processing not available: {e}")

class UnifiedMLService:
    """Unified service for all ML operations"""

    def __init__(self):
        self.operations = {
            'health_check': self.health_check,
            'validate_dataset': self.validate_dataset,
            'train_model': self.train_model,
            'test_model': self.test_model,
            'inference': self.inference,
            'get_system_info': self.get_system_info,
            'extract_pdf_text': self.extract_pdf_text,
            'process_ocr': self.process_ocr,
            'preprocess_image': self.preprocess_image
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

    def extract_pdf_text(self, pdf_path: str) -> str:
        """Extract text from PDF file using multiple methods"""
        try:
            # Try PyPDF2 first
            try:
                import PyPDF2
                with open(pdf_path, 'rb') as file:
                    reader = PyPDF2.PdfReader(file)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                    if text.strip():
                        return text
            except ImportError:
                pass
            
            # Try pdfplumber as fallback
            try:
                import pdfplumber
                with pdfplumber.open(pdf_path) as pdf:
                    text = ""
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
                    if text.strip():
                        return text
            except ImportError:
                pass
            
            # Try pymupdf as another fallback
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(pdf_path)
                text = ""
                for page in doc:
                    text += page.get_text() + "\n"
                doc.close()
                if text.strip():
                    return text
            except ImportError:
                pass
            
            # If no PDF library is available, return a basic message
            return "PDF processing libraries not available. Please install PyPDF2, pdfplumber, or PyMuPDF."
            
        except Exception as e:
            print(f"Error extracting PDF text: {str(e)}")
            return ""

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
            elif dataset_path.endswith('.pdf'):
                try:
                    # Try to extract text from PDF
                    extracted_text = self.extract_pdf_text(dataset_path)
                    if extracted_text:
                        # Count paragraphs/sections as samples
                        sample_count = len([p for p in extracted_text.split('\n\n') if p.strip()])
                    else:
                        return {"error": "Could not extract text from PDF file"}
                except Exception as e:
                    return {"error": f"PDF processing failed: {str(e)}"}
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

    def extract_pdf_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract text from PDF using OCR for image-based PDFs"""
        try:
            pdf_path = data.get('pdf_path')
            if not pdf_path or not os.path.exists(pdf_path):
                return {"error": "Valid PDF path required"}

            # Try traditional text extraction first
            text_content = self._extract_text_traditional(pdf_path)
            
            # If traditional extraction failed or returned minimal text, use OCR
            if not text_content or len(text_content.strip()) < 50:
                logger.info("Traditional PDF extraction failed, attempting OCR...")
                text_content = self._extract_text_ocr(pdf_path)
                ocr_used = True
            else:
                ocr_used = False

            return {
                "success": True,
                "text": text_content,
                "ocr_used": ocr_used,
                "character_count": len(text_content),
                "word_count": len(text_content.split()),
                "pages_processed": self._count_pdf_pages(pdf_path)
            }
        except Exception as e:
            logger.error(f"PDF extraction error: {str(e)}")
            return {"error": str(e)}

    def _extract_text_traditional(self, pdf_path: str) -> str:
        """Extract text using traditional PDF text extraction"""
        try:
            text_content = ""
            
            # Try pdfplumber first
            try:
                import pdfplumber
                with pdfplumber.open(pdf_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_content += page_text + "\n"
            except:
                pass
            
            # Fallback to PyPDF2 if pdfplumber fails
            if not text_content:
                try:
                    import PyPDF2
                    with open(pdf_path, 'rb') as file:
                        reader = PyPDF2.PdfReader(file)
                        for page in reader.pages:
                            page_text = page.extract_text()
                            if page_text:
                                text_content += page_text + "\n"
                except:
                    pass
            
            return text_content.strip()
        except Exception as e:
            logger.error(f"Traditional PDF extraction failed: {str(e)}")
            return ""

    def _extract_text_ocr(self, pdf_path: str) -> str:
        """Extract text using OCR for image-based PDFs"""
        if not OCR_AVAILABLE:
            return "OCR dependencies not available"
        
        try:
            import pdf2image
            import pytesseract
            from PIL import Image
            
            # Convert PDF to images
            images = pdf2image.convert_from_path(pdf_path, dpi=300)
            extracted_text = ""
            
            for i, image in enumerate(images):
                logger.info(f"Processing page {i+1}/{len(images)} with OCR...")
                
                # Preprocess image for better OCR
                processed_image = self._preprocess_image_for_ocr(image)
                
                # Extract text using OCR
                page_text = pytesseract.image_to_string(processed_image, lang='eng')
                
                if page_text.strip():
                    extracted_text += f"--- Page {i+1} ---\n{page_text}\n\n"
            
            return extracted_text.strip()
        
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            return f"OCR extraction error: {str(e)}"

    def _preprocess_image_for_ocr(self, image):
        """Preprocess image for better OCR results"""
        try:
            import cv2
            import numpy as np
            from PIL import Image, ImageFilter, ImageEnhance
            
            # Convert PIL image to OpenCV format
            img_array = np.array(image)
            
            # Convert to grayscale
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Apply denoising
            denoised = cv2.medianBlur(gray, 5)
            
            # Apply threshold to get binary image
            _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Convert back to PIL Image
            processed_image = Image.fromarray(thresh)
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(processed_image)
            processed_image = enhancer.enhance(2.0)
            
            return processed_image
        
        except Exception as e:
            logger.warning(f"Image preprocessing failed: {str(e)}, using original")
            return image

    def _count_pdf_pages(self, pdf_path: str) -> int:
        """Count pages in PDF"""
        try:
            import PyPDF2
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                return len(reader.pages)
        except:
            return 1

    def process_ocr(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process OCR on image files"""
        if not OCR_AVAILABLE:
            return {"error": "OCR dependencies not available"}
        
        try:
            import pytesseract
            from PIL import Image
            
            image_path = data.get('image_path')
            if not image_path or not os.path.exists(image_path):
                return {"error": "Valid image path required"}

            # Load and preprocess image
            image = Image.open(image_path)
            processed_image = self._preprocess_image_for_ocr(image)
            
            # Extract text
            text = pytesseract.image_to_string(processed_image, lang='eng')
            
            # Get confidence scores
            confidence_data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
            confidences = [int(conf) for conf in confidence_data['conf'] if int(conf) > 0]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                "success": True,
                "text": text,
                "confidence": avg_confidence,
                "character_count": len(text),
                "word_count": len(text.split())
            }
        
        except Exception as e:
            logger.error(f"OCR processing error: {str(e)}")
            return {"error": str(e)}

    def preprocess_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Preprocess image for OCR"""
        try:
            image_path = data.get('image_path')
            output_path = data.get('output_path')
            
            if not image_path or not os.path.exists(image_path):
                return {"error": "Valid image path required"}
            
            from PIL import Image
            
            # Load image
            image = Image.open(image_path)
            
            # Preprocess
            processed_image = self._preprocess_image_for_ocr(image)
            
            # Save if output path provided
            if output_path:
                processed_image.save(output_path)
            
            return {
                "success": True,
                "processed": True,
                "output_path": output_path if output_path else None
            }
        
        except Exception as e:
            logger.error(f"Image preprocessing error: {str(e)}")
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