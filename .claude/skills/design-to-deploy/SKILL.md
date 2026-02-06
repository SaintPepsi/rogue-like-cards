---
name: design-to-deploy
description: 'Recursive multi-agent pipeline that automates idea to design to implementation to verified tests. Each stage spawns a fresh-context agent with specific inputs/outputs, passing artifacts via filesystem. Manages git worktrees, conventional commits, test verification with retry logic, and failure escalation. TRIGGERS: design-to-deploy, brainstorm and build, implement this idea end-to-end, full pipeline, idea to implementation, design and implement.'
---

# Design-to-Deploy Pipeline

Automate the journey from rough idea to verified, tested implementation using context-isolated agent stages.

## Core Principle: Context Isolation

Each pipeline stage runs in a **fresh agent context** (via the Task tool) with only the specific input files it needs. Artifacts pass via filesystem, not accumulated context. This prevents context pollution across stages.

## Pipeline

```
BRAINSTORM -> VALIDATE SCOPE -> [PLAN UNIT | PLAN E2E | PLAN FEATURE] -> CROSS-CHECK
    -> IMPL TESTS (failing) -> IMPL FEATURE -> VERIFY TESTS -> VERIFY DESIGN -> REVIEW
```

## How to Run

### 1. Set Up Worktree

Create an isolated branch for the pipeline. All work happens here — main stays clean.

```bash
TOPIC="my-feature"  # kebab-case, derived from the idea
SESSION_ID=$(date +%Y-%m-%d-%H-%M)-${TOPIC}

git worktree add .worktrees/${SESSION_ID} -b feature/${TOPIC}
cd .worktrees/${SESSION_ID}
mkdir -p session-history/${SESSION_ID}/08-test-results/screenshots
```

### 2. Run Each Stage

For each stage, read the sub-skill doc, then spawn a **fresh Task agent** with the relevant context. Commit after each stage completes.

**Stage 1 — Brainstorm:** Read `references/sub-skills/brainstormer.md`. Spawn Task agent with user's idea + project context. Agent explores the codebase and produces a design doc.

- Output: `session-history/${SESSION_ID}/01-design-doc.md` + `docs/designs/YYYY-MM-DD-${TOPIC}-design.md`
- Commit: `design(${TOPIC}): brainstorm complete`

**Stage 2 — Validate Scope:** Read `references/sub-skills/scope-validator.md`. Spawn Task agent with the design doc. Agent checks scope against heuristics, may split into multiple design docs.

- Output: `session-history/${SESSION_ID}/02-scope-validation.md`
- Commit: `design(${TOPIC}): scope validated`

**Stages 3-5 — Plan (parallel):** Launch **3 Task agents in a single message** — all read the design doc, each produces a different plan:

- `references/sub-skills/unit-test-planner.md` → `session-history/${SESSION_ID}/03-unit-test-plan.md`
- `references/sub-skills/e2e-test-planner.md` → `session-history/${SESSION_ID}/04-e2e-test-plan.md`
- `references/sub-skills/feature-planner.md` → `session-history/${SESSION_ID}/05-feature-plan.md`
- Commit: `plan(${TOPIC}): all plans generated`

**Stage 6 — Cross-Check:** Read `references/sub-skills/plan-reviewer.md`. Spawn Task agent with all 3 plans + design doc. Agent finds gaps, inconsistencies, patches the plans.

- Output: `session-history/${SESSION_ID}/06-cross-check-report.md`
- Commit: `plan(${TOPIC}): cross-check complete`

