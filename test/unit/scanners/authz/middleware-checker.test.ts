import { describe, it, expect } from "vitest";

import { checkMiddleware } from "../../../../src/scanners/authz/middleware-checker";
import { RouteDefinition } from "../../../../src/scanners/authz/framework-adapters/express";
import { AuthzScannerConfig } from "../../../../src/types/config";

function makeConfig(overrides: Partial<AuthzScannerConfig> = {}): AuthzScannerConfig {
  return {
    enabled: true,
    protectedRoutes: [],
    authMiddleware: ["isAuthenticated"],
    framework: "express",
    ...overrides,
  };
}

describe("checkMiddleware", () => {
  it("should detect missing middleware on unprotected route", () => {
    const routes: RouteDefinition[] = [
      {
        method: "GET",
        path: "/api/admin/users",
        middlewares: ["(req", "res)"],
        file: "app.ts",
        line: 10,
      },
    ];

    const config = makeConfig({
      protectedRoutes: [
        { pattern: "/api/admin/**", requiredMiddleware: ["isAuthenticated", "isAdmin"] },
      ],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(1);
    expect(violations[0]!.missingMiddleware).toContain("isAuthenticated");
    expect(violations[0]!.missingMiddleware).toContain("isAdmin");
  });

  it("should not flag routes with all required middleware", () => {
    const routes: RouteDefinition[] = [
      {
        method: "GET",
        path: "/api/admin/users",
        middlewares: ["isAuthenticated", "isAdmin", "(req", "res)"],
        file: "app.ts",
        line: 10,
      },
    ];

    const config = makeConfig({
      protectedRoutes: [
        { pattern: "/api/admin/**", requiredMiddleware: ["isAuthenticated", "isAdmin"] },
      ],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(0);
  });

  it("should detect partial middleware missing", () => {
    const routes: RouteDefinition[] = [
      {
        method: "GET",
        path: "/api/admin/users",
        middlewares: ["isAuthenticated", "(req", "res)"],
        file: "app.ts",
        line: 10,
      },
    ];

    const config = makeConfig({
      protectedRoutes: [
        { pattern: "/api/admin/**", requiredMiddleware: ["isAuthenticated", "isAdmin"] },
      ],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(1);
    expect(violations[0]!.missingMiddleware).toEqual(["isAdmin"]);
    expect(violations[0]!.confidence).toBe(0.7);
  });

  it("should assign 0.95 confidence when all middleware is missing", () => {
    const routes: RouteDefinition[] = [
      {
        method: "GET",
        path: "/api/admin/users",
        middlewares: [],
        file: "app.ts",
        line: 10,
      },
    ];

    const config = makeConfig({
      protectedRoutes: [{ pattern: "/api/admin/**", requiredMiddleware: ["isAuthenticated"] }],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(1);
    expect(violations[0]!.confidence).toBe(0.95);
  });

  it("should not flag routes outside protected patterns", () => {
    const routes: RouteDefinition[] = [
      {
        method: "GET",
        path: "/public/data",
        middlewares: [],
        file: "app.ts",
        line: 5,
      },
    ];

    const config = makeConfig({
      protectedRoutes: [{ pattern: "/api/admin/**", requiredMiddleware: ["isAuthenticated"] }],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(0);
  });

  it("should use global authMiddleware when protectedRoute has empty requiredMiddleware", () => {
    const routes: RouteDefinition[] = [
      {
        method: "GET",
        path: "/api/data",
        middlewares: [],
        file: "app.ts",
        line: 5,
      },
    ];

    const config = makeConfig({
      authMiddleware: ["requireAuth"],
      protectedRoutes: [{ pattern: "/api/**", requiredMiddleware: [] }],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(1);
    expect(violations[0]!.missingMiddleware).toContain("requireAuth");
  });

  it("should match exact route patterns", () => {
    const routes: RouteDefinition[] = [
      {
        method: "GET",
        path: "/api/users",
        middlewares: [],
        file: "app.ts",
        line: 5,
      },
      {
        method: "GET",
        path: "/api/public",
        middlewares: [],
        file: "app.ts",
        line: 10,
      },
    ];

    const config = makeConfig({
      protectedRoutes: [{ pattern: "/api/users", requiredMiddleware: ["isAuthenticated"] }],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(1);
    expect(violations[0]!.route.path).toBe("/api/users");
  });

  it("should handle wildcard patterns correctly", () => {
    const routes: RouteDefinition[] = [
      { method: "GET", path: "/api/admin/users", middlewares: [], file: "app.ts", line: 1 },
      { method: "POST", path: "/api/admin/settings", middlewares: [], file: "app.ts", line: 2 },
      { method: "GET", path: "/api/public", middlewares: [], file: "app.ts", line: 3 },
    ];

    const config = makeConfig({
      protectedRoutes: [{ pattern: "/api/admin/**", requiredMiddleware: ["isAuthenticated"] }],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(2);
    expect(violations.every((v) => v.route.path.startsWith("/api/admin/"))).toBe(true);
  });

  it("should lower confidence when alternative auth middleware is present", () => {
    const routes: RouteDefinition[] = [
      {
        method: "GET",
        path: "/api/admin/users",
        middlewares: ["requireAuth", "(req", "res)"],
        file: "app.ts",
        line: 10,
      },
    ];

    const config = makeConfig({
      authMiddleware: ["isAuthenticated", "isAdmin", "requireAuth"],
      protectedRoutes: [
        { pattern: "/api/admin/**", requiredMiddleware: ["isAuthenticated", "isAdmin"] },
      ],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(1);
    expect(violations[0]!.confidence).toBe(0.3);
  });

  it("should not lower confidence for partial-auth (not all required missing)", () => {
    const routes: RouteDefinition[] = [
      {
        method: "GET",
        path: "/api/admin/dashboard",
        middlewares: ["isAuthenticated", "(req", "res)"],
        file: "app.ts",
        line: 10,
      },
    ];

    const config = makeConfig({
      authMiddleware: ["isAuthenticated", "isAdmin", "requireAuth"],
      protectedRoutes: [
        { pattern: "/api/admin/**", requiredMiddleware: ["isAuthenticated", "isAdmin"] },
      ],
    });

    const violations = checkMiddleware(routes, config);
    expect(violations.length).toBe(1);
    // missing = ["isAdmin"], required = ["isAuthenticated", "isAdmin"]
    // missing.length (1) != required.length (2) -> confidence stays at 0.7
    expect(violations[0]!.confidence).toBe(0.7);
  });
});
