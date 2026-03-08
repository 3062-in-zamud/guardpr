# GuardPR Demo Target Repository

This repository intentionally contains vulnerable patterns for GuardPR demonstrations.

## Expected Findings

- `secrets`: hardcoded credentials in `src/secrets-exposed.ts`
- `dependencies`: vulnerable versions from `package-lock.json`
- `xss`: `dangerouslySetInnerHTML` and unsafe DOM usage in `src/xss-vulnerable.tsx`
- `authz`: admin API routes without middleware in `src/authz-missing.ts`

## How to Run

1. Add this workflow to `.github/workflows/guardpr.yml` (already included).
2. Push to `main`.
3. Review the Action summary and generated draft PR.
