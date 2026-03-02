import { AuthzScannerConfig } from "../../types/config";

import { RouteDefinition } from "./framework-adapters";

export interface AuthzViolation {
  route: RouteDefinition;
  expectedMiddleware: string[];
  missingMiddleware: string[];
  confidence: number;
}

function matchGlobPattern(pattern: string, routePath: string): boolean {
  // Convert glob pattern to regex
  // Support * (any segment chars) and ** (any path)
  let regexStr = "^";
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === "*" && pattern[i + 1] === "*") {
      regexStr += ".*";
      i += 2;
      // Skip trailing slash after **
      if (pattern[i] === "/") {
        i++;
      }
    } else if (ch === "*") {
      regexStr += "[^/]*";
      i++;
    } else if (ch === "?") {
      regexStr += "[^/]";
      i++;
    } else if (".+^${}()|[]\\".includes(ch ?? "")) {
      regexStr += "\\" + (ch ?? "");
      i++;
    } else {
      regexStr += ch;
      i++;
    }
  }

  regexStr += "$";

  try {
    return new RegExp(regexStr).test(routePath);
  } catch {
    // Fallback to simple prefix match if regex is invalid
    return routePath.startsWith(pattern.replace(/\*+/g, ""));
  }
}

export function checkMiddleware(
  routes: RouteDefinition[],
  config: AuthzScannerConfig,
): AuthzViolation[] {
  const violations: AuthzViolation[] = [];

  for (const route of routes) {
    for (const protectedRoute of config.protectedRoutes) {
      if (!matchGlobPattern(protectedRoute.pattern, route.path)) {
        continue;
      }

      // Determine required middleware: use protectedRoute-specific middleware or global authMiddleware
      const required =
        protectedRoute.requiredMiddleware.length > 0
          ? protectedRoute.requiredMiddleware
          : config.authMiddleware;

      const missing = required.filter(
        (mw) => !route.middlewares.some((routeMw) => routeMw === mw || routeMw.includes(mw)),
      );

      if (missing.length === 0) {
        continue;
      }

      // Calculate confidence based on how clear the violation is
      let confidence: number;
      if (missing.length === required.length) {
        // All required middleware is missing — very clear violation
        confidence = 0.95;
      } else {
        // Some middleware present — partial violation
        confidence = 0.7;
      }

      violations.push({
        route,
        expectedMiddleware: required,
        missingMiddleware: missing,
        confidence,
      });
    }
  }

  return violations;
}
