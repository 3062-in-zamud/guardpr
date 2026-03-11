import * as path from "path";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { loadSarifFile } from "../../../src/sarif/loader";

const fixturesDir = path.resolve(__dirname, "../../fixtures/sarif");

beforeEach(() => {
  vi.stubEnv("GITHUB_WORKSPACE", path.resolve(__dirname, "../../.."));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadSarifFile", () => {
  it("loads minimal.sarif.json and returns 1 finding", () => {
    const findings = loadSarifFile(path.join(fixturesDir, "minimal.sarif.json"));
    expect(findings).toHaveLength(1);
    expect(findings[0].scannerId).toBe("sarif:TestTool");
    expect(findings[0].severity).toBe("P1");
  });

  it("loads multi-result.sarif.json and returns 3 findings", () => {
    const findings = loadSarifFile(path.join(fixturesDir, "multi-result.sarif.json"));
    expect(findings).toHaveLength(3);
    expect(findings[0].severity).toBe("P0");
    expect(findings[1].severity).toBe("P1");
    expect(findings[2].severity).toBe("P2");
  });

  it("throws on invalid-version.sarif.json", () => {
    expect(() => loadSarifFile(path.join(fixturesDir, "invalid-version.sarif.json"))).toThrow(
      "Invalid SARIF",
    );
  });

  it("throws on malformed.json", () => {
    expect(() => loadSarifFile(path.join(fixturesDir, "malformed.json"))).toThrow("Invalid JSON");
  });

  it("throws on non-existent file", () => {
    expect(() => loadSarifFile(path.join(fixturesDir, "does-not-exist.sarif.json"))).toThrow(
      "SARIF file not found",
    );
  });

  it("returns empty array for no-results.sarif.json", () => {
    const findings = loadSarifFile(path.join(fixturesDir, "no-results.sarif.json"));
    expect(findings).toHaveLength(0);
  });

  it("rejects path traversal outside workspace", () => {
    expect(() => loadSarifFile("/etc/passwd")).toThrow("must be within the workspace");
  });
});
