---
description: Prepare and execute a release following the release process
argument-hint: [version]
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Release Process

Prepare release version $1 following the established release process.

## Release Version: $1

## Pre-Release Checklist

Run verification: !`bun run verify 2>&1 | tail -20`

Check current version: !`grep '"version"' package.json`

## Release Steps

1. **Update Version Numbers**
   - `package.json`: `"version": "$1"`
   - `neutralino.config.json`: `"version": "$1"`

2. **Update CHANGELOG.md**
   - Add section for [$1] with today's date
   - Document all changes since last release

3. **Commit Version Bump**

   ```bash
   git add package.json neutralino.config.json CHANGELOG.md
   git commit -m "release: v$1"
   ```

4. **Create and Push Tag**

   ```bash
   git tag -a v$1 -m "Release v$1"
   git push origin main
   git push origin v$1
   ```

5. **Verify GitHub Actions**
   - Check that release workflow triggers
   - Monitor build status

## Release Process Reference

@.github/process/RELEASE_PROCESS.md

## Current Git Status

!`git status --short` !`git log --oneline -5`

Guide me through releasing version $1.
