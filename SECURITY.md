# Security Policy

## Vulnerability Reporting

If you discover a security vulnerability in GuardPR, please report it responsibly:

1. **Open a GitHub issue** with the `security` label. Do not include exploit details in the issue title.
2. Alternatively, contact the maintainer directly at [3062.in.zamud@gmail.com](mailto:3062.in.zamud@gmail.com).
3. We aim to acknowledge reports within **48 hours** and provide a fix or mitigation within **7 days** for critical issues.

Please do not publicly disclose the vulnerability until a fix has been released.

## Security Design

### No External Data Transmission

GuardPR processes all code and findings within the GitHub Actions runner environment. No source code, secrets, or vulnerability findings are transmitted to external services.

**Single exception**: OSV-Scanner queries the [OSV.dev API](https://osv.dev/) with **package names and versions only**. No source code, file paths, or secret values are sent. This is equivalent to running `npm audit`.

#### What is NOT sent externally

- Source code or file contents
- Secret values (API keys, passwords, tokens)
- Vulnerability finding details
- Audit log contents
- Repository metadata beyond what the GitHub API already knows

#### What IS used

- **GitHub API** (same platform, first-party): Creating branches, commits, and draft PRs using the provided `github-token`.
- **OSV.dev API**: Package name + version queries for known vulnerability lookup.

### 5-Layer Secret Defense

| Layer | Mechanism | Description |
|-------|-----------|-------------|
| 1. Detection | Gitleaks | Scans source files for secret patterns. Runs locally with no network calls. |
| 2. Runtime Masking | `core.setSecret()` | Registers detected secrets with GitHub Actions, which redacts them from all log output. |
| 3. Patch Suppression | Notification-only PRs | Secret findings produce PRs with no code diffs. The PR identifies file and line but never includes the secret. |
| 4. Audit Log Redaction | `redactor.ts` | Scrubs all known secret values from the audit log before artifact upload. |
| 5. PR Description Redaction | Template filtering | PR bodies reference file path, line number, and secret type, but never the actual value. |

### Binary Integrity Verification

Scanner binaries (Gitleaks, OSV-Scanner) are downloaded from official GitHub releases and verified against pinned SHA-256 checksums before execution.

- If verification fails, the action aborts with a `CHECKSUM_MISMATCH` error. The unverified binary is never executed.
- Binary versions are pinned (Gitleaks `8.21.2`, OSV-Scanner `1.9.1`). Upgrading requires changing the version, URL, and SHA-256 hash.
- Verified binaries are cached via `@actions/tool-cache` to skip re-download on subsequent runs.

## Permissions Model

GuardPR requests the minimum GitHub token permissions needed:

| Permission | Scope | Purpose |
|------------|-------|---------|
| `contents: write` | Repository | Create branches and push fix commits |
| `pull-requests: write` | Repository | Open draft PRs, add labels |
| `actions: read` | Repository | Upload audit log artifacts |

**Not requested**: `admin`, `security_events`, `packages`, `deployments`, or any organization-level permissions.

## Data Privacy

- All scanning and patch generation occurs on the GitHub Actions runner. No data leaves the runner except through the GitHub API (for PR creation) and OSV.dev (for package name queries).
- Audit logs are uploaded as GitHub Actions artifacts, which follow the repository's access controls.
- No telemetry, analytics, or usage data is collected.

## Fork Pull Request Limitations

When a workflow runs on a pull request from a fork:

1. The `GITHUB_TOKEN` has read-only access to the base repository. GuardPR detects this and gracefully degrades.
2. GuardPR reports findings in the audit log artifact but cannot create fix PRs.
3. Repository secrets are not exposed to fork workflows.
