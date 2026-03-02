# GuardPR -- Getting Started

## Installation

### Step 1: Add the workflow file

Create `.github/workflows/guardpr.yml` in your repository:

```yaml
name: GuardPR Security Scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: 3062-in-zamud/guardpr@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Step 2: Push and verify

Push the workflow file to your repository. GuardPR will run on the next push or pull request event.

Check the Actions tab in your repository to see the workflow run. The first run will:
1. Download and cache scanner binaries (Gitleaks, OSV-Scanner).
2. Scan your codebase for vulnerabilities.
3. Create draft PRs for any high-confidence findings.
4. Upload an audit log artifact.

### Step 3: Review outputs

After the workflow completes:
- **Draft PRs**: Check the Pull Requests tab for new draft PRs labeled `guardpr`.
- **Audit log**: Download the `guardpr-audit-log` artifact from the workflow run.
- **Summary**: Check the workflow run summary for finding counts.

## Basic Configuration

GuardPR works with sensible defaults. No configuration file is required.

To customize behavior, create `.guardpr.yml` in your repository root:

```yaml
# Minimum confidence score to generate a fix PR (0.0 - 1.0)
confidenceThreshold: 0.9

# Whether to create draft PRs for fixes
createPr: true

# Whether to run tests after applying patches
runTests: true

# Test command to validate patches
testCommand: "npm test"
```

## Advanced Configuration

### Disable specific scanners

```yaml
scanners:
  secrets:
    enabled: true
  dependencies:
    enabled: true
  xss:
    enabled: false   # Disable XSS scanning
  authz:
    enabled: false   # Disable auth scanning
```

### Configure authorization scanner

Define which routes require auth and what middleware to look for:

```yaml
scanners:
  authz:
    framework: express   # auto | express | nextjs
    authMiddleware:
      - isAuthenticated
      - isAdmin
      - requireAuth
      - verifyJWT
    protectedRoutes:
      - pattern: "/api/admin/*"
        requiredMiddleware: ["isAdmin"]
      - pattern: "/api/*"
        requiredMiddleware: ["isAuthenticated"]
```

### Add custom XSS sanitizers

If your project uses custom sanitizer functions, add them so GuardPR reduces confidence when they are found near a potential XSS pattern:

```yaml
scanners:
  xss:
    customSanitizers:
      - mySanitize
      - purifyContent
      - cleanHtml
```

### Configure patching limits

```yaml
patching:
  maxLinesPerPatch: 50   # Max lines changed per patch
  maxFilesPerPatch: 5    # Max files modified per patch
```

### Run specific scanners only

Use the `scanners` input in the workflow to run only specific scanners:

```yaml
- uses: 3062-in-zamud/guardpr@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    scanners: "secrets,dependencies"   # Only run these scanners
```

### Report-only mode

Run scans without creating PRs. Findings are recorded in the audit log artifact:

```yaml
- uses: 3062-in-zamud/guardpr@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    create-pr: "false"
```

## Troubleshooting

### "SCANNER_INSTALL_FAILED" error

The action could not download a scanner binary. This is usually a transient network issue. Re-run the workflow. Binaries are cached after the first successful download.

### No findings but expected some

1. Check that the relevant scanner is enabled in `.guardpr.yml`.
2. Verify the file types are supported (`.ts`, `.tsx`, `.js`, `.jsx` for XSS; lockfiles for dependencies).
3. Download the audit log artifact to see if findings were generated but filtered by the confidence threshold.
4. Try lowering `confidenceThreshold` to `0.7` temporarily to see all findings.

### PR not created

1. Ensure the workflow has `contents: write`, `pull-requests: write`, and `issues: write` permissions.
2. Check that `create-pr` is not set to `false`.
3. Verify the `github-token` has not expired.
4. For fork PRs, the default `GITHUB_TOKEN` has read-only access. PRs cannot be created in this context.
5. In your repository settings, go to **Settings > Actions > General** and enable **"Allow GitHub Actions to create and approve pull requests"** under **Workflow permissions**.

### Tests fail on generated patch

The generated patch might introduce changes that break existing tests. This is expected for some fix patterns. Review the draft PR, adjust the patch manually, and merge when ready.

### Action takes too long

- Secret scanning (Gitleaks) scales with repository size. Use `maxTargetMegabytes` to limit scan scope:
  ```yaml
  scanners:
    secrets:
      maxTargetMegabytes: 5
  ```
- Disable scanners you do not need.
- The first run is slower due to binary downloads. Subsequent runs use cached binaries.

## Using outputs in subsequent steps

```yaml
- uses: 3062-in-zamud/guardpr@v1
  id: guardpr
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- name: Check results
  run: |
    echo "Total findings: ${{ steps.guardpr.outputs.findings-count }}"
    echo "High confidence: ${{ steps.guardpr.outputs.high-confidence-count }}"
    if [ "${{ steps.guardpr.outputs.pr-url }}" != "" ]; then
      echo "Fix PR created: ${{ steps.guardpr.outputs.pr-url }}"
    fi
```
