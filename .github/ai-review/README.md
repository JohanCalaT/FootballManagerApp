# AI PR Review

Gemini-powered automated reviewer for FootballManagerApp pull requests.

The full review policy (severity scale, per-stack rules, merge gates,
JSON contract) lives in [`standards.md`](./standards.md). This README
covers only how to run and maintain the script.

## How it runs in CI

Triggered by `.github/workflows/ai-pr-review.yml` on every
`pull_request` event targeting `develop` or `main`. The job:

1. Checks out the PR head.
2. Looks up a cache entry keyed by the head SHA. If hit, the review is
   skipped (re-run on identical commit).
3. Installs deps in `.github/ai-review/`.
4. Runs `npm run review`, which:
   - Pulls the diff via `gh pr diff`.
   - Detects affected stacks (`dotnet`, `node`, `frontend`, `infra`).
   - Builds the prompt from `standards.md` + diff.
   - Calls Gemini through the fallback chain
     (`2.5-pro` → `2.5-flash` → `2.0-flash`).
   - Validates the JSON response against `src/schema.ts`.
   - Posts (or updates) a single PR comment marked `<!-- ai-pr-review -->`.
   - Exits per the gate logic in `standards.md` §5.

## Required secrets

| Name             | Where        | Purpose                       |
|------------------|--------------|-------------------------------|
| `GEMINI_API_KEY` | GitHub Secrets | Calls Google AI Studio.     |
| `GITHUB_TOKEN`   | Auto-provided | Posts/updates PR comments.  |

## Running locally against a real PR

```bash
cd .github/ai-review
npm install

export GEMINI_API_KEY=...      # your key
export GH_TOKEN=$(gh auth token)
export GITHUB_REPOSITORY=jcalat/FootballManagerApp
export PR_NUMBER=42
export TARGET_BRANCH=develop
export HEAD_SHA=$(gh pr view 42 --json headRefOid -q .headRefOid)

npm run review
```

The script will post a real comment to the PR — use a draft PR for
testing.

## Files

- `standards.md` — the policy the model must follow.
- `src/index.ts` — orchestrator.
- `src/diff.ts` — diff retrieval and stack detection.
- `src/prompt.ts` — prompt builder.
- `src/gemini.ts` — model fallback chain + JSON validation.
- `src/schema.ts` — Zod schemas for the response shape.
- `src/publish.ts` — comment rendering + GitHub API publish/update.
- `src/gate.ts` — exit code logic per severity & target branch.

## Updating the policy

Edit `standards.md` in the same PR as the rule change. The reviewer
reads the file from the PR branch at runtime, so the new rule takes
effect immediately on that PR.
