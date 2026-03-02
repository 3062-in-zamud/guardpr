import * as fs from "fs";

import { describe, it, expect, vi, beforeEach } from "vitest";

import { XssSanitizationStrategy } from "../../../src/patching/strategies/xss-sanitization";
import { Finding } from "../../../src/types";

vi.mock("fs");

const mockedFs = vi.mocked(fs);

function makeXssFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    fingerprint: "fp-xss-1",
    scannerId: "xss-scanner",
    category: "xss",
    severity: "P1",
    cwe: "CWE-79",
    title: "Potential XSS via dangerouslySetInnerHTML",
    description: "User input rendered as HTML without sanitization",
    location: { file: "src/components/Comment.tsx", startLine: 15, endLine: 15 },
    codeSnippet: "dangerouslySetInnerHTML={{ __html: userInput }}",
    confidence: 0.85,
    confidenceFactors: [],
    ...overrides,
  };
}

describe("XssSanitizationStrategy", () => {
  const strategy = new XssSanitizationStrategy();

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("wraps dangerouslySetInnerHTML with DOMPurify.sanitize", async () => {
    const fileContent = [
      'import React from "react";',
      "",
      "export function Comment({ userInput }) {",
      "  return (",
      "    <div",
      '      className="comment"',
      "      dangerouslySetInnerHTML={{ __html: userInput }}",
      "    />",
      "  );",
      "}",
    ].join("\n");

    mockedFs.readFileSync.mockReturnValue(fileContent);

    const finding = makeXssFinding({
      location: { file: "src/components/Comment.tsx", startLine: 7, endLine: 7 },
      codeSnippet: "dangerouslySetInnerHTML={{ __html: userInput }}",
    });

    const patch = await strategy.generate(finding, "/workdir");

    expect(patch.type).toBe("auto-fix");
    expect(patch.fileChanges).toHaveLength(1);
    expect(patch.fileChanges[0]!.diff).toContain("DOMPurify.sanitize");
    expect(patch.fileChanges[0]!.diff).toContain("isomorphic-dompurify");
  });

  it("wraps innerHTML assignment with DOMPurify.sanitize", async () => {
    const fileContent = [
      "function render(container, html) {",
      "  container.innerHTML = html;",
      "}",
    ].join("\n");

    mockedFs.readFileSync.mockReturnValue(fileContent);

    const finding = makeXssFinding({
      location: { file: "src/render.ts", startLine: 2, endLine: 2 },
      codeSnippet: "container.innerHTML = html;",
    });

    const patch = await strategy.generate(finding, "/workdir");

    expect(patch.type).toBe("auto-fix");
    expect(patch.fileChanges[0]!.diff).toContain("DOMPurify.sanitize");
  });

  it("handles eval by replacing with Function()", async () => {
    const fileContent = ["function run(code) {", "  eval(code);", "}"].join("\n");

    mockedFs.readFileSync.mockReturnValue(fileContent);

    const finding = makeXssFinding({
      location: { file: "src/eval.ts", startLine: 2, endLine: 2 },
      codeSnippet: "eval(code)",
    });

    const patch = await strategy.generate(finding, "/workdir");

    expect(patch.type).toBe("auto-fix");
    expect(patch.fileChanges[0]!.diff).toContain("SECURITY");
    expect(patch.fileChanges[0]!.diff).toContain("Function");
    // modifiedContent should exist for direct file write in test-runner
    expect(patch.fileChanges[0]!.modifiedContent).toBeDefined();
    expect(patch.fileChanges[0]!.modifiedContent).toContain("Function");
    expect(patch.fileChanges[0]!.modifiedContent).not.toContain("eval(code)");
  });

  it("does not duplicate DOMPurify import if already present", async () => {
    const fileContent = [
      'import DOMPurify from "isomorphic-dompurify";',
      "",
      "function render(html) {",
      "  container.innerHTML = html;",
      "}",
    ].join("\n");

    mockedFs.readFileSync.mockReturnValue(fileContent);

    const finding = makeXssFinding({
      location: { file: "src/render.ts", startLine: 4, endLine: 4 },
      codeSnippet: "container.innerHTML = html;",
    });

    const patch = await strategy.generate(finding, "/workdir");

    // Should only appear in context lines (prefixed with space), not as an addition (prefixed with +)
    const addedImportCount = (patch.fileChanges[0]!.diff.match(/\+.*isomorphic-dompurify/g) || [])
      .length;
    expect(addedImportCount).toBe(0);
  });

  it("returns generation-failed for invalid line number", async () => {
    mockedFs.readFileSync.mockReturnValue("single line file");

    const finding = makeXssFinding({
      location: { file: "src/short.ts", startLine: 100, endLine: 100 },
    });

    const patch = await strategy.generate(finding, "/workdir");
    expect(patch.status).toBe("generation-failed");
  });

  it("sets breaking risk to low", async () => {
    const fileContent = ["function render(html) {", "  container.innerHTML = html;", "}"].join(
      "\n",
    );

    mockedFs.readFileSync.mockReturnValue(fileContent);

    const finding = makeXssFinding({
      location: { file: "src/render.ts", startLine: 2, endLine: 2 },
      codeSnippet: "container.innerHTML = html;",
    });

    const patch = await strategy.generate(finding, "/workdir");
    expect(patch.breakingRisk).toBe("low");
  });
});
