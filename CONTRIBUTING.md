# Contributing to Chess-Sensei

Thank you for your interest in contributing to Chess-Sensei! This document
provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0 or higher
- Git
- A code editor (VS Code recommended)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/Grips001/Chess-Sensei.git
   cd Chess-Sensei
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
Chess-Sensei/
├── src/
│   ├── frontend/     # Neutralino UI code
│   ├── backend/      # Bun-powered services
│   ├── engine/       # Chess engine + AI logic
│   ├── shared/       # Shared types and utilities
│   └── assets/       # Internal assets
├── assets/           # Chess pieces, icons, sounds
├── source-docs/      # Design & development specifications
├── documents/        # End-user documentation
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
- ESLint for TypeScript/JavaScript linting
- Stylelint for CSS linting
- Prettier for code formatting
- Markdownlint for documentation
- Type safety required
- Clear variable and function names
- Comments for complex logic
- No hardcoded values (use constants)

### Linting Workflow

Before submitting a PR, ensure your code passes all linters:

```bash
# Run all linters (ESLint, Stylelint, Markdownlint, Prettier)
bun run lint

# Auto-fix most issues
bun run lint:fix

# Format code only
bun run format
```

Individual linters:

```bash
bun run lint:ts      # ESLint for TypeScript/JavaScript
bun run lint:css     # Stylelint for CSS
bun run lint:md      # Markdownlint for Markdown
bun run lint:format  # Prettier check (no write)
```

## Documentation

All major features should be documented in the [`source-docs/`](source-docs/)
directory. See existing documentation for style and structure guidelines.

## Testing

Test files exist in the `src/engine/` directory for engine validation:

- `test-stockfish.ts` - Basic Stockfish WASM initialization
- `test-engine-interface.ts` - Engine interface compliance
- `test-engine-operations.ts` - UCI operations and analysis

Run tests with:

```bash
bun run src/engine/test-engine-interface.ts
```

Formal test framework (Jest/Vitest) coming in future phases.

## Questions?

- Check the [documentation](source-docs/)
- Open an issue for clarification
- Join discussions in pull requests

## Code of Conduct

Be respectful, inclusive, and constructive. We're here to build great software
together.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE). See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party
license information.
