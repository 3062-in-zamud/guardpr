# ADR-002: CLI Wrappers over Library Bindings

## Status

Accepted

## Context

GuardPR integrates two external security scanners:

- **Gitleaks** (secret detection) -- written in Go.
- **OSV-Scanner** (dependency vulnerability detection) -- written in Go.

To use these tools from our Node.js action, we considered two approaches:

1. **Library bindings / FFI**: Call Go code directly from Node.js via WASM compilation, native addons, or FFI bridges.
2. **CLI wrappers**: Download prebuilt Go binaries and invoke them via `child_process` / `@actions/exec`, parsing their JSON output.

## Decision

We chose **CLI wrappers** -- download prebuilt binaries and invoke them as subprocesses.

Key reasons:

- **Go binary complexity**: Both Gitleaks and OSV-Scanner are complex Go programs with extensive dependencies. Compiling to WASM would require significant effort and may not support all features (file system access, network calls). Native addons would need platform-specific builds.
- **FFI complexity**: Node.js FFI solutions (N-API, node-ffi-napi) add native compilation requirements, making the action harder to distribute. The `ncc` bundle cannot include native binaries.
- **Easier version updates**: Upgrading a scanner is a matter of changing a version string and SHA-256 hash in `tool-installer.ts`. No recompilation or binding updates needed.
- **Consistent interface**: Both tools output JSON (`--report-format json` for Gitleaks, `--format json` for OSV-Scanner). Our parsers (`parser.ts`) transform this JSON into the unified `Finding` type. This interface is stable across versions.
- **Actions tool-cache**: The `@actions/tool-cache` package provides download, checksum verification, extraction, and cross-run caching -- purpose-built for this pattern.

## Consequences

**Positive:**

- Zero native compilation dependencies. The action works on any GitHub-hosted runner.
- Scanner upgrades are version bump + hash update, testable in isolation.
- Each scanner runs in its own process with OS-level isolation.
- JSON output parsing is well-tested and decoupled from scanner internals.

**Negative:**

- Subprocess overhead (fork + exec) per scanner invocation. Acceptable for CI where wall-clock time matters less than reliability.
- Must handle platform detection (linux/darwin, x64/arm64) and maintain download URLs for each combination.
- Binary integrity depends on SHA-256 verification. If upstream releases are compromised between our hash pinning, we would detect the mismatch and fail safely.
- Scanner output format changes between major versions could break our parsers.
