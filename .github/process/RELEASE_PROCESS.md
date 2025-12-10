# Release Process

This document describes the versioning, release procedures, and release notes
standards for Chess-Sensei.

## Versioning

Chess-Sensei follows [Semantic Versioning 2.0.0](https://semver.org/):

```text
MAJOR.MINOR.PATCH[-PRERELEASE]

Examples:
1.0.0        - First stable release
1.1.0        - New feature added (backward compatible)
1.1.1        - Bug fix
2.0.0        - Breaking change
2.0.0-alpha  - Pre-release version
2.0.0-beta.1 - Beta with build number
```

### Version Increment Rules

| Change Type             | Version Bump | Example       |
| ----------------------- | ------------ | ------------- |
| Breaking API change     | MAJOR        | 1.0.0 → 2.0.0 |
| Data format change      | MAJOR        | 1.0.0 → 2.0.0 |
| New feature             | MINOR        | 1.0.0 → 1.1.0 |
| Enhancement             | MINOR        | 1.0.0 → 1.1.0 |
| Bug fix                 | PATCH        | 1.0.0 → 1.0.1 |
| Performance improvement | PATCH        | 1.0.0 → 1.0.1 |
| Documentation only      | No release   | -             |

### Pre-Release Tags

| Tag      | Purpose                     |
| -------- | --------------------------- |
| `-alpha` | Early development, unstable |
| `-beta`  | Feature complete, testing   |
| `-rc.N`  | Release candidate N         |

## Release Workflow

### Standard Release

```text
1. Verify all tests pass
   └── bun run verify

2. Update version numbers
   └── package.json, neutralino.config.json

3. Update CHANGELOG.md
   └── Add release date, document changes

4. Create PR for version bump
   └── Title: "Release vX.Y.Z"

5. Merge PR to main

6. Create and push tag
   └── git tag -a vX.Y.Z -m "Release vX.Y.Z"
   └── git push origin vX.Y.Z

7. GitHub Actions builds and publishes

8. Verify release artifacts
```

### Hotfix Release

```text
1. Create hotfix branch from tag
   └── git checkout vX.Y.Z
   └── git checkout -b hotfix/vX.Y.(Z+1)-description

2. Make minimal fix

3. Update version and CHANGELOG

4. Create PR, merge to main

5. Tag and push
   └── git tag -a vX.Y.(Z+1) -m "Hotfix: description"
   └── git push origin vX.Y.(Z+1)
```

## Release Checklist

### Pre-Release

- [ ] All tests pass: `bun run test`
- [ ] Type check passes: `bun run typecheck`
- [ ] Lint passes: `bun run lint`
- [ ] No known critical bugs
- [ ] CHANGELOG.md updated with all changes
- [ ] Version numbers updated:
  - [ ] `package.json`
  - [ ] `neutralino.config.json`
- [ ] README.md accurate for new version
- [ ] All PRs for this release merged

### Build Verification

- [ ] Windows build succeeds locally
- [ ] macOS build succeeds (in CI)
- [ ] Linux build succeeds (in CI)

### Manual Testing

- [ ] Fresh install works on Windows
- [ ] Fresh install works on macOS
- [ ] Fresh install works on Linux
- [ ] Upgrade from previous version works
- [ ] All major features functional
- [ ] No console errors

### Post-Release

- [ ] GitHub Release created with artifacts
- [ ] Release notes accurate
- [ ] Checksums included
- [ ] Announce release (if applicable)

## Version Update Locations

When bumping version, update these files:

| File                     | Field/Location          |
| ------------------------ | ----------------------- |
| `package.json`           | `"version": "X.Y.Z"`    |
| `neutralino.config.json` | `"version": "X.Y.Z"`    |
| `CHANGELOG.md`           | Add new version section |

## CHANGELOG Format

Follow [Keep a Changelog](https://keepachangelog.com/):

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New feature A
- New feature B

### Changed

- Modified behavior of X
- Updated dependency Y

### Deprecated

- Feature Z will be removed in next major version

### Removed

- Removed deprecated feature W

### Fixed

- Fixed bug in component A (#123)
- Fixed crash when doing B

### Security

- Updated dependency with CVE fix
```

### Change Categories

| Category   | Use For                           |
| ---------- | --------------------------------- |
| Added      | New features                      |
| Changed    | Changes to existing functionality |
| Deprecated | Features to be removed in future  |
| Removed    | Removed features                  |
| Fixed      | Bug fixes                         |
| Security   | Security fixes and updates        |

## Release Artifacts

GitHub Actions produces these artifacts:

| Artifact                                | Platform            |
| --------------------------------------- | ------------------- |
| `Chess-Sensei-X.Y.Z-windows-x64.zip`    | Windows 10/11 x64   |
| `Chess-Sensei-X.Y.Z-linux-x64.tar.gz`   | Linux x64           |
| `Chess-Sensei-X.Y.Z-macos-x64.tar.gz`   | macOS Intel         |
| `Chess-Sensei-X.Y.Z-macos-arm64.tar.gz` | macOS Apple Silicon |

## Release Notes Template

```markdown
## Chess-Sensei vX.Y.Z

### Installation

1. Download the appropriate file for your operating system
2. Extract the archive
3. Run the Chess-Sensei executable

### Checksums

[sha256sum output for each artifact]

### System Requirements

- **Windows**: Windows 10 or later (x64)
- **macOS**: macOS 10.15 or later (x64/arm64)
- **Linux**: Modern Linux distribution (x64)

### What's New

[Summary of changes from CHANGELOG]

### Known Issues

[List any known issues in this release]

### Upgrade Notes

[Any special instructions for upgrading from previous version]
```

## GitHub Actions Release Workflow

The release workflow (`.github/workflows/release.yml`) triggers on version tags:

```yaml
on:
  push:
    tags:
      - 'v*'
```

### Workflow Steps

1. **Build Job** (parallel on Windows, macOS, Linux)
   - Checkout code
   - Setup Bun
   - Install dependencies
   - Build application
   - Package artifacts

2. **Release Job** (after all builds complete)
   - Download artifacts
   - Generate release notes
   - Create GitHub Release
   - Upload artifacts

3. **Cleanup Job**
   - Delete temporary artifacts

## Rollback Procedure

If a release has critical issues:

1. **Assess severity**
   - Can users work around it?
   - Is data at risk?

2. **Communicate**
   - Update release notes with warning
   - Post in discussions if applicable

3. **Fix**
   - Create hotfix branch
   - Follow hotfix release process

4. **Optional: Retract**
   - Mark release as pre-release
   - Or delete release (extreme cases)

## Release Schedule

Chess-Sensei follows a flexible release schedule:

- **Patch releases**: As needed for bug fixes
- **Minor releases**: When features are ready
- **Major releases**: Planned with advance notice

No fixed cadence - quality over schedule.
