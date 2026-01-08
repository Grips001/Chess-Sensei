# Feature Specifications

This directory contains PRDs (Product Requirements Documents) and Tech Specs for Chess-Sensei features.

## File Naming Convention

All spec files use **chronological numbering** to maintain a historical record of feature development:

| Document Type | Pattern                      | Example                                   |
| ------------- | ---------------------------- | ----------------------------------------- |
| PRD           | `NNN-prd-[feature-name].md`  | `005-prd-performance-optimization.md`     |
| Tech Spec     | `NNN-tech-[feature-name].md` | `005-tech-performance-optimization.md`    |

**Numbering Rules:**

- Numbers are assigned chronologically based on PRD creation date
- Use the next available number after the highest existing PRD
- Tech specs must match their corresponding PRD number
- Never reuse or skip numbers

## Current Specifications

### Implemented Features (001-004)

- **001**: Move Notation with English Descriptions *(v1.0.1, Dec 22, 2025)* - PRD + Tech Spec
- **002**: Move Reasoning Explanations *(v1.0.2, Dec 22, 2025)* - PRD + Tech Spec
- **003**: Right Panel Layout Redesign *(v1.0.3, Dec 22, 2025)* - PRD + Tech Spec
- **004**: Code Modularization *(v1.1.0, Jan 8, 2026)* - PRD + Tech Spec

### Planned Features (005-010)

- **005**: Performance Optimization Phase 1 *(Weeks 1-2)* - PRD only
- **006**: Architecture Refactoring *(Weeks 3-5)* - PRD only
- **007**: Testing Strategy Enhancement *(Weeks 6-8)* - PRD only
- **008**: Code Quality Improvements *(Weeks 9-10)* - PRD only
- **009**: Observability Enhancement *(Weeks 11-12)* - PRD only
- **010**: Security Hardening *(Weeks 11-12)* - PRD only

## Templates

- PRD Template: [../process/PRD_TEMPLATE.md](../process/PRD_TEMPLATE.md)
- Tech Spec Template: [../process/TECH_SPEC_TEMPLATE.md](../process/TECH_SPEC_TEMPLATE.md)

## Workflow

1. **Create PRD**
   - Copy PRD template
   - Assign next chronological number (e.g., if 010 exists, use 011)
   - Name: `NNN-prd-[feature-name].md`
   - Fill out all sections
   - Submit for review

2. **PRD Review**
   - Status: Draft → In Review → Approved
   - Get stakeholder approval before proceeding

3. **Create Tech Spec** (after PRD approval)
   - Copy Tech Spec template
   - Use same number as approved PRD
   - Name: `NNN-tech-[feature-name].md`
   - Define technical implementation
   - Submit for review

4. **Tech Spec Review**
   - Status: Draft → In Review → Approved
   - Get technical review before implementation

5. **Implementation**
   - Update status to "Implemented" when feature is released
   - Reference the spec in CHANGELOG.md

## Document Lifecycle

```text
Draft → In Review → Approved → Implemented
```

Once implemented, specs are kept as historical documentation and should not be modified (create new specs for changes).
