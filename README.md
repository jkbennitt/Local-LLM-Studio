
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
- **Interactive Learning**: Built-in explanations and tutorials for ML concepts
- **Progressive Disclosure**: Advanced options hidden behind collapsible sections
- **Natural Language Configuration**: "Make responses more creative" translates to temperature adjustments
- **Performance Insights**: Human-readable quality assessments and optimization suggestions

### Production Features
- **Background Processing**: Training continues even if browser is closed
- **Resource Optimization**: Automatic batch sizing based on available memory
- **Error Recovery**: Comprehensive error handling with educational feedback
- **WebSocket Real-time Updates**: Live training progress and status updates

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
- **Python FastAPI** service for ML operations
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

# Python dependencies are automatically managed by the platform
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
│   ├── educational_content.ts # Learning content system
│   ├── routes.ts           # API route definitions
│   └── storage.ts          # Data persistence layer
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

### Templates
- `GET /api/templates` - Get available model templates

## 🐛 Troubleshooting

### Common Issues

**Training Fails with Memory Error**
- The platform automatically optimizes batch sizes
- Try reducing dataset size or using a smaller model

**WebSocket Connection Issues**
- Check that port 5000 is available
- Refresh the page to reconnect

**Python Service Not Starting**
- Python dependencies are managed automatically
- Check console logs for specific error messages

### Performance Optimization

- **Memory Usage**: Platform automatically adjusts based on available resources
- **Training Speed**: Use smaller datasets for faster iteration
- **Model Size**: Start with smaller models and scale up as needed

## 🚀 Deployment

### Replit Deployment (Recommended)

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

### Learning System
- **Interactive Tutorials**: Step-by-step guidance for each workflow
- **Contextual Help**: Explanations appear as you encounter ML concepts
- **Performance Insights**: Plain-English explanations of model behavior
- **Best Practices**: Built-in suggestions for data preparation and training

### Success Metrics
- **Quality Scoring**: Automated evaluation with improvement suggestions
- **Usage Analytics**: Track how your deployed models perform
- **Learning Progress**: Visual indicators of training effectiveness

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Additional Resources

- [Hugging Face Transformers Documentation](https://huggingface.co/docs/transformers)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/UI Components](https://ui.shadcn.com/)

## 💡 Support

For support and questions:
- Check the built-in help system in the application
- Review the educational content for each workflow
- Check common troubleshooting steps above

---

**Built with ❤️ for the ML education community**
