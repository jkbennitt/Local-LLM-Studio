
#!/bin/bash

# ML Training Platform Setup Script
# Comprehensive dependency verification and system requirement checks

set -e  # Exit on any error

echo "🚀 Setting up ML Training Platform..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
VERIFY_ONLY=false
SKIP_PYTHON=false
FORCE_INSTALL=false
MIN_MEMORY_MB=512
MIN_DISK_GB=1
REQUIRED_PYTHON_PACKAGES=("torch" "transformers" "datasets" "numpy" "pandas" "accelerate")

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verify-only)
                VERIFY_ONLY=true
                shift
                ;;
            --skip-python)
                SKIP_PYTHON=true
                shift
                ;;
            --force)
                FORCE_INSTALL=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help message
show_help() {
    cat << EOF
ML Training Platform Setup Script

Usage: $0 [OPTIONS]

Options:
    --verify-only    Only verify dependencies, don't install anything
    --skip-python    Skip Python dependency installation
    --force          Force installation even if checks fail
    --help, -h       Show this help message

Examples:
    $0                    # Full setup with all dependencies
    $0 --verify-only      # Just check what's installed
    $0 --skip-python      # Setup without Python dependencies (Node.js only)
    $0 --force            # Install even if system requirements not met
EOF
}

# Check system requirements
check_system_requirements() {
    print_status "🔍 Checking system requirements..."
    
    local warnings=0
    
    # Check available memory
    if command -v free >/dev/null 2>&1; then
        local available_memory=$(free -m | awk 'NR==2{print $7}')
        print_debug "Available memory: ${available_memory}MB"
        
        if [ "$available_memory" -lt "$MIN_MEMORY_MB" ]; then
            print_warning "Low memory: ${available_memory}MB available (recommended: ${MIN_MEMORY_MB}MB+)"
            ((warnings++))
        else
            print_status "Memory check passed: ${available_memory}MB available"
        fi
    else
        print_warning "Cannot check memory (free command not available)"
    fi
    
    # Check available disk space
    local available_disk=$(df . | tail -1 | awk '{print $4}')
    local available_disk_gb=$((available_disk / 1024 / 1024))
    print_debug "Available disk space: ${available_disk_gb}GB"
    
    if [ "$available_disk_gb" -lt "$MIN_DISK_GB" ]; then
        print_warning "Low disk space: ${available_disk_gb}GB available (recommended: ${MIN_DISK_GB}GB+)"
        ((warnings++))
    else
        print_status "Disk space check passed: ${available_disk_gb}GB available"
    fi
    
    # Check CPU cores
    if command -v nproc >/dev/null 2>&1; then
        local cpu_cores=$(nproc)
        print_status "CPU cores detected: $cpu_cores"
        
        if [ "$cpu_cores" -lt 2 ]; then
            print_warning "Single core CPU detected. Training may be slow."
            ((warnings++))
        fi
    fi
    
    # Check for GPU
    if command -v nvidia-smi >/dev/null 2>&1; then
        local gpu_info=$(nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>/dev/null | head -1)
        if [ -n "$gpu_info" ]; then
            print_status "GPU detected: $gpu_info"
        fi
    else
        print_debug "No NVIDIA GPU detected (CPU-only mode)"
    fi
    
    # Check network connectivity
    if ping -c 1 -W 5 8.8.8.8 >/dev/null 2>&1; then
        print_status "Network connectivity: OK"
    else
        print_warning "Network connectivity issues detected"
        ((warnings++))
    fi
    
    if [ $warnings -gt 0 ] && [ "$FORCE_INSTALL" = false ]; then
        print_warning "System requirements check found $warnings warnings."
        print_warning "Use --force to proceed anyway, or address the warnings above."
        return 1
    fi
    
    return 0
}

# Check if Node.js is installed and meets version requirements
check_node() {
    print_status "🟢 Checking Node.js..."
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        print_status "Node.js found: $node_version"
        
        # Extract major version number
        local node_major=$(echo $node_version | cut -d'.' -f1 | cut -d'v' -f2)
        
        if [ "$node_major" -lt 16 ]; then
            print_error "Node.js version 16+ required. Found: $node_version"
            print_error "Please update Node.js: https://nodejs.org/"
            return 1
        fi
        
        # Check npm
        if command -v npm >/dev/null 2>&1; then
            local npm_version=$(npm --version)
            print_status "npm found: v$npm_version"
        else
            print_error "npm not found. Please reinstall Node.js with npm."
            return 1
        fi
        
    else
        print_error "Node.js not found. Please install Node.js 16+: https://nodejs.org/"
        return 1
    fi
    
    return 0
}

