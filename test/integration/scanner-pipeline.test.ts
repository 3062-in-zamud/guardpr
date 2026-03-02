import { describe, it, expect, vi, beforeEach } from "vitest";

import { ScannerRegistry } from "../../src/scanners/registry";
import { ScannerRunner } from "../../src/scanners/runner";
import { MaskingLayer } from "../../src/utils/masking";
import { ScannerPlugin, GuardPRConfig } from "../../src/types";
import { createMockConfig, createMockFinding } from "../helpers";

vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
  setSecret: vi.fn(),
  debug: vi.fn(),
}));

function createMockScanner(overrides: Partial<ScannerPlugin> & { id: string }): ScannerPlugin {
  return {
    name: overrides.id,
    category: "xss",
    defaultSeverity: "P1",
    isAvailable: vi.fn().mockResolvedValue(true),
    scan: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe("Scanner Pipeline Integration", () => {
  let registry: ScannerRegistry;
  let maskingLayer: MaskingLayer;
  let config: GuardPRConfig;

  beforeEach(() => {
    registry = new ScannerRegistry();
    maskingLayer = new MaskingLayer();
    config = createMockConfig();
  });

  it("should run multiple scanners in parallel and collect results", async () => {
    const finding1 = createMockFinding({ fingerprint: "f1", scannerId: "scanner-a" });
    const finding2 = createMockFinding({ fingerprint: "f2", scannerId: "scanner-b" });

    const scannerA = createMockScanner({
      id: "scanner-a",
      scan: vi.fn().mockResolvedValue([finding1]),
    });
    const scannerB = createMockScanner({
      id: "scanner-b",
      scan: vi.fn().mockResolvedValue([finding2]),
    });

    registry.register(scannerA);
    registry.register(scannerB);

    const runner = new ScannerRunner(registry, maskingLayer);
    const results = await runner.runAll("/workspace", config, {
      timeoutMs: 10_000,
      enabledScanners: ["all"],
    });

    expect(results).toHaveLength(2);
    expect(results[0]!.findings).toHaveLength(1);
    expect(results[1]!.findings).toHaveLength(1);
    expect(results[0]!.status).toBe("success");
    expect(results[1]!.status).toBe("success");
  });

  it("should handle partial failure gracefully", async () => {
    const finding = createMockFinding({ fingerprint: "f1", scannerId: "good" });

    const goodScanner = createMockScanner({
      id: "good",
      scan: vi.fn().mockResolvedValue([finding]),
    });
    const badScanner = createMockScanner({
      id: "bad",
      scan: vi.fn().mockRejectedValue(new Error("Scanner crashed")),
    });

    registry.register(goodScanner);
    registry.register(badScanner);

    const runner = new ScannerRunner(registry, maskingLayer);
    const results = await runner.runAll("/workspace", config, {
      timeoutMs: 10_000,
      enabledScanners: ["all"],
    });

    expect(results).toHaveLength(2);
    const goodResult = results.find((r) => r.scannerId === "good");
    const badResult = results.find((r) => r.scannerId === "bad");

    expect(goodResult!.status).toBe("success");
    expect(goodResult!.findings).toHaveLength(1);
    expect(badResult!.status).toBe("failed");
    expect(badResult!.error).toContain("Scanner crashed");
  });

  it("should handle scanner timeout", async () => {
    const slowScanner = createMockScanner({
      id: "slow",
      scan: vi
        .fn()
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve([]), 5_000))),
    });

    registry.register(slowScanner);

    const runner = new ScannerRunner(registry, maskingLayer);
    const results = await runner.runAll("/workspace", config, {
      timeoutMs: 100,
      enabledScanners: ["all"],
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("failed");
    expect(results[0]!.error).toContain("timed out");
  });

  it("should install scanner if not available", async () => {
    const scanner = createMockScanner({
      id: "needs-install",
      isAvailable: vi.fn().mockResolvedValue(false),
      install: vi.fn().mockResolvedValue(undefined),
      scan: vi.fn().mockResolvedValue([]),
    });

    registry.register(scanner);

    const runner = new ScannerRunner(registry, maskingLayer);
    await runner.runAll("/workspace", config, {
      timeoutMs: 10_000,
      enabledScanners: ["all"],
    });

    expect(scanner.install).toHaveBeenCalled();
    expect(scanner.scan).toHaveBeenCalled();
  });

  it("should filter scanners by enabled list", async () => {
    const scannerA = createMockScanner({ id: "a", scan: vi.fn().mockResolvedValue([]) });
    const scannerB = createMockScanner({ id: "b", scan: vi.fn().mockResolvedValue([]) });

    registry.register(scannerA);
    registry.register(scannerB);

    const runner = new ScannerRunner(registry, maskingLayer);
    const results = await runner.runAll("/workspace", config, {
      timeoutMs: 10_000,
      enabledScanners: ["a"],
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.scannerId).toBe("a");
    expect(scannerB.scan).not.toHaveBeenCalled();
  });
});
