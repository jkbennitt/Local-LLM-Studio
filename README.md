
# ML Training Platform

A full-stack machine learning training platform that enables users to fine-tune pre-trained language models through an intuitive web interface. Built for educational purposes and practical model training with real neural networks.

## 🚀 Features

### Core Functionality
- **Pre-trained Model Fine-tuning**: Fine-tune GPT-2 Small (124M params), DistilBERT, and TinyBERT
- **Template-Based Workflows**: One-click templates for Customer Service Bots, Creative Writing Assistants, and Code Completion Helpers
- **Real-time Training Monitoring**: Live progress tracking with loss curves and performance metrics
- **Smart Dataset Processing**: Automatic tokenization and preprocessing for text files, CSV, and JSON
- **Model Inference & Testing**: Interactive testing interface with sample prompts
- **Model Versioning**: Save and manage different model versions with metadata

### Educational Integration
- **Adaptive Learning System**: Progressive disclosure of ML concepts based on user skill level
- **Interactive Tutorials**: Built-in explanations and tutorials for ML concepts
- **Natural Language Configuration**: "Make responses more creative" translates to temperature adjustments
- **Performance Insights**: Human-readable quality assessments and optimization suggestions

### Production Features
- **Background Processing**: Training continues even if browser is closed
- **Resource Optimization**: Automatic batch sizing based on available memory
- **Error Recovery**: Comprehensive error handling with educational feedback
- **WebSocket Real-time Updates**: Live training progress and status updates
- **System Dashboard**: Comprehensive monitoring of all training jobs and system health

## 🛠 Technology Stack

### Frontend
- **React 18** + **TypeScript** + **Vite** for fast development
- **Shadcn/UI** components with **Radix UI** primitives
- **Tailwind CSS** for styling with custom CSS variables
- **TanStack Query** for server state management
- **Wouter** for lightweight routing
- **React Hook Form** + **Zod** for type-safe forms

### Backend
- **Express.js** + **TypeScript** for the main API server
- **Python FastAPI/Service** for ML operations
- **Drizzle ORM** with PostgreSQL compatibility
- **WebSocket** connections for real-time communication
- **Multer** for file upload handling

### Machine Learning
- **Hugging Face Transformers** for model fine-tuning
- **PyTorch** for neural network operations
- **Datasets** library for data processing
- **Accelerate** for training optimization

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Git** for version control

## 🚀 Quick Start

### 1. Clone and Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (handled automatically by setup script)
chmod +x setup.sh
./setup.sh
```

### 2. Start the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

### 3. Start Training Your First Model

1. **Select a Template**: Choose from Customer Service Bot, Creative Writing Assistant, or Code Helper
2. **Upload Your Data**: Drag and drop text files, CSV, or JSON datasets
3. **Start Training**: Click "Start Training" and watch real-time progress
4. **Test Your Model**: Use the interactive testing interface to validate results

## 📁 Project Structure

```
ml-training-platform/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility libraries
│   │   ├── pages/          # Page components
│   │   └── types/          # TypeScript type definitions
├── server/                 # Express.js backend
│   ├── ml_service.py       # Python ML training service
│   ├── ml_optimizer.py     # Resource optimization utilities
│   ├── adaptive_education.ts # Adaptive learning system
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Data persistence layer
│   ├── python_service_monitor.ts # Python service management
│   └── resource_detector.ts # System resource detection
├── shared/                 # Shared TypeScript schemas
├── models/                 # Trained model storage
├── uploads/                # User uploaded datasets
└── sample_data.csv         # Example training data
```

## 🎯 Model Templates

### Customer Service Bot
- **Model**: DistilBERT optimized for Q&A
- **Use Case**: FAQ responses, support ticket handling
- **Training Time**: ~15-20 minutes
- **Data Format**: Question-answer pairs

### Creative Writing Assistant
- **Model**: GPT-2 Small for text generation
- **Use Case**: Story writing, content creation
- **Training Time**: ~30-45 minutes
- **Data Format**: Creative writing samples

### Code Assistant
- **Model**: CodeBERT for programming tasks
- **Use Case**: Code completion, documentation
- **Training Time**: ~45-60 minutes
- **Data Format**: Code snippets and comments

## 📊 Training Process

1. **Data Validation**: Automatic format checking and preprocessing
2. **Tokenization**: Text converted to model-compatible tokens
3. **Fine-tuning**: Real neural network training with progress tracking
4. **Evaluation**: Automatic quality assessment and metrics
5. **Deployment**: One-click model deployment for inference

## 🔧 API Endpoints

### Models
- `GET /api/models` - List all trained models
- `POST /api/models` - Create new model training job
- `GET /api/models/:id` - Get model details
- `DELETE /api/models/:id` - Delete model

### Training
- `GET /api/training/jobs` - List training jobs
- `POST /api/training/jobs` - Start new training job
- `GET /api/training/jobs/:id` - Get training status
- `POST /api/training/jobs/:id/stop` - Stop training

### Datasets
- `GET /api/datasets` - List uploaded datasets
- `POST /api/datasets` - Upload new dataset
- `GET /api/datasets/:id` - Get dataset details

### System
- `GET /api/system/health` - System health check
- `GET /api/system/health-detailed` - Detailed system status
- `GET /api/resources/detect` - Current system resources
- `POST /api/resources/optimize` - Optimize training parameters

### Templates
- `GET /api/templates` - Get available model templates

## 🐛 Troubleshooting

### Common Issues

**Python Service Not Starting**
```bash
# Check Python dependencies
python3 -c "import torch, transformers; print('Dependencies OK')"

# Reinstall if needed
./setup.sh --force
```

**Training Fails with Memory Error**
- The platform automatically optimizes batch sizes
- Try reducing dataset size or using a smaller model
- Check the System Dashboard for resource usage

**WebSocket Connection Issues**
- Check that port 5000 is available
- Refresh the page to reconnect
- Monitor connection status in the System Dashboard

### Performance Optimization

- **Memory Usage**: Platform automatically adjusts based on available resources
- **Training Speed**: Use smaller datasets for faster iteration
- **Model Size**: Start with smaller models and scale up as needed

## 🚀 Deployment on Replit

The platform is optimized for Replit deployment:

```bash
npm run build
npm start
```

- **Single Port**: All services run on port 5000
- **Automatic Scaling**: Resource optimization for constrained environments
- **Production Ready**: Built-in error handling and monitoring

### Environment Variables

No environment variables required for basic operation. The platform uses intelligent defaults and automatic configuration.

## 🎓 Educational Features

### Adaptive Learning System
- **Skill Level Detection**: Automatically adapts content based on user interactions
- **Contextual Learning**: Provides relevant educational content based on current workflow step
- **Interactive Elements**: Quizzes, experiments, and predictions to reinforce learning
- **Progress Tracking**: Monitors user understanding and identifies knowledge gaps

### System Insights
- **Resource Monitoring**: Real-time CPU, memory, and system usage tracking
- **Performance Analytics**: Track how your models perform over time
- **Quality Scoring**: Automated evaluation with improvement suggestions
- **Best Practices**: Built-in suggestions for data preparation and training

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Additional Resources

- [Local Setup Guide](LOCAL_SETUP.md) - For running on your own hardware
- [Hugging Face Transformers Documentation](https://huggingface.co/docs/transformers)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/UI Components](https://ui.shadcn.com/)

## 💡 Support

For support and questions:
- Check the built-in help system in the application
- Review the System Dashboard for real-time diagnostics
- Check the [troubleshooting section](#-troubleshooting) above
- Review the educational content for each workflow

---

**Built with ❤️ for the ML education community**
