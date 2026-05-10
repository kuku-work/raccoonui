#!/usr/bin/env -S npx -y tsx
/**
 * raccoonai-deck — slide deck composer.
 *
 * Reads `inputs.json` (matching `../schema.ts`) and writes a single
 * self-contained HTML file: a horizontal swipe deck where every slide
 * occupies one viewport. Reads RaccoonAI brand tokens from
 * `assets/tokens.css`, layers deck-specific rules (transform-track flex,
 * 7 slide kinds, dot nav, ESC overview), and inlines the
 * keyboard / wheel / touch nav runtime that mirrors
 * `open-design-landing-deck` and `kami-deck`.
 *
 * Usage:
 *   npx tsx scripts/compose.ts <inputs.json> <output.html>
 *
 * Re-generate the canonical examples:
 *   npx tsx scripts/compose.ts inputs.example.keynote.json  examples/keynote-2026.html
 *   npx tsx scripts/compose.ts inputs.example.saleskit.json examples/saleskit-template.html
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RaccoonaiDeckInputs,
  Slide,
  CoverSlide,
  ChapterSlide,
  ContentSlide,
  StatsSlide,
  QuoteSlide,
  CTASlide,
  EndSlide,
  ContentLayout,
  Speaker,
  PainEntry,
  FlowStep,
  HubSpokeMap,
  StoryStep,
  MatrixBlock,
} from '../schema';

const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS_CSS = resolve(SKILL_ROOT, 'assets', 'tokens.css');

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Unsafe — caller is responsible. Used for body copy that may contain <br>. */
function raw(s: string): string {
  return s;
}

