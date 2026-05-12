# AI Pull Request Review — Review Standard

This document is the **single source of truth** consumed by the Gemini-powered
PR reviewer (see `.github/workflows/ai-pr-review.yml`). It defines what the
model must check, how severities map to merge gates, and the exact JSON shape
the model must return.

Anything not listed here is **out of scope** for the AI reviewer — humans
still own architectural decisions, UX, naming taste, and overall design.

---

## 1. How the reviewer works

1. The workflow gets the PR diff with `gh pr diff`.
2. It detects which stacks are touched based on changed paths:
   - `src/FootballManagerApp/**` → .NET stack rules
   - `backend-node/**` → Node stack rules
   - `frontend/**` → Angular/Ionic stack rules
   - `.github/**`, `infra/**`, any `Dockerfile`, any `*.yml` workflow → Infra rules
3. It sends the diff + this standard + the relevant per-stack checklist to
   Gemini and asks for a JSON response (schema in §6).
4. It posts findings as PR review comments and decides the merge gate based
   on the highest severity returned (§5).

---

## 2. Severity scale

| Severity   | Meaning                                                                 | Effect on merge |
|------------|-------------------------------------------------------------------------|-----------------|
| `critical` | Security hole, secret leak, data loss risk, or breaks a hard project rule. | **Blocks** merge on any branch. |
| `major`    | Clear bug, broken contract, missing test for new logic, performance trap. | Blocks merge to `main`. Advisory on `develop`. |
| `minor`    | Style/convention deviation, missing nullable annotation, weak naming.   | Advisory only. |
| `info`     | Suggestion, refactor idea, optional improvement.                        | Advisory only. |

Rule: **when in doubt, downgrade**. False positives at `critical`/`major`
erode trust faster than missed `minor` issues.

---

## 3. Common rules (apply to every stack)

These come straight from `CLAUDE.md` § "Lo que NUNCA hacer en este proyecto"
and the convention sections. The model must flag any of these.

### 3.1 Secrets and configuration — `critical`
- Hardcoded API keys, connection strings, JWT secrets, private keys.
- New env var consumed in code but **not** added to the matching
  `.env.example` (Node, frontend) or User Secrets reference (.NET).
- URLs, ports, or hostnames hardcoded that should come from configuration.
- Any `.env`, `appsettings.*.json` with real values committed.

### 3.2 Commits and PR hygiene — `minor`
- Commit messages that don't follow Conventional Commits
  (`type(scope): description`).
- Allowed types: `feat`, `fix`, `docs`, `test`, `ci`, `refactor`, `chore`.
- Allowed scopes: `players`, `comments`, `gateway`, `node`, `frontend`,
  `ci`, `auth`, `infra`.

### 3.3 Tests — `major` when missing for new business logic
- New handler / service / controller method without a matching test in
  the same PR.
- New validator without a test covering each rule.
- Test that uses mocks where the project asks for integration (e.g. DB
  integration tests must hit a real PostgreSQL/MongoDB, not a mock).

**How to detect a "matching test"**: the model must compare the list of
added files in the diff. A new production file is considered tested if
its expected test counterpart (defined per stack in §4) **also appears
as added** in the same diff. If only the production file is added, raise
the finding.

---

## 4. Per-stack checklists

### 4.1 .NET stack (`src/FootballManagerApp/**`)

Reference skills: `clean-architecture-dotnet`, `result-pattern-api-response`,
`ef-core-postgresql`, `hateoas-rest-dotnet`, `redis-cache-dotnet`,
`tdd-xunit-dotnet`.

**Critical**
- Business logic inside a Controller (controllers must only orchestrate).
- Entity (`Player`, `Comment`, …) returned directly from a controller
  instead of a DTO / `ApiResponse<T>`.
- `IQueryable<T>` returned or accepted **outside** the Infrastructure layer.
- `throw` used to signal an expected error path that should be an
  `ApiResponse<T>` failure (400/404/409). The only allowed 500 producer is
  `ExceptionMiddleware`.
- Use of `!` (null-forgiving operator) with `#nullable enable` active.
- Direct dependency from `Domain` on `Infrastructure` or `Presentation`
  (violates the dependency rule).

**Major**
- `async` method without `CancellationToken` on any I/O path.
- Missing `ILogger<T>` with structured logging in a new service.
- New endpoint without HATEOAS `_links` when its controller already emits
  them elsewhere.
- POST that returns 200 instead of 201 + `Location` header.
- DELETE that returns 200 instead of 204.
- Cache write without a matching invalidation on the corresponding
  Create/Update/Delete path (see Redis key conventions in `CLAUDE.md`).
- EF Core entity configured via DataAnnotations instead of Fluent API.
- New external HTTP call (Comments ↔ Players, API-Football) without Polly
  Circuit Breaker wiring.
- `dotnet.missing-handler-test`: a new `*Handler.cs` under
  `**/Application/**` is added without a corresponding `*HandlerTests.cs`
  under `**/Application.Tests/**` in the same diff.

