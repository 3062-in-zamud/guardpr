import { Finding } from "../types";

export interface FilterResult {
  highConfidence: Finding[];
  lowConfidence: Finding[];
}

export function filterByThreshold(findings: Finding[], threshold: number): FilterResult {
  const highConfidence: Finding[] = [];
  const lowConfidence: Finding[] = [];

  for (const finding of findings) {
    if (finding.confidence >= threshold) {
      highConfidence.push(finding);
    } else {
      lowConfidence.push(finding);
    }
  }

  return { highConfidence, lowConfidence };
}
