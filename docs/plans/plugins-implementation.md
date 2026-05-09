# Open Design Plugin & Marketplace — Implementation Plan (living)

Source spec: [`docs/plugins-spec.md`](../plugins-spec.md) (zh-CN: [`docs/plugins-spec.zh-CN.md`](../plugins-spec.zh-CN.md)).

Sibling docs: [`spec.md`](../spec.md) · [`skills-protocol.md`](../skills-protocol.md) · [`architecture.md`](../architecture.md).

Update protocol — read first

- This file is a **living roadmap**. Every PR that lands a chunk of the plugin system must flip the matching `[ ]` to `[x]` in the same PR, and update §3 "Architecture state" if a new module / table / endpoint becomes real.
- Do not edit `docs/plugins-spec.md` from this file's PRs except to fix factual drift; the spec is the contract, this file is the schedule.
- The "Definition of done" gates in §8 are the **only** hard sign-off bar; an empty checkbox under a phase does not mean v1 is broken — only an empty checkbox under §8 does.
- When `docs/plugins-spec.md` patches change phase numbering or atom names, mirror those changes here in the same PR (per §21.6 / §22.5 / §23.6 of the spec).

---

## 1. Invariants (lock these first; never violate without a spec patch)

These are the five rules that decide every downstream design decision. They sit above phases and are checked by reviewers on every plugin-related PR.

