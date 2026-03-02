import { AuditLogEntry, Finding } from "../types";
export declare class MaskingLayer {
    registerSecrets(values: string[]): void;
    maskOutput(text: string): string;
    maskFinding(finding: Finding): Finding;
    maskAuditLog(log: AuditLogEntry): AuditLogEntry;
}
//# sourceMappingURL=masking-layer.d.ts.map