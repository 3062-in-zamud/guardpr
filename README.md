<p align="center">
  <h1 align="center">GuardPR</h1>
  <p align="center">Automated security vulnerability detection and fix PR generation for GitHub repositories</p>
  <p align="center">
    <a href="https://github.com/3062-in-zamud/guardpr/actions"><img src="https://github.com/3062-in-zamud/guardpr/workflows/CI/badge.svg" alt="CI"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
    <a href="https://github.com/3062-in-zamud/guardpr/releases"><img src="https://img.shields.io/github/v/release/3062-in-zamud/guardpr?include_prereleases" alt="Release"></a>
  </p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> · <a href="#features">Features</a> · <a href="docs/">Docs</a> · <a href="README.ja.md">日本語</a>
  </p>
</p>

---

## What is GuardPR?

GuardPR is a GitHub Action that automatically detects security vulnerabilities, generates fix patches, validates them with tests, and opens draft PRs -- all in a single workflow run. No external services, no data leaving your runner.

## Demo

GuardPR detects vulnerabilities and creates fix PRs automatically:

![GuardPR scan results](docs/images/scan-results.png)
*Step Summary showing detected vulnerabilities with confidence scores*

![Auto-generated fix PR](docs/images/fix-pr.png)
*Draft PR with findings, descriptions, and rollback instructions*

![Fix PR diff](docs/images/fix-pr-diff.png)
*Auto-generated patches: DOMPurify import for XSS, auth middleware for unprotected routes*

## Quick Start

**1.** Add the workflow file to your repository:

```yaml
# .github/workflows/guardpr.yml
name: GuardPR Security Scan
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: 3062-in-zamud/guardpr@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**2.** Commit and push.

**3.** Check the **Actions** tab for scan results and the **Pull Requests** tab for draft fix PRs.

## Features

| Category | Detects | Fixes | File Types |
|----------|---------|-------|------------|
| **Secrets** | API keys, tokens, private keys, connection strings | Notification-only PR (no secret in diff) | All files (Gitleaks) |
| **Dependencies** | Known CVEs in dependencies | Version bump to fix version | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Gemfile.lock`, `poetry.lock`, `go.sum`, `Cargo.lock`, `composer.lock`, `requirements.txt` |
| **XSS** | `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, `javascript:` URLs | Adds sanitization or safe alternative | `.ts`, `.tsx`, `.js`, `.jsx` |
| **Authorization** | Routes missing required auth middleware | Adds middleware to route handler | Express, Next.js |

Every finding includes a **confidence score**. Only findings above the configured threshold (default: 0.9) produce fix PRs.

## Community vs Pro

All core features are free and open source. A Pro tier with additional capabilities is planned -- details will be announced separately.

## Configuration

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | Yes | -- | GitHub token for API access |
| `config-path` | No | `.guardpr.yml` | Path to configuration file |
| `confidence-threshold` | No | `0.9` | Minimum confidence score (0.0 - 1.0) |
| `create-pr` | No | `true` | Create draft PRs for fixes |
| `run-tests` | No | `true` | Run tests after applying patches |
| `test-command` | No | `npm test` | Test command to run |
| `scanners` | No | `all` | Comma-separated list of scanners |

### Outputs

| Output | Description |
|--------|-------------|
| `findings-count` | Total number of findings |
| `high-confidence-count` | Findings above confidence threshold |
| `low-confidence-count` | Findings below confidence threshold |
| `pr-url` | URL of the created draft PR |
| `pr-number` | Number of the created draft PR |
| `audit-artifact-name` | Name of the uploaded audit log artifact |

### .guardpr.yml

Create `.guardpr.yml` in your repository root to customize behavior:

```yaml
confidenceThreshold: 0.9
createPr: true
runTests: true
testCommand: "npm test"

scanners:
  secrets:
    enabled: true
  dependencies:
    enabled: true
  xss:
    enabled: true
    customSanitizers:
      - mySanitize
  authz:
    enabled: true
    framework: auto
    authMiddleware:
      - isAuthenticated
      - isAdmin
    protectedRoutes:
      - pattern: "/api/admin/*"
        requiredMiddleware: ["isAdmin"]
      - pattern: "/api/*"
        requiredMiddleware: ["isAuthenticated"]

patching:
  maxLinesPerPatch: 50
  maxFilesPerPatch: 5
```

See [docs/configuration.md](docs/configuration.md) for the full configuration reference.

## How It Works

```
1. Scan       Gitleaks + OSV-Scanner + built-in XSS/Authz rules
                                  |
2. Score      Confidence scoring with contextual analysis
                                  |
3. Patch      Generate fix patches for high-confidence findings
                                  |
4. Test       Apply patches and run test suite to validate
                                  |
5. PR         Open draft PR with description, checklist, and audit trail
```

All processing happens on the GitHub Actions runner. No code or findings leave your environment. See [docs/architecture.md](docs/architecture.md) for the full pipeline details.

## Security & Privacy

- **No external data transmission**: All processing occurs on the Actions runner. Only OSV-Scanner queries OSV.dev with package names (no source code).
- **5-layer secret defense**: Detection, runtime masking, patch suppression, audit log redaction, PR description redaction.
- **Binary integrity**: Scanner binaries verified via SHA-256 checksum before execution.
- **Minimal permissions**: Only `contents: write`, `pull-requests: write`, and `actions: read`.

See [SECURITY.md](SECURITY.md) for the full security policy.

### Required Permissions

```yaml
permissions:
  contents: write        # Create branches and push fix commits
  pull-requests: write   # Open draft PRs, add labels
  # actions: read is implicit for artifact upload
```

## Examples

- [Basic workflow](examples/basic-workflow.yml) -- Minimal setup, all defaults.
- [Advanced workflow](examples/advanced-workflow.yml) -- Matrix strategy, per-scanner runs, step summary.

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, basic and advanced configuration, troubleshooting |
| [Configuration Reference](docs/configuration.md) | Full `.guardpr.yml` option reference |
| [Detection Rules](docs/detection-rules.md) | All detection rules, confidence factors, and remediation strategies |
| [Architecture](docs/architecture.md) | System design, pipeline data flow, component diagram |
| [Security Policy](SECURITY.md) | Vulnerability reporting, security design, permissions model |
| [ADRs](docs/adr/) | Architecture Decision Records |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, project structure, and contribution guidelines.

## License

[MIT](LICENSE)
