import { AuditLogEntry, Finding, GuardPRConfig, Patch, ScanResult } from "../types";
export declare class AuditLogger {
    build(params: {
        scanResults: ScanResult[];
        findings: Finding[];
        highConfidence: Finding[];
        lowConfidence: Finding[];
        patches: Patch[];
        prCreated: boolean;
        prUrl?: string;
        prNumber?: number;
        totalDurationMs: number;
        errors: string[];
        toolVersions: Record<string, string>;
        config: GuardPRConfig;
    }): AuditLogEntry;
}
//# sourceMappingURL=logger.d.ts.map