import { describe, it, expect } from "vitest";

import { convertSarifToFindings } from "../../../src/sarif/converter";
import { SarifLog } from "../../../src/sarif/types";

function makeLog(overrides: Partial<SarifLog> = {}): SarifLog {
  return {
    version: "2.1.0",
    runs: [
      {
        tool: { driver: { name: "TestTool", rules: [] } },
        results: [],
      },
    ],
    ...overrides,
  };
}

describe("convertSarifToFindings", () => {
  it("maps error level to P0", () => {
    const log = makeLog({
      runs: [
        {
          tool: { driver: { name: "T", rules: [] } },
          results: [{ level: "error", message: { text: "err" }, locations: [{ physicalLocation: { artifactLocation: { uri: "a.ts" }, region: { startLine: 1 } } }] }],
        },
      ],
    });
    const findings = convertSarifToFindings(log);
    expect(findings[0].severity).toBe("P0");
  });

  it("maps warning level to P1", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [] } },
        results: [{ level: "warning", message: { text: "warn" } }],
      }],
    });
    expect(convertSarifToFindings(log)[0].severity).toBe("P1");
  });

  it("maps note level to P2", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [] } },
        results: [{ level: "note", message: { text: "note" } }],
      }],
    });
    expect(convertSarifToFindings(log)[0].severity).toBe("P2");
  });

  it("maps undefined level to P2", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [] } },
        results: [{ message: { text: "no level" } }],
      }],
    });
    expect(convertSarifToFindings(log)[0].severity).toBe("P2");
  });

  it("maps CWE-79 to xss category", () => {
    const log = makeLog({
      runs: [{
        tool: {
          driver: {
            name: "T",
            rules: [{ id: "R1", properties: { tags: ["external/cwe/cwe-79"] } }],
          },
        },
        results: [{ ruleId: "R1", message: { text: "xss" } }],
      }],
    });
    const findings = convertSarifToFindings(log);
    expect(findings[0].category).toBe("xss");
    expect(findings[0].cwe).toBe("CWE-79");
  });

  it("maps CWE-798 to secrets category", () => {
    const log = makeLog({
      runs: [{
        tool: {
          driver: {
            name: "T",
            rules: [{ id: "R1", properties: { tags: ["external/cwe/cwe-798"] } }],
          },
        },
        results: [{ ruleId: "R1", message: { text: "secret" } }],
      }],
    });
    expect(convertSarifToFindings(log)[0].category).toBe("secrets");
  });

  it("falls back to external for no CWE tags", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [{ id: "R1" }] } },
        results: [{ ruleId: "R1", message: { text: "generic" } }],
      }],
    });
    expect(convertSarifToFindings(log)[0].category).toBe("external");
  });

  it("falls back to external for unknown CWE", () => {
    const log = makeLog({
      runs: [{
        tool: {
          driver: {
            name: "T",
            rules: [{ id: "R1", properties: { tags: ["external/cwe/cwe-999"] } }],
          },
        },
        results: [{ ruleId: "R1", message: { text: "unknown cwe" } }],
      }],
    });
    expect(convertSarifToFindings(log)[0].category).toBe("external");
  });

  it("sets default confidence to 0.95", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [] } },
        results: [{ message: { text: "test" } }],
      }],
    });
    expect(convertSarifToFindings(log)[0].confidence).toBe(0.95);
  });

  it("uses SARIF fingerprints when present", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [] } },
        results: [{
          message: { text: "test" },
          fingerprints: { "primaryLocationLineHash": "custom-fp-123" },
        }],
      }],
    });
    expect(convertSarifToFindings(log)[0].fingerprint).toBe("custom-fp-123");
  });

  it("generates sha256 fingerprint when no SARIF fingerprints", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [] } },
        results: [{
          ruleId: "R1",
          message: { text: "test" },
          locations: [{ physicalLocation: { artifactLocation: { uri: "f.ts" }, region: { startLine: 5 } } }],
        }],
      }],
    });
    const fp = convertSarifToFindings(log)[0].fingerprint;
    expect(fp).toMatch(/^[a-f0-9]{64}$/);
  });

  it("maps location information", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [] } },
        results: [{
          message: { text: "test" },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: "src/file.ts" },
              region: { startLine: 10, endLine: 12, startColumn: 3, endColumn: 20 },
            },
          }],
        }],
      }],
    });
    const loc = convertSarifToFindings(log)[0].location;
    expect(loc).toEqual({ file: "src/file.ts", startLine: 10, endLine: 12, startColumn: 3, endColumn: 20 });
  });

  it("uses rule shortDescription as title", () => {
    const log = makeLog({
      runs: [{
        tool: {
          driver: {
            name: "T",
            rules: [{ id: "R1", shortDescription: { text: "Rule Title" } }],
          },
        },
        results: [{ ruleId: "R1", message: { text: "msg" } }],
      }],
    });
    expect(convertSarifToFindings(log)[0].title).toBe("Rule Title");
  });

  it("converts multiple results to multiple findings", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [] } },
        results: [
          { message: { text: "a" } },
          { message: { text: "b" } },
          { message: { text: "c" } },
        ],
      }],
    });
    expect(convertSarifToFindings(log)).toHaveLength(3);
  });

  it("returns empty array for 0 results", () => {
    const log = makeLog({
      runs: [{
        tool: { driver: { name: "T", rules: [] } },
        results: [],
      }],
    });
    expect(convertSarifToFindings(log)).toHaveLength(0);
  });
});
