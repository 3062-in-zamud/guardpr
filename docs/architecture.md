# GuardPR -- Architecture Overview

## System Context

```
+-------------------+     +------------------+     +-------------------+
|                   |     |                  |     |                   |
|  GitHub           |---->|  GuardPR Action  |---->|  GitHub API       |
|  (push/PR event)  |     |  (Node.js 20)    |     |  (create PR,      |
|                   |     |                  |     |   push branch)    |
+-------------------+     +--------+---------+     +-------------------+
                                   |
                           +-------+-------+
                           |               |
                    +------v----+   +------v------+
                    |  Gitleaks |   | OSV-Scanner |
                    |  (Go bin) |   |  (Go bin)   |
                    +-----------+   +------+------+
                                          |
                                   +------v------+
                                   |  OSV.dev    |
                                   |  API        |
                                   |  (pkg names |
                                   |   only)     |
                                   +-------------+
```

- **GitHub**: Triggers the workflow via push or pull_request events.
- **GuardPR Action**: Single Node.js process that orchestrates the entire pipeline.
- **Gitleaks**: External Go binary for secret detection. Runs locally, no network calls.
- **OSV-Scanner**: External Go binary for dependency scanning. Queries OSV.dev API with package names and versions only.
- **GitHub API**: Used to create branches, push commits, and open draft PRs. Accessed via `@actions/github` with the provided `github-token`.

## Pipeline Data Flow

The pipeline executes 14 sequential steps within a single Node.js process:

```
 1. Parse action inputs
 2. Load .guardpr.yml config (merge with defaults)
 3. Validate config (Zod schema)
 4. Install scanner binaries (Gitleaks, OSV-Scanner)
    - Download from GitHub releases
    - Verify SHA-256 checksums
    - Cache via @actions/tool-cache
 5. Run secret scanner (Gitleaks)
    - Invoke CLI, parse JSON output
    - Register secret values with core.setSecret()
 6. Run dependency scanner (OSV-Scanner)
    - Detect lockfiles
    - Invoke CLI per lockfile, parse JSON output
 7. Run XSS scanner (built-in)
    - Scan .ts/.tsx/.js/.jsx files
    - Apply 4 regex rules
    - Run context analysis for confidence scoring
 8. Run authz scanner (built-in)
    - Detect framework (Express/Next.js)
    - Find route definitions
    - Check middleware chains against protected route patterns
 9. Aggregate all findings
    - Merge findings from all scanners
    - Split into high-confidence (>= threshold) and low-confidence
10. Generate patches for high-confidence findings
    - Secrets: notification-only (no code diff)
    - Dependencies: version bump in lockfile/manifest
    - XSS: add sanitizer or replace with safe alternative
    - Authz: add middleware to route
11. Run tests on patches (if enabled)
    - Apply patches to working copy
    - Run test command
    - Record pass/fail status
12. Create draft PR (if enabled and patches exist)
    - Create branch: guardpr/fix-<sha>
    - Commit patched files
    - Open draft PR with description, labels
13. Build audit log
    - Record all findings, patches, PR info, tool versions
    - Compute integrity checksum
    - Redact secret values
14. Upload audit log as artifact
```

## Component Diagram

