import * as crypto from "crypto";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { AuditLogger } from "../../../src/audit/logger";
import { Finding, GuardPRConfig, Patch, ScanResult } from "../../../src/types";

vi.mock("../../../src/utils/github", () => ({
  getContext: () => ({
    owner: "test-owner",
    repo: "test-repo",
    sha: "abc123def456",
    ref: "refs/heads/main",
    actor: "test-user",
    runId: 12345,
    runAttempt: 1,
    eventName: "push",
  }),
}));

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    fingerprint: "fp-1",
    scannerId: "test-scanner",
    category: "dependencies",
    severity: "P1",
    title: "Test vulnerability",
    description: "A test vulnerability",
    location: { file: "src/app.ts", startLine: 10, endLine: 10 },
    codeSnippet: "vulnerable code",
    confidence: 0.95,
    confidenceFactors: [],
    ...overrides,
  };
}

function makePatch(overrides: Partial<Patch> = {}): Patch {
  return {
    findingFingerprints: ["fp-1"],
    title: "Fix vulnerability",
    type: "auto-fix",
    rationale: "Upgrade dependency",
    rollbackSteps: ["Revert"],
    fileChanges: [],
    status: "tests-passed",
    breakingRisk: "low",
    ...overrides,
  };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    scannerId: "test-scanner",
    status: "success",
    findings: [],
    durationMs: 1000,
    exitCode: 0,
    ...overrides,
  };
}

const defaultConfig: GuardPRConfig = {
  configPath: ".guardpr.yml",
  confidenceThreshold: 0.9,
  createPr: true,
  runTests: true,
  testCommand: "npm test",
  scanners: {
    secrets: { enabled: true, maxTargetMegabytes: 10 },
    dependencies: { enabled: true },
    xss: { enabled: true, customSanitizers: [] },
    authz: {
      enabled: true,
      protectedRoutes: [],
      authMiddleware: ["isAuthenticated"],
      framework: "auto",
    },
  },
  patching: { maxLinesPerPatch: 50, maxFilesPerPatch: 5 },
  githubToken: "ghp_secret_token_value",
};

describe("AuditLogger", () => {
  const logger = new AuditLogger();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T10:00:00Z"));
  });

  it("builds a complete audit log entry", () => {
    const finding = makeFinding();
    const patch = makePatch();
    const scanResult = makeScanResult({ findings: [finding] });

    const log = logger.build({
      scanResults: [scanResult],
      findings: [finding],
      highConfidence: [finding],
      lowConfidence: [],
      patches: [patch],
      prCreated: true,
      prUrl: "https://github.com/test/repo/pull/1",
      prNumber: 1,
      totalDurationMs: 5000,
      errors: [],
      toolVersions: { gitleaks: "8.18.0" },
      config: defaultConfig,
    });

    expect(log.version).toBe("1.0");
    expect(log.timestamp).toBe("2026-01-15T10:00:00.000Z");
    expect(log.guardprVersion).toBe("0.1.0");
    expect(log.github.repository).toBe("test-owner/test-repo");
    expect(log.github.sha).toBe("abc123def456");
    expect(log.allFindings).toHaveLength(1);
    expect(log.highConfidenceFindings).toHaveLength(1);
    expect(log.lowConfidenceFindings).toHaveLength(0);
    expect(log.patches).toHaveLength(1);
    expect(log.prCreated).toBe(true);
    expect(log.prUrl).toBe("https://github.com/test/repo/pull/1");
    expect(log.prNumber).toBe(1);
    expect(log.totalDurationMs).toBe(5000);
    expect(log.errors).toHaveLength(0);
    expect(log.toolVersions).toEqual({ gitleaks: "8.18.0" });
  });

  it("masks sensitive config values", () => {
    const log = logger.build({
      scanResults: [],
      findings: [],
      highConfidence: [],
      lowConfidence: [],
      patches: [],
      prCreated: false,
      totalDurationMs: 100,
      errors: [],
      toolVersions: {},
      config: defaultConfig,
    });

    expect(log.config["githubToken"]).toBe("***");
    expect(log.config["githubToken"]).not.toBe("ghp_secret_token_value");
  });

  it("generates a valid SHA-256 checksum", () => {
    const log = logger.build({
      scanResults: [],
      findings: [],
      highConfidence: [],
      lowConfidence: [],
      patches: [],
      prCreated: false,
      totalDurationMs: 100,
      errors: [],
      toolVersions: {},
      config: defaultConfig,
    });

    expect(log.checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different checksums for different logs", () => {
    const log1 = logger.build({
      scanResults: [],
      findings: [],
      highConfidence: [],
      lowConfidence: [],
      patches: [],
      prCreated: false,
      totalDurationMs: 100,
      errors: [],
      toolVersions: {},
      config: defaultConfig,
    });

    vi.setSystemTime(new Date("2026-01-15T11:00:00Z"));

    const log2 = logger.build({
      scanResults: [],
      findings: [makeFinding()],
      highConfidence: [makeFinding()],
      lowConfidence: [],
      patches: [],
      prCreated: false,
      totalDurationMs: 200,
      errors: ["some error"],
      toolVersions: {},
      config: defaultConfig,
    });

    expect(log1.checksum).not.toBe(log2.checksum);
  });

  it("checksum is tamper-detectable", () => {
    const log = logger.build({
      scanResults: [],
      findings: [],
      highConfidence: [],
      lowConfidence: [],
      patches: [],
      prCreated: false,
      totalDurationMs: 100,
      errors: [],
      toolVersions: {},
      config: defaultConfig,
    });

    // Verify checksum by recomputing
    const { checksum, ...logWithoutChecksum } = log;
    const recomputed = crypto
      .createHash("sha256")
      .update(JSON.stringify(logWithoutChecksum))
      .digest("hex");

    expect(checksum).toBe(recomputed);
  });

  it("includes errors in the log", () => {
    const log = logger.build({
      scanResults: [],
      findings: [],
      highConfidence: [],
      lowConfidence: [],
      patches: [],
      prCreated: false,
      totalDurationMs: 100,
      errors: ["Scanner timeout", "API rate limit"],
      toolVersions: {},
      config: defaultConfig,
    });

    expect(log.errors).toEqual(["Scanner timeout", "API rate limit"]);
  });
});
