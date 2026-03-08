import { describe, it, expect, vi, beforeEach } from "vitest";

import { buildWebhookPayload, BuildWebhookPayloadParams } from "../../../src/webhook/payload";
import { Finding, Patch, ScanResult } from "../../../src/types";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    fingerprint: "fp-1",
    scannerId: "test-scanner",
    category: "dependencies",
    severity: "P1",
    title: "Test vulnerability",
    description: "A detailed description with code path src/app.ts:10",
    location: { file: "src/app.ts", startLine: 10, endLine: 10 },
    codeSnippet: "const secret = process.env.API_KEY;",
    confidence: 0.95,
    confidenceFactors: [{ name: "pattern-match", score: 0.9, reason: "matched known pattern" }],
    rawData: { internalField: "should-not-leak" },
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
    fileChanges: [
      {
        filePath: "src/app.ts",
        diff: "--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1 +1 @@\n-old\n+new",
        changeType: "modify",
        modifiedContent: "const safe = sanitize(input);",
      },
    ],
    status: "tests-passed",
    breakingRisk: "low",
    ...overrides,
  };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    scannerId: "test-scanner",
    status: "success",
    findings: [makeFinding()],
    durationMs: 1500,
    exitCode: 0,
    ...overrides,
  };
}

const baseParams: BuildWebhookPayloadParams = {
  version: "1.1.0",
  repository: "owner/repo",
  run: { id: 123, sha: "abc123", ref: "refs/heads/main", actor: "user", eventName: "push" },
  highConfidence: [],
  lowConfidence: [],
  scanResults: [],
  patches: [],
  prCreated: false,
  totalDurationMs: 5000,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T10:00:00Z"));
});

describe("buildWebhookPayload", () => {
  it("builds a valid payload with no findings", () => {
    const payload = buildWebhookPayload(baseParams);

    expect(payload.version).toBe("1.0");
    expect(payload.timestamp).toBe("2026-01-15T10:00:00.000Z");
    expect(payload.guardprVersion).toBe("1.1.0");
    expect(payload.repository.fullName).toBe("owner/repo");
    expect(payload.run.id).toBe(123);
    expect(payload.scan.totalFindings).toBe(0);
    expect(payload.scan.highConfidenceCount).toBe(0);
    expect(payload.scan.lowConfidenceCount).toBe(0);
    expect(payload.scan.bySeverity).toEqual({ P0: 0, P1: 0, P2: 0 });
    expect(payload.scan.byCategory).toEqual({ secrets: 0, dependencies: 0, xss: 0, authz: 0 });
    expect(payload.patches.total).toBe(0);
    expect(payload.pr.created).toBe(false);
    expect(payload.performance.totalDurationMs).toBe(5000);
  });

  it("correctly counts bySeverity", () => {
    const payload = buildWebhookPayload({
      ...baseParams,
      highConfidence: [
        makeFinding({ severity: "P0", fingerprint: "fp-1" }),
        makeFinding({ severity: "P0", fingerprint: "fp-2" }),
        makeFinding({ severity: "P1", fingerprint: "fp-3" }),
      ],
      lowConfidence: [makeFinding({ severity: "P2", fingerprint: "fp-4" })],
    });

    expect(payload.scan.bySeverity).toEqual({ P0: 2, P1: 1, P2: 1 });
    expect(payload.scan.totalFindings).toBe(4);
    expect(payload.scan.highConfidenceCount).toBe(3);
    expect(payload.scan.lowConfidenceCount).toBe(1);
  });

  it("correctly counts byCategory", () => {
    const payload = buildWebhookPayload({
      ...baseParams,
      highConfidence: [
        makeFinding({ category: "secrets", fingerprint: "fp-1" }),
        makeFinding({ category: "xss", fingerprint: "fp-2" }),
        makeFinding({ category: "xss", fingerprint: "fp-3" }),
        makeFinding({ category: "authz", fingerprint: "fp-4" }),
      ],
      lowConfidence: [makeFinding({ category: "dependencies", fingerprint: "fp-5" })],
    });

    expect(payload.scan.byCategory).toEqual({ secrets: 1, dependencies: 1, xss: 2, authz: 1 });
  });

  it("includes scanner results", () => {
    const payload = buildWebhookPayload({
      ...baseParams,
      scanResults: [
        makeScanResult({ scannerId: "gitleaks", status: "success", durationMs: 1200 }),
        makeScanResult({
          scannerId: "osv-scanner",
          status: "failed",
          findings: [],
          durationMs: 800,
        }),
      ],
    });

    expect(payload.scan.scannerResults).toHaveLength(2);
    expect(payload.scan.scannerResults[0]).toEqual({
      scannerId: "gitleaks",
      status: "success",
      findingCount: 1,
      durationMs: 1200,
    });
    expect(payload.scan.scannerResults[1]).toEqual({
      scannerId: "osv-scanner",
      status: "failed",
      findingCount: 0,
      durationMs: 800,
    });
  });

  it("includes patch statistics", () => {
    const payload = buildWebhookPayload({
      ...baseParams,
      patches: [
        makePatch({ status: "tests-passed" }),
        makePatch({ status: "tests-passed" }),
        makePatch({ status: "tests-failed" }),
      ],
    });

    expect(payload.patches.total).toBe(3);
    expect(payload.patches.testsPassed).toBe(2);
    expect(payload.patches.testsFailed).toBe(1);
  });

  it("includes PR information when created", () => {
    const payload = buildWebhookPayload({
      ...baseParams,
      prCreated: true,
      prUrl: "https://github.com/owner/repo/pull/42",
      prNumber: 42,
    });

    expect(payload.pr.created).toBe(true);
    expect(payload.pr.url).toBe("https://github.com/owner/repo/pull/42");
    expect(payload.pr.number).toBe(42);
  });

  it("does NOT contain codeSnippet, diff, description, or rawData in serialized output", () => {
    const finding = makeFinding({
      codeSnippet: "SUPER_SECRET_CODE_SNIPPET",
      description: "DETAILED_VULNERABILITY_DESCRIPTION",
      rawData: { sensitiveInternal: "RAW_DATA_VALUE" },
    });
    const patch = makePatch({
      fileChanges: [
        {
          filePath: "src/app.ts",
          diff: "PATCH_DIFF_CONTENT",
          changeType: "modify",
          modifiedContent: "MODIFIED_CONTENT_VALUE",
        },
      ],
    });

    const payload = buildWebhookPayload({
      ...baseParams,
      highConfidence: [finding],
      patches: [patch],
      scanResults: [makeScanResult({ findings: [finding] })],
    });

    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain("SUPER_SECRET_CODE_SNIPPET");
    expect(serialized).not.toContain("DETAILED_VULNERABILITY_DESCRIPTION");
    expect(serialized).not.toContain("RAW_DATA_VALUE");
    expect(serialized).not.toContain("PATCH_DIFF_CONTENT");
    expect(serialized).not.toContain("MODIFIED_CONTENT_VALUE");
    expect(serialized).not.toContain("codeSnippet");
    expect(serialized).not.toContain("description");
    expect(serialized).not.toContain("rawData");
    expect(serialized).not.toContain("diff");
    expect(serialized).not.toContain("modifiedContent");
  });
});
