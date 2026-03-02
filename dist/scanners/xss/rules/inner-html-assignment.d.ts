import { XssRule, XssRuleMatch } from "./dangerous-inner-html";
export declare class InnerHtmlAssignmentRule implements XssRule {
    readonly name = "inner-html-assignment";
    readonly cwe = "CWE-79";
    readonly description = "Detects direct innerHTML or outerHTML assignment, which may allow XSS attacks.";
    scan(content: string, _filePath: string): XssRuleMatch[];
}
//# sourceMappingURL=inner-html-assignment.d.ts.map