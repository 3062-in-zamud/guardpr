# GuardPR -- Security Policy

## No External Data Transmission

GuardPR processes all code and findings within the GitHub Actions runner environment. No source code, secrets, or vulnerability findings are transmitted to external services.

**Single exception**: OSV-Scanner queries the [OSV.dev API](https://osv.dev/) with **package names and versions only**. No source code, file paths, or secret values are sent. This is equivalent to running `npm audit` and is the minimum data required for vulnerability database lookup.

### What is NOT sent externally

- Source code or file contents
- Secret values (API keys, passwords, tokens)
- Vulnerability finding details
- Audit log contents
- Repository metadata beyond what the GitHub API already knows

### What IS used

- **GitHub API** (same platform, first-party): Creating branches, commits, and draft PRs using the provided `github-token`.
- **OSV.dev API**: Package name + version queries for known vulnerability lookup.

## Secret Handling: 5-Layer Defense

### Layer 1: Detection

Gitleaks scans source files for secret patterns (API keys, tokens, private keys, connection strings). Findings include the file path, line number, and rule that matched. Detection runs locally on the runner with no network calls.

### Layer 2: Runtime Masking

Every detected secret value is registered with `@actions/core.setSecret()` immediately upon detection. GitHub Actions automatically redacts these values from all subsequent log output, including:
- Step logs
- Group logs
- Error messages
- Annotations

### Layer 3: Patch Suppression

Secret findings produce **notification-only PRs** (`PatchType: "notification-only"`). No code diff containing the secret value is generated. The PR identifies the file and line number but never includes the secret in any diff, description, or comment.

### Layer 4: Audit Log Redaction

Before the audit log artifact is uploaded, the `redactor.ts` module scans all string fields for known secret values and replaces them with `***REDACTED***`. This covers edge cases where a secret value might appear in:
- Finding descriptions
- Code snippets
- Raw scanner output

### Layer 5: PR Description Redaction

The PR body template for secret findings references:
- The file path where the secret was found
- The line number
- The type of secret (e.g., "AWS Access Key")
- Remediation steps

It never includes the actual secret value, partial matches, or surrounding code that might reveal the secret.

## Binary Integrity

### SHA-256 Verification

Scanner binaries (Gitleaks, OSV-Scanner) are downloaded from official GitHub releases and verified against pinned SHA-256 checksums before execution.

```typescript
// tool-installer.ts
const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
if (hash !== expected) {
  throw new GuardPRError(
    `Checksum mismatch: expected ${expected}, got ${hash}`,
    "CHECKSUM_MISMATCH",
    false
  );
}
```

If verification fails, the action aborts with a `CHECKSUM_MISMATCH` error. The unverified binary is never executed.

### Version Pinning

Binary versions are pinned in `tool-installer.ts`:
- Gitleaks: `8.21.2`
- OSV-Scanner: `1.9.1`

Upgrading requires changing the version, URL, and SHA-256 hash in the manifest.

### Tool Cache

Verified binaries are cached via `@actions/tool-cache` so that subsequent runs on the same runner skip download and verification. The cache key includes the tool name and version.

## Permission Model

GuardPR requests the minimum GitHub token permissions needed:

| Permission | Scope | Purpose |
|------------|-------|---------|
| `contents: write` | Repository | Create branches and push fix commits |
| `pull-requests: write` | Repository | Open draft PRs, add labels |
| `actions: read` | Repository | Upload audit log artifacts |

**Not requested**:
- `admin` -- no repository settings are modified
- `security_events` -- findings are reported via PR, not security alerts
- `packages` -- no package publishing
- `deployments` -- no deployment triggers
- Organization-level permissions

## Fork Pull Request Limitations

When a workflow runs on a pull request from a fork:

1. **`github-token` has read-only access**: The `GITHUB_TOKEN` for fork PRs cannot write to the base repository. GuardPR detects this and gracefully degrades.
2. **No PR creation**: GuardPR reports findings in the audit log artifact but cannot create fix PRs.
3. **Repository secrets are not exposed**: Fork workflows do not have access to repository secrets, ensuring that `github-token` inputs referencing secrets are not leaked.

## Vulnerability Reporting

If you discover a security vulnerability in GuardPR itself, please report it by opening a GitHub issue with the `security` label. Do not include exploit details in the issue title.