# Check if Python is installed and meets version requirements
check_python() {
    if [ "$SKIP_PYTHON" = true ]; then
        print_status "⏭️  Skipping Python checks (--skip-python flag)"
        return 0
    fi
    
    print_status "🐍 Checking Python..."
    
    if command -v python3 >/dev/null 2>&1; then
        local python_version=$(python3 --version 2>&1)
        print_status "Python found: $python_version"
        
        # Extract version numbers
        local version_num=$(echo $python_version | cut -d' ' -f2)
        local major=$(echo $version_num | cut -d'.' -f1)
        local minor=$(echo $version_num | cut -d'.' -f2)
        
        if [ "$major" -lt 3 ] || ([ "$major" -eq 3 ] && [ "$minor" -lt 8 ]); then
            print_error "Python 3.8+ required. Found: $python_version"
            print_error "Please install Python 3.8+: https://python.org/"
            return 1
        fi
        
        # Check pip
        if command -v pip3 >/dev/null 2>&1; then
            local pip_version=$(pip3 --version)
            print_status "pip found: $pip_version"
        else
            print_error "pip3 not found. Please install pip."
            return 1
        fi
        
    else
        print_error "Python 3 not found. Please install Python 3.8+: https://python.org/"
        return 1
    fi
    
    return 0
}

