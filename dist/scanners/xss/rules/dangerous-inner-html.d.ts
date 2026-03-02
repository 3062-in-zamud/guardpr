export interface XssRuleMatch {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    matchedCode: string;
    ruleName: string;
    cwe: string;
    description: string;
}
export interface XssRule {
    readonly name: string;
    readonly cwe: string;
    readonly description: string;
    scan(content: string, filePath: string): XssRuleMatch[];
}
export declare class DangerousInnerHtmlRule implements XssRule {
    readonly name = "dangerous-inner-html";
    readonly cwe = "CWE-79";
    readonly description = "Detects dangerouslySetInnerHTML with non-literal expressions, which may allow XSS attacks.";
    scan(content: string, _filePath: string): XssRuleMatch[];
}
//# sourceMappingURL=dangerous-inner-html.d.ts.map