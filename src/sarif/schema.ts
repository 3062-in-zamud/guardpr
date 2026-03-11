import { z } from "zod";

const sarifLocationSchema = z
  .object({
    physicalLocation: z
      .object({
        artifactLocation: z
          .object({
            uri: z.string().optional(),
          })
          .passthrough()
          .optional(),
        region: z
          .object({
            startLine: z.number().optional(),
            endLine: z.number().optional(),
            startColumn: z.number().optional(),
            endColumn: z.number().optional(),
          })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const sarifRuleSchema = z
  .object({
    id: z.string(),
    shortDescription: z.object({ text: z.string() }).passthrough().optional(),
    fullDescription: z.object({ text: z.string() }).passthrough().optional(),
    properties: z
      .object({
        tags: z.array(z.string()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const sarifResultSchema = z
  .object({
    ruleId: z.string().optional(),
    ruleIndex: z.number().optional(),
    level: z.enum(["error", "warning", "note", "none"]).optional(),
    message: z.object({ text: z.string().optional() }).passthrough(),
    locations: z.array(sarifLocationSchema).optional(),
    fingerprints: z.record(z.string()).optional(),
    properties: z.record(z.unknown()).optional(),
  })
  .passthrough();

const sarifRunSchema = z
  .object({
    tool: z.object({
      driver: z
        .object({
          name: z.string(),
          version: z.string().optional(),
          rules: z.array(sarifRuleSchema).optional(),
        })
        .passthrough(),
    }).passthrough(),
    results: z.array(sarifResultSchema).optional(),
  })
  .passthrough();

export const sarifLogSchema = z
  .object({
    version: z.literal("2.1.0"),
    $schema: z.string().optional(),
    runs: z.array(sarifRunSchema),
  })
  .passthrough();
