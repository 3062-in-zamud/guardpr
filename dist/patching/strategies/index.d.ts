import { DetectionCategory } from "../../types";
export interface PatchStrategy {
    generate(findingOrFindings: unknown, workDir?: string): unknown;
}
export declare function getStrategy(category: DetectionCategory): PatchStrategy;
export { SecretNotificationStrategy } from "./secret-notification";
export { DependencyUpgradeStrategy } from "./dependency-upgrade";
export { XssSanitizationStrategy } from "./xss-sanitization";
export { AuthzMiddlewareStrategy } from "./authz-middleware";
//# sourceMappingURL=index.d.ts.map