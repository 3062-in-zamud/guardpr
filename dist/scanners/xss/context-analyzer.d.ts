import { ConfidenceFactor } from "../../types/finding";
export interface ContextAnalysis {
    confidence: number;
    factors: ConfidenceFactor[];
}
export declare function analyzeContext(content: string, filePath: string, matchLine: number, customSanitizers: string[]): ContextAnalysis;
//# sourceMappingURL=context-analyzer.d.ts.map