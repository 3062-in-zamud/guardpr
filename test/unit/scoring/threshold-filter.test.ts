import { describe, it, expect } from "vitest";

import { filterByThreshold } from "../../../src/scoring/threshold-filter";
import { Finding } from "../../../src/types";

function makeFinding(confidence: number, fingerprint: string): Finding {
  return {
    fingerprint,
    scannerId: "test-scanner",
    category: "secrets",
    severity: "P0",
    title: `Finding ${fingerprint}`,
    description: "Test",
    location: { file: "test.ts", startLine: 1, endLine: 1 },
    codeSnippet: "test",
    confidence,
    confidenceFactors: [],
  };
}

describe("filterByThreshold", () => {
  it("splits findings by threshold", () => {
    const findings = [
      makeFinding(0.95, "fp-1"),
      makeFinding(0.5, "fp-2"),
      makeFinding(0.9, "fp-3"),
      makeFinding(0.1, "fp-4"),
    ];

    const result = filterByThreshold(findings, 0.9);

    expect(result.highConfidence).toHaveLength(2);
    expect(result.lowConfidence).toHaveLength(2);
    expect(result.highConfidence.map((f) => f.fingerprint)).toEqual(["fp-1", "fp-3"]);
    expect(result.lowConfidence.map((f) => f.fingerprint)).toEqual(["fp-2", "fp-4"]);
  });

  it("includes findings exactly at threshold in high confidence", () => {
    const findings = [makeFinding(0.9, "fp-1")];
    const result = filterByThreshold(findings, 0.9);

    expect(result.highConfidence).toHaveLength(1);
    expect(result.lowConfidence).toHaveLength(0);
  });

  it("handles empty findings", () => {
    const result = filterByThreshold([], 0.9);

    expect(result.highConfidence).toHaveLength(0);
    expect(result.lowConfidence).toHaveLength(0);
  });

  it("puts all findings in high confidence with threshold 0", () => {
    const findings = [makeFinding(0.1, "fp-1"), makeFinding(0.5, "fp-2")];

    const result = filterByThreshold(findings, 0);

    expect(result.highConfidence).toHaveLength(2);
    expect(result.lowConfidence).toHaveLength(0);
  });

  it("puts all findings in low confidence with threshold 1.0 when none reach it", () => {
    const findings = [makeFinding(0.1, "fp-1"), makeFinding(0.99, "fp-2")];

    const result = filterByThreshold(findings, 1.0);

    expect(result.highConfidence).toHaveLength(0);
    expect(result.lowConfidence).toHaveLength(2);
  });
});
