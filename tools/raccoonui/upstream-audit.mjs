#!/usr/bin/env node
/**
 * RaccoonUI — Daily upstream sync audit
 *
 * Schedule: cron 0 6 * * * via slack-bot/jobs.json (shellPipeline)
 *
 * Behavior:
 *   1. git fetch upstream (timeout-bounded)
 *   2. compute commits ahead in upstream/main vs local main
 *   3. classify each changed file → auto-pass / auto-flag / review
 *   4. pnpm-lock.yaml diff summary if changed
 *   5. update audit-logs/PATCHES.md (RACCOONUI-PATCH catalog)
 *   6. run raccoonui protocol e2e harness (catches contract regressions
 *      typecheck would miss — see e2e/scripts/raccoonui-protocol.e2e.live.test.ts)
 *   7. write audit-logs/YYYY-MM-DD.md (full report)
 *   8. emit Slack-friendly summary to stdout (cron consumes)
 *
 * Exit code: 0 always (Slack icon conveys status — err handling in cron).
 *
 * Zero external deps: only node built-ins + git CLI + pnpm (for e2e step).
 */

import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const FORK_ROOT = resolve(dirname(__filename), '..', '..');
const AUDIT_DIR = resolve(FORK_ROOT, 'audit-logs');
// Local-timezone YYYY-MM-DD — toISOString() returns UTC which can drift the
// date label by ±1 day depending on hour-of-run. Cron triggers at 06:00 TPE
// daily; we want the audit log named after the operator's local date.
const TODAY = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
})();

// ── Classification rules ──

const AUTO_PASS_PATH = [
  /^[^/]+\.md$/i,                                          // root *.md
  /^docs\//i,
  /^apps\/web\/src\/i18n\/locales\//,                      // i18n
  /^design-systems\/[^/]+\/[^/]+\.(md|svg|png|jpg|jpeg|webp|woff2?)$/i,
  /^design-systems\/README\.md$/i,
  /^story\//i,                                             // upstream marketing copy
  /^prompt-templates\/.+\.(md|jpg|jpeg|png|webp|mp4|webm)$/i,
  /^assets\/prompt-templates\/.+\.(jpg|jpeg|png|webp|mp4|webm|svg)$/i,
  /^assets\/(frames|fonts|icons)\//i,                      // bundled binary assets
  /^README/i,
  /^CONTRIBUTING/i,
  /^TRANSLATIONS\.md$/i,
  /^QUICKSTART/i,
  // RACCOONUI-PATCH: Electron packaging surface — fork 不 build / 不 ship / 不啟用
  // 這 4 個目錄 + tools/pack 跟我們的腳本路線無關。package.json / pnpm-lock.yaml
  // 仍由 AUTO_FLAG_PATH 抓（FLAG 順序在 PASS 之前），所以依賴變動仍會 flag。
  /^apps\/(desktop|sidecar|sidecar-proto|packaged)\//,
  /^tools\/pack\//,
];

const AUTO_FLAG_PATH = [
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /\/package\.json$/,
  /^\.github\/workflows\//,
  /\.postinstall\.(js|mjs|sh|ps1|cjs)$/i,
  /^\.npmrc$/,
  /^\.yarnrc/,
  /\.env(\..+)?$/,
];

