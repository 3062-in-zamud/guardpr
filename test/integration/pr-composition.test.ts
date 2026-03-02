import { describe, it, expect, vi } from "vitest";

import { PRComposer } from "../../src/pr/composer";
import { createMockFinding, createSecretFinding, createMockPatch } from "../helpers";

vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
}));

describe("PR Composition Integration", () => {
  const composer = new PRComposer();

  it("should compose a complete PR from findings and patches", () => {
    const findings = [
      createMockFinding({ fingerprint: "f1", title: "XSS in app.tsx" }),
      createSecretFinding({ fingerprint: "f2" }),
    ];
    const patches = [
      createMockPatch({
        findingFingerprints: ["f1"],
        type: "auto-fix",
        status: "tests-passed",
      }),
      createMockPatch({
        findingFingerprints: ["f2"],
        type: "notification-only",
        fileChanges: [],
        status: "tests-skipped",
      }),
    ];

    const result = composer.compose({
      findings,
      lowConfidenceFindings: [],
      patches,
      context: { runId: 12345, sha: "abcdef1234567890", version: "0.1.0" },
    });

    expect(result.title).toContain("2 vulnerabilities");
    expect(result.branchName).toBe("guardpr/fix-12345-abcdef12");
    expect(result.labels).toContain("guardpr");
    expect(result.body).toContain("## Summary");
    expect(result.body).toContain("XSS in app.tsx");
    expect(result.body).toContain("Secrets Detected");
  });

  it("should generate correct branch name from context", () => {
    const result = composer.compose({
      findings: [createMockFinding()],
      lowConfidenceFindings: [],
      patches: [],
      context: { runId: 99999, sha: "deadbeef12345678", version: "0.1.0" },
    });

    expect(result.branchName).toBe("guardpr/fix-99999-deadbeef");
  });

  it("should include below-threshold findings in body", () => {
    const result = composer.compose({
      findings: [createMockFinding({ fingerprint: "high1" })],
      lowConfidenceFindings: [createMockFinding({ fingerprint: "low1", confidence: 0.6 })],
      patches: [],
      context: { runId: 1, sha: "abc12345", version: "0.1.0" },
    });

    expect(result.body).toContain("Below-Threshold");
  });

  it("should handle single vulnerability correctly in title", () => {
    const result = composer.compose({
      findings: [createMockFinding()],
      lowConfidenceFindings: [],
      patches: [],
      context: { runId: 1, sha: "abc12345", version: "0.1.0" },
    });

    expect(result.title).toContain("1 vulnerability ");
    expect(result.title).not.toContain("vulnerabilities");
  });

  it("should include review checklist in PR body", () => {
    const result = composer.compose({
      findings: [createMockFinding()],
      lowConfidenceFindings: [],
      patches: [],
      context: { runId: 1, sha: "abc12345", version: "0.1.0" },
    });

    expect(result.body).toContain("Review Checklist");
    expect(result.body).toContain("Verified that all auto-fix patches are correct");
  });

  it("should include fingerprints comment for deduplication", () => {
    const result = composer.compose({
      findings: [createMockFinding({ fingerprint: "unique-fp-123" })],
      lowConfidenceFindings: [],
      patches: [],
      context: { runId: 1, sha: "abc12345", version: "0.1.0" },
    });

    expect(result.body).toContain("guardpr-fingerprints:");
    expect(result.body).toContain("unique-fp-123");
  });
});
