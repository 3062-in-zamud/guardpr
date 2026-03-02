import { describe, it, expect } from "vitest";

import { ScannerRegistry } from "../../../src/scanners/registry";
import type { ScannerPlugin } from "../../../src/types";

function makeMockScanner(overrides: Partial<ScannerPlugin> = {}): ScannerPlugin {
  return {
    id: "mock-scanner",
    name: "Mock Scanner",
    category: "secrets",
    defaultSeverity: "P1",
    isAvailable: async () => true,
    scan: async () => [],
    ...overrides,
  };
}

describe("ScannerRegistry", () => {
  it("registers and retrieves a scanner by id", () => {
    const registry = new ScannerRegistry();
    const scanner = makeMockScanner({ id: "test-scanner" });

    registry.register(scanner);

    expect(registry.get("test-scanner")).toBe(scanner);
  });

  it("returns undefined for unknown scanner id", () => {
    const registry = new ScannerRegistry();
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("lists all registered scanners", () => {
    const registry = new ScannerRegistry();
    const s1 = makeMockScanner({ id: "s1", name: "Scanner 1" });
    const s2 = makeMockScanner({ id: "s2", name: "Scanner 2" });
    const s3 = makeMockScanner({ id: "s3", name: "Scanner 3" });

    registry.register(s1);
    registry.register(s2);
    registry.register(s3);

    const all = registry.getAll();
    expect(all).toHaveLength(3);
    expect(all).toContain(s1);
    expect(all).toContain(s2);
    expect(all).toContain(s3);
  });

  it("filters scanners by category", () => {
    const registry = new ScannerRegistry();
    const secretsScanner = makeMockScanner({
      id: "secrets-1",
      category: "secrets",
    });
    const depScanner = makeMockScanner({
      id: "deps-1",
      category: "dependencies",
    });
    const xssScanner = makeMockScanner({
      id: "xss-1",
      category: "xss",
    });

    registry.register(secretsScanner);
    registry.register(depScanner);
    registry.register(xssScanner);

    const secrets = registry.getByCategory("secrets");
    expect(secrets).toHaveLength(1);
    expect(secrets[0]).toBe(secretsScanner);

    const deps = registry.getByCategory("dependencies");
    expect(deps).toHaveLength(1);
    expect(deps[0]).toBe(depScanner);

    const authz = registry.getByCategory("authz");
    expect(authz).toHaveLength(0);
  });

  it("overwrites scanner with same id on re-register", () => {
    const registry = new ScannerRegistry();
    const v1 = makeMockScanner({ id: "scanner", name: "V1" });
    const v2 = makeMockScanner({ id: "scanner", name: "V2" });

    registry.register(v1);
    registry.register(v2);

    expect(registry.get("scanner")).toBe(v2);
    expect(registry.getAll()).toHaveLength(1);
  });

  it("returns empty array when no scanners registered", () => {
    const registry = new ScannerRegistry();
    expect(registry.getAll()).toEqual([]);
    expect(registry.getByCategory("secrets")).toEqual([]);
  });
});
