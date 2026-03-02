import { XssRule, XssRuleMatch } from "./dangerous-inner-html";
export declare class UrlXssRule implements XssRule {
    readonly name = "url-xss";
    readonly cwe = "CWE-79";
    readonly description = "Detects javascript: protocol in href/src attributes and dynamic URL construction with user input.";
    scan(content: string, _filePath: string): XssRuleMatch[];
}
//# sourceMappingURL=url-xss.d.ts.map