// RACCOONUI-PATCH: per-project git workflow UI — 2026-05-04
//
// Drives the daemon's `/api/raccoonui/projects/:id/git/*` endpoints from
// inside the Settings dialog. Operates on the project the user currently
// has open; if no project is active, only the cross-project import-fs
// action is exposed.

import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import {
  gitCommit,
  gitCreateRemote,
  gitHistory,
  gitImportFs,
  gitInit,
  gitPush,
  gitRollback,
  gitStatus,
} from '../state/projects';
import type {
  GitLogEntry,
  GitRemoteVisibility,
  GitStatusResponse,
} from '@open-design/contracts';

interface Props {
  currentProjectId: string | null | undefined;
}

type Busy =
  | 'init'
  | 'commit'
  | 'push'
  | 'create-remote'
  | 'rollback'
  | 'import-fs'
  | null;

type Feedback =
  | { kind: 'ok'; text: string }
  | { kind: 'err'; text: string }
  | { kind: 'install-gh'; text: string }
  | { kind: 'auth-gh'; text: string };

export function ProjectGitSection({ currentProjectId }: Props) {
  const t = useT();
  const [status, setStatus] = useState<GitStatusResponse | null>(null);
  const [history, setHistory] = useState<GitLogEntry[]>([]);
  const [commitMsg, setCommitMsg] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [visibility, setVisibility] = useState<GitRemoteVisibility>('private');

  useEffect(() => {
    if (!currentProjectId) {
      setStatus(null);
      setHistory([]);
      setFeedback(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [s, h] = await Promise.all([
        gitStatus(currentProjectId),
        gitHistory(currentProjectId, 20),
      ]);
      if (cancelled) return;
      setStatus(s);
      setHistory(h);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentProjectId]);

  async function refresh(projectId: string) {
    const [s, h] = await Promise.all([
      gitStatus(projectId),
      gitHistory(projectId, 20),
    ]);
    setStatus(s);
    setHistory(h);
  }

  async function onInit() {
    if (!currentProjectId || busy) return;
    setBusy('init');
    setFeedback(null);
    const r = await gitInit(currentProjectId);
    if (!r) {
      setFeedback({ kind: 'err', text: t('projectGit.errInit') });
    } else {
      await refresh(currentProjectId);
    }
    setBusy(null);
  }

  async function onCommit() {
    if (!currentProjectId || busy) return;
    const msg = commitMsg.trim();
    if (!msg) return;
    setBusy('commit');
    setFeedback(null);
    const r = await gitCommit(currentProjectId, msg);
    if (!r) {
      setFeedback({ kind: 'err', text: t('projectGit.errCommit') });
    } else if (!r.committed) {
      setFeedback({ kind: 'ok', text: t('projectGit.commitNothing') });
    } else {
      setFeedback({
        kind: 'ok',
        text: t('projectGit.commitDone', {
          hash: r.commitHash ? r.commitHash.slice(0, 7) : '?',
        }),
      });
      setCommitMsg('');
      await refresh(currentProjectId);
    }
    setBusy(null);
  }

  async function onCreateRemote() {
    if (!currentProjectId || busy) return;
    setBusy('create-remote');
    setFeedback(null);
    const r = await gitCreateRemote(currentProjectId, visibility);
    if ('error' in r) {
      // Render gh-specific guidance so the user knows the next concrete
      // step (install / re-login) instead of staring at a generic error.
      if (r.error.kind === 'GH_NOT_INSTALLED') {
        setFeedback({ kind: 'install-gh', text: t('projectGit.errGhNotInstalled') });
      } else if (r.error.kind === 'GH_NOT_AUTHENTICATED') {
        setFeedback({ kind: 'auth-gh', text: t('projectGit.errGhNotAuthed') });
      } else {
        setFeedback({
          kind: 'err',
          text: t('projectGit.errCreateRemote', { detail: r.error.message }),
        });
      }
    } else {
      setFeedback({
        kind: 'ok',
        text: r.alreadyExisted
          ? t('projectGit.createRemoteExisted', { url: r.repoUrl })
          : t('projectGit.createRemoteDone', { url: r.repoUrl }),
      });
      await refresh(currentProjectId);
    }
    setBusy(null);
  }

  async function onPush() {
    if (!currentProjectId || busy) return;
    setBusy('push');
    setFeedback(null);
    const r = await gitPush(currentProjectId);
    if (!r || !r.pushed) {
      setFeedback({ kind: 'err', text: t('projectGit.errPush') });
    } else {
      setFeedback({
        kind: 'ok',
        text: t('projectGit.pushDone', { remote: r.remote, branch: r.branch }),
      });
    }
    setBusy(null);
  }

  async function onRollback(commitHash: string) {
    if (!currentProjectId || busy) return;
    const confirmed = window.confirm(
      t('projectGit.rollbackConfirm', { hash: commitHash.slice(0, 7) }),
    );
    if (!confirmed) return;
    setBusy('rollback');
    setFeedback(null);
    const r = await gitRollback(currentProjectId, commitHash, 'revert');
    if (!r) {
      setFeedback({ kind: 'err', text: t('projectGit.errRollback') });
    } else {
      setFeedback({ kind: 'ok', text: t('projectGit.rollbackDone') });
      await refresh(currentProjectId);
    }
    setBusy(null);
  }

  async function onImportFs() {
    if (busy) return;
    setBusy('import-fs');
    setFeedback(null);
    const r = await gitImportFs();
    if (!r) {
      setFeedback({ kind: 'err', text: t('projectGit.errImportFs') });
    } else {
      const importedCount = r.imported.length;
      // Failures aren't fatal — log so devs can see what skipped, but
      // don't block the OK feedback for the rows that did import.
      if (r.failed.length > 0) {
        console.warn('import-fs partial failures:', r.failed);
      }
      setFeedback({
        kind: 'ok',
        text: t('projectGit.importFsDone', { count: importedCount }),
      });
    }
    setBusy(null);
  }

  return (
    <section className="settings-section project-git-section">
      <div className="section-head">
        <div>
          <h3>{t('projectGit.title')}</h3>
          <p className="hint">{t('projectGit.subtitle')}</p>
        </div>
        <button
          type="button"
          className="ghost"
          disabled={busy === 'import-fs'}
          onClick={onImportFs}
          title={t('projectGit.importFsBtnHint')}
        >
          {busy === 'import-fs'
            ? t('projectGit.busyImportFs')
            : t('projectGit.importFsBtn')}
        </button>
      </div>

      {feedback ? (
        <div
          className={`project-git-feedback ${feedback.kind === 'install-gh' || feedback.kind === 'auth-gh' ? 'err' : feedback.kind}`}
          data-testid="project-git-feedback"
        >
          <span>{feedback.text}</span>
          {feedback.kind === 'install-gh' ? (
            <a
              href="https://cli.github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="project-git-help-link"
            >
              cli.github.com
            </a>
          ) : null}
          {feedback.kind === 'auth-gh' ? (
            <code className="project-git-help-cmd">gh auth login</code>
          ) : null}
        </div>
      ) : null}

      {!currentProjectId ? (
        <div className="empty-card">{t('projectGit.noProject')}</div>
      ) : !status?.initialized ? (
        <div className="project-git-uninit">
          <p>{t('projectGit.uninitialized')}</p>
          <button
            type="button"
            className="primary"
            disabled={busy === 'init'}
            onClick={onInit}
          >
            {busy === 'init'
              ? t('projectGit.busyInit')
              : t('projectGit.initBtn')}
          </button>
        </div>
      ) : (
        <>
          <dl className="project-git-status">
            <div>
              <dt>{t('projectGit.statusBranch')}</dt>
              <dd>
                <code>{status.branch ?? '?'}</code>
              </dd>
            </div>
            <div>
              <dt>{t('projectGit.statusClean')}</dt>
              <dd>
                {status.entries.length === 0
                  ? t('projectGit.statusClean')
                  : t('projectGit.statusDirty', {
                      count: status.entries.length,
                    })}
              </dd>
            </div>
            <div>
              <dt>Remote</dt>
              <dd>
                {status.hasRemote
                  ? t('projectGit.statusHasRemote')
                  : t('projectGit.statusNoRemote')}
              </dd>
            </div>
          </dl>

          {!status.hasRemote ? (
            <div className="project-git-create-remote">
              <h4>{t('projectGit.createRemoteTitle')}</h4>
              <p className="hint">
                {t('projectGit.createRemoteSubtitle', {
                  slug: currentProjectId,
                })}
              </p>
              <fieldset className="project-git-visibility">
                <legend>{t('projectGit.visibilityLabel')}</legend>
                <label>
                  <input
                    type="radio"
                    name="raccoonui-git-visibility"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={() => setVisibility('private')}
                    disabled={busy !== null}
                  />
                  <span>{t('projectGit.visibilityPrivate')}</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="raccoonui-git-visibility"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={() => setVisibility('public')}
                    disabled={busy !== null}
                  />
                  <span>{t('projectGit.visibilityPublic')}</span>
                </label>
              </fieldset>
              <button
                type="button"
                className="primary"
                disabled={busy !== null}
                onClick={onCreateRemote}
              >
                {busy === 'create-remote'
                  ? t('projectGit.busyCreateRemote')
                  : t('projectGit.createRemoteBtn')}
              </button>
            </div>
          ) : null}

          <div className="project-git-commit">
            <label>{t('projectGit.commitLabel')}</label>
            <textarea
              rows={2}
              placeholder={t('projectGit.commitPlaceholder')}
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              disabled={busy !== null}
            />
            <div className="project-git-row-actions">
              <button
                type="button"
                className="primary"
                disabled={busy !== null || !commitMsg.trim()}
                onClick={onCommit}
              >
                {busy === 'commit'
                  ? t('projectGit.busyCommit')
                  : t('projectGit.commitBtn')}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={busy !== null || !status.hasRemote}
                title={
                  !status.hasRemote
                    ? t('projectGit.pushNoRemoteHint')
                    : undefined
                }
                onClick={onPush}
              >
                {busy === 'push'
                  ? t('projectGit.busyPush')
                  : t('projectGit.pushBtn')}
              </button>
            </div>
          </div>

          <div className="project-git-history">
            <h4>{t('projectGit.historyTitle')}</h4>
            {history.length === 0 ? (
              <div className="empty-card">
                {t('projectGit.historyEmpty')}
              </div>
            ) : (
              <ul>
                {history.map((entry) => (
                  <li key={entry.hash}>
                    <span className="hash">
                      <code>{entry.shortHash}</code>
                    </span>
                    <span className="msg">{entry.message}</span>
                    <span className="meta">
                      {entry.author} · {new Date(entry.date).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      className="ghost small"
                      disabled={busy !== null}
                      onClick={() => onRollback(entry.hash)}
                    >
                      {busy === 'rollback'
                        ? t('projectGit.busyRollback')
                        : t('projectGit.historyRevert')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
