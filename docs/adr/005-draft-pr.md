# ADR-005: Draft PR over Direct Commit

## Status

Accepted

## Context

When GuardPR detects a high-confidence vulnerability and generates a patch, it needs to deliver that fix to the repository. The two main delivery mechanisms are:

1. **Direct commit**: Push the fix directly to the source branch or a new branch, possibly with auto-merge.
2. **Draft PR**: Create a new branch with the fix and open a draft pull request for human review.

## Decision

We chose to deliver fixes as **draft pull requests**.

Key reasons:

- **Human review mandatory**: Automated security fixes can introduce regressions, break APIs, or change behavior in unexpected ways. A draft PR signals "this needs review before merging" and prevents accidental auto-merge by merge queues or branch protection rules that allow merging approved PRs.
- **No direct modification of protected branches**: Most production repositories protect their main branch. Direct commits would require bypass permissions that violate the principle of least privilege. Draft PRs work within standard branch protection rules.
- **Clear audit trail**: A PR provides a diff, description, labels (`guardpr`), and a linkable URL. The audit log records `prUrl` and `prNumber` for traceability.
- **Review workflow integration**: Teams can assign reviewers, add comments, request changes, and run additional CI checks on the draft PR -- the same workflow they use for human-authored code.
- **Rollback simplicity**: If a fix PR is merged and causes issues, reverting a PR is a standard GitHub operation. Direct commits are harder to identify and revert.

## Consequences

**Positive:**

- No automated changes reach production without human approval.
- Works with all branch protection configurations, including required reviews and status checks.
- The `guardpr` label on PRs enables tracking and filtering of automated fix PRs.
- Draft status prevents premature merging by automation.

**Negative:**

- Requires human action to merge. Vulnerabilities remain unfixed until a reviewer acts.
- High-volume repositories may accumulate many draft PRs if findings are frequent, creating review fatigue.
- The PR branch is visible to all repository collaborators, which is acceptable for fixes but requires special handling for secrets (see ADR-008).
