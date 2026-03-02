import { Finding } from "../types";

import { getFactorCalculator } from "./factors";

export class ConfidenceScorer {
  score(findings: Finding[]): Finding[] {
    return findings.map((finding) => {
      const calculator = getFactorCalculator(finding.category);
      const factors = calculator.calculate(finding);

      let total = 0;
      for (const factor of factors) {
        total += factor.score;
      }

      const clamped = Math.max(0, Math.min(1, total));

      return {
        ...finding,
        confidence: clamped,
        confidenceFactors: factors,
      };
    });
  }
}
