# GuardPR -- Detection Rules Reference

## Overview

GuardPR detects vulnerabilities across four categories using a combination of external scanners and built-in rules. Each finding includes a confidence score, severity level, and CWE identifier.

## Secrets (Gitleaks)

Secret detection uses [Gitleaks](https://github.com/gitleaks/gitleaks) with its built-in rule set. GuardPR invokes Gitleaks in `--no-git` mode (scans files, not git history).

| Rule ID | Pattern | Example | Severity |
|---------|---------|---------|----------|
| `aws-access-key-id` | `AKIA[0-9A-Z]{16}` | `AKIAIOSFODNN7EXAMPLE` | P0 |
| `github-pat` | `ghp_[0-9a-zA-Z]{36}` | `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | P0 |
| `github-oauth` | `gho_[0-9a-zA-Z]{36}` | `gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | P0 |
| `github-app` | `ghs_[0-9a-zA-Z]{36}` | (server-to-server token) | P0 |
| `github-refresh` | `ghr_[0-9a-zA-Z]{36}` | (refresh token) | P0 |
| `rsa-private-key` | `-----BEGIN RSA PRIVATE KEY-----` | PEM-encoded RSA key | P0 |
| `openssh-private-key` | `-----BEGIN OPENSSH PRIVATE KEY-----` | OpenSSH format key | P0 |
| `generic-api-key` | High-entropy string near `key`, `token`, `secret`, `password` variable names | `API_KEY = "a1b2c3d4..."` | P0 |
| `connection-string` | `://user:pass@host` pattern | `postgres://admin:secret@db:5432/app` | P0 |

**Confidence factors**:
- Pattern specificity (AWS keys are highly specific; generic keys less so)
- Known example/placeholder detection (e.g., `AKIAIOSFODNN7EXAMPLE` is AWS's documented example key)
- File context (`.env.example`, test files score lower)
- Entropy analysis (high entropy increases confidence for generic patterns)

**Remediation**: Notification-only PR. No secret values appear in diffs.

## Dependencies (OSV-Scanner)

Dependency scanning uses [OSV-Scanner](https://github.com/google/osv-scanner) which queries the [OSV.dev](https://osv.dev/) vulnerability database.

| Lockfile | Ecosystem | Example Vulnerability |
|----------|-----------|----------------------|
| `package-lock.json` | npm | CVE-2021-23337 (lodash prototype pollution) |
| `yarn.lock` | npm | GHSA-jchw-25xp-jwwc (express path traversal) |
| `pnpm-lock.yaml` | npm | CVE-2022-46175 (json5 prototype pollution) |
| `Gemfile.lock` | RubyGems | CVE-2023-22796 (activesupport ReDoS) |
| `poetry.lock` | PyPI | CVE-2023-37920 (certifi root CA removal) |
| `go.sum` | Go | CVE-2023-39325 (golang.org/x/net HTTP/2 DoS) |
| `Cargo.lock` | crates.io | RUSTSEC-2023-0071 (tokio resource exhaustion) |
| `composer.lock` | Packagist | CVE-2023-46734 (symfony XSS) |
| `requirements.txt` | PyPI | CVE-2023-43804 (urllib3 cookie leak) |

**Confidence factors**:
- Advisory source (CVE/GHSA with CVSS score)
- Fix version availability (higher confidence when fix exists)
- Exploit maturity (known exploits increase confidence)

**Remediation**: Auto-fix PR that bumps the dependency to the fix version.

## XSS (Built-in Scanner)

XSS detection uses four built-in regex rules with context analysis. Scans `.ts`, `.tsx`, `.js`, `.jsx` files.

| Rule | CWE | Pattern | Description |
|------|-----|---------|-------------|
| `dangerous-inner-html` | CWE-79 | `dangerouslySetInnerHTML={{ __html: <expr> }}` | Detects React's `dangerouslySetInnerHTML` with non-literal expressions. Skips string literals. |
| `inner-html-assignment` | CWE-79 | `.innerHTML =` / `.outerHTML =` | Detects direct DOM innerHTML/outerHTML assignment. Skips comment lines. |
| `eval-usage` | CWE-95 | `eval(...)`, `new Function(...)`, `setTimeout("...")`, `setInterval("...")` | Detects code injection via eval-like functions. Skips comments and string contexts. |
| `url-xss` | CWE-79 | `href="javascript:..."`, `src={req.query...}` | Detects javascript: protocol URLs and dynamic URL construction from user input. |

**Context analysis factors** (applied within 10-line radius):

| Factor | Score | Condition |
|--------|-------|-----------|
| `user-input` | 0.95 | User input pattern found nearby (`req.query`, `searchParams`, `location.search`, etc.) |
| `default` | 0.70 | No specific context factors detected |
| `static-string` | 0.10 | Value is a static string literal |
| `sanitizer-present` | 0.10 | Sanitizer call found nearby (`DOMPurify.sanitize`, `encodeURIComponent`, `escapeHtml`, etc.) |
| `test-file` | 0.05 | File matches test file pattern (`.test.ts`, `.spec.ts`, `__tests__/`) |

**Confidence**: Minimum of all detected factors (most conservative).

**Remediation**: Auto-fix PR that adds sanitization or replaces with safe alternative.

## Authorization (Built-in Scanner)

Authorization detection checks that routes matching protected patterns have the required auth middleware.

| Check | Framework | Pattern |
|-------|-----------|---------|
| Route without auth middleware | Express | `app.get("/api/admin/...", handler)` without `isAuthenticated` or `isAdmin` in middleware chain |
| Route without auth middleware | Express | `router.post("/api/admin/...", handler)` without required middleware |
| API route without auth check | Next.js | `export default function handler(req, res)` without auth middleware call |

**Configuration**:

```yaml
scanners:
  authz:
    protectedRoutes:
      - pattern: "/api/admin/*"
        requiredMiddleware: ["isAdmin"]
      - pattern: "/api/*"
        requiredMiddleware: ["isAuthenticated"]
    authMiddleware:
      - isAuthenticated
      - isAdmin
      - requireAuth
    framework: auto  # auto | express | nextjs
```

**Default auth middleware names**: `isAuthenticated`, `isAdmin`, `requireAuth`.

**Confidence factors**:
- Route pattern specificity (exact match vs. wildcard)
- Middleware chain completeness (all required middleware present vs. partial)
- Framework detection confidence (explicit config vs. auto-detect)

**Remediation**: Auto-fix PR that adds the required middleware to the route handler.
