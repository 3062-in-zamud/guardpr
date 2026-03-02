import { XssRule, XssRuleMatch } from "./dangerous-inner-html";
export declare class EvalUsageRule implements XssRule {
    readonly name = "eval-usage";
    readonly cwe = "CWE-95";
    readonly description = "Detects usage of eval(), new Function(), setTimeout/setInterval with string arguments, which may allow code injection.";
    scan(content: string, _filePath: string): XssRuleMatch[];
}
//# sourceMappingURL=eval-usage.d.ts.map