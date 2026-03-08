# Configuration Reference

GuardPR works out of the box with sensible defaults. To customize behavior, create a `.guardpr.yml` file in your repository root.

Configuration is merged in the following order (later values override earlier):

1. Built-in defaults
2. `.guardpr.yml` file (or custom path via `config-path` input)
3. Action inputs (`confidence-threshold`, `create-pr`, etc.)

## Top-Level Options

### `confidenceThreshold`

- **Type**: `number` (0.0 - 1.0)
- **Default**: `0.9`

Minimum confidence score required to generate a fix PR. Findings below this threshold are recorded in the audit log but do not produce PRs.

```yaml
confidenceThreshold: 0.85
```

### `createPr`

- **Type**: `boolean`
- **Default**: `true`

Whether to create draft PRs for high-confidence findings. Set to `false` for report-only mode (findings are recorded in the audit log artifact).

```yaml
createPr: false
```

### `runTests`

- **Type**: `boolean`
- **Default**: `true`

Whether to run the test suite after applying each patch. Test results are included in the PR description.

```yaml
runTests: true
```

### `testCommand`

- **Type**: `string`
- **Default**: `"npm test"`

The command to execute for test validation. This command runs in the repository root after a patch is applied.

```yaml
testCommand: "yarn test --ci"
```

## `scanners`

Configure individual scanners. Each scanner can be enabled or disabled independently.

### `scanners.secrets`

Controls the Gitleaks-based secret detection scanner.

```yaml
scanners:
  secrets:
    enabled: true
    maxTargetMegabytes: 5
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable secret scanning |
| `maxTargetMegabytes` | `number` | -- | Limit scan scope by file size (useful for large repos) |

### `scanners.dependencies`

Controls the OSV-Scanner-based dependency vulnerability scanner.

```yaml
scanners:
  dependencies:
    enabled: true
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable dependency scanning |

Supported lockfiles: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Gemfile.lock`, `poetry.lock`, `go.sum`, `Cargo.lock`, `composer.lock`, `requirements.txt`.

### `scanners.xss`

Controls the built-in XSS detection scanner.

```yaml
scanners:
  xss:
    enabled: true
    customSanitizers:
      - mySanitize
      - purifyContent
      - cleanHtml
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable XSS scanning |
| `customSanitizers` | `string[]` | `[]` | Custom sanitizer function names. When found near a potential XSS pattern, confidence is reduced (the code is likely already protected). |

Built-in recognized sanitizers: `DOMPurify.sanitize`, `encodeURIComponent`, `escapeHtml`, `sanitizeHtml`, `xss()`.

Scanned file types: `.ts`, `.tsx`, `.js`, `.jsx`.

### `scanners.authz`

Controls the built-in authorization middleware scanner.

```yaml
scanners:
  authz:
    enabled: true
    framework: auto
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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable authorization scanning |
| `framework` | `string` | `"auto"` | Framework to scan for: `"auto"`, `"express"`, or `"nextjs"` |
| `authMiddleware` | `string[]` | `["isAuthenticated", "isAdmin", "requireAuth"]` | Function names recognized as auth middleware |
| `protectedRoutes` | `object[]` | `[]` | Route patterns and their required middleware |

#### `protectedRoutes` entries

| Field | Type | Description |
|-------|------|-------------|
| `pattern` | `string` | Route pattern to match (supports `*` wildcard) |
| `requiredMiddleware` | `string[]` | Middleware functions that must be present on matching routes |

When `framework` is set to `"auto"`, GuardPR detects the framework by inspecting `package.json` dependencies.

## `patching`

Configure patch generation limits.

```yaml
patching:
  maxLinesPerPatch: 50
  maxFilesPerPatch: 5
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxLinesPerPatch` | `number` | `50` | Maximum number of lines changed per patch |
| `maxFilesPerPatch` | `number` | `5` | Maximum number of files modified per patch |

Patches exceeding these limits are skipped, and the finding is recorded in the audit log without a fix PR.

## Full Example

```yaml
# .guardpr.yml
confidenceThreshold: 0.85
createPr: true
runTests: true
testCommand: "npm test -- --ci"

scanners:
  secrets:
    enabled: true
    maxTargetMegabytes: 10
  dependencies:
    enabled: true
  xss:
    enabled: true
    customSanitizers:
      - mySanitize
      - purifyContent
  authz:
    enabled: true
    framework: express
    authMiddleware:
      - isAuthenticated
      - isAdmin
      - requireAuth
      - verifyJWT
    protectedRoutes:
      - pattern: "/api/admin/*"
        requiredMiddleware: ["isAdmin"]
      - pattern: "/api/users/*"
        requiredMiddleware: ["isAuthenticated"]
      - pattern: "/api/*"
        requiredMiddleware: ["isAuthenticated"]

patching:
  maxLinesPerPatch: 100
  maxFilesPerPatch: 10
```

## Pro Configuration

GuardPR Pro provides a centralized dashboard for aggregated security insights. Pro is entirely opt-in and configured via action inputs only.

### `pro-api-key`

- **Type**: `string` (action input only)
- **Default**: `""` (empty -- Community mode)

Your GuardPR Pro API key. When set, GuardPR sends **aggregate statistics only** (finding counts, severity distribution, scanner durations) to the Pro dashboard after each scan. No source code, vulnerability descriptions, patch diffs, or secrets are transmitted.

**Important:** Always use GitHub Secrets to store the API key. Never put it in `.guardpr.yml`.

```yaml
# In your workflow file:
- uses: 3062-in-zamud/guardpr@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    pro-api-key: ${{ secrets.GUARDPR_PRO_API_KEY }}
```

The Pro endpoint URL is hardcoded and cannot be changed by users (SSRF prevention). If `pro-api-key` is not set, no data is sent externally -- identical to previous versions.

See [ADR-009](adr/009-pro-opt-in-telemetry.md) for the full privacy design.

## Action Inputs vs .guardpr.yml

Some settings can be configured in both the workflow file (as action inputs) and in `.guardpr.yml`. When both are present, the following rules apply:

| Setting | Action Input | `.guardpr.yml` | Priority |
|---------|-------------|----------------|----------|
| Confidence threshold | `confidence-threshold` | `confidenceThreshold` | Action input wins |
| Create PR | `create-pr` | `createPr` | Action input wins |
| Run tests | `run-tests` | `runTests` | Action input wins |
| Test command | `test-command` | `testCommand` | Action input wins |
| Scanners to run | `scanners` | `scanners.*` | Action input filters; `.guardpr.yml` configures |
| Config file path | `config-path` | -- | Action input only |
| GitHub token | `github-token` | -- | Action input only |
| Pro API key | `pro-api-key` | -- | Action input only |

The `scanners` action input acts as a filter: if set to `"secrets,dependencies"`, only those two scanners run, regardless of what is enabled in `.guardpr.yml`. The `.guardpr.yml` file still controls the detailed configuration for each scanner.
