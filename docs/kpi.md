# GuardPR -- KPI Definitions

## Precision

**Definition**: The fraction of findings that are true positives.

```
Precision = TP / (TP + FP)
```

- **Unit**: Per finding (each `Finding` object is one unit).
- **Scope**: Measured per detection category and overall.
- **Target**: >= 90% overall, >= 85% per category.

**Measurement method**: Automated via the precision test suite (`test/precision/precision.test.ts`). The dataset (`test/precision/dataset.json`) contains labeled true positive and false positive code samples. The test runs scanners against these samples and computes precision.

**Statistical method**: Wilson confidence interval (95% confidence level) to account for small sample sizes.

```typescript
function wilsonInterval(successes: number, total: number, z = 1.96) {
  const p = successes / total;
  const denominator = 1 + z * z / total;
  const center = (p + z * z / (2 * total)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + z * z / (4 * total)) / total)) / denominator;
  return { lower: center - margin, upper: center + margin, point: p };
}
```

## False Positive Rate

**Definition**: The complement of precision.

```
False Positive Rate = 1 - Precision = FP / (TP + FP)
```

- **Target**: <= 10% overall, <= 15% per category.
- **Interpretation**: Of all findings reported by GuardPR, what fraction are false alarms.

## PR Acceptance Rate

**Definition**: The fraction of GuardPR-created PRs that are merged.

```
PR Acceptance Rate = Merged GuardPR PRs / Total GuardPR PRs
```

- **Window**: 30-day rolling.
- **Identification**: PRs are identified by the `guardpr` label.
- **Scope**: Per repository.

**Measurement method**: Automated via GitHub CLI:

```bash
# Total guardpr PRs in last 30 days
gh pr list --label guardpr --state all --json createdAt,mergedAt \
  --jq '[.[] | select(.createdAt > (now - 2592000 | todate))] | length'

# Merged guardpr PRs in last 30 days
gh pr list --label guardpr --state merged --json createdAt,mergedAt \
  --jq '[.[] | select(.mergedAt > (now - 2592000 | todate))] | length'
```

**Interpretation**: A high acceptance rate indicates that generated fixes are useful and correct. A low rate suggests precision issues or generated patches that do not meet developer standards.

## Effective Fix PR

**Definition**: A GuardPR-created draft PR that has been merged by a developer.

```
Effective Fix PR = Merged PR with "guardpr" label
```

- **Counting**: Each merged PR counts as one effective fix, regardless of how many findings it addresses.
- **Scope**: Per repository, per time window.

**Measurement method**:

```bash
# Count effective fix PRs
gh pr list --label guardpr --state merged --json number \
  --jq 'length'
```

## Summary Table

| KPI | Formula | Target | Window | Measurement |
|-----|---------|--------|--------|-------------|
| Precision | TP / (TP + FP) | >= 90% overall, >= 85% per category | Per test run | Precision test suite |
| False Positive Rate | FP / (TP + FP) | <= 10% overall | Per test run | 1 - Precision |
| PR Acceptance Rate | Merged / Total guardpr PRs | Tracked (no fixed target) | 30-day rolling | `gh pr list --label guardpr` |
| Effective Fix PR | Count of merged guardpr PRs | Tracked (no fixed target) | Cumulative | `gh pr list --label guardpr --state merged` |
