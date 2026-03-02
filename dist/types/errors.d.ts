export type ErrorCode = "SCANNER_NOT_AVAILABLE" | "SCANNER_INSTALL_FAILED" | "SCANNER_TIMEOUT" | "SCANNER_CRASH" | "CONFIG_INVALID" | "CONFIG_NOT_FOUND" | "GITHUB_API_ERROR" | "PERMISSION_ERROR" | "RESOURCE_EXHAUSTED" | "CHECKSUM_MISMATCH" | "PATCH_APPLY_FAILED" | "TEST_TIMEOUT";
export declare class GuardPRError extends Error {
    readonly code: ErrorCode;
    readonly recoverable: boolean;
    readonly cause?: unknown;
    constructor(message: string, code: ErrorCode, recoverable: boolean, cause?: unknown);
}
//# sourceMappingURL=errors.d.ts.map