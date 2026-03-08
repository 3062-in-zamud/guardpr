# ADR-009: Pro Opt-In Telemetry

## Status

Accepted (Supersedes ADR-006 partially)

## Context

ADR-006 established that GuardPR does not transmit repository code, secrets, or findings to any external service. This decision enabled trust and adoption by organizations with strict data residency requirements.

Phase C introduces a Pro tier that provides a centralized dashboard for aggregated security insights across repositories. This requires transmitting **statistical summaries** from the Action to an external endpoint. This directly conflicts with ADR-006's "no telemetry" constraint.

However, Pro is an explicit opt-in feature. Community users who do not configure a Pro API key are completely unaffected.

## Decision

Pro users who explicitly opt in by providing a `pro-api-key` action input may transmit **aggregate statistics only** to the GuardPR Pro endpoint.

### What is transmitted (allowlist -- nothing else)

- Finding counts (total, high-confidence, low-confidence)
- Severity distribution (`P0`, `P1`, `P2` counts)
- Category distribution (`secrets`, `dependencies`, `xss`, `authz` counts)
- Scanner execution metadata (scanner ID, status, finding count, duration)
- Patch statistics (total, tests passed, tests failed)
- PR creation outcome (created or not, URL, number)
- Performance metrics (total duration)
- Repository full name, commit SHA, ref, actor, event name, run ID
- GuardPR version

### What is NEVER transmitted

- **Source code** (`codeSnippet` field)
- **Vulnerability descriptions** (`description` field -- may contain code paths or internal details)
- **Patch diffs** (`diff`, `modifiedContent` fields)
- **Raw scanner data** (`rawData` field)
- **Secrets or tokens** (`githubToken`, `pro.apiKey`, any detected secret values)
- **Confidence factors** (detailed reasoning about why a finding was scored)
- **File contents** of any kind

### Opt-in mechanism

1. User sets `pro-api-key` as a GitHub Actions secret
2. User references it in their workflow: `pro-api-key: ${{ secrets.GUARDPR_PRO_API_KEY }}`
3. If `pro-api-key` is empty or not set, no external transmission occurs -- identical to ADR-006 behavior
4. The API key MUST NOT be stored in `.guardpr.yml` (it would be committed to Git)

### Security controls

- Webhook payload is constructed by **explicit field picking** (no spread operators on finding/patch objects)
- Payload is validated through a Zod schema with `.strip()` to remove any unexpected fields
- The endpoint URL is hardcoded in the application defaults -- users cannot change it (SSRF prevention)
- API key is masked in audit logs
- Webhook failure is non-fatal: logged as a warning, never causes Action failure
- One retry with 1-second delay on transient failures

## Consequences

**Positive:**

- Pro users get centralized visibility across repositories without manual artifact collection
- Community users are completely unaffected -- ADR-006 remains fully in effect for them
- Explicit opt-in with GitHub Secrets ensures informed consent and secure key management
- Statistical-only payload eliminates source code exfiltration risk even if the endpoint is compromised

**Negative:**

- The "no external transmission" messaging in README and SECURITY.md must be qualified with "for Community users" / "unless Pro is enabled"
- Pro users must trust the GuardPR Pro endpoint with aggregate statistics
- Additional code path to maintain and test

## Related

- **ADR-006**: No External Data Transmission -- remains in effect for Community users
- **ADR-008**: No Secret Patch Diff -- reinforced by excluding `diff` and `codeSnippet` from webhook payload