**Stage 7a — Implement Unit Tests:** Read `references/sub-skills/test-implementer.md`. Spawn Task agent with unit test plan. Agent writes tests that **must fail** (feature doesn't exist yet). Run the test command to confirm failure.

- Commit: `test(${TOPIC}): unit tests implemented (failing)`

**Stage 7b — Implement E2E Tests:** Same sub-skill, spawn Task agent with e2e test plan. Tests **must fail**.

- Commit: `test(${TOPIC}): e2e tests implemented (failing)`

**Stage 7c — Implement Feature:** Read `references/sub-skills/feature-implementer.md`. Spawn Task agent with feature plan + design doc + test files (so it knows what to satisfy).

- Commit: `feat(${TOPIC}): feature implemented`

**Stage 7d — Verify Unit Tests:** Read `references/sub-skills/test-verifier.md`. Run unit tests. If they fail, apply retry logic (see below).

- Commit: `test(${TOPIC}): unit tests passing`

**Stage 7e — Verify E2E Tests:** Same sub-skill for e2e. Run e2e tests. Apply retry logic if needed.

- Commit: `test(${TOPIC}): e2e tests passing`

**Stage 7f — Verify Design Compliance:** Read `references/sub-skills/design-compliance-checker.md`. Spawn Task agent with design doc + all implementations. Agent checks every acceptance criterion.

- Output: `session-history/${SESSION_ID}/09-design-compliance.md`
- Commit: `verify(${TOPIC}): design compliance confirmed`

**Stage 8 — Final Review:** Read `references/sub-skills/review-compiler.md`. Spawn Task agent with all artifacts. Agent produces human handoff notes.

- Output: `session-history/${SESSION_ID}/10-review-notes.md`

### 3. Finalise

**On success** — merge and clean up:

```bash
cd ../../  # back to project root
git merge feature/${TOPIC}
git worktree remove .worktrees/${SESSION_ID}
```

**On failure** — preserve for human review:

```
Pipeline failed at stage: {STAGE}
Worktree preserved at: .worktrees/${SESSION_ID}
To resume: cd .worktrees/${SESSION_ID}
To abandon: git worktree remove .worktrees/${SESSION_ID} --force
```

## Test Verification Retry Logic

When tests fail during verification:

1. **Attempt 1-2**: Fix within the test-verifier agent context
2. **Attempt 3**: Spawn a new Task agent using `references/sub-skills/systematic-debugger.md` — 4-phase methodology: root cause investigation, pattern analysis, hypothesis testing, implementation
3. **Attempt 4+**: **STOP PIPELINE** — write a failure report to session history, preserve worktree, tell the user what failed and why

**Red flags that trigger immediate STOP**: "quick fix for now", multiple changes at once, 3+ failed attempts without clear progress.

## Scope Validation Heuristics

Flag for splitting when any of these are true:

- Estimated files to create > 10
- Estimated files to modify > 15
- Estimated implementation time > 4 hours
- Distinct feature areas > 3
- External API integrations > 2
- New database tables > 3

Design docs must include:

```markdown
## Scope Declaration

- Type: [atomic-feature | multi-feature | epic]
- Estimated Complexity: [small | medium | large]
- Dependencies: [list]
- Can Be Split: [yes | no]
```

## Session History

```
session-history/${SESSION_ID}/
  01-design-doc.md
  02-scope-validation.md
  03-unit-test-plan.md
  04-e2e-test-plan.md
  05-feature-plan.md
  06-cross-check-report.md
  07-implementation-log.md
  08-test-results/
    unit-test-output.txt
    e2e-test-output.txt
    screenshots/
  09-design-compliance.md
  10-review-notes.md
```

## Sub-Skill Reference

| Sub-Skill                   | Input                       | Output               |
| --------------------------- | --------------------------- | -------------------- |
| `brainstormer`              | User idea + project context | design-doc.md        |
| `scope-validator`           | design-doc.md               | validated/split docs |
| `unit-test-planner`         | design-doc.md               | unit-test-plan.md    |
| `e2e-test-planner`          | design-doc.md               | e2e-test-plan.md     |
| `feature-planner`           | design-doc.md               | feature-plan.md      |
| `plan-reviewer`             | All 3 plans + design doc    | patched plans        |
| `test-implementer`          | test-plan.md                | test files (failing) |
| `feature-implementer`       | feature-plan.md             | feature code         |
| `test-verifier`             | test files + code           | pass/fail + fixes    |
| `systematic-debugger`       | failing tests + errors      | debugging-report.md  |
| `design-compliance-checker` | design doc + all code       | compliance-report.md |
| `review-compiler`           | all artifacts               | review-notes.md      |

All sub-skill docs live in `references/sub-skills/`.
