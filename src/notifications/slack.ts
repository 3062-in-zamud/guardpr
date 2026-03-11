import * as https from "https";
import * as http from "http";

import { NotificationContext } from "./types";

const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_000;

function getColor(ctx: NotificationContext): string {
  if (ctx.bySeverity.P0 > 0) return "#dc3545";
  if (ctx.bySeverity.P1 > 0) return "#ffc107";
  return "#28a745";
}

export function buildSlackBlocks(ctx: NotificationContext): object {
  const total = ctx.highConfidenceCount + ctx.lowConfidenceCount;
  const color = getColor(ctx);

  const fields = [
    { type: "mrkdwn", text: `*P0 (Critical):* ${ctx.bySeverity.P0}` },
    { type: "mrkdwn", text: `*P1 (High):* ${ctx.bySeverity.P1}` },
    { type: "mrkdwn", text: `*P2 (Medium):* ${ctx.bySeverity.P2}` },
    { type: "mrkdwn", text: `*Total:* ${total}` },
  ];

  const blocks: object[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `GuardPR Scan: ${ctx.repository}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields,
    },
  ];

  if (ctx.prUrl !== undefined) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Fix PR:* <${ctx.prUrl}|#${ctx.prNumber ?? ""}>`,
      },
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `<https://github.com/${ctx.repository}/actions/runs/${ctx.runId}|View scan log>`,
      },
    ],
  });

  return {
    attachments: [
      {
        color,
        blocks,
      },
    ],
  };
}

function doPost(url: string, body: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;

    const req = mod.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: TIMEOUT_MS,
      },
      (res: http.IncomingMessage) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Slack notification request timed out"));
    });

    req.on("error", (err: Error) => {
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendSlackNotification(
  webhookUrl: string,
  ctx: NotificationContext,
): Promise<void> {
  const payload = buildSlackBlocks(ctx);
  const body = JSON.stringify(payload);

  const statusCode = await doPost(webhookUrl, body);
  if (statusCode >= 200 && statusCode < 300) {
    return;
  }

  // Retry once
  await sleep(RETRY_DELAY_MS);
  const retryStatus = await doPost(webhookUrl, body);
  if (retryStatus >= 200 && retryStatus < 300) {
    return;
  }

  throw new Error(`Slack notification failed with status ${retryStatus} after retry`);
}
