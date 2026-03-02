import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";

import { MaskingLayer } from "../../../src/masking/masking-layer";
import { Finding } from "../../../src/types/finding";

vi.mock("@actions/core", () => ({
  setSecret: vi.fn(),
}));

describe("MaskingLayer", () => {
  let layer: MaskingLayer;

  beforeEach(() => {
    vi.restoreAllMocks();
    layer = new MaskingLayer();
  });

  describe("registerSecrets", () => {
    it("calls core.setSecret for each value", () => {
      layer.registerSecrets(["secret1", "secret2"]);

      expect(core.setSecret).toHaveBeenCalledTimes(2);
      expect(core.setSecret).toHaveBeenCalledWith("secret1");
      expect(core.setSecret).toHaveBeenCalledWith("secret2");
    });

    it("handles empty array", () => {
      layer.registerSecrets([]);
      expect(core.setSecret).not.toHaveBeenCalled();
    });
  });

  describe("maskOutput", () => {
    it("masks secrets in text and registers them", () => {
      const text = "Found key: AKIAIOSFODNN7EXAMPLE";
      const masked = layer.maskOutput(text);

      expect(masked).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(core.setSecret).toHaveBeenCalledWith("AKIAIOSFODNN7EXAMPLE");
    });

    it("returns text unchanged when no secrets found", () => {
      const text = "Normal log message";
      const masked = layer.maskOutput(text);

      expect(masked).toBe(text);
      expect(core.setSecret).not.toHaveBeenCalled();
    });
  });

  describe("maskFinding", () => {
    it("masks codeSnippet and registers secrets", () => {
      const finding: Finding = {
        fingerprint: "abc123",
        scannerId: "secrets-scanner",
        category: "secrets",
        severity: "P0",
        title: "AWS Key Found",
        description: "Hardcoded AWS access key",
        location: { file: "config.ts", startLine: 10, endLine: 10 },
        codeSnippet: 'const key = "AKIAIOSFODNN7EXAMPLE";',
        confidence: 0.95,
        confidenceFactors: [],
      };

      const masked = layer.maskFinding(finding);

      expect(masked.codeSnippet).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(core.setSecret).toHaveBeenCalled();
      // Original should not be mutated
      expect(finding.codeSnippet).toContain("AKIAIOSFODNN7EXAMPLE");
    });

    it("masks rawData when present", () => {
      const finding: Finding = {
        fingerprint: "abc123",
        scannerId: "secrets-scanner",
        category: "secrets",
        severity: "P0",
        title: "AWS Key Found",
        description: "Hardcoded AWS access key",
        location: { file: "config.ts", startLine: 10, endLine: 10 },
        codeSnippet: "clean snippet",
        confidence: 0.95,
        confidenceFactors: [],
        rawData: { match: "AKIAIOSFODNN7EXAMPLE" },
      };

      const masked = layer.maskFinding(finding);

      expect(JSON.stringify(masked.rawData)).not.toContain("AKIAIOSFODNN7EXAMPLE");
    });
  });

  describe("maskAuditLog", () => {
    it("deep-masks all string values in the audit log", () => {
      const log = {
        version: "1.0" as const,
        timestamp: "2024-01-01T00:00:00Z",
        guardprVersion: "0.1.0",
        github: {
          repository: "owner/repo",
          sha: "abc123",
          ref: "refs/heads/main",
          actor: "user",
          runId: 1,
          runAttempt: 1,
          eventName: "push",
        },
        toolVersions: {},
        rulesetHash: "hash",
        config: {},
        scanResults: [],
        allFindings: [],
        highConfidenceFindings: [],
        lowConfidenceFindings: [],
        patches: [],
        prCreated: false,
        totalDurationMs: 1000,
        errors: ["Error with key AKIAIOSFODNN7EXAMPLE"],
        checksum: "checksum",
      };

      const masked = layer.maskAuditLog(log);

      expect(JSON.stringify(masked)).not.toContain("AKIAIOSFODNN7EXAMPLE");
      expect(core.setSecret).toHaveBeenCalled();
    });
  });
});
