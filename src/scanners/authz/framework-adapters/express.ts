export interface RouteDefinition {
  method: string;
  path: string;
  middlewares: string[];
  file: string;
  line: number;
}

function parseMiddlewareChain(middlewareStr: string): string[] {
  // Split by comma and extract function names
  const parts = middlewareStr.split(",").map((s) => s.trim());
  const middlewares: string[] = [];

  for (const part of parts) {
    if (part.length === 0) {
      continue;
    }
    // Extract function name: could be a bare identifier, a call like fn(), or a property access
    const fnMatch = /^([a-zA-Z_$][\w$.]*)\s*(?:\(|$)/.exec(part);
    if (fnMatch?.[1] !== undefined) {
      middlewares.push(fnMatch[1]);
    }
  }

  return middlewares;
}

export function extractExpressRoutes(content: string, filePath: string): RouteDefinition[] {
  const routes: RouteDefinition[] = [];
  const lines = content.split("\n");

  // Collect file-level middleware from .use() calls (without path arguments)
  const fileLevelMiddlewares: string[] = [];
  const usePattern = /\b(?:app|router)\s*\.\s*use\s*\(\s*([a-zA-Z_$][\w$.]*)\s*\)/g;
  let useMatch: RegExpExecArray | null;
  while ((useMatch = usePattern.exec(content)) !== null) {
    if (useMatch[1] !== undefined) {
      fileLevelMiddlewares.push(useMatch[1]);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmed = line.trimStart();

    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      continue;
    }

    // Try to match route definition on this line (may span to next lines)
    // Build a multi-line block for more reliable matching
    let block = line;
    let parenDepth = 0;
    let started = false;

    for (const ch of line) {
      if (ch === "(") {
        parenDepth++;
        started = true;
      }
      if (ch === ")") {
        parenDepth--;
      }
    }

    if (started && parenDepth > 0) {
      // Extend to subsequent lines to close the parentheses
      for (let j = i + 1; j < lines.length && j < i + 20; j++) {
        block += "\n" + (lines[j] ?? "");
        for (const ch of lines[j] ?? "") {
          if (ch === "(") {
            parenDepth++;
          }
          if (ch === ")") {
            parenDepth--;
          }
        }
        if (parenDepth <= 0) {
          break;
        }
      }
    }

    const linePattern =
      /\b(?:app|router)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]\s*(?:,\s*([\s\S]*?))?\s*\)/gi;

    let match: RegExpExecArray | null;
    while ((match = linePattern.exec(block)) !== null) {
      const method = (match[1] ?? "").toUpperCase();
      const routePath = match[2] ?? "";
      const middlewareStr = match[3] ?? "";

      const middlewares = parseMiddlewareChain(middlewareStr);

      // The last middleware is typically the handler, not actual middleware
      // But we include all since checking presence of auth middleware is what matters
      routes.push({
        method,
        path: routePath,
        middlewares: [...fileLevelMiddlewares, ...middlewares],
        file: filePath,
        line: i + 1,
      });
    }
  }

  return routes;
}
