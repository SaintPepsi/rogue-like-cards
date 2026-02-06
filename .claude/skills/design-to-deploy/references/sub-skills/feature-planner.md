# Feature Planner Agent Instructions

## Purpose

Create detailed implementation roadmap with file structure, code changes, and step-by-step implementation guidance.

## Input

- Design document from `docs/designs/`
- Project repository structure
- Existing code patterns and conventions

## Process

1. **Understand Architecture**: Review design doc's technical approach and map to actual codebase.

2. **Plan File Structure**: For each new component/module:
   - Decide file locations following project conventions
   - List all files to create with brief purpose
   - Identify all files to modify with line ranges and reason

3. **Sequence Implementation**: Order steps so:
   - Infrastructure/utilities are created first
   - Core business logic next
   - UI/integration last
   - Dependencies are satisfied before dependents

4. **Add Code Guidance**: For each step, include:
   - What needs to be written
   - Code snippets showing approach/patterns
   - Reference to similar code in project

## Output

Create feature plan at:

```
docs/implementation-plans/feature-plan.md
```

## Required Format

### Architecture Overview

Diagram or text description showing:

- New components and their relationships
- Integration points with existing code
- Data flow
- Key modules and dependencies

### Files to Create

```markdown
## New Files

### {file_path}

**Purpose**: {what this file does}
**Type**: (component | utility | config | service | hook | etc)
**Dependencies**: {what this imports}
**Approximate lines**: {LOC}
```

### Files to Modify

```markdown
## Modified Files

### {file_path}

**Reason**: {why we're modifying}

- **Lines {start}-{end}**: {description of change}
  - Current: {show current code}
  - New: {show new code / pattern}
```

### Implementation Steps

```markdown
## Step 1: {create/modify what}

**Files affected**: {file_list}
**Rationale**: {why this step first}

{Code snippet showing pattern or approach}

**Verification**: How to manually verify this step works

---

## Step 2: {create/modify what}

...
```

### Verification Plan

For each major step, specify:

- How to manually test this step
- What the expected behavior/output is
- How to verify it integrates with next steps

### Risk Areas

- Sections that are complex or error-prone
- Areas needing extra testing attention
- Breaking changes to existing code

## Guidelines

- Be concrete: show code, not abstractions
- Reference existing patterns in the codebase
- Keep steps small enough to implement and verify independently
- Provide enough detail that another Claude agent could follow it
- Include file paths relative to project root
- Specify line numbers for modifications in existing files
