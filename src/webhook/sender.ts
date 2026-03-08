import * as https from "https";
import * as http from "http";

import { WebhookPayload } from "./payload";

export interface SendWebhookParams {
  apiKey: string;
  endpoint: string;
  payload: WebhookPayload;
}

const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1_000;

function doPost(url: string, body: string, apiKey: string): Promise<number> {
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
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: TIMEOUT_MS,
      },
      (res: http.IncomingMessage) => {
        // Drain the response
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Webhook request timed out"));
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

export async function sendWebhook(params: SendWebhookParams): Promise<void> {
  const body = JSON.stringify(params.payload);

  const statusCode = await doPost(params.endpoint, body, params.apiKey);
  if (statusCode >= 200 && statusCode < 300) {
    return;
  }

  // Retry once after delay
  await sleep(RETRY_DELAY_MS);
  const retryStatusCode = await doPost(params.endpoint, body, params.apiKey);
  if (retryStatusCode >= 200 && retryStatusCode < 300) {
    return;
  }

  throw new Error(`Webhook failed with status ${retryStatusCode} after retry`);
}
