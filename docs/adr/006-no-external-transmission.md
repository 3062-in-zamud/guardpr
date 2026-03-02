# ADR-006: No External Data Transmission

## Status

Accepted

## Context

GuardPR processes sensitive repository content: source code, secrets, dependency manifests, and vulnerability findings. Organizations deploying this action need assurance that their code and secrets do not leave the GitHub Actions runner environment.

## Decision

GuardPR **does not transmit repository code, secrets, or findings to any external service**. All processing occurs within the GitHub Actions runner.

The only exception is **OSV-Scanner**, which queries the OSV.dev API with **package names and versions only** (never source code or secrets). This is the minimum data required for vulnerability database lookup and is equivalent to what `npm audit` sends to the npm registry.

Design constraints enforced:

1. **No telemetry or analytics**: GuardPR does not phone home, report usage statistics, or send crash reports to external endpoints.
2. **No cloud-based AI/LLM calls**: Patch generation uses deterministic template-based logic, not external AI services.
3. **No external secret scanning services**: Gitleaks runs entirely locally with its built-in rule set.
4. **Audit logs stay local**: The audit log is uploaded as a GitHub Actions artifact attached to the workflow run, not sent to any external logging service.
5. **GitHub API is same-origin**: PR creation and branch operations use the GitHub API, which is the same platform hosting the repository. The `github-token` is a first-party credential.

## Consequences

**Positive:**

- **Air-gap compliance**: Organizations with strict data residency requirements can adopt GuardPR without security review exceptions.
- **No data exfiltration risk**: Even if the action is compromised, there is no outbound channel for source code or secrets (beyond the GitHub API the repository already trusts).
- **Simplified threat model**: The attack surface is limited to the runner environment, the GitHub API, and the OSV API (package names only).
- **No vendor lock-in**: No external accounts, API keys, or service subscriptions required.

**Negative:**

- **No centralized dashboard**: Findings are only available in the audit log artifact and the PR. Organizations wanting aggregated views must build their own reporting on top of the artifact JSON.
- **OSV API dependency**: If OSV.dev is unreachable, dependency scanning fails gracefully (returns no findings). This is acceptable for a best-effort scanner.
- **No cross-repository intelligence**: Each repository scan is independent. Patterns learned in one repository cannot improve detection in another without code changes.
