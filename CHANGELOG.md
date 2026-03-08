# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-03-08

### Added
- Onboarding welcome issue: first-run detection via `guardpr-onboarded` label, auto-creates a welcome issue with scan results summary, next steps checklist, and documentation links
- `hasOnboardingLabel()`, `createIssue()`, `ensureLabelExists()`, `addLabel()` utility functions in `src/utils/github.ts`
- Clean scan message in step summary when no vulnerabilities are detected
- Language Ecosystem Support table in README

### Fixed
- VERSION constant corrected to match release tag (was `1.1.0`, now `0.3.0`)

### Community
- Community section added to README with links to Discussions, bug reports, and false positive reports

## [1.1.0] - 2026-03-02

### Changed
- Authz scanner precision improved to >= 85% (router-level middleware detection, alternative auth middleware recognition)

### Added
- CODEOWNERS file
- docs/releasing.md release process documentation
- GitHub Discussions enabled

### Fixed
- E2E workflow path filters (added action.yml, test/e2e/**, test/fixtures/**)
- Precision workflow path filters (added src/scanners/**)

### Infrastructure
- .gitignore cleanup (exclude .claude/, CLAUDE.md)

## [1.0.0] - 2026-03-02

### Changed
- Promoted to stable release (no functional changes from beta.1)

### Fixed
- Fixed lint warnings in test files
- Synced package version with release tag

## [1.0.0-beta.1] - 2026-03-02

### Added

- 4 detection categories: Secrets (Gitleaks), Dependencies (OSV-Scanner), XSS (built-in), Authorization (built-in)
- Confidence scoring with configurable threshold (default: 0.9)
- Auto-fix patch generation with test validation
- Draft PR creation with review checklist and `guardpr` label
- 5-layer secret masking (detection, runtime masking, patch suppression, audit log redaction, PR description redaction)
- Audit logging with SHA-256 integrity verification
- Zero-config mode with `.guardpr.yml` override support
- Binary integrity verification (SHA-256 checksum) for scanner downloads
- Scanner binary caching via `@actions/tool-cache`
- Report-only mode (`create-pr: false`)
- Per-scanner enable/disable configuration
- Configurable patching limits (`maxLinesPerPatch`, `maxFilesPerPatch`)
- Authorization scanner with Express and Next.js framework support
- Custom XSS sanitizer configuration
- Matrix workflow support for parallel scanner execution
