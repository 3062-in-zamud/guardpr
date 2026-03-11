import { GuardPRError } from "../types/errors";

// GPR- prefix + 4 segments of 4 Base32 characters (A-Z, 2-7)
const LICENSE_KEY_REGEX = /^GPR-[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}-[A-Z2-7]{4}$/;

export interface LicenseStatus {
  valid: boolean;
  proEnabled: boolean;
}

export function validateLicenseKey(key: string): LicenseStatus {
  if (key === "") {
    return { valid: true, proEnabled: false };
  }

  if (LICENSE_KEY_REGEX.test(key)) {
    return { valid: true, proEnabled: true };
  }

  return { valid: false, proEnabled: false };
}

export function isProEnabled(key?: string): boolean {
  if (key === undefined || key === "") {
    return false;
  }
  return validateLicenseKey(key).proEnabled;
}

// TODO: Phase 3 — HMAC署名検証 or Stripe API検証を追加
export function enforceLicenseGate(key: string): void {
  if (key === "") {
    return;
  }

  const status = validateLicenseKey(key);
  if (!status.valid) {
    throw new GuardPRError(
      "Invalid license key format. Expected: GPR-XXXX-XXXX-XXXX-XXXX (Base32). " +
        "Check that you copied the full key from https://guardpr.dev/account. " +
        "To run in Community mode, remove the pro-license-key input.",
      "LICENSE_INVALID",
      false,
    );
  }
}
