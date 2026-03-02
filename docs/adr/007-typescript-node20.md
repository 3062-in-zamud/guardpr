# ADR-007: TypeScript + Node 20

## Status

Accepted

## Context

GuardPR is a GitHub Action that runs as a Node.js process. We needed to choose:

1. The programming language (JavaScript vs TypeScript).
2. The Node.js runtime version.

## Decision

We chose **TypeScript** as the implementation language and **Node.js 20** as the runtime target.

### TypeScript

- **Actions toolkit is TypeScript-native**: The official `@actions/core`, `@actions/github`, `@actions/exec`, and `@actions/tool-cache` packages are written in TypeScript and ship with type declarations. Using TypeScript provides full IntelliSense and compile-time checks against these APIs.
- **Type safety for complex data structures**: GuardPR defines multiple interconnected types (`Finding`, `Patch`, `ScanResult`, `AuditLogEntry`, `GuardPRConfig`). TypeScript ensures these structures are used correctly throughout the codebase, catching mismatches at compile time rather than runtime.
- **Config validation with Zod**: The `.guardpr.yml` schema is defined using Zod, which provides runtime validation and TypeScript type inference from the same schema definition.
- **ES2022 features**: TypeScript targets ES2022 (top-level await, private fields, `Array.at()`, `Object.hasOwn()`), which Node 20 supports natively.

### Node.js 20

- **GitHub Actions LTS**: Node 20 is the current LTS version supported by `runs.using: node20` in `action.yml`. GitHub recommends this version for new actions.
- **Performance**: Node 20 includes V8 11.3 with improved startup time and garbage collection, relevant for cold-start performance in Actions.
- **Security**: LTS versions receive security patches through their support window.

## Consequences

**Positive:**

- Compile-time type checking catches bugs before they reach CI.
- The TypeScript compiler acts as a documentation tool -- types are self-documenting.
- Zod schema validation bridges the gap between YAML config (runtime) and TypeScript types (compile time).
- Node 20 LTS support ensures compatibility with GitHub-hosted runners.

**Negative:**

- Requires a build step (`tsc` for type checking, `ncc` for bundling).
- Contributors must be familiar with TypeScript syntax and tooling.
- When Node 22 or later becomes the Actions standard, migration will be needed.
