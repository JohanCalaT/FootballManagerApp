import { z } from "zod";

export const SeveritySchema = z.enum(["critical", "major", "minor", "info"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const FindingSchema = z.object({
  severity: SeveritySchema,
  rule_id: z.string().min(1).max(80),
  file: z.string().min(1),
  line_start: z.number().int().nonnegative(),
  line_end: z.number().int().nonnegative(),
  title: z.string().min(1).max(200),
  explanation: z.string().min(1).max(2000),
  suggestion: z.string().max(4000).optional().default(""),
});
export type Finding = z.infer<typeof FindingSchema>;

export const ReviewSchema = z.object({
  summary: z.string().max(800),
  stacks_detected: z.array(z.enum(["dotnet", "node", "frontend", "infra"])),
  findings: z.array(FindingSchema),
  skipped_reason: z.string().nullable().default(null),
});
export type Review = z.infer<typeof ReviewSchema>;
