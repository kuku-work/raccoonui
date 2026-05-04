// @ts-nocheck
// RACCOONUI-PATCH: git-friendly project metadata bridge — 2026-05-04
//
// Mirrors SQLite project rows into a `.raccoonui-project.json` sidecar
// inside each project directory so coworkers cloning a project via git
// can reconstruct their local DB row (project name, skill, design system,
// etc.). Without this, a coworker who git clones a project sees the files
// but their picker shows nothing — the local SQLite has no row for it.
//
// Flow:
//   1. POST/PATCH /api/projects → writeProjectMetadata syncs sidecar
//   2. Daemon startup → scanProjectsForImport finds sidecars whose id is
//      not in DB, caller inserts the row
//   3. listFiles already filters dotfiles (.raccoonui-project.json starts
//      with '.') so users never see the sidecar in the UI
//
// SQLite remains the daemon's source of truth at runtime; the sidecar is
// a deterministic mirror written on every metadata change. Filesystem is
// the source of truth across machines (because git syncs filesystem, not
// SQLite).

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const PROJECT_METADATA_FILE = '.raccoonui-project.json';
const SCHEMA_VERSION = 1;

export interface ProjectRow {
  id: string;
  name: string;
  skillId: string | null;
  designSystemId: string | null;
  pendingPrompt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMetadataSidecar {
  schemaVersion: 1;
  id: string;
  name: string;
  skillId: string | null;
  designSystemId: string | null;
  pendingPrompt: string | null;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

function metadataPath(projectsDir: string, projectId: string): string {
  return path.join(projectsDir, projectId, PROJECT_METADATA_FILE);
}

/**
 * Mirror a project DB row to its filesystem sidecar. Creates the project
 * directory if missing so the sidecar is always co-located. Best-effort:
 * caller should not block on metadata write failures (DB row is the
 * runtime source of truth — sidecar gets retried on next update).
 */
export async function writeProjectMetadata(
  projectsDir: string,
  project: ProjectRow,
): Promise<void> {
  const projectDir = path.join(projectsDir, project.id);
  await fs.promises.mkdir(projectDir, { recursive: true });
  // Coerce undefined → null for nullable fields so the JSON output is
  // schema-stable (JSON.stringify drops undefined values, which would
  // make the sidecar shape non-deterministic across DB columns that
  // happen to be null vs missing).
  const sidecar: ProjectMetadataSidecar = {
    schemaVersion: SCHEMA_VERSION,
    id: project.id,
    name: project.name,
    skillId: project.skillId ?? null,
    designSystemId: project.designSystemId ?? null,
    pendingPrompt: project.pendingPrompt ?? null,
    metadata: project.metadata ?? {},
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  const dst = metadataPath(projectsDir, project.id);
  await fs.promises.writeFile(
    dst,
    JSON.stringify(sidecar, null, 2) + '\n',
    'utf8',
  );
}

/**
 * Read a project's metadata sidecar. Returns null if absent or malformed
 * (caller should fall back to DB lookup).
 */
export async function readProjectMetadata(
  projectsDir: string,
  projectId: string,
): Promise<ProjectMetadataSidecar | null> {
  const src = metadataPath(projectsDir, projectId);
  let raw: string;
  try {
    raw = await fs.promises.readFile(src, 'utf8');
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.id !== 'string' ||
      typeof parsed.name !== 'string'
    ) {
      return null;
    }
    return parsed as ProjectMetadataSidecar;
  } catch {
    return null;
  }
}

/**
 * Find project directories that have a metadata sidecar but whose id is
 * not in `existingIds`. Used at daemon startup and via the /api/raccoonui
 * /projects/import-fs endpoint to pick up projects pulled in via git but
 * not yet in the local SQLite.
 *
 * Skips dirs where sidecar id mismatches dir name — that signals manual
 * meddling and is unsafe to import without review.
 */
export async function scanProjectsForImport(
  projectsDir: string,
  existingIds: ReadonlySet<string>,
): Promise<ProjectMetadataSidecar[]> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(projectsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: ProjectMetadataSidecar[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (existingIds.has(entry.name)) continue;
    const sidecar = await readProjectMetadata(projectsDir, entry.name);
    if (sidecar && sidecar.id === entry.name) {
      found.push(sidecar);
    }
  }
  return found;
}

// ----- Git operations ------------------------------------------------------
//
// All git ops shell out to the user's `git` binary. We deliberately avoid
// nodegit / isomorphic-git: that is native dep + maintenance burden for
// what amounts to "wrap commands every dev already understands". The
// trade-off is requiring `git` on PATH (already required for raccoonui
// itself).
//
// Auth model: gh CLI / git credential helper / SSH keys are all owned by
// the user — daemon does not store secrets, so push to the user's own
// GitHub account works as long as their shell can already push.

export interface GitResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runGit(
  projectDir: string,
  args: string[],
): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execFileP('git', args, {
      cwd: projectDir,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message ?? '',
      exitCode: typeof err.code === 'number' ? err.code : 1,
    };
  }
}

const DEFAULT_GITIGNORE = `# Auto-generated by raccoonui git-init
# DO NOT remove the next line — coworkers need it to import this project.
!.raccoonui-project.json

# Common transient outputs
*.tmp
*.log
node_modules/
__pycache__/
.DS_Store
`;

export async function gitIsInitialized(projectDir: string): Promise<boolean> {
  try {
    await fs.promises.access(path.join(projectDir, '.git'), fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize a git repo in the project dir. Idempotent — if .git already
 * exists this is a no-op that returns { alreadyInitialized: true }.
 *
 * Sets project-local user.name/email so `git commit` works without forcing
 * the user to set global git config (we use raccoonui defaults but they
 * can override later via `git config` inside the project dir).
 */
export async function gitInit(
  projectDir: string,
): Promise<{
  alreadyInitialized: boolean;
  initialCommit: string | null;
}> {
  if (await gitIsInitialized(projectDir)) {
    return { alreadyInitialized: true, initialCommit: null };
  }
  const init = await runGit(projectDir, ['init', '-b', 'main']);
  if (init.exitCode !== 0) {
    throw new Error(`git init failed: ${init.stderr}`);
  }
  // Project-local fallback identity (user can override later).
  await runGit(projectDir, ['config', 'user.name', 'raccoonui']);
  await runGit(projectDir, ['config', 'user.email', 'raccoonui@local']);
  // Drop a sensible default .gitignore if there isn't one already.
  const gitignorePath = path.join(projectDir, '.gitignore');
  try {
    await fs.promises.access(gitignorePath, fs.constants.F_OK);
  } catch {
    await fs.promises.writeFile(gitignorePath, DEFAULT_GITIGNORE, 'utf8');
  }
  await runGit(projectDir, ['add', '.']);
  const commit = await runGit(projectDir, [
    'commit',
    '-m',
    'init: raccoonui project snapshot',
  ]);
  if (commit.exitCode !== 0) {
    throw new Error(`initial git commit failed: ${commit.stderr}`);
  }
  const head = await runGit(projectDir, ['rev-parse', 'HEAD']);
  return {
    alreadyInitialized: false,
    initialCommit: head.exitCode === 0 ? head.stdout.trim() : null,
  };
}

export interface GitStatusEntry {
  path: string;
  index: string;
  worktree: string;
}

export async function gitStatus(
  projectDir: string,
): Promise<{
  initialized: boolean;
  branch: string | null;
  entries: GitStatusEntry[];
  hasRemote: boolean;
}> {
  if (!(await gitIsInitialized(projectDir))) {
    return { initialized: false, branch: null, entries: [], hasRemote: false };
  }
  const [statusRes, branchRes, remoteRes] = await Promise.all([
    runGit(projectDir, ['status', '--porcelain']),
    runGit(projectDir, ['rev-parse', '--abbrev-ref', 'HEAD']),
    runGit(projectDir, ['remote']),
  ]);
  const entries: GitStatusEntry[] = [];
  for (const line of statusRes.stdout.split('\n')) {
    if (!line.trim()) continue;
    // porcelain v1 format: "XY path"
    const index = line.charAt(0);
    const worktree = line.charAt(1);
    const filePath = line.slice(3);
    entries.push({ path: filePath, index, worktree });
  }
  return {
    initialized: true,
    branch: branchRes.exitCode === 0 ? branchRes.stdout.trim() : null,
    entries,
    hasRemote: remoteRes.exitCode === 0 && remoteRes.stdout.trim().length > 0,
  };
}

export async function gitCommit(
  projectDir: string,
  message: string,
): Promise<{
  committed: boolean;
  reason?: string;
  commitHash?: string;
}> {
  if (!(await gitIsInitialized(projectDir))) {
    throw new Error('git not initialized — call git/init first');
  }
  await runGit(projectDir, ['add', '.']);
  // Detect "nothing to commit" early so we can return a clean structured
  // response instead of leaning on git's exit code.
  const diff = await runGit(projectDir, ['diff', '--cached', '--quiet']);
  if (diff.exitCode === 0) {
    return { committed: false, reason: 'nothing to commit' };
  }
  const commit = await runGit(projectDir, ['commit', '-m', message]);
  if (commit.exitCode !== 0) {
    throw new Error(`git commit failed: ${commit.stderr}`);
  }
  const head = await runGit(projectDir, ['rev-parse', 'HEAD']);
  return {
    committed: true,
    commitHash: head.exitCode === 0 ? head.stdout.trim() : undefined,
  };
}

export async function gitPush(
  projectDir: string,
  opts: { remote?: string; branch?: string } = {},
): Promise<{ pushed: boolean; remote: string; branch: string; output: string }> {
  if (!(await gitIsInitialized(projectDir))) {
    throw new Error('git not initialized');
  }
  const remote = opts.remote || 'origin';
  const branch = opts.branch || 'main';
  // Verify remote exists before attempting push so we can error early with
  // a clearer message than "fatal: 'origin' does not appear to be a git
  // repository".
  const remotes = await runGit(projectDir, ['remote']);
  if (!remotes.stdout.split('\n').some((r) => r.trim() === remote)) {
    throw new Error(
      `remote '${remote}' not configured — run: git -C <project-dir> remote add ${remote} <url>`,
    );
  }
  const push = await runGit(projectDir, ['push', '-u', remote, branch]);
  if (push.exitCode !== 0) {
    throw new Error(`git push failed: ${push.stderr || push.stdout}`);
  }
  return {
    pushed: true,
    remote,
    branch,
    output: (push.stdout || '') + (push.stderr || ''),
  };
}

export interface GitLogEntry {
  hash: string;
  shortHash: string;
  date: string;
  author: string;
  message: string;
}

export async function gitHistory(
  projectDir: string,
  limit = 20,
): Promise<GitLogEntry[]> {
  if (!(await gitIsInitialized(projectDir))) return [];
  const FIELD = String.fromCharCode(0x1f); // ASCII Unit Separator — won't appear in commit subjects/authors
  const fmt = `%H${FIELD}%h${FIELD}%aI${FIELD}%an${FIELD}%s`;
  const log = await runGit(projectDir, [
    'log',
    `-n${limit}`,
    `--pretty=format:${fmt}`,
  ]);
  if (log.exitCode !== 0) return [];
  const entries: GitLogEntry[] = [];
  for (const line of log.stdout.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split(FIELD);
    if (parts.length < 5) continue;
    entries.push({
      hash: parts[0],
      shortHash: parts[1],
      date: parts[2],
      author: parts[3],
      message: parts.slice(4).join(FIELD),
    });
  }
  return entries;
}

/**
 * Roll back to a previous commit. Two modes:
 *   - 'revert' (default, safe): adds a new commit that inverses the target.
 *     Preserves history; safe when the project is shared with coworkers.
 *   - 'reset': hard reset to the target commit. Discards uncommitted
 *     changes AND rewrites history — only use for local cleanup.
 */
export async function gitRollback(
  projectDir: string,
  commit: string,
  mode: 'revert' | 'reset' = 'revert',
): Promise<{ mode: 'revert' | 'reset'; output: string }> {
  if (!(await gitIsInitialized(projectDir))) {
    throw new Error('git not initialized');
  }
  if (!/^[0-9a-fA-F]{4,40}$|^HEAD(~\d+)?$/.test(commit)) {
    throw new Error(`invalid commit reference: ${commit}`);
  }
  if (mode === 'reset') {
    const reset = await runGit(projectDir, ['reset', '--hard', commit]);
    if (reset.exitCode !== 0) {
      throw new Error(`git reset failed: ${reset.stderr}`);
    }
    return { mode, output: reset.stdout + reset.stderr };
  }
  // revert mode — single commit, no editor.
  const revert = await runGit(projectDir, [
    'revert',
    '--no-edit',
    commit,
  ]);
  if (revert.exitCode !== 0) {
    throw new Error(`git revert failed: ${revert.stderr}`);
  }
  return { mode, output: revert.stdout + revert.stderr };
}
