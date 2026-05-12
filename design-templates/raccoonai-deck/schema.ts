/**
 * raccoonai-deck — input schema.
 *
 * RaccoonAI brand-locked HTML deck for two scenarios:
 *   - 'keynote'  — 大會場 stage deck (大螢幕、後排座位)
 *   - 'saleskit' — 1:1 客戶提案 (筆電、近距離)
 *
 * Seven slide kinds. `content` is the workhorse — its `layout` variant
 * absorbs flow / speakers / pain / hub / storyboard / matrix so the kind
 * count stays small.
 *
 * Until the sister skill `raccoonai-landing` ships, brand identity is
 * defined here. When it lands, BrandBlock will move there and this file
 * will re-export.
 */

/* ---------- brand ---------- */

export interface BrandBlock {
  /** Brand display name — e.g. 'Raccoon AI'. */
  name: string;
  /** 1-2 letter chrome mark — e.g. 'R'. */
  mark?: string;
  /** Edition / context line — e.g. '2026 / Product Launch'. */
  edition?: string;
  /** HTML lang attribute. Defaults to 'zh-Hant'. */
  locale?: 'zh-Hant' | 'zh-Hans' | 'en' | 'ja';
  /** <meta name="description"> content. */
  description?: string;
}

/* ---------- shared substructures ---------- */

export interface FlowStep {
  /** Step number — '01 / 03'. */
  nb: string;
  title: string;
  body: string;
}

export interface Speaker {
  name: string;
  role: string;
  /** 2-letter initial fallback if no image — e.g. 'JS'. */
  initial?: string;
  /** Optional headshot URL or local path. */
  image?: string;
}

export interface PainEntry {
  /** Mono label — 'PAIN · 01'. */
  label: string;
  text: string;
}

export interface HubSpokeMap {
  /** Center label — 'Raccoon AI'. */
  hub: string;
  /** Optional sub-pillars inside the hub card. */
  hub_pillars?: string[];
  /** Spoke chips arranged around the hub. */
  spokes: string[];
}

export interface StoryStep {
  /** 1-line caption under the frame — '客戶開啟對話'. */
  caption: string;
  /** Mono meta inside the frame — 'CHAT · 14:23'. */
  meta?: string;
  /** 1-2 line dialogue / event inside the frame. */
  body: string;
  /** Optional accent — 'AI' / 'AGENT' / 'ORDER'. */
  tone?: 'neutral' | 'ai' | 'agent' | 'success';
}

export interface MatrixRow {
  dim: string;
  us: string;
  them: string;
}
export interface MatrixBlock {
  us_label: string;
  them_label: string;
  rows: MatrixRow[];
}

/* ---------- slide variants ---------- */

/** Cover — opening title plate. Speakers do NOT go here; use content layout='speakers'. */
export interface CoverSlide {
  kind: 'cover';
  /** Mono eyebrow — '2026 / RACCOON AI PRODUCT LAUNCH'. */
  eyebrow?: string;
  /** Main title — '產品發表會 2026'. */
  title: string;
  /** Subtitle / promise — '超越對話,定義新世代智能客服'. */
  subtitle?: string;
  /** Pillar pill row (3 chips × separators) — ['對話智能','數據驅動','多通路整合']. */
  pillars?: string[];
  /** Meta strip — '6/3 (三) 12:30-16:00 · 華南銀行國際會議中心 2F'. */
  meta?: string;
  /** Optional KV image URL. When set, becomes the slide background. */
  image?: string;
}

/** Chapter — divider between movements. Centered, minimal. */
export interface ChapterSlide {
  kind: 'chapter';
  /** Roman / arabic numeral — 'I' / 'II' / '03'. */
  numeral: string;
  title: string;
  /** Optional 1-line subhead. */
  lead?: string;
}

export type ContentLayout =
  | 'left'        // copy left, image right (default)
  | 'right'       // image left, copy right
  | 'full'        // copy only, no image
  | 'flow'        // 3-step pipeline (uses `flow`)
  | 'speakers'    // 4-up speaker row (uses `speakers`)
  | 'pain'        // pain-point list 1-3 (uses `pains`)
  | 'hub'         // hub-and-spoke integration (uses `hub_spoke`)
  | 'storyboard'  // 4-up sequence (uses `storyboard`)
  | 'matrix';     // comparison matrix (uses `matrix`)

/** Content — workhorse kind. `layout` variant decides the body structure. */
export interface ContentSlide {
  kind: 'content';
  eyebrow?: string;
  title: string;
  /** Default body paragraph (used when layout is left/right/full). */
  body?: string;
  /** Default bullets (used when layout is left/right/full). */
  bullets?: string[];
  /** Layout variant — defaults to 'left' if image is set, else 'full'. */
  layout?: ContentLayout;
  /** Image URL / path. Only used by left/right layouts. */
  image?: string;
  /** Top-of-content chip row (e.g. ['No-Code','Multi-Agent','LLM-Based']). */
  chips?: string[];
  /** Layout-specific payloads. Each layout reads exactly one of these. */
  flow?: FlowStep[];
  speakers?: Speaker[];
  pains?: PainEntry[];
  hub_spoke?: HubSpokeMap;
  storyboard?: StoryStep[];
  matrix?: MatrixBlock;
  /** Footnote / source citation — '客戶 cohort · 2025 H2'. */
  source?: string;
}

/** Stats — 1-4 cells. Cell visual weight auto-scales by count:
 *    1 cell  → mega (200-360px), single-stat hero
 *    2 cells → duo  (120-220px), dramatic comparison
 *    3-4     → quad ( 56- 96px), KPI grid
 */
export interface StatsSlide {
  kind: 'stats';
  eyebrow?: string;
  title?: string;
  stats: {
    value: string;
    /** Suffix — '%' / 'x' / '萬+' / '兆'. Sized smaller than value. */
    unit?: string;
    label: string;
    /** Smaller sub-line under the label. */
    sub?: string;
    /** Color tone — 'plain' (light blue), 'warm' (yellow), 'alert' (coral). */
    tone?: 'plain' | 'warm' | 'alert';
  }[];
  source?: string;
}

/** Quote — full-bleed pull quote. */
export interface QuoteSlide {
  kind: 'quote';
  quote: string;
  author: { name: string; title: string };
  /** Chip below the author — '美妝電商 · 2025 H2'. */
  context?: string;
}

/** CTA — closing action. Max ONE cta per deck (hard rule). */
export interface CTASlide {
  kind: 'cta';
  eyebrow?: string;
  title: string;
  body?: string;
  primary: { label: string; url: string; qr?: boolean };
  secondary?: { label: string; url: string; qr?: boolean };
  /** Highlight chip — '前 100 名免費試用 14 天'. */
  highlight?: string;
}

/** End — closing kicker word + colophon. Optional bookend. */
export interface EndSlide {
  kind: 'end';
  /** Big kicker — 'Thank You.' / '我們 6/3 見。'. */
  mega: string;
  footer?: string;
}

export type Slide =
  | CoverSlide
  | ChapterSlide
  | ContentSlide
  | StatsSlide
  | QuoteSlide
  | CTASlide
  | EndSlide;

/* ---------- top-level ---------- */

export type DeckScenario = 'keynote' | 'saleskit';

export interface RaccoonaiDeckInputs {
  $schema?: string;
  /** 'keynote' (大會場) tightens type-size minimums; 'saleskit' (1:1) relaxes them. */
  scenario: DeckScenario;
  brand: BrandBlock;
  /** Deck-wide title shown in the chrome counter line. */
  deck_title: string;
  slides: Slide[];
}
