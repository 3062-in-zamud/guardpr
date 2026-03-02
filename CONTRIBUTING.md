# Contributing to GuardPR

Thank you for your interest in contributing to GuardPR! This guide covers the development workflow and conventions used in this project.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/3062-in-zamud/guardpr.git
cd guardpr

# Install dependencies
npm ci

# Run the full verification pipeline
npm run verify
```

`npm run verify` runs formatting check, linting, type checking, tests, and build in sequence.

## Project Structure

```
src/
  index.ts              # Entry point: orchestrates the 14-step pipeline
  config/               # Configuration loading, Zod schema, defaults
  scanners/             # Scanner plugins (Gitleaks, OSV-Scanner, XSS, Authz)
    gitleaks/           # Secret detection via Gitleaks CLI
    osv-scanner/        # Dependency scanning via OSV-Scanner CLI
    xss/                # Built-in XSS detection rules + context analyzer
  scoring/              # Confidence scoring logic
  patching/             # Patch generation strategies per finding type
  pr/                   # Draft PR creation, branch management
  masking/              # Secret redaction (5-layer defense)
  audit/                # Audit log generation with integrity checksums
  types/                # TypeScript type definitions
  utils/                # Git, GitHub API, exec, logging helpers

test/
  unit/                 # Unit tests (fast, no I/O)
  integration/          # Integration tests (may use filesystem)
  e2e/                  # End-to-end tests (full pipeline)
  precision/            # Detection precision/recall tests

docs/                   # Documentation
examples/               # Example GitHub Actions workflow files
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests once (no watch mode)
npm run test:run

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:precision
```

Tests use [Vitest](https://vitest.dev/). Test files are colocated with their subjects using the `.test.ts` suffix.

## Code Style

This project uses ESLint and Prettier for consistent code formatting.

```bash
# Check formatting
npm run format:check

# Auto-fix formatting
npm run format

# Run linter
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

Please ensure `npm run format:check && npm run lint` passes before submitting a pull request.

## Building

```bash
# Production build (minified, single file)
npm run build

# Debug build (with source maps)
npm run build:debug
```

The build uses `@vercel/ncc` to bundle all dependencies into a single `dist/index.js` file for use as a GitHub Action.

## Submitting Changes

1. **Fork** the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** and ensure all checks pass:
   ```bash
   npm run verify
   ```

3. **Commit** with a clear, descriptive message:
   ```bash
   git commit -m "feat: add support for Deno lockfiles"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/) where possible:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation only
   - `refactor:` code change that neither fixes a bug nor adds a feature
   - `test:` adding or updating tests
   - `chore:` maintenance tasks

4. **Push** to your fork and open a **Pull Request** against `main`.

5. Ensure CI passes on your PR. A maintainer will review your changes.

## Reporting Issues

- Use [GitHub Issues](https://github.com/3062-in-zamud/guardpr/issues) to report bugs or request features.
- For security vulnerabilities, see [SECURITY.md](SECURITY.md).
- Include reproduction steps, expected behavior, and actual behavior when reporting bugs.

## License

By contributing to GuardPR, you agree that your contributions will be licensed under the [MIT License](LICENSE).
