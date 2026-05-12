import type { Review, Severity } from "./schema.ts";

const ORDER: Record<Severity, number> = {
  info: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

export function highestSeverity(review: Review): Severity | null {
  let top: Severity | null = null;
  for (const f of review.findings) {
    if (!top || ORDER[f.severity] > ORDER[top]) top = f.severity;
  }
  return top;
}

export function computeExitCode(
  review: Review | null,
  targetBranch: string,
): number {
  if (!review) return 0;
  if (review.skipped_reason) return 0;
  const top = highestSeverity(review);
  if (!top) return 0;
  if (top === "critical") return 1;
  if (top === "major" && targetBranch === "main") return 1;
  return 0;
}
