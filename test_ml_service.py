#!/usr/bin/env python3

import sys
import json

# Simple test to validate ML service dependencies
def test_imports():
    try:
        import torch
        print(f"✓ PyTorch version: {torch.__version__}")
        
        import transformers
        print(f"✓ Transformers version: {transformers.__version__}")
        
        import datasets
        print(f"✓ Datasets version: {datasets.__version__}")
        
        import pandas as pd
        print(f"✓ Pandas version: {pd.__version__}")
        
        import numpy as np
        print(f"✓ NumPy version: {np.__version__}")
        
        return True
    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False

def test_basic_functionality():
    """Test basic ML functionality"""
    try:
        from transformers import AutoTokenizer
        
        # Test tokenizer loading
        tokenizer = AutoTokenizer.from_pretrained("gpt2")
        print("✓ Successfully loaded GPT-2 tokenizer")
        
        # Test tokenization
        test_text = "Hello world"
        tokens = tokenizer(test_text)
        print(f"✓ Tokenization works: {test_text} -> {tokens['input_ids']}")
        
        return True
    except Exception as e:
        print(f"✗ Basic functionality error: {e}")
        return False

def main():
    print("Testing ML Service Dependencies...")
    
    imports_ok = test_imports()
    if not imports_ok:
        return 1
    
    basic_ok = test_basic_functionality()
    if not basic_ok:
        return 1
    
    print("✓ All ML service tests passed!")
    return 0

if __name__ == "__main__":
    sys.exit(main())