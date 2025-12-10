---
description: Start bug fix following the development workflow
argument-hint: [bug-description]
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Bug Fix Workflow

Start a bug fix following the established development workflow.

## Bug: $1

## Workflow Steps

1. **Reproduce the Bug**
   - Understand the exact steps to reproduce
   - Note the expected vs actual behavior

2. **Check Existing Issues**
   - Search `.github/ISSUE_TEMPLATE/bug_report.yml` for template
   - Check `documents/troubleshooting.md` for known issues

3. **Create Fix Branch**

   ```bash
   git checkout main
   git pull origin main
   git checkout -b fix/CS-XXX-$1
   ```

4. **Write Regression Test**
   - Add test that fails before fix, passes after
   - Place in appropriate `tests/` directory

5. **Implement Fix**
   - Follow existing code patterns
   - Minimal changes only

6. **Verify**

   ```bash
   bun run verify
   ```

7. **Update Documentation**
   - Add to `documents/troubleshooting.md` if user-facing

## Current Status

!`git branch --show-current` !`git status --short`

## Troubleshooting Reference

@documents/troubleshooting.md

Guide me through fixing "$1".
