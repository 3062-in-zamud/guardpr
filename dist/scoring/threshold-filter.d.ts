import { Finding } from "../types";
export interface FilterResult {
    highConfidence: Finding[];
    lowConfidence: Finding[];
}
export declare function filterByThreshold(findings: Finding[], threshold: number): FilterResult;
//# sourceMappingURL=threshold-filter.d.ts.map