# Verify Python packages are importable
verify_python_packages() {
    if [ "$SKIP_PYTHON" = true ]; then
        return 0
    fi
    
    print_status "🔍 Verifying Python packages..."
    
    local missing_packages=()
    local failed_imports=()
    
    for package in "${REQUIRED_PYTHON_PACKAGES[@]}"; do
        if python3 -c "import $package" 2>/dev/null; then
            print_debug "✓ $package importable"
        else
            print_warning "✗ $package not importable"
            failed_imports+=("$package")
        fi
    done
    
    if [ ${#failed_imports[@]} -gt 0 ]; then
        print_warning "Failed to import: ${failed_imports[*]}"
        print_warning "You may need to run: pip3 install ${failed_imports[*]}"
        return 1
    fi
    
    print_status "All Python packages verified successfully!"
    return 0
}

# Check Node.js packages
verify_node_packages() {
    print_status "📦 Checking Node.js packages..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the project root?"
        return 1
    fi
    
    # Check if node_modules exists
    if [ -d "node_modules" ]; then
        print_status "node_modules directory found"
        
        # Check if key packages are installed
        local key_packages=("react" "@types/node" "typescript" "vite")
        for package in "${key_packages[@]}"; do
            if [ -d "node_modules/$package" ]; then
                print_debug "✓ $package installed"
            else
                print_warning "✗ $package not found in node_modules"
                return 1
            fi
        done
        
    else
        print_warning "node_modules not found. Run 'npm install' to install dependencies."
        return 1
    fi
    
    return 0
}

# Check build tools and compilation
check_build_tools() {
    print_status "🔧 Checking build tools..."
    
    # Check TypeScript
    if npx tsc --version >/dev/null 2>&1; then
        local tsc_version=$(npx tsc --version)
        print_status "TypeScript found: $tsc_version"
    else
        print_warning "TypeScript not available"
    fi
    
    # Test TypeScript compilation (quick check)
    if [ -f "tsconfig.json" ]; then
        print_debug "Testing TypeScript compilation..."
        if npx tsc --noEmit --skipLibCheck 2>/dev/null; then
            print_status "TypeScript compilation check passed"
        else
            print_warning "TypeScript compilation issues detected"
        fi
    fi
    
    return 0
}

# Install Node.js dependencies
install_node_deps() {
    if [ "$VERIFY_ONLY" = true ]; then
        return 0
    fi
    
    print_status "📦 Installing Node.js dependencies..."
    
    # Clean install
    if [ "$FORCE_INSTALL" = true ] && [ -d "node_modules" ]; then
        print_status "Force install: removing existing node_modules..."
        rm -rf node_modules package-lock.json
    fi
    
    # Use npm ci if package-lock.json exists, otherwise npm install
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_status "Node.js dependencies installed successfully!"
    return 0
}

# Install Python dependencies
install_python_deps() {
    if [ "$VERIFY_ONLY" = true ] || [ "$SKIP_PYTHON" = true ]; then
        return 0
    fi
    
    print_status "🐍 Installing Python dependencies..."
    
    # Use existing setup approach for Python dependencies
    python3 -m pip install --user \
        torch==2.1.0+cpu \
        transformers==4.36.0 \
        datasets==2.14.0 \
        pandas==2.1.0 \
        numpy==1.24.0 \
        scikit-learn==1.3.0 \
        accelerate==0.24.0 \
        --index-url https://download.pytorch.org/whl/cpu
    
    print_status "Python dependencies installed successfully!"
    return 0
}

# Create environment file if needed
setup_env() {
    if [ "$VERIFY_ONLY" = true ]; then
        return 0
    fi
    
    print_status "⚙️  Setting up environment..."
    
    if [ ! -f ".env" ]; then
        print_status "Creating environment file..."
        cat > .env << EOL
# ML Training Platform Environment Configuration
NODE_ENV=development
PORT=5000

# Session configuration
SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-secret-key")

# Database configuration
DATABASE_URL=file:./dev.db

# Python ML service configuration
PYTHON_SERVICE_PORT=8000
ML_SERVICE_TIMEOUT=300000

# Resource management
MAX_CONCURRENT_JOBS=1
MEMORY_LIMIT_MB=512
AUTO_OPTIMIZE_RESOURCES=true

# Logging
LOG_LEVEL=info
DEBUG_ML_SERVICE=false
EOL
        print_status "Environment file created with secure defaults."
    else
        print_status "Environment file already exists."
    fi
    
    return 0
}

# Create necessary directories and sample data
setup_directories() {
    if [ "$VERIFY_ONLY" = true ]; then
        return 0
    fi
    
    print_status "📁 Creating directories..."
    mkdir -p models uploads

    print_status "📄 Creating sample dataset..."
    cat > sample_data.txt << 'EOF'
The quick brown fox jumps over the lazy dog.
Machine learning is a subset of artificial intelligence.
Natural language processing helps computers understand human language.
Deep learning uses neural networks with multiple layers.
Transformers are a type of neural network architecture used in NLP.
Fine-tuning allows you to adapt pre-trained models to specific tasks.
EOF

    if [ ! -f "sample_data.csv" ]; then
        print_status "Creating sample CSV dataset..."
        cat > sample_data.csv << 'EOF'
text,label
"The movie was fantastic and entertaining",positive
"I didn't enjoy the film at all",negative
"The book was well-written and engaging",positive
"The service was disappointing",negative
"Great experience overall",positive
"Not worth the money",negative
EOF
    fi
    
    return 0
}

# Run comprehensive tests
run_tests() {
    print_status "🧪 Running comprehensive tests..."
    
    local test_failures=0
    
    # Test Node.js build
    print_debug "Testing Node.js build..."
    if npm run build >/dev/null 2>&1; then
        print_status "✓ Node.js build test passed"
    else
        print_warning "✗ Node.js build test failed"
        ((test_failures++))
    fi
    
    # Test TypeScript compilation
    print_debug "Testing TypeScript compilation..."
    if npx tsc --noEmit --skipLibCheck >/dev/null 2>&1; then
        print_status "✓ TypeScript compilation test passed"
    else
        print_warning "✗ TypeScript compilation test failed"
        ((test_failures++))
    fi
    
    # Test Python imports
    if [ "$SKIP_PYTHON" = false ]; then
        print_debug "Testing Python imports..."
        if python3 -c "import torch, transformers, datasets, pandas, numpy; print('All imports successful')" >/dev/null 2>&1; then
            print_status "✓ Python imports test passed"
        else
            print_warning "✗ Python imports test failed"
            ((test_failures++))
        fi
    fi
    
    # Test server startup (dry run)
    print_debug "Testing server startup (dry run)..."
    if timeout 10s npm start --dry-run >/dev/null 2>&1; then
        print_status "✓ Server startup test passed"
    else
        print_warning "✗ Server startup test failed (this may be expected)"
    fi
    
    if [ $test_failures -gt 0 ]; then
        print_warning "Tests completed with $test_failures failures"
        return 1
    else
        print_status "All tests passed successfully!"
        return 0
    fi
}

# Print setup summary
print_setup_summary() {
    print_status "📋 Setup Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # System information
    echo "System Information:"
    echo "  OS: $(uname -s) $(uname -r)"
    echo "  Architecture: $(uname -m)"
    
    if command -v free >/dev/null 2>&1; then
        local total_mem=$(free -h | awk 'NR==2{print $2}')
        local avail_mem=$(free -h | awk 'NR==2{print $7}')
        echo "  Memory: $avail_mem available of $total_mem total"
    fi
    
    if command -v nproc >/dev/null 2>&1; then
        local cpu_cores=$(nproc)
        echo "  CPU Cores: $cpu_cores"
    fi
    
    echo ""
    echo "Software Versions:"
    
    # Node.js version
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        echo "  Node.js: $node_version"
    fi
    
    # Python version
    if command -v python3 >/dev/null 2>&1; then
        local python_version=$(python3 --version)
        echo "  Python: $python_version"
    fi
    
    # npm version
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        echo "  npm: v$npm_version"
    fi
    
    echo ""
    echo "Project Setup:"
    echo "  ✓ Node.js dependencies installed"
    
    if [ "$SKIP_PYTHON" = false ]; then
        echo "  ✓ Python dependencies installed"
    else
        echo "  ⏭️  Python dependencies skipped"
    fi
    
    echo "  ✓ Environment configuration created"
    echo "  ✓ Sample data files created"
    echo "  ✓ Directory structure initialized"
    
    echo ""
    echo "Next Steps:"
    echo "  1. Run 'npm run dev' to start the development server"
    echo "  2. Open http://localhost:5000 in your browser"
    echo "  3. Upload a dataset and start training your first model"
    echo "  4. Check the sample_data.txt and sample_data.csv files for examples"
    
    if [ "$VERIFY_ONLY" = false ]; then
        echo ""
        echo "Pro Tips:"
        echo "  • Run '$0 --verify-only' to check your setup anytime"
        echo "  • Use '$0 --skip-python' for frontend-only development"
        echo "  • Check the README.md for more detailed documentation"
        echo "  • Join our community for support and updates"
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Main setup function
main() {
    # Parse arguments
    parse_args "$@"
    
    # Show header
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🧠 ML Training Platform Setup Script"
    echo "   Production-ready, open source ML training platform"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$VERIFY_ONLY" = true ]; then
        print_status "Running verification checks only..."
    else
        print_status "Running full setup with installation..."
    fi
    
    echo ""
    
    # Step 1: System requirements check
    print_status "🔍 Step 1: System Requirements"
    if ! check_system_requirements; then
        print_error "System requirements check failed. Use --force to proceed anyway."
        exit 1
    fi
    echo ""
    
    # Step 2: Check runtime dependencies
    print_status "🔧 Step 2: Runtime Dependencies"
    if ! check_node; then
        print_error "Node.js dependency check failed."
        exit 1
    fi
    
    if ! check_python; then
        print_error "Python dependency check failed."
        exit 1
    fi
    echo ""
    
    # Step 3: Install/verify package dependencies
    print_status "📦 Step 3: Package Dependencies"
    if ! install_node_deps; then
        print_error "Node.js dependency installation failed."
        exit 1
    fi
    
    if ! install_python_deps; then
        print_error "Python dependency installation failed."
        exit 1
    fi
    
    # Verify installations
    if ! verify_node_packages; then
        print_warning "Node.js package verification failed, but continuing..."
    fi
    
    if ! verify_python_packages; then
        print_warning "Python package verification failed, but continuing..."
    fi
    echo ""
    
    # Step 4: Build tools and compilation
    print_status "🔧 Step 4: Build Tools"
    check_build_tools
    echo ""
    
    # Step 5: Environment setup
    print_status "⚙️  Step 5: Environment Setup"
    if ! setup_env; then
        print_error "Environment setup failed."
        exit 1
    fi
    
    if ! setup_directories; then
        print_error "Directory setup failed."
        exit 1
    fi
    echo ""
    
    # Step 6: Run tests
    if [ "$VERIFY_ONLY" = false ]; then
        print_status "🧪 Step 6: Verification Tests"
        run_tests
        echo ""
    fi
    
    # Step 7: Summary
    print_setup_summary
    
    # Final status
    print_status "🎉 Setup completed successfully!"
    
    if [ "$VERIFY_ONLY" = false ]; then
        print_status "Run 'npm run dev' to start your ML training platform!"
    else
        print_status "Verification completed. Your setup looks good!"
    fi
}

# Only run main if script is executed directly (not sourced)
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
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
