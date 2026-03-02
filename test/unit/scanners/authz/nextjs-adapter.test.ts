import * as fs from "node:fs";
import * as path from "node:path";

import { describe, it, expect } from "vitest";

import { extractNextjsRoutes } from "../../../../src/scanners/authz/framework-adapters/nextjs";

const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/authz-files");

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
}

describe("extractNextjsRoutes", () => {
  it("should extract route handlers from unprotected Next.js file", () => {
    const content = readFixture("nextjs-unprotected.ts");
    const routes = extractNextjsRoutes(content, "app/api/admin/users/route.ts");
    expect(routes.length).toBeGreaterThanOrEqual(2);
  });

  it("should extract GET and POST methods", () => {
    const content = readFixture("nextjs-unprotected.ts");
    const routes = extractNextjsRoutes(content, "app/api/admin/users/route.ts");
    const methods = routes.map((r) => r.method);
    expect(methods).toContain("GET");
    expect(methods).toContain("POST");
  });

  it("should derive route path from file path", () => {
    const content = readFixture("nextjs-unprotected.ts");
    const routes = extractNextjsRoutes(content, "app/api/admin/users/route.ts");
    for (const route of routes) {
      expect(route.path).toBe("/api/admin/users");
    }
  });

  it("should detect auth checks in protected handler", () => {
    const content = readFixture("nextjs-protected.ts");
    const routes = extractNextjsRoutes(content, "app/api/admin/users/route.ts");
    const getRoute = routes.find((r) => r.method === "GET");
    expect(getRoute).toBeDefined();
    expect(getRoute!.middlewares).toContain("getServerSession");
  });

  it("should NOT detect auth in unprotected handler", () => {
    const content = readFixture("nextjs-unprotected.ts");
    const routes = extractNextjsRoutes(content, "app/api/admin/users/route.ts");
    const getRoute = routes.find((r) => r.method === "GET");
    expect(getRoute).toBeDefined();
    expect(getRoute!.middlewares).not.toContain("getServerSession");
    expect(getRoute!.middlewares).not.toContain("auth()");
  });

  it("should extract middleware matcher config", () => {
    const content = `
export const config = {
  matcher: ["/api/admin/:path*", "/dashboard/:path*"],
};

export default function middleware(request: Request) {
  // auth logic
}
`;
    const routes = extractNextjsRoutes(content, "middleware.ts");
    expect(routes.length).toBeGreaterThanOrEqual(2);
    expect(routes.some((r) => r.path === "/api/admin/:path*")).toBe(true);
    expect(routes.some((r) => r.path === "/dashboard/:path*")).toBe(true);
    expect(routes.every((r) => r.middlewares.includes("middleware"))).toBe(true);
  });

  it("should set correct file path", () => {
    const content = readFixture("nextjs-unprotected.ts");
    const routes = extractNextjsRoutes(content, "app/api/admin/users/route.ts");
    for (const route of routes) {
      expect(route.file).toBe("app/api/admin/users/route.ts");
      expect(route.line).toBeGreaterThan(0);
    }
  });
});
