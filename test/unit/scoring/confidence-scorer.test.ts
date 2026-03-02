import { describe, it, expect } from "vitest";

import { ConfidenceScorer } from "../../../src/scoring/confidence-scorer";
import { Finding } from "../../../src/types";

function makeFinding(overrides: Partial<Finding>): Finding {
  return {
    fingerprint: "fp-1",
    scannerId: "test-scanner",
    category: "secrets",
    severity: "P0",
    title: "Test finding",
    description: "A test finding",
    location: { file: "src/app.ts", startLine: 10, endLine: 10 },
    codeSnippet: 'const key = "AKIAIOSFODNN7EXAMPLE"',
    confidence: 0,
    confidenceFactors: [],
    ...overrides,
  };
}

describe("ConfidenceScorer", () => {
  const scorer = new ConfidenceScorer();

  it("scores secrets findings with entropy, rule specificity, and context", () => {
    const findings = [
      makeFinding({
        category: "secrets",
        secretRuleId: "aws-access-key-id",
        codeSnippet: 'const key = "AKIAIOSFODNN7EXAMPLE"',
        location: { file: "src/config.ts", startLine: 5, endLine: 5 },
      }),
    ];

    const scored = scorer.score(findings);
    expect(scored).toHaveLength(1);
    expect(scored[0]!.confidence).toBeGreaterThan(0);
    expect(scored[0]!.confidence).toBeLessThanOrEqual(1);
    expect(scored[0]!.confidenceFactors.length).toBeGreaterThanOrEqual(3);

    const factorNames = scored[0]!.confidenceFactors.map((f) => f.name);
    expect(factorNames).toContain("entropy");
    expect(factorNames).toContain("ruleSpecificity");
    expect(factorNames).toContain("context");
  });

  it("deducts confidence for test files", () => {
    const prodFinding = makeFinding({
      category: "secrets",
      secretRuleId: "aws-access-key-id",
      location: { file: "src/config.ts", startLine: 5, endLine: 5 },
    });

    const testFinding = makeFinding({
      category: "secrets",
      secretRuleId: "aws-access-key-id",
      location: { file: "src/config.test.ts", startLine: 5, endLine: 5 },
    });

    const [prodScored] = scorer.score([prodFinding]);
    const [testScored] = scorer.score([testFinding]);

    expect(testScored!.confidence).toBeLessThan(prodScored!.confidence);
  });

  it("deducts confidence for placeholder values", () => {
    const realFinding = makeFinding({
      category: "secrets",
      secretRuleId: "aws-access-key-id",
      codeSnippet: 'const key = "AKIAIOSFODNN7EXAMPLE"',
    });

    const placeholderFinding = makeFinding({
      category: "secrets",
      secretRuleId: "aws-access-key-id",
      codeSnippet: 'const key = "PLACEHOLDER_VALUE_HERE"',
    });

    const [realScored] = scorer.score([realFinding]);
    const [placeholderScored] = scorer.score([placeholderFinding]);

    expect(placeholderScored!.confidence).toBeLessThan(realScored!.confidence);
  });

  it("scores dependency findings with fix available", () => {
    const findings = [
      makeFinding({
        category: "dependencies",
        severity: "P0",
        title: "Vulnerability in lodash",
        dependency: {
          name: "lodash",
          ecosystem: "npm",
          installedVersion: "4.17.20",
          fixedVersion: "4.17.21",
        },
      }),
    ];

    const scored = scorer.score(findings);
    expect(scored[0]!.confidence).toBeGreaterThan(0.5);
    const factorNames = scored[0]!.confidenceFactors.map((f) => f.name);
    expect(factorNames).toContain("cvss");
    expect(factorNames).toContain("fixAvailability");
    expect(factorNames).toContain("directVsIndirect");
  });

  it("caps dependency confidence when no fix available", () => {
    const findings = [
      makeFinding({
        category: "dependencies",
        severity: "P0",
        dependency: {
          name: "lodash",
          ecosystem: "npm",
          installedVersion: "4.17.20",
        },
      }),
    ];

    const scored = scorer.score(findings);
    expect(scored[0]!.confidence).toBeLessThanOrEqual(0.05);
  });

  it("scores xss findings by passing through existing factors", () => {
    const findings = [
      makeFinding({
        category: "xss",
        confidence: 0.85,
        confidenceFactors: [
          { name: "pattern", score: 0.85, reason: "dangerouslySetInnerHTML detected" },
        ],
      }),
    ];

    const scored = scorer.score(findings);
    expect(scored[0]!.confidence).toBe(0.85);
  });

  it("scores authz findings", () => {
    const findings = [
      makeFinding({
        category: "authz",
        codeSnippet: 'app.get("/admin", handler)',
      }),
    ];

    const scored = scorer.score(findings);
    expect(scored[0]!.confidence).toBeGreaterThan(0.5);
  });

  it("clamps confidence to [0, 1]", () => {
    // Create a finding with very high deductions
    const findings = [
      makeFinding({
        category: "secrets",
        secretRuleId: "generic",
        codeSnippet: "// PLACEHOLDER: your-key-here TODO",
        location: { file: "config.test.ts", startLine: 1, endLine: 1 },
      }),
    ];

    const scored = scorer.score(findings);
    expect(scored[0]!.confidence).toBeGreaterThanOrEqual(0);
    expect(scored[0]!.confidence).toBeLessThanOrEqual(1);
  });
});
