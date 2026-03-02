import { RouteDefinition } from "./express";

const AUTH_CHECK_PATTERNS = [
  "getSession",
  "getServerSession",
  "auth()",
  "requireAuth",
  "getToken",
  "withAuth",
  "useSession",
];

export function extractNextjsRoutes(content: string, filePath: string): RouteDefinition[] {
  const routes: RouteDefinition[] = [];
  const lines = content.split("\n");

  // Detect exported route handler functions: export async function GET/POST/PUT/DELETE
  const handlerPattern = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const linePattern = new RegExp(handlerPattern.source, handlerPattern.flags);
    let match: RegExpExecArray | null;

    while ((match = linePattern.exec(line)) !== null) {
      const method = match[1] ?? "";

      // Determine the route path from file path
      // Next.js convention: app/api/users/route.ts => /api/users
      const routePath = deriveRouteFromFilePath(filePath);

      // Check if there's an auth check in the handler body
      // Look ahead up to 50 lines for auth patterns
      const bodyLines: string[] = [];
      for (let j = i; j < lines.length && j < i + 50; j++) {
        bodyLines.push(lines[j] ?? "");
      }
      const body = bodyLines.join("\n");

      const authMiddlewares: string[] = [];
      for (const pattern of AUTH_CHECK_PATTERNS) {
        if (body.includes(pattern)) {
          authMiddlewares.push(pattern);
        }
      }

      routes.push({
        method,
        path: routePath,
        middlewares: authMiddlewares,
        file: filePath,
        line: i + 1,
      });
    }
  }

  // Detect middleware.ts matcher config
  if (filePath.endsWith("middleware.ts") || filePath.endsWith("middleware.js")) {
    const matcherPattern = /matcher\s*:\s*\[([\s\S]*?)\]/g;
    let match: RegExpExecArray | null;

    while ((match = matcherPattern.exec(content)) !== null) {
      const matcherContent = match[1] ?? "";
      const paths = matcherContent.match(/["'`]([^"'`]+)["'`]/g);
      if (paths !== null) {
        for (const p of paths) {
          const cleanPath = p.replace(/["'`]/g, "");
          const beforeMatch = content.slice(0, match.index);
          const lineNum = beforeMatch.split("\n").length;

          routes.push({
            method: "ALL",
            path: cleanPath,
            middlewares: ["middleware"],
            file: filePath,
            line: lineNum,
          });
        }
      }
    }
  }

  return routes;
}

function deriveRouteFromFilePath(filePath: string): string {
  // Convert file path to route: app/api/users/route.ts => /api/users
  // Or pages/api/users.ts => /api/users

  // Normalize path separators
  const normalized = filePath.replace(/\\/g, "/");

  // Try app directory convention
  const appMatch = /(?:^|\/)(app\/.+?)\/route\.[jt]sx?$/.exec(normalized);
  if (appMatch?.[1] !== undefined) {
    const routePart = appMatch[1].replace(/^app/, "");
    return routePart.length > 0 ? routePart : "/";
  }

  // Try pages directory convention
  const pagesMatch = /(?:^|\/)(pages\/.+?)\.[jt]sx?$/.exec(normalized);
  if (pagesMatch?.[1] !== undefined) {
    const routePart = pagesMatch[1].replace(/^pages/, "").replace(/\/index$/, "");
    return routePart.length > 0 ? routePart : "/";
  }

  // Fallback: use the file path as-is
  return "/" + normalized;
}
