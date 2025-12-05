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
│   └── assets/       # Source assets (development only)
├── scripts/          # Build scripts (platform-specific builds)
├── public/           # Static files (copied to app/ during Vite build)
│   └── assets/       # Chess pieces, icons, sounds
├── source-docs/      # Design & development specifications
└── documents/        # End-user documentation
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

Chess-Sensei follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0) - Breaking changes, major rewrites
- **MINOR** (0.1.0) - New features, backward compatible
- **PATCH** (0.0.1) - Bug fixes, minor improvements

Current versioning scheme:

- **v0.x.x** - Pre-release development (Phase 0-9)
- **v1.0.0** - First stable public release
- **v1.x.x** - Post-release updates and improvements

### Version Tags

Version tags correspond to completed development phases:

| Version | Phase                           | Status   |
| ------- | ------------------------------- | -------- |
| v0.0.0  | Phase 0: Foundation             | Complete |
| v0.1.0  | Phase 1: Engine Integration     | Complete |
| v0.2.0  | Phase 2: UI & Chessboard        | Complete |
| v0.3.0  | Phase 3: AI Opponent & Training | Complete |
| v0.4.0  | Phase 4: Exam Mode & Metrics    | Complete |
| v1.0.0  | Full Release (Phase 9 complete) | Planned  |

### Creating a Release

#### Automated Releases (Recommended)

Releases are automated via GitHub Actions. To create a release:

1. **Update version** in `package.json`:

   ```bash
   # Edit package.json version field
   "version": "0.4.0"
   ```

2. **Update CHANGELOG.md** with release notes

3. **Commit changes**:

   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: prepare release v0.4.0"
   ```

4. **Create and push tag**:

   ```bash
   git tag -a v0.4.0 -m "Phase 4: Exam Mode & Metrics Collection"
   git push origin main
   git push origin v0.4.0
   ```

5. **GitHub Actions automatically**:
   - Builds for Windows, macOS, and Linux
   - Creates release archives
   - Publishes GitHub Release with artifacts
   - Generates release notes with checksums

#### Manual Release (if needed)

1. Build locally:

   ```bash
   bun run build
   bun run build:app        # Linux/macOS
   bun run build:windows    # Windows
   ```

2. Create release manually on GitHub
3. Upload build artifacts

### Release Artifacts

Each release includes:

- `Chess-Sensei-{version}-windows-x64.zip` - Windows executable
- `Chess-Sensei-{version}-linux-x64.tar.gz` - Linux binary
- `Chess-Sensei-{version}-macos-x64.tar.gz` - macOS application

### Pre-release Versions

For alpha/beta releases, use suffix tags:

- `v0.4.0-alpha.1` - Alpha release
- `v0.4.0-beta.1` - Beta release
- `v0.4.0-rc.1` - Release candidate

Pre-release tags automatically mark the GitHub release as "pre-release".

### Build and Distribution

- Automated build process for all platforms via GitHub Actions
- Platform-specific packaging:
  - Windows: `.zip` archive with `.exe`
  - macOS: `.tar.gz` archive with `.app`
  - Linux: `.tar.gz` archive with binary
- Release notes published with each version
- SHA256 checksums included for verification
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
5. Build for production: See [documents/building.md](../documents/building.md)

**Important:** Always refer to `documents/building.md` for the correct
platform-specific build commands and troubleshooting. Build procedures vary by
platform due to toolchain differences.

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
