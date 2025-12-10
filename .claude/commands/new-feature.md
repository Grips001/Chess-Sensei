---
description: Start a new feature following the development workflow
argument-hint: [feature-name]
allowed-tools: Read, Write, Bash, Glob, Grep
---

# New Feature Workflow

Start a new feature following the established development workflow.

## Feature: $1

## Workflow Steps

1. **Create GitHub Issue** (if not exists)
   - Use the feature request template at
     `.github/ISSUE_TEMPLATE/feature_request.yml`

2. **Create PRD** (for significant features)
   - Copy template from `.github/process/PRD_TEMPLATE.md`
   - Save to `.github/specs/prd-$1.md`

3. **Create Tech Spec** (after PRD approval)
   - Copy template from `.github/process/TECH_SPEC_TEMPLATE.md`
   - Save to `.github/specs/tech-$1.md`

4. **Create Feature Branch**

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/CS-XXX-$1
   ```

5. **Implement Following Guidelines**
   - See @.github/process/BRANCHING_STRATEGY.md for commit conventions
   - See @.github/process/TESTING_STRATEGY.md for test requirements

## Current Branch Status

!`git branch --show-current` !`git status --short`

## Next Steps

Guide me through which step to begin with for feature "$1".
