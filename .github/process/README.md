# Engineering Process Documentation

This directory contains templates and documentation for Chess-Sensei's
development workflow.

## Contents

| Document                                       | Purpose                            |
| ---------------------------------------------- | ---------------------------------- |
| [PRD_TEMPLATE.md](PRD_TEMPLATE.md)             | Product Requirements Document      |
| [TECH_SPEC_TEMPLATE.md](TECH_SPEC_TEMPLATE.md) | Technical Specification            |
| [ARCHITECTURE.md](ARCHITECTURE.md)             | System architecture and diagrams   |
| [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) | Git workflow and branch naming     |
| [TESTING_STRATEGY.md](TESTING_STRATEGY.md)     | Testing requirements and standards |
| [RELEASE_PROCESS.md](RELEASE_PROCESS.md)       | Versioning and release procedures  |
| [RUNBOOK.md](RUNBOOK.md)                       | Operational runbook                |

## Document Locations

| Document   | Location            | Naming Convention   |
| ---------- | ------------------- | ------------------- |
| PRDs       | `../.github/specs/` | `prd-[feature].md`  |
| Tech Specs | `../.github/specs/` | `tech-[feature].md` |

## Workflow Overview

```text
1. Feature Request/Bug Report
   └── GitHub Issue (via issue template)
        └── Triage and prioritization

2. Planning (for significant features)
   └── PRD written to .github/specs/prd-[feature].md
        └── PRD approved
             └── Tech Spec written to .github/specs/tech-[feature].md
                  └── Tech Spec approved

3. Implementation
   └── Feature branch created (feature/CS-XXX-description)
        └── Development with tests
             └── Pull Request

4. Review
   └── Code review
        └── CI checks pass
             └── Merge to main

5. Release
   └── Version tag created
        └── GitHub Actions builds and publishes
             └── Release notes generated
```

## Quick Links

- [Issue Templates](../ISSUE_TEMPLATE/)
- [Pull Request Template](../PULL_REQUEST_TEMPLATE.md)
- [CI/CD Workflow](../workflows/release.yml)
