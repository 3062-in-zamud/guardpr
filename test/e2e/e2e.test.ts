import * as path from "path";

import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/config/loader";
import type { ActionInputs } from "../../src/config/loader";
import { AuthzScanner } from "../../src/scanners/authz/scanner";
import { XssScanner } from "../../src/scanners/xss/scanner";
import { GuardPRError } from "../../src/types";
import { createMockConfig } from "../helpers";

const VULNERABLE_REPO = path.resolve(__dirname, "vulnerable-repo");
const CLEAN_REPO = path.resolve(__dirname, "clean-repo");

describe("E2E: vulnerable-repo", () => {
  it("XSS scanner should detect findings in vulnerable code", async () => {
    const scanner = new XssScanner();
    const config = createMockConfig();
    const findings = await scanner.scan(VULNERABLE_REPO, config);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it("Authz scanner should detect missing auth middleware", async () => {
    const scanner = new AuthzScanner();
    const config = createMockConfig({
      scanners: {
        secrets: { enabled: true, maxTargetMegabytes: 10 },
        dependencies: { enabled: true },
        xss: { enabled: true, customSanitizers: [] },
        authz: {
          enabled: true,
          protectedRoutes: [
            {
              pattern: "/api/admin/**",
              requiredMiddleware: ["isAuthenticated", "isAdmin"],
            },
          ],
          authMiddleware: ["isAuthenticated", "isAdmin", "requireAuth"],
          framework: "auto",
        },
      },
    });
    const findings = await scanner.scan(VULNERABLE_REPO, config);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});

describe("E2E: clean-repo", () => {
  it("XSS scanner should find no high-confidence findings", async () => {
    const scanner = new XssScanner();
    const config = createMockConfig();
    const findings = await scanner.scan(CLEAN_REPO, config);
    const highConfidence = findings.filter((f) => f.confidence >= 0.5);
    expect(highConfidence.length).toBe(0);
  });
});

describe("E2E: error-cases", () => {
  const defaultInputs: ActionInputs = {
    configPath: ".guardpr.yml",
    confidenceThreshold: 0.9,
    createPr: true,
    runTests: true,
    testCommand: "npm test",
    scanners: "all",
    githubToken: "ghp_test_token_000000000000000000000000",
  };

  it("missing config file should return defaults (no throw)", async () => {
    const nonExistentPath = path.resolve(__dirname, "error-cases/no-config/.guardpr.yml");
    const config = await loadConfig(nonExistentPath, defaultInputs);
    expect(config).toBeDefined();
    expect(config.scanners.secrets.enabled).toBe(true);
  });

  it("invalid config file should throw GuardPRError with CONFIG_INVALID", async () => {
    const invalidPath = path.resolve(__dirname, "error-cases/invalid-config/.guardpr.yml");
    await expect(loadConfig(invalidPath, defaultInputs)).rejects.toThrow(GuardPRError);
    try {
      await loadConfig(invalidPath, defaultInputs);
    } catch (err) {
      expect(err).toBeInstanceOf(GuardPRError);
      expect((err as GuardPRError).code).toBe("CONFIG_INVALID");
    }
  });
});