```
src/
+-- index.ts                    # Entry point: orchestrates the pipeline
+-- types/                      # TypeScript type definitions
|   +-- finding.ts              # Finding, ConfidenceFactor, Severity
|   +-- patch.ts                # Patch, FileChange, PatchType
|   +-- scanner.ts              # ScannerPlugin, ScanResult
|   +-- config.ts               # GuardPRConfig, scanner configs
|   +-- audit-log.ts            # AuditLogEntry
|   +-- errors.ts               # GuardPRError, ErrorCode
+-- config/
|   +-- schema.ts               # Zod schema for .guardpr.yml
|   +-- loader.ts               # Load and merge config from file + inputs
|   +-- defaults.ts             # Default configuration values
+-- scanners/
|   +-- registry.ts             # Scanner plugin registry
|   +-- runner.ts               # Run scanners, handle errors/timeouts
|   +-- tool-installer.ts       # Download, verify, cache CLI binaries
|   +-- gitleaks/
|   |   +-- scanner.ts          # Gitleaks ScannerPlugin implementation
|   |   +-- parser.ts           # Parse Gitleaks JSON output to Finding[]
|   +-- osv-scanner/
|   |   +-- scanner.ts          # OSV-Scanner ScannerPlugin implementation
|   |   +-- parser.ts           # Parse OSV JSON output to Finding[]
|   +-- xss/
|   |   +-- context-analyzer.ts # Contextual confidence analysis
|   |   +-- rules/
|   |       +-- dangerous-inner-html.ts
|   |       +-- inner-html-assignment.ts
|   |       +-- eval-usage.ts
|   |       +-- url-xss.ts
+-- masking/
|   +-- patterns.ts             # Secret pattern definitions
|   +-- redactor.ts             # Redact secrets from strings/objects
|   +-- masking-layer.ts        # Integration with @actions/core.setSecret
+-- utils/
    +-- exec.ts                 # Subprocess execution helpers
    +-- git.ts                  # Git operations (branch, commit, push)
    +-- github.ts               # GitHub API helpers (create PR, labels)
    +-- logger.ts               # Structured logging
    +-- masking.ts              # Utility masking functions
```

## Security Layers

### 1. No External Data Transmission

All processing occurs on the Actions runner. Only OSV-Scanner queries the OSV.dev API with package names (see ADR-006).

### 2. Secret Handling (5-Layer Defense)

1. **Detection**: Gitleaks identifies secrets via pattern matching.
2. **Runtime masking**: `core.setSecret()` redacts values from all Actions logs.
3. **Patch suppression**: Secrets produce notification-only PRs with no code diffs (see ADR-008).
4. **Audit log redaction**: The `redactor.ts` module scrubs secret values before artifact upload.
5. **PR description redaction**: PR bodies reference file and line, never secret content.

### 3. Binary Integrity

Scanner binaries (Gitleaks, OSV-Scanner) are verified via SHA-256 checksum before execution. A `CHECKSUM_MISMATCH` error aborts the run if verification fails.

### 4. Permission Model

The action requires only:
- `contents: write` -- to create branches and push commits.
- `pull-requests: write` -- to create draft PRs.
- `actions: read` -- to upload artifacts.

No admin, org, or repository settings permissions are requested.

### 5. Fork PR Limitations

Pull requests from forks do not have access to repository secrets. GuardPR gracefully degrades: it reports findings in the audit log but cannot create PRs without a valid `github-token`.

## Error Handling Strategy

GuardPR uses a typed error system (`GuardPRError`) with error codes and recoverability flags:

| Error Code | Recoverable | Behavior |
|------------|-------------|----------|
| `SCANNER_NOT_AVAILABLE` | Yes | Skip scanner, continue with others |
| `SCANNER_INSTALL_FAILED` | Yes | Skip scanner, log warning |
| `SCANNER_TIMEOUT` | Yes | Kill process, skip scanner |
| `SCANNER_CRASH` | Yes | Log error, skip scanner |
| `CONFIG_INVALID` | No | Fail with descriptive error |
| `CONFIG_NOT_FOUND` | Yes | Use default config |
| `GITHUB_API_ERROR` | Yes | Log error, skip PR creation |
| `PERMISSION_ERROR` | No | Fail with permission guidance |
| `RESOURCE_EXHAUSTED` | No | Fail with resource limits info |
| `CHECKSUM_MISMATCH` | No | Fail, do not run unverified binary |
| `PATCH_APPLY_FAILED` | Yes | Skip patch, continue with others |
| `TEST_TIMEOUT` | Yes | Mark test as failed, include in PR |

The pipeline continues through recoverable errors, aggregating all results in the audit log. Non-recoverable errors abort the run with a clear error message.
