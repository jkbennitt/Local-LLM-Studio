
#!/bin/bash
set -e

echo "🚀 Setting up ML Training Platform for local development..."

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed"
    echo "Please install Python 3.11+ and try again"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d" " -f2 | cut -d"." -f1,2)
REQUIRED_VERSION="3.11"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Python $REQUIRED_VERSION or higher is required (found $PYTHON_VERSION)"
    exit 1
fi

echo "✅ Python $PYTHON_VERSION found"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
python3 -m pip install --user \
    torch==2.1.0+cpu \
    transformers==4.36.0 \
    datasets==2.14.0 \
    pandas==2.1.0 \
    numpy==1.24.0 \
    scikit-learn==1.3.0 \
    accelerate==0.24.0 \
    --index-url https://download.pytorch.org/whl/cpu

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p models uploads

# Create sample dataset
echo "📄 Creating sample dataset..."
cat > sample_data.txt << 'EOF'
The quick brown fox jumps over the lazy dog.
Machine learning is a subset of artificial intelligence.
Natural language processing helps computers understand human language.
Deep learning uses neural networks with multiple layers.
Python is a popular programming language for data science.
Training models requires data, compute, and patience.
Transformers revolutionized natural language processing.
Large language models can generate human-like text.
Fine-tuning adapts pre-trained models to specific tasks.
Data quality is crucial for model performance.
EOF

# Test Python ML service
echo "🧪 Testing Python ML service..."
if python3 server/ml_service.py validate '{"dataset_path": "sample_data.txt"}' > /dev/null 2>&1; then
    echo "✅ Python ML service working"
else
    echo "❌ Python ML service test failed"
    echo "Try running: python3 server/ml_service.py validate '{\"dataset_path\": \"sample_data.txt\"}'"
    exit 1
fi

echo ""
echo "🎉 Setup complete! You can now run:"
echo "   npm run dev"
echo ""
echo "🌐 The application will be available at http://localhost:5000"
echo "📖 Upload sample_data.txt to test the training pipeline"
echo ""
echo "For production deployment on Replit:"
echo "   npm run build && npm start"
