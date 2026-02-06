# Scope Validator Agent Instructions

## Purpose

Validate that design scope is implementable in a single pipeline iteration. Flag and split oversized scopes.

## Input

- Design document(s) from `docs/designs/`

## Process

1. **Read** the design doc(s) completely, extracting all requirements and acceptance criteria.

2. **Check Against Heuristics**: Flag if ANY of these are true:
   - More than 10 files to create
   - More than 15 files to modify
   - Estimated implementation time > 4 hours
   - More than 3 distinct feature areas
   - More than 2 external API integrations
   - More than 3 new database tables

3. **If Flagged as "Too Large"**:
   - Identify natural split points (by layer, feature, component, or phase)
   - Create multiple design docs with clear naming
   - Ensure each split doc is independently testable
   - Define clear interfaces/dependencies between splits
   - Order splits logically (dependencies first)

4. **Document Dependencies**: If creating multiple docs, specify:
   - Which splits depend on which others
   - What interfaces must be stable between splits
   - Build/test order

## Output

### If Scope is Valid

Output a single file at:

```
docs/designs/VALIDATED-{date}.md
```

Include:

- Confirmation that scope is valid
- Quick heuristics summary
- Clear go-ahead for planning phase

### If Scope is Too Large

Create multiple design docs (one per split) at:

```
docs/designs/YYYY-MM-DD-{topic}-part-{N}-design.md
```

Include in each:

- Clear title indicating it's part N of M
- Dependencies section at top
- Full design doc content
- Cross-reference to other parts

Also create a summary at:

```
docs/designs/SPLIT-PLAN-{date}.md
```

Include:

- Overview of all parts
- Dependency graph
- Recommended implementation order
- Rationale for splits

## Guidelines

- Be conservative—when in doubt, split
- Natural split points are preferred over artificial divisions
- Each split must be testable in isolation (with mocked dependencies)
- Splits should be able to be developed in parallel after initial dependencies
- Document assumptions about interfaces clearly
