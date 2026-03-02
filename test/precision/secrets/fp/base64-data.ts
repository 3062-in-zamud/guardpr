// False positive: base64-encoded data that resembles a key pattern but is not a secret

// Base64 encoded JSON config: {"app":"myapp","env":"production","version":"2.1"}
const CONFIG_DATA = "eyJhcHAiOiJteWFwcCIsImVudiI6InByb2R1Y3Rpb24iLCJ2ZXJzaW9uIjoiMi4xIn0=";

// Base64 encoded SVG icon (small)
const ICON_DATA =
  "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PC9zdmc+";

// SHA-256 hash (not a secret, just a checksum)
const FILE_HASH = "a3f2b8c1d4e5f6789012345678901234567890abcdef1234567890abcdef1234";

export function decodeConfig(): Record<string, string> {
  return JSON.parse(Buffer.from(CONFIG_DATA, "base64").toString());
}

export function getIcon(): string {
  return Buffer.from(ICON_DATA, "base64").toString();
}

export function verifyHash(input: string): boolean {
  return input === FILE_HASH;
}
