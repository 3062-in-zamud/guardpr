import { ConfidenceFactor, DetectionCategory, Finding } from "../types";
export interface FactorCalculator {
    calculate(finding: Finding): ConfidenceFactor[];
}
export declare class SecretsFactorCalculator implements FactorCalculator {
    calculate(finding: Finding): ConfidenceFactor[];
}
export declare class DependencyFactorCalculator implements FactorCalculator {
    calculate(finding: Finding): ConfidenceFactor[];
}
export declare class XssFactorCalculator implements FactorCalculator {
    calculate(finding: Finding): ConfidenceFactor[];
}
export declare class AuthzFactorCalculator implements FactorCalculator {
    calculate(finding: Finding): ConfidenceFactor[];
}
export declare function getFactorCalculator(category: DetectionCategory): FactorCalculator;
//# sourceMappingURL=factors.d.ts.map