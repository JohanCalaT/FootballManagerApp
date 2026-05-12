import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Stack } from "./diff.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const STANDARDS_PATH = path.resolve(here, "..", "standards.md");

export function buildPrompt(args: {
  diff: string;
  files: string[];
  stacks: Stack[];
  targetBranch: string;
}): string {
  const standards = readFileSync(STANDARDS_PATH, "utf8");
  const stacksLabel = args.stacks.length ? args.stacks.join(", ") : "none";
  return [
    "You are the FootballManagerApp PR reviewer.",
    "You MUST follow the review standard below and reply with ONLY the JSON",
    "described in section 6 of the standard. No prose, no markdown fences,",
    "no commentary outside the JSON.",
    "",
    "=== REVIEW STANDARD START ===",
    standards,
    "=== REVIEW STANDARD END ===",
    "",
    `Target branch of this PR: ${args.targetBranch}`,
    `Stacks detected from changed paths: ${stacksLabel}`,
    "",
    "Changed files in this PR:",
    args.files.map((f) => `- ${f}`).join("\n"),
    "",
    "Unified diff:",
    "```diff",
    args.diff,
    "```",
    "",
    "Now produce the JSON response.",
  ].join("\n");
}