// Content-level red flags scanned per-file diff (best-effort, regex on raw diff text)
const FLAG_CONTENT_RX = [
  /\b(child_process|execSync|spawnSync|spawn\b|exec\b)/,
  /\b(fetch|axios|got|undici)\s*\(\s*['"`]https?:\/\/(?!localhost|127\.0\.0\.1|api\.anthropic\.com|api\.openai\.com|generativelanguage\.googleapis\.com)/i,
  /[A-Za-z_]*[Aa][Pp][Ii][_-]?[Kk][Ee][Yy]/,
  /BEGIN (RSA |OPENSSH )?PRIVATE KEY/,
];

const SAFE_REMOTE = ['upstream', 'origin'];

// ── Git helpers ──

function git(args, opts = {}) {
  const r = spawnSync('git', args, {
    cwd: FORK_ROOT,
    encoding: 'utf8',
    timeout: opts.timeout ?? 60_000,
  });
  if (r.error) throw new Error(`git ${args.join(' ')} error: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} exit ${r.status}: ${r.stderr.trim()}`);
  }
  return r.stdout.trim();
}

function safeGit(args, fallback = '') {
  try { return git(args); } catch { return fallback; }
}

function fetchUpstream() {
  // Confirm 'upstream' remote exists; otherwise this isn't the audited fork.
  const remotes = git(['remote']).split('\n');
  if (!remotes.includes('upstream')) {
    throw new Error("'upstream' remote not configured — set it before running audit");
  }
  git(['fetch', 'upstream', '--quiet'], { timeout: 120_000 });
}

// ── Core audit ──

function buildReport() {
  fetchUpstream();
  const range = 'main..upstream/main';

  const log = safeGit(['log', '--no-merges', '--format=%H%x09%an%x09%s', range]);
  const commits = log
    ? log.split('\n').filter(Boolean).map((line) => {
        const [hash, author, ...rest] = line.split('\t');
        return { hash, author, subject: rest.join('\t') };
      })
    : [];

  const fileLines = safeGit(['diff', '--name-only', range])
    .split('\n').filter(Boolean);

  const buckets = { pass: [], flag: [], review: [], contentFlag: [] };
  for (const f of fileLines) {
    if (AUTO_FLAG_PATH.some((rx) => rx.test(f))) buckets.flag.push(f);
    else if (AUTO_PASS_PATH.some((rx) => rx.test(f))) buckets.pass.push(f);
    else buckets.review.push(f);
  }

  // Content-level scan: only on review + flag bucket (auto-pass already trusted)
  for (const f of [...buckets.review, ...buckets.flag]) {
    const diff = safeGit(['diff', range, '--', f]);
    if (!diff) continue;
    const hits = FLAG_CONTENT_RX
      .filter((rx) => rx.test(diff))
      .map((rx) => rx.source);
    if (hits.length) buckets.contentFlag.push({ file: f, patterns: hits });
  }

  // pnpm-lock.yaml dep summary
  let depSummary = '';
  if (fileLines.includes('pnpm-lock.yaml')) {
    const lockDiff = safeGit(['diff', range, '--', 'pnpm-lock.yaml']);
    const newPkgs = [...lockDiff.matchAll(/^\+\s+'([^']+)':\s*$/gm)]
      .map((m) => m[1])
      .filter((p) => /^\/[^/]+\//.test(p)); // pnpm format /<pkg>/<version>
    depSummary = newPkgs.length
      ? `${newPkgs.length} new lockfile entries (sample: ${newPkgs.slice(0, 5).join(', ')})`
      : 'lockfile changed but no obviously new packages';
  }

  return { commits, buckets, depSummary, range };
}

// ── Protocol e2e harness ──
//
// Runs the raccoonui-namespace contract suite against a live in-process
// daemon. Catches regressions in:
//   - 7 git endpoints (init/status/commit/push/history/rollback) + import-fs
//   - slug validation regex
//   - /api/raccoonui/workflows shape (raigc-bridge)
//   - /api/design-systems contains raccoonai
// See e2e/scripts/raccoonui-protocol.e2e.live.test.ts.

function runProtocolE2e() {
  // `shell: true` so Windows can execute the corepack pnpm shim (`pnpm.cmd`)
  // without us hard-coding a path. POSIX `pnpm` works the same way under a
  // shell. Cron runs in a non-interactive shell so we don't get user PATH
  // augmentation — keep this self-contained.
  const r = spawnSync(
    'pnpm -C e2e run test:e2e:raccoonui-protocol',
    {
      cwd: FORK_ROOT,
      encoding: 'utf8',
      timeout: 5 * 60_000,
      shell: true,
    },
  );
  const combined = (r.stdout || '') + (r.stderr || '');
  // node:test summary lines: "ℹ pass 12" / "ℹ fail 0" / "ℹ tests 12"
  const passMatch = combined.match(/ℹ\s*pass\s+(\d+)/);
  const failMatch = combined.match(/ℹ\s*fail\s+(\d+)/);
  const totalMatch = combined.match(/ℹ\s*tests\s+(\d+)/);
  const pass = passMatch ? Number(passMatch[1]) : null;
  const fail = failMatch ? Number(failMatch[1]) : null;
  const total = totalMatch ? Number(totalMatch[1]) : null;
  // ENOENT / timeout / non-zero exit without summary all count as a hard
  // failure — don't paper over infrastructure issues.
  const ranSuccessfully =
    !r.error && r.status === 0 && pass !== null && fail === 0;
  return {
    ok: ranSuccessfully,
    pass,
    fail,
    total,
    exitCode: r.status,
    error: r.error?.message ?? null,
    output: combined,
  };
}

function buildPatchCatalog() {
  // Match the canonical marker form `RACCOONUI-PATCH:` (colon-suffixed) so we
  // don't grab the .gitignore comment block or doc references that mention the
  // marker conceptually.
  const out = safeGit([
    'grep', '-n', '-F', 'RACCOONUI-PATCH:',
    '--', ':(exclude)audit-logs', ':(exclude)tools/raccoonui',
  ]);
  return out ? out.split('\n').filter(Boolean) : [];
}

// ── Markdown rendering ──

function listMd(arr, formatter = (x) => `\`${x}\``) {
  if (!arr.length) return '_(none)_';
  return arr.map((x) => `- ${formatter(x)}`).join('\n');
}

function renderProtocolSection(e2e) {
  const lines = [];
  lines.push('## 🧪 Protocol E2E Harness');
  lines.push('');
  if (e2e.ok) {
    lines.push(`✅ **${e2e.pass}/${e2e.total} pass** — raccoonui contract surface intact.`);
    lines.push('');
    return lines.join('\n');
  }
  lines.push(`🚨 **Regression: ${e2e.fail ?? '?'}/${e2e.total ?? '?'} fail**, exit=${e2e.exitCode}`);
  if (e2e.error) lines.push(`Error: \`${e2e.error}\``);
  lines.push('');
  lines.push('<details><summary>Failing tests + last output</summary>');
  lines.push('');
  lines.push('```');
  // Trim to last 80 lines so the report doesn't balloon — full output
  // streams to cron stderr anyway.
  const tail = e2e.output.split('\n').slice(-80).join('\n');
  lines.push(tail);
  lines.push('```');
  lines.push('');
  lines.push('</details>');
  lines.push('');
  return lines.join('\n');
}

function renderReport({ commits, buckets, depSummary, range }, patches, e2e) {
  const lines = [];
  lines.push(`# Upstream Audit — ${TODAY}`);
  lines.push('');
  lines.push(`**Range**: \`${range}\``);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Commits ahead in upstream: **${commits.length}**`);
  lines.push(`- Files: pass=${buckets.pass.length}, flag=${buckets.flag.length}, review=${buckets.review.length}, content-flag=${buckets.contentFlag.length}`);
  if (depSummary) lines.push(`- Dep diff: ${depSummary}`);
  lines.push('');

  if (commits.length) {
    lines.push('## Commits');
    lines.push('');
    for (const c of commits) {
      lines.push(`- \`${c.hash.slice(0, 8)}\` *${c.author}* — ${c.subject}`);
    }
    lines.push('');
  }

  if (buckets.flag.length) {
    lines.push('## 🚨 Auto-Flagged Paths (review required)');
    lines.push('');
    lines.push(listMd(buckets.flag));
    lines.push('');
  }

  if (buckets.contentFlag.length) {
    lines.push('## 🚨 Suspicious Diff Content');
    lines.push('');
    for (const item of buckets.contentFlag) {
      lines.push(`- \`${item.file}\``);
      for (const p of item.patterns) {
        lines.push(`  - matched: \`${p}\``);
      }
    }
    lines.push('');
  }

  if (buckets.review.length) {
    lines.push('## 🟡 Review Bucket');
    lines.push('');
    lines.push(listMd(buckets.review));
    lines.push('');
  }

  if (buckets.pass.length) {
    lines.push('## ✅ Auto-Pass');
    lines.push('');
    lines.push(`<details><summary>${buckets.pass.length} files</summary>`);
    lines.push('');
    lines.push(listMd(buckets.pass));
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('## Fork Patch Catalog');
  lines.push('');
  lines.push(`Total RACCOONUI-PATCH locations: **${patches.length}**`);
  lines.push('');
  if (patches.length) {
    lines.push('See `audit-logs/PATCHES.md` for the live catalog.');
    lines.push('');
  }

  lines.push(renderProtocolSection(e2e));

  lines.push('## Recommended Action');
  lines.push('');
  const blocked =
    buckets.flag.length > 0 || buckets.contentFlag.length > 0 || !e2e.ok;
  if (commits.length === 0 && e2e.ok) {
    lines.push('Nothing to do — local already at upstream, contracts green.');
  } else if (blocked) {
    lines.push('⚠️ **Manual review required** before `git merge upstream/main`.');
    if (!e2e.ok) {
      lines.push('Protocol e2e harness regressed — fix raccoonui namespace before merging.');
    }
    if (buckets.flag.length > 0 || buckets.contentFlag.length > 0) {
      lines.push('Inspect flagged paths + suspicious diffs. Cherry-pick safe commits if needed.');
    }
  } else {
    lines.push('✅ Safe to merge:');
    lines.push('');
    lines.push('```bash');
    lines.push('git fetch upstream');
    lines.push('git merge upstream/main');
    lines.push('git push origin main');
    lines.push('```');
  }
  lines.push('');

  return { md: lines.join('\n'), blocked };
}

