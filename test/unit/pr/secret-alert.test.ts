import { describe, it, expect } from "vitest";

import { renderSecretAlert } from "../../../src/pr/templates/secret-alert";
import { Finding } from "../../../src/types";

function makeSecretFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    fingerprint: "fp-secret-1",
    scannerId: "gitleaks",
    category: "secrets",
    severity: "P0",
    title: "AWS Access Key detected",
    description: "AWS access key found in source code",
    location: { file: "src/config.ts", startLine: 10, endLine: 10 },
    codeSnippet: 'const key = "AKIAIOSFODNN7EXAMPLE"',
    confidence: 0.95,
    confidenceFactors: [],
    secretRuleId: "aws-access-key-id",
    ...overrides,
  };
}

describe("renderSecretAlert", () => {
  it("renders a warning header", () => {
    const output = renderSecretAlert([makeSecretFinding()]);
    expect(output).toContain(":warning:");
    expect(output).toContain("Secrets Detected");
    expect(output).toContain("Manual Action Required");
  });

  it("states that secret values are not included", () => {
    const output = renderSecretAlert([makeSecretFinding()]);
    expect(output).toContain("NOT included in this PR for security reasons");
  });

  it("does not contain the actual secret value", () => {
    const output = renderSecretAlert([
      makeSecretFinding({
        codeSnippet: 'const key = "AKIAIOSFODNN7EXAMPLE_REAL_SECRET"',
      }),
    ]);
    expect(output).not.toContain("AKIAIOSFODNN7EXAMPLE_REAL_SECRET");
  });

  it("renders a table with finding details", () => {
    const output = renderSecretAlert([
      makeSecretFinding({
        location: { file: "src/config.ts", startLine: 10, endLine: 10 },
        secretRuleId: "aws-access-key-id",
      }),
    ]);

    expect(output).toContain("| # | Type | File | Line | Action Required |");
    expect(output).toContain("| 1 |");
    expect(output).toContain("`src/config.ts`");
    expect(output).toContain("10");
  });

  it("includes rotation action for AWS keys", () => {
    const output = renderSecretAlert([makeSecretFinding()]);
    expect(output).toContain("AWS IAM Console");
  });

  it("includes rotation action for GitHub PATs", () => {
    const output = renderSecretAlert([makeSecretFinding({ secretRuleId: "github-pat" })]);
    expect(output).toContain("GitHub Settings");
  });

  it("renders multiple findings as table rows", () => {
    const output = renderSecretAlert([
      makeSecretFinding({ fingerprint: "fp-1", secretRuleId: "aws-access-key" }),
      makeSecretFinding({
        fingerprint: "fp-2",
        secretRuleId: "github-pat",
        location: { file: "src/auth.ts", startLine: 25, endLine: 25 },
      }),
    ]);

    expect(output).toContain("| 1 |");
    expect(output).toContain("| 2 |");
    expect(output).toContain("`src/config.ts`");
    expect(output).toContain("`src/auth.ts`");
  });

  it("returns empty string for no findings", () => {
    const output = renderSecretAlert([]);
    expect(output).toBe("");
  });
});