function ext(href: string): string {
  return /^(https?:|mailto:|\/\/)/i.test(href)
    ? ` target='_blank' rel='noreferrer noopener'`
    : '';
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function chipRow(chips: string[] | undefined): string {
  if (!chips || !chips.length) return '';
  return `<div class='rc-chip-row'>${chips
    .map((c) => `<span class='rc-chip'>${escapeHtml(c)}</span>`)
    .join('')}</div>`;
}

function pillarRow(pillars: string[] | undefined): string {
  if (!pillars || !pillars.length) return '';
  const items = pillars
    .map((p, i) => {
      const sep = i < pillars.length - 1 ? `<span class='rc-pill-x'>×</span>` : '';
      return `<span class='rc-pill'>${escapeHtml(p)}</span>${sep}`;
    })
    .join('');
  return `<div class='rc-pill-row'>${items}</div>`;
}

function bulletList(items: string[] | undefined): string {
  if (!items || !items.length) return '';
  return `<ul class='rc-bullets'>${items
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join('')}</ul>`;
}

function sourceLine(src: string | undefined): string {
  return src ? `<div class='rc-source'>${escapeHtml(src)}</div>` : '';
}

/* ------------------------------------------------------------------ *
 * deck-specific CSS (layered on top of tokens.css).
 *
 * We do NOT redefine brand tokens here — that's tokens.css's job.
 * This stylesheet adds: transform-track host, slide grid, chrome,
 * dot nav, ESC overview, 7 slide-kind layouts, responsive, print.
 * ------------------------------------------------------------------ */

const DECK_CSS = `
/* ---------- host & deck track ---------- */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
body {
  font-family: var(--rc-font-body);
  font-size: 18px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  color: var(--rc-armor-white);
  background: var(--rc-deep-blue);
}
p { text-wrap: pretty; }
h1, h2, h3 { text-wrap: balance; }

#rc-deck {
  position: fixed; inset: 0;
  display: flex; flex-wrap: nowrap;
  transition: transform 0.7s cubic-bezier(0.77, 0, 0.175, 1);
  will-change: transform; z-index: 1;
}

.slide {
  flex: 0 0 100vw;
  width: 100vw; height: 100vh;
  padding: var(--rc-pad-y) var(--rc-pad-x);
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; justify-content: center;
}
.slide.center { align-items: center; text-align: center; justify-content: center; }
.slide .body { width: 100%; max-width: 1440px; margin-inline: auto; }
.slide.center .body { margin-inline: auto; }

/* ---------- chrome strip on every slide (top right & bottom hud) ---------- */
.rc-chrome-top {
  position: absolute; top: 28px; left: var(--rc-pad-x); right: var(--rc-pad-x);
  display: flex; justify-content: space-between; align-items: center;
  font-family: var(--rc-font-mono); font-size: 11px;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: rgba(255,255,255,0.55);
  pointer-events: none; z-index: 4;
}
.slide.rc-bg-light .rc-chrome-top { color: rgba(10,17,66,0.55); }
.rc-brand-mark {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: var(--rc-font-en-display); font-weight: 800;
  font-size: 13px; letter-spacing: -0.01em; text-transform: none;
  color: inherit; opacity: 1;
}
.rc-brand-mark::before {
  content: ''; width: 16px; height: 16px; border-radius: 5px;
  background: linear-gradient(135deg, var(--rc-light-blue), var(--rc-mid-blue));
  box-shadow: 0 0 0 1px rgba(255,255,255,0.25) inset;
}

/* ---------- live HUD (counter / hint / progress / dot nav) ---------- */
.rc-deck-progress { position: fixed; left: 0; right: 0; top: 0; height: 3px; background: rgba(255,255,255,0.10); z-index: 50; }
.rc-deck-progress::after { content: ''; display: block; height: 100%; width: var(--rc-prog, 0%); background: linear-gradient(90deg, var(--rc-light-blue), var(--rc-glow-magenta)); transition: width 0.5s cubic-bezier(0.77, 0, 0.175, 1); }
.rc-deck-counter {
  position: fixed; bottom: 26px; right: 32px; z-index: 50;
  font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.06em;
  padding: 6px 14px; border-radius: 999px;
  background: var(--rc-glass-fill); border: 1px solid var(--rc-glass-stroke);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  color: var(--rc-armor-white);
}
.rc-deck-hint {
  position: fixed; bottom: 28px; left: 32px; z-index: 50;
  font-family: var(--rc-font-mono); font-size: 10px; letter-spacing: 0.16em;
  text-transform: uppercase; opacity: 0.55; color: var(--rc-armor-white);
}
.rc-deck-nav {
  position: fixed; left: 50%; bottom: 30px; transform: translateX(-50%);
  z-index: 50; display: flex; gap: 10px;
  padding: 8px 16px; border-radius: 999px;
  background: var(--rc-glass-fill); border: 1px solid var(--rc-glass-stroke);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
}
.rc-deck-nav .dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,0.30);
  cursor: pointer; border: 0; padding: 0;
  transition: all 0.3s ease;
}
.rc-deck-nav .dot:hover { background: rgba(255,255,255,0.55); transform: scale(1.15); }
.rc-deck-nav .dot.active { background: var(--rc-light-blue); width: 22px; border-radius: 999px; }

/* ---------- ESC overview ---------- */
.rc-deck-overview {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(5,8,16,0.96);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  display: none; overflow-y: auto; padding: 60px 56px;
}
.rc-deck-overview.active { display: block; }
.rc-deck-overview .ov-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 32px; font-family: var(--rc-font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.7); }
.rc-deck-overview .ov-head b { color: white; font-weight: 700; }
.rc-deck-overview .ov-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 22px; max-width: 1280px; margin: 0 auto; }
.rc-deck-overview .ov-card { cursor: pointer; border-radius: 14px; overflow: hidden; border: 1px solid var(--rc-glass-stroke); transition: border-color 0.2s, transform 0.2s; background: var(--rc-glass-fill); }
.rc-deck-overview .ov-card:hover { border-color: var(--rc-light-blue); transform: translateY(-2px); }
.rc-deck-overview .ov-card.active { border-color: var(--rc-yellow); border-width: 2px; }
.rc-deck-overview .ov-thumb { width: 100%; aspect-ratio: 16/10; overflow: hidden; position: relative; pointer-events: none; background: var(--rc-deep-blue); }
.rc-deck-overview .ov-thumb .clone { width: 100vw; height: 100vh; transform: scale(0.18); transform-origin: top left; position: absolute; top: 0; left: 0; pointer-events: none; }
.rc-deck-overview .ov-label { padding: 10px 14px; font-family: var(--rc-font-mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.7); display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.rc-deck-overview .ov-label b { color: white; font-weight: 700; }

/* ---------- COVER ---------- */
.s-cover .body {
  display: flex; flex-direction: column;
  gap: clamp(14px, 1.4vw, 22px);
  max-width: 1100px;
}
.s-cover.has-image .body { max-width: 56%; }
.s-cover .rc-meta-line { color: rgba(255,255,255,0.7); }
.s-cover h1 {
  font-family: var(--rc-font-cn-display); font-weight: 900;
  font-size: var(--rc-h-mega); line-height: 0.95; letter-spacing: -0.02em;
  margin: 0;
}
.s-cover h1 .en {
  font-family: var(--rc-font-en-display); font-weight: 800;
  font-size: 0.42em; display: block; letter-spacing: -0.01em;
  opacity: 0.78; margin-bottom: -8px;
}
.s-cover .subtitle {
  font-family: var(--rc-font-cn-display); font-weight: 500;
  font-size: var(--rc-lead); line-height: 1.55;
  max-width: 28ch; opacity: 0.86;
}
.s-cover .meta {
  font-family: var(--rc-font-mono); font-size: 13px;
  letter-spacing: 0.06em; text-transform: uppercase;
  margin-top: 12px; opacity: 0.68;
  border-left: 2px solid var(--rc-light-blue);
  padding-left: 14px;
}

/* ---------- CHAPTER ---------- */
.s-chapter .body { text-align: center; }
.s-chapter .numeral {
  font-family: var(--rc-font-en-display); font-weight: 800;
  font-size: 22px; letter-spacing: 0.18em;
  opacity: 0.6; margin-bottom: 22px;
}
.s-chapter h2 {
  font-family: var(--rc-font-cn-display); font-weight: 800;
  font-size: var(--rc-h-hero); line-height: 1; letter-spacing: -0.02em;
  margin: 0; max-width: 18ch;
  margin-inline: auto;
}
.s-chapter .lead {
  font-family: var(--rc-font-body);
  font-size: var(--rc-lead);
  margin-top: 22px; opacity: 0.78;
  max-width: 36ch; margin-inline: auto;
}

/* ---------- CONTENT ---------- */
.s-content .body { display: flex; flex-direction: column; gap: 24px; }
.s-content .eyebrow { font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--rc-light-blue); }
.s-content.rc-bg-light .eyebrow { color: var(--rc-mid-blue); }
.s-content h2 { font-family: var(--rc-font-cn-display); font-weight: 700; font-size: var(--rc-h-xl); line-height: 1.1; letter-spacing: -0.015em; margin: 0; max-width: 26ch; }
.s-content .body-copy { font-family: var(--rc-font-body); font-size: var(--rc-lead); line-height: 1.55; max-width: 56ch; opacity: 0.86; margin: 0; }
.s-content.rc-bg-light .body-copy { opacity: 1; color: var(--rc-fur-dark); }

.rc-bullets { padding-left: 22px; margin: 0; line-height: 1.85; font-size: 17px; }
.rc-bullets li { margin: 4px 0; }
.s-content.rc-bg-light .rc-bullets { color: var(--rc-ink); }

/* layout: left / right (copy + image two-col) */
.s-content.layout-left .body,
.s-content.layout-right .body {
  display: grid; grid-template-columns: 1.1fr 1fr;
  gap: var(--rc-gap-lg); align-items: center;
}
.s-content.layout-right .body { grid-template-columns: 1fr 1.1fr; }
.s-content.layout-right .copy { order: 2; }
.s-content.layout-right .art  { order: 1; }
.s-content .copy { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.s-content .art {
  aspect-ratio: 4/3; border-radius: var(--rc-glass-radius);
  background: var(--rc-glass-fill); border: 1px solid var(--rc-glass-stroke);
  box-shadow: var(--rc-glass-shadow);
  backdrop-filter: blur(28px) saturate(1.4); -webkit-backdrop-filter: blur(28px) saturate(1.4);
  overflow: hidden; display: grid; place-items: center;
  font-family: var(--rc-font-mono); font-size: 12px;
  letter-spacing: 0.1em; color: rgba(255,255,255,0.5);
  position: relative;
}
.s-content.rc-bg-light .art { color: rgba(10,17,66,0.55); }
.s-content .art img { width: 100%; height: 100%; object-fit: cover; }

/* layout: full (text only) */
.s-content.layout-full .body { display: flex; flex-direction: column; gap: 18px; }

/* layout: flow (3-step) */
.s-content.layout-flow .flow-3 { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 16px; align-items: stretch; margin-top: 16px; }
.s-content.layout-flow .flow-3 .arrow { display: grid; place-items: center; font-family: var(--rc-font-en-display); font-size: 28px; opacity: 0.45; }
.s-content.layout-flow .flow-3 .step { padding: clamp(24px, 2.4vw, 36px); border-radius: var(--rc-glass-radius); background: var(--rc-glass-fill); border: 1px solid var(--rc-glass-stroke); box-shadow: var(--rc-glass-shadow); backdrop-filter: blur(28px) saturate(1.4); -webkit-backdrop-filter: blur(28px) saturate(1.4); position: relative; overflow: hidden; }
.s-content.layout-flow .flow-3 .step .nb { font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.1em; color: var(--rc-light-blue); }
.s-content.layout-flow .flow-3 .step h3 { margin: 8px 0; font-family: var(--rc-font-cn-display); font-weight: 700; font-size: clamp(22px, 2vw, 30px); }
.s-content.layout-flow .flow-3 .step p { margin: 0; font-size: 16px; line-height: 1.55; opacity: 0.82; }
.s-content.layout-flow.rc-bg-light .flow-3 .step { color: var(--rc-armor-white); background: var(--rc-deep-blue); border-color: var(--rc-mid-blue); }

/* layout: speakers */
.s-content.layout-speakers .speaker-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 20px; max-width: 1100px; }
.s-content.layout-speakers .speaker { display: flex; flex-direction: column; gap: 10px; }
.s-content.layout-speakers .avatar {
  width: 100%; aspect-ratio: 1/1; border-radius: 22px;
  background: linear-gradient(160deg, rgba(255,255,255,0.18), rgba(20,37,114,0.32)), var(--rc-mid-blue);
  border: 1px solid var(--rc-glass-stroke); box-shadow: var(--rc-glass-shadow);
  display: grid; place-items: center;
  color: rgba(255,255,255,0.45);
  font-family: var(--rc-font-mono); font-size: 13px; letter-spacing: 0.08em;
  overflow: hidden;
}
.s-content.layout-speakers .avatar img { width: 100%; height: 100%; object-fit: cover; }
.s-content.layout-speakers .role { font-family: var(--rc-font-mono); font-size: 11px; letter-spacing: 0.08em; opacity: 0.6; text-transform: uppercase; }
.s-content.layout-speakers .name { font-family: var(--rc-font-en-display); font-weight: 700; font-size: 18px; }

/* layout: pain */
.s-content.layout-pain .pain-list { display: flex; flex-direction: column; gap: 18px; margin-top: 8px; max-width: 980px; }
.s-content.layout-pain .pain {
  border-left: 3px solid var(--rc-coral);
  padding: 22px 30px;
  background: rgba(226, 78, 36, 0.08);
  border-radius: 0 14px 14px 0;
}
.s-content.layout-pain .pain-label { font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rc-coral); margin-bottom: 8px; }
.s-content.layout-pain .pain-text  { font-family: var(--rc-font-cn-display); font-weight: 700; font-size: clamp(20px, 1.8vw, 26px); line-height: 1.4; color: inherit; }
.s-content.layout-pain.rc-bg-light .pain-text { color: var(--rc-ink); }

/* layout: hub */
.s-content.layout-hub .hub-canvas { position: relative; min-height: 56vh; margin-top: 18px; }
.s-content.layout-hub .spoke { position: absolute; }
.s-content.layout-hub .hub {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  padding: 28px 40px; min-width: 260px; text-align: center;
  border-radius: var(--rc-glass-radius); background: var(--rc-glass-fill);
  border: 1px solid var(--rc-glass-stroke); box-shadow: var(--rc-glass-shadow);
  backdrop-filter: blur(28px) saturate(1.4); -webkit-backdrop-filter: blur(28px) saturate(1.4);
}
.s-content.layout-hub .hub .meta { font-family: var(--rc-font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--rc-light-blue); margin-bottom: 8px; }
.s-content.layout-hub .hub .name { font-family: var(--rc-font-en-display); font-weight: 800; font-size: 26px; color: var(--rc-armor-white); }
.s-content.layout-hub.rc-bg-light .hub .name { color: var(--rc-deep-blue); }
.s-content.layout-hub .hub .pillars { margin-top: 12px; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.s-content.layout-hub .hub-line {
  position: absolute; top: 50%; left: 50%; transform-origin: left center;
  height: 1px; background: linear-gradient(to right, rgba(107,150,236,0.45), transparent);
  pointer-events: none; z-index: 0;
}

/* layout: storyboard */
.s-content.layout-storyboard .story-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 16px; align-items: stretch; }
.s-content.layout-storyboard .story-cell { display: flex; flex-direction: column; gap: 12px; }
.s-content.layout-storyboard .story-frame {
  aspect-ratio: 9/16; padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
  border-radius: 18px; background: var(--rc-glass-fill);
  border: 1px solid var(--rc-glass-stroke); box-shadow: var(--rc-glass-shadow);
  backdrop-filter: blur(28px) saturate(1.4); -webkit-backdrop-filter: blur(28px) saturate(1.4);
  position: relative; overflow: hidden;
}
.s-content.layout-storyboard .story-meta { font-family: var(--rc-font-mono); font-size: 10px; letter-spacing: 0.12em; color: var(--rc-light-blue); text-transform: uppercase; }
.s-content.layout-storyboard .story-frame.tone-ai .story-meta { color: var(--rc-light-blue); }
.s-content.layout-storyboard .story-frame.tone-agent .story-meta { color: var(--rc-yellow); }
.s-content.layout-storyboard .story-frame.tone-success .story-meta { color: var(--rc-yellow); }
.s-content.layout-storyboard .story-body {
  font-family: var(--rc-font-cn-display); font-weight: 500;
  font-size: 16px; line-height: 1.45; color: var(--rc-armor-white);
  padding: 12px 14px; border-radius: 12px;
  background: rgba(255,255,255,0.10);
  align-self: flex-start; max-width: 92%;
}
.s-content.layout-storyboard .story-frame.tone-ai .story-body { background: rgba(107,150,236,0.20); border: 1px solid rgba(107,150,236,0.36); align-self: flex-end; }
.s-content.layout-storyboard .story-frame.tone-agent .story-body { background: rgba(255,198,72,0.18); border: 1px solid rgba(255,198,72,0.34); align-self: flex-end; }
.s-content.layout-storyboard .story-frame.tone-success .story-body { background: rgba(255,198,72,0.20); border: 1px solid rgba(255,198,72,0.40); align-self: stretch; }
.s-content.layout-storyboard .story-caption { font-family: var(--rc-font-mono); font-size: 11px; letter-spacing: 0.10em; text-transform: uppercase; color: rgba(255,255,255,0.62); }
.s-content.layout-storyboard.rc-bg-light .story-caption { color: rgba(10,17,66,0.62); }

/* layout: matrix */
.s-content.layout-matrix .matrix { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 16px; font-size: 17px; line-height: 1.5; }
.s-content.layout-matrix .matrix th { text-align: left; padding: 14px 20px; font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.10em; text-transform: uppercase; }
.s-content.layout-matrix .matrix th.dim { color: var(--rc-fur-dark); width: 26%; padding-left: 4px; }
.s-content.layout-matrix .matrix th.us { background: rgba(107,150,236,0.20); color: var(--rc-deep-blue); border-radius: 14px 14px 0 0; font-family: var(--rc-font-en-display); font-weight: 800; font-size: 14px; }
.s-content.layout-matrix .matrix th.them { background: rgba(93,101,112,0.10); color: var(--rc-fur-dark); border-radius: 14px 14px 0 0; font-family: var(--rc-font-en-display); font-weight: 700; font-size: 14px; }
.s-content.layout-matrix .matrix td { padding: 14px 20px; vertical-align: top; }
.s-content.layout-matrix .matrix td.dim { font-weight: 700; color: var(--rc-ink); padding-left: 4px; border-top: 1px solid rgba(10,17,66,0.10); }
.s-content.layout-matrix .matrix td.us { background: rgba(107,150,236,0.08); border-top: 1px solid rgba(107,150,236,0.18); color: var(--rc-ink); }
.s-content.layout-matrix .matrix td.them { background: rgba(93,101,112,0.04); border-top: 1px solid rgba(93,101,112,0.08); color: var(--rc-fur-dark); }
.s-content.layout-matrix .matrix tr:last-child td.us { border-radius: 0 0 0 14px; }
.s-content.layout-matrix .matrix tr:last-child td.them { border-radius: 0 0 14px 0; }

/* ---------- STATS — auto-size by cell count ---------- */
.s-stats .body { display: flex; flex-direction: column; gap: 22px; }
.s-stats .eyebrow { font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--rc-light-blue); }
.s-stats h2 { font-family: var(--rc-font-cn-display); font-weight: 700; font-size: var(--rc-h-xl); line-height: 1.1; letter-spacing: -0.015em; margin: 0; max-width: 26ch; }
.s-stats .stat-grid { display: grid; gap: var(--rc-gap-lg); margin-top: 18px; }
.s-stats.cells-1 .stat-grid { grid-template-columns: 1fr; place-items: center; text-align: center; }
.s-stats.cells-2 .stat-grid { grid-template-columns: repeat(2, 1fr); align-items: center; }
.s-stats.cells-3 .stat-grid { grid-template-columns: repeat(3, 1fr); }
.s-stats.cells-4 .stat-grid { grid-template-columns: repeat(4, 1fr); }
.s-stats .stat .num {
  font-family: var(--rc-font-en-display); font-weight: 800;
  line-height: 0.9; letter-spacing: -0.04em; color: var(--rc-light-blue);
}
.s-stats.cells-1 .stat .num { font-size: var(--rc-stat-mega); line-height: 0.85; letter-spacing: -0.045em; }
.s-stats.cells-2 .stat .num { font-size: var(--rc-stat-duo); }
.s-stats.cells-3 .stat .num,
.s-stats.cells-4 .stat .num { font-size: var(--rc-stat-quad); }
.s-stats .stat .num.warm  { color: var(--rc-yellow); }
.s-stats .stat .num.alert { color: var(--rc-coral);  }
.s-stats .stat .unit {
  font-size: 0.42em; opacity: 0.78;
  font-family: var(--rc-font-cn-display); font-weight: 700;
  margin-left: 0.08em; letter-spacing: 0;
}
.s-stats .stat .label { margin-top: 8px; font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; }
.s-stats .stat .sub { margin-top: 4px; font-size: 14px; opacity: 0.74; }
.s-stats.cells-1 .stat .label { margin-top: 18px; font-family: var(--rc-font-cn-display); font-weight: 500; font-size: var(--rc-lead); text-transform: none; letter-spacing: 0; opacity: 0.86; max-width: 24ch; }

/* ---------- QUOTE ---------- */
.s-quote .body { max-width: 1100px; text-align: center; }
.s-quote .glyph { font-family: var(--rc-font-en-display); font-weight: 800; font-size: 220px; line-height: 0.5; opacity: 0.16; color: var(--rc-light-blue); margin-bottom: -20px; }
.s-quote blockquote {
  font-family: var(--rc-font-cn-display); font-weight: 600;
  font-size: clamp(28px, 3vw, 44px); line-height: 1.45; letter-spacing: -0.01em;
  max-width: 26ch; margin: 0 auto;
}
.s-quote .author {
  margin-top: 36px; display: flex; justify-content: center;
  font-family: var(--rc-font-mono); font-size: 13px;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.s-quote .author .ctx-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 999px;
  background: var(--rc-glass-fill); border: 1px solid var(--rc-glass-stroke);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}

/* ---------- CTA ---------- */
.s-cta .body { display: flex; flex-direction: column; align-items: center; gap: 22px; text-align: center; }
.s-cta .eyebrow { font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--rc-light-blue); }
.s-cta h2 { font-family: var(--rc-font-cn-display); font-weight: 800; font-size: var(--rc-h-hero); line-height: 1; letter-spacing: -0.02em; margin: 0; max-width: 22ch; }
.s-cta .body-copy { font-family: var(--rc-font-body); font-size: var(--rc-lead); opacity: 0.86; max-width: 38ch; margin: 0; }
.s-cta .actions { margin-top: 22px; display: flex; gap: 36px; align-items: flex-start; justify-content: center; flex-wrap: wrap; }
.s-cta .action {
  padding: 28px 32px; min-width: 240px; text-align: center;
  border-radius: var(--rc-glass-radius); background: var(--rc-glass-fill);
  border: 1px solid var(--rc-glass-stroke); box-shadow: var(--rc-glass-shadow);
  backdrop-filter: blur(28px) saturate(1.4); -webkit-backdrop-filter: blur(28px) saturate(1.4);
}
.s-cta .action.primary { border-color: var(--rc-yellow); }
.s-cta .action .qr { width: 160px; height: 160px; margin: 0 auto 16px; background: white; border-radius: 12px; display: grid; place-items: center; color: #888; font-family: var(--rc-font-mono); font-size: 11px; letter-spacing: 0.08em; }
.s-cta .action .lab { font-family: var(--rc-font-cn-display); font-weight: 700; font-size: 18px; }
.s-cta .action .url { margin-top: 6px; font-family: var(--rc-font-mono); font-size: 11px; opacity: 0.62; word-break: break-all; }
.s-cta .highlight { margin-top: 8px; }

/* ---------- END ---------- */
.s-end .body { display: flex; flex-direction: column; align-items: flex-start; gap: 24px; padding-bottom: 48px; }
.s-end .mega { font-family: var(--rc-font-cn-display); font-weight: 900; font-size: clamp(120px, 18vw, 280px); line-height: 0.9; letter-spacing: -0.04em; color: var(--rc-armor-white); margin: 0; max-width: 100%; }
.s-end .footer { font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.55); border-top: 1px solid var(--rc-glass-stroke); padding-top: 22px; }

/* ---------- inline chip / pill primitives ---------- */
.rc-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 999px; font-family: var(--rc-font-cn-display); font-size: clamp(13px, 1vw, 15px); font-weight: 500; letter-spacing: 0.02em; border: 1px solid var(--rc-glass-stroke); background: var(--rc-glass-fill); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: inherit; white-space: nowrap; }
.rc-chip-row { display: inline-flex; gap: 10px; flex-wrap: wrap; }
.rc-chip.solid-yellow { background: var(--rc-yellow); color: var(--rc-ink); border-color: transparent; font-weight: 700; }
.rc-pill-row { display: inline-flex; align-items: center; gap: 14px; font-family: var(--rc-font-cn-display); font-size: clamp(15px, 1.2vw, 18px); font-weight: 500; letter-spacing: 0.04em; }
.rc-pill { padding: 8px 18px; border-radius: 999px; border: 1px solid var(--rc-glass-stroke); background: var(--rc-glass-fill); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); color: inherit; }
.rc-pill-x { font-family: var(--rc-font-en-display); font-weight: 300; opacity: 0.6; }

/* ---------- source footnote ---------- */
.rc-source { font-family: var(--rc-font-mono); font-size: 12px; letter-spacing: 0.04em; opacity: 0.55; }
.rc-source::before { content: 'Source · '; opacity: 0.6; }
.s-content .rc-source { margin-top: 16px; }
.s-stats .rc-source { margin-top: 24px; }

/* ---------- responsive ---------- */
@media (max-width: 1080px) {
  .slide { padding: 56px 48px 80px; }
  .rc-chrome-top { padding: 0 48px; left: 0; right: 0; }
  .s-content.layout-left .body,
  .s-content.layout-right .body { grid-template-columns: 1fr; gap: 28px; }
  .s-content.layout-flow .flow-3 { grid-template-columns: 1fr; }
  .s-content.layout-flow .flow-3 .arrow { display: none; }
  .s-content.layout-storyboard .story-grid { grid-template-columns: repeat(2, 1fr); }
  .s-content.layout-speakers .speaker-row { grid-template-columns: repeat(2, 1fr); }
  .s-stats.cells-4 .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .rc-deck-hint { display: none; }
  .s-content.layout-storyboard .story-grid,
  .s-content.layout-speakers .speaker-row,
  .s-stats.cells-3 .stat-grid,
  .s-stats.cells-4 .stat-grid { grid-template-columns: 1fr; }
}

/* ---------- print: unwind transform-track ---------- */
@media print {
  @page { size: 1920px 1080px; margin: 0; }
  html, body { height: auto; overflow: visible; }
  body { background: white; }
  #rc-deck { position: static !important; transform: none !important; display: block !important; width: auto !important; height: auto !important; }
  .slide { width: 1920px; height: 1080px; page-break-after: always; page-break-inside: avoid; }
  .slide:last-of-type { page-break-after: auto; }
  .rc-deck-counter, .rc-deck-hint, .rc-deck-progress, .rc-deck-nav, .rc-deck-overview { display: none !important; }
  .rc-bg-deep { background: var(--rc-deep-blue) !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
@supports not (backdrop-filter: blur(28px)) {
  .s-content .art,
  .s-content.layout-flow .flow-3 .step,
  .s-content.layout-hub .hub,
  .s-content.layout-storyboard .story-frame,
  .s-cta .action { background: rgba(20, 37, 114, 0.65); }
  .rc-chip, .rc-pill, .rc-deck-counter, .rc-deck-nav { background: rgba(255, 255, 255, 0.18); }
}
`;

/* ------------------------------------------------------------------ *
 * runtime — transform-track nav (mirrors open-design-landing-deck).
 * ------------------------------------------------------------------ */

const RUNTIME_SCRIPT = `
<script>
(function () {
  var deck     = document.getElementById('rc-deck');
  if (!deck) return;
  var slides   = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
  var nav      = document.getElementById('rc-deck-nav');
  var overview = document.getElementById('rc-deck-overview');
  var counter  = document.getElementById('deck-counter');
  var progress = document.getElementById('deck-progress');
  var total    = slides.length;
  var idx = 0, lock = false, overviewOn = false;

  deck.style.width = (total * 100) + 'vw';

  slides.forEach(function (s, i) {
    var b = document.createElement('button');
    b.className = 'dot'; b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', 'Slide ' + (i + 1));
    b.onclick = function () { go(i); };
    nav.appendChild(b);
  });

  function applySlide(n) {
    idx = Math.max(0, Math.min(total - 1, n));
    deck.style.transform = 'translateX(' + (-idx * 100) + 'vw)';
    slides.forEach(function (s, i) { s.classList.toggle('active', i === idx); });
    nav.querySelectorAll('.dot').forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    if (counter)  counter.textContent  = (idx + 1) + ' / ' + total;
    if (progress) progress.style.setProperty('--rc-prog', (((idx + 1) / total) * 100) + '%');
  }
  function go(n) { if (lock) return; applySlide(n); lock = true; setTimeout(function () { lock = false; }, 700); }

  function buildOverview() {
    overview.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'ov-head';
    head.innerHTML = '<span><b>Slide overview</b> · ESC to close</span><span>'
      + String(idx + 1).padStart(2, '0') + ' / ' + String(total).padStart(2, '0') + '</span>';
    overview.appendChild(head);
    var grid = document.createElement('div');
    grid.className = 'ov-grid';
    slides.forEach(function (s, i) {
      var card = document.createElement('div');
      card.className = 'ov-card' + (i === idx ? ' active' : '');
      var thumb = document.createElement('div');
      thumb.className = 'ov-thumb';
      var clone = s.cloneNode(true);
      clone.className = clone.className + ' clone';
      thumb.appendChild(clone);
      var label = document.createElement('div');
      label.className = 'ov-label';
      var raw = s.getAttribute('data-screen-label') || '';
      var stripped = raw.replace(/^\\s*\\d+\\s+/, '');
      label.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b><span>' + stripped + '</span>';
      card.appendChild(thumb);
      card.appendChild(label);
      card.onclick = function () { toggleOverview(); go(i); };
      grid.appendChild(card);
    });
    overview.appendChild(grid);
  }
  function toggleOverview() {
    overviewOn = !overviewOn;
    if (overviewOn) { buildOverview(); overview.classList.add('active'); overview.setAttribute('aria-hidden', 'false'); deck.style.visibility = 'hidden'; }
    else { overview.classList.remove('active'); overview.setAttribute('aria-hidden', 'true'); deck.style.visibility = 'visible'; }
  }

  function onKey(e) {
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === 'Escape') { e.preventDefault(); toggleOverview(); return; }
    if (overviewOn) return;
    if      (e.key === 'ArrowRight' || e.key === ' '      || e.key === 'PageDown' || e.key === 'ArrowDown') { e.preventDefault(); go(idx + 1); }
    else if (e.key === 'ArrowLeft'  || e.key === 'PageUp' || e.key === 'ArrowUp')                            { e.preventDefault(); go(idx - 1); }
    else if (e.key === 'Home')                                                                                { e.preventDefault(); go(0); }
    else if (e.key === 'End')                                                                                 { e.preventDefault(); go(total - 1); }
  }
  window.addEventListener('keydown', onKey);

  var wheelTO = null, wheelAcc = 0;
  window.addEventListener('wheel', function (e) {
    if (overviewOn || lock) return;
    wheelAcc += e.deltaY + e.deltaX;
    if (Math.abs(wheelAcc) > 60) { go(idx + (wheelAcc > 0 ? 1 : -1)); wheelAcc = 0; }
    clearTimeout(wheelTO);
    wheelTO = setTimeout(function () { wheelAcc = 0; }, 150);
  }, { passive: true });

  var tx = 0, ty = 0;
  window.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (overviewOn) return;
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  window.addEventListener('message', function (e) {
    var data = e && e.data;
    if (!data || data.type !== 'od:slide') return;
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    if (data.action === 'go' && typeof data.index === 'number') applySlide(data.index);
    else if (data.action === 'next')  applySlide(idx + 1);
    else if (data.action === 'prev')  applySlide(idx - 1);
    else if (data.action === 'first') applySlide(0);
    else if (data.action === 'last')  applySlide(total - 1);
  });

  document.body.setAttribute('tabindex', '-1');
  document.body.style.outline = 'none';
  function focusDeck() { try { window.focus(); document.body.focus({ preventScroll: true }); } catch (_) {} }
  document.addEventListener('mousedown', focusDeck);
  window.addEventListener('load', focusDeck);
  focusDeck();

  applySlide(0);
})();
</script>`;

/* ------------------------------------------------------------------ *
 * slide renderers
 * ------------------------------------------------------------------ */

function chromeStrip(brand: string, edition: string | undefined, kindLabel: string): string {
  return `<div class='rc-chrome-top'>
  <div class='rc-brand-mark'>${escapeHtml(brand)}</div>
  <div>${edition ? escapeHtml(edition) + ' · ' : ''}${escapeHtml(kindLabel)}</div>
</div>`;
}

function renderCover(s: CoverSlide): string {
  const titleHtml = `<span class='en'>Raccoon AI</span>${escapeHtml(s.title)}`;
  const bgImage = s.image
    ? `<style>.s-cover.has-image { background-image: linear-gradient(135deg, rgba(20,37,114,0.55), rgba(10,17,66,0.35)), url('${s.image}'); background-size: cover; background-position: center; }</style>`
    : '';
  return `${bgImage}
  <div class='body'>
    ${s.eyebrow ? `<div class='rc-meta-line'>${escapeHtml(s.eyebrow)}</div>` : ''}
    <h1>${titleHtml}</h1>
    ${s.subtitle ? `<p class='subtitle'>${escapeHtml(s.subtitle)}</p>` : ''}
    ${pillarRow(s.pillars)}
    ${s.meta ? `<div class='meta'>${escapeHtml(s.meta)}</div>` : ''}
  </div>`;
}

function renderChapter(s: ChapterSlide): string {
  return `<div class='body'>
    <div class='numeral'>— ${escapeHtml(s.numeral)} —</div>
    <h2>${escapeHtml(s.title)}</h2>
    ${s.lead ? `<p class='lead'>${escapeHtml(s.lead)}</p>` : ''}
  </div>`;
}

function renderContentLeftRight(s: ContentSlide): string {
  const artHtml = s.image
    ? `<img src='${escapeHtml(s.image)}' alt='' />`
    : `[ ${escapeHtml(s.eyebrow ? s.eyebrow.toLowerCase().replace(/^[a-z]+\s*·\s*/, '') : 'visual')} ]`;
  return `<div class='body'>
    <div class='copy'>
      ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
      <h2>${escapeHtml(s.title)}</h2>
      ${s.body ? `<p class='body-copy'>${escapeHtml(s.body)}</p>` : ''}
      ${bulletList(s.bullets)}
      ${chipRow(s.chips)}
      ${sourceLine(s.source)}
    </div>
    <div class='art'>${artHtml}</div>
  </div>`;
}

function renderContentFull(s: ContentSlide): string {
  return `<div class='body'>
    ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
    <h2>${escapeHtml(s.title)}</h2>
    ${s.body ? `<p class='body-copy'>${escapeHtml(s.body)}</p>` : ''}
    ${bulletList(s.bullets)}
    ${chipRow(s.chips)}
    ${sourceLine(s.source)}
  </div>`;
}

function renderContentFlow(s: ContentSlide): string {
  if (!s.flow || !s.flow.length) {
    throw new Error(`content layout='flow' requires \`flow\` array — slide title: ${s.title}`);
  }
  const steps = s.flow
    .map((step, i) => {
      const arrow = i < s.flow!.length - 1 ? `<div class='arrow'>→</div>` : '';
      return `<div class='step'>
        <div class='nb'>${escapeHtml(step.nb)}</div>
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.body)}</p>
      </div>${arrow}`;
    })
    .join('\n      ');
  return `<div class='body'>
    ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
    <h2>${escapeHtml(s.title)}</h2>
    ${chipRow(s.chips)}
    <div class='flow-3'>
      ${steps}
    </div>
    ${sourceLine(s.source)}
  </div>`;
}

function renderContentSpeakers(s: ContentSlide): string {
  if (!s.speakers || !s.speakers.length) {
    throw new Error(`content layout='speakers' requires \`speakers\` — slide title: ${s.title}`);
  }
  const items = s.speakers
    .map(
      (sp) => `<div class='speaker'>
      <div class='avatar'>${
        sp.image
          ? `<img src='${escapeHtml(sp.image)}' alt='${escapeHtml(sp.name)}' />`
          : escapeHtml(sp.initial || sp.name.slice(0, 2).toUpperCase())
      }</div>
      <div class='role'>${escapeHtml(sp.role)}</div>
      <div class='name'>${escapeHtml(sp.name)}</div>
    </div>`,
    )
    .join('\n      ');
  return `<div class='body'>
    ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
    <h2>${escapeHtml(s.title)}</h2>
    <div class='speaker-row'>
      ${items}
    </div>
  </div>`;
}

function renderContentPain(s: ContentSlide): string {
  if (!s.pains || !s.pains.length) {
    throw new Error(`content layout='pain' requires \`pains\` — slide title: ${s.title}`);
  }
  const items = s.pains
    .map(
      (p) => `<div class='pain'>
      <div class='pain-label'>${escapeHtml(p.label)}</div>
      <div class='pain-text'>${escapeHtml(p.text)}</div>
    </div>`,
    )
    .join('\n      ');
  return `<div class='body'>
    ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
    <h2>${escapeHtml(s.title)}</h2>
    <div class='pain-list'>
      ${items}
    </div>
  </div>`;
}

function renderContentHub(s: ContentSlide): string {
  if (!s.hub_spoke) {
    throw new Error(`content layout='hub' requires \`hub_spoke\` — slide title: ${s.title}`);
  }
  const { hub, hub_pillars, spokes } = s.hub_spoke;
  // arrange spokes around perimeter at 8 anchor positions
  const positions: { top: string; left: string; right?: string; bottom?: string; transform?: string }[] = [
    { top: '4%',    left: '8%' },
    { top: '4%',    left: '50%', transform: 'translateX(-50%)' },
    { top: '4%',    left: '92%', transform: 'translateX(-100%)' },
    { top: '50%',   left: '2%',  transform: 'translateY(-50%)' },
    { top: '50%',   left: '98%', transform: 'translate(-100%, -50%)' },
    { top: '96%',   left: '8%',  transform: 'translateY(-100%)' },
    { top: '96%',   left: '50%', transform: 'translate(-50%, -100%)' },
    { top: '96%',   left: '92%', transform: 'translate(-100%, -100%)' },
  ];
  const spokeNodes = spokes
    .slice(0, 8)
    .map((label, i) => {
      const p = positions[i];
      const styles = `top:${p.top};left:${p.left}${p.transform ? `;transform:${p.transform}` : ''}`;
      return `<div class='spoke' style='${styles}'><span class='rc-chip'>${escapeHtml(label)}</span></div>`;
    })
    .join('\n      ');
  const pillarsHtml = hub_pillars && hub_pillars.length
    ? `<div class='pillars'>${hub_pillars
        .map((p) => `<span class='rc-chip'>${escapeHtml(p)}</span>`)
        .join('')}</div>`
    : '';
  return `<div class='body'>
    ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
    <h2>${escapeHtml(s.title)}</h2>
    ${chipRow(s.chips)}
    <div class='hub-canvas'>
      ${spokeNodes}
      <div class='hub'>
        <div class='meta'>CORE PLATFORM</div>
        <div class='name'>${escapeHtml(hub)}</div>
        ${pillarsHtml}
      </div>
    </div>
    ${sourceLine(s.source)}
  </div>`;
}

function renderContentStoryboard(s: ContentSlide): string {
  if (!s.storyboard || !s.storyboard.length) {
    throw new Error(`content layout='storyboard' requires \`storyboard\` — slide title: ${s.title}`);
  }
  const cells = s.storyboard
    .map(
      (st, i) => `<div class='story-cell'>
      <div class='story-frame tone-${st.tone || 'neutral'}'>
        ${st.meta ? `<div class='story-meta'>${escapeHtml(st.meta)}</div>` : ''}
        <div class='story-body'>${escapeHtml(st.body)}</div>
      </div>
      <div class='story-caption'>${pad2(i + 1)} · ${escapeHtml(st.caption)}</div>
    </div>`,
    )
    .join('\n      ');
  return `<div class='body'>
    ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
    <h2>${escapeHtml(s.title)}</h2>
    ${chipRow(s.chips)}
    <div class='story-grid'>
      ${cells}
    </div>
    ${sourceLine(s.source)}
  </div>`;
}

function renderContentMatrix(s: ContentSlide): string {
  if (!s.matrix) {
    throw new Error(`content layout='matrix' requires \`matrix\` — slide title: ${s.title}`);
  }
  const m = s.matrix;
  const rows = m.rows
    .map(
      (r) => `<tr>
      <td class='dim'>${escapeHtml(r.dim)}</td>
      <td class='us'>${escapeHtml(r.us)}</td>
      <td class='them'>${escapeHtml(r.them)}</td>
    </tr>`,
    )
    .join('\n      ');
  return `<div class='body'>
    ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
    <h2>${escapeHtml(s.title)}</h2>
    <table class='matrix'>
      <thead><tr>
        <th class='dim'>維度</th>
        <th class='us'>${escapeHtml(m.us_label)}</th>
        <th class='them'>${escapeHtml(m.them_label)}</th>
      </tr></thead>
      <tbody>
      ${rows}
      </tbody>
    </table>
    ${sourceLine(s.source)}
  </div>`;
}

function renderContent(s: ContentSlide): string {
  const layout: ContentLayout = s.layout ?? (s.image ? 'left' : 'full');
  switch (layout) {
    case 'left':
    case 'right':       return renderContentLeftRight(s);
    case 'full':        return renderContentFull(s);
    case 'flow':        return renderContentFlow(s);
    case 'speakers':    return renderContentSpeakers(s);
    case 'pain':        return renderContentPain(s);
    case 'hub':         return renderContentHub(s);
    case 'storyboard':  return renderContentStoryboard(s);
    case 'matrix':      return renderContentMatrix(s);
  }
}

function renderStats(s: StatsSlide): string {
  const cells = s.stats
    .slice(0, 4)
    .map(
      (st) => `<div class='stat'>
      <div class='num${st.tone && st.tone !== 'plain' ? ' ' + st.tone : ''}'>${escapeHtml(st.value)}${
        st.unit ? `<span class='unit'>${escapeHtml(st.unit)}</span>` : ''
      }</div>
      <div class='label'>${escapeHtml(st.label)}</div>
      ${st.sub ? `<div class='sub'>${escapeHtml(st.sub)}</div>` : ''}
    </div>`,
    )
    .join('\n      ');
  return `<div class='body'>
    ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
    ${s.title ? `<h2>${escapeHtml(s.title)}</h2>` : ''}
    <div class='stat-grid'>
      ${cells}
    </div>
    ${sourceLine(s.source)}
  </div>`;
}

function renderQuote(s: QuoteSlide): string {
  return `<div class='body'>
    <div class='glyph'>"</div>
    <blockquote>${escapeHtml(s.quote)}</blockquote>
    <div class='author'>
      <span class='ctx-chip'>${escapeHtml(s.author.name)} · ${escapeHtml(s.author.title)}${
        s.context ? ' · ' + escapeHtml(s.context) : ''
      }</span>
    </div>
  </div>`;
}

function renderCTA(s: CTASlide): string {
  function action(a: { label: string; url: string; qr?: boolean }, primary: boolean): string {
    const cls = primary ? 'action primary' : 'action';
    const inner = a.qr
      ? `<div class='qr'>[ QR ]</div>
         <div class='lab'>${escapeHtml(a.label)}</div>
         <div class='url'>${escapeHtml(a.url)}</div>`
      : `<div class='lab'>${escapeHtml(a.label)}</div>
         <div class='url'>${escapeHtml(a.url)}</div>`;
    return `<a class='${cls}' href='${escapeHtml(a.url)}'${ext(a.url)}>${inner}</a>`;
  }
  return `<div class='body'>
    ${s.eyebrow ? `<span class='eyebrow'>${escapeHtml(s.eyebrow)}</span>` : ''}
    <h2>${escapeHtml(s.title)}</h2>
    ${s.body ? `<p class='body-copy'>${escapeHtml(s.body)}</p>` : ''}
    <div class='actions'>
      ${action(s.primary, true)}
      ${s.secondary ? action(s.secondary, false) : ''}
    </div>
    ${s.highlight ? `<div class='highlight'><span class='rc-chip solid-yellow'>${escapeHtml(s.highlight)}</span></div>` : ''}
  </div>`;
}

function renderEnd(s: EndSlide): string {
  return `<div class='body'>
    <div class='mega'>${escapeHtml(s.mega)}</div>
    ${s.footer ? `<div class='footer'>${escapeHtml(s.footer)}</div>` : ''}
  </div>`;
}

function renderSlideBody(s: Slide): string {
  switch (s.kind) {
    case 'cover':   return renderCover(s);
    case 'chapter': return renderChapter(s);
    case 'content': return renderContent(s);
    case 'stats':   return renderStats(s);
    case 'quote':   return renderQuote(s);
    case 'cta':     return renderCTA(s);
    case 'end':     return renderEnd(s);
  }
}

function classFor(s: Slide): string {
  switch (s.kind) {
    case 'cover':
      return `s-cover rc-bg-deep${(s as CoverSlide).image ? ' has-image' : ''}`;
    case 'chapter':
      return 's-chapter rc-bg-deep center';
    case 'content': {
      const layout = (s as ContentSlide).layout ?? ((s as ContentSlide).image ? 'left' : 'full');
      const substrate = layout === 'flow' || layout === 'speakers' || layout === 'storyboard' || layout === 'hub'
        ? 'rc-bg-deep'
        : 'rc-bg-light';
      return `s-content layout-${layout} ${substrate}`;
    }
    case 'stats': {
      const n = Math.max(1, Math.min(4, (s as StatsSlide).stats.length));
      return `s-stats cells-${n} rc-bg-deep`;
    }
    case 'quote':
      return 's-quote rc-bg-deep center';
    case 'cta':
      return 's-cta rc-bg-deep center';
    case 'end':
      return 's-end rc-bg-deep';
  }
}

function screenLabel(s: Slide, i: number): string {
  const num = pad2(i + 1);
  switch (s.kind) {
    case 'cover':   return `${num} Cover`;
    case 'chapter': return `${num} Chapter ${(s as ChapterSlide).numeral}`;
    case 'content': {
      const c = s as ContentSlide;
      return `${num} ${c.layout ?? 'content'} · ${c.title.slice(0, 16)}`;
    }
    case 'stats':   return `${num} Stats · ${(s as StatsSlide).stats.length} cell${(s as StatsSlide).stats.length > 1 ? 's' : ''}`;
    case 'quote':   return `${num} Quote`;
    case 'cta':     return `${num} CTA`;
    case 'end':     return `${num} End`;
  }
}

function renderSlide(s: Slide, i: number, brand: string, edition: string | undefined): string {
  return `<section class='slide ${classFor(s)}' data-screen-label='${escapeHtml(screenLabel(s, i))}' data-slide-kind='${s.kind}'>
${chromeStrip(brand, edition, s.kind.toUpperCase())}
${renderSlideBody(s)}
</section>`;
}

/* ------------------------------------------------------------------ *
 * top-level
 * ------------------------------------------------------------------ */

export async function renderDeck(inputs: RaccoonaiDeckInputs, tokensCss: string): Promise<string> {
  // CTA hard rule: max 1 cta per deck
  const ctaCount = inputs.slides.filter((s) => s.kind === 'cta').length;
  if (ctaCount > 1) {
    throw new Error(
      `Hard rule violated: a deck must contain at most ONE cta slide (found ${ctaCount}). ` +
        `Pick the strongest one; secondary actions go inside the cta's secondary field.`,
    );
  }

  const brand = inputs.brand.name;
  const edition = inputs.brand.edition;
  const slides = inputs.slides
    .map((s, i) => renderSlide(s, i, brand, edition))
    .join('\n  ');

  return [
    `<!DOCTYPE html>`,
    `<html lang='${inputs.brand.locale ?? 'zh-Hant'}'>`,
    `<head>`,
    `<meta charset='utf-8' />`,
    `<meta name='viewport' content='width=device-width, initial-scale=1' />`,
    `<title>${escapeHtml(inputs.deck_title)}</title>`,
    inputs.brand.description
      ? `<meta name='description' content='${escapeHtml(inputs.brand.description)}' />`
      : '',
    `<link rel='preconnect' href='https://fonts.googleapis.com' />`,
    `<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin />`,
    `<link href='https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;800;900&family=Urbanist:wght@400;500;700;800;900&family=Pontano+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap' rel='stylesheet' />`,
    `<style>`,
    `/* ---- raccoonai-deck tokens (inlined from assets/tokens.css) ---- */`,
    tokensCss,
    `/* ---- deck-specific layout (composed by scripts/compose.ts) ---- */`,
    DECK_CSS,
    `</style>`,
    `</head>`,
    `<body>`,
    `<div id='rc-deck'>`,
    `  ${slides}`,
    `</div>`,
    `<div class='rc-deck-progress' id='deck-progress' aria-hidden='true'></div>`,
    `<div class='rc-deck-counter'  id='deck-counter'>1 / ${inputs.slides.length}</div>`,
    `<div class='rc-deck-hint'>← / → · ESC overview · swipe</div>`,
    `<div class='rc-deck-nav' id='rc-deck-nav' role='tablist' aria-label='Slide navigation'></div>`,
    `<div class='rc-deck-overview' id='rc-deck-overview' aria-hidden='true'></div>`,
    RUNTIME_SCRIPT,
    `</body>`,
    `</html>`,
    ``,
  ].join('\n');
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

async function main(): Promise<void> {
  const [inPath, outPath] = process.argv.slice(2);
  if (!inPath || !outPath) {
    console.error('usage: compose.ts <inputs.json> <output.html>');
    process.exit(2);
  }
  const inAbs = isAbsolute(inPath) ? inPath : resolve(process.cwd(), inPath);
  const outAbs = isAbsolute(outPath) ? outPath : resolve(process.cwd(), outPath);

  const [rawInputs, tokensCss] = await Promise.all([
    readFile(inAbs, 'utf8'),
    readFile(TOKENS_CSS, 'utf8'),
  ]);
  const inputs = JSON.parse(rawInputs) as RaccoonaiDeckInputs;
  const html = await renderDeck(inputs, tokensCss);
  await mkdir(dirname(outAbs), { recursive: true });
  await writeFile(outAbs, html, 'utf8');
  console.log(`✓ wrote ${outAbs} (${inputs.slides.length} slides, scenario=${inputs.scenario})`);
}

const isMain = import.meta.url === `file://${process.argv[1]}` || import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