function renderPatchCatalog(patches) {
  const lines = [];
  lines.push(`# RACCOONUI-PATCH Catalog`);
  lines.push('');
  lines.push(`_Auto-generated by tools/raccoonui/upstream-audit.mjs on ${TODAY}._`);
  lines.push('');
  lines.push(`Total: **${patches.length}** patch points across the fork.`);
  lines.push('');
  if (patches.length) {
    lines.push('| Location | Note |');
    lines.push('|---|---|');
    for (const p of patches) {
      const idx = p.indexOf(':');
      const idx2 = p.indexOf(':', idx + 1);
      const loc = p.slice(0, idx2);
      const noteIdx = p.indexOf('RACCOONUI-PATCH:');
      const note = noteIdx >= 0
        ? p.slice(noteIdx + 'RACCOONUI-PATCH:'.length).trim()
        : p.slice(idx2 + 1).trim();
      lines.push(`| \`${loc}\` | ${note.replace(/\|/g, '\\|')} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

// ── Slack summary (stdout for cron) ──

function renderSlackSummary({ commits, buckets, depSummary }, blocked, e2e) {
  const e2eLine = e2e.ok
    ? `🧪 e2e: ${e2e.pass}/${e2e.total} pass`
    : `🚨 e2e: ${e2e.fail ?? '?'}/${e2e.total ?? '?'} fail (exit=${e2e.exitCode})`;
  if (commits.length === 0) {
    const icon = e2e.ok ? '🟢' : '🚨';
    return `${icon} *Upstream Audit ${TODAY}* — 0 commits ahead\n${e2eLine}`;
  }
  const icon = blocked ? '🚨' : '✅';
  const lines = [];
  lines.push(`${icon} *Upstream Audit ${TODAY}* — ${commits.length} commits ahead`);
  lines.push(`Files: pass=${buckets.pass.length} flag=${buckets.flag.length} review=${buckets.review.length} content-flag=${buckets.contentFlag.length}`);
  lines.push(e2eLine);
  if (depSummary) lines.push(`📦 ${depSummary}`);
  if (blocked) {
    lines.push(`*Manual review:*`);
    const top = [...buckets.flag, ...buckets.contentFlag.map((c) => c.file)].slice(0, 5);
    for (const f of top) lines.push(`  • \`${f}\``);
    const more = buckets.flag.length + buckets.contentFlag.length - top.length;
    if (more > 0) lines.push(`  • _(+${more} more)_`);
    if (!e2e.ok) lines.push(`  • raccoonui protocol regression → see audit-logs/${TODAY}.md`);
  }
  lines.push(`📄 Report: \`audit-logs/${TODAY}.md\``);
  return lines.join('\n');
}

// ── Main ──

try {
  mkdirSync(AUDIT_DIR, { recursive: true });
  const data = buildReport();
  const patches = buildPatchCatalog();
  // Protocol e2e is the only step that can take >1 min (rebuilds daemon
  // dist before running). Run after the audit so a hung e2e doesn't block
  // the human-readable diff section from being captured.
  const e2e = runProtocolE2e();
  const { md, blocked } = renderReport(data, patches, e2e);

  writeFileSync(resolve(AUDIT_DIR, `${TODAY}.md`), md);
  writeFileSync(resolve(AUDIT_DIR, 'PATCHES.md'), renderPatchCatalog(patches));

  // stdout → cron picks up → Slack
  console.log(renderSlackSummary(data, blocked, e2e));
  process.exit(0);
} catch (err) {
  console.error(`❌ Upstream audit failed: ${err.message}`);
  console.log(`❌ *Upstream Audit ${TODAY}* failed: ${err.message}`);
  process.exit(0); // don't crash cron loop
}
