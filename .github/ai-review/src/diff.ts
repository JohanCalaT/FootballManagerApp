import { execFileSync } from "node:child_process";

export type Stack = "dotnet" | "node" | "frontend" | "infra";

export interface DiffData {
  patch: string;
  files: string[];
  stacks: Stack[];
  sizeBytes: number;
}

export function getDiff(prNumber: string): DiffData {
  const patch = execFileSync("gh", ["pr", "diff", prNumber, "--patch"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const filesRaw = execFileSync("gh", ["pr", "diff", prNumber, "--name-only"], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  const files = filesRaw.split("\n").map((s) => s.trim()).filter(Boolean);
  const stacks = detectStacks(files);
  return { patch, files, stacks, sizeBytes: Buffer.byteLength(patch, "utf8") };
}

export function detectStacks(files: string[]): Stack[] {
  const found = new Set<Stack>();
  for (const f of files) {
    if (f.startsWith("src/FootballManagerApp/")) found.add("dotnet");
    else if (f.startsWith("backend-node/")) found.add("node");
    else if (f.startsWith("frontend/")) found.add("frontend");
    else if (
      f.startsWith(".github/") ||
      f.startsWith("infra/") ||
      f.endsWith("Dockerfile") ||
      f.endsWith(".dockerfile") ||
      /(^|\/)docker-compose.*\.ya?ml$/.test(f)
    ) {
      found.add("infra");
    }
  }
  return Array.from(found);
}
