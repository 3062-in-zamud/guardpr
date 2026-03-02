# GuardPR -- Operations Runbook

## Common Issues

### Scanner binary download fails

**Symptom**: `SCANNER_INSTALL_FAILED` error in logs.

**Possible causes**:
- GitHub releases rate limiting on the runner's IP.
- Network connectivity issue on the runner.
- Binary URL changed due to upstream release restructuring.

**Resolution**:
1. Check the workflow logs for the specific download URL that failed.
2. Verify the URL is accessible by visiting it in a browser.
3. If rate-limited, re-run the workflow. The `@actions/tool-cache` will use cached binaries on subsequent runs.
4. If the URL structure changed, update `tool-installer.ts` with the correct URL and SHA-256 hash.

### Checksum mismatch

**Symptom**: `CHECKSUM_MISMATCH` error in logs.

**Possible causes**:
- Upstream binary was re-released with the same version tag but different content.
- Download was corrupted in transit.
- Placeholder hashes in `tool-installer.ts` have not been replaced with real values.

**Resolution**:
1. Download the binary manually and compute its SHA-256: `sha256sum <binary>`.
2. Compare with the expected hash in `tool-installer.ts`.
3. If the hash has legitimately changed (re-release), update the hash in `tool-installer.ts`.
4. If placeholder hashes are present (`PLACEHOLDER_HASH_*`), compute the real hashes from the official release binaries and update.

### No findings generated

**Symptom**: Action completes successfully with `findings-count: 0`.

**Possible causes**:
- All scanners are disabled in `.guardpr.yml`.
- The confidence threshold is set too high (e.g., `1.0`).
- No lockfiles present for dependency scanning.
- Source files are in formats not scanned (e.g., `.py` for XSS scanner).

**Resolution**:
1. Check `.guardpr.yml` to ensure desired scanners are enabled.
2. Verify `confidenceThreshold` is reasonable (default: `0.9`).
3. Check that the expected file types are present in the repository.
4. Review the audit log artifact for low-confidence findings that were filtered.

### PR creation fails

**Symptom**: `GITHUB_API_ERROR` in logs, no PR created.

**Possible causes**:
- `github-token` lacks `contents: write` or `pull-requests: write` permissions.
- Branch protection rules prevent pushing to the `guardpr/fix-*` branch pattern.
- The token has expired or been revoked.

**Resolution**:
1. Verify the workflow has the correct permissions block:
   ```yaml
   permissions:
     contents: write
     pull-requests: write
   ```
2. Check branch protection rules do not block the `guardpr/fix-*` pattern.
3. If using a fine-grained PAT, ensure it has the required repository permissions.

### Tests fail on generated patch

**Symptom**: PR is created with `tests-failed` status.

**Possible causes**:
- The generated patch introduces a behavior change that existing tests catch.
- The test command is incorrect or not configured.
- Test infrastructure dependencies are not available on the runner.

**Resolution**:
1. Review the PR description for test output details.
2. Check `testCommand` in `.guardpr.yml` or the `test-command` action input.
3. The patch is still delivered in the draft PR for manual adjustment. Review the diff and fix the patch manually if needed.

## Debugging

### Enable debug logging

Set the `ACTIONS_STEP_DEBUG` secret to `true` in your repository settings. This enables verbose logging for all Actions steps, including GuardPR's internal logging.

### Inspect the audit log

Every run produces an audit log artifact. Download it from the workflow run's Artifacts section:

```bash
gh run download <run-id> -n guardpr-audit-log
cat guardpr-audit-*.json | jq .
```

The audit log contains:
- All findings (including low-confidence ones filtered from the PR)
- Scanner results with exit codes and durations
- Patches generated and their test status
- Tool versions and configuration used
- Integrity checksum

### Test scanners locally

Run individual scanners against a test directory:

```bash
# Gitleaks
gitleaks detect --source ./test/e2e/vulnerable-repo --report-format json --report-path /tmp/gl.json --no-git
cat /tmp/gl.json | jq .

# OSV-Scanner
osv-scanner scan --format json --lockfile ./test/e2e/vulnerable-repo/package-lock.json
```

### Reproduce a failing config

```bash
# Validate config parsing
node -e "
const yaml = require('yaml');
const fs = require('fs');
const { guardprYamlSchema } = require('./src/config/schema');
const raw = yaml.parse(fs.readFileSync('.guardpr.yml', 'utf-8'));
console.log(guardprYamlSchema.parse(raw));
"
```

## Configuration Examples

### Minimal configuration (use all defaults)

```yaml
# .guardpr.yml
# Empty file or no file -- all defaults apply
```

### Secrets-only scan

```yaml
# .guardpr.yml
scanners:
  dependencies:
    enabled: false
  xss:
    enabled: false
  authz:
    enabled: false
```

### Custom auth middleware and protected routes

```yaml
# .guardpr.yml
scanners:
  authz:
    framework: express
    authMiddleware:
      - isAuthenticated
      - isAdmin
      - requireAuth
      - checkJwt
    protectedRoutes:
      - pattern: "/api/admin/*"
        requiredMiddleware: ["isAdmin"]
      - pattern: "/api/*"
        requiredMiddleware: ["isAuthenticated"]
```

### High-precision mode (fewer findings, higher confidence)

```yaml
# .guardpr.yml
confidenceThreshold: 0.95
scanners:
  xss:
    customSanitizers:
      - myCustomSanitize
      - bleach
```

### Report-only mode (no PRs)

```yaml
# .guardpr.yml
createPr: false
```

## Upgrading Scanners

### Upgrading Gitleaks

1. Check the [Gitleaks releases page](https://github.com/gitleaks/gitleaks/releases) for the latest version.
2. Download binaries for all platforms (linux-x64, darwin-x64, darwin-arm64).
3. Compute SHA-256 hashes:
   ```bash
   sha256sum gitleaks_*
   ```
4. Update `src/scanners/tool-installer.ts`:
   - Change the `version` field.
   - Update all download URLs with the new version.
   - Replace SHA-256 hashes.
5. Run the test suite to verify parser compatibility:
   ```bash
   npm run test:unit
   ```
6. Test against the e2e vulnerable-repo fixture:
   ```bash
   npm run test:e2e
   ```

### Upgrading OSV-Scanner

1. Check the [OSV-Scanner releases page](https://github.com/google/osv-scanner/releases) for the latest version.
2. Download binaries for all platforms.
3. Compute SHA-256 hashes.
4. Update `src/scanners/tool-installer.ts` with new version, URLs, and hashes.
5. Run tests:
   ```bash
   npm run test:unit
   npm run test:e2e
   ```

### Verifying output format compatibility

After upgrading a scanner, verify that its JSON output format has not changed:

```bash
# Generate fresh output
gitleaks detect --source ./test/e2e/vulnerable-repo --report-format json --report-path /tmp/new-output.json --no-git

# Compare structure with existing fixture
diff <(jq 'map(keys) | .[0]' test/fixtures/gitleaks-output.json) <(jq 'map(keys) | .[0]' /tmp/new-output.json)
```

If the output structure has changed, update:
1. The parser (`src/scanners/gitleaks/parser.ts` or `src/scanners/osv-scanner/parser.ts`).
2. The test fixture (`test/fixtures/gitleaks-output.json` or `test/fixtures/osv-scanner-output.json`).
3. The parser unit tests.
