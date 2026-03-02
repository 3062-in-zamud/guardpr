import { describe, it, expect, vi, beforeEach } from "vitest";

import { ScannerRegistry } from "../../src/scanners/registry";
import { ScannerRunner } from "../../src/scanners/runner";
import { MaskingLayer } from "../../src/utils/masking";
import { ConfidenceScorer } from "../../src/scoring/confidence-scorer";
import { ScannerPlugin, Finding, GuardPRConfig } from "../../src/types";
import { createMockConfig, createMockFinding } from "../helpers";

vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
  setSecret: vi.fn(),
  debug: vi.fn(),
}));

describe("Scanner Independence", () => {
  let registry: ScannerRegistry;
  let maskingLayer: MaskingLayer;
  let config: GuardPRConfig;

  beforeEach(() => {
    registry = new ScannerRegistry();
    maskingLayer = new MaskingLayer();
    config = createMockConfig();
  });

  it("should produce unique fingerprints across scanners", async () => {
    const findingA: Finding = createMockFinding({
      fingerprint: "scanner-a-fingerprint",
      scannerId: "scanner-a",
      category: "secrets",
    });
    const findingB: Finding = createMockFinding({
      fingerprint: "scanner-b-fingerprint",
      scannerId: "scanner-b",
      category: "xss",
    });

    const scannerA: ScannerPlugin = {
      id: "scanner-a",
      name: "Scanner A",
      category: "secrets",
      defaultSeverity: "P0",
      isAvailable: vi.fn().mockResolvedValue(true),
      scan: vi.fn().mockResolvedValue([findingA]),
    };
    const scannerB: ScannerPlugin = {
      id: "scanner-b",
      name: "Scanner B",
      category: "xss",
      defaultSeverity: "P1",
      isAvailable: vi.fn().mockResolvedValue(true),
      scan: vi.fn().mockResolvedValue([findingB]),
    };

    registry.register(scannerA);
    registry.register(scannerB);

    const runner = new ScannerRunner(registry, maskingLayer);
    const results = await runner.runAll("/workspace", config, {
      timeoutMs: 10_000,
      enabledScanners: ["all"],
    });

    const allFindings = results.flatMap((r) => r.findings);
    const fingerprints = new Set(allFindings.map((f) => f.fingerprint));
    expect(fingerprints.size).toBe(allFindings.length);
  });

  it("should not let one scanner failure affect others", async () => {
    const findingGood: Finding = createMockFinding({
      fingerprint: "good-fp",
      scannerId: "good-scanner",
    });

    const goodScanner: ScannerPlugin = {
      id: "good-scanner",
      name: "Good Scanner",
      category: "xss",
      defaultSeverity: "P1",
      isAvailable: vi.fn().mockResolvedValue(true),
      scan: vi.fn().mockResolvedValue([findingGood]),
    };

    const badScanner: ScannerPlugin = {
      id: "bad-scanner",
      name: "Bad Scanner",
      category: "secrets",
      defaultSeverity: "P0",
      isAvailable: vi.fn().mockResolvedValue(true),
      scan: vi.fn().mockRejectedValue(new Error("Catastrophic failure")),
    };

    const slowScanner: ScannerPlugin = {
      id: "slow-scanner",
      name: "Slow Scanner",
      category: "dependencies",
      defaultSeverity: "P1",
      isAvailable: vi.fn().mockResolvedValue(true),
      scan: vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve([createMockFinding({ scannerId: "slow-scanner" })]), 50),
            ),
        ),
    };

    registry.register(goodScanner);
    registry.register(badScanner);
    registry.register(slowScanner);

    const runner = new ScannerRunner(registry, maskingLayer);
    const results = await runner.runAll("/workspace", config, {
      timeoutMs: 10_000,
      enabledScanners: ["all"],
    });

    expect(results).toHaveLength(3);

    const good = results.find((r) => r.scannerId === "good-scanner");
    const bad = results.find((r) => r.scannerId === "bad-scanner");
    const slow = results.find((r) => r.scannerId === "slow-scanner");

    expect(good!.status).toBe("success");
    expect(good!.findings).toHaveLength(1);
    expect(bad!.status).toBe("failed");
    expect(slow!.status).toBe("success");
    expect(slow!.findings).toHaveLength(1);
  });

  it("should score findings independently per category", async () => {
    const findings = [
      createMockFinding({
        category: "secrets",
        confidence: 0,
        confidenceFactors: [],
      }),
      createMockFinding({
        category: "xss",
        fingerprint: "xss-fp",
        confidence: 0,
        confidenceFactors: [],
      }),
      createMockFinding({
        category: "dependencies",
        fingerprint: "dep-fp",
        confidence: 0,
        confidenceFactors: [],
        dependency: {
          name: "lodash",
          ecosystem: "npm",
          installedVersion: "4.17.20",
          fixedVersion: "4.17.21",
        },
      }),
    ];

    const scorer = new ConfidenceScorer();
    const scored = scorer.score(findings);

    // Each finding should be scored based on its own category
    expect(scored).toHaveLength(3);
    for (const finding of scored) {
      expect(finding.confidenceFactors.length).toBeGreaterThan(0);
      expect(finding.confidence).toBeGreaterThanOrEqual(0);
      expect(finding.confidence).toBeLessThanOrEqual(1);
    }
  });
});
