// RACCOONUI-PATCH: protocol-layer e2e harness — 2026-05-06
//
// Smoke-tests the four raccoonui-namespace contracts that upstream sync
// could regress without typecheck noticing:
//
//   A. Slug validation        — POST /api/projects rejects/accepts the
//                                slug regex `^[A-Za-z0-9._-]{1,128}$`
//   B. 7 git endpoints        — init / status / commit / push / history /
//                                rollback (+ import-fs scan)
//   C. raigc-bridge contract  — GET /api/raccoonui/workflows shape
//                                (200 with workflows[] OR 503 RAIGC_NOT_INSTALLED)
//   D. raccoonai picker       — GET /api/design-systems lists raccoonai +
//                                /api/design-systems/raccoonai serves body
//
// Runs against the in-process daemon (port=0, isolated OD_DATA_DIR). Wired
// into tools/raccoonui/upstream-audit.mjs so daily upstream sync surfaces
// regressions before they merge.

import type http from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

type StartServer = (options: {
  port: number;
  returnServer: true;
}) => Promise<{ url: string; server: http.Server }>;
type CloseDatabase = () => void;

let baseUrl: string;
let server: http.Server | undefined;
let closeDatabase: CloseDatabase | undefined;
let dataDir: string;

// One slug we reuse across the git endpoint suite — a single project's
// lifecycle covers init/status/commit/history/rollback/push contracts.
const PROJECT_SLUG = `raccoonui-protocol-${Date.now().toString(36)}`;
const PROJECT_NAME = 'raccoonui protocol e2e';

test.before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'raccoonui-protocol-e2e-'));
  process.env.OD_DATA_DIR = dataDir;
  const { startServer } = (await import('../../apps/daemon/dist/server.js')) as {
    startServer: StartServer;
  };
  ({ closeDatabase } = (await import('../../apps/daemon/dist/db.js')) as {
    closeDatabase: CloseDatabase;
  });
  const started = await startServer({ port: 0, returnServer: true });
  if (!started?.server || !started?.url) {
    throw new Error('startServer did not return { url, server }');
  }
  server = started.server;
  baseUrl = started.url;
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((err) => (err ? reject(err) : resolve()));
    });
  }
  closeDatabase?.();
  if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
});

// ── A. Slug validation ────────────────────────────────────────────────

test('A1 slug validation rejects empty / whitespace / illegal chars', async () => {
  const cases = [
    { id: '', name: 'empty' },
    { id: 'has space', name: 'space' },
    { id: 'has/slash', name: 'slash' },
    { id: 'a'.repeat(129), name: 'too long' },
  ];
  for (const body of cases) {
    const res = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 400, `expected 400 for slug ${JSON.stringify(body.id)}`);
    const json = (await res.json()) as { error?: { code?: string } };
    assert.equal(json.error?.code, 'BAD_REQUEST');
  }
});

test('A2 slug validation accepts valid slug + creates project', async () => {
  const res = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: PROJECT_SLUG, name: PROJECT_NAME }),
  });
  const text = await res.text();
  assert.equal(res.status, 200, text);
  const json = JSON.parse(text) as {
    project: { id: string; name: string };
    conversationId: string;
  };
  assert.equal(json.project.id, PROJECT_SLUG);
  assert.equal(json.project.name, PROJECT_NAME);
  assert.equal(typeof json.conversationId, 'string');
});

// ── B. 7 git endpoints (init / status / commit / push / history / rollback)
// + import-fs scan. push happy path requires a real remote so we only verify
// the missing-remote error path here.

test('B1 git/init creates repo + idempotent on second call', async () => {
  const first = await fetch(
    `${baseUrl}/api/raccoonui/projects/${PROJECT_SLUG}/git/init`,
    { method: 'POST' },
  );
  const firstText = await first.text();
  assert.equal(first.status, 200, firstText);
  const firstBody = JSON.parse(firstText) as {
    alreadyInitialized: boolean;
    initialCommit: string | null;
  };
  assert.equal(firstBody.alreadyInitialized, false);
  assert.match(firstBody.initialCommit ?? '', /^[0-9a-f]{40}$/);

  const second = await fetch(
    `${baseUrl}/api/raccoonui/projects/${PROJECT_SLUG}/git/init`,
    { method: 'POST' },
  );
  assert.equal(second.status, 200);
  const secondBody = (await second.json()) as {
    alreadyInitialized: boolean;
    initialCommit: string | null;
  };
  assert.equal(secondBody.alreadyInitialized, true);
  assert.equal(secondBody.initialCommit, null);
});

test('B2 git/status returns initialized=true + branch=main + no remote', async () => {
  const res = await fetch(
    `${baseUrl}/api/raccoonui/projects/${PROJECT_SLUG}/git/status`,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    initialized: boolean;
    branch: string | null;
    entries: unknown[];
    hasRemote: boolean;
  };
  assert.equal(body.initialized, true);
  assert.equal(body.branch, 'main');
  assert.ok(Array.isArray(body.entries));
  assert.equal(body.hasRemote, false);
});

