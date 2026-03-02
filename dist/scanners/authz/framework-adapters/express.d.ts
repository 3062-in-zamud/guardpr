export interface RouteDefinition {
    method: string;
    path: string;
    middlewares: string[];
    file: string;
    line: number;
}
export declare function extractExpressRoutes(content: string, filePath: string): RouteDefinition[];
//# sourceMappingURL=express.d.ts.map