// RACCOONUI-PATCH: retag-anchors — mirror id="X" → data-od-id="X" on
// structural HTML elements so OpenDesign's Tweaks > Picker / Pods works
// on hand-written or imported docs that use plain HTML id attributes.
// Upstream's Inspect commit (38eb78a3) made [data-od-id] / [data-screen-label]
// strictly required for the selection bridge; this brings hand-written
// docs back in line with that contract WITHOUT forking the bridge. — 2026-05-08
//
// Scope: section, article, header, main, footer, aside, nav, h1-h6.
// Mirror only — never invent IDs, never touch elements without an id.
// That keeps the operation idempotent and stable across LLM regenerations:
// the LLM's chosen `id` is the source of truth, we just shadow it. The
// caller owns file I/O (read via readProjectFile, write via writeProjectFile)
// so this module stays a pure string transform — easy to unit-test and
// nothing to mock.

export interface RetagResult {
  retagged: number;
  skipped: number;
  // The element ids that received a new data-od-id (for telemetry / UX).
  taggedIds: string[];
}

const STRUCTURAL_TAGS = ['section', 'article', 'header', 'main', 'footer', 'aside', 'nav', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

// Match an opening tag of any structural element, capturing the attr blob.
const STRUCTURAL_TAG_RE = new RegExp(`<(${STRUCTURAL_TAGS.join('|')})\\b([^>]*)>`, 'gi');

// Match id="value" or id='value' inside the attr blob.
const ID_ATTR_RE = /\bid\s*=\s*("([^"]*)"|'([^']*)')/i;

// Match data-od-id="value" — used to detect existing tag (skip if present).
const DATA_OD_ID_RE = /\bdata-od-id\s*=\s*("[^"]*"|'[^']*')/i;

export function retagAnchorsInHtml(html: string): { html: string; result: RetagResult } {
  let retagged = 0;
  let skipped = 0;
  const taggedIds: string[] = [];

  const next = html.replace(STRUCTURAL_TAG_RE, (match, _tag, attrs) => {
    if (DATA_OD_ID_RE.test(attrs)) {
      skipped += 1;
      return match;
    }
    const idMatch = attrs.match(ID_ATTR_RE);
    if (!idMatch) {
      skipped += 1;
      return match;
    }
    const idValue = idMatch[2] ?? idMatch[3] ?? '';
    if (!idValue) {
      skipped += 1;
      return match;
    }
    retagged += 1;
    taggedIds.push(idValue);
    // Insert data-od-id right after the existing id attribute so rendered
    // HTML stays readable: id="x" data-od-id="x".
    const insertion = ` data-od-id="${escapeAttrValue(idValue)}"`;
    const beforeIdx = attrs.indexOf(idMatch[0]) + idMatch[0].length;
    const newAttrs = attrs.slice(0, beforeIdx) + insertion + attrs.slice(beforeIdx);
    return match.replace(attrs, newAttrs);
  });

  return { html: next, result: { retagged, skipped, taggedIds } };
}

function escapeAttrValue(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
