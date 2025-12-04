# Contributing to Chess-Sensai

Thank you for your interest in contributing to Chess-Sensai! This document
provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher
- Git
- A code editor (VS Code recommended)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/Chess-Sensai.git
   cd Chess-Sensai
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Run the development server:

   ```bash
   bun run dev
   ```

## Project Structure

```text
Chess-Sensai/
├── src/
│   ├── frontend/     # Neutralino UI code
│   ├── backend/      # Bun-powered services
│   ├── engine/       # Chess engine + AI logic
│   ├── shared/       # Shared types and utilities
│   └── assets/       # Internal assets
├── assets/           # Chess pieces, icons, sounds
├── docs/             # Technical documentation
└── public/           # Static files
```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch (if used)
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Emergency fixes

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or tooling changes

**Example:**

```text
feat: add real-time best-move highlighting system
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests as needed
4. Ensure all tests pass
5. Update documentation if needed
6. Submit a pull request with clear description
7. Wait for code review

### Code Standards

- TypeScript strict mode enabled
- ESLint/Prettier for formatting (coming soon)
- Type safety required
- Clear variable and function names
- Comments for complex logic
- No hardcoded values (use constants)

## Documentation

All major features should be documented in the [`docs/`](docs/) directory. See
existing documentation for style and structure guidelines.

## Testing

### Coming in Phase 1

- Unit tests for core logic
- Integration tests for engine communication
- End-to-end tests for critical flows

## Questions?

- Check the [documentation](docs/)
- Open an issue for clarification
- Join discussions in pull requests

## Code of Conduct

Be respectful, inclusive, and constructive. We're here to build great software
together.

## License

By contributing, you agree that your contributions will be licensed under the
project's license (TBD).
