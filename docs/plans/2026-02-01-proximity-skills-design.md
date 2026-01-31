# Proximity Skills Design

> **For Claude:** This is a design document for three related skills. Use superpowers:writing-skills to implement each skill.

**Goal:** Create three reusable personal skills for aggressive code proximity — a principles reference, a codebase auditor, and an audit resolver.

**Architecture:** Three standalone skills in `~/.claude/skills/`. The principles skill is a reference; the audit and resolve skills are an agent pair (like writing-plans/executing-plans) connected by a findings file.

---

## Skill 1: proximity-principles

**Location:** `~/.claude/skills/proximity-principles/SKILL.md`

**Frontmatter:**
```yaml
name: proximity-principles
description: Use when writing or reviewing code to keep related logic, decisions, and context close together
```

**Content — 10 principles, each with:**
- One sentence definition
- Brief bad → good pseudocode pair (3-5 lines each)

### The Principles

1. **Decision Archaeology** — Document why at the implementation point, not in separate docs. Include: why, alternatives considered, measurements.

Bad:
```
cache.setTTL(3600)  // no context
```
Good:
```
// DECISION: 1-hour cache TTL for user data
// Why: Balance between freshness and API load
// Alternative: 5-min TTL rejected — 10x API cost increase
// Measured: Reduces API calls by 85%
USER_CACHE_TTL = 3600
```

2. **Three-Strikes Abstraction** — Copy-paste is fine for the first two occurrences. Abstract on the third. Premature abstraction is worse than duplication.

Bad:
```
// First occurrence → immediately create shared utility
```
Good:
```
// Occurrence 1: inline
// Occurrence 2: copy (yes, really)
// Occurrence 3: NOW extract shared function
```

3. **Test Colocation** — Test files live next to source files, not in a separate test tree.

Bad:
```
src/services/payment.js
test/services/payment.test.js  // 5 directories away
```
Good:
```
services/payment.js
services/payment.test.js       // right here
```

4. **Error Context at Source** — Handle errors where they're understood. Generic catch-all messages are an anti-pattern.

Bad:
```
if err: log("error occurred")  // generic, unhelpful
```
Good:
```
if err:
    // ERROR_CONTEXT: DB query failure in user lookup
    // Common cause: Connection pool exhausted during peak
    raise Error("user lookup failed (query={sql}): {err}")
```

5. **Configuration Near Usage** — Constants live next to the code that uses them, with a comment explaining the choice.

Bad:
```
// config.yml — all unrelated config bundled together
database.pool_size: 50
api.rate_limit: 100
cache.ttl: 3600
```
Good:
```
// In database module:
// DECISION: Pool size 50 — handles 99th percentile load (measured: 47 concurrent)
DB_POOL_SIZE = 50
```

6. **Behavior Over Structure** — Group files by feature/domain, not by technical layer.

Bad:
```
src/controllers/
src/models/
src/validators/
```
Good:
```
src/user-authentication/
src/payment-processing/
```

7. **Temporal Proximity** — Code that changes together should live together. If two files always appear in the same commits, they belong closer.

8. **Security Annotations** — Document security mitigations at the enforcement point, not in a wiki.

```
// SECURITY: DOMPurify with strict whitelist to prevent XSS
// Threat: User-supplied HTML in comments
// Tested: OWASP XSS test vectors
sanitized = purify(input, allowedTags: ['b', 'i', 'em'])
```

9. **Performance Annotations** — Document performance tradeoffs at the implementation point with benchmarks.

```
// PERFORMANCE: Using vectorized operation for 100x speedup
// Benchmark: Loop = 2.3s, vectorized = 0.023s for 1M elements
// Tradeoff: 50MB additional memory
```

10. **Deprecation at Source** — Deprecation notices, migration paths, and removal timelines on the deprecated code itself.

```
// DEPRECATED since 2.0.0 — use processAsync() instead
// Migration: Replace process() with processAsync().await()
// Removal: Version 3.0.0 (2025-06-01)
```

---

## Skill 2: proximity-audit

**Location:** `~/.claude/skills/proximity-audit/SKILL.md`