- [ ] **I1. `SKILL.md` is the floor; `open-design.json` is a sidecar; never bidirectionally couple.** `packages/plugin-runtime/adapters/agent-skill.ts` must be able to synthesize a schema-valid `PluginManifest` for any `SKILL.md` that has the `od:` frontmatter (per [`docs/skills-protocol.md`](../skills-protocol.md)). CI test runs the synthesizer against `skills/blog-post/SKILL.md` and asserts the output validates against `docs/schemas/open-design.plugin.v1.json`.
- [ ] **I2. Apply is a pure function; side effects only after `POST /api/projects` / `POST /api/runs`.** `apps/daemon/src/plugins/apply.ts` never stages assets, never writes `.mcp.json`, never spawns MCP children. A daemon test runs `apply()` on a plugin that declares `mcp` and `assets`, then asserts `fs.readdirSync(projectCwd)` equals the baseline and no `.mcp.json` exists.
- [ ] **I3. `AppliedPluginSnapshot` is the only contract between "plugin" and "run".** Runs are addressed by `snapshotId`, not `pluginId`. `composeSystemPrompt()` accepts a `snapshotId`, reads context through the snapshot, and never re-resolves from the live manifest (this also auto-enforces §11.8's "web API-fallback rejects plugin runs" because no snapshot path exists in fallback mode).
- [ ] **I4. CLI is the canonical agent-facing API; UI mirrors CLI, not the other way round.** Every new endpoint ships a matching `od …` subcommand in the **same PR**, and `--json` stdout is `JSON.stringify(value satisfies ContractType)` from `packages/contracts` (no ad-hoc field renames in `cli.ts`). Reviewers reject UI-only behavior per spec §12.6.
- [ ] **I5. Kernel/userspace boundary (spec §23) is drawn from day 1.** Even when v1 keeps atom prompt fragments hard-coded in `apps/daemon/src/prompts/system.ts`, `composeSystemPrompt()` is shaped as `assembler + content table` so spec §23.3.2 patch 2 ("migrate atom prompts to `plugins/_official/atoms/<atom>/SKILL.md`") is a mechanical move, not a rewrite.

CI guard placement: each invariant must have at least one automated test that fails when the rule is violated. The test path is recorded next to the box when it lands.

---

## 2. Layered architecture target (where every new file goes)

```text
packages/contracts/src/plugins/      ← pure types + Zod schemas, no runtime deps
  ├── manifest.ts                    ← PluginManifest, GenUISurfaceSpec, PluginPipeline
  ├── context.ts                     ← ContextItem union (spec §5.2)
  ├── apply.ts                       ← ApplyResult, AppliedPluginSnapshot, InputFieldSpec
  ├── marketplace.ts                 ← MarketplaceManifest
  ├── installed.ts                   ← InstalledPluginRecord, TrustTier ('bundled' | 'trusted' | 'restricted')
  └── events.ts                      ← GenUIEvent + pipeline_stage_* variants joined into PersistedAgentEvent

packages/plugin-runtime/             ← pure TS; reusable in web / daemon / CI
  ├── parsers/{manifest,marketplace,frontmatter}.ts
  ├── adapters/{agent-skill,claude-plugin}.ts
  ├── merge.ts                       ← sidecar + adapter merge; open-design.json wins
  ├── resolve.ts                     ← ContextItem ref resolution (pure; no FS reads)
  ├── validate.ts                    ← JSON Schema validation
  └── digest.ts                      ← manifestSourceDigest (frozen algorithm; CI fixtures)

apps/daemon/src/plugins/             ← side-effect concentration zone
  ├── registry.ts                    ← three-tier scan + hot reload (existing skills.ts/design-systems.ts/craft.ts delegate here)
  ├── installer.ts                   ← github tarball / https / local / marketplace
  ├── apply.ts                       ← pure resolver; emits ApplyResult + draft snapshot
  ├── snapshots.ts                   ← §8.2.1 — the **only** writer to applied_plugin_snapshots
  ├── pipeline.ts                    ← §10.1 stage scheduler + §10.2 devloop + until evaluator
  ├── connector-gate.ts              ← §9 capability gate, called by tool-tokens.ts and /api/tools/connectors/execute
  ├── trust.ts                       ← installed_plugins.capabilities_granted writer
  └── doctor.ts                      ← schema + connector catalog + MCP dry-launch + atom refs

apps/daemon/src/genui/               ← spec §10.3
  ├── registry.ts
  ├── events.ts
  └── store.ts                       ← genui_surfaces table writer
```

Hard layering rules

- `packages/plugin-runtime` does not import `node:fs`. It receives `loader: (relpath) => Promise<string>`. Daemon injects real FS, CI injects mocks, web preview sandbox injects fetch.
- `apps/daemon/src/plugins/snapshots.ts` is the only file that issues `INSERT/UPDATE` against `applied_plugin_snapshots`. CI guard: `rg "applied_plugin_snapshots" --type ts -g '!**/*.test.ts'` may match `INSERT` only inside `snapshots.ts`.
- `connector-gate.ts` is a stateless validator (`(snapshotId, connectorId) => allow | deny`); `tool-tokens.ts` calls it before issuing a token, and `/api/tools/connectors/execute` re-validates on every call to defeat token replacement.

---

## 3. Architecture state (update as modules land)

This section tracks **what exists in the repo today**. Update in the same PR that lands the module; never let it lie about reality.

### 3.1 Packages

| Path | Status | Notes |
| --- | --- | --- |
| `packages/contracts/src/plugins/manifest.ts` | absent | Phase 0 deliverable |
| `packages/contracts/src/plugins/context.ts` | absent | Phase 0 deliverable |
| `packages/contracts/src/plugins/apply.ts` | absent | Phase 0 deliverable |
| `packages/contracts/src/plugins/marketplace.ts` | absent | Phase 0 deliverable |
| `packages/contracts/src/plugins/installed.ts` | absent | Phase 0 deliverable |
| `packages/contracts/src/plugins/events.ts` | absent | Phase 0 deliverable; placeholder variants for `pipeline_stage_*` and `genui_*` even if unused in Phase 1 |
| `packages/contracts/src/prompts/plugin-block.ts` | absent | Phase 2A (PB1); `renderPluginBlock(snapshot)` pure function shared by daemon + contracts composers |
| `packages/plugin-runtime/` | absent | Phase 1; pure TS, no fs imports |

### 3.2 Daemon modules

| Path | Status | Notes |
| --- | --- | --- |
| `apps/daemon/src/skills.ts` | exists | Phase 1: refactor to delegate into `plugins/registry.ts` |
| `apps/daemon/src/design-systems.ts` | exists | Phase 1: same |
| `apps/daemon/src/craft.ts` | exists | Phase 1: same |
| `apps/daemon/src/connectors/` | exists | reused as-is by `connector-gate.ts` |
| `apps/daemon/src/tool-tokens.ts` | exists | Phase 2A: wire to `connector-gate.ts` |
| `apps/daemon/src/prompts/system.ts` | exists | Phase 1: accept `snapshotId`; emit `## Active plugin` block |
| `apps/daemon/src/server.ts` | exists | Phase 1+: mount new `/api/plugins/*` and `/api/applied-plugins/:snapshotId` |
| `apps/daemon/src/cli.ts` | exists | Phase 1+: add `plugin`, `project`, `run`, `files`, `marketplace`, `ui` subcommand routers |
| `apps/daemon/src/plugins/registry.ts` | absent | Phase 1 |
| `apps/daemon/src/plugins/installer.ts` | absent | Phase 1 |
| `apps/daemon/src/plugins/apply.ts` | absent | Phase 1 |
| `apps/daemon/src/plugins/snapshots.ts` | absent | Phase 1 (must land in week 1, ahead of pipeline/genui) |
| `apps/daemon/src/plugins/connector-gate.ts` | absent | Phase 2A |
| `apps/daemon/src/plugins/pipeline.ts` | absent | Phase 2A |
| `apps/daemon/src/plugins/trust.ts` | absent | Phase 1 (minimal) → expanded Phase 3 |
| `apps/daemon/src/plugins/doctor.ts` | absent | Phase 1 (basic) → expanded Phase 3 |
| `apps/daemon/src/genui/registry.ts` | absent | Phase 2A |
| `apps/daemon/src/genui/events.ts` | absent | Phase 2A |
| `apps/daemon/src/genui/store.ts` | absent | Phase 2A |

### 3.3 SQLite tables

| Table | Status | Phase |
| --- | --- | --- |
| `installed_plugins` | absent | Phase 1 (allow `source_kind='bundled'` from day 1, even if unused — avoids a §23 migration) |
| `plugin_marketplaces` | absent | Phase 1 |
| `applied_plugin_snapshots` | absent | Phase 1 (full §11.4 shape including `connectors_required_json` / `connectors_resolved_json` / `mcp_servers_json` / **`expires_at` per PB2** — referenced rows pinned `NULL`, unreferenced rows `applied_at + OD_SNAPSHOT_UNREFERENCED_TTL_DAYS`); enforcement job lands Phase 5 |
| `runs.applied_plugin_snapshot_id` ALTER | absent | Phase 1 |
| `conversations.applied_plugin_snapshot_id` ALTER | absent | Phase 1 |
| `projects.applied_plugin_snapshot_id` ALTER | absent | Phase 1 |
| `run_devloop_iterations` | absent | Phase 2A |
| `genui_surfaces` | absent | Phase 2A |

### 3.4 HTTP endpoints

| Endpoint | Status | Phase |
| --- | --- | --- |
| `GET /api/plugins` | absent | Phase 1 |
| `GET /api/plugins/:id` | absent | Phase 1 |
| `POST /api/plugins/install` (SSE) | absent | Phase 1 |
| `POST /api/plugins/:id/uninstall` | absent | Phase 1 |
| `POST /api/plugins/:id/apply` | absent | Phase 1 |
| `GET /api/atoms` | absent | Phase 1 |
| `GET /api/applied-plugins/:snapshotId` | absent | Phase 1 |
| `POST /api/runs/:runId/replay` | absent | Phase 2A |
| `GET /api/plugins/:id/preview` | absent | Phase 2B (sandboxed per §9.2) |
| `GET /api/plugins/:id/example/:name` | absent | Phase 2B |
| `POST /api/plugins/:id/trust` | absent | Phase 3 |
| `GET / POST /api/marketplaces` | absent | Phase 3 |
| `POST /api/marketplaces/:id/trust` | absent | Phase 3 |
| `GET /api/marketplaces/:id/plugins` | absent | Phase 3 |
| `GET /api/runs/:runId/devloop-iterations` | absent | Phase 2A |
| `GET /api/runs/:runId/genui` | absent | Phase 2A |
| `GET /api/projects/:projectId/genui` | absent | Phase 2A |
| `POST /api/runs/:runId/genui/:surfaceId/respond` | absent | Phase 2A |
| `POST /api/projects/:projectId/genui/:surfaceId/revoke` | absent | Phase 2A |
| `POST /api/projects/:projectId/genui/prefill` | absent | Phase 2A |
| `GET /api/runs/:runId/agui` | absent | Phase 4 |

### 3.5 CLI subcommands

| Command | Status | Phase |
| --- | --- | --- |
| `od plugin install/list/info/uninstall/apply/doctor` | absent | Phase 1 |
| `od project create/list/info` | absent | Phase 1 |
| `od run start/watch/cancel` (with `--follow`, ND-JSON) | absent | Phase 1 |
| `od files list/read` | absent | Phase 1 |
| `od daemon start --headless / --serve-web` | absent | Phase 1.5 |
| `od plugin replay` | absent | Phase 2A |
| `od plugin trust` (with `connector:<id>` form) | absent | Phase 2A → expanded Phase 3 |
| `od ui list/show/respond/revoke/prefill` | absent | Phase 2A |
| `od files write/upload/delete/diff` | absent | Phase 2C |
| `od project delete/import` | absent | Phase 2C |
| `od conversation list/new/info` | absent | Phase 2C → 4 |
| `od marketplace add/remove/trust/untrust/list/refresh/search` | absent | Phase 3 |
| `od plugin export/scaffold/publish` | absent | Phase 4 |
| `od skills/design-systems/craft/atoms list/show` | absent | Phase 4 |
| `od status/doctor/version/config` | partial | Phase 4 (some pieces exist; audit) |

### 3.6 Web components

| Component | Status | Phase |
| --- | --- | --- |
| `apps/web/src/components/InlinePluginsRail.tsx` | absent | Phase 2A |
| `apps/web/src/components/ContextChipStrip.tsx` | absent | Phase 2A |
| `apps/web/src/components/PluginInputsForm.tsx` | absent | Phase 2A |
| `applyPlugin()` helper in `apps/web/src/state/projects.ts` | absent | Phase 2A |
| `apps/web/src/components/GenUISurfaceRenderer.tsx` | absent | Phase 2A (confirmation/oauth-prompt) → 2A.5 (form/choice) |
| `apps/web/src/components/GenUIInbox.tsx` | absent | Phase 2A |
| `apps/web/src/components/MarketplaceView.tsx` | absent | Phase 2B |
| `apps/web/src/components/PluginDetailView.tsx` | absent | Phase 2B |
| `ChatComposer` plugin rail integration | absent | Phase 2B |

---

## 4. Dependency topology (drives phase ordering)

```text
                  ┌─ contracts/plugins/* ─┐
                  │                       │
         plugin-runtime (parsers + merge + resolve + validate + digest)
                  │
       ┌──────────┼─────────────────────────┐
       │          │                         │
   registry   installer                  apply (pure)
       │          │                         │
       └────┬─────┘                         │
            │                          snapshots ───── connector-gate
            │                               │              │
       composeSystemPrompt(snapshotId)       │         tool-tokens
            │                               │              │
            └─────────── runs ──────────────┘              │
                          │                                │
                  pipeline + devloop + genui ──────────────┘
                          │
                     SSE/ND-JSON events
                          │
            ┌─────────────┴─────────────┐
       CLI (plugin/run/files/ui)   Web (rail/strip/inputs/genui)
```

Three reads from the graph (drove the §6 phase reorder)

- `snapshots.ts` is the keystone. It must land in Phase 1 week 1, before pipeline / genui / connector-gate.
- `pipeline.ts` and `genui/*` are co-required for the first marketable plugin (`make-a-deck` needs `direction-picker` + `oauth-prompt`); they must land in the same phase.
- CLI and Web parallelize cleanly once `ApplyResult` JSON is stable; the only sync point is the ND-JSON event schema in `packages/contracts/src/plugins/events.ts`.

---

## 5. Foundations (early bedrock — invest in Phase 0–1 to avoid Phase 3+ rework)

- [ ] **F1. Freeze `manifestSourceDigest` algorithm in Phase 0.** Implementation in `packages/plugin-runtime/digest.ts`; input `{manifest, inputs, resolvedContextRefs}` → sha256 hex. CI fixture pins ≥3 known-good digests; daemon upgrades cannot change them.
- [ ] **F2. Define `PersistedAgentEvent` plugin variants in Phase 1, even if they fire later.** Add `pipeline_stage_started`, `pipeline_stage_completed`, `genui_surface_request`, `genui_surface_response`, `genui_surface_timeout`, `genui_state_synced` to the union in Phase 1 so web/CLI clients add `case` branches once. Empty handlers are fine; a missing variant means a churn PR in Phase 2A.
- [ ] **F3. `installed_plugins.source_kind` accepts `'bundled'` from Phase 1.** Even though `plugins/_official/` arrives in §23 / Phase 4, the enum must be permissive so the §23.3.5 patch is data-only.
- [ ] **F4. `PluginAssetRef.stageAt` defaults to `'run-start'`, never `'project-create'`.** Locks I2: `POST /api/projects` cannot become a staging endpoint by accident.
- [ ] **F5. `--json` output uses contracts types; no inline reshape in `cli.ts`.** Compile-time guarantee for spec §12.6 / I4.
- [ ] **F6. `OD_MAX_DEVLOOP_ITERATIONS` lives in `apps/daemon/src/app-config.ts`, default 10, override via env.** No magic numbers in `pipeline.ts`.
- [ ] **F7. `od plugin doctor` validates `od.connectors.required[]` against `connectorService.listAll()` from Phase 1.** Pre-empts half of the Phase 2A connector-gate lint failures.
- [ ] **F8. Cross-conversation cache (`genui_surfaces` lookup) goes live with the table — i.e. Phase 2A — and a daemon test asserts the second `oauth-prompt` does not broadcast.** Pulled forward from spec §16 Phase 2A's e2e (e) so the behavior is verified at unit-test layer, not only e2e.
- [ ] **F9. Snapshot lifecycle env vars (PB2)** live in `apps/daemon/src/app-config.ts` from Phase 1: `OD_SNAPSHOT_UNREFERENCED_TTL_DAYS` (default `30`, set to `0` to disable), `OD_SNAPSHOT_RETENTION_DAYS` (default unset, opt-in), `OD_SNAPSHOT_GC_INTERVAL_MS` (default `6 * 60 * 60 * 1000`). All three readable via `od config get`; the column lands Phase 1, the GC worker lands Phase 5.

---

## 6. Phase plan (re-ordered from spec §16 by dependency, not by user-visible feature)

The spec §16 ordering is reader-facing; this is the build order. Each phase has explicit deliverables, validation steps, and an exit criterion. Flip checkboxes in PRs that land each item.

### Phase 0 — Spec freeze + contracts skeleton (1–2 d)

Deliverables

- [ ] `docs/schemas/open-design.plugin.v1.json` — JSON Schema v1.
- [ ] `docs/schemas/open-design.marketplace.v1.json` — JSON Schema v1.
- [ ] `packages/contracts/src/plugins/{manifest,context,apply,marketplace,installed,events}.ts` (types + Zod schemas; no logic).
- [ ] Re-export from `packages/contracts/src/index.ts`.
- [ ] `packages/plugin-runtime/digest.ts` with frozen sha256 algorithm + 3 fixture cases.

Validation

- [ ] `pnpm --filter @open-design/contracts test`
- [ ] `pnpm guard && pnpm typecheck`
- [ ] CI digest stability: re-running `digest()` on the fixtures matches the pinned hex.

Exit criterion

- Importing `import type { ApplyResult, AppliedPluginSnapshot } from '@open-design/contracts'` works from daemon and web.

### Phase 1 — Loader + installer + apply + snapshot + headless CLI loop (5–7 d)

Why merged with the spec's "headless MVP CLI loop" — see I4. The spec's Phase 1 explicitly pulls this forward; this plan keeps that.

Deliverables (week 1: data layer)

- [ ] SQLite migration for `installed_plugins`, `plugin_marketplaces`, `applied_plugin_snapshots` (including the **`expires_at INTEGER` column** per PB2), the three `applied_plugin_snapshot_id` ALTERs. (Full §11.4 shape; columns reserved for Phase 2A may stay NULL.)
- [ ] `apps/daemon/src/app-config.ts` defines `OD_SNAPSHOT_UNREFERENCED_TTL_DAYS` (default `30`) and `OD_SNAPSHOT_RETENTION_DAYS` (default unset) per PB2. Apply path stamps `expires_at` on insert; nothing enforces deletion yet (Phase 5 job).
- [ ] `packages/plugin-runtime` parsers / adapters / merger / resolver / validator.
- [ ] `apps/daemon/src/plugins/registry.ts` — three-tier scan + 500ms-debounced hot reload.
- [ ] `apps/daemon/src/plugins/installer.ts` — local folder + GitHub tarball; path-traversal guard, size cap (default 50 MiB), symlink rejection.
- [ ] `apps/daemon/src/plugins/apply.ts` — pure; emits `ApplyResult` with draft snapshot.
- [ ] `apps/daemon/src/plugins/snapshots.ts` — sole writer of `applied_plugin_snapshots`. CI grep guard active.
- [ ] Refactor `apps/daemon/src/{skills,design-systems,craft}.ts` to delegate to `registry.ts`. Existing `/api/skills`, `/api/design-systems`, `/api/craft` endpoints continue to work byte-for-byte.

Deliverables (week 2: surface layer)

- [ ] HTTP: `GET /api/plugins`, `GET /api/plugins/:id`, `POST /api/plugins/install`, `POST /api/plugins/:id/uninstall`, `POST /api/plugins/:id/apply`, `GET /api/atoms`, `GET /api/applied-plugins/:snapshotId`. `POST /api/projects` and `POST /api/runs` accept optional `pluginId` / `pluginInputs` / `appliedPluginSnapshotId`; server prefers `appliedPluginSnapshotId`.
- [ ] `composeSystemPrompt()` in `apps/daemon/src/prompts/system.ts` accepts `snapshotId`, reads through `snapshots.ts`, appends `## Active plugin — <title>` and `## Plugin inputs` blocks. Shape: pure assembler + content table (per I5).
- [ ] CLI: `od plugin install/list/info/uninstall/apply/doctor`, `od project create/list/info`, `od run start/watch/cancel` (with `--follow` ND-JSON), `od files list/read`. All `--json` outputs via contracts types.
- [ ] Phase 1 `od plugin doctor` covers: schema validation, SKILL.md parse, MCP command dry-launch (timeout 3 s), atom id existence check, connector id existence check (F7).

Validation

- [ ] `pnpm --filter @open-design/plugin-runtime test` covers: pure SKILL.md, pure claude plugin, metadata-only `open-design.json`, all three combined, SKILL frontmatter mapping (spec §5.4).
- [ ] `pnpm --filter @open-design/daemon test`.
- [ ] **e2e-1 cold install** — see §8.
- [ ] **e2e-2 pure apply** — see §8.
- [ ] **e2e-3 headless run** — see §8.

Exit criterion

- From a fresh clone, the §12.5 walk-through runs end-to-end on a Linux CI container without electron, web bundle, or browser.

### Phase 1.5 — Headless daemon lifecycle subset (1 d)

Pulled out of spec §16 Phase 5 because Phase 1 e2e needs it. Avoids "Phase 1 looks green on macOS desktop, breaks on Linux CI" false positives.

Deliverables

- [ ] `od daemon start --headless` flag (no electron, no web bundle).
- [ ] `od daemon start --serve-web` flag (web UI without electron).
- [ ] Honor `OD_BIND_HOST`, `OD_DATA_DIR`, `OD_MEDIA_CONFIG_DIR`, `OD_NAMESPACE` in headless mode.
- [ ] `od daemon stop`, `od daemon status --json`.

Validation

- [ ] `od daemon start --headless --port 17456` then `curl :17456/api/plugins` returns `[]` (no electron involved).
- [ ] Phase 1 e2e suite re-run inside `docker run --rm node:24-bookworm-slim` succeeds.

### Phase 2A — Pipeline + devloop + GenUI(confirmation/oauth-prompt) + connector-gate + Web inline rail (4–6 d)

Deliverables (daemon)

- [ ] `apps/daemon/src/plugins/pipeline.ts` — stage scheduler; `until` evaluator (closed vocabulary: `critique.score`, `iterations`, `user.confirmed`, `preview.ok`); devloop with `OD_MAX_DEVLOOP_ITERATIONS` ceiling.
- [ ] SQLite migration: `run_devloop_iterations`, `genui_surfaces` (with three indexes per §11.4), plus the `connectors_required_json` / `connectors_resolved_json` / `mcp_servers_json` columns on `applied_plugin_snapshots` if not added in Phase 1.
- [ ] `apps/daemon/src/genui/{registry,events,store}.ts` — surfaces for `confirmation` and `oauth-prompt` first; reuse the existing `apps/daemon/src/connectors/` flow for `oauth.route='connector'` and the existing MCP OAuth flow for `oauth.route='mcp'`.
- [ ] Cross-conversation cache (F8): on `persist='project'` / `persist='conversation'` lookup hit + valid `schema_digest` + unexpired, emit `genui_surface_response { respondedBy: 'cache' }` without broadcasting a request.
- [ ] `apps/daemon/src/plugins/connector-gate.ts` — apply path resolves `od.connectors.required[]` against `connectorService.listAll()`; auto-derives implicit `oauth-prompt` (`__auto_connector_<id>`, `persist='project'`) for not-yet-connected required connectors. Token-issuance path validates plugin trust × `connector:<id>`. `/api/tools/connectors/execute` re-validates on every call.
- [ ] HTTP: `GET /api/runs/:runId/genui`, `GET /api/projects/:projectId/genui`, `POST /api/runs/:runId/genui/:surfaceId/respond`, `POST /api/projects/:projectId/genui/:surfaceId/revoke`, `POST /api/projects/:projectId/genui/prefill`, `POST /api/runs/:runId/replay`, `GET /api/runs/:runId/devloop-iterations`.
- [ ] SSE / ND-JSON streams emit `pipeline_stage_started`, `pipeline_stage_completed`, `genui_surface_request`, `genui_surface_response`, `genui_surface_timeout`, `genui_state_synced` per the contracts variants from F2.
- [ ] Web API-fallback rejection: when web sidecar detects fallback path with `pluginId`, return `409 plugin-requires-daemon`.
- [ ] **Lift the `## Active plugin` renderer into `packages/contracts/src/prompts/plugin-block.ts` (PB1).** Pure function `renderPluginBlock(snapshot: AppliedPluginSnapshot): string` with no fs / db dependencies. Phase 1 placed the block string-template inline in `apps/daemon/src/prompts/system.ts`; Phase 2A moves the template to contracts and the daemon composer becomes a one-line import. Web API-fallback still rejects plugin runs with 409 (a snapshot-less prompt has no use for the renderer), so this is hygiene-only — but it removes the spec §11.8 byte-equality CI cross-check fixture from the future Phase 4 backlog and makes the eventual fallback-mode plugin support a one-line wiring change.

Deliverables (CLI)

- [ ] `od plugin trust` (accepts `connector:<id>` form per §9.1), `od plugin apply --grant-caps`, exit code 66 with structured stderr, exit code 73 for awaiting GenUI.
- [ ] `od ui list/show/respond/revoke/prefill`.
- [ ] `od plugin replay <runId>`.
- [ ] `od run watch` ND-JSON includes `genui_*` and `pipeline_stage_*` events.

Deliverables (web)

- [ ] `applyPlugin(pluginId, projectId?)` helper in `apps/web/src/state/projects.ts`.
- [ ] `InlinePluginsRail`, `ContextChipStrip`, `PluginInputsForm`. Mounted in `NewProjectPanel` only this phase (`ChatComposer` waits for Phase 2B).
- [ ] `GenUISurfaceRenderer` for `confirmation` + `oauth-prompt` (cards / modal); subscribes to `genui_surface_request`; calls respond endpoint.
- [ ] `GenUIInbox` drawer in `ProjectView`.

Validation

- [ ] **e2e-4 replay invariance**, **e2e-5 GenUI cross-conversation**, **e2e-6 connector gate**, **e2e-7 api-fallback rejection** — see §8.
- [ ] Daemon unit test: pipeline stage scheduler runs a plugin with `repeat: true; until: 'critique.score>=4 || iterations>=3'` and converges in ≤3 iterations on a stub critique source.
- [ ] Daemon unit test: per F8, second oauth-prompt request in the same project does not broadcast.

### Phase 2A.5 — GenUI form + choice + JSON Schema renderer (2–3 d)

Deliverables

- [ ] `GenUISurfaceRenderer` extended for `form` and `choice`; JSON Schema → React form bridge (small, in-tree; no external dep added without review).
- [ ] CLI parity: `od ui show` returns the schema for headless rendering.

Validation

- [ ] Daemon test: a `form` surface answered via `od ui respond --value-json '...'` writes through the same path as a UI answer; the `genui_surface_response` event has `respondedBy: 'user'` in both cases.

### Phase 2B — Marketplace deep UI + ChatComposer apply + preview sandbox (4–6 d)

Deliverables

- [ ] Routes `/marketplace`, `/marketplace/:id` in `apps/web/src/router.ts`.
- [ ] `MarketplaceView`, `PluginDetailView`.
- [ ] `ChatComposer` integrates `InlinePluginsRail` + `ContextChipStrip` + `PluginInputsForm`. `applyPlugin()` accepts current `projectId`.
- [ ] `GET /api/plugins/:id/preview` and `/api/plugins/:id/example/:name` with the §9.2 sandbox CSP, `sandbox="allow-scripts"` only.
- [ ] Preview path traversal / symlink / size guards.

Validation

- [ ] Browser test: a malicious-fixture preview cannot fetch `/api/*` (CSP `connect-src 'none'`).
- [ ] e2e: install local plugin → marketplace → detail preview → "Use" → Home or ChatComposer prefilled → run produces design.

### Phase 2C — Advanced CLI: files write/upload/delete/diff, project import, run logs (2–3 d)

Deliverables

- [ ] `od files write/upload/delete/diff`.
- [ ] `od project delete/import`, `od run list/logs --since`.
- [ ] `od conversation list/new/info` (basic).

Validation

- [ ] Extend the §12.5 walk-through: `od project import` an external folder → `od plugin apply` → `od plugin replay <runId>` reruns on top.

### Phase 3 — Federated marketplaces + tiered trust + bundle plugins (3–5 d)

Deliverables

- [ ] `od marketplace add/remove/trust/untrust/list/refresh`. `od plugin install <name>` resolves through configured marketplaces.
- [ ] `GET / POST /api/marketplaces`, `POST /api/marketplaces/:id/trust`, `GET /api/marketplaces/:id/plugins`.
- [ ] Trust UI on `PluginDetailView` (capability checklist + Grant action).
- [ ] Apply pipeline gates by `trust` + `capabilities_granted` (already partly in Phase 2A; this phase wires UI + marketplace).
- [ ] Bundle plugin installer (multiple skills + DS + craft → registry under namespaced ids).
- [ ] `od plugin doctor <id>` runs full validation including bundle expansion.

Validation

- [ ] e2e: install plugin from a local mock `marketplace.json`, rotate ref, uninstall.
- [ ] e2e: restricted plugin cannot start MCP server until Grant clicked; check `applied_plugin_snapshots.capabilities_granted` updates.

### Phase 4 — Atoms exposure, publish-back, AG-UI adapter, full CLI parity (1–2 wk; splittable)

Deliverables

- [ ] `docs/atoms.md`; `GET /api/atoms` returns implemented + reserved (with `(planned)` marker).
- [ ] `od plugin export <projectId> --as od|claude-plugin|agent-skill`.
- [ ] `od plugin run <id> --input k=v --follow` (apply + run start + watch wrapper).
- [ ] `od plugin scaffold` interactive starter.
- [ ] `od plugin publish --to anthropics-skills|awesome-agent-skills|clawhub` (PR template launcher).
- [ ] CLI parity remainder: `od skills/design-systems/craft/atoms list/show`, `od status/doctor/version`, `od config get/set/list/unset`, `od marketplace search`.
- [ ] Optional `plugins/_official/atoms/<atom>/SKILL.md` extraction (spec §23.3.2 patch 2).
- [ ] `@open-design/agui-adapter` package; `GET /api/runs/:runId/agui` SSE endpoint emits AG-UI canonical events.
- [ ] Plugin manifest upgrade: `od.genui.surfaces[].component` (capability gate `genui:custom-component`).

Validation

- [ ] **e2e-9 UI ↔ CLI parity**: pick 5 desktop UI workflows; replay each through `od …` only; produced artifacts byte-for-byte equal.
- [ ] AG-UI smoke: a CopilotKit React client subscribes to `/api/runs/:runId/agui` and renders surfaces unmodified.

### Phase 5 — Cloud deployment (parallel; can start after Phase 1.5)

Deliverables

- [ ] `linux/amd64` + `linux/arm64` Dockerfile per spec §15.1 (`node:24-bookworm-slim` base, non-root uid 10001, bundled `ffmpeg` / `git` / `ripgrep`).
- [ ] CI pushes `:edge` on main, `:<version>` on tag.
- [ ] `tools/pack/docker-compose.yml`, `tools/pack/helm/`.
- [ ] Bound-API-token guard: daemon refuses to bind `OD_BIND_HOST=0.0.0.0` without `OD_API_TOKEN`; bearer middleware on `/api/*` skipped only on loopback.
- [ ] `ProjectStorage` adapter for S3-compatible blob stores.
- [ ] `DaemonDb` adapter for Postgres.
- [ ] **Snapshot retention enforcement job (PB2).** Periodic worker (default every 6 h, knob `OD_SNAPSHOT_GC_INTERVAL_MS`) deletes `applied_plugin_snapshots` rows where `expires_at IS NOT NULL AND expires_at <= now()`. When `OD_SNAPSHOT_RETENTION_DAYS` is set, the worker additionally retires referenced rows older than the window if and only if the referencing run/conversation/project is itself terminal. Audit log entry per deletion. CLI escape hatch: `od plugin snapshots prune --before <ts>` for forced cleanup. Plays alongside §15.7 hosted defaults.

Validation

- [ ] `docker run` smoke: image starts, web UI renders, `od plugin install` works inside container.
- [ ] Multi-cloud smoke: deploy compose to AWS Fargate, GCP Cloud Run, Azure Container Apps; produce a fixed plugin's artifact byte-for-byte equal across clouds.
- [ ] Pluggable storage smoke: same plugin alternated between local-disk + SQLite and S3 + Postgres; artifacts identical.

### Phase 6 / 7 / 8 — Post-v1 native scenario coverage (per spec §21.4)

These are tracked but **not part of v1 sign-off**. Listed here so spec patches that promote `(planned)` atoms have a place to update.

- [ ] **Phase 6 — figma-migration native**: implement `figma-extract` + `token-map`; ship official `figma-migration` plugin.
- [ ] **Phase 7 — code-migration native** (§20.3 §21.3.2): `code-import`, `design-extract`, `rewrite-plan`, `patch-edit`, `diff-review`, `build-test` evaluator; freeze target-stack contract; freeze design-token mapping contract.
- [ ] **Phase 8 — production code delivery native**: repo-aware multi-file patch orchestration; native review-and-apply surface; promote `handoffKind: 'deployable-app'` from reservation to implementation.

---

## 7. Spec decisions (locked)

These were originally spec §18 open questions; they are now resolved and propagated into both this plan and `docs/plugins-spec.md` proper. Future spec patches that revisit them must update both files in the same PR.

- **PB1. Lift `## Active plugin` block into `packages/contracts/src/prompts/plugin-block.ts` in Phase 2A** (was Phase 4). **Decision: accepted as proposed.** Both `composeSystemPrompt()` implementations (daemon + contracts) import the same renderer. Spec §11.8 patched to drop the "Phase 4 lifts the block" bullet and the CI byte-equality cross-check fixture; spec §18 patched to mark the open question resolved. Plan §6 Phase 2A gains the deliverable; Phase 4 loses it.
- **PB2. `AppliedPluginSnapshot` unreferenced-row TTL.** **Decision: accepted with one modification** to preserve spec §8.2.1's reproducibility-first stance. Final shape:
  - `applied_plugin_snapshots.expires_at INTEGER` column lands in Phase 1 (NULL allowed).
  - Snapshots referenced by any `runs.applied_plugin_snapshot_id` / `conversations.applied_plugin_snapshot_id` / `projects.applied_plugin_snapshot_id` keep `expires_at = NULL` (pinned forever; reproducibility unchanged).
  - Unreferenced snapshots receive `expires_at = applied_at + OD_SNAPSHOT_UNREFERENCED_TTL_DAYS` (default **30 d**, set to `0` to disable). This is the apply-then-cancel garbage-growth defense.
  - The "expire even referenced" knob `OD_SNAPSHOT_RETENTION_DAYS` is **operator-opt-in only**, default unset; when set, a referenced row may expire if `applied_at` is older than the window AND the referencing row is itself terminal (run finished, conversation archived, project deleted).
  - Both env vars live in `apps/daemon/src/app-config.ts` (per F6 pattern). Phase 1 ships the column + config wiring; Phase 5 ships the periodic enforcement job.
  - Spec §11.4 patched to add the `expires_at` column; spec §18 patched to mark the open question resolved.

---

## 8. Definition of done (the hard sign-off bar for v1)

v1 ships when **all** of the following pass on a clean Linux CI container without electron. Each row links to the daemon / e2e test path that asserts it (fill in path when the test lands).

- [ ] **e2e-1 cold install** — `od plugin install ./fixtures/sample-plugin` →
  - `~/.open-design/plugins/sample-plugin/` exists.
  - `installed_plugins` has one row with `trust='restricted'`, `source_kind='local'`.
  - Test path: `_TBD_`
- [ ] **e2e-2 pure apply** — `od plugin apply sample-plugin --project p --json` →
  - stdout parses as `ApplyResult`.
  - `applied_plugin_snapshots` has a new row with `run_id IS NULL`.
  - Project cwd has zero new files; no `.mcp.json`.
  - Test path: `_TBD_`
- [ ] **e2e-3 headless run** — `od run start --project p --plugin sample-plugin --follow` →
  - First ND-JSON event has `kind='pipeline_stage_started'`.
  - Final artifact bytes equal those from the same plugin under the Phase 2A UI flow.
  - `runs.applied_plugin_snapshot_id` is non-null.
  - Test path: `_TBD_`
- [ ] **e2e-4 replay invariance** — after `od plugin update sample-plugin` (new version), `od plugin replay <runId>` →
  - New run's prompt is byte-equal to the original run's prompt.
  - New run reuses the original snapshot row (`status='fresh'`); the upgrade did not pollute it.
  - Test path: `_TBD_`
- [ ] **e2e-5 GenUI cross-conversation** — plugin declares `oauth-prompt(persist='project')`. After conv A resolves it, conv B re-applying the plugin →
  - No `genui_surface_request` is broadcast.
  - A `genui_surface_response { respondedBy: 'cache' }` event is emitted.
  - Test path: `_TBD_`
- [ ] **e2e-6 connector trust gate** — plugin declares `od.connectors.required = [{ id: 'slack', tools: ['channels.list'] }]`, `connector:slack` not granted →
  - `od plugin apply` exits 66 with stderr JSON containing `data.required` including `connector:slack`.
  - `curl /api/tools/connectors/execute` (simulating bypass) returns `403 connector-not-granted`.
  - Test path: `_TBD_`
- [ ] **e2e-7 api-fallback rejection** — daemon stopped, web fallback mode triggers a plugin run →
  - `409 plugin-requires-daemon`.
  - Restarting the daemon restores normal flow.
  - Test path: `_TBD_`
- [ ] **e2e-8 apply purity regression** — run `od plugin apply` then cancel, 100×.
  - Project cwd byte size unchanged.
  - `applied_plugin_snapshots` row count grows by 100.
  - No staged assets; no `.mcp.json`.
  - Test path: `_TBD_`

Plus repo-wide gates

- [ ] `pnpm guard` clean.
- [ ] `pnpm typecheck` clean.
- [ ] `pnpm --filter @open-design/contracts test` clean.
- [ ] `pnpm --filter @open-design/plugin-runtime test` clean.
- [ ] `pnpm --filter @open-design/daemon test` clean.
- [ ] `pnpm --filter @open-design/web test` clean.

---

## 9. Status snapshot (the always-live cell)

| Field | Value |
| --- | --- |
| Current phase | _not started_ |
| Next planned PR | Phase 0: contracts + JSON schemas |
| Open spec push-backs | none — PB1 / PB2 resolved (see §7) |
| Last sync against `docs/plugins-spec.md` | 2026-05-09 (PB1 / PB2 propagation) |

Update this table on every plugin-system PR merge. When the value of "Current phase" advances, also flip the matching deliverables in §6 and the modules in §3.

---

## 10. References

- Spec: [`docs/plugins-spec.md`](../plugins-spec.md) · [`docs/plugins-spec.zh-CN.md`](../plugins-spec.zh-CN.md)
- Skills protocol: [`docs/skills-protocol.md`](../skills-protocol.md)
- Architecture overview: [`docs/architecture.md`](../architecture.md)
- Repository conventions: [`AGENTS.md`](../../AGENTS.md), [`apps/AGENTS.md`](../../apps/AGENTS.md), [`packages/AGENTS.md`](../../packages/AGENTS.md)
- Adjacent active plan: [`docs/plans/manual-edit-mode-implementation.md`](manual-edit-mode-implementation.md)
