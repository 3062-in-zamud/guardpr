import * as fs from "fs";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { loadConfig, ActionInputs } from "../../../src/config/loader";
import { DEFAULT_CONFIG } from "../../../src/config/defaults";
import { GuardPRError } from "../../../src/types/errors";

vi.mock("fs");

const baseActionInputs: ActionInputs = {
  configPath: ".guardpr.yml",
  scanners: "all",
  githubToken: "ghp_testtoken123",
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("loadConfig", () => {
  it("returns defaults when config file is not found", async () => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw err;
    });

    const config = await loadConfig(".guardpr.yml", baseActionInputs);

    expect(config.confidenceThreshold).toBe(0.9);
    expect(config.createPr).toBe(true);
    expect(config.runTests).toBe(true);
    expect(config.testCommand).toBe("npm test");
    expect(config.scanners.secrets.enabled).toBe(true);
    expect(config.scanners.dependencies.enabled).toBe(true);
    expect(config.scanners.xss.enabled).toBe(true);
    expect(config.scanners.authz.enabled).toBe(true);
    expect(config.githubToken).toBe("ghp_testtoken123");
  });

  it("loads and merges YAML config", async () => {
    const yamlContent = `
confidenceThreshold: 0.7
testCommand: "yarn test"
scanners:
  secrets:
    maxTargetMegabytes: 20
  xss:
    customSanitizers:
      - mySanitizer
patching:
  maxLinesPerPatch: 100
`;
    vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

    const config = await loadConfig(".guardpr.yml", {
      ...baseActionInputs,
      confidenceThreshold: 0.8,
    });

    // Action inputs override YAML for confidenceThreshold
    expect(config.confidenceThreshold).toBe(0.8);
    // YAML values for scanner config
    expect(config.scanners.secrets.maxTargetMegabytes).toBe(20);
    expect(config.scanners.xss.customSanitizers).toEqual(["mySanitizer"]);
    expect(config.patching.maxLinesPerPatch).toBe(100);
  });

  it("YAML config takes precedence when action input is not set", async () => {
    const yamlContent = `
confidenceThreshold: 0.7
createPr: false
testCommand: "yarn test"
`;
    vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

    const config = await loadConfig(".guardpr.yml", baseActionInputs);

    expect(config.confidenceThreshold).toBe(0.7);
    expect(config.createPr).toBe(false);
    expect(config.testCommand).toBe("yarn test");
  });

  it("runTests from YAML is respected when action input not set", async () => {
    const yamlContent = `
runTests: false
`;
    vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

    const config = await loadConfig(".guardpr.yml", baseActionInputs);

    expect(config.runTests).toBe(false);
  });

  it("applies scanner overrides from action inputs", async () => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw err;
    });

    const config = await loadConfig(".guardpr.yml", {
      ...baseActionInputs,
      scanners: "secrets,xss",
    });

    expect(config.scanners.secrets.enabled).toBe(true);
    expect(config.scanners.xss.enabled).toBe(true);
    expect(config.scanners.dependencies.enabled).toBe(false);
    expect(config.scanners.authz.enabled).toBe(false);
  });

  it("throws GuardPRError on invalid YAML config", async () => {
    const yamlContent = `
confidenceThreshold: "not-a-number"
`;
    vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

    await expect(loadConfig(".guardpr.yml", baseActionInputs)).rejects.toThrow(GuardPRError);
  });

  it("throws on file read errors other than ENOENT", async () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("Permission denied");
    });

    await expect(loadConfig(".guardpr.yml", baseActionInputs)).rejects.toThrow(GuardPRError);
  });

  it("handles empty YAML file gracefully", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue("");

    const config = await loadConfig(".guardpr.yml", baseActionInputs);

    expect(config.confidenceThreshold).toBe(0.9);
    expect(config.scanners.secrets.enabled).toBe(true);
  });

  it("preserves default patching config when YAML does not override", async () => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw err;
    });

    const config = await loadConfig(".guardpr.yml", baseActionInputs);

    expect(config.patching.maxLinesPerPatch).toBe(DEFAULT_CONFIG.patching.maxLinesPerPatch);
    expect(config.patching.maxFilesPerPatch).toBe(DEFAULT_CONFIG.patching.maxFilesPerPatch);
  });

  it("sets pro.apiKey from action input", async () => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw err;
    });

    const config = await loadConfig(".guardpr.yml", {
      ...baseActionInputs,
      proApiKey: "pro_test_key_123",
    });

    expect(config.pro.apiKey).toBe("pro_test_key_123");
    expect(config.pro.endpoint).toBe(DEFAULT_CONFIG.pro.endpoint);
  });

  it("defaults pro.apiKey to empty string when not provided", async () => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw err;
    });

    const config = await loadConfig(".guardpr.yml", baseActionInputs);

    expect(config.pro.apiKey).toBe("");
    expect(config.pro.endpoint).toBe(DEFAULT_CONFIG.pro.endpoint);
  });

  it("ignores pro settings in YAML config (security: apiKey must come from action input)", async () => {
    const yamlContent = `
pro:
  apiKey: "leaked-key-in-yaml"
  endpoint: "https://evil.example.com/webhook"
`;
    vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);

    const config = await loadConfig(".guardpr.yml", baseActionInputs);

    // apiKey should be empty (from action input default), not from YAML
    expect(config.pro.apiKey).toBe("");
    // endpoint should be the hardcoded default, not from YAML
    expect(config.pro.endpoint).toBe(DEFAULT_CONFIG.pro.endpoint);
  });

  it("uses fixed endpoint regardless of action input", async () => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw err;
    });

    const config = await loadConfig(".guardpr.yml", {
      ...baseActionInputs,
      proApiKey: "pro_key",
    });

    // endpoint is always the default, never overridden
    expect(config.pro.endpoint).toBe(DEFAULT_CONFIG.pro.endpoint);
  });
});
