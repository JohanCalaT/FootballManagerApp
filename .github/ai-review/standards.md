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

Reference skills: `node-service-layer`, `node-mongoose-nested`,
`node-error-handling`, `node-tdd-jest-supertest`,
`node-apifootball-integration`, `node-pug-status-panel`.

The Node backend mirrors the .NET microservices in contract: same JSON
shape (`status`/`message`/`data`/`_links`), same HTTP status codes,
same headers (`X-User-Id`, `X-User-Admin`, `X-Client-*`). Breaking that
parity breaks the frontend toggle (`X-Backend: dotnet | node`), so most
contract violations escalate to `major` or `critical`.

**Critical**
- `any` in TypeScript production code under `backend-node/src/**`. Use
  `unknown` + narrowing or a precise type instead. Allowed only with an
  inline `// eslint-disable-next-line` accompanied by a justification
  comment.
- New hardcoded secret (Mongo URI, Redis URL, API-Football key, Firebase
  key, etc.) — already covered by §3.1 but doubly enforced here.
- Mongoose schema declared without `strict: true`.
- Comment persisted as a **top-level collection** (`mongoose.model('Comment', …)`)
  instead of an embedded array on the `Player` document. The TRWM rubric
  explicitly demands nested sub-documents; reintroducing a Comments
  collection breaks the model.
- Callback-style I/O (must be `async/await`). `.then().catch()` chains are
  also forbidden except inside `Promise.all([...])` setup.
- New 500-producing path that bypasses `middleware/error.middleware.ts`
  (e.g. `res.status(500).json(...)` in a controller, or a `catch`
  swallowing the error and returning a hand-crafted 500 body). The
  error middleware is the **only** allowed 500 producer.
- Mongoose documents leaked to the response without DTO mapping —
  evidence: response JSON shows `_id`, `__v`, or untyped `Buffer`-like
  blobs. Always use `dtos/*.dto.ts` mappers.
- TS strict settings disabled in `tsconfig.json` — `strict`,
  `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` are
  required and must stay enabled.

**Major**
- **POST returns 200 instead of 201** + `Location` header.
- **DELETE returns 200 instead of 204**, or DELETE that is **not
  idempotent** (returns 404 for a missing or malformed id instead of 204).
- **Import batch endpoint** (`POST /api/players/import`) that returns a
  single status when the result mixes successes and failures — the
  selector must produce `207 Multi-Status` on mix, `201` on all-success,
  and the documented status per `ApiFootballError` subtype when all
  failed.
- **HATEOAS `update`/`delete` links emitted unconditionally** instead of
  gated on `req.isAdmin`. The `buildPlayerLinks(id, isAdmin)` helper
  exists for this — using a different helper that ignores admin is a
  bug.
- **Route accepts user input without validation**. Acceptable validation
  forms: (a) `express-validator` chain followed by `runValidations`
  middleware, OR (b) explicit service-level validation that throws a
  `ValidationError` (used in `POST /import` because the body is an
  array). A controller that takes `req.body` straight to Mongoose
  without either form is the violation.
- **Error not funneled through the central error middleware**. Pattern
  to enforce: services throw subclasses of `DomainError` /
  `ApiFootballError`, controllers `catch (err) { next(err) }`. A
  controller that maps domain errors to status codes in-line is a
  duplication and a `major` finding.
- **New external HTTP call** (axios/fetch to API-Football, Gemini, etc.)
  without typed error mapping. Pattern: a `catch` that classifies into
  the matching `ApiFootballError` / domain error subclass — never a
  generic `throw err`.
- **Redis cache misuse**:
  - New cache key with a prefix outside the documented namespaces
    (`af:*`, `players:*`, `comments:*`, `gemini:*` per `CLAUDE.md` raíz).
  - Caching an error payload or a `null`/`[]` result with the same TTL
    as a happy-path response (perpetuates a transient failure or
    "ghost" miss).
  - Cache write without a matching invalidation strategy on the
    corresponding Create/Update/Delete path **when the data is owned
    by Node** (the `af:*` keys are read-only from Node's POV — owned
    by API-Football's lifecycle, no invalidation required).
- **Mongoose deprecated APIs**: `new: true` on `findByIdAndUpdate`
  / `findOneAndUpdate` instead of `returnDocument: 'after'`.
- **New route without `@swagger` JSDoc annotation** on the route
  handler — Swagger UI at `/api-docs` is rubric-scored (TRWM 1pt).
- **`node.missing-test`** — the PR adds a non-trivial file under
  `backend-node/src/{controllers,services,repositories}/` but adds or
  modifies zero files under `backend-node/tests/`. The test layout is
  feature-based (`tests/integration/players.create.test.ts`,
  `tests/unit/escapeRegex.test.ts`), so do NOT require an exact
  basename match — the requirement is that the diff touches
  `backend-node/tests/` whenever it adds production logic. Renames and
  type-only changes don't trigger this rule.
- **New env var consumed in code without an entry in
  `backend-node/.env.example`** (overlaps §3.1 but the AI should still
  raise it under this section so the Node author sees it).

**Minor**
- `console.log` / `console.warn` / `console.error` inside business
  logic paths (`services/*`, `controllers/*`, `repositories/*`).
  **Allowed without flagging** when used as bootstrap or fault logs in
  any of: `server.ts`, `config/database.ts`, `services/cache.service.ts`
  (cache degrade warnings), and `middleware/error.middleware.ts`
  (fallback 500 logger). These four files are the project's lightweight
  logger surface until a real `pino`/`winston` is wired.
- Inconsistent async error handling (mixing `.catch` with `try/catch`).
- New file that uses `as unknown as <T>` casts when a proper type guard
  would do the same job.
- Route file with `responses: { description: ... }` inline-flow YAML in
  the `@swagger` JSDoc — the parser breaks when descriptions contain
  `<`, `>`, `[`, `]`. Use block style with quoted strings.

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

**Formatting rules for the `suggestion` field** (the script renders it
inside a collapsible block on the PR comment):

- Prefer plain text or **at most one** fenced code block using
  ` ```csharp `, ` ```typescript `, ` ```diff `, etc.
- **Do not nest fenced code blocks.** Never wrap text that already
  contains ` ``` ` inside another fence.
- Do not include the literal words "Suggestion:" or any heading — the
  script adds that wrapper itself.
- Keep it focused: a minimal diff or replacement snippet is better than
  a long prose explanation.

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
