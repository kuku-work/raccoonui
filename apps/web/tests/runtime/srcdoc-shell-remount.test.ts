// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { isSrcDocShellRemount } from '../../src/runtime/srcdoc';

// Regression guard for the lazy-transport re-activation loop. The shell injects
// the artifact via document.open()+write()+close(); in Chromium the close()
// fires the iframe `load` event a SECOND time on the SAME contentWindow. The
// host's onLoad handler must treat that echo as "not a remount" so it does NOT
// clear the activation dedupe and re-activate — otherwise it writes again,
// fires another load, and loops forever, re-running the artifact bootstrap each
// cycle. For decks (which call show(0) on init) the loop pins the deck to slide
// 1 and makes navigation impossible. See the FileViewer srcDoc onLoad guard.

describe('isSrcDocShellRemount', () => {
  it('treats the close() echo (same window) as NOT a remount', () => {
    const win = {} as unknown as Window;
    // First real shell load: prev is null, a window arrives -> remount.
    expect(isSrcDocShellRemount(null, win)).toBe(true);
    // The document.write close() echo fires load again on the same window.
    // This is the loop trigger; it must be suppressed.
    expect(isSrcDocShellRemount(win, win)).toBe(false);
  });

  it('treats a fresh contentWindow (preview->source->preview) as a remount', () => {
    const prev = {} as unknown as Window;
    const next = {} as unknown as Window;
    expect(isSrcDocShellRemount(prev, next)).toBe(true);
  });

  it('never acts on a detached frame (null loaded window)', () => {
    expect(isSrcDocShellRemount(null, null)).toBe(false);
    expect(isSrcDocShellRemount({} as unknown as Window, null)).toBe(false);
  });
});
