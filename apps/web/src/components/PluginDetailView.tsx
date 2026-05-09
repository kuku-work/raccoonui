// Plan G4 / spec §11.6 — Marketplace plugin detail.
//
// Renders one plugin's manifest, capability checklist, declared GenUI
// surfaces and connector requirements, plus a "Use this plugin"
// button that hydrates a fresh ApplyResult. The user lands back on
// Home with the brief / chip strip / inputs form pre-filled (the
// PluginsSection on NewProjectPanel renders the same applied state
// because applyPlugin returns the exact ApplyResult).

import { useEffect, useState } from 'react';
import type { ApplyResult, InstalledPluginRecord } from '@open-design/contracts';
import { applyPlugin } from '../state/projects';
import { navigate } from '../router';

interface Props {
  pluginId: string;
}

export function PluginDetailView(props: Props) {
  const [plugin, setPlugin] = useState<InstalledPluginRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<ApplyResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/plugins/${encodeURIComponent(props.pluginId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((row) => {
        if (cancelled) return;
        setPlugin(row as InstalledPluginRecord);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [props.pluginId]);

  if (error) {
    return (
      <div className="plugin-detail" data-testid="plugin-detail">
        <button type="button" onClick={() => navigate({ kind: 'marketplace' })}>
          ← Marketplace
        </button>
        <div role="alert">Failed to load plugin: {error}</div>
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="plugin-detail" data-testid="plugin-detail">
        <div>Loading plugin…</div>
      </div>
    );
  }

  const od = plugin.manifest?.od ?? {};
  const surfaces = od.genui?.surfaces ?? [];
  const required = od.connectors?.required ?? [];
  const optional = od.connectors?.optional ?? [];
  const capabilities = od.capabilities ?? [];

  const onUse = async () => {
    setApplying(true);
    setError(null);
    const result = await applyPlugin(plugin.id);
    setApplying(false);
    if (!result) {
      setError('Apply failed. Make sure the daemon is reachable.');
      return;
    }
    setApplied(result);
    // Navigate to Home so the existing inline rail / NewProjectPanel
    // surfaces the applied snapshot. Phase 2B ChatComposer mount then
    // picks it up automatically inside an existing project.
    navigate({ kind: 'home' });
  };

  return (
    <div className="plugin-detail" data-testid="plugin-detail">
      <button
        type="button"
        className="plugin-detail__back"
        onClick={() => navigate({ kind: 'marketplace' })}
      >
        ← Marketplace
      </button>

      <header className="plugin-detail__header">
        <h1>{plugin.title}</h1>
        <div className="plugin-detail__meta">
          <span>v{plugin.version}</span>
          <span>trust: {plugin.trust}</span>
          <span>source: {plugin.sourceKind}</span>
          {od.taskKind ? <span>{od.taskKind}</span> : null}
        </div>
      </header>

      {plugin.manifest?.description ? (
        <p className="plugin-detail__description">{plugin.manifest.description}</p>
      ) : null}

      <section className="plugin-detail__capabilities">
        <h2>Capabilities</h2>
        {capabilities.length === 0 ? (
          <div>None declared (defaults to <code>prompt:inject</code>).</div>
        ) : (
          <ul>
            {capabilities.map((c: string) => (
              <li key={c}>
                <code>{c}</code>
              </li>
            ))}
          </ul>
        )}
      </section>

      {required.length > 0 || optional.length > 0 ? (
        <section className="plugin-detail__connectors">
          <h2>Connectors</h2>
          {required.length > 0 ? (
            <>
              <h3>Required</h3>
              <ul>
                {required.map((c: { id: string; tools?: string[] }) => (
                  <li key={c.id}>
                    <code>{c.id}</code>
                    {c.tools && c.tools.length > 0 ? ` · ${c.tools.join(', ')}` : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {optional.length > 0 ? (
            <>
              <h3>Optional</h3>
              <ul>
                {optional.map((c: { id: string; tools?: string[] }) => (
                  <li key={c.id}>
                    <code>{c.id}</code>
                    {c.tools && c.tools.length > 0 ? ` · ${c.tools.join(', ')}` : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      {surfaces.length > 0 ? (
        <section className="plugin-detail__surfaces">
          <h2>This plugin may ask you</h2>
          <ul>
            {surfaces.map((s: { id: string; kind: string; persist?: string; prompt?: string }) => (
              <li key={s.id}>
                <code>{s.kind}</code> · <code>{s.id}</code>
                {s.persist ? <> · persists at <code>{s.persist}</code></> : null}
                {s.prompt ? <> — {s.prompt}</> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="plugin-detail__footer">
        <button
          type="button"
          className="plugin-detail__use"
          onClick={onUse}
          disabled={applying}
          data-testid="plugin-detail-use"
        >
          {applying ? 'Applying…' : 'Use this plugin'}
        </button>
        {applied ? (
          <div className="plugin-detail__applied">
            Applied (snapshot {applied.appliedPlugin.snapshotId.slice(0, 8)}…) —
            redirected to Home with the brief pre-filled.
          </div>
        ) : null}
      </footer>
    </div>
  );
}
