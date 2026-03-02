import { describe, it, expect } from "vitest";

import { PatchValidator } from "../../../src/patching/patch-validator";
import { Patch, PatchingConfig } from "../../../src/types";

function makePatch(overrides: Partial<Patch> = {}): Patch {
  return {
    findingFingerprints: ["fp-1"],
    title: "Test patch",
    type: "auto-fix",
    rationale: "Fix a vulnerability",
    rollbackSteps: ["Revert changes"],
    fileChanges: [
      {
        filePath: "src/app.ts",
        diff: "+line1\n+line2\n-line3\n",
        changeType: "modify",
      },
    ],
    status: "pending",
    breakingRisk: "none",
    ...overrides,
  };
}

const defaultConfig: PatchingConfig = {
  maxLinesPerPatch: 50,
  maxFilesPerPatch: 5,
};

describe("PatchValidator", () => {
  const validator = new PatchValidator();

  it("validates a patch within limits", () => {
    const result = validator.validate(makePatch(), defaultConfig);
    expect(result.valid).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("rejects patch exceeding max lines", () => {
    const manyLines = Array.from({ length: 60 }, (_, i) => `+added line ${i}`).join("\n");
    const patch = makePatch({
      fileChanges: [{ filePath: "src/app.ts", diff: manyLines, changeType: "modify" }],
    });

    const result = validator.validate(patch, defaultConfig);
    expect(result.valid).toBe(false);
    expect(result.reasons[0]).toContain("changed lines");
    expect(result.reasons[0]).toContain("50");
  });

  it("rejects patch exceeding max files", () => {
    const fileChanges = Array.from({ length: 6 }, (_, i) => ({
      filePath: `src/file${i}.ts`,
      diff: "+line\n",
      changeType: "modify" as const,
    }));

    const patch = makePatch({ fileChanges });

    const result = validator.validate(patch, defaultConfig);
    expect(result.valid).toBe(false);
    expect(result.reasons[0]).toContain("6 files");
    expect(result.reasons[0]).toContain("5");
  });

  it("reports both violations when both limits are exceeded", () => {
    const manyLines = Array.from({ length: 60 }, (_, i) => `+added line ${i}`).join("\n");
    const fileChanges = Array.from({ length: 6 }, (_, i) => ({
      filePath: `src/file${i}.ts`,
      diff: i === 0 ? manyLines : "+line\n",
      changeType: "modify" as const,
    }));

    const patch = makePatch({ fileChanges });

    const result = validator.validate(patch, defaultConfig);
    expect(result.valid).toBe(false);
    expect(result.reasons).toHaveLength(2);
  });

  it("validates with custom config limits", () => {
    const customConfig: PatchingConfig = {
      maxLinesPerPatch: 3,
      maxFilesPerPatch: 1,
    };

    const patch = makePatch({
      fileChanges: [
        { filePath: "src/a.ts", diff: "+line1\n+line2\n+line3\n", changeType: "modify" },
      ],
    });

    const result = validator.validate(patch, customConfig);
    expect(result.valid).toBe(true);
  });

  it("counts both additions and deletions toward line limit", () => {
    const diff =
      Array.from({ length: 30 }, () => "+added\n").join("") +
      Array.from({ length: 25 }, () => "-removed\n").join("");

    const patch = makePatch({
      fileChanges: [{ filePath: "src/app.ts", diff, changeType: "modify" }],
    });

    const result = validator.validate(patch, defaultConfig);
    expect(result.valid).toBe(false);
    expect(result.reasons[0]).toContain("55");
  });

  it("validates empty patch (notification-only)", () => {
    const patch = makePatch({
      type: "notification-only",
      fileChanges: [],
    });

    const result = validator.validate(patch, defaultConfig);
    expect(result.valid).toBe(true);
  });
});
