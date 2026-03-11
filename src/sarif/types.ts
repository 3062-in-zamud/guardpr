export interface SarifLocation {
  physicalLocation?: {
    artifactLocation?: {
      uri?: string;
    };
    region?: {
      startLine?: number;
      endLine?: number;
      startColumn?: number;
      endColumn?: number;
    };
  };
}

export interface SarifRule {
  id: string;
  shortDescription?: {
    text: string;
  };
  fullDescription?: {
    text: string;
  };
  properties?: {
    tags?: string[];
    [key: string]: unknown;
  };
}

export interface SarifResult {
  ruleId?: string;
  ruleIndex?: number;
  level?: "error" | "warning" | "note" | "none";
  message: {
    text?: string;
  };
  locations?: SarifLocation[];
  fingerprints?: Record<string, string>;
  properties?: Record<string, unknown>;
}

export interface SarifRun {
  tool: {
    driver: {
      name: string;
      version?: string;
      rules?: SarifRule[];
    };
  };
  results?: SarifResult[];
}

export interface SarifLog {
  version: string;
  $schema?: string;
  runs: SarifRun[];
}
