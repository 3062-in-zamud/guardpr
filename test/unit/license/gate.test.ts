import { describe, it, expect } from "vitest";

import { validateLicenseKey, isProEnabled, enforceLicenseGate } from "../../../src/license/gate";
import { GuardPRError } from "../../../src/types/errors";

describe("validateLicenseKey", () => {
  it("accepts valid key GPR-ABCD-EFGH-IJKL-MNOP", () => {
    const result = validateLicenseKey("GPR-ABCD-EFGH-IJKL-MNOP");
    expect(result).toEqual({ valid: true, proEnabled: true });
  });

  it("accepts valid key with digits 2-7", () => {
    const result = validateLicenseKey("GPR-2345-67AB-CDEF-GHIJ");
    expect(result).toEqual({ valid: true, proEnabled: true });
  });

  it("accepts empty string as Community mode", () => {
    const result = validateLicenseKey("");
    expect(result).toEqual({ valid: true, proEnabled: false });
  });

  it("rejects wrong prefix", () => {
    expect(validateLicenseKey("ABC-XXXX-XXXX-XXXX-XXXX").valid).toBe(false);
  });

  it("rejects lowercase", () => {
    expect(validateLicenseKey("gpr-abcd-efgh-ijkl-mnop").valid).toBe(false);
  });

  it("rejects mixed case", () => {
    expect(validateLicenseKey("GPR-abCD-EfGH-IjKL-MnOP").valid).toBe(false);
  });

  it("rejects non-Base32 digits (0, 1, 8, 9)", () => {
    expect(validateLicenseKey("GPR-0189-ABCD-EFGH-IJKL").valid).toBe(false);
  });

  it("rejects too few segments (3)", () => {
    expect(validateLicenseKey("GPR-ABCD-EFGH-IJKL").valid).toBe(false);
  });

  it("rejects too many segments (5)", () => {
    expect(validateLicenseKey("GPR-ABCD-EFGH-IJKL-MNOP-QRST").valid).toBe(false);
  });

  it("rejects short segment (3 chars)", () => {
    expect(validateLicenseKey("GPR-ABC-EFGH-IJKL-MNOP").valid).toBe(false);
  });

  it("rejects double hyphen", () => {
    expect(validateLicenseKey("GPR-ABCD--EFGH-IJKL-MNOP").valid).toBe(false);
  });

  it("rejects trailing space", () => {
    expect(validateLicenseKey("GPR-ABCD-EFGH-IJKL-MNOP ").valid).toBe(false);
  });

  it("rejects newline in key", () => {
    expect(validateLicenseKey("GPR-ABCD-EFGH-IJKL-MNOP\n").valid).toBe(false);
  });
});

describe("isProEnabled", () => {
  it("returns false for undefined", () => {
    expect(isProEnabled(undefined)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isProEnabled("")).toBe(false);
  });

  it("returns true for valid key", () => {
    expect(isProEnabled("GPR-ABCD-EFGH-IJKL-MNOP")).toBe(true);
  });

  it("returns false for invalid key without throwing", () => {
    expect(isProEnabled("invalid-key")).toBe(false);
  });
});

describe("enforceLicenseGate", () => {
  it("does not throw for empty string", () => {
    expect(() => enforceLicenseGate("")).not.toThrow();
  });

  it("does not throw for valid key", () => {
    expect(() => enforceLicenseGate("GPR-ABCD-EFGH-IJKL-MNOP")).not.toThrow();
  });

  it("throws GuardPRError with LICENSE_INVALID for invalid key", () => {
    expect(() => enforceLicenseGate("invalid-key")).toThrow(GuardPRError);
    try {
      enforceLicenseGate("invalid-key");
    } catch (err) {
      const e = err as GuardPRError;
      expect(e.code).toBe("LICENSE_INVALID");
    }
  });

  it("thrown error has recoverable === false", () => {
    try {
      enforceLicenseGate("invalid-key");
    } catch (err) {
      const e = err as GuardPRError;
      expect(e.recoverable).toBe(false);
    }
  });

  it("error message does not contain the invalid key string", () => {
    const badKey = "LEAKED-SECRET-KEY-VALUE";
    try {
      enforceLicenseGate(badKey);
    } catch (err) {
      const e = err as GuardPRError;
      expect(e.message).not.toContain(badKey);
    }
  });
});
