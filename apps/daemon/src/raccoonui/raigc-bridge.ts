// @ts-nocheck
// RACCOONUI-PATCH: dispatch to raigc CLI for advanced workflows — 2026-05-04
//
// Bridge between raccoonui daemon and raigc CLI for workflow-id direct select.
// Contract: raigc 0.3.0 (docs/api-contract.md, ADR-008).
//
//   list:      spawn `raigc list-workflows --json`           — single-line stdout JSON
//   generate:  spawn `raigc image generate --workflow-id X --prompt P --out PATH --json`
//              stderr line-by-line  → progress events (rich console + warnings)
//              stdout single line   → final JSON result
//
// Exit codes (api-contract.md):
//   0 → success
//   1 → request error (bad args, unknown workflow, intent mismatch)
//   2 → runtime error (all backends failed)
//   ENOENT → raigc not on PATH (user hasn't installed it)

import { spawn } from 'node:child_process';
import path from 'node:path';

const RAIGC_BIN = process.env.RAIGC_BIN || 'raigc';
const LIST_CACHE_TTL_MS = 60_000;

export class RaigcNotInstalledError extends Error {
  constructor() {
    super(
      `raigc not installed; run: uv tool install -e <repo>/product/dev/raigc`,
    );
    this.name = 'RaigcNotInstalledError';
    this.code = 'RAIGC_NOT_INSTALLED';
    this.status = 503;
  }
}

export class RaigcBadRequestError extends Error {
  constructor(stderr) {
    super(stderr || 'raigc rejected the request');
    this.name = 'RaigcBadRequestError';
    this.code = 'RAIGC_BAD_REQUEST';
    this.status = 400;
  }
}

export class RaigcRuntimeError extends Error {
  constructor(stderr) {
    super(stderr || 'raigc backends all failed');
    this.name = 'RaigcRuntimeError';
    this.code = 'RAIGC_RUNTIME';
    this.status = 503;
  }
}

let listCache = null; // { at: ms, value: parsed JSON }

/**
 * `raigc list-workflows --json` with 60s in-memory cache.
 * Forwards stderr to console for debugging; stdout is the single JSON line.
 *
 * @returns {Promise<{raigc_version: string, workflows: Array<object>}>}
 */
