export type ErrorCode =
  | "SCANNER_NOT_AVAILABLE"
  | "SCANNER_INSTALL_FAILED"
  | "SCANNER_TIMEOUT"
  | "SCANNER_CRASH"
  | "CONFIG_INVALID"
  | "CONFIG_NOT_FOUND"
  | "GITHUB_API_ERROR"
  | "PERMISSION_ERROR"
  | "RESOURCE_EXHAUSTED"
  | "CHECKSUM_MISMATCH"
  | "PATCH_APPLY_FAILED"
  | "TEST_TIMEOUT";

export class GuardPRError extends Error {
  public readonly code: ErrorCode;
  public readonly recoverable: boolean;
  public readonly cause?: unknown;

  constructor(message: string, code: ErrorCode, recoverable: boolean, cause?: unknown) {
    super(message);
    this.name = "GuardPRError";
    this.code = code;
    this.recoverable = recoverable;
    this.cause = cause;
    Object.setPrototypeOf(this, GuardPRError.prototype);
  }
}
