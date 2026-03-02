import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

import { describe, it, expect } from "vitest";

import { parseGitleaksOutput, extractSecretValues } from "../../../../src/scanners/gitleaks/parser";

const fixturePath = path.resolve(__dirname, "../../../fixtures/gitleaks-output.json");
const fixtureJson = fs.readFileSync(fixturePath, "utf-8");

describe("gitleaks parser", () => {
  describe("parseGitleaksOutput", () => {
    it("parses fixture into correct number of findings", () => {
      const findings = parseGitleaksOutput(fixtureJson);
      expect(findings).toHaveLength(4);
    });

    it("maps fields correctly for AWS access key finding", () => {
      const findings = parseGitleaksOutput(fixtureJson);
      const awsFinding = findings.find((f) => f.title.includes("AWS Access Key ID"))!;

      expect(awsFinding).toBeDefined();
      expect(awsFinding.scannerId).toBe("gitleaks");
      expect(awsFinding.category).toBe("secrets");
      expect(awsFinding.severity).toBe("P0");
      expect(awsFinding.location.file).toBe("src/config/aws.ts");
      expect(awsFinding.location.startLine).toBe(12);
      expect(awsFinding.location.endLine).toBe(12);
      expect(awsFinding.secretRuleId).toBe("aws-access-key-id");
    });

    it("generates deterministic fingerprints using SHA-256", () => {
      const findings = parseGitleaksOutput(fixtureJson);
      const awsFinding = findings.find((f) => f.title.includes("AWS Access Key ID"))!;

      const expectedFingerprint = crypto
        .createHash("sha256")
        .update("gitleaks:aws-access-key-id:src/config/aws.ts:12")
        .digest("hex");

      expect(awsFinding.fingerprint).toBe(expectedFingerprint);
    });

    it("produces unique fingerprints for different findings", () => {
      const findings = parseGitleaksOutput(fixtureJson);
      const fingerprints = findings.map((f) => f.fingerprint);
      const uniqueFingerprints = new Set(fingerprints);
      expect(uniqueFingerprints.size).toBe(fingerprints.length);
    });

    it("masks secret values in codeSnippet", () => {
      const findings = parseGitleaksOutput(fixtureJson);
      const ghFinding = findings.find((f) => f.title.includes("GitHub Personal Access Token"))!;

      expect(ghFinding.codeSnippet).not.toContain("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh");
      expect(ghFinding.codeSnippet).toContain("***");
    });

    it("includes entropy-based confidence factors when available", () => {
      const findings = parseGitleaksOutput(fixtureJson);
      const finding = findings[0]!;

      const entropyFactor = finding.confidenceFactors.find((f) => f.name === "entropy");
      expect(entropyFactor).toBeDefined();
      expect(entropyFactor!.reason).toContain("Shannon entropy");
    });

    it("assigns higher confidence when entropy is high", () => {
      const findings = parseGitleaksOutput(fixtureJson);
      const ghFinding = findings.find((f) => f.title.includes("GitHub Personal Access Token"))!;
      // GitHub PAT has entropy 4.521, which is > 3.5
      expect(ghFinding.confidence).toBe(0.95);
    });

    it("assigns lower confidence when entropy is low", () => {
      const findings = parseGitleaksOutput(fixtureJson);
      const testFinding = findings.find((f) => f.location.file.includes("mock-config"))!;
      // test placeholder key has entropy 3.2, which is <= 3.5
      expect(testFinding.confidence).toBe(0.85);
    });

    it("returns empty array for empty input", () => {
      expect(parseGitleaksOutput("")).toEqual([]);
      expect(parseGitleaksOutput("null")).toEqual([]);
    });

    it("preserves rawData from original entry", () => {
      const findings = parseGitleaksOutput(fixtureJson);
      const finding = findings[0]!;
      expect(finding.rawData).toBeDefined();
      expect((finding.rawData as any).RuleID).toBe("aws-access-key-id");
    });
  });

  describe("extractSecretValues", () => {
    it("extracts all secret values from fixture", () => {
      const secrets = extractSecretValues(fixtureJson);
      expect(secrets).toHaveLength(4);
      expect(secrets).toContain("AKIAIOSFODNN7EXAMPLE");
      expect(secrets).toContain("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh");
    });

    it("filters out short secrets (< 4 chars)", () => {
      const input = JSON.stringify([
        {
          RuleID: "test",
          Description: "test",
          StartLine: 1,
          EndLine: 1,
          StartColumn: 1,
          EndColumn: 5,
          Match: "abc",
          Secret: "abc",
          File: "test.txt",
        },
      ]);
      const secrets = extractSecretValues(input);
      expect(secrets).toHaveLength(0);
    });

    it("returns empty array for empty input", () => {
      expect(extractSecretValues("")).toEqual([]);
      expect(extractSecretValues("null")).toEqual([]);
    });
  });
});
