import * as path from "node:path";

import { describe, it, expect } from "vitest";

import { XssScanner } from "../../../../src/scanners/xss/scanner";
import { DEFAULT_CONFIG } from "../../../../src/config/defaults";

const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/ts-files");

describe("XssScanner", () => {
  const scanner = new XssScanner();

  it("should have correct metadata", () => {
    expect(scanner.id).toBe("xss");
    expect(scanner.name).toBe("XSS Detector");
    expect(scanner.category).toBe("xss");
    expect(scanner.defaultSeverity).toBe("P1");
  });

  it("should always be available", async () => {
    const available = await scanner.isAvailable("/any/path");
    expect(available).toBe(true);
  });

  it("should find XSS vulnerabilities in fixture files", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("should detect dangerouslySetInnerHTML findings", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    const dangerousFindings = findings.filter((f) => f.title.includes("dangerous-inner-html"));
    expect(dangerousFindings.length).toBeGreaterThan(0);
  });

  it("should detect innerHTML assignment findings", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    const innerHtmlFindings = findings.filter((f) => f.title.includes("inner-html-assignment"));
    expect(innerHtmlFindings.length).toBeGreaterThan(0);
  });

  it("should detect eval usage findings", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    const evalFindings = findings.filter((f) => f.title.includes("eval-usage"));
    expect(evalFindings.length).toBeGreaterThan(0);
  });

  it("should detect URL XSS findings", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    const urlFindings = findings.filter((f) => f.title.includes("url-xss"));
    expect(urlFindings.length).toBeGreaterThan(0);
  });

  it("should have lower confidence for sanitized code", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    const sanitizedFindings = findings.filter((f) => f.location.file.includes("xss-fp-sanitized"));
    for (const finding of sanitizedFindings) {
      expect(finding.confidence).toBeLessThanOrEqual(0.1);
    }
  });

  it("should have lower confidence for test files", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    const testFindings = findings.filter((f) => f.location.file.includes("test-file.test"));
    for (const finding of testFindings) {
      expect(finding.confidence).toBeLessThanOrEqual(0.05);
    }
  });

  it("should generate unique fingerprints", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    const fingerprints = findings.map((f) => f.fingerprint);
    const uniqueFingerprints = new Set(fingerprints);
    expect(uniqueFingerprints.size).toBe(fingerprints.length);
  });

  it("should include CWE in findings", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    for (const finding of findings) {
      expect(finding.cwe).toBeDefined();
      expect(finding.cwe).toMatch(/^CWE-\d+$/);
    }
  });

  it("should include code snippets in findings", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    for (const finding of findings) {
      expect(finding.codeSnippet.length).toBeGreaterThan(0);
    }
  });

  it("should NOT produce findings for textContent file", async () => {
    const findings = await scanner.scan(FIXTURES_DIR, DEFAULT_CONFIG);
    const textContentFindings = findings.filter((f) =>
      f.location.file.includes("xss-fp-textcontent"),
    );
    expect(textContentFindings.length).toBe(0);
  });
});