**Frontmatter:**
```yaml
name: proximity-audit
description: Use when auditing a codebase for proximity violations — scattered decisions, separated tests, orphaned config, missing context
```

**Workflow:**

### Step 1: Scope
- Ask the user: audit whole codebase, specific directory, or specific principles?
- Default: whole codebase, all 10 principles

### Step 2: Systematic Scan

Detection strategy per principle:

| Principle | What to look for |
|-----------|-----------------|
| Decision Archaeology | Magic numbers, unexplained constants, config values without rationale |
| Three-Strikes | 3+ near-identical code blocks that haven't been abstracted |
| Test Colocation | Test files in separate `test/` or `__tests__/` trees away from source |
| Error Context | Generic error messages ("error occurred", "something went wrong") |
| Config Near Usage | Centralized config files with unrelated values bundled together |
| Behavior Over Structure | Top-level directories named by layer (`controllers/`, `models/`, `utils/`) |
| Temporal Proximity | Files that change together in git history but live far apart |
| Security Annotations | Security-sensitive code (sanitization, auth checks) without documented rationale |
| Performance Annotations | Optimizations (caching, batching, data structure choices) without benchmarks/reasoning |
| Deprecation | Deprecated code without migration paths or removal timelines |

### Step 3: Produce Findings File

Output to `docs/audits/YYYY-MM-DD-proximity-audit.md`:

```markdown
# Proximity Audit — YYYY-MM-DD

**Scope:** [what was audited]
**Findings:** [count] across [N] principles

## Decision Archaeology (N findings)

### Finding 1
- **File:** `src/cache.ts:42`
- **Violation:** Magic TTL value `3600` with no rationale
- **Suggested fix:** Add decision comment explaining why 1 hour, alternatives considered

## Test Colocation (N findings)

### Finding 1
- **File:** `test/services/payment.test.js`
- **Violation:** Test separated from source `src/services/payment.js`
- **Suggested fix:** Move test to `src/services/payment.test.js`

[...etc for each principle with findings...]
```

### Step 4: Summary
- Print finding counts by principle
- Offer: "Ready to resolve these? Use proximity-resolve with this audit file."

**Cross-references:**
- **REQUIRED BACKGROUND:** You MUST understand proximity-principles before using this skill.

---

## Skill 3: proximity-resolve

**Location:** `~/.claude/skills/proximity-resolve/SKILL.md`

**Frontmatter:**
```yaml
name: proximity-resolve
description: Use when you have a proximity audit file to resolve — works through findings in batches with review checkpoints
```

**Workflow:**

### Step 1: Load and Review Audit
1. Read the audit file
2. Create tasks — one per finding
3. Group into batches by principle (related fixes reviewed together)
4. Present summary: "Found N findings across M principles. Starting with [principle] (K findings)."

### Step 2: Execute Batch

Default: one principle's findings per batch.

For each finding:
1. Mark task in-progress
2. Read the file at the specified location
3. Apply fix appropriate to violation type:
   - **Decision Archaeology** → Add decision comment with why/alternatives/measurements
   - **Three-Strikes** → Extract shared abstraction, update all call sites
   - **Test Colocation** → Move test file next to source, update imports
   - **Error Context** → Enrich error message with specific context at source
   - **Config Near Usage** → Move constant to usage site with rationale comment
   - **Behavior Over Structure** → Propose restructuring only (flag for human review)
   - **Temporal Proximity** → Propose restructuring only (flag for human review)
   - **Security Annotations** → Add annotation with rationale
   - **Performance Annotations** → Add annotation with rationale
   - **Deprecation** → Add deprecation notice with migration path and timeline
4. Mark task completed

**Restructuring safety:** Behavior Over Structure and Temporal Proximity findings produce proposals only — never auto-apply file moves. Flag these for human decision.

### Step 3: Report
- Show what was changed
- Show any findings flagged for human judgment
- Say: "Ready for feedback."

### Step 4: Continue
- Apply feedback
- Next batch (next principle)
- Repeat until complete

**Cross-references:**
- **REQUIRED BACKGROUND:** You MUST understand proximity-principles before using this skill.
- Consumes findings file format defined by proximity-audit.
