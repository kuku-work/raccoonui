// Project / conversation / message / tab persistence — backed by the
// daemon's SQLite store. All writes round-trip through HTTP so projects
// stay coherent across multiple browser tabs and across restarts.
//
// These helpers fail soft (returning null / [] on transport errors) so
// the UI can stay rendered when the daemon is briefly unreachable.

import type { ImportFolderRequest, ImportFolderResponse } from '@open-design/contracts';
import { randomUUID } from '../utils/uuid';
import type {
  ChatMessage,
  Conversation,
  OpenTabsState,
  Project,
  ProjectMetadata,
  ProjectTemplate,
} from '../types';
import type {
  GitCommitResponse,
  GitCreateRemoteResponse,
  GitHistoryResponse,
  GitInitResponse,
  GitLogEntry,
  GitPushResponse,
  GitRemoteVisibility,
  GitRollbackMode,
  GitRollbackResponse,
  GitStatusResponse,
  ImportFsResponse,
} from '@open-design/contracts';

export async function listProjects(): Promise<Project[]> {
  try {
    const resp = await fetch('/api/projects');
    if (!resp.ok) return [];
    const json = (await resp.json()) as { projects: Project[] };
    return json.projects ?? [];
  } catch {
    return [];
  }
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(id)}`);
    if (!resp.ok) return null;
    const json = (await resp.json()) as { project: Project };
    return json.project;
  } catch {
    return null;
  }
}

export async function createProject(input: {
  name: string;
  // Optional explicit slug-style id (`^[A-Za-z0-9._-]{1,128}$`). When
  // omitted, falls back to crypto.randomUUID() for backwards compat with
  // the upstream UI flow that auto-generates ids.
  id?: string;
  skillId: string | null;
  designSystemId: string | null;
  pendingPrompt?: string;
  metadata?: ProjectMetadata;
}): Promise<{ project: Project; conversationId: string } | null> {
  try {
    // `randomUUID` (the helper) falls back to `crypto.getRandomValues` /
    // `Math.random` when `crypto.randomUUID` is unavailable — Open Design
    // served over plain HTTP on a LAN IP (Docker / unRAID self-hosting)
    // is a non-secure context, where `crypto.randomUUID` is undefined and
    // calling it directly throws (issue #849). When the caller passes an
    // explicit slug (`^[A-Za-z0-9._-]{1,128}$`) we honor it so the
    // raccoonui per-project git workflow can use stable folder names.
    const id = input.id?.trim() ? input.id.trim() : randomUUID();
    const { id: _ignored, ...rest } = input;
    const resp = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...rest }),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as { project: Project; conversationId: string };
  } catch {
    return null;
  }
}

export async function importFolderProject(
  input: ImportFolderRequest,
): Promise<ImportFolderResponse | null> {
  try {
    const resp = await fetch('/api/import/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as ImportFolderResponse;
  } catch {
    return null;
  }
}

export async function importClaudeDesignZip(
  file: File,
): Promise<{ project: Project; conversationId: string; entryFile: string } | null> {
  try {
    const form = new FormData();
    form.append('file', file);
    const resp = await fetch('/api/import/claude-design', {
      method: 'POST',
      body: form,
    });
    if (!resp.ok) return null;
    return (await resp.json()) as {
      project: Project;
      conversationId: string;
      entryFile: string;
    };
  } catch {
    return null;
  }
}

// ---------- templates ----------

export async function listTemplates(): Promise<ProjectTemplate[]> {
  try {
    const resp = await fetch('/api/templates');
    if (!resp.ok) return [];
    const json = (await resp.json()) as { templates: ProjectTemplate[] };
    return json.templates ?? [];
  } catch {
    return [];
  }
}

export async function getTemplate(id: string): Promise<ProjectTemplate | null> {
  try {
    const resp = await fetch(`/api/templates/${encodeURIComponent(id)}`);
    if (!resp.ok) return null;
    const json = (await resp.json()) as { template: ProjectTemplate };
    return json.template;
  } catch {
    return null;
  }
}

export async function saveTemplate(input: {
  name: string;
  description?: string;
  sourceProjectId: string;
}): Promise<ProjectTemplate | null> {
  try {
    const resp = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { template: ProjectTemplate };
    return json.template;
  } catch {
    return null;
  }
}

export async function deleteTemplate(id: string): Promise<boolean> {
  try {
    const resp = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function patchProject(
  id: string,
  patch: Partial<Project>,
): Promise<Project | null> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { project: Project };
    return json.project;
  } catch {
    return null;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const resp = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// ---------- conversations ----------

export async function listConversations(
  projectId: string,
): Promise<Conversation[]> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations`,
    );
    if (!resp.ok) return [];
    const json = (await resp.json()) as { conversations: Conversation[] };
    return json.conversations ?? [];
  } catch {
    return [];
  }
}

export async function createConversation(
  projectId: string,
  title?: string,
): Promise<Conversation | null> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      },
    );
    if (!resp.ok) return null;
    const json = (await resp.json()) as { conversation: Conversation };
    return json.conversation;
  } catch {
    return null;
  }
}

export async function patchConversation(
  projectId: string,
  conversationId: string,
  patch: Partial<Conversation>,
): Promise<Conversation | null> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(conversationId)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      },
    );
    if (!resp.ok) return null;
    const json = (await resp.json()) as { conversation: Conversation };
    return json.conversation;
  } catch {
    return null;
  }
}

export async function deleteConversation(
  projectId: string,
  conversationId: string,
): Promise<boolean> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(conversationId)}`,
      { method: 'DELETE' },
    );
    return resp.ok;
  } catch {
    return false;
  }
}

// ---------- messages ----------

export async function listMessages(
  projectId: string,
  conversationId: string,
): Promise<ChatMessage[]> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(conversationId)}/messages`,
    );
    if (!resp.ok) return [];
    const json = (await resp.json()) as { messages: ChatMessage[] };
    return json.messages ?? [];
  } catch {
    return [];
  }
}

export async function saveMessage(
  projectId: string,
  conversationId: string,
  message: ChatMessage,
): Promise<void> {
  try {
    await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(message.id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      },
    );
  } catch {
    // best-effort persistence — UI keeps the message in-memory either way
  }
}

// ---------- tabs ----------

export async function loadTabs(projectId: string): Promise<OpenTabsState> {
  try {
    const resp = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}/tabs`,
    );
    if (!resp.ok) return { tabs: [], active: null };
    return (await resp.json()) as OpenTabsState;
  } catch {
    return { tabs: [], active: null };
  }
}

export async function saveTabs(
  projectId: string,
  state: OpenTabsState,
): Promise<void> {
  try {
    await fetch(`/api/projects/${encodeURIComponent(projectId)}/tabs`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch {
    // best-effort
  }
}

// ---------- per-project git ops ----------
//
// Mirror of the daemon's `/api/raccoonui/projects/:id/git/*` endpoints.
// All wrappers follow the same fail-soft contract as the rest of this
// module — null on transport error, daemon-shaped JSON on success.

const gitUrl = (projectId: string, op: string) =>
  `/api/raccoonui/projects/${encodeURIComponent(projectId)}/git/${op}`;

export async function gitInit(
  projectId: string,
): Promise<GitInitResponse | null> {
  try {
    const resp = await fetch(gitUrl(projectId, 'init'), { method: 'POST' });
    if (!resp.ok) return null;
    return (await resp.json()) as GitInitResponse;
  } catch {
    return null;
  }
}

export async function gitStatus(
  projectId: string,
): Promise<GitStatusResponse | null> {
  try {
    const resp = await fetch(gitUrl(projectId, 'status'));
    if (!resp.ok) return null;
    return (await resp.json()) as GitStatusResponse;
  } catch {
    return null;
  }
}

export async function gitCommit(
  projectId: string,
  message: string,
): Promise<GitCommitResponse | null> {
  try {
    const resp = await fetch(gitUrl(projectId, 'commit'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as GitCommitResponse;
  } catch {
    return null;
  }
}

export async function gitPush(
  projectId: string,
  opts: { remote?: string; branch?: string } = {},
): Promise<GitPushResponse | null> {
  try {
    const resp = await fetch(gitUrl(projectId, 'push'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as GitPushResponse;
  } catch {
    return null;
  }
}

export async function gitHistory(
  projectId: string,
  limit = 20,
): Promise<GitLogEntry[]> {
  try {
    const resp = await fetch(
      `${gitUrl(projectId, 'history')}?limit=${encodeURIComponent(String(limit))}`,
    );
    if (!resp.ok) return [];
    const json = (await resp.json()) as GitHistoryResponse;
    return json.history ?? [];
  } catch {
    return [];
  }
}

export async function gitRollback(
  projectId: string,
  commit: string,
  mode: GitRollbackMode = 'revert',
): Promise<GitRollbackResponse | null> {
  try {
    const resp = await fetch(gitUrl(projectId, 'rollback'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commit, mode }),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as GitRollbackResponse;
  } catch {
    return null;
  }
}

// Distinct error shape so the UI can branch on missing-gh vs missing-auth
// vs everything-else and render the right install / `gh auth login`
// instructions instead of a generic "something went wrong".
export type GitCreateRemoteError =
  | { kind: 'GH_NOT_INSTALLED'; message: string }
  | { kind: 'GH_NOT_AUTHENTICATED'; message: string }
  | { kind: 'GH_API_FAILED'; message: string }
  | { kind: 'OTHER'; message: string };

export async function gitCreateRemote(
  projectId: string,
  visibility: GitRemoteVisibility,
): Promise<GitCreateRemoteResponse | { error: GitCreateRemoteError }> {
  try {
    const resp = await fetch(gitUrl(projectId, 'create-remote'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
    });
    if (resp.ok) {
      return (await resp.json()) as GitCreateRemoteResponse;
    }
    const body = (await resp.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };
    const code = body.error?.code;
    const message = body.error?.message ?? `HTTP ${resp.status}`;
    if (code === 'GH_NOT_INSTALLED' || code === 'GH_NOT_AUTHENTICATED' || code === 'GH_API_FAILED') {
      return { error: { kind: code, message } };
    }
    return { error: { kind: 'OTHER', message } };
  } catch (err) {
    return { error: { kind: 'OTHER', message: String(err) } };
  }
}

export async function gitImportFs(): Promise<ImportFsResponse | null> {
  try {
    const resp = await fetch('/api/raccoonui/projects/import-fs', {
      method: 'POST',
    });
    if (!resp.ok) return null;
    return (await resp.json()) as ImportFsResponse;
  } catch {
    return null;
  }
}