test('B3 git/commit rejects empty message + reports nothing-to-commit', async () => {
  const empty = await fetch(
    `${baseUrl}/api/raccoonui/projects/${PROJECT_SLUG}/git/commit`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: '   ' }),
    },
  );
  assert.equal(empty.status, 400);
  const emptyBody = (await empty.json()) as { error?: { code?: string } };
  assert.equal(emptyBody.error?.code, 'BAD_REQUEST');

  // Initial commit captured every file; a second commit with no diff
  // should report 'nothing to commit' (not an error).
  const noop = await fetch(
    `${baseUrl}/api/raccoonui/projects/${PROJECT_SLUG}/git/commit`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'noop' }),
    },
  );
  assert.equal(noop.status, 200);
  const noopBody = (await noop.json()) as { committed: boolean; reason?: string };
  assert.equal(noopBody.committed, false);
  assert.match(noopBody.reason ?? '', /nothing to commit/i);
});

test('B4 git/history returns array with at least the init commit', async () => {
  const res = await fetch(
    `${baseUrl}/api/raccoonui/projects/${PROJECT_SLUG}/git/history?limit=10`,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    history: { hash: string; shortHash: string; message: string }[];
  };
  assert.ok(Array.isArray(body.history));
  const first = body.history[0];
  assert.ok(first, 'history must include at least the init commit');
  assert.match(first.hash, /^[0-9a-f]{40}$/);
  assert.match(first.shortHash, /^[0-9a-f]{4,}$/);
  assert.equal(typeof first.message, 'string');
});

test('B5 git/push without remote returns clear 400', async () => {
  const res = await fetch(
    `${baseUrl}/api/raccoonui/projects/${PROJECT_SLUG}/git/push`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    },
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error?: { code?: string; message?: string } };
  assert.equal(body.error?.code, 'GIT_PUSH_FAILED');
  assert.match(body.error?.message ?? '', /remote 'origin' not configured/);
});

test('B6 git/rollback rejects malformed commit reference', async () => {
  const res = await fetch(
    `${baseUrl}/api/raccoonui/projects/${PROJECT_SLUG}/git/rollback`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ commit: 'not-a-hash', mode: 'revert' }),
    },
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error?: { code?: string } };
  assert.equal(body.error?.code, 'GIT_ROLLBACK_FAILED');
});

test('B7b git/create-remote rejects pre-init project (no gh side effects)', async () => {
  // Spin up a fresh project we deliberately don't `git init`. The create-
  // remote endpoint must reject before reaching gh — that's the safety
  // contract that keeps this test from touching a real GitHub account.
  const slug = `raccoonui-noinit-${Date.now().toString(36)}`;
  const create = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: slug, name: 'no-init smoke' }),
  });
  assert.equal(create.status, 200, await create.text());

  const res = await fetch(
    `${baseUrl}/api/raccoonui/projects/${slug}/git/create-remote`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visibility: 'private' }),
    },
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error?: { code?: string; message?: string } };
  assert.equal(body.error?.code, 'GIT_CREATE_REMOTE_FAILED');
  assert.match(body.error?.message ?? '', /not initialized/);
});

test('B7 import-fs scan returns expected shape', async () => {
  const res = await fetch(`${baseUrl}/api/raccoonui/projects/import-fs`, {
    method: 'POST',
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    imported: string[];
    failed: { id: string; error: string }[];
  };
  assert.ok(Array.isArray(body.imported), 'imported must be an array (not a number)');
  assert.ok(Array.isArray(body.failed));
});

// ── C. raigc-bridge contract ──────────────────────────────────────────
//
// raigc may or may not be installed in the test environment. Both shapes
// are part of the contract — the bridge translates ENOENT into a stable
// 503 + RAIGC_NOT_INSTALLED that callers can branch on.

test('C1 raigc workflows endpoint returns documented shape (200 or 503)', async () => {
  const res = await fetch(`${baseUrl}/api/raccoonui/workflows`);
  if (res.status === 200) {
    const body = (await res.json()) as {
      raigc_version?: string;
      workflows?: unknown[];
    };
    assert.equal(typeof body.raigc_version, 'string');
    assert.ok(Array.isArray(body.workflows));
    return;
  }
  assert.equal(res.status, 503, `unexpected status ${res.status}`);
  const body = (await res.json()) as { error?: string; code?: string };
  assert.equal(body.code, 'RAIGC_NOT_INSTALLED');
  assert.equal(typeof body.error, 'string');
});

// ── D. raccoonai picker default ───────────────────────────────────────

test('D1 design-systems list contains raccoonai entry', async () => {
  const res = await fetch(`${baseUrl}/api/design-systems`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    designSystems: { id: string; title?: string }[];
  };
  assert.ok(Array.isArray(body.designSystems));
  const raccoonai = body.designSystems.find((s) => s.id === 'raccoonai');
  assert.ok(
    raccoonai,
    'raccoonai design system missing — RACCOONUI-PATCH picker default would break',
  );
});

test('D2 design-systems/raccoonai serves DESIGN.md body', async () => {
  const res = await fetch(`${baseUrl}/api/design-systems/raccoonai`);
  assert.equal(res.status, 200);
  const body = (await res.json()) as { id: string; body: string };
  assert.equal(body.id, 'raccoonai');
  assert.equal(typeof body.body, 'string');
  assert.ok(
    body.body.length > 100,
    'raccoonai DESIGN.md body suspiciously short',
  );
});
