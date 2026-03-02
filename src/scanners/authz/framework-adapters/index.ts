import { RouteDefinition, extractExpressRoutes } from "./express";
import { extractNextjsRoutes } from "./nextjs";

export { RouteDefinition } from "./express";
export { extractExpressRoutes } from "./express";
export { extractNextjsRoutes } from "./nextjs";

export type FrameworkType = "express" | "nextjs" | "auto";

export interface FrameworkAdapter {
  name: string;
  extract(content: string, filePath: string): RouteDefinition[];
}

const expressAdapter: FrameworkAdapter = {
  name: "express",
  extract: extractExpressRoutes,
};

const nextjsAdapter: FrameworkAdapter = {
  name: "nextjs",
  extract: extractNextjsRoutes,
};

export function detectFramework(files: string[]): FrameworkType {
  let hasExpress = false;
  let hasNextjs = false;

  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");

    if (normalized.includes("node_modules/express/") || /\bexpress\b/.test(normalized)) {
      hasExpress = true;
    }

    if (
      normalized.includes("node_modules/next/") ||
      normalized.includes("/app/") ||
      normalized.includes("/pages/api/") ||
      normalized.endsWith("next.config.js") ||
      normalized.endsWith("next.config.ts") ||
      normalized.endsWith("next.config.mjs")
    ) {
      hasNextjs = true;
    }
  }

  if (hasNextjs) {
    return "nextjs";
  }
  if (hasExpress) {
    return "express";
  }
  return "express"; // Default to express
}

export function getAdapter(framework: FrameworkType): FrameworkAdapter {
  switch (framework) {
    case "nextjs":
      return nextjsAdapter;
    case "express":
      return expressAdapter;
    default:
      return expressAdapter;
  }
}

export function getAdapters(framework: FrameworkType): FrameworkAdapter[] {
  if (framework === "auto") {
    return [expressAdapter, nextjsAdapter];
  }
  return [getAdapter(framework)];
}
