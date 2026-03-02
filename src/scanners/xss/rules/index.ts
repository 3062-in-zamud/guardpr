import { XssRule } from "./dangerous-inner-html";
import { DangerousInnerHtmlRule } from "./dangerous-inner-html";
import { InnerHtmlAssignmentRule } from "./inner-html-assignment";
import { EvalUsageRule } from "./eval-usage";
import { UrlXssRule } from "./url-xss";

export { XssRule, XssRuleMatch } from "./dangerous-inner-html";
export { DangerousInnerHtmlRule } from "./dangerous-inner-html";
export { InnerHtmlAssignmentRule } from "./inner-html-assignment";
export { EvalUsageRule } from "./eval-usage";
export { UrlXssRule } from "./url-xss";

export const ALL_XSS_RULES: XssRule[] = [
  new DangerousInnerHtmlRule(),
  new InnerHtmlAssignmentRule(),
  new EvalUsageRule(),
  new UrlXssRule(),
];
