import * as fs from "fs";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { DependencyUpgradeStrategy } from "../../../src/patching/strategies/dependency-upgrade";
import { Finding } from "../../../src/types";

vi.mock("fs");

const mockedFs = vi.mocked(fs);

function makeDependencyFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    fingerprint: "fp-dep-1",
    scannerId: "osv-scanner",
    category: "dependencies",
    severity: "P0",
    title: "Vulnerability in lodash",
    description: "Prototype pollution in lodash",
    location: { file: "package.json", startLine: 1, endLine: 1 },
    codeSnippet: '"lodash": "4.17.20"',
    confidence: 0.9,
    confidenceFactors: [],
    dependency: {
      name: "lodash",
      ecosystem: "npm",
      installedVersion: "4.17.20",
      fixedVersion: "4.17.21",
    },
    ...overrides,
  };
}

describe("DependencyUpgradeStrategy", () => {
  const strategy = new DependencyUpgradeStrategy();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("generates auto-fix patch for patch version bump", async () => {
    const pkgJson = JSON.stringify(
      {
        dependencies: { lodash: "4.17.20" },
      },
      null,
      2,
    );
    mockedFs.readFileSync.mockReturnValue(pkgJson);

    const patch = await strategy.generate(makeDependencyFinding(), "/workdir");

    expect(patch.type).toBe("auto-fix");
    expect(patch.breakingRisk).toBe("none");
    expect(patch.fileChanges).toHaveLength(1);
    expect(patch.fileChanges[0]!.filePath).toBe("package.json");
    expect(patch.fileChanges[0]!.diff).toContain("4.17.21");
    expect(patch.rollbackSteps).toHaveLength(2);
  });

  it("marks minor version bump as low risk", async () => {
    const pkgJson = JSON.stringify(
      {
        dependencies: { lodash: "4.17.20" },
      },
      null,
      2,
    );
    mockedFs.readFileSync.mockReturnValue(pkgJson);

    const finding = makeDependencyFinding({
      dependency: {
        name: "lodash",
        ecosystem: "npm",
        installedVersion: "4.17.20",
        fixedVersion: "4.18.0",
      },
    });

    const patch = await strategy.generate(finding, "/workdir");
    expect(patch.breakingRisk).toBe("low");
  });

  it("marks major version bump as high risk", async () => {
    const pkgJson = JSON.stringify(
      {
        dependencies: { lodash: "4.17.20" },
      },
      null,
      2,
    );
    mockedFs.readFileSync.mockReturnValue(pkgJson);

    const finding = makeDependencyFinding({
      dependency: {
        name: "lodash",
        ecosystem: "npm",
        installedVersion: "4.17.20",
        fixedVersion: "5.0.0",
      },
    });

    const patch = await strategy.generate(finding, "/workdir");
    expect(patch.breakingRisk).toBe("high");
  });

  it("generates notification-only when no fix available", async () => {
    const finding = makeDependencyFinding({
      dependency: {
        name: "lodash",
        ecosystem: "npm",
        installedVersion: "4.17.20",
      },
    });

    const patch = await strategy.generate(finding, "/workdir");
    expect(patch.type).toBe("notification-only");
    expect(patch.fileChanges).toHaveLength(0);
  });

  it("adds indirect dependency to overrides", async () => {
    const pkgJson = JSON.stringify(
      {
        dependencies: { express: "4.18.0" },
      },
      null,
      2,
    );
    mockedFs.readFileSync.mockReturnValue(pkgJson);

    const finding = makeDependencyFinding({
      title: "Indirect vulnerability in qs",
      dependency: {
        name: "qs",
        ecosystem: "npm",
        installedVersion: "6.5.2",
        fixedVersion: "6.5.3",
      },
    });

    const patch = await strategy.generate(finding, "/workdir");
    expect(patch.type).toBe("auto-fix");
    expect(patch.fileChanges[0]!.diff).toContain("overrides");
    expect(patch.fileChanges[0]!.diff).toContain("qs");
  });

  it("updates devDependencies if found there", async () => {
    const pkgJson = JSON.stringify(
      {
        devDependencies: { lodash: "4.17.20" },
      },
      null,
      2,
    );
    mockedFs.readFileSync.mockReturnValue(pkgJson);

    const patch = await strategy.generate(makeDependencyFinding(), "/workdir");
    expect(patch.type).toBe("auto-fix");
    expect(patch.fileChanges[0]!.diff).toContain("4.17.21");
  });
});
