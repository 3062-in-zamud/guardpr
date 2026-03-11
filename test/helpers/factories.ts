import { Finding, Patch, ScanResult } from "../../src/types";

export function makeFinding(overrides: Partial<Finding> = {}): Finding {
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

export function makePatch(overrides: Partial<Patch> = {}): Patch {
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

export function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    scannerId: "test-scanner",
    status: "success",
    findings: [makeFinding()],
    durationMs: 1500,
    exitCode: 0,
    ...overrides,
  };
}

export interface NotificationContext {
  highConfidenceCount: number;
  lowConfidenceCount: number;
  bySeverity: { P0: number; P1: number; P2: number };
  prUrl?: string;
  prNumber?: number;
  repository: string;
  runId: number;
}

export function makeNotificationContext(overrides: Partial<NotificationContext> = {}): NotificationContext {
  return {
    highConfidenceCount: 3,
    lowConfidenceCount: 1,
    bySeverity: { P0: 1, P1: 1, P2: 1 },
    repository: "owner/repo",
    runId: 123,
    ...overrides,
  };
}
