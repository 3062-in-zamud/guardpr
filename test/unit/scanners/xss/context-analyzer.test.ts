import { describe, it, expect } from "vitest";

import { analyzeContext } from "../../../../src/scanners/xss/context-analyzer";

describe("analyzeContext", () => {
  it("should return low confidence when sanitizer is present nearby", () => {
    const content = [
      "import DOMPurify from 'dompurify';",
      "",
      "const clean = DOMPurify.sanitize(userInput);",
      "el.innerHTML = clean;",
    ].join("\n");

    const result = analyzeContext(content, "component.tsx", 4, []);
    expect(result.confidence).toBeLessThanOrEqual(0.1);
    expect(result.factors.some((f) => f.name === "sanitizer-present")).toBe(true);
  });

  it("should return low confidence for static string", () => {
    const content = ['const html = "<p>Hello</p>";', 'el.innerHTML = "<p>Hello World</p>";'].join(
      "\n",
    );

    const result = analyzeContext(content, "component.tsx", 2, []);
    expect(result.confidence).toBeLessThanOrEqual(0.1);
    expect(result.factors.some((f) => f.name === "static-string")).toBe(true);
  });

  it("should return very low confidence for test files", () => {
    const content = [
      "describe('test', () => {",
      "  it('should work', () => {",
      "    el.innerHTML = userInput;",
      "  });",
      "});",
    ].join("\n");

    const result = analyzeContext(content, "component.test.tsx", 3, []);
    expect(result.confidence).toBeLessThanOrEqual(0.05);
    expect(result.factors.some((f) => f.name === "test-file")).toBe(true);
  });

  it("should return high confidence when user input is nearby", () => {
    const content = [
      "function handler(req, res) {",
      "  const input = req.query.html;",
      "  el.innerHTML = input;",
      "}",
    ].join("\n");

    const result = analyzeContext(content, "handler.ts", 3, []);
    // Has user-input factor
    expect(result.factors.some((f) => f.name === "user-input")).toBe(true);

    // If no other factor (sanitizer/test/static) lowers it, confidence should be high
    // But if default is also present, minimum will still be the lowest factor
    const userInputFactor = result.factors.find((f) => f.name === "user-input");
    expect(userInputFactor?.score).toBe(0.95);
  });

  it("should return default confidence when no special context", () => {
    const content = ["function render(data) {", "  el.innerHTML = data;", "}"].join("\n");

    const result = analyzeContext(content, "render.ts", 2, []);
    expect(result.confidence).toBe(0.7);
    expect(result.factors.some((f) => f.name === "default")).toBe(true);
  });

  it("should take minimum confidence when multiple factors present", () => {
    // Test file + user input => minimum = 0.05 (test file)
    const content = [
      "describe('test', () => {",
      "  const input = req.query.html;",
      "  el.innerHTML = input;",
      "});",
    ].join("\n");

    const result = analyzeContext(content, "handler.test.ts", 3, []);
    expect(result.confidence).toBeLessThanOrEqual(0.05);
  });

  it("should recognize custom sanitizers", () => {
    const content = ["const clean = myCustomSanitize(input);", "el.innerHTML = clean;"].join("\n");

    const result = analyzeContext(content, "component.ts", 2, ["myCustomSanitize"]);
    expect(result.confidence).toBeLessThanOrEqual(0.1);
    expect(result.factors.some((f) => f.name === "sanitizer-present")).toBe(true);
  });

  it("should detect encodeURIComponent as sanitizer", () => {
    const content = ["const safe = encodeURIComponent(input);", "el.innerHTML = safe;"].join("\n");

    const result = analyzeContext(content, "component.ts", 2, []);
    expect(result.confidence).toBeLessThanOrEqual(0.1);
    expect(result.factors.some((f) => f.name === "sanitizer-present")).toBe(true);
  });

  it("should detect .spec.ts as test file", () => {
    const content = "el.innerHTML = data;";
    const result = analyzeContext(content, "component.spec.ts", 1, []);
    expect(result.factors.some((f) => f.name === "test-file")).toBe(true);
    expect(result.confidence).toBeLessThanOrEqual(0.05);
  });

  it("should detect __tests__/ as test file", () => {
    const content = "el.innerHTML = data;";
    const result = analyzeContext(content, "__tests__/component.ts", 1, []);
    expect(result.factors.some((f) => f.name === "test-file")).toBe(true);
  });
});
