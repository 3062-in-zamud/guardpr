# ADR-008: No Secret Values in Patch Diffs

## Status

Accepted

## Context

When GuardPR detects a hardcoded secret (e.g., an AWS access key), the natural fix is to replace the secret value with an environment variable reference. However, the fix diff would look like:

```diff
- const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
+ const AWS_KEY = process.env.AWS_ACCESS_KEY_ID;
```

This diff is part of the PR description and the branch diff. **Anyone with read access to the repository can see the PR diff**, which means the secret value `AKIAIOSFODNN7EXAMPLE` would be exposed in the `-` line to all collaborators.

This is fundamentally unsafe: the purpose of detecting the secret is to remove it from the codebase, not to broadcast it via a PR diff.

## Decision

Secret findings use a **notification-only PR** (`PatchType: "notification-only"`) instead of an auto-fix patch.

The notification-only PR:

1. **Does not contain the secret value** in any diff, description, or comment.
2. **Identifies the file and line number** where the secret was found.
3. **Provides remediation guidance**: instructions to rotate the secret, add it to GitHub Secrets, and update the code to use `process.env`.
4. **Masks the secret**: The `@actions/core.setSecret()` API is called for every detected secret value, ensuring it is redacted from all Actions logs.
5. **Labels the PR** with `guardpr` and `secret-detected` for tracking.

The 5-layer secret defense:

1. **Detection**: Gitleaks identifies the secret pattern.
2. **Runtime masking**: `core.setSecret()` redacts the value from logs.
3. **Patch suppression**: No diff containing the secret value is generated.
4. **Audit log redaction**: The `redactor.ts` module scrubs secret values from the audit log before it is uploaded as an artifact.
5. **PR description redaction**: The PR body references the file and line but never the secret content.

## Consequences

**Positive:**

- Secret values are never exposed in PR diffs, descriptions, or logs.
- Follows the principle of least information: only the location and type of secret are disclosed.
- Compliant with secret management best practices (rotate, don't just delete).
- The `core.setSecret()` integration leverages GitHub's built-in log masking.

**Negative:**

- Secrets require manual remediation. The developer must rotate the secret, add it to GitHub Secrets, and update the code themselves.
- The notification-only PR may feel less actionable compared to an auto-fix PR for other categories.
- If a secret has already been committed to git history, the notification PR does not address historical exposure (this is out of scope for GuardPR; tools like `git filter-branch` or BFG Repo-Cleaner are needed).
