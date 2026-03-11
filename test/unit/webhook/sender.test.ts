import * as http from "http";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { sendWebhook, SendWebhookParams } from "../../../src/webhook/sender";
import { WebhookPayload } from "../../../src/webhook/payload";

const minimalPayload: WebhookPayload = {
  version: "1.0",
  timestamp: "2026-01-15T10:00:00.000Z",
  guardprVersion: "1.1.0",
  repository: { fullName: "owner/repo" },
  run: { id: 123, sha: "abc123", ref: "refs/heads/main", actor: "user", eventName: "push" },
  scan: {
    totalFindings: 0,
    highConfidenceCount: 0,
    lowConfidenceCount: 0,
    bySeverity: { P0: 0, P1: 0, P2: 0 },
    byCategory: { secrets: 0, dependencies: 0, xss: 0, authz: 0, external: 0 },
    scannerResults: [],
  },
  patches: { total: 0, testsPassed: 0, testsFailed: 0 },
  pr: { created: false },
  performance: { totalDurationMs: 5000 },
};

let server: http.Server;
let serverPort: number;
let requestCount: number;
let lastRequestBody: string;
let lastRequestHeaders: http.IncomingHttpHeaders;
let responseStatus: number;
let responseStatuses: number[];

function startServer(): Promise<void> {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      requestCount++;
      lastRequestHeaders = req.headers;
      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on("end", () => {
        lastRequestBody = body;
        const status = responseStatuses.length > 0 ? responseStatuses.shift()! : responseStatus;
        res.writeHead(status);
        res.end();
      });
    });
    server.listen(0, () => {
      const addr = server.address();
      if (addr !== null && typeof addr !== "string") {
        serverPort = addr.port;
      }
      resolve();
    });
  });
}

function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

function makeParams(overrides?: Partial<SendWebhookParams>): SendWebhookParams {
  return {
    apiKey: "test-api-key-123",
    endpoint: `http://localhost:${serverPort}/webhook`,
    payload: minimalPayload,
    ...overrides,
  };
}

describe("sendWebhook", () => {
  beforeEach(async () => {
    requestCount = 0;
    lastRequestBody = "";
    lastRequestHeaders = {};
    responseStatus = 200;
    responseStatuses = [];
    await startServer();
  });

  afterEach(async () => {
    await stopServer();
  });

  it("sends payload successfully on 200", async () => {
    responseStatus = 200;
    await sendWebhook(makeParams());

    expect(requestCount).toBe(1);
    expect(JSON.parse(lastRequestBody)).toEqual(minimalPayload);
    expect(lastRequestHeaders["content-type"]).toBe("application/json");
    expect(lastRequestHeaders["authorization"]).toBe("Bearer test-api-key-123");
  });

  it("succeeds on 2xx status codes", async () => {
    responseStatus = 201;
    await expect(sendWebhook(makeParams())).resolves.toBeUndefined();
    expect(requestCount).toBe(1);
  });

  it("retries once on non-2xx and succeeds on second attempt", async () => {
    responseStatuses = [500, 200];
    await expect(sendWebhook(makeParams())).resolves.toBeUndefined();
    expect(requestCount).toBe(2);
  });

  it("throws after retry when both attempts fail", async () => {
    responseStatuses = [500, 502];
    await expect(sendWebhook(makeParams())).rejects.toThrow(
      "Webhook failed with status 502 after retry",
    );
    expect(requestCount).toBe(2);
  });
});
