import { describe, it, expect } from "vitest";

import { redactText } from "../../../src/masking/redactor";

describe("redactText", () => {
  it("masks AWS Access Key IDs", () => {
    const text = "Found key: AKIAIOSFODNN7EXAMPLE in config";
    const { redacted, secretValues } = redactText(text);

    expect(redacted).toContain("AKIA");
    expect(redacted).toContain("MPLE");
    expect(redacted).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(secretValues).toContain("AKIAIOSFODNN7EXAMPLE");
  });

  it("masks GitHub PAT (classic)", () => {
    const pat = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
    const text = `Token: ${pat}`;
    const { redacted, secretValues } = redactText(text);

    expect(redacted).not.toContain(pat);
    expect(redacted).toContain("ghp_[REDACTED");
    expect(secretValues).toContain(pat);
  });

  it("masks GitHub PAT (fine-grained)", () => {
    const pat = "github_pat_" + "A".repeat(82);
    const text = `Token: ${pat}`;
    const { redacted, secretValues } = redactText(text);

    expect(redacted).not.toContain(pat);
    expect(redacted).toContain("gith[REDACTED");
    expect(secretValues).toContain(pat);
  });

  it("masks RSA Private Keys", () => {
    const key = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy5AYjQ==
-----END RSA PRIVATE KEY-----`;
    const text = `Key found: ${key} done`;
    const { redacted, secretValues } = redactText(text);

    expect(redacted).not.toContain("MIIEow");
    expect(redacted).toContain("[REDACTED RSA PRIVATE KEY]");
    expect(secretValues).toHaveLength(1);
    expect(secretValues[0]).toContain("BEGIN RSA PRIVATE KEY");
  });

  it("masks generic password assignments", () => {
    const text = 'const password = "SuperSecret123!"';
    const { redacted, secretValues } = redactText(text);

    expect(redacted).not.toContain("SuperSecret123!");
    expect(secretValues.length).toBeGreaterThan(0);
  });

  it("returns unchanged text when no secrets found", () => {
    const text = "Hello world, no secrets here";
    const { redacted, secretValues } = redactText(text);

    expect(redacted).toBe(text);
    expect(secretValues).toHaveLength(0);
  });

  it("handles multiple secrets in the same text", () => {
    const text = "Key: AKIAIOSFODNN7EXAMPLE and token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
    const { redacted, secretValues } = redactText(text);

    expect(secretValues).toHaveLength(2);
    expect(redacted).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(redacted).not.toContain("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij");
  });

  it("does not duplicate secret values for repeated matches", () => {
    const key = "AKIAIOSFODNN7EXAMPLE";
    const text = `First: ${key} Second: ${key}`;
    const { secretValues } = redactText(text);

    expect(secretValues).toHaveLength(1);
  });
});
