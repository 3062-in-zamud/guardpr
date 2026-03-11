import * as https from "https";
import * as http from "http";

import { NotificationContext } from "./types";

const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_000;

function getColor(ctx: NotificationContext): string {
  if (ctx.bySeverity.P0 > 0) return "attention";
  if (ctx.bySeverity.P1 > 0) return "warning";
  return "good";
}

export function buildTeamsCard(ctx: NotificationContext): object {
  const total = ctx.highConfidenceCount + ctx.lowConfidenceCount;
  const color = getColor(ctx);

  const facts = [
    { title: "P0 (Critical)", value: String(ctx.bySeverity.P0) },
    { title: "P1 (High)", value: String(ctx.bySeverity.P1) },
    { title: "P2 (Medium)", value: String(ctx.bySeverity.P2) },
    { title: "Total", value: String(total) },
  ];

  const body: object[] = [
    {
      type: "TextBlock",
      size: "Medium",
      weight: "Bolder",
      text: `GuardPR Scan: ${ctx.repository}`,
    },
    {
      type: "FactSet",
      facts,
    },
  ];

  if (ctx.prUrl !== undefined) {
    body.push({
      type: "TextBlock",
      text: `[Fix PR #${ctx.prNumber ?? ""}](${ctx.prUrl})`,
    });
  }

  const actions = [
    {
      type: "Action.OpenUrl",
      title: "View scan log",
      url: `https://github.com/${ctx.repository}/actions/runs/${ctx.runId}`,
    },
  ];

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          type: "AdaptiveCard",
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          version: "1.4",
          msteams: { width: "Full" },
          body,
          actions,
          style: color,
        },
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
      reject(new Error("Teams notification request timed out"));
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

export async function sendTeamsNotification(
  webhookUrl: string,
  ctx: NotificationContext,
): Promise<void> {
  const payload = buildTeamsCard(ctx);
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

  throw new Error(`Teams notification failed with status ${retryStatus} after retry`);
}
