# ML Training Platform - replit.md

## Overview

This is a full-stack machine learning training platform built for educational purposes and practical model fine-tuning. The application enables users to fine-tune pre-trained models like GPT-2 Small, DistilBERT, and TinyBERT with their own datasets through an intuitive web interface.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Components**: Shadcn/UI components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe forms
- **Icons**: Lucide React for consistent iconography

### Backend Architecture
- **API Server**: Express.js with TypeScript for the main web server
- **ML Service**: Python FastAPI service for machine learning operations
- **Real-time Communication**: WebSocket connections for live training updates
- **File Handling**: Multer for dataset upload and processing

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Management**: Centralized schema definitions in shared module
- **Development Storage**: In-memory storage implementation for development
- **Production Ready**: PostgreSQL-compatible schema design

## Key Components

### Core Workflow Components
1. **Template Selection**: Pre-configured model templates for different use cases
2. **Data Upload**: Drag-and-drop interface for dataset upload with validation
3. **Training Management**: Real-time training monitoring with progress tracking
4. **Model Testing**: Interactive testing interface with generated responses

### UI/UX Design System
- **Header**: Fixed navigation with brand identity and status indicators
- **Sidebar**: Workflow navigation with training status display
- **Main Content**: Responsive grid layout with step-by-step workflow
- **Cards**: Consistent card-based design for content organization

### Machine Learning Pipeline
- **Model Types**: GPT-2 Small (124M), DistilBERT, TinyBERT support
- **Training Process**: Hugging Face Transformers integration
- **Resource Management**: Automatic batch sizing and memory optimization
- **Progress Tracking**: Real-time loss monitoring and epoch tracking

## Data Flow

### User Workflow
1. **Template Selection**: User selects from pre-configured model templates
2. **Dataset Upload**: Files are uploaded, validated, and preprocessed
3. **Training Initiation**: Training job is created and queued
4. **Real-time Updates**: WebSocket connection provides live progress updates
5. **Model Testing**: Completed models can be tested with custom prompts

### Data Processing Pipeline
1. **File Upload**: Multer handles multipart form data
2. **Validation**: File type and content validation
3. **Preprocessing**: Python service processes and tokenizes data
4. **Storage**: Metadata stored in database, files in filesystem
5. **Training**: Background training process with progress reporting

## External Dependencies

### Frontend Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form
- **UI Components**: Radix UI primitives, Lucide React icons
- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS, class-variance-authority
- **Validation**: Zod for schema validation
- **Build Tools**: Vite, TypeScript, PostCSS

### Backend Dependencies
- **Node.js**: Express.js, WebSocket support
- **Database**: Drizzle ORM, PostgreSQL adapter
- **File Processing**: Multer for uploads
- **ML Integration**: Python subprocess communication
- **Development**: tsx for TypeScript execution

### Python ML Dependencies
- **Core ML**: torch, transformers, datasets
- **Data Processing**: pandas, numpy, scikit-learn
- **Model Training**: Hugging Face ecosystem
- **Acceleration**: accelerate for optimized training

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: tsx with automatic restart on file changes
- **Database**: In-memory storage for rapid development
- **ML Service**: Python script execution via subprocess

### Production Considerations
- **Database**: PostgreSQL with connection pooling
- **File Storage**: Dedicated file storage solution
- **ML Processing**: Dedicated Python service with queue management
- **Scaling**: WebSocket connection management for multiple users
- **Performance**: Static asset optimization and caching

### Build Process
- **Frontend**: Vite build with optimized bundles
- **Backend**: esbuild for Node.js bundle creation
- **Database**: Drizzle migrations for schema updates
- **Dependencies**: Separate Python requirements management

## Advanced Features

### Production Optimization (Added January 2025)
- **Advanced Error Handling**: Comprehensive error recovery system with specific error codes and educational content
- **ML Pipeline Optimizer**: Automatic resource optimization based on available memory and CPU
- **Performance Monitoring**: Real-time system metrics and health checks
- **Educational Content System**: Context-aware learning materials generated for each step
- **Production Deployment Config**: Optimized for Replit and constrained environments

### Error Recovery System
- Automatic memory optimization when OOM errors occur
- Training checkpoint recovery for interrupted jobs
- Python service health monitoring with auto-restart
- Detailed error logging and user-friendly messages

### Performance Features
- Adaptive batch sizing based on available resources
- Gradient checkpointing for memory efficiency
- Mixed precision training (FP16) for constrained environments
- Automatic hyperparameter optimization
- Real-time training time estimation

### Educational Integration
- Template-specific learning content for each use case
- Real-time tips during training progress
- Dataset quality education with actionable recommendations
- Error explanations with solutions
- Testing best practices and quality checklists

## Production Features Implementation (January 2025)

### ML Pipeline Architecture
- **Job Queue Manager**: Production-ready job queue with priority-based scheduling, memory-aware resource management, and automatic retry logic
- **Concurrent Job Processing**: Configurable max concurrent jobs based on available system resources
- **Job Metrics**: Real-time tracking of queue length, active jobs, success rates, and processing times
- **Background Processing**: Jobs continue processing even when browser is closed

### Adaptive Educational System
- **Skill Level Detection**: Automatically adapts content based on user interactions and success rates
- **Contextual Learning**: Provides relevant educational content based on current workflow step
- **Interactive Elements**: Quizzes, experiments, and predictions to reinforce learning
- **Progress Tracking**: Monitors user understanding and identifies knowledge gaps
- **Alternative Explanations**: Multiple explanation styles for different learning preferences

