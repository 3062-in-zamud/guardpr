# GuardPR Demo Repository Skeleton

This directory provides a ready-to-copy demo repository for `GP-002`.

## Contents

- `repository/.github/workflows/guardpr.yml`: minimal workflow to run GuardPR
- `repository/.guardpr.yml`: sample GuardPR config
- `repository/src/secrets-exposed.ts`: secrets demo fixture
- `repository/src/xss-vulnerable.tsx`: XSS demo fixture
- `repository/src/authz-missing.ts`: authorization demo fixture
- `repository/package.json` + `package-lock.json`: vulnerable dependency fixture

## Demo Flow

1. Copy `demo/repository` into a fresh public demo repository.
2. Add repository secret `GUARDPR_PRO_API_KEY` only if Pro telemetry demo is needed.
3. Push to `main`.
4. Open GitHub Actions and verify:
   - findings are detected in all categories
   - draft fix PR is created
   - summary and audit artifact are generated

## Notes

- Files are intentionally vulnerable for demonstration.
- Do not reuse this content in production repositories.
