import * as fs from "node:fs";
import * as path from "node:path";

import { describe, it, expect } from "vitest";

import { extractExpressRoutes } from "../../../../src/scanners/authz/framework-adapters/express";

const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/authz-files");

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
}

describe("extractExpressRoutes", () => {
  it("should extract routes from unprotected Express app", () => {
    const content = readFixture("express-unprotected.ts");
    const routes = extractExpressRoutes(content, "express-unprotected.ts");
    expect(routes.length).toBeGreaterThan(0);
  });

  it("should extract correct HTTP methods", () => {
    const content = readFixture("express-unprotected.ts");
    const routes = extractExpressRoutes(content, "express-unprotected.ts");
    const methods = routes.map((r) => r.method);
    expect(methods).toContain("GET");
    expect(methods).toContain("POST");
    expect(methods).toContain("DELETE");
  });

  it("should extract correct paths", () => {
    const content = readFixture("express-unprotected.ts");
    const routes = extractExpressRoutes(content, "express-unprotected.ts");
    const paths = routes.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/api/admin/users");
    expect(paths).toContain("/api/admin/users/:id");
  });

  it("should detect middleware in protected routes", () => {
    const content = readFixture("express-protected.ts");
    const routes = extractExpressRoutes(content, "express-protected.ts");
    const adminRoute = routes.find((r) => r.path === "/api/admin/users" && r.method === "GET");
    expect(adminRoute).toBeDefined();
    expect(adminRoute!.middlewares).toContain("isAuthenticated");
    expect(adminRoute!.middlewares).toContain("isAdmin");
  });

  it("should detect no auth middleware in unprotected routes", () => {
    const content = readFixture("express-unprotected.ts");
    const routes = extractExpressRoutes(content, "express-unprotected.ts");
    const adminRoute = routes.find((r) => r.path === "/api/admin/users" && r.method === "GET");
    expect(adminRoute).toBeDefined();
    expect(adminRoute!.middlewares).not.toContain("isAuthenticated");
    expect(adminRoute!.middlewares).not.toContain("isAdmin");
  });

  it("should set correct file path and line numbers", () => {
    const content = readFixture("express-unprotected.ts");
    const routes = extractExpressRoutes(content, "express-unprotected.ts");
    for (const route of routes) {
      expect(route.file).toBe("express-unprotected.ts");
      expect(route.line).toBeGreaterThan(0);
    }
  });

  it("should handle router-based routes", () => {
    const content = `
import express from "express";
const router = express.Router();
router.get("/items", isAuth, (req, res) => { res.json([]); });
router.post("/items", isAuth, (req, res) => { res.json({}); });
`;
    const routes = extractExpressRoutes(content, "router.ts");
    expect(routes.length).toBe(2);
    expect(routes[0]!.middlewares).toContain("isAuth");
  });

  it("should detect router.use() file-level middleware", () => {
    const content = `
import express from "express";
const router = express.Router();
router.use(isAuthenticated);
router.get("/api/admin/users", (req, res) => { res.json([]); });
`;
    const routes = extractExpressRoutes(content, "router-use.ts");
    expect(routes.length).toBe(1);
    expect(routes[0]!.middlewares).toContain("isAuthenticated");
  });

  it("should detect app.use() file-level middleware", () => {
    const content = `
import express from "express";
const app = express();
app.use(isAuthenticated);
app.get("/api/admin/users", (req, res) => { res.json([]); });
`;
    const routes = extractExpressRoutes(content, "app-use.ts");
    expect(routes.length).toBe(1);
    expect(routes[0]!.middlewares).toContain("isAuthenticated");
  });

  it("should not capture path-based .use() as file-level middleware", () => {
    const content = `
import express from "express";
const app = express();
app.use("/api", apiRouter);
app.get("/api/admin/users", (req, res) => { res.json([]); });
`;
    const routes = extractExpressRoutes(content, "path-use.ts");
    expect(routes.length).toBe(1);
    expect(routes[0]!.middlewares).not.toContain("apiRouter");
    expect(routes[0]!.middlewares).not.toContain("/api");
  });

  it("should combine .use() middleware with route-level middleware", () => {
    const content = `
import express from "express";
const router = express.Router();
router.use(isAuthenticated);
router.get("/api/admin/users", isAdmin, (req, res) => { res.json([]); });
`;
    const routes = extractExpressRoutes(content, "combined.ts");
    expect(routes.length).toBe(1);
    expect(routes[0]!.middlewares).toContain("isAuthenticated");
    expect(routes[0]!.middlewares).toContain("isAdmin");
  });
});
