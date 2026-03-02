import { describe, it, expect } from "vitest";

import { renderPRBody } from "../../../src/pr/templates/pr-body";
import { Finding, Patch } from "../../../src/types";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    fingerprint: "fp-1",
    scannerId: "test-scanner",
    category: "dependencies",
    severity: "P1",
    cwe: "CWE-1234",
    title: "Test vulnerability",
    description: "A test vulnerability",
    location: { file: "src/app.ts", startLine: 10, endLine: 10 },
    codeSnippet: "vulnerable code here",
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
    rationale: "Upgrade to fix CVE",
    rollbackSteps: ["Revert package.json"],
    fileChanges: [
      { filePath: "package.json", diff: "+fixed\n-vulnerable\n", changeType: "modify" },
    ],
    status: "tests-passed",
    breakingRisk: "low",
    ...overrides,
  };
}

describe("renderPRBody", () => {
  it("renders summary with counts", () => {
    const body = renderPRBody({
      findings: [makeFinding()],
      lowConfidenceFindings: [makeFinding({ fingerprint: "fp-low", confidence: 0.5 })],
      patches: [makePatch()],
      runId: 12345,
      sha: "abc12345def67890",
      version: "0.1.0",
    });

    expect(body).toContain("## Summary");
    expect(body).toContain("**1** high-confidence");
    expect(body).toContain("**1** below-threshold");
  });

  it("renders finding cards for high-confidence findings", () => {
    const body = renderPRBody({
      findings: [makeFinding({ title: "SQL Injection" })],
      lowConfidenceFindings: [],
      patches: [makePatch()],
      runId: 1,
      sha: "abcdef12",
      version: "0.1.0",
    });

    expect(body).toContain("SQL Injection");
    expect(body).toContain("## Findings");
  });

  it("renders below-threshold findings table", () => {
    const body = renderPRBody({
      findings: [],
      lowConfidenceFindings: [
        makeFinding({
          fingerprint: "fp-low",
          confidence: 0.5,
          title: "Low confidence issue",
        }),
      ],
      patches: [],
      runId: 1,
      sha: "abcdef12",
      version: "0.1.0",
    });

    expect(body).toContain("## Below-Threshold Findings");
    expect(body).toContain("Low confidence issue");
    expect(body).toContain("50%");
  });

  it("renders review checklist", () => {
    const body = renderPRBody({
      findings: [makeFinding()],
      lowConfidenceFindings: [],
      patches: [],
      runId: 1,
      sha: "abcdef12",
      version: "0.1.0",
    });

    expect(body).toContain("## Review Checklist");
    expect(body).toContain("- [ ]");
  });

  it("renders audit footer with version and run info", () => {
    const body = renderPRBody({
      findings: [makeFinding()],
      lowConfidenceFindings: [],
      patches: [],
      runId: 42,
      sha: "abc12345def67890",
      version: "0.1.0",
    });

    expect(body).toContain("v0.1.0");
    expect(body).toContain("Run ID: 42");
    expect(body).toContain("abc12345");
  });

  it("includes hidden fingerprints comment for deduplication", () => {
    const body = renderPRBody({
      findings: [makeFinding({ fingerprint: "fp-high" })],
      lowConfidenceFindings: [makeFinding({ fingerprint: "fp-low" })],
      patches: [],
      runId: 1,
      sha: "abcdef12",
      version: "0.1.0",
    });

    expect(body).toContain("<!-- guardpr-fingerprints:fp-high,fp-low -->");
  });

  it("renders secret alert section for secret findings", () => {
    const body = renderPRBody({
      findings: [
        makeFinding({
          category: "secrets",
          title: "AWS Key",
          secretRuleId: "aws-access-key",
        }),
      ],
      lowConfidenceFindings: [],
      patches: [],
      runId: 1,
      sha: "abcdef12",
      version: "0.1.0",
    });

    expect(body).toContain("Secrets Detected");
    expect(body).toContain("Manual Action Required");
  });

  it("renders auto-fix and notification counts", () => {
    const body = renderPRBody({
      findings: [makeFinding()],
      lowConfidenceFindings: [],
      patches: [
        makePatch({ type: "auto-fix" }),
        makePatch({ type: "notification-only", findingFingerprints: ["fp-2"] }),
      ],
      runId: 1,
      sha: "abcdef12",
      version: "0.1.0",
    });

    expect(body).toContain("Auto-fix patches**: 1");
    expect(body).toContain("Notification-only**: 1");
  });
});
