# Contributing to ML Training Platform

We welcome contributions to make this platform even better! This guide will help you get started.

## Quick Start

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/ml-training-platform.git
   cd ml-training-platform
   ```

2. **Install Dependencies**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Standards
- **TypeScript**: Use strict typing for all new code
- **Python**: Follow PEP 8 style guidelines
- **Testing**: Add tests for new features and bug fixes
- **Documentation**: Update docs for API changes

### Commit Message Format
```
type(scope): brief description

Detailed explanation of changes (if needed)

Fixes #issue-number
```

**Types**: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm test
   python -m pytest server/tests/
   ```

4. **Submit Pull Request**
   - Use clear title and description
   - Reference related issues
   - Include screenshots for UI changes

## Areas for Contribution

### 🚀 High Priority
- **Model Support**: Add new model architectures (BERT variants, T5, etc.)
- **GPU Optimization**: Improve CUDA memory management
- **Dataset Formats**: Support for more data formats (JSON, Parquet, etc.)
- **Error Recovery**: Enhanced automatic error recovery strategies

### 🛠️ Medium Priority
- **UI/UX Improvements**: Better visualizations and user experience
- **Performance**: Optimize training speed and resource usage
- **Documentation**: Tutorials and advanced usage guides
- **Testing**: Increase test coverage

### 🎯 Good First Issues
- **Bug Fixes**: Small bug fixes and improvements
- **Documentation**: Fix typos, improve clarity
- **Accessibility**: Add keyboard navigation, screen reader support
- **Translations**: Internationalization support

## Architecture Overview

```
├── client/           # React frontend with TypeScript
├── server/           # Express.js backend with TypeScript
├── server/*.py       # Python ML services
├── shared/           # Shared types and schemas
└── docs/            # Documentation
```

### Key Components

1. **Frontend**: React with Shadcn/UI components and TanStack Query
2. **Backend**: Express.js with WebSocket support for real-time updates
3. **ML Service**: Python with Hugging Face Transformers
4. **Database**: Drizzle ORM with PostgreSQL support
5. **Resource Management**: Smart detection and optimization

## Testing

### Frontend Tests
```bash
npm run test
npm run test:watch
```

### Backend Tests
```bash
npm run test:server
```

### Python Tests
```bash
python -m pytest server/tests/ -v
```

### End-to-End Tests
```bash
npm run test:e2e
```

## Running in Different Environments

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker (Optional)
```bash
docker build -t ml-platform .
docker run -p 5000:5000 ml-platform
```

## Common Issues

### Python Dependencies
If you encounter Python import errors:
```bash
pip install -r server/requirements.txt
```

### Memory Issues
For training on low-memory systems:
- Use smaller batch sizes
- Enable gradient checkpointing
- Try FP16 precision

### WebSocket Connection Issues
Check that your firewall allows WebSocket connections on the development port.

## Security

### Reporting Security Issues
Please do not open public issues for security vulnerabilities. Instead:
- Email: security@ml-platform.dev
- Include detailed reproduction steps
- We'll respond within 48 hours

### Security Best Practices
- Never commit API keys or secrets
- Validate all user inputs
- Use HTTPS in production
- Keep dependencies updated

## Code Review Process

### What We Look For
- **Functionality**: Does it work as intended?
- **Code Quality**: Is it readable and maintainable?
- **Performance**: Are there any performance implications?
- **Security**: Does it introduce security risks?
- **Tests**: Are there adequate tests?

### Review Timeline
- **Small PRs**: 1-2 days
- **Medium PRs**: 3-5 days
- **Large PRs**: 1 week

## Community

### Communication Channels
- **GitHub Discussions**: General questions and feature requests
- **Issues**: Bug reports and specific problems
- **Discord**: Real-time chat with the community

### Code of Conduct
- Be respectful and inclusive
- Help others learn and grow
- Focus on constructive feedback
- Follow the GitHub Community Guidelines

## Release Process

We use semantic versioning (SemVer):
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

### Release Schedule
- **Patch releases**: As needed for critical bugs
- **Minor releases**: Monthly
- **Major releases**: Quarterly

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Annual contributor spotlight

Thank you for helping make ML training more accessible to everyone! 🚀

## Questions?

- Check existing issues and discussions first
- Create a new issue with the "question" label
- Join our Discord for real-time help

---

By contributing, you agree that your contributions will be licensed under the MIT License.