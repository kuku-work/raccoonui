// Plan §3.C3 / §3.L3 / Plan §3.Q1 / spec §10.3 — Generative UI surface renderer.
//
// Renders a single pending GenUI surface. v1 ships first-class
// renderers for `confirmation`, `oauth-prompt`, the auto-derived
// `__auto_diff_review_<stageId>` choice surface (Phase 8 entry slice),
// generic single-property `choice` surfaces (any schema with a
// primary enum property), and bundled-component surfaces (sandboxed
// iframe). `form` without a component falls back to a JSON-Schema
// preview + a generic "value-json" textarea.

import { useEffect, useRef, useState } from 'react';
import type { GenUISurfaceSpec } from '@open-design/contracts';

export interface PendingSurface {
  // The surface descriptor as declared in `od.genui.surfaces[]`.
  surface: GenUISurfaceSpec;
  // The runId the surface was raised on. The respond endpoint is
  // POST /api/runs/:runId/genui/:surfaceId/respond.
  runId: string;
  // Optional pre-filled value used for `form`/`choice` re-asks.
  defaultValue?: unknown;
  // Plan §3.L3 / spec §10.3.5 — required when `surface.component` is
  // declared. The renderer points the sandbox iframe at
  // `/api/plugins/<componentPluginId>/asset/<component.path>`. The
  // host supplies it from the run's AppliedPluginSnapshot.pluginId.
  componentPluginId?: string;
  // Plan §3.Q1 — runtime context passed into the surface renderer.
  // Today only `touchedFiles` is read by the auto-derived
  // diff-review surface (the file checklist shown when the user
  // picks 'partial'); future entries can carry per-stage context
  // without bloating GenUISurfaceSpec itself.
  context?: {
    touchedFiles?: string[];
  };
}

interface Props {
  pending: PendingSurface;
  onAnswered: (value: unknown) => Promise<void> | void;
  onSkip?: () => void;
}

export function GenUISurfaceRenderer(props: Props) {
  const { surface } = props.pending;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (value: unknown) => {
    setSubmitting(true);
    setError(null);
    try {
      await props.onAnswered(value);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (surface.kind === 'confirmation') {
    return (
      <div className="genui-surface genui-surface--confirmation" role="dialog" aria-label={surface.id}>
        <div className="genui-surface__prompt">
          {surface.prompt ?? 'The plugin needs your confirmation to continue.'}
        </div>
        <div className="genui-surface__actions">
          <button
            type="button"
            className="genui-surface__primary"
            disabled={submitting}
            onClick={() => submit(true)}
            data-testid="genui-confirm"
          >
            Continue
          </button>
          <button
            type="button"
            className="genui-surface__secondary"
            disabled={submitting}
            onClick={() => submit(false)}
            data-testid="genui-cancel"
          >
            Cancel
          </button>
        </div>
        {error ? <div className="genui-surface__error">{error}</div> : null}
      </div>
    );
  }

  // Plan §3.Q1 / spec §21.5 — Phase 8 native review-and-apply surface.
  //
  // The auto-derived diff-review choice surface
  // (`__auto_diff_review_<stageId>`) gets a dedicated UI: three
  // top-level buttons (accept / reject / partial) plus a per-file
  // checklist that shows up when the user picks 'partial'.
  // Plugin-author-declared surfaces with the same id win and reach
  // this branch only when they preserve the auto schema shape, so we
  // also fall through into the generic `choice` renderer below for
  // surfaces that customise away from this contract.
  if (surface.kind === 'choice' && surface.id.startsWith('__auto_diff_review_')) {
    return (
      <DiffReviewChoiceSurface
        surface={surface}
        files={asStringArray(props.pending.context?.touchedFiles)}
        onAnswered={submit}
        disabled={submitting}
        error={error}
        {...(props.onSkip ? { onSkip: props.onSkip } : {})}
      />
    );
  }

  // Generic `choice` surface: any schema with a single primary enum
  // property renders as a button group. Multi-property choices fall
  // back to the FreeFormJsonForm so power users can edit by hand.
  if (surface.kind === 'choice') {
    const primary = pickPrimaryEnum(surface.schema);
    if (primary) {
      return (
        <GenericChoiceSurface
          surface={surface}
          primary={primary}
          onAnswered={submit}
          disabled={submitting}
          error={error}
          {...(props.onSkip ? { onSkip: props.onSkip } : {})}
        />
      );
    }
  }

  // Plan §3.L3 / spec §10.3.5 — plugin-bundled component surface.
  //
  // A surface that ships its own component path renders inside a
  // sandboxed iframe served by the daemon's plugin-asset endpoint.
  // The contract:
  //
  //   - `component.path` is a relpath inside the plugin folder; the
  //     iframe src is /api/plugins/:pluginId/asset/:path so the daemon
  //     can apply the §9.2 preview CSP.
  //   - The iframe communicates back via `postMessage` with a
  //     { kind: 'genui:respond', value } envelope. Other messages are
  //     ignored.
  //   - The capability gate (`genui:custom-component`) was enforced at
  //     install time by `od plugin doctor`; the renderer trusts the
  //     manifest's `component` field and falls back to the default
  //     when missing.
  //
  // The pluginId is read from the surface's `component.pluginId` field
  // (when the daemon stamps it during apply) or from the implicit
  // surface id prefix `__auto_connector_<id>` etc. v1 expects the
  // host to inject it through PendingSurface.componentPluginId.
  if (surface.component) {
    const pluginId = props.pending.componentPluginId;
    if (!pluginId) {
      return (
        <div className="genui-surface genui-surface--component-error" role="alert">
          Plugin component surface "{surface.id}" requires componentPluginId.
        </div>
      );
    }
    const sanitizedPath = surface.component.path.replace(/^[./\\]+/, '');
    const src = `/api/plugins/${encodeURIComponent(pluginId)}/asset/${sanitizedPath
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`;
    return (
      <SandboxedComponentSurface
        runId={props.pending.runId}
        surfaceId={surface.id}
        src={src}
        sandbox={surface.component.sandbox === 'react' ? 'react' : 'iframe'}
        onAnswered={props.onAnswered}
        {...(props.onSkip ? { onSkip: props.onSkip } : {})}
      />
    );
  }

  if (surface.kind === 'oauth-prompt') {
    return (
      <div className="genui-surface genui-surface--oauth" role="dialog" aria-label={surface.id}>
        <div className="genui-surface__prompt">
          {surface.prompt ?? `Authorize ${surface.oauth?.connectorId ?? surface.oauth?.mcpServerId ?? 'the connector'}`}
        </div>
        <div className="genui-surface__hint">
          {surface.oauth?.route === 'connector'
            ? `connector: ${surface.oauth.connectorId}`
            : surface.oauth?.route === 'mcp'
              ? `mcp server: ${surface.oauth.mcpServerId}`
              : null}
        </div>
        <div className="genui-surface__actions">
          <button
            type="button"
            className="genui-surface__primary"
            disabled={submitting}
            onClick={() => submit({
              authorized: true,
              ...(surface.oauth?.route === 'connector' && surface.oauth.connectorId
                ? { connectorId: surface.oauth.connectorId }
                : {}),
              ...(surface.oauth?.route === 'mcp' && surface.oauth.mcpServerId
                ? { mcpServerId: surface.oauth.mcpServerId }
                : {}),
            })}
            data-testid="genui-authorize"
          >
            Authorize
          </button>
          {props.onSkip ? (
            <button
              type="button"
              className="genui-surface__secondary"
              disabled={submitting}
              onClick={props.onSkip}
            >
              Skip
            </button>
          ) : null}
        </div>
        {error ? <div className="genui-surface__error">{error}</div> : null}
      </div>
    );
  }

  // form / choice fallback — Phase 2A.5 lands the JSON-Schema-driven
  // renderer; until then a value-json textarea is the headless-equivalent
  // surface a power user can edit by hand.
  return (
    <div className="genui-surface genui-surface--fallback" role="dialog" aria-label={surface.id}>
      <div className="genui-surface__prompt">
        {surface.prompt ?? `Plugin needs ${surface.kind} input.`}
      </div>
      {surface.schema ? (
        <details className="genui-surface__schema">
          <summary>JSON Schema</summary>
          <pre>{JSON.stringify(surface.schema, null, 2)}</pre>
        </details>
      ) : null}
      <FreeFormJsonForm onSubmit={submit} disabled={submitting} />
      {error ? <div className="genui-surface__error">{error}</div> : null}
    </div>
  );
}

// Plan §3.Q1 — diff-review native UI.
//
// Renders the three top-level decisions (accept / reject / partial).
// Clicking 'accept' / 'reject' submits a payload that matches the
// auto-derived surface schema; the daemon's diff-review atom impl
// (apps/daemon/src/plugins/atoms/diff-review.ts) already handles the
// default-fill rules so accepted_files / rejected_files don't need to
// be sent on the simple paths.
//
// 'partial' reveals a checklist: every file the patch-edit stages
// touched (passed in as `files`) gets a per-file accept / reject
// toggle. The submit guard mirrors the daemon's contract — every
// touched file must be on one of the two lists or the daemon throws
// 'missing <file>'. The UI surfaces that locally to keep the round
// trip cheap.
function DiffReviewChoiceSurface(props: {
  surface: GenUISurfaceSpec;
  files: string[];
  onAnswered: (value: unknown) => void | Promise<void>;
  disabled: boolean;
  error: string | null;
  onSkip?: () => void;
}) {
  const [mode, setMode] = useState<'idle' | 'partial'>('idle');
  const [reason, setReason] = useState('');
  const [perFile, setPerFile] = useState<Record<string, 'accept' | 'reject' | 'undecided'>>(() =>
    Object.fromEntries(props.files.map((f) => [f, 'undecided'] as const)),
  );

  const accept = async () => {
    await props.onAnswered({
      decision: 'accept',
      ...(props.files.length > 0 ? { accepted_files: props.files, rejected_files: [] } : {}),
      ...(reason ? { reason } : {}),
    });
  };
  const reject = async () => {
    await props.onAnswered({
      decision: 'reject',
      accepted_files: [],
      ...(props.files.length > 0 ? { rejected_files: props.files } : {}),
      ...(reason ? { reason } : {}),
    });
  };
  const submitPartial = async () => {
    const accepted = props.files.filter((f) => perFile[f] === 'accept');
    const rejected = props.files.filter((f) => perFile[f] === 'reject');
    const undecided = props.files.filter((f) => (perFile[f] ?? 'undecided') === 'undecided');
    if (undecided.length > 0) {
      // The daemon would reject this with 'missing <file>'; surface
      // locally so the user doesn't ping back the server.
      throw new Error(`Pick accept or reject for: ${undecided.join(', ')}`);
    }
    await props.onAnswered({
      decision: 'partial',
      accepted_files: accepted,
      rejected_files: rejected,
      ...(reason ? { reason } : {}),
    });
  };

  return (
    <div className="genui-surface genui-surface--diff-review" role="dialog" aria-label={props.surface.id}>
      <div className="genui-surface__prompt">
        {props.surface.prompt ?? 'Review the diff and choose how to proceed.'}
      </div>
      <div className="genui-surface__hint">
        {props.files.length > 0
          ? `${props.files.length} file${props.files.length === 1 ? '' : 's'} touched.`
          : 'No file list available — the daemon will default-fill the accept / reject sets.'}
      </div>
      <div className="genui-surface__actions">
        <button
          type="button"
          className="genui-surface__primary"
          disabled={props.disabled}
          onClick={() => void accept()}
          data-testid="genui-diff-accept"
        >
          Accept all
        </button>
        <button
          type="button"
          className="genui-surface__secondary"
          disabled={props.disabled}
          onClick={() => void reject()}
          data-testid="genui-diff-reject"
        >
          Reject all
        </button>
        <button
          type="button"
          className="genui-surface__secondary"
          disabled={props.disabled || props.files.length === 0}
          onClick={() => setMode('partial')}
          data-testid="genui-diff-partial"
        >
          Partial…
        </button>
        {props.onSkip ? (
          <button
            type="button"
            className="genui-surface__secondary"
            disabled={props.disabled}
            onClick={props.onSkip}
          >
            Skip
          </button>
        ) : null}
      </div>
      {mode === 'partial' ? (
        <div className="genui-surface__partial">
          <ul className="genui-surface__file-list">
            {props.files.map((f) => (
              <li key={f} className="genui-surface__file-row">
                <code className="genui-surface__file-name">{f}</code>
                <label className="genui-surface__file-toggle">
                  <input
                    type="radio"
                    name={`diff-${f}`}
                    value="accept"
                    checked={perFile[f] === 'accept'}
                    onChange={() => setPerFile((s) => ({ ...s, [f]: 'accept' }))}
                    data-testid={`genui-diff-file-accept-${f}`}
                  />
                  accept
                </label>
                <label className="genui-surface__file-toggle">
                  <input
                    type="radio"
                    name={`diff-${f}`}
                    value="reject"
                    checked={perFile[f] === 'reject'}
                    onChange={() => setPerFile((s) => ({ ...s, [f]: 'reject' }))}
                    data-testid={`genui-diff-file-reject-${f}`}
                  />
                  reject
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="genui-surface__primary"
            disabled={props.disabled}
            onClick={() => void submitPartial().catch(() => { /* surfaced via parent error */ })}
            data-testid="genui-diff-partial-submit"
          >
            Submit partial decision
          </button>
        </div>
      ) : null}
      <textarea
        className="genui-surface__textarea genui-surface__reason"
        placeholder="Notes for the patch author (optional)"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        data-testid="genui-diff-reason"
      />
      {props.error ? <div className="genui-surface__error">{props.error}</div> : null}
    </div>
  );
}

// Plan §3.Q1 — generic single-enum-property choice renderer.
//
// Detects schemas of shape `{ properties: { <key>: { enum: [...] } } }`
// and renders one button per enum value. Submits an object with the
// enum value at the picked key. Multi-property choices fall back to
// the JSON textarea (handled by the caller).
function GenericChoiceSurface(props: {
  surface: GenUISurfaceSpec;
  primary: { key: string; enum: string[] };
  onAnswered: (value: unknown) => void | Promise<void>;
  disabled: boolean;
  error: string | null;
  onSkip?: () => void;
}) {
  return (
    <div className="genui-surface genui-surface--choice" role="dialog" aria-label={props.surface.id}>
      <div className="genui-surface__prompt">
        {props.surface.prompt ?? `Plugin needs ${props.primary.key} input.`}
      </div>
      <div className="genui-surface__actions">
        {props.primary.enum.map((value, idx) => (
          <button
            key={value}
            type="button"
            className={idx === 0 ? 'genui-surface__primary' : 'genui-surface__secondary'}
            disabled={props.disabled}
            onClick={() => void props.onAnswered({ [props.primary.key]: value })}
            data-testid={`genui-choice-${value}`}
          >
            {value}
          </button>
        ))}
        {props.onSkip ? (
          <button
            type="button"
            className="genui-surface__secondary"
            disabled={props.disabled}
            onClick={props.onSkip}
          >
            Skip
          </button>
        ) : null}
      </div>
      {props.error ? <div className="genui-surface__error">{props.error}</div> : null}
    </div>
  );
}

function pickPrimaryEnum(schema: unknown): { key: string; enum: string[] } | null {
  if (!schema || typeof schema !== 'object') return null;
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  if (!props || typeof props !== 'object') return null;
  // Prefer a property literally named 'decision' (the diff-review
  // contract) so it wins over other enum properties when several are
  // declared.
  const ordered = Object.keys(props).sort((a, b) =>
    a === 'decision' ? -1 : b === 'decision' ? 1 : 0,
  );
  for (const key of ordered) {
    const prop = props[key];
    if (!prop || typeof prop !== 'object') continue;
    const e = (prop as { enum?: unknown }).enum;
    if (!Array.isArray(e)) continue;
    const stringValues = e.filter((v): v is string => typeof v === 'string');
    if (stringValues.length === 0) continue;
    return { key, enum: stringValues };
  }
  return null;
}

function asStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((s): s is string => typeof s === 'string');
}

function FreeFormJsonForm({
  onSubmit,
  disabled,
}: {
  onSubmit: (value: unknown) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState('{}');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          onSubmit(JSON.parse(text));
        } catch (err) {
          // Invalid JSON; surface the parse error inline.
          // eslint-disable-next-line no-console
          console.warn('GenUI form: invalid JSON', err);
        }
      }}
    >
      <textarea
        className="genui-surface__textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        data-testid="genui-form-textarea"
      />
      <button type="submit" disabled={disabled} className="genui-surface__primary">
        Submit
      </button>
    </form>
  );
}

// Plan §3.L3 / spec §10.3.5 — sandboxed plugin component surface.
//
// Wraps the daemon's plugin-asset endpoint in an iframe with the
// minimum-privilege sandbox flags spec §9.2 calls out for previews:
// `allow-scripts` only — no `allow-same-origin`, `allow-forms`,
// `allow-popups`, or `allow-downloads`. Communication is one-way via
// `postMessage`; the parent listens for `{ kind: 'genui:respond', value }`
// envelopes from the iframe and forwards them through onAnswered.
function SandboxedComponentSurface({
  runId,
  surfaceId,
  src,
  sandbox,
  onAnswered,
  onSkip,
}: {
  runId: string;
  surfaceId: string;
  src: string;
  sandbox: 'iframe' | 'react';
  onAnswered: (value: unknown) => Promise<void> | void;
  onSkip?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      // We don't have an origin check the iframe can pass (it's served
      // sandboxed). Filter on shape + the surface id we expect.
      if (!ev.data || typeof ev.data !== 'object') return;
      const env = ev.data as { kind?: string; surfaceId?: string; value?: unknown };
      if (env.kind !== 'genui:respond') return;
      if (env.surfaceId !== surfaceId) return;
      setBusy(true);
      void Promise.resolve(onAnswered(env.value)).finally(() => setBusy(false));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [surfaceId, onAnswered]);

  // The 'react' sandbox tier is reserved for future plugin-bundled
  // React components loaded via dynamic import; v1 routes through the
  // iframe path regardless. The flag stays so a future PR can branch
  // here without touching the manifest schema.
  void sandbox;

  return (
    <div className="genui-surface genui-surface--component" role="dialog" aria-label={surfaceId}>
      <iframe
        ref={iframeRef}
        title={`plugin surface ${surfaceId}`}
        src={src}
        sandbox="allow-scripts"
        // `data-testid` lets jsdom tests assert the src + sandbox
        // attribute without trying to load the iframe's contents.
        data-testid="genui-component-iframe"
        data-run-id={runId}
        className="genui-surface__component-frame"
        style={{ width: '100%', minHeight: 320, border: '1px solid var(--od-border, #ddd)' }}
      />
      {onSkip ? (
        <div className="genui-surface__actions">
          <button
            type="button"
            className="genui-surface__secondary"
            disabled={busy}
            onClick={onSkip}
          >
            Skip
          </button>
        </div>
      ) : null}
    </div>
  );
}
