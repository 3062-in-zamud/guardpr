import { DetectionCategory } from "../../types";

import { AuthzMiddlewareStrategy } from "./authz-middleware";
import { DependencyUpgradeStrategy } from "./dependency-upgrade";
import { SecretNotificationStrategy } from "./secret-notification";
import { XssSanitizationStrategy } from "./xss-sanitization";

export interface PatchStrategy {
  generate(findingOrFindings: unknown, workDir?: string): unknown;
}

export function getStrategy(category: DetectionCategory): PatchStrategy {
  switch (category) {
    case "secrets":
      return new SecretNotificationStrategy() as unknown as PatchStrategy;
    case "dependencies":
      return new DependencyUpgradeStrategy() as unknown as PatchStrategy;
    case "xss":
      return new XssSanitizationStrategy() as unknown as PatchStrategy;
    case "authz":
      return new AuthzMiddlewareStrategy() as unknown as PatchStrategy;
    case "external":
      return new SecretNotificationStrategy() as unknown as PatchStrategy;
    default:
      throw new Error(`Unknown category: ${category as string}`);
  }
}

export { SecretNotificationStrategy } from "./secret-notification";
export { DependencyUpgradeStrategy } from "./dependency-upgrade";
export { XssSanitizationStrategy } from "./xss-sanitization";
export { AuthzMiddlewareStrategy } from "./authz-middleware";
