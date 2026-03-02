# GuardPR -- Product Requirements Document

## Problem Statement

Manual security review does not scale. As development teams grow and release velocity increases, the gap between code committed and code reviewed for security widens. Common vulnerabilities -- hardcoded secrets, vulnerable dependencies, XSS patterns, and missing authorization checks -- persist in codebases because:

1. Security experts are bottlenecks. Most organizations have far fewer security engineers than developers.
2. PRs are reviewed for functionality, not security. Code reviewers focus on logic correctness and rarely have the context to spot subtle security issues.
3. Dependency vulnerabilities accumulate silently. Teams run `npm audit` occasionally but rarely act on the output.
4. Remediation is disconnected from detection. Even when a scanner finds issues, creating the fix and getting it reviewed is a separate manual process.

## Solution

**GuardPR** is a GitHub Action that automatically detects security vulnerabilities in code and creates draft pull requests with fixes.

It runs as part of the CI/CD pipeline, scanning every push or pull request for four categories of vulnerabilities. When a high-confidence finding is detected, GuardPR generates a targeted fix, validates it with tests, and opens a draft PR for human review.

The key differentiator is the **closed loop**: detection, fix generation, validation, and PR creation happen in a single automated step. Developers receive a ready-to-review fix rather than a list of findings to investigate.

## Target Users

- **Primary**: Development teams using GitHub repositories with GitHub Actions enabled.
- **Secondary**: Security teams responsible for application security across multiple repositories.
- **Deployment**: Self-service. Any repository owner can add GuardPR by adding a workflow file.

## Detection Categories

### 1. Secrets (Gitleaks)

Detects hardcoded credentials, API keys, and private keys in source code.

- AWS access keys (AKIA pattern)
- GitHub personal access tokens (ghp_, gho_, ghs_, ghr_ prefixes)
- RSA/SSH private keys (BEGIN RSA/OPENSSH PRIVATE KEY)
- Generic API keys and tokens (high-entropy strings near key-like variable names)
- Database connection strings with embedded passwords

**Severity**: P0 (critical). Hardcoded secrets are immediately exploitable.

**Remediation**: Notification-only PR (no secret values in diffs). See ADR-008.

### 2. Dependencies (OSV-Scanner)

Detects known vulnerabilities in project dependencies using the OSV database.

- Scans lockfiles: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Gemfile.lock`, `poetry.lock`, `go.sum`, `Cargo.lock`, `composer.lock`, `requirements.txt`.
- Maps to CVE/GHSA identifiers.
- Provides fix version when available.

**Severity**: P1 (high). Exploitability depends on the specific vulnerability.

**Remediation**: Auto-fix PR that bumps the vulnerable dependency to the fix version.

### 3. XSS (Built-in Scanner)

Detects cross-site scripting patterns in TypeScript/JavaScript/JSX/TSX files.

- `dangerouslySetInnerHTML` with non-literal expressions
- Direct `.innerHTML` / `.outerHTML` assignment
- `eval()`, `new Function()`, `setTimeout`/`setInterval` with string arguments
- `javascript:` protocol in `href`/`src` attributes, dynamic URLs from user input

**Severity**: P1 (high). XSS can lead to session hijacking, data theft, and defacement.

**Remediation**: Auto-fix PR that adds sanitization (e.g., DOMPurify) or replaces with safe alternatives.

### 4. Authorization (Built-in Scanner)

Detects API routes that lack authentication/authorization middleware.

- Express routes on protected paths (e.g., `/api/admin/*`) without auth middleware
- Next.js API routes without auth checks
- Configurable protected route patterns and auth middleware names

**Severity**: P2 (medium). Impact depends on what the unprotected route exposes.

**Remediation**: Auto-fix PR that adds the required middleware to the route definition.

## Precision Target

**Overall precision >= 90%** (measured as TP / (TP + FP) per finding unit).

Per-category minimum: 85%.

Precision is the primary quality metric because false positives erode developer trust. A single false positive fix PR creates more work than it saves and discourages adoption.

## Non-Goals

- **Replacing manual security review**: GuardPR augments human review, it does not replace it. All fixes are delivered as draft PRs requiring human approval.
- **Supporting all languages**: The beta focuses on JavaScript/TypeScript ecosystems. Dependency scanning supports multiple ecosystems via lockfile detection, but XSS and authz scanners are JavaScript/TypeScript-specific.
- **Full SAST/DAST coverage**: GuardPR is not a comprehensive application security testing platform. It targets four high-signal, high-frequency vulnerability categories.
- **Runtime detection**: GuardPR is a static analysis tool. It does not detect runtime vulnerabilities, perform dynamic testing, or monitor production systems.
- **Secret rotation**: GuardPR detects hardcoded secrets but does not rotate them. It provides remediation guidance in the notification PR.

## Inputs and Outputs

### Inputs (action.yml)

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `config-path` | No | `.guardpr.yml` | Path to configuration file |
| `confidence-threshold` | No | `0.9` | Minimum confidence to generate fix PR |
| `create-pr` | No | `true` | Whether to create draft PRs |
| `run-tests` | No | `true` | Whether to run tests after patching |
| `test-command` | No | `npm test` | Test command to validate patches |
| `scanners` | No | `all` | Comma-separated list of scanners |
| `github-token` | Yes | -- | GitHub token for API access |

### Outputs

| Output | Description |
|--------|-------------|
| `findings-count` | Total number of findings |
| `high-confidence-count` | Findings above confidence threshold |
| `low-confidence-count` | Findings below confidence threshold |
| `pr-url` | URL of created draft PR (if any) |
| `pr-number` | Number of created draft PR (if any) |
| `audit-artifact-name` | Name of uploaded audit log artifact |

## Success Criteria

1. Precision >= 90% overall, >= 85% per category (measured by precision test suite).
2. Fix PRs merged by developers (PR acceptance rate tracked via `guardpr` label).
3. Zero secret values exposed in PR diffs or logs.
4. Action completes within 5 minutes for typical repositories.
