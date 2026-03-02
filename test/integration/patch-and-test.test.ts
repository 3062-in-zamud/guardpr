import { describe, it, expect, vi, beforeEach } from "vitest";

import { PatchEngine } from "../../src/patching/patch-engine";
import { PatchValidator } from "../../src/patching/patch-validator";
import { Patch, PatchingConfig } from "../../src/types";
import { createMockFinding, createSecretFinding, createDependencyFinding } from "../helpers";

vi.mock("@actions/core", () => ({
  info: vi.fn(),
  warning: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
}));

vi.mock("../../src/utils/logger", () => ({
  info: vi.fn(),
  warn: vi.fn(),
  startGroup: vi.fn(),
  endGroup: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));

describe("Patch Generation and Validation Integration", () => {
  let patchEngine: PatchEngine;
  let validator: PatchValidator;

  beforeEach(() => {
    patchEngine = new PatchEngine();
    validator = new PatchValidator();
  });

  it("should generate notification-only patch for secrets", async () => {
    const secretFinding = createSecretFinding();
    const patches = await patchEngine.generatePatches([secretFinding], "/workspace");

    expect(patches).toHaveLength(1);
    expect(patches[0]!.type).toBe("notification-only");
    expect(patches[0]!.fileChanges).toHaveLength(0);
    expect(patches[0]!.findingFingerprints).toContain(secretFinding.fingerprint);
  });

  it("should group multiple secret findings into one notification", async () => {
    const secret1 = createSecretFinding({ fingerprint: "s1", title: "AWS Key" });
    const secret2 = createSecretFinding({ fingerprint: "s2", title: "GitHub PAT" });

    const patches = await patchEngine.generatePatches([secret1, secret2], "/workspace");

    expect(patches).toHaveLength(1);
    expect(patches[0]!.type).toBe("notification-only");
    expect(patches[0]!.findingFingerprints).toContain("s1");
    expect(patches[0]!.findingFingerprints).toContain("s2");
  });

  it("should generate separate patches for different categories", async () => {
    const secret = createSecretFinding({ fingerprint: "s1" });
    const xss = createMockFinding({ fingerprint: "x1", category: "xss" });

    const patches = await patchEngine.generatePatches([secret, xss], "/workspace");

    expect(patches.length).toBeGreaterThanOrEqual(2);
    const secretPatch = patches.find((p) => p.type === "notification-only");
    const xssPatch = patches.find((p) => p.findingFingerprints.includes("x1"));

    expect(secretPatch).toBeDefined();
    expect(xssPatch).toBeDefined();
  });

  it("should validate patch within size limits", () => {
    const config: PatchingConfig = { maxLinesPerPatch: 50, maxFilesPerPatch: 5 };
    const smallPatch: Patch = {
      findingFingerprints: ["f1"],
      title: "Small fix",
      type: "auto-fix",
      rationale: "Quick fix",
      rollbackSteps: [],
      fileChanges: [
        {
          filePath: "src/app.ts",
          diff: "+line1\n+line2\n+line3",
          changeType: "modify",
        },
      ],
      status: "pending",
      breakingRisk: "none",
    };

    const result = validator.validate(smallPatch, config);
    expect(result.valid).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("should reject patch exceeding line limit", () => {
    const config: PatchingConfig = { maxLinesPerPatch: 5, maxFilesPerPatch: 5 };
    const bigPatch: Patch = {
      findingFingerprints: ["f1"],
      title: "Big fix",
      type: "auto-fix",
      rationale: "Large change",
      rollbackSteps: [],
      fileChanges: [
        {
          filePath: "src/app.ts",
          diff: Array.from({ length: 20 }, (_, i) => `+line${i}`).join("\n"),
          changeType: "modify",
        },
      ],
      status: "pending",
      breakingRisk: "none",
    };

    const result = validator.validate(bigPatch, config);
    expect(result.valid).toBe(false);
    expect(result.reasons[0]).toContain("changed lines");
  });

  it("should reject patch exceeding file limit", () => {
    const config: PatchingConfig = { maxLinesPerPatch: 1000, maxFilesPerPatch: 2 };
    const multiFilePatch: Patch = {
      findingFingerprints: ["f1"],
      title: "Multi file fix",
      type: "auto-fix",
      rationale: "Changes many files",
      rollbackSteps: [],
      fileChanges: [
        { filePath: "a.ts", diff: "+x", changeType: "modify" },
        { filePath: "b.ts", diff: "+y", changeType: "modify" },
        { filePath: "c.ts", diff: "+z", changeType: "modify" },
      ],
      status: "pending",
      breakingRisk: "none",
    };

    const result = validator.validate(multiFilePatch, config);
    expect(result.valid).toBe(false);
    expect(result.reasons[0]).toContain("files");
  });

  it("should handle patch generation failure gracefully", async () => {
    const depFinding = createDependencyFinding();
    // The dependency upgrade strategy will fail because there's no package.json at /workspace
    const patches = await patchEngine.generatePatches([depFinding], "/nonexistent/workspace");

    expect(patches).toHaveLength(1);
    expect(patches[0]!.status).toBe("generation-failed");
  });
});
