import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock os module to allow overriding platform/arch
vi.mock("os", async () => {
  const actual = await vi.importActual<typeof import("os")>("os");
  return {
    ...actual,
    platform: vi.fn(() => actual.platform()),
    arch: vi.fn(() => actual.arch()),
  };
});

import { getPlatformKey, verifyChecksum } from "../../../src/scanners/tool-installer";

describe("tool-installer", () => {
  describe("getPlatformKey", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns linux-x64 for linux/x64", () => {
      vi.mocked(os.platform).mockReturnValue("linux");
      vi.mocked(os.arch).mockReturnValue("x64");
      expect(getPlatformKey()).toBe("linux-x64");
    });

    it("returns darwin-arm64 for macOS/arm64", () => {
      vi.mocked(os.platform).mockReturnValue("darwin");
      vi.mocked(os.arch).mockReturnValue("arm64");
      expect(getPlatformKey()).toBe("darwin-arm64");
    });

    it("returns darwin-x64 for macOS/x64", () => {
      vi.mocked(os.platform).mockReturnValue("darwin");
      vi.mocked(os.arch).mockReturnValue("x64");
      expect(getPlatformKey()).toBe("darwin-x64");
    });

    it("throws for unsupported platform", () => {
      vi.mocked(os.platform).mockReturnValue("win32");
      vi.mocked(os.arch).mockReturnValue("x64");
      expect(() => getPlatformKey()).toThrow("Unsupported platform: win32");
    });

    it("throws for unsupported architecture", () => {
      vi.mocked(os.platform).mockReturnValue("linux");
      vi.mocked(os.arch).mockReturnValue("ia32");
      expect(() => getPlatformKey()).toThrow("Unsupported architecture: ia32");
    });
  });

  describe("verifyChecksum", () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "checksum-test-"));
    });

    afterEach(async () => {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    });

    it("passes with correct SHA-256 hash", async () => {
      const content = "test file content for hashing";
      const filePath = path.join(tmpDir, "testfile.bin");
      await fs.promises.writeFile(filePath, content);

      const expectedHash = crypto.createHash("sha256").update(Buffer.from(content)).digest("hex");

      await expect(verifyChecksum(filePath, expectedHash)).resolves.toBeUndefined();
    });

    it("throws CHECKSUM_MISMATCH on wrong hash", async () => {
      const content = "actual content";
      const filePath = path.join(tmpDir, "testfile.bin");
      await fs.promises.writeFile(filePath, content);

      const wrongHash = "0000000000000000000000000000000000000000000000000000000000000000";

      await expect(verifyChecksum(filePath, wrongHash)).rejects.toThrow("Checksum mismatch");

      try {
        await verifyChecksum(filePath, wrongHash);
      } catch (err: any) {
        expect(err.code).toBe("CHECKSUM_MISMATCH");
      }
    });

    it("works with binary file content", async () => {
      const binaryContent = Buffer.from([0x00, 0xff, 0x42, 0xab, 0xcd, 0xef]);
      const filePath = path.join(tmpDir, "binary.bin");
      await fs.promises.writeFile(filePath, binaryContent);

      const expectedHash = crypto.createHash("sha256").update(binaryContent).digest("hex");

      await expect(verifyChecksum(filePath, expectedHash)).resolves.toBeUndefined();
    });
  });
});
