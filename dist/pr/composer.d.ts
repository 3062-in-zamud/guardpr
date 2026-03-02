import { Finding, Patch } from "../types";
export interface PRComposition {
    title: string;
    body: string;
    branchName: string;
    labels: string[];
}
export declare class PRComposer {
    compose(params: {
        findings: Finding[];
        lowConfidenceFindings: Finding[];
        patches: Patch[];
        context: {
            runId: number;
            sha: string;
            version: string;
        };
    }): PRComposition;
}
//# sourceMappingURL=composer.d.ts.map