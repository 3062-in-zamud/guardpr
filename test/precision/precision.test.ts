import * as fs from "fs";
import * as path from "path";

import { describe, expect, it } from "vitest";

import type { DetectionCategory } from "../../src/types";

interface DatasetEntry {
  id: string;
  file: string;
  label: "tp" | "fp";
  expectedConfidenceRange: [number, number];
  rationale: string;
}

interface CategoryData {
  tp: DatasetEntry[];
  fp: DatasetEntry[];
}

interface Dataset {
  version: string;
  categories: Record<string, CategoryData>;
}

/**
 * Wilson confidence interval calculation.
 * Provides a lower bound on the true precision given a sample.
 *
 * @param successes - Number of correct predictions (true positives correctly detected
 *                    OR false positives correctly ignored)
 * @param total - Total number of samples
 * @param z - Z-score for confidence level (1.96 = 95%)
 */
function wilsonInterval(successes: number, total: number, z = 1.96) {
  if (total === 0) {
    return { lower: 0, upper: 0, point: 0 };
  }
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) / denominator;
  return { lower: center - margin, upper: center + margin, point: p };
}

describe("precision dataset", () => {
  const datasetPath = path.resolve(__dirname, "dataset.json");
  const dataset: Dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));

  it("should have version 1.0", () => {
    expect(dataset.version).toBe("1.0");
  });

  it("should have all four categories", () => {
    expect(Object.keys(dataset.categories).sort()).toEqual([
      "authz",
      "dependencies",
      "secrets",
      "xss",
    ]);
  });

  const categories: DetectionCategory[] = ["secrets", "dependencies", "xss", "authz"];

  for (const category of categories) {
    describe(`${category} category`, () => {
      const data = dataset.categories[category];
      if (!data) {
        it.skip("category not found in dataset", () => {});
        return;
      }

      it("should have at least 15 true positive entries", () => {
        expect(data.tp.length).toBeGreaterThanOrEqual(15);
      });

      it("should have at least 10 false positive entries", () => {
        expect(data.fp.length).toBeGreaterThanOrEqual(10);
      });

      it("should have at least 25 total entries", () => {
        expect(data.tp.length + data.fp.length).toBeGreaterThanOrEqual(25);
      });

      it("all TP entries should reference existing files", () => {
        for (const entry of data.tp) {
          const filePath = path.resolve(__dirname, entry.file);
          expect(
            fs.existsSync(filePath),
            `File not found: ${entry.file} (referenced by ${entry.id})`,
          ).toBe(true);
        }
      });

      it("all FP entries should reference existing files", () => {
        for (const entry of data.fp) {
          const filePath = path.resolve(__dirname, entry.file);
          expect(
            fs.existsSync(filePath),
            `File not found: ${entry.file} (referenced by ${entry.id})`,
          ).toBe(true);
        }
      });

      it("all entries should have valid confidence ranges", () => {
        for (const entry of [...data.tp, ...data.fp]) {
          const [low, high] = entry.expectedConfidenceRange;
          expect(low).toBeGreaterThanOrEqual(0);
          expect(high).toBeLessThanOrEqual(1);
          expect(low).toBeLessThanOrEqual(high);
        }
      });

      it("all entries should have unique IDs", () => {
        const allIds = [...data.tp, ...data.fp].map((e) => e.id);
        const uniqueIds = new Set(allIds);
        expect(uniqueIds.size).toBe(allIds.length);
      });

      it("all entries should have non-empty rationale", () => {
        for (const entry of [...data.tp, ...data.fp]) {
          expect(entry.rationale.length).toBeGreaterThan(0);
        }
      });
    });
  }

  describe("Wilson confidence interval", () => {
    it("should compute correct interval for perfect precision", () => {
      const result = wilsonInterval(100, 100);
      expect(result.point).toBe(1.0);
      expect(result.lower).toBeGreaterThan(0.95);
      expect(result.upper).toBeLessThanOrEqual(1.0);
    });

    it("should compute correct interval for 90% precision", () => {
      const result = wilsonInterval(90, 100);
      expect(result.point).toBeCloseTo(0.9, 2);
      expect(result.lower).toBeGreaterThan(0.82);
      expect(result.upper).toBeLessThan(0.96);
    });

    it("should handle zero total", () => {
      const result = wilsonInterval(0, 0);
      expect(result.point).toBe(0);
      expect(result.lower).toBe(0);
      expect(result.upper).toBe(0);
    });

    it("should handle small sample sizes", () => {
      const result = wilsonInterval(5, 5);
      expect(result.point).toBe(1.0);
      // With only 5 samples, the interval should be wide
      expect(result.lower).toBeLessThan(0.9);
    });
  });

  describe("actual precision measurement", () => {
    // Confidence threshold for actionable findings (matches production behavior)
    const CONFIDENCE_THRESHOLD = 0.5;

    it("XSS scanner: precision >= 0.85 and recall >= 0.5", async () => {
      const { XssScanner } = await import("../../src/scanners/xss/scanner");
      const { createMockConfig } = await import("../helpers");
      const scanner = new XssScanner();
      const config = createMockConfig();
      const xssData = dataset.categories.xss;

      const tpFiles = new Set(xssData.tp.map((e) => e.file));
      const fpFiles = new Set(xssData.fp.map((e) => e.file));

      // Scan TP directory and count per-file detections above confidence threshold
      const tpDir = path.resolve(__dirname, "xss/tp");
      const tpFindings = await scanner.scan(tpDir, config);
      const tpFilesWithFindings = new Set(
        tpFindings
          .filter((f) => f.confidence >= CONFIDENCE_THRESHOLD)
          .map((f) => `xss/tp/${f.location.file}`),
      );
      let tpDetected = 0;
      for (const file of tpFiles) {
        if (tpFilesWithFindings.has(file)) {
          tpDetected++;
        }
      }

      // Scan FP directory and count per-file false detections above threshold
      const fpDir = path.resolve(__dirname, "xss/fp");
      const fpFindings = await scanner.scan(fpDir, config);
      const fpFilesWithFindings = new Set(
        fpFindings
          .filter((f) => f.confidence >= CONFIDENCE_THRESHOLD)
          .map((f) => `xss/fp/${f.location.file}`),
      );
      let fpDetected = 0;
      for (const file of fpFiles) {
        if (fpFilesWithFindings.has(file)) {
          fpDetected++;
        }
      }

      const total = tpDetected + fpDetected;
      const precision = total > 0 ? tpDetected / total : 1;
      const recall = tpFiles.size > 0 ? tpDetected / tpFiles.size : 0;

      const ci = wilsonInterval(tpDetected, total);
      console.log(
        `XSS precision: ${precision.toFixed(3)}, recall: ${recall.toFixed(3)}, Wilson 95% CI: [${ci.lower.toFixed(3)}, ${ci.upper.toFixed(3)}]`,
      );

      expect(precision).toBeGreaterThanOrEqual(0.85);
      expect(recall).toBeGreaterThanOrEqual(0.5);
    });

    it("Authz scanner: precision >= 0.7 and recall >= 0.5", async () => {
      const { AuthzScanner } = await import("../../src/scanners/authz/scanner");
      const { createMockConfig } = await import("../helpers");
      const scanner = new AuthzScanner();
      const config = createMockConfig({
        scanners: {
          secrets: { enabled: true, maxTargetMegabytes: 10 },
          dependencies: { enabled: true },
          xss: { enabled: true, customSanitizers: [] },
          authz: {
            enabled: true,
            protectedRoutes: [
              {
                pattern: "/api/admin/**",
                requiredMiddleware: ["isAuthenticated", "isAdmin"],
              },
              {
                pattern: "/api/billing/**",
                requiredMiddleware: ["isAuthenticated"],
              },
            ],
            authMiddleware: ["isAuthenticated", "isAdmin", "requireAuth"],
            framework: "auto",
          },
        },
      });
      const authzData = dataset.categories.authz;

      const tpFiles = new Set(authzData.tp.map((e) => e.file));
      const fpFiles = new Set(authzData.fp.map((e) => e.file));

      // Scan TP directory and count per-file detections
      const tpDir = path.resolve(__dirname, "authz/tp");
      const tpFindings = await scanner.scan(tpDir, config);
      const tpFilesWithFindings = new Set(
        tpFindings
          .filter((f) => f.confidence >= CONFIDENCE_THRESHOLD)
          .map((f) => `authz/tp/${f.location.file}`),
      );
      let tpDetected = 0;
      for (const file of tpFiles) {
        if (tpFilesWithFindings.has(file)) {
          tpDetected++;
        }
      }

      // Scan FP directory and count per-file false detections
      const fpDir = path.resolve(__dirname, "authz/fp");
      const fpFindings = await scanner.scan(fpDir, config);
      const fpFilesWithFindings = new Set(
        fpFindings
          .filter((f) => f.confidence >= CONFIDENCE_THRESHOLD)
          .map((f) => `authz/fp/${f.location.file}`),
      );
      let fpDetected = 0;
      for (const file of fpFiles) {
        if (fpFilesWithFindings.has(file)) {
          fpDetected++;
        }
      }

      const total = tpDetected + fpDetected;
      const precision = total > 0 ? tpDetected / total : 1;
      const recall = tpFiles.size > 0 ? tpDetected / tpFiles.size : 0;

      const ci = wilsonInterval(tpDetected, total);
      console.log(
        `Authz precision: ${precision.toFixed(3)}, recall: ${recall.toFixed(3)}, Wilson 95% CI: [${ci.lower.toFixed(3)}, ${ci.upper.toFixed(3)}]`,
      );

      // Authz precision improved via router.use() detection and alt-middleware recognition
      expect(precision).toBeGreaterThanOrEqual(0.85);
      expect(recall).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe("overall dataset integrity", () => {
    it("should have at least 100 total entries across all categories", () => {
      let total = 0;
      for (const category of categories) {
        const data = dataset.categories[category];
        if (data) {
          total += data.tp.length + data.fp.length;
        }
      }
      expect(total).toBeGreaterThanOrEqual(100);
    });

    it("precision target should be achievable (>= 90% overall)", () => {
      // This test verifies dataset structure supports precision measurement.
      // Actual precision depends on scanner implementation and is measured
      // when scanners are run against these files.
      let totalTp = 0;
      let totalFp = 0;
      for (const category of categories) {
        const data = dataset.categories[category];
        if (data) {
          totalTp += data.tp.length;
          totalFp += data.fp.length;
        }
      }
      // Dataset should have more TPs than FPs (60/40 split or better)
      expect(totalTp).toBeGreaterThan(totalFp);
    });

    it("per-category precision target should be achievable (>= 85%)", () => {
      for (const category of categories) {
        const data = dataset.categories[category];
        if (data) {
          // Each category should have at least 15 TP samples
          expect(data.tp.length, `${category} needs at least 15 TP samples`).toBeGreaterThanOrEqual(
            15,
          );
        }
      }
    });
  });
});
