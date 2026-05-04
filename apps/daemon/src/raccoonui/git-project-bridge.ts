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
  const sidecar: ProjectMetadataSidecar = {
    schemaVersion: SCHEMA_VERSION,
    id: project.id,
    name: project.name,
    skillId: project.skillId,
    designSystemId: project.designSystemId,
    pendingPrompt: project.pendingPrompt,
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
