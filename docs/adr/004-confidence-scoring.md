# ADR-004: Additive Confidence Scoring

## Status

Accepted

## Context

Security scanners produce findings with varying levels of certainty. A hardcoded AWS access key is almost certainly a true positive; a base64 string that happens to match an API key pattern is likely a false positive. GuardPR needs a mechanism to express this certainty so that:

1. Only high-confidence findings generate fix PRs (avoiding noisy false positives).
2. Lower-confidence findings are still reported in the audit log for human review.
3. The scoring logic is transparent and tunable by operators.

We considered ML-based scoring, rule-weight voting, and additive factor-based scoring.

## Decision

We chose **additive confidence scoring** with category-specific factors.

The model works as follows:

- Each scanner produces findings with a `confidence` field in the range `[0, 1]`.
- Confidence is computed from an array of `ConfidenceFactor` objects, each with a `name`, `score`, and human-readable `reason`.
- Factors are **category-specific**:
  - **Secrets**: Pattern entropy, known example key detection, placeholder detection, test file location.
  - **Dependencies**: CVSS score mapping, fix availability, exploit maturity.
  - **XSS**: Sanitizer proximity, user input proximity, static string detection, test file location.
  - **Authz**: Route pattern specificity, middleware chain completeness, framework detection confidence.
- The final confidence is determined by the scanner's aggregation logic (e.g., minimum of all factors for conservative scoring, or weighted combination).
- The `confidenceThreshold` config value (default: 0.9) determines which findings trigger fix PR generation.

Key reasons:

- **Deterministic**: Given the same code, the same confidence score is produced every time. No model drift, no training data dependencies.
- **Auditable**: Every finding includes its `confidenceFactors` array in the audit log. A human reviewer can see exactly why a finding scored 0.85 vs 0.95.
- **Easy to tune**: Adding a new factor or adjusting a score is a code change with clear semantics. No model retraining required.

## Consequences

**Positive:**

- Full transparency. The audit log shows every factor that contributed to a finding's confidence.
- Threshold filtering is a simple numeric comparison. Users can adjust `confidenceThreshold` to trade precision for recall.
- New factors can be added incrementally without invalidating existing scores.
- No external dependencies (ML models, training data, inference runtime).

**Negative:**

- Cannot capture complex nonlinear relationships between factors (e.g., "sanitizer present AND user input nearby" should interact, not just combine).
- Factor scores are manually calibrated, which requires empirical tuning against the precision dataset.
- Adding too many factors risks overfitting to specific code patterns.
