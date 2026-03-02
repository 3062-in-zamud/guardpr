import { Patch, PatchingConfig } from "../types";
export interface ValidationResult {
    valid: boolean;
    reasons: string[];
}
export declare class PatchValidator {
    validate(patch: Patch, config: PatchingConfig): ValidationResult;
}
//# sourceMappingURL=patch-validator.d.ts.map