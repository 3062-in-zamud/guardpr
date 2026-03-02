import { describe, it, expect, vi, beforeEach } from "vitest";

import { ScannerRegistry } from "../../../src/scanners/registry";
import { ScannerRunner, RunnerOptions } from "../../../src/scanners/runner";
import type { ScannerPlugin, Finding, GuardPRConfig } from "../../../src/types";
import { MaskingLayer } from "../../../src/utils/masking";

// Mock @actions/core
vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
  setSecret: vi.fn(),
}));

const mockConfig: GuardPRConfig = {
  configPath: ".guardpr.yml",
  confidenceThreshold: 0.9,
  createPr: true,
  runTests: true,
  testCommand: "npm test",
  scanners: {
    secrets: { enabled: true, maxTargetMegabytes: 10 },
    dependencies: { enabled: true },
    xss: { enabled: true, customSanitizers: [] },
    authz: {
      enabled: true,
      protectedRoutes: [],
      authMiddleware: [],
      framework: "auto",
    },
  },
  patching: { maxLinesPerPatch: 50, maxFilesPerPatch: 5 },
  githubToken: "",
};

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    fingerprint: "abc123",
    scannerId: "test",
    category: "secrets",
    severity: "P0",
    title: "Test finding",
    description: "A test finding",
    location: { file: "test.ts", startLine: 1, endLine: 1 },
    codeSnippet: "const x = 'secret'",
    confidence: 0.95,
    confidenceFactors: [],
    ...overrides,
  };
}

function makeMockScanner(overrides: Partial<ScannerPlugin> = {}): ScannerPlugin {
  return {
    id: "mock",
    name: "Mock",
    category: "secrets",
    defaultSeverity: "P1",
    isAvailable: async () => true,
    scan: async () => [],
    ...overrides,
  };
}

describe("ScannerRunner", () => {
  let registry: ScannerRegistry;
  let maskingLayer: MaskingLayer;
  let runner: ScannerRunner;

  beforeEach(() => {
    registry = new ScannerRegistry();
    maskingLayer = new MaskingLayer();
    runner = new ScannerRunner(registry, maskingLayer);
  });

  it("runs all registered scanners in parallel", async () => {
    const findings1 = [makeFinding({ fingerprint: "f1", scannerId: "s1" })];
    const findings2 = [makeFinding({ fingerprint: "f2", scannerId: "s2" })];

    const s1 = makeMockScanner({
      id: "s1",
      name: "Scanner 1",
      scan: async () => findings1,
    });
    const s2 = makeMockScanner({
      id: "s2",
      name: "Scanner 2",
      scan: async () => findings2,
    });

    registry.register(s1);
    registry.register(s2);

    const results = await runner.runAll("/tmp/work", mockConfig);

    expect(results).toHaveLength(2);
    expect(results[0].scannerId).toBe("s1");
    expect(results[0].findings).toEqual(findings1);
    expect(results[0].status).toBe("success");
    expect(results[1].scannerId).toBe("s2");
    expect(results[1].findings).toEqual(findings2);
  });

  it("handles scanner timeout", async () => {
    const slowScanner = makeMockScanner({
      id: "slow",
      name: "Slow Scanner",
      scan: async () => {
        return new Promise((resolve) => {
          setTimeout(() => resolve([]), 5000);
        });
      },
    });

    registry.register(slowScanner);

    const options: RunnerOptions = {
      timeoutMs: 50,
      enabledScanners: ["all"],
    };

    const results = await runner.runAll("/tmp/work", mockConfig, options);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
    expect(results[0].exitCode).toBe(-1);
    expect(results[0].error).toContain("timed out");
  });

  it("handles partial failure - one scanner crashes, others succeed", async () => {
    const goodScanner = makeMockScanner({
      id: "good",
      name: "Good Scanner",
      scan: async () => [makeFinding({ fingerprint: "good-f1", scannerId: "good" })],
    });
    const badScanner = makeMockScanner({
      id: "bad",
      name: "Bad Scanner",
      scan: async () => {
        throw new Error("Scanner crashed!");
      },
    });

    registry.register(goodScanner);
    registry.register(badScanner);

    const results = await runner.runAll("/tmp/work", mockConfig);

    expect(results).toHaveLength(2);

    const goodResult = results.find((r) => r.scannerId === "good")!;
    const badResult = results.find((r) => r.scannerId === "bad")!;

    expect(goodResult.status).toBe("success");
    expect(goodResult.findings).toHaveLength(1);
    expect(goodResult.exitCode).toBe(0);

    expect(badResult.status).toBe("failed");
    expect(badResult.findings).toEqual([]);
    expect(badResult.exitCode).toBe(-1);
    expect(badResult.error).toContain("Scanner crashed!");
  });

  it("filters scanners by enabledScanners list", async () => {
    const s1 = makeMockScanner({
      id: "s1",
      scan: async () => [makeFinding({ scannerId: "s1" })],
    });
    const s2 = makeMockScanner({
      id: "s2",
      scan: async () => [makeFinding({ scannerId: "s2" })],
    });
    const s3 = makeMockScanner({
      id: "s3",
      scan: async () => [makeFinding({ scannerId: "s3" })],
    });

    registry.register(s1);
    registry.register(s2);
    registry.register(s3);

    const options: RunnerOptions = {
      timeoutMs: 300_000,
      enabledScanners: ["s1", "s3"],
    };

    const results = await runner.runAll("/tmp/work", mockConfig, options);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.scannerId)).toEqual(["s1", "s3"]);
  });

  it("installs scanner if not available and installer exists", async () => {
    const installFn = vi.fn();
    const scanner = makeMockScanner({
      id: "installable",
      name: "Installable",
      isAvailable: async () => false,
      install: installFn,
      scan: async () => [],
    });

    registry.register(scanner);

    const results = await runner.runAll("/tmp/work", mockConfig);

    expect(installFn).toHaveBeenCalledWith("/tmp/work");
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("success");
  });

  it("returns failed result when scanner not available and no installer", async () => {
    const scanner = makeMockScanner({
      id: "unavailable",
      name: "Unavailable",
      isAvailable: async () => false,
      install: undefined,
    });

    registry.register(scanner);

    const results = await runner.runAll("/tmp/work", mockConfig);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
    expect(results[0].error).toContain("not available");
  });

  it("returns empty results when no scanners are registered", async () => {
    const results = await runner.runAll("/tmp/work", mockConfig);
    expect(results).toEqual([]);
  });
});
