import * as http from "http";

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { buildSlackBlocks, sendSlackNotification } from "../../../src/notifications/slack";
import { NotificationContext } from "../../../src/notifications/types";

function makeCtx(overrides: Partial<NotificationContext> = {}): NotificationContext {
  return {
    highConfidenceCount: 3,
    lowConfidenceCount: 1,
    bySeverity: { P0: 1, P1: 1, P2: 1 },
    repository: "owner/repo",
    runId: 123,
    ...overrides,
  };
}

describe("buildSlackBlocks", () => {
  it("uses red color when P0 > 0", () => {
    const payload = buildSlackBlocks(makeCtx({ bySeverity: { P0: 1, P1: 0, P2: 0 } })) as any;
    expect(payload.attachments[0].color).toBe("#dc3545");
  });

  it("uses yellow color when P1 only", () => {
    const payload = buildSlackBlocks(makeCtx({ bySeverity: { P0: 0, P1: 2, P2: 0 } })) as any;
    expect(payload.attachments[0].color).toBe("#ffc107");
  });

  it("uses green color when no P0/P1", () => {
    const payload = buildSlackBlocks(makeCtx({ bySeverity: { P0: 0, P1: 0, P2: 1 } })) as any;
    expect(payload.attachments[0].color).toBe("#28a745");
  });

  it("includes finding counts in text", () => {
    const payload = buildSlackBlocks(makeCtx()) as any;
    const text = JSON.stringify(payload);
    expect(text).toContain("4"); // total = 3 + 1
  });

  it("includes PR link when prUrl is set", () => {
    const payload = buildSlackBlocks(
      makeCtx({ prUrl: "https://github.com/o/r/pull/42", prNumber: 42 }),
    ) as any;
    const text = JSON.stringify(payload);
    expect(text).toContain("https://github.com/o/r/pull/42");
  });

  it("excludes PR section when prUrl is undefined", () => {
    const payload = buildSlackBlocks(makeCtx()) as any;
    const text = JSON.stringify(payload);
    expect(text).not.toContain("Fix PR");
  });

  it("includes repository name", () => {
    const payload = buildSlackBlocks(makeCtx({ repository: "my-org/my-repo" })) as any;
    const text = JSON.stringify(payload);
    expect(text).toContain("my-org/my-repo");
  });

  it("generates blocks even when all counts are 0", () => {
    const payload = buildSlackBlocks(
      makeCtx({ highConfidenceCount: 0, lowConfidenceCount: 0, bySeverity: { P0: 0, P1: 0, P2: 0 } }),
    ) as any;
    expect(payload.attachments[0].blocks.length).toBeGreaterThan(0);
  });
});

describe("sendSlackNotification", () => {
  let server: http.Server;
  let serverPort: number;
  let requestCount: number;
  let responseStatus: number;
  let responseStatuses: number[];
  let lastRequestHeaders: http.IncomingHttpHeaders;

  function startServer(): Promise<void> {
    return new Promise((resolve) => {
      server = http.createServer((req, res) => {
        requestCount++;
        lastRequestHeaders = req.headers;
        req.on("data", () => {});
        req.on("end", () => {
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

  beforeEach(async () => {
    requestCount = 0;
    responseStatus = 200;
    responseStatuses = [];
    lastRequestHeaders = {};
    await startServer();
  });

  afterEach(async () => {
    await stopServer();
  });

  it("sends successfully on 200", async () => {
    await sendSlackNotification(`http://localhost:${serverPort}/webhook`, makeCtx());
    expect(requestCount).toBe(1);
  });

  it("throws on non-2xx after retry", async () => {
    responseStatuses = [500, 502];
    await expect(
      sendSlackNotification(`http://localhost:${serverPort}/webhook`, makeCtx()),
    ).rejects.toThrow("Slack notification failed");
    expect(requestCount).toBe(2);
  });

  it("sends Content-Type application/json", async () => {
    await sendSlackNotification(`http://localhost:${serverPort}/webhook`, makeCtx());
    expect(lastRequestHeaders["content-type"]).toBe("application/json");
  });

  it("throws on network error", async () => {
    await stopServer();
    await expect(
      sendSlackNotification(`http://localhost:${serverPort}/webhook`, makeCtx()),
    ).rejects.toThrow();
    // Re-start so afterEach doesn't fail
    await startServer();
  });
});