export async function listRaigcWorkflows({ force = false } = {}) {
  if (!force && listCache && Date.now() - listCache.at < LIST_CACHE_TTL_MS) {
    return listCache.value;
  }
  const { stdout, stderr, code, errno } = await runRaigc([
    'list-workflows',
    '--json',
  ]);

  if (errno === 'ENOENT') throw new RaigcNotInstalledError();
  if (code !== 0) {
    // list-workflows exit 1 = registry malformed (raigc-side bug, not user error)
    throw new RaigcRuntimeError(stderr || `raigc exited ${code}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (err) {
    throw new RaigcRuntimeError(
      `raigc list-workflows --json returned non-JSON stdout: ${stdout.slice(0, 200)}`,
    );
  }

  listCache = { at: Date.now(), value: parsed };
  return parsed;
}

/** Invalidate list cache (e.g. after raigc upgrade). */
export function invalidateRaigcWorkflowsCache() {
  listCache = null;
}

/**
 * Generate via raigc workflow-id direct select. Returns an async generator
 * yielding { type: 'progress' | 'result' | 'error', ...payload } events
 * suitable for SSE forwarding.
 *
 * stderr lines → progress events (rich console + ADR-008 Q3 soft warns)
 * stdout JSON  → result event
 * exit 1       → throws RaigcBadRequestError
 * exit 2       → throws RaigcRuntimeError
 *
 * @param {object} opts
 * @param {string} opts.workflowId
 * @param {string} opts.prompt
 * @param {string} opts.outputAbsPath - daemon-resolved absolute output path
 * @param {('image'|'video')} [opts.media='image']
 * @param {string} [opts.ratio]
 * @param {string[]} [opts.references]
 * @param {string[]} [opts.characters]
 */
export async function* runRaigcGenerate(opts) {
  const {
    workflowId,
    prompt,
    outputAbsPath,
    media = 'image',
    ratio,
    references = [],
    characters = [],
  } = opts;

  if (!workflowId) throw new RaigcBadRequestError('workflowId is required');
  if (!prompt) throw new RaigcBadRequestError('prompt is required');
  if (!outputAbsPath || !path.isAbsolute(outputAbsPath)) {
    throw new RaigcBadRequestError('outputAbsPath must be absolute');
  }

  const args = [
    media,
    'generate',
    '--workflow-id',
    workflowId,
    '--prompt',
    prompt,
    '--out',
    outputAbsPath,
    '--json',
  ];
  if (ratio) args.push('--ratio', ratio);
  for (const ref of references) args.push('--reference', ref);
  for (const ch of characters) args.push('--character', ch);

  yield { type: 'progress', message: `raigc ${args.slice(0, 4).join(' ')}…` };

  const child = spawn(RAIGC_BIN, args, {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Buffer stdout (expected: one JSON line on exit 0). Stream stderr live.
  let stdoutBuf = '';
  let stderrBuf = '';
  let stderrLineBuf = '';

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  child.stdout.on('data', (chunk) => {
    stdoutBuf += chunk;
  });

  // Yield via async iter pattern: collect stderr lines into a queue the
  // generator drains between yields.
  const stderrQueue = [];
  let drainResolver = null;

  child.stderr.on('data', (chunk) => {
    stderrBuf += chunk;
    stderrLineBuf += chunk;
    const lines = stderrLineBuf.split('\n');
    stderrLineBuf = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        stderrQueue.push(trimmed);
        if (drainResolver) {
          drainResolver();
          drainResolver = null;
        }
      }
    }
  });

  let exitInfo = null;
  let exitResolver = null;
  const exitPromise = new Promise((resolve) => {
    exitResolver = resolve;
  });

  child.on('error', (err) => {
    exitInfo = { code: null, errno: err.code };
    if (exitResolver) {
      exitResolver();
      exitResolver = null;
    }
    if (drainResolver) {
      drainResolver();
      drainResolver = null;
    }
  });

  child.on('close', (code) => {
    if (stderrLineBuf.trim()) stderrQueue.push(stderrLineBuf.trim());
    if (!exitInfo) exitInfo = { code, errno: null };
    if (exitResolver) {
      exitResolver();
      exitResolver = null;
    }
    if (drainResolver) {
      drainResolver();
      drainResolver = null;
    }
  });

  // Drain stderr → yield progress events until process exits.
  while (true) {
    while (stderrQueue.length > 0) {
      yield { type: 'progress', message: stderrQueue.shift() };
    }
    if (exitInfo) break;
    await new Promise((resolve) => {
      drainResolver = resolve;
    });
  }

  // Flush any remaining stderr lines.
  while (stderrQueue.length > 0) {
    yield { type: 'progress', message: stderrQueue.shift() };
  }

  if (exitInfo.errno === 'ENOENT') throw new RaigcNotInstalledError();
  if (exitInfo.code === 1) throw new RaigcBadRequestError(stderrBuf.trim());
  if (exitInfo.code === 2) throw new RaigcRuntimeError(stderrBuf.trim());
  if (exitInfo.code !== 0) {
    throw new RaigcRuntimeError(
      `raigc exited ${exitInfo.code}; stderr: ${stderrBuf.trim().slice(0, 500)}`,
    );
  }

  let result;
  try {
    result = JSON.parse(stdoutBuf.trim());
  } catch (err) {
    throw new RaigcRuntimeError(
      `raigc generate --json returned non-JSON stdout: ${stdoutBuf.slice(0, 200)}`,
    );
  }

  yield { type: 'result', ...result };
}

/**
 * Internal: run raigc, capture all stdout/stderr, return on close.
 * Used by listRaigcWorkflows where we don't need streaming.
 */
function runRaigc(args) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const child = spawn(RAIGC_BIN, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (c) => {
      stdout += c;
    });
    child.stderr.on('data', (c) => {
      stderr += c;
    });
    child.on('error', (err) => {
      resolve({ stdout, stderr, code: null, errno: err.code });
    });
    child.on('close', (code) => {
      resolve({ stdout, stderr, code, errno: null });
    });
  });
}
