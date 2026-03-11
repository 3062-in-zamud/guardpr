import { describe, it, expect, vi, beforeEach } from "vitest";

import { DEFAULT_CONFIG } from "../../../src/config/defaults";
import { isProEnabled } from "../../../src/license/gate";
import { dispatchNotifications } from "../../../src/notifications/dispatcher";
import { sendSlackNotification } from "../../../src/notifications/slack";
import { sendTeamsNotification } from "../../../src/notifications/teams";
import { GuardPRConfig } from "../../../src/types/config";
import { warn, info } from "../../../src/utils/logger";

vi.mock("../../../src/notifications/slack", () => ({
  sendSlackNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/notifications/teams", () => ({
  sendTeamsNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../src/license/gate", () => ({
  isProEnabled: vi.fn(),
}));

vi.mock("../../../src/utils/logger", () => ({
  info: vi.fn(),
  warn: vi.fn(),
}));

function makeConfig(overrides: Partial<GuardPRConfig["pro"]> = {}): GuardPRConfig {
  return {
    ...DEFAULT_CONFIG,
    pro: {
      ...DEFAULT_CONFIG.pro,
      licenseKey: "GPR-ABCD-EFGH-IJKL-MNOP",
      ...overrides,
    },
  };
}

const baseCtx = {
  highConfidenceCount: 3,
  lowConfidenceCount: 1,
  bySeverity: { P0: 1, P1: 1, P2: 1 } as const,
  repository: "owner/repo",
  runId: 123,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("dispatchNotifications", () => {
  it("does nothing when Pro is disabled", async () => {
    vi.mocked(isProEnabled).mockReturnValue(false);
    await dispatchNotifications(makeConfig(), baseCtx);
    expect(sendSlackNotification).not.toHaveBeenCalled();
    expect(sendTeamsNotification).not.toHaveBeenCalled();
  });

  it("sends Slack when Pro enabled and URL set", async () => {
    vi.mocked(isProEnabled).mockReturnValue(true);
    await dispatchNotifications(
      makeConfig({ slackWebhookUrl: "https://hooks.slack.com/test" }),
      baseCtx,
    );
    expect(sendSlackNotification).toHaveBeenCalledOnce();
  });

  it("sends Teams when Pro enabled and URL set", async () => {
    vi.mocked(isProEnabled).mockReturnValue(true);
    await dispatchNotifications(
      makeConfig({ teamsWebhookUrl: "https://outlook.webhook.office.com/test" }),
      baseCtx,
    );
    expect(sendTeamsNotification).toHaveBeenCalledOnce();
  });

  it("sends both when both URLs set", async () => {
    vi.mocked(isProEnabled).mockReturnValue(true);
    await dispatchNotifications(
      makeConfig({
        slackWebhookUrl: "https://hooks.slack.com/test",
        teamsWebhookUrl: "https://outlook.webhook.office.com/test",
      }),
      baseCtx,
    );
    expect(sendSlackNotification).toHaveBeenCalledOnce();
    expect(sendTeamsNotification).toHaveBeenCalledOnce();
  });

  it("sends nothing when Pro enabled but no URLs set", async () => {
    vi.mocked(isProEnabled).mockReturnValue(true);
    await dispatchNotifications(makeConfig(), baseCtx);
    expect(sendSlackNotification).not.toHaveBeenCalled();
    expect(sendTeamsNotification).not.toHaveBeenCalled();
  });

  it("skips notification when 0 findings", async () => {
    vi.mocked(isProEnabled).mockReturnValue(true);
    await dispatchNotifications(
      makeConfig({ slackWebhookUrl: "https://hooks.slack.com/test" }),
      { ...baseCtx, highConfidenceCount: 0, lowConfidenceCount: 0 },
    );
    expect(sendSlackNotification).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith(expect.stringContaining("skipping"));
  });

  it("handles Slack failure as non-fatal and Teams still sends", async () => {
    vi.mocked(isProEnabled).mockReturnValue(true);
    vi.mocked(sendSlackNotification).mockRejectedValueOnce(new Error("Slack down"));
    await dispatchNotifications(
      makeConfig({
        slackWebhookUrl: "https://hooks.slack.com/test",
        teamsWebhookUrl: "https://outlook.webhook.office.com/test",
      }),
      baseCtx,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Slack"));
    expect(sendTeamsNotification).toHaveBeenCalledOnce();
  });

  it("handles both failures with warnings", async () => {
    vi.mocked(isProEnabled).mockReturnValue(true);
    vi.mocked(sendSlackNotification).mockRejectedValueOnce(new Error("Slack down"));
    vi.mocked(sendTeamsNotification).mockRejectedValueOnce(new Error("Teams down"));
    await dispatchNotifications(
      makeConfig({
        slackWebhookUrl: "https://hooks.slack.com/test",
        teamsWebhookUrl: "https://outlook.webhook.office.com/test",
      }),
      baseCtx,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Slack"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Teams"));
  });
});
