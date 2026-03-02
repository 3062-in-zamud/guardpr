# ADR-001: JavaScript Action over Composite Action

## Status

Accepted

## Context

GuardPR needs to orchestrate multiple security scanners, aggregate findings, generate patches, create PRs, and produce audit logs -- all within a single GitHub Actions step. The two main options for custom GitHub Actions are:

1. **Composite Action** -- a YAML-based action that chains multiple run/uses steps.
2. **JavaScript Action** -- a single Node.js entry point bundled with `@vercel/ncc`.

Composite actions are simpler for linear workflows but introduce challenges when orchestration logic involves conditional branching, error recovery, shared in-memory state, and complex data transformations across steps.

## Decision

We chose to implement GuardPR as a **JavaScript Action** (`runs.using: node20`) bundled with `@vercel/ncc`.

Key reasons:

- **Complex orchestration logic**: The pipeline involves 14+ sequential steps with conditional branching (e.g., skip patching if no high-confidence findings, skip PR if `create-pr` is false). This is natural in TypeScript but awkward in YAML step conditionals.
- **Single Node.js process**: All scanners, scoring, patching, and PR creation share a single process. In-memory data structures (findings array, audit log) flow between stages without serialization to files or environment variables.
- **Better error handling**: Try/catch with typed errors (`GuardPRError`) and recovery logic (e.g., partial scanner failure does not abort the run) is straightforward in TypeScript. Composite actions lack structured error handling.
- **`@vercel/ncc` bundling**: The entire action compiles to a single `dist/index.js` with no `node_modules` needed at runtime. This means fast cold starts and no dependency installation during the action run.
- **Type safety**: The Actions toolkit (`@actions/core`, `@actions/github`, etc.) is TypeScript-native. Type-checked inputs/outputs and config schema validation via Zod reduce runtime errors.

## Consequences

**Positive:**

- Full control over execution flow, error handling, and logging.
- Faster startup compared to composite actions that run multiple steps.
- Single artifact (`dist/index.js`) simplifies distribution.
- TypeScript ecosystem enables static analysis, IDE support, and refactoring tools.

**Negative:**

- Requires a build step (`ncc build`) before the action can be used. The `dist/` directory must be committed or built in CI.
- Contributors need familiarity with TypeScript and the Actions toolkit, rather than just YAML.
- Debugging requires source maps rather than inspecting individual YAML steps.
