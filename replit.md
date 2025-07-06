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

## Changelog

```
Changelog:
- July 06, 2025. Initial setup
- January 2025. Added advanced ML optimization, error handling, and educational content systems
- January 2025. Implemented production deployment configuration for Replit
- January 2025. Added performance monitoring and health check endpoints
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```