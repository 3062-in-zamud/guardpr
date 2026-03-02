import { RouteDefinition } from "./express";
export { RouteDefinition } from "./express";
export { extractExpressRoutes } from "./express";
export { extractNextjsRoutes } from "./nextjs";
export type FrameworkType = "express" | "nextjs" | "auto";
export interface FrameworkAdapter {
    name: string;
    extract(content: string, filePath: string): RouteDefinition[];
}
export declare function detectFramework(files: string[]): FrameworkType;
export declare function getAdapter(framework: FrameworkType): FrameworkAdapter;
export declare function getAdapters(framework: FrameworkType): FrameworkAdapter[];
//# sourceMappingURL=index.d.ts.map