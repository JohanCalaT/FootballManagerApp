import type { Review, Severity } from "./schema.ts";

const MARKER = "<!-- ai-pr-review -->";

const LABELS: Record<Severity, string> = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
  info: "Info",
};

export function renderBody(args: {
  review: Review | null;
  modelUsed: string | null;
  errors: string[];
  targetBranch: string;
  headSha: string;
}): string {
  const lines: string[] = [MARKER, "## AI PR Review", ""];

  if (!args.review) {
    lines.push(
      "_Review skipped — the AI service could not produce a valid response._",
      "",
      "**Reasons:**",
      ...args.errors.map((e) => `- \`${e}\``),
      "",
      `Head SHA: \`${args.headSha}\``,
      "",
      `_This skip is non-blocking by policy (see \`.github/ai-review/standards.md\` §5)._`,
    );
    return lines.join("\n");
  }

  const r = args.review;

  if (r.skipped_reason) {
    lines.push(
      `_Review skipped: ${r.skipped_reason}_`,
      "",
      `Head SHA: \`${args.headSha}\``,
    );
    return lines.join("\n");
  }

  lines.push(`**Summary:** ${r.summary}`, "");
  lines.push(
    `**Stacks detected:** ${r.stacks_detected.join(", ") || "_none_"}`,
    `**Target branch:** \`${args.targetBranch}\``,
    `**Model:** \`${args.modelUsed ?? "n/a"}\``,
    `**Head SHA:** \`${args.headSha}\``,
    "",
  );

  const grouped: Record<Severity, typeof r.findings> = {
    critical: [],
    major: [],
    minor: [],
    info: [],
  };
  for (const f of r.findings) grouped[f.severity].push(f);

  for (const sev of ["critical", "major", "minor", "info"] as Severity[]) {
    const items = grouped[sev];
    lines.push(`### ${LABELS[sev]} (${items.length})`, "");
    if (!items.length) {
      lines.push("_None_", "");
      continue;
    }
    for (const f of items) {
      const range =
        f.line_start === f.line_end
          ? `${f.line_start}`
          : `${f.line_start}-${f.line_end}`;
      lines.push(
        `#### \`${f.rule_id}\` — ${f.title}`,
        "",
        `**File:** \`${f.file}:${range}\``,
        "",
        f.explanation,
        "",
      );
      if (f.suggestion?.trim()) {
        const sug = f.suggestion.trim();
        const alreadyFenced = /^```[\s\S]*```$/m.test(sug);
        lines.push("<details><summary>Suggestion</summary>", "");
        if (alreadyFenced) {
          lines.push(sug);
        } else if (sug.includes("```")) {
          lines.push(sug);
        } else {
          lines.push("```", sug, "```");
        }
        lines.push("", "</details>", "");
      }
    }
  }

  lines.push(
    "---",
    "Reviewed against [`.github/ai-review/standards.md`](.github/ai-review/standards.md).",
  );
  return lines.join("\n");
}

interface GitHubComment {
  id: number;
  body?: string;
}

async function gh<T>(
  pathname: string,
  init: RequestInit & { method?: string } = {},
): Promise<T> {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("GH_TOKEN missing");
  const res = await fetch(`https://api.github.com${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function publishReview(args: {
  repo: string;
  prNumber: string;
  body: string;
}): Promise<void> {
  const comments = await gh<GitHubComment[]>(
    `/repos/${args.repo}/issues/${args.prNumber}/comments?per_page=100`,
    { method: "GET" },
  );
  const existing = comments.find((c) => c.body?.startsWith(MARKER));

  if (existing) {
    await gh(`/repos/${args.repo}/issues/comments/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ body: args.body }),
    });
  } else {
    await gh(`/repos/${args.repo}/issues/${args.prNumber}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: args.body }),
    });
  }
}
