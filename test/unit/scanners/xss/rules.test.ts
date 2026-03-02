import * as fs from "node:fs";
import * as path from "node:path";

import { describe, it, expect } from "vitest";

import { DangerousInnerHtmlRule } from "../../../../src/scanners/xss/rules/dangerous-inner-html";
import { InnerHtmlAssignmentRule } from "../../../../src/scanners/xss/rules/inner-html-assignment";
import { EvalUsageRule } from "../../../../src/scanners/xss/rules/eval-usage";
import { UrlXssRule } from "../../../../src/scanners/xss/rules/url-xss";

const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/ts-files");

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
}

describe("DangerousInnerHtmlRule", () => {
  const rule = new DangerousInnerHtmlRule();

  it("should detect dangerouslySetInnerHTML with variable expression", () => {
    const content = readFixture("xss-tp-dangerous-innerhtml.tsx");
    const matches = rule.scan(content, "xss-tp-dangerous-innerhtml.tsx");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.every((m) => m.ruleName === "dangerous-inner-html")).toBe(true);
    expect(matches.every((m) => m.cwe === "CWE-79")).toBe(true);
  });

  it("should NOT detect dangerouslySetInnerHTML with static string literal", () => {
    const content = readFixture("xss-fp-static.tsx");
    const matches = rule.scan(content, "xss-fp-static.tsx");
    expect(matches.length).toBe(0);
  });

  it("should detect dangerouslySetInnerHTML even when sanitized (rule does not check sanitization)", () => {
    const content = readFixture("xss-fp-sanitized.tsx");
    const matches = rule.scan(content, "xss-fp-sanitized.tsx");
    // The rule itself matches the pattern; context-analyzer handles sanitization
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("should have correct line numbers", () => {
    const content = readFixture("xss-tp-dangerous-innerhtml.tsx");
    const matches = rule.scan(content, "xss-tp-dangerous-innerhtml.tsx");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    for (const match of matches) {
      expect(match.line).toBeGreaterThan(0);
      expect(match.endLine).toBeGreaterThanOrEqual(match.line);
      expect(match.column).toBeGreaterThan(0);
    }
  });
});

describe("InnerHtmlAssignmentRule", () => {
  const rule = new InnerHtmlAssignmentRule();

  it("should detect innerHTML and outerHTML assignments", () => {
    const content = readFixture("xss-tp-innerhtml-assignment.ts");
    const matches = rule.scan(content, "xss-tp-innerhtml-assignment.ts");
    expect(matches.length).toBe(2);
    expect(matches.some((m) => m.matchedCode.includes("innerHTML"))).toBe(true);
    expect(matches.some((m) => m.matchedCode.includes("outerHTML"))).toBe(true);
  });

  it("should NOT detect textContent assignments", () => {
    const content = readFixture("xss-fp-textcontent.ts");
    const matches = rule.scan(content, "xss-fp-textcontent.ts");
    expect(matches.length).toBe(0);
  });

  it("should have correct metadata", () => {
    const content = readFixture("xss-tp-innerhtml-assignment.ts");
    const matches = rule.scan(content, "xss-tp-innerhtml-assignment.ts");
    for (const match of matches) {
      expect(match.ruleName).toBe("inner-html-assignment");
      expect(match.cwe).toBe("CWE-79");
    }
  });
});

describe("EvalUsageRule", () => {
  const rule = new EvalUsageRule();

  it("should detect eval, new Function, setTimeout with string, setInterval with string", () => {
    const content = readFixture("xss-tp-eval.ts");
    const matches = rule.scan(content, "xss-tp-eval.ts");
    expect(matches.length).toBe(4);
  });

  it("should detect eval()", () => {
    const content = readFixture("xss-tp-eval.ts");
    const matches = rule.scan(content, "xss-tp-eval.ts");
    expect(matches.some((m) => m.matchedCode.includes("eval("))).toBe(true);
  });

  it("should detect new Function()", () => {
    const content = readFixture("xss-tp-eval.ts");
    const matches = rule.scan(content, "xss-tp-eval.ts");
    expect(matches.some((m) => m.matchedCode.includes("new Function"))).toBe(true);
  });

  it("should detect setTimeout with string argument", () => {
    const content = readFixture("xss-tp-eval.ts");
    const matches = rule.scan(content, "xss-tp-eval.ts");
    expect(matches.some((m) => m.matchedCode.includes("setTimeout"))).toBe(true);
  });

  it("should detect setInterval with string argument", () => {
    const content = readFixture("xss-tp-eval.ts");
    const matches = rule.scan(content, "xss-tp-eval.ts");
    expect(matches.some((m) => m.matchedCode.includes("setInterval"))).toBe(true);
  });

  it("should NOT detect eval in comments", () => {
    const content = `// eval(dangerous)
    const x = 1;`;
    const matches = rule.scan(content, "test.ts");
    expect(matches.length).toBe(0);
  });

  it("should have correct CWE", () => {
    const content = readFixture("xss-tp-eval.ts");
    const matches = rule.scan(content, "xss-tp-eval.ts");
    expect(matches.every((m) => m.cwe === "CWE-95")).toBe(true);
  });
});

describe("UrlXssRule", () => {
  const rule = new UrlXssRule();

  it("should detect javascript: protocol in href", () => {
    const content = readFixture("xss-tp-url-xss.tsx");
    const matches = rule.scan(content, "xss-tp-url-xss.tsx");
    expect(matches.some((m) => m.matchedCode.includes("javascript:"))).toBe(true);
  });

  it("should detect dynamic URL construction with user input", () => {
    const content = readFixture("xss-tp-url-xss.tsx");
    const matches = rule.scan(content, "xss-tp-url-xss.tsx");
    expect(matches.some((m) => m.matchedCode.includes("req.query"))).toBe(true);
  });

  it("should detect javascript: in img src", () => {
    const content = readFixture("xss-tp-url-xss.tsx");
    const matches = rule.scan(content, "xss-tp-url-xss.tsx");
    const imgMatches = matches.filter((m) => m.matchedCode.includes("img"));
    expect(imgMatches.length).toBeGreaterThanOrEqual(1);
  });

  it("should have correct metadata", () => {
    const content = readFixture("xss-tp-url-xss.tsx");
    const matches = rule.scan(content, "xss-tp-url-xss.tsx");
    expect(matches.every((m) => m.cwe === "CWE-79")).toBe(true);
    expect(matches.every((m) => m.ruleName === "url-xss")).toBe(true);
  });
});
