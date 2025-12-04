# Development Best Practices

## Technology Standards

The project strictly follows the **latest official best practices** for:

- Bun
- Neutralinojs
- Buntralino
- Modern JavaScript / TypeScript standards

Key technical standards include:

- Modular, layered architecture
- Strict type enforcement where applicable
- Environment-based configuration
- Zero hardcoded secrets
- Deterministic build outputs
- Explicit version pinning for critical dependencies

## GitHub Project Structure & Workflow

Development follows modern GitHub best practices:

### Repository Structure

```text
Chess-Sensei/
├── src/
│   ├── frontend/     # Neutralino UI code (Vite + TypeScript)
│   ├── backend/      # Bun-powered services and IPC handlers
│   ├── engine/       # Chess engine + AI logic (Stockfish WASM)
│   ├── shared/       # Shared types and utilities
│   └── assets/       # Internal source assets
├── scripts/          # Build scripts (Windows build workaround)
├── assets/           # Chess pieces, icons, sounds
├── source-docs/      # Design & development specifications
├── documents/        # End-user documentation
└── public/           # Static files
```

### Development Workflow

- Conventional commits
- Feature-branch workflow
- Pull request reviews
- Automated linting and formatting
- CI pipelines for:
  - Build validation
  - Security checks
  - Platform packaging verification

## Code Quality

### Linting and Formatting

The project uses a comprehensive linting stack:

- **ESLint** (v9+ flat config) - TypeScript/JavaScript linting
- **Stylelint** (v16+) - CSS linting
- **Prettier** (v3+) - Code formatting for all file types
- **Markdownlint** - Documentation consistency

Commands:

```bash
bun run lint        # Run all linters
bun run lint:fix    # Auto-fix issues
bun run format      # Format with Prettier

# Individual linters
bun run lint:ts     # ESLint only
bun run lint:css    # Stylelint only
bun run lint:md     # Markdownlint only
bun run lint:format # Prettier check
```

Configuration files (gitignored for local customization):

- `eslint.config.mjs` - ESLint flat config
- `.prettierrc.json` - Prettier settings
- `.markdownlint.json` - Markdownlint rules
- `.stylelintrc.json` - Stylelint rules

### Testing Strategy

- Unit tests for core logic
- Integration tests for engine communication
- End-to-end tests for critical user flows
- Performance benchmarks for engine operations

## Version Control

### Branch Strategy

- `main` --- Production-ready code
- `develop` --- Integration branch for features
- `feature/*` --- Individual feature branches
- `bugfix/*` --- Bug fix branches
- `hotfix/*` --- Emergency fixes for production

### Commit Guidelines

Follow conventional commits specification:

- `feat:` --- New features
- `fix:` --- Bug fixes
- `docs:` --- Documentation changes
- `style:` --- Code style changes (formatting, etc.)
- `refactor:` --- Code refactoring
- `test:` --- Test additions or changes
- `chore:` --- Build process or tooling changes

## Security Practices

### Code Security

- Regular dependency audits
- No hardcoded credentials or secrets
- Environment variables for configuration
- Input validation and sanitization
- Secure IPC communication between frontend and backend

### Build Security

- Reproducible builds
- Dependency lock files committed
- Security scanning in CI/CD
- Code signing for release builds

## Performance Optimization

### Build Optimization

- Tree-shaking for minimal bundle size
- Asset optimization (images, fonts)
- Lazy loading where appropriate
- WASM module size monitoring

### Runtime Optimization

- Efficient engine instance management
- Minimal main thread blocking
- Debounced UI updates
- Memory leak prevention

## Documentation Standards

### Code Documentation

- Clear function and class documentation
- Type definitions for all public APIs
- Inline comments for complex logic
- Architecture decision records (ADRs)

### User Documentation

- Setup and installation guides
- Feature documentation
- Troubleshooting guides
- Contributing guidelines

## Release Process

### Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- Changelog maintained for each release
- Git tags for all releases

### Build and Distribution

- Automated build process for all platforms
- Platform-specific packaging:
  - Windows: `.exe` installer
  - macOS: `.app` / `.dmg`
  - Linux: `.AppImage` / `.deb`
- Release notes published with each version
- Optional auto-update mechanism (disabled by default)

## Contributing Guidelines

### Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Pull Request Requirements

- Clear description of changes
- Reference to related issues
- All tests passing
- Code review approval
- No merge conflicts with target branch

## Development Environment Setup

### Prerequisites

- Bun runtime installed
- Neutralinojs CLI tools
- Git version control
- Code editor with TypeScript support

### Local Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Run development server: `bun run dev`
4. Run linters: `bun run lint`
5. Build for production:
   - Frontend only: `bun run build`
   - Full app (all platforms): `bun run build:app`
   - Windows (with rcedit workaround): `bun run build:windows`

See [documents/building.md](../documents/building.md) for detailed build
instructions and troubleshooting.

## Continuous Integration

### Automated Checks

- Code linting
- Type checking
- Unit test execution
- Build verification
- Security scanning
- License compliance checking

### Platform Testing

- Automated testing on:
  - Windows (latest)
  - macOS (latest)
  - Linux (Ubuntu LTS)
