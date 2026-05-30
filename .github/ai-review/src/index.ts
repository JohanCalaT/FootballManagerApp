import { getDiff } from "./diff.ts";
import { buildPrompt } from "./prompt.ts";
import { reviewWithFallback } from "./gemini.ts";
import { renderBody, publishReview } from "./publish.ts";
import { computeExitCode } from "./gate.ts";
import type { Review } from "./schema.ts";

const MAX_DIFF_BYTES = 180 * 1024;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(0);
  }
  return v;
}

async function main() {
  const repo = requireEnv("GITHUB_REPOSITORY");
  const prNumber = requireEnv("PR_NUMBER");
  const targetBranch = requireEnv("TARGET_BRANCH");
  const headSha = requireEnv("HEAD_SHA");

  console.log(`Reviewing PR #${prNumber} → ${targetBranch} @ ${headSha}`);

  const diff = getDiff(prNumber);
  console.log(
    `Diff: ${diff.files.length} files, ${diff.sizeBytes} bytes, stacks=${diff.stacks.join(",") || "none"}`,
  );

  let review: Review | null = null;
  let modelUsed: string | null = null;
  let errors: string[] = [];

  if (diff.sizeBytes === 0 || diff.files.length === 0) {
    review = {
      summary: "Empty diff — nothing to review.",
      stacks_detected: [],
      findings: [],
      skipped_reason: "empty diff",
    };
  } else if (diff.stacks.length === 0) {
    review = {
      summary:
        "No reviewable stack matched the changed paths (e.g. docs-only PR).",
      stacks_detected: [],
      findings: [],
      skipped_reason: "no stack matched",
    };
  } else if (diff.sizeBytes > MAX_DIFF_BYTES) {
    review = {
      summary: `Diff is ${diff.sizeBytes} bytes which exceeds the ${MAX_DIFF_BYTES}-byte budget.`,
      stacks_detected: diff.stacks,
      findings: [],
      skipped_reason: "diff too large",
    };
  } else {
    const prompt = buildPrompt({
      diff: diff.patch,
      files: diff.files,
      stacks: diff.stacks,
      targetBranch,
    });
    const result = await reviewWithFallback(prompt);
    review = result.review;
    modelUsed = result.modelUsed;
    errors = result.errors;
    if (review) {
      console.log(
        `Model ${modelUsed} produced ${review.findings.length} finding(s)`,
      );
    } else {
      console.log(`All models failed: ${errors.join(" | ")}`);
    }
  }

  const body = renderBody({
    review,
    modelUsed,
    errors,
    targetBranch,
    headSha,
  });

  try {
    await publishReview({ repo, prNumber, body });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to publish review comment: ${msg}`);
  }

  const code = computeExitCode(review, targetBranch);
  console.log(`Exit code: ${code}`);
  process.exit(code);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(0);
});
