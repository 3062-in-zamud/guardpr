import * as fs from "node:fs";
import * as path from "node:path";

import { AuthzScannerConfig } from "../../types/config";

import { RouteDefinition, detectFramework, getAdapters } from "./framework-adapters";

const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRS = new Set(["node_modules", "dist", ".next", ".git", "build", "coverage"]);

function walkFiles(dir: string): string[] {
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (entry.isFile() && TARGET_EXTENSIONS.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }

  return results;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function analyzeRoutes(
  workDir: string,
  config: AuthzScannerConfig,
): Promise<RouteDefinition[]> {
  const files = walkFiles(workDir);
  const relativePaths = files.map((f) => path.relative(workDir, f));

  const framework = config.framework === "auto" ? detectFramework(relativePaths) : config.framework;
  const adapters = getAdapters(framework);

  const allRoutes: RouteDefinition[] = [];

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const relativePath = path.relative(workDir, filePath);

    for (const adapter of adapters) {
      const routes = adapter.extract(content, relativePath);
      allRoutes.push(...routes);
    }
  }

  return allRoutes;
}
