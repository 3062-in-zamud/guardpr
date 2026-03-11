import { GuardPRConfig } from "../types/config";
import { isProEnabled } from "../license/gate";
import { info, warn } from "../utils/logger";

import { sendSlackNotification } from "./slack";
import { sendTeamsNotification } from "./teams";
import { NotificationContext } from "./types";

export async function dispatchNotifications(
  config: GuardPRConfig,
  ctx: NotificationContext,
): Promise<void> {
  if (!isProEnabled(config.pro.licenseKey)) {
    return;
  }

  const total = ctx.highConfidenceCount + ctx.lowConfidenceCount;
  if (total === 0) {
    info("No findings — skipping notification");
    return;
  }

  const promises: Promise<void>[] = [];

  if (config.pro.slackWebhookUrl !== undefined && config.pro.slackWebhookUrl !== "") {
    promises.push(
      sendSlackNotification(config.pro.slackWebhookUrl, ctx).catch((err) => {
        warn(`Slack notification failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
      }),
    );
  }

  if (config.pro.teamsWebhookUrl !== undefined && config.pro.teamsWebhookUrl !== "") {
    promises.push(
      sendTeamsNotification(config.pro.teamsWebhookUrl, ctx).catch((err) => {
        warn(`Teams notification failed (non-fatal): ${err instanceof Error ? err.message : String(err)}`);
      }),
    );
  }

  await Promise.all(promises);
}