**Minor**
- DTO declared as `class` instead of `record`.
- Entity declared as `record` instead of `class`.
- Public API surface using `var` where the type is non-obvious from RHS.

### 4.2 Node stack (`backend-node/**`)

**Critical**
- `any` in TypeScript (production code).
- `console.log` in production code paths (allowed only in scripts/tests).
- Callback-style I/O (must be `async/await`).
- Mongoose schema declared without `strict: true`.
- Route handler without `express-validator` validation on user input.

**Major**
- New route without Swagger annotation.
- Error not funneled through the centralized error middleware.
- Comment created as a top-level document instead of being nested inside
  the `Player` document (per TRWM rubric).
- Missing Jest/Supertest test for a new route.
- `node.missing-spec`: a new `*.controller.ts` or `*.service.ts` under
  `backend-node/src/**` is added without a sibling/test-folder file with
  the same basename ending in `.test.ts` or `.spec.ts`.

**Minor**
- Inconsistent async error handling (mixing `.catch` with `try/catch`).

### 4.3 Angular / Ionic stack (`frontend/**`)

**Critical**
- `any` in TypeScript.
- `if`/`else` selecting backend (`.NET` vs Node) inside a component —
  must go through the Strategy/Factory in `core/services/strategies`.
- Secrets / API keys in environment files committed.

**Major**
- Non-standalone component introduced.
- `*ngIf` / `*ngFor` / `*ngSwitch` used instead of the new `@if` / `@for` /
  `@switch` control flow.
- State managed with `BehaviorSubject` instead of `signal` for a new
  feature.
- New component or service without a Jasmine/Karma spec.
- `frontend.missing-spec`: a new `*.component.ts` or `*.service.ts` under
  `frontend/src/**` is added without its sibling `*.spec.ts` in the same
  diff.

**Minor**
- Missing lazy-loading wiring for a new feature module.

### 4.4 Infra / CI (`.github/**`, `infra/**`, Dockerfiles)

**Critical**
- `--no-verify`, `--no-gpg-sign`, or any hook-skipping flag in a workflow.
- A workflow that prints a secret to logs (`echo $SECRET`, `set -x` with
  secrets in env, etc.).
- Force-push to `main` or `develop` from a workflow.

**Major**
- New workflow that doesn't pin actions to a SHA or major version.
- New container image built without a multi-stage build when one applies.
- Deploy step that targets `main` → production without a manual approval
  gate.

**Minor**
- Workflow without a `name:` or with inconsistent job naming.

---

## 5. Merge gate logic

The workflow exits with the following codes:

| Highest severity found | Target branch | Exit code | Result |
|------------------------|---------------|-----------|--------|
| `critical`             | any           | `1`       | Blocks merge |
| `major`                | `main`        | `1`       | Blocks merge |
| `major`                | `develop`     | `0`       | Advisory, comments only |
| `minor` / `info` / none | any          | `0`       | Advisory |
| Model unreachable / quota exhausted / diff too large | any | `0` | Skipped — posts a "review skipped" comment with the reason |

The "skip on infrastructure failure" rule is deliberate: an external model
outage must never block the team's ability to merge. Branch protection
should mark this check as **required but allowed to be neutral** if the
host platform supports it.

---

## 6. Required JSON output from the model

The model must respond with **only** this JSON (no prose, no markdown
fences). The script validates the shape and rejects the response otherwise,
falling back to the next model.

```json
{
  "summary": "One paragraph, max 600 chars, describing the overall quality of the PR.",
  "stacks_detected": ["dotnet", "node", "frontend", "infra"],
  "findings": [
    {
      "severity": "critical | major | minor | info",
      "rule_id": "dotnet.controller-logic | node.any-type | common.hardcoded-secret | ...",
      "file": "src/FootballManagerApp/.../PlayersController.cs",
      "line_start": 42,
      "line_end": 58,
      "title": "Business logic inside controller",
      "explanation": "Why this is a problem in 1-3 sentences, referencing the rule.",
      "suggestion": "Concrete code change, ideally as a diff snippet."
    }
  ],
  "skipped_reason": null
}
```

If the model decides the PR is clean, `findings` must be an empty array
and `summary` must say so explicitly. If the review is skipped at the
script level (quota, timeout, oversized diff), the script — not the
model — writes a payload with `skipped_reason` populated and empty
`findings`.

---

## 7. What the reviewer must NOT do

- Comment on style preferences not listed in this document.
- Suggest renames of existing public APIs unless they break a rule above.
- Re-flag the same issue on every line of a long block — group findings
  by `line_start`/`line_end`.
- Block on opinions about architecture beyond the dependency-rule and
  layering rules already encoded here.
- Touch files outside the PR diff.

---

## 8. Maintenance

When a project rule changes in `CLAUDE.md` (e.g. a new convention, a new
"NUNCA hacer"), the corresponding entry in this file must be updated in
the **same PR**. The reviewer reads this file at runtime, so the standard
is always in sync with the branch under review.
