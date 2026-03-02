export interface MaskingPattern {
    name: string;
    pattern: RegExp;
    maskFn: (match: string) => string;
}
export declare const MASKING_PATTERNS: MaskingPattern[];
//# sourceMappingURL=patterns.d.ts.map