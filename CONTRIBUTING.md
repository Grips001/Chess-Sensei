# Contributing to Chess-Sensei

Thank you for your interest in contributing to Chess-Sensei! This document
provides guidelines and information for contributors.

## Quick Links

| Resource                                                    | Purpose                        |
| ----------------------------------------------------------- | ------------------------------ |
| [Branching Strategy](.github/process/BRANCHING_STRATEGY.md) | Git workflow and branch naming |
| [Testing Strategy](.github/process/TESTING_STRATEGY.md)     | Testing requirements           |
| [Release Process](.github/process/RELEASE_PROCESS.md)       | Versioning and releases        |
| [Architecture](.github/process/ARCHITECTURE.md)             | System architecture            |
| [PRD Template](.github/process/PRD_TEMPLATE.md)             | Feature proposal template      |
| [Tech Spec Template](.github/process/TECH_SPEC_TEMPLATE.md) | Technical design template      |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.3.4 or higher
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
│   ├── engine/       # Stockfish WASM integration
│   └── shared/       # Shared types and utilities
├── public/           # Static assets (pieces, sounds, icons)
├── documents/        # User documentation
├── tests/            # Test suites
├── scripts/          # Build scripts
└── .github/
    ├── ISSUE_TEMPLATE/  # Issue templates
    ├── workflows/       # CI/CD workflows
    └── process/         # Engineering process docs
```

## Development Workflow

### Branch Strategy

We follow a trunk-based development model:

- `main` - Production-ready code (protected)
- `feature/CS-XXX-description` - New features
- `fix/CS-XXX-description` - Bug fixes
- `hotfix/vX.Y.Z-description` - Emergency fixes

See [BRANCHING_STRATEGY.md](.github/process/BRANCHING_STRATEGY.md) for details.

### Feature Development Sequence

For significant features, follow this sequence. **Each step requires approval
before proceeding:**

```text
1. PRD Creation
   └── Create `.github/specs/prd-[feature].md` using PRD_TEMPLATE.md
   └── Get PRD approved

2. Tech Spec Creation
   └── Create `.github/specs/tech-[feature].md` using TECH_SPEC_TEMPLATE.md
   └── Get Tech Spec approved

3. Implementation
   └── Create feature branch: feature/CS-XXX-[name]
   └── Implement according to Tech Spec
   └── Run `bun run verify` before each commit

4. Pull Request
   └── Create PR using PR template
   └── Pass CI checks
   └── Get PR approved

5. Merge
   └── Squash and merge after approval
```

**Important:** Do not skip steps. Implementation should not begin without an
approved Tech Spec for significant features.

### Creating a Feature (Quick Reference)

1. **Open an issue** using the appropriate template
2. **For significant features:** Write PRD → Get approved → Write Tech Spec →
   Get approved
3. **Create a feature branch:**

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/CS-123-my-feature
   ```

4. **Develop** with regular commits following conventions
5. **Run verification:**

   ```bash
   bun run verify  # typecheck + lint + test
   ```

6. **Submit PR** using the PR template

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type       | Description                         |
| ---------- | ----------------------------------- |
| `feat`     | New feature                         |
| `fix`      | Bug fix                             |
| `docs`     | Documentation only                  |
| `style`    | Formatting (no code change)         |
| `refactor` | Code change (no new feature or fix) |
| `perf`     | Performance improvement             |
| `test`     | Adding/updating tests               |
| `chore`    | Build process, tooling              |

**Scopes:** `frontend`, `backend`, `engine`, `shared`, `build`, `ci`, `docs`

**Examples:**

```text
feat(frontend): add puzzle mode selection screen
fix(backend): resolve engine crash on invalid FEN
docs: update README with new build instructions
```

### Pull Request Process

1. Fill out the PR template completely
2. Ensure CI checks pass (lint, typecheck, test, build)
3. Request review from code owners
4. Address review feedback
5. Squash and merge when approved

### Code Standards

- TypeScript strict mode enabled
- No `any` types without justification
- ESLint for TypeScript/JavaScript linting
- Stylelint for CSS linting
- Prettier for code formatting
- Markdownlint for documentation
- Clear variable and function names
- Comments for complex logic only

## Testing

### Running Tests

```bash
# All tests
bun run test

# Watch mode
bun run test:watch

# With coverage
bun run test:coverage
```

### Verification Commands

```bash
# Full verification (recommended before PR)
bun run verify

# Individual checks
bun run typecheck   # TypeScript
bun run lint        # All linters
bun run test        # Tests
```

See [TESTING_STRATEGY.md](.github/process/TESTING_STRATEGY.md) for testing
requirements.

## Linting

Before submitting a PR:

```bash
# Run all linters
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
bun run lint:format  # Prettier check
```

## Building

Use platform-specific build commands:

```bash
bun run build:windows  # Windows (use this on Windows)
bun run build:linux    # Linux
bun run build:macos    # macOS
```

**Note:** Never use `bun run build:app` on Windows (pe-library incompatibility).

## Documentation

- User-facing features: Document in [`documents/`](documents/)
- Technical changes: Update inline comments and type definitions
- Process changes: Update `.github/process/` docs

## Proposing Features

### Significant Features

For significant features, follow the full workflow:

1. Create a Feature Request issue
2. Write a PRD: `.github/specs/prd-[feature].md`
   ([template](.github/process/PRD_TEMPLATE.md))
3. Get PRD approved
4. Write a Tech Spec: `.github/specs/tech-[feature].md`
   ([template](.github/process/TECH_SPEC_TEMPLATE.md))
5. Get Tech Spec approved
6. Begin implementation

### Small Enhancements

For small enhancements (bug fixes, minor UI tweaks), a GitHub issue is
sufficient. Skip the PRD/Tech Spec and go directly to implementation.

## Questions?

- Check the [documentation](documents/)
- Check the [FAQ](documents/faq.md)
- Open an issue for clarification
- Join discussions in pull requests

## Code of Conduct

Be respectful, inclusive, and constructive. We're here to build great software
together.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE). See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party
license information.
