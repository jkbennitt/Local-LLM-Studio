#!/usr/bin/env python3
"""
Advanced ML Pipeline Optimizer for Production Environments
Handles memory optimization, batch processing, and resource management
"""

import os
import sys
import json
import psutil
import logging
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import multiprocessing as mp
from functools import lru_cache
import gc
import time

logger = logging.getLogger(__name__)

class MLOptimizer:
    """Advanced ML optimization for constrained environments"""
    
    def __init__(self):
        self.cpu_count = mp.cpu_count()
        self.available_memory = psutil.virtual_memory().available
        self.optimal_batch_size = self._calculate_optimal_batch_size()
        
    def _calculate_optimal_batch_size(self) -> int:
        """Calculate optimal batch size based on available resources"""
        # Get available memory in GB
        available_gb = self.available_memory / (1024 ** 3)
        
        # Conservative approach: use 60% of available memory
        usable_memory = available_gb * 0.6
        
        # Estimate memory per sample (varies by model)
        memory_per_sample = {
            'gpt2': 0.05,  # GB per sample
            'distilbert': 0.03,
            'tinybert': 0.02
        }
        
        # Default to GPT-2 estimation
        est_memory = memory_per_sample.get('gpt2', 0.05)
        
        # Calculate batch size
        batch_size = max(1, int(usable_memory / est_memory))
        
        # Cap at reasonable limits
        return min(batch_size, 32)
    
    def optimize_training_config(self, config: Dict[str, Any], dataset_size: int) -> Dict[str, Any]:
        """Optimize training configuration for performance"""
        optimized = config.copy()
        
        # Adaptive batch size
        if dataset_size < 100:
            optimized['batch_size'] = min(4, dataset_size)
        elif dataset_size < 1000:
            optimized['batch_size'] = min(8, self.optimal_batch_size)
        else:
            optimized['batch_size'] = self.optimal_batch_size
        
        # Gradient accumulation for small batches
        if optimized['batch_size'] < 8:
            optimized['gradient_accumulation_steps'] = 8 // optimized['batch_size']
        else:
            optimized['gradient_accumulation_steps'] = 1
        
        # Adaptive learning rate
        base_lr = config.get('learning_rate', 5e-5)
        optimized['learning_rate'] = base_lr * (optimized['batch_size'] / 8)
        
        # Mixed precision training for memory efficiency
        optimized['fp16'] = True if self.available_memory < 8 * (1024 ** 3) else False
        
        # Gradient checkpointing for large models
        optimized['gradient_checkpointing'] = True if dataset_size > 5000 else False
        
        # Logging frequency
        optimized['logging_steps'] = max(10, dataset_size // 100)
        optimized['save_steps'] = max(100, dataset_size // 10)
        
        # Early stopping
        optimized['load_best_model_at_end'] = True
        optimized['evaluation_strategy'] = 'steps'
        optimized['eval_steps'] = optimized['save_steps']
        optimized['save_total_limit'] = 3
        optimized['metric_for_best_model'] = 'eval_loss'
        
        return optimized
    
    def estimate_training_time(self, dataset_size: int, config: Dict[str, Any]) -> Dict[str, Any]:
        """Estimate training time based on dataset and configuration"""
        batch_size = config.get('batch_size', 8)
        epochs = config.get('max_epochs', 3)
        model_type = config.get('model_type', 'gpt2')
        
        # Time per sample in seconds (empirical estimates)
        time_per_sample = {
            'gpt2': 0.1,
            'distilbert': 0.08,
            'tinybert': 0.05
        }
        
        base_time = time_per_sample.get(model_type, 0.1)
        
        # Adjust for batch processing efficiency
        batch_efficiency = 1.0 - (0.3 * (batch_size / 32))
        
        total_samples = dataset_size * epochs
        estimated_seconds = (total_samples * base_time * batch_efficiency)
        
        # Add overhead for evaluation and checkpointing
        overhead = estimated_seconds * 0.2
        total_seconds = estimated_seconds + overhead
        
        return {
            'estimated_minutes': round(total_seconds / 60, 1),
            'estimated_seconds': round(total_seconds),
            'samples_per_second': round(dataset_size / estimated_seconds, 2)
        }
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage statistics"""
        memory = psutil.virtual_memory()
        return {
            'total_gb': memory.total / (1024 ** 3),
            'available_gb': memory.available / (1024 ** 3),
            'used_gb': memory.used / (1024 ** 3),
            'percent': memory.percent
        }
    
    def cleanup_memory(self):
        """Force garbage collection and memory cleanup"""
        gc.collect()
        
        # Clear Python caches
        for _ in range(3):
            gc.collect()
            
        # Log memory status
        memory_status = self.get_memory_usage()
        logger.info(f"Memory cleanup complete. Available: {memory_status['available_gb']:.2f}GB")
    
    def validate_dataset_quality(self, dataset_path: str) -> Dict[str, Any]:
        """Validate dataset quality and provide recommendations"""
        results = {
            'valid': True,
            'warnings': [],
            'recommendations': [],
            'statistics': {}
        }
        
        try:
            # Read dataset
            import pandas as pd
            
            file_ext = Path(dataset_path).suffix.lower()
            
            if file_ext == '.csv':
                df = pd.read_csv(dataset_path)
            elif file_ext == '.json':
                df = pd.read_json(dataset_path)
            else:
                # Text file
                with open(dataset_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                df = pd.DataFrame({'text': lines})
            
            # Basic statistics
            results['statistics'] = {
                'total_samples': len(df),
                'columns': list(df.columns) if hasattr(df, 'columns') else ['text'],
                'memory_usage_mb': df.memory_usage(deep=True).sum() / (1024 * 1024)
            }
            
            # Quality checks
            if len(df) < 10:
                results['warnings'].append("Very small dataset (< 10 samples)")
                results['recommendations'].append("Consider adding more training examples for better results")
            
            if len(df) < 100:
                results['warnings'].append("Small dataset (< 100 samples)")
                results['recommendations'].append("Model may overfit. Consider data augmentation")
            
            # Check for duplicates
            if hasattr(df, 'duplicated'):
                duplicates = df.duplicated().sum()
                if duplicates > 0:
                    results['warnings'].append(f"Found {duplicates} duplicate samples")
                    results['recommendations'].append("Remove duplicates for better training efficiency")
            
            # Check text lengths
            if 'text' in df.columns or len(df.columns) == 1:
                text_col = df.columns[0] if len(df.columns) == 1 else 'text'
                text_lengths = df[text_col].astype(str).str.len()
                
                results['statistics']['avg_text_length'] = text_lengths.mean()
                results['statistics']['max_text_length'] = text_lengths.max()
                results['statistics']['min_text_length'] = text_lengths.min()
                
                if text_lengths.max() > 2000:
                    results['warnings'].append("Some texts are very long (> 2000 chars)")
                    results['recommendations'].append("Consider chunking long texts for better processing")
                
                if text_lengths.min() < 10:
                    results['warnings'].append("Some texts are very short (< 10 chars)")
                    results['recommendations'].append("Very short texts may not provide enough context")
            
        except Exception as e:
            results['valid'] = False
            results['warnings'].append(f"Error validating dataset: {str(e)}")
            
        return results


class TrainingMonitor:
    """Advanced training monitoring with real-time metrics"""
    
    def __init__(self):
        self.metrics_history = []
        self.start_time = None
        self.best_loss = float('inf')
        
    def start_monitoring(self):
        """Start training monitoring"""
        self.start_time = time.time()
        self.metrics_history = []
        
    def log_metrics(self, epoch: int, step: int, loss: float, learning_rate: float):
        """Log training metrics"""
        elapsed_time = time.time() - self.start_time
        
        metrics = {
            'epoch': epoch,
            'step': step,
            'loss': loss,
            'learning_rate': learning_rate,
            'elapsed_seconds': elapsed_time,
            'timestamp': time.time()
        }
        
        self.metrics_history.append(metrics)
        
        # Track best loss
        if loss < self.best_loss:
            self.best_loss = loss
            metrics['is_best'] = True
        
        return metrics
    
    def get_training_summary(self) -> Dict[str, Any]:
        """Get comprehensive training summary"""
        if not self.metrics_history:
            return {}
        
        total_time = time.time() - self.start_time
        losses = [m['loss'] for m in self.metrics_history]
        
        return {
            'total_training_time_seconds': total_time,
            'total_training_time_minutes': total_time / 60,
            'total_steps': len(self.metrics_history),
            'best_loss': self.best_loss,
            'final_loss': losses[-1] if losses else None,
            'loss_improvement': (losses[0] - losses[-1]) / losses[0] * 100 if losses else 0,
            'avg_step_time': total_time / len(self.metrics_history) if self.metrics_history else 0
        }
    
    def detect_training_issues(self) -> List[str]:
        """Detect potential training issues"""
        issues = []
        
        if len(self.metrics_history) < 5:
            return issues
        
        recent_losses = [m['loss'] for m in self.metrics_history[-5:]]
        
        # Check for loss explosion
        if any(loss > self.metrics_history[0]['loss'] * 2 for loss in recent_losses):
            issues.append("Loss explosion detected - consider reducing learning rate")
        
        # Check for plateauing
        loss_variance = max(recent_losses) - min(recent_losses)
        if loss_variance < 0.001:
            issues.append("Loss plateauing - consider adjusting learning rate or early stopping")
        
        # Check for oscillation
        loss_changes = [recent_losses[i] - recent_losses[i-1] for i in range(1, len(recent_losses))]
        if sum(1 for change in loss_changes if change > 0) >= 3:
            issues.append("Loss oscillation detected - learning rate might be too high")
        
        return issues


def create_production_config(base_config: Dict[str, Any]) -> Dict[str, Any]:
    """Create production-ready configuration with all optimizations"""
    optimizer = MLOptimizer()
    
    # Get dataset info
    dataset_size = base_config.get('dataset_size', 1000)
    
    # Optimize configuration
    prod_config = optimizer.optimize_training_config(base_config, dataset_size)
    
    # Add production-specific settings
    prod_config.update({
        'dataloader_num_workers': min(4, optimizer.cpu_count),
        'dataloader_pin_memory': True,
        'remove_unused_columns': False,
        'label_names': ['labels'],
        'push_to_hub': False,
        'resume_from_checkpoint': True,
        'ignore_data_skip': True,
        'dataloader_drop_last': False,
        'eval_accumulation_steps': 1,
        'prediction_loss_only': True,
        'use_mps_device': False,  # Disable MPS for stability
        'tf32': True if sys.platform == 'linux' else None,  # Enable TF32 on Linux
    })
    
    # Memory optimization for small devices
    memory_status = optimizer.get_memory_usage()
    if memory_status['available_gb'] < 4:
        prod_config.update({
            'per_device_train_batch_size': 1,
            'gradient_accumulation_steps': 8,
            'fp16': True,
            'gradient_checkpointing': True,
            'optim': 'adamw_8bit'  # 8-bit optimizer
        })
    
    return prod_config


if __name__ == "__main__":
    # CLI interface for testing
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "optimize":
            config = json.loads(sys.argv[2])
            dataset_size = int(sys.argv[3])
            
            optimizer = MLOptimizer()
            optimized_config = optimizer.optimize_training_config(config, dataset_size)
            print(json.dumps(optimized_config))
            
        elif command == "validate":
            dataset_path = sys.argv[2]
            
            optimizer = MLOptimizer()
            validation_results = optimizer.validate_dataset_quality(dataset_path)
            print(json.dumps(validation_results))
            
        elif command == "estimate":
            dataset_size = int(sys.argv[2])
            config = json.loads(sys.argv[3])
            
            optimizer = MLOptimizer()
            time_estimate = optimizer.estimate_training_time(dataset_size, config)
            print(json.dumps(time_estimate))