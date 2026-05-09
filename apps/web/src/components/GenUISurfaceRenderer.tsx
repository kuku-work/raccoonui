// Plan §3.C3 / §3.L3 / spec §10.3 — Generative UI surface renderer.
//
// Renders a single pending GenUI surface. v1 ships first-class
// renderers for `confirmation`, `oauth-prompt`, and bundled-component
// surfaces (sandboxed iframe). `form` and `choice` without a component
// fall back to a JSON-Schema preview + a generic "value-json" textarea
// (the proper schema-driven renderer lands in Phase 2A.5).

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
