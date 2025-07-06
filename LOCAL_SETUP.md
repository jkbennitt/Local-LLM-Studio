
# Local Development Setup

This guide helps you run the ML Training Platform on your own Linux hardware.

## Prerequisites

- **Linux** (Ubuntu 20.04+, CentOS 8+, or similar)
- **Python 3.11+** with pip
- **Node.js 18+** with npm
- **Git**
- **4GB+ RAM** (8GB recommended for training)

## Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd ml-training-platform

# Make setup script executable
chmod +x setup.sh

# Run setup (installs all dependencies)
./setup.sh

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

## Manual Setup (if script fails)

### 1. Install Node.js Dependencies
```bash
npm install
```

### 2. Install Python Dependencies
```bash
# Install PyTorch CPU version
pip3 install torch==2.1.0+cpu --index-url https://download.pytorch.org/whl/cpu

# Install ML libraries
pip3 install transformers==4.36.0 datasets==2.14.0 pandas==2.1.0 scikit-learn==1.3.0 accelerate==0.24.0
```

### 3. Create Directories
```bash
mkdir -p models uploads
```

### 4. Test Python Service
```bash
python3 server/ml_service.py validate '{"dataset_path": "sample_data.csv"}'
```

## Development

### Start Development Server
```bash
npm run dev
```
- Frontend: Vite dev server with hot reload
- Backend: Express with auto-restart
- WebSocket: Real-time training updates

### Build for Production
```bash
npm run build
npm start
```

## Hardware Requirements

### Minimum
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 2GB free space

### Recommended
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 10GB free space

## Training Models

1. **Upload Dataset**: Text files (.txt), CSV, or JSON
2. **Select Template**: Choose from pre-configured model types
3. **Start Training**: Monitor real-time progress
4. **Test Model**: Interactive inference testing

### Supported Models
- **GPT-2 Small** (124M params) - Text generation
- **DistilBERT** (66M params) - Question answering
- **TinyBERT** (14M params) - Lightweight NLP

## Troubleshooting

### Python Service Issues
```bash
# Check Python version
python3 --version

# Test dependencies
python3 -c "import torch, transformers; print('Dependencies OK')"

# Run service directly
python3 server/ml_service.py validate '{"dataset_path": "sample_data.txt"}'
```

### Memory Issues
- Reduce batch size in model config
- Use smaller models (TinyBERT instead of GPT-2)
- Close other applications during training

### Port Conflicts
- Default port is 5000
- Change in `server/index.ts` if needed
- Ensure no other services using port 5000

### WebSocket Connection Issues
- Check firewall settings
- Ensure `0.0.0.0` binding in production
- Restart development server

## File Structure
```
ml-training-platform/
├── server/           # Backend API and ML service
├── client/          # React frontend
├── models/          # Trained model storage
├── uploads/         # Dataset uploads
├── setup.sh         # Auto-setup script
└── sample_data.txt  # Example dataset
```

## Configuration

### Environment Variables
```bash
# Optional - defaults work for local development
export NODE_ENV=development
export PORT=5000
export PYTHON_PATH=python3
```

### Model Configuration
- Edit templates in `server/storage.ts`
- Adjust memory limits in `server/deployment_config.ts`
- Modify training parameters per model type

## Production Deployment

For production deployment on your own servers:

1. **Set environment variables**:
   ```bash
   export NODE_ENV=production
   export PORT=5000
   ```

2. **Build and start**:
   ```bash
   npm run build
   npm start
   ```

3. **Process management** (recommended):
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start with PM2
   pm2 start dist/index.js --name ml-platform
   pm2 save
   pm2 startup
   ```

4. **Reverse proxy** (optional):
   - Use nginx for SSL termination
   - Configure proper CORS headers
   - Set up rate limiting

## Contributing

1. Fork the repository
2. Create feature branch
3. Test locally with `npm run dev`
4. Submit pull request

## Support

- Check logs: `tail -f server/logs/app.log`
- Monitor system: Visit `/api/system/metrics`
- Health check: Visit `/api/system/health`
