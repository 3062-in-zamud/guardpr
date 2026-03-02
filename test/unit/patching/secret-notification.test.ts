import { describe, it, expect } from "vitest";

import { SecretNotificationStrategy } from "../../../src/patching/strategies/secret-notification";
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
    codeSnippet: 'const key = "***"',
    confidence: 0.95,
    confidenceFactors: [],
    secretRuleId: "aws-access-key-id",
    ...overrides,
  };
}

describe("SecretNotificationStrategy", () => {
  const strategy = new SecretNotificationStrategy();

  it("generates notification-only patch with no file changes", () => {
    const patch = strategy.generate([makeSecretFinding()]);

    expect(patch.type).toBe("notification-only");
    expect(patch.fileChanges).toHaveLength(0);
    expect(patch.status).toBe("tests-skipped");
    expect(patch.breakingRisk).toBe("none");
  });

  it("includes all finding fingerprints", () => {
    const findings = [
      makeSecretFinding({ fingerprint: "fp-1" }),
      makeSecretFinding({ fingerprint: "fp-2", secretRuleId: "github-pat" }),
    ];

    const patch = strategy.generate(findings);

    expect(patch.findingFingerprints).toEqual(["fp-1", "fp-2"]);
  });

  it("includes rotation instructions for AWS keys", () => {
    const patch = strategy.generate([makeSecretFinding()]);

    expect(patch.rationale).toContain("AWS IAM Console");
    expect(patch.rationale).toContain("manual rotation");
  });

  it("includes rotation instructions for GitHub PATs", () => {
    const patch = strategy.generate([makeSecretFinding({ secretRuleId: "github-pat" })]);

    expect(patch.rationale).toContain("GitHub Settings");
    expect(patch.rationale).toContain("Revoke");
  });

  it("provides generic rotation instructions for unknown secret types", () => {
    const patch = strategy.generate([makeSecretFinding({ secretRuleId: "custom-secret" })]);

    expect(patch.rationale).toContain("Generate a new secret");
    expect(patch.rationale).toContain("Revoke the old secret");
  });

  it("handles multiple findings in title", () => {
    const findings = [
      makeSecretFinding({ fingerprint: "fp-1" }),
      makeSecretFinding({ fingerprint: "fp-2" }),
    ];

    const patch = strategy.generate(findings);
    expect(patch.title).toContain("Secrets");
  });

  it("handles single finding in title", () => {
    const patch = strategy.generate([makeSecretFinding()]);
    expect(patch.title).toContain("Secret");
    expect(patch.title).not.toContain("Secrets");
  });
});