### Performance Optimization
- **Memory Management**: Automatic memory optimization for Replit's constrained environment
- **Dynamic Batch Sizing**: Adjusts batch sizes based on available memory
- **Gradient Checkpointing**: Trades computation for memory when needed
- **Mixed Precision Training**: FP16 support for reduced memory usage
- **Resource Monitoring**: Real-time CPU, memory, and GPU usage tracking

### User Experience Enhancements
- **System Dashboard**: Comprehensive monitoring of all training jobs and system health
- **Adaptive UI Components**: Educational content that appears when and where needed
- **Performance Monitor**: Real-time system metrics integrated into the training workflow
- **Contextual Tips**: Smart tips that appear based on user actions and errors
- **Error Recovery**: Automatic recovery strategies for common training failures

### Technical Infrastructure
- **WebSocket Integration**: Real-time updates for training progress and system events
- **Health Check Endpoints**: Monitor Python ML service and system resources
- **Deployment Configuration**: Optimized settings for Replit environment
- **Error Handling System**: Comprehensive error codes with educational recovery suggestions

## Bulletproof Production Features (January 2025)

### 1. Bulletproof Python Service
- **Health Monitoring**: Continuous health checks with CPU, memory, and uptime tracking
- **Auto-Restart Capability**: Automatic service restart on failures with exponential backoff
- **Service Recovery**: Graceful degradation when Python dependencies are unavailable
- **Startup Integration**: Automatic service startup during server initialization
- **Health Endpoints**: `/api/python-service/health`, `/api/python-service/restart`, `/api/python-service/logs`

### 2. Smart Resource Detection
- **Automatic Resource Discovery**: Detects available memory, CPU cores, storage, and GPU
- **Dynamic Configuration**: Adjusts batch sizes, model variants, and training parameters automatically
- **Performance Optimization**: Memory-efficient configurations for constrained environments
- **Resource Requirements Analysis**: Pre-training resource requirement estimation
- **API Endpoints**: `/api/resources/detect`, `/api/resources/optimize`, `/api/resources/requirements/:modelName`

### 3. Graceful Degradation
- **Fallback Alternatives**: Automatic lighter model alternatives when resources are insufficient
- **Resource-Aware Switching**: Seamless switching between full and lightweight modes
- **Performance Trade-offs**: Intelligent performance vs. resource usage optimization
- **Fallback Control**: Manual and automatic fallback mode activation
- **Degradation API**: `/api/system/fallback/:modelName` for degradation control

### 4. Enhanced Local Setup Experience
- **Comprehensive Setup Script**: Production-ready `setup.sh` with full dependency verification
- **System Requirements Check**: Memory, CPU, disk space, and network connectivity validation
- **Smart Installation**: Conditional installation with force and skip options
- **Build Verification**: TypeScript compilation and Node.js build testing
- **Command Line Options**: `--verify-only`, `--skip-python`, `--force`, `--help`

### 5. Enhanced WebSocket Stability
- **Heartbeat System**: 30-second heartbeat with latency calculation
- **Connection Recovery**: Automatic reconnection with exponential backoff
- **Connection Monitoring**: Real-time connection quality tracking
- **Graceful Disconnection**: Proper cleanup and error handling
- **Status API**: `/api/websocket/status` for connection monitoring

### 6. Comprehensive System Dashboard
- **Real-time Monitoring**: Live system health, resource usage, and service status
- **Interactive Controls**: Service restart, resource optimization, and configuration
- **Multi-tab Interface**: Services, Resources, Jobs, WebSocket, and Optimizations views
- **Visual Indicators**: Status badges, progress bars, and health indicators
- **Auto-refresh**: Configurable automatic dashboard updates

### 7. Production API Endpoints
- **Health Monitoring**: `/api/system/health-detailed` - Comprehensive system health
- **Memory Management**: `/api/memory/report` - Detailed memory analysis and optimization
- **Job Management**: `/api/jobs/metrics`, `/api/jobs/:id` - Job queue monitoring and control
- **Service Control**: Python service restart, logs, and health endpoints
- **Resource Control**: Resource detection, optimization, and requirement analysis

## Changelog

```
Changelog:
- July 06, 2025. Initial setup
- January 2025. Added advanced ML optimization, error handling, and educational content systems
- January 2025. Implemented production deployment configuration for Replit
- January 2025. Added performance monitoring and health check endpoints
- January 2025. Created ML job queue manager with priority scheduling and resource management
- January 2025. Built adaptive educational system with skill level detection
- January 2025. Integrated memory optimization for constrained environments
- January 2025. Added system dashboard for comprehensive monitoring
- January 2025. Implemented production-ready features: job queuing, adaptive education, memory management, and accessible UX
- January 2025. Built bulletproof Python service with health monitoring and auto-restart capabilities
- January 2025. Implemented smart resource detection with automatic parameter adjustment
- January 2025. Added graceful degradation with lighter alternatives for resource constraints
- January 2025. Created comprehensive local setup script with dependency verification
- January 2025. Enhanced WebSocket stability with heartbeat and reconnection logic
- January 2025. Built comprehensive System Dashboard integrating all bulletproof features
- January 2025. Completed production-ready bulletproof system with 25+ API endpoints
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```