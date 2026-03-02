import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

import { describe, it, expect } from "vitest";

import { parseOsvOutput } from "../../../../src/scanners/osv-scanner/parser";

const fixturePath = path.resolve(__dirname, "../../../fixtures/osv-scanner-output.json");
const fixtureJson = fs.readFileSync(fixturePath, "utf-8");

describe("osv-scanner parser", () => {
  describe("parseOsvOutput", () => {
    it("parses fixture into correct number of findings", () => {
      const findings = parseOsvOutput(fixtureJson);
      // 2 lodash vulns + 1 express + 1 tar = 4
      expect(findings).toHaveLength(4);
    });

    it("maps lodash prototype pollution finding correctly", () => {
      const findings = parseOsvOutput(fixtureJson);
      const lodashFinding = findings.find((f) => f.title.includes("GHSA-jf85-cpcp-j695"))!;

      expect(lodashFinding).toBeDefined();
      expect(lodashFinding.scannerId).toBe("osv-scanner");
      expect(lodashFinding.category).toBe("dependencies");
      expect(lodashFinding.title).toContain("Prototype Pollution");
      expect(lodashFinding.location.file).toBe("package-lock.json");
    });

    it("includes dependency info with package details", () => {
      const findings = parseOsvOutput(fixtureJson);
      const lodashFinding = findings.find((f) => f.title.includes("GHSA-jf85-cpcp-j695"))!;

      expect(lodashFinding.dependency).toBeDefined();
      expect(lodashFinding.dependency!.name).toBe("lodash");
      expect(lodashFinding.dependency!.ecosystem).toBe("npm");
      expect(lodashFinding.dependency!.installedVersion).toBe("4.17.20");
      expect(lodashFinding.dependency!.fixedVersion).toBe("4.17.21");
    });

    it("includes advisory URL when available", () => {
      const findings = parseOsvOutput(fixtureJson);
      const lodashFinding = findings.find((f) => f.title.includes("GHSA-jf85-cpcp-j695"))!;

      expect(lodashFinding.dependency!.advisoryUrl).toBe(
        "https://github.com/advisories/GHSA-jf85-cpcp-j695",
      );
    });

    it("generates deterministic fingerprints", () => {
      const findings = parseOsvOutput(fixtureJson);
      const lodashFinding = findings.find((f) => f.title.includes("GHSA-jf85-cpcp-j695"))!;

      const expectedFingerprint = crypto
        .createHash("sha256")
        .update("osv:GHSA-jf85-cpcp-j695:lodash:4.17.20")
        .digest("hex");

      expect(lodashFinding.fingerprint).toBe(expectedFingerprint);
    });

    it("produces unique fingerprints for different vulnerabilities", () => {
      const findings = parseOsvOutput(fixtureJson);
      const fingerprints = findings.map((f) => f.fingerprint);
      const unique = new Set(fingerprints);
      expect(unique.size).toBe(fingerprints.length);
    });

    it("maps severity based on CVSS score", () => {
      const findings = parseOsvOutput(fixtureJson);

      // lodash GHSA-35jh: CVSS 7.2 -> P1
      const cmdInjection = findings.find((f) => f.title.includes("GHSA-35jh"))!;
      expect(cmdInjection.severity).toBe("P1");

      // tar GHSA-r628: CVSS 8.6 -> P1 (still < 9.0)
      const tarFinding = findings.find((f) => f.title.includes("GHSA-r628"))!;
      expect(tarFinding.severity).toBe("P1");

      // lodash GHSA-jf85: CVSS 5.3 -> P1 (default)
      const protoPollution = findings.find((f) => f.title.includes("GHSA-jf85"))!;
      expect(protoPollution.severity).toBe("P1");
    });

    it("includes CWE ids from database_specific", () => {
      const findings = parseOsvOutput(fixtureJson);
      const tarFinding = findings.find((f) => f.title.includes("GHSA-r628"))!;
      expect(tarFinding.cwe).toBe("CWE-22");
    });

    it("extracts fix-available confidence factor", () => {
      const findings = parseOsvOutput(fixtureJson);
      const lodashFinding = findings.find((f) => f.title.includes("GHSA-jf85"))!;

      const fixFactor = lodashFinding.confidenceFactors.find((f) => f.name === "fix-available");
      expect(fixFactor).toBeDefined();
      expect(fixFactor!.reason).toContain("4.17.21");
    });

    it("sets codeSnippet to package@version", () => {
      const findings = parseOsvOutput(fixtureJson);
      const expressFinding = findings.find((f) => f.title.includes("GHSA-rv95"))!;
      expect(expressFinding.codeSnippet).toBe("express@4.17.1");
    });

    it("returns empty array for empty input", () => {
      expect(parseOsvOutput("")).toEqual([]);
      expect(parseOsvOutput("  ")).toEqual([]);
    });

    it("returns empty array when results field is missing", () => {
      expect(parseOsvOutput("{}")).toEqual([]);
    });

    it("preserves rawData from original vulnerability", () => {
      const findings = parseOsvOutput(fixtureJson);
      const finding = findings[0]!;
      expect(finding.rawData).toBeDefined();
      expect((finding.rawData as any).id).toBeDefined();
    });
  });
});
