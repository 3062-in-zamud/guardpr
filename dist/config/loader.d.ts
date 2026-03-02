import { GuardPRConfig } from "../types/config";
export interface ActionInputs {
    configPath: string;
    confidenceThreshold: number;
    createPr: boolean;
    runTests: boolean;
    testCommand: string;
    scanners: string;
    githubToken: string;
}
export declare function loadConfig(configPath: string, actionInputs: ActionInputs): Promise<GuardPRConfig>;
//# sourceMappingURL=loader.d.ts.map