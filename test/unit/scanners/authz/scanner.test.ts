import * as path from "node:path";

import { describe, it, expect } from "vitest";

import { AuthzScanner } from "../../../../src/scanners/authz/scanner";
import { GuardPRConfig } from "../../../../src/types/config";
import { DEFAULT_CONFIG } from "../../../../src/config/defaults";

const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/authz-files");

function makeConfig(overrides: Partial<GuardPRConfig["scanners"]["authz"]> = {}): GuardPRConfig {
  return {
    ...DEFAULT_CONFIG,
    scanners: {
      ...DEFAULT_CONFIG.scanners,
      authz: {
        ...DEFAULT_CONFIG.scanners.authz,
        ...overrides,
      },
    },
  };
}

describe("AuthzScanner", () => {
  const scanner = new AuthzScanner();

  it("should have correct metadata", () => {
    expect(scanner.id).toBe("authz");
    expect(scanner.name).toBe("Authorization Checker");
    expect(scanner.category).toBe("authz");
    expect(scanner.defaultSeverity).toBe("P0");
  });

  it("should always be available", async () => {
    const available = await scanner.isAvailable("/any/path");
    expect(available).toBe(true);
  });

  it("should return empty findings when no protectedRoutes configured", async () => {
    const config = makeConfig({ protectedRoutes: [] });
    const findings = await scanner.scan(FIXTURES_DIR, config);
    expect(findings.length).toBe(0);
  });

  it("should detect unprotected Express routes", async () => {
    const config = makeConfig({
      framework: "express",
      protectedRoutes: [
        {
          pattern: "/api/admin/**",
          requiredMiddleware: ["isAuthenticated", "isAdmin"],
        },
      ],
      authMiddleware: ["isAuthenticated", "isAdmin"],
    });

    const findings = await scanner.scan(FIXTURES_DIR, config);

    // Should find violations in express-unprotected.ts
    const unprotectedFindings = findings.filter((f) =>
      f.location.file.includes("express-unprotected"),
    );
    expect(unprotectedFindings.length).toBeGreaterThan(0);
  });

  it("should NOT flag properly protected Express routes", async () => {
    const config = makeConfig({
      framework: "express",
      protectedRoutes: [
        {
          pattern: "/api/admin/**",
          requiredMiddleware: ["isAuthenticated", "isAdmin"],
        },
      ],
    });

    const findings = await scanner.scan(FIXTURES_DIR, config);

    // Should NOT find violations in express-protected.ts
    const protectedFindings = findings.filter((f) => f.location.file.includes("express-protected"));
    expect(protectedFindings.length).toBe(0);
  });

  it("should generate unique fingerprints", async () => {
    const config = makeConfig({
      framework: "express",
      protectedRoutes: [
        {
          pattern: "/api/**",
          requiredMiddleware: ["isAuthenticated"],
        },
      ],
    });

    const findings = await scanner.scan(FIXTURES_DIR, config);
    if (findings.length > 1) {
      const fingerprints = findings.map((f) => f.fingerprint);
      const uniqueFingerprints = new Set(fingerprints);
      expect(uniqueFingerprints.size).toBe(fingerprints.length);
    }
  });

  it("should include CWE-862 for authz findings", async () => {
    const config = makeConfig({
      framework: "express",
      protectedRoutes: [
        {
          pattern: "/api/admin/**",
          requiredMiddleware: ["isAuthenticated"],
        },
      ],
    });

    const findings = await scanner.scan(FIXTURES_DIR, config);
    for (const finding of findings) {
      expect(finding.cwe).toBe("CWE-862");
    }
  });

  it("should include descriptive titles", async () => {
    const config = makeConfig({
      framework: "express",
      protectedRoutes: [
        {
          pattern: "/api/admin/**",
          requiredMiddleware: ["isAuthenticated"],
        },
      ],
    });

    const findings = await scanner.scan(FIXTURES_DIR, config);
    for (const finding of findings) {
      expect(finding.title).toContain("Missing authorization middleware");
    }
  });
});
