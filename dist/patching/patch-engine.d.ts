import { Finding, Patch } from "../types";
export declare class PatchEngine {
    private secretStrategy;
    private dependencyStrategy;
    private xssStrategy;
    private authzStrategy;
    generatePatches(findings: Finding[], workDir: string): Promise<Patch[]>;
}
//# sourceMappingURL=patch-engine.d.ts.map