---
name: raccoonai-deck
description: |
  RaccoonAI brand-locked HTML deck — single self-contained file with
  transform-track horizontal pagination (mirrors open-design-landing-deck
  / kami-deck), 7 slide kinds, 2 substrates, schema-driven composer.
  Two scenarios: product-launch keynote (大會場) and SalesKit (1:1 客戶
  提案). Brand colors / type / voice locked from
  creative/raigc_assets/brand/meta.yaml — do not invent palettes.
triggers:
  - "raccoonai deck"
  - "raccoon ai deck"
  - "產品發表會"
  - "product launch keynote"
  - "raccoonai keynote"
  - "saleskit"
  - "sales kit"
  - "業務簡報"
  - "客戶提案"
  - "raccoonai 簡報"
  - "raccoonai 投影片"
od:
  category: brand-deck
  surface: web
  mode: deck
  scenario: marketing
  featured: 3
  audience: prospects, investors, enterprise customers, partners
  tone: confident, premium, glass-modern
  scale: 8-15 viewport-locked slides
  preview:
    type: html
    entry: examples/keynote-2026.html
  design_system:
    requires: false
  brand:
    locked: true
    spec: "creative/raigc_assets/brand/meta.yaml"
    visual_reference: "creative/2026產品發表大會視覺/"
inputs:
  - id: scenario
    label: keynote (大會場) or saleskit (1:1 客戶提案)
    type: enum
    required: true
    values: [keynote, saleskit]
  - id: brand
    label: BrandBlock — name / mark / edition / locale (see schema.ts)
    schema_path: ./schema.ts#BrandBlock
  - id: deck_title
    label: Deck title shown in chrome (e.g. 'Raccoon AI · 產品發表會 2026')
  - id: slides
    label: Ordered list of typed slides (cover · chapter · content · stats · quote · cta · end)
    schema_path: ./schema.ts#Slide
parameters:
  slides_recommended_count:
    type: number
    default: 11
    description: 8-15 is the sweet spot. Below 6 = thin; above 18 = audience loses thread.
outputs:
  - path: <out>/index.html
    description: Self-contained HTML deck with brand tokens + DECK_CSS + transform-track runtime inlined.
capabilities_required:
  - file-write
  - node-runtime
example_prompt: |
  我想做一份簡報。
  議題:[REPLACE 用一句話描述 — 例如「對 6/3 來賓證明 Raccoon 不只是
        chatbot」、「Q3 行銷檢討給管理層」、「對新客戶提案客服效率方案」]

  你先依 references/narrative-design.md 剖析這議題需要的架構與內容
  (受眾 / 核心命題 / 必要證據 / 自然敘事弧 / 結構),把推論講出來
  跟我對齊,確認後再開始寫 inputs.json。不要直接套模板。
---

# raccoonai-deck — RaccoonAI Brand Deck

Single-file HTML deck for RaccoonAI's two presentation scenarios:
**product-launch keynote** (大會場) and **SalesKit** (1:1 客戶提案).
Schema-driven via `scripts/compose.ts`; visual language locked to the
2026 PC KV (deep-blue gradient · frosted glass · magenta/pink edge
glow · Urbanist + Noto Sans TC).

## Resource map

```
raccoonai-deck/
├── SKILL.md                         ← you're reading this
├── schema.ts                        ← TypeScript types for the 7 slide kinds
├── tsconfig.json
├── inputs.example.keynote.json      ← 12-slide keynote example input
├── inputs.example.saleskit.json     ← 9-slide saleskit example input
├── scripts/
│   └── compose.ts                   ← reads input + tokens.css → writes single HTML
├── assets/
│   ├── tokens.css                   ← brand variables (locked from meta.yaml)
│   ├── template.html                ← paste-block fallback (manual HTML authoring)
│   └── glass/
│       ├── glass-panel.png          ← KV reference (visual eye calibration)
│       ├── text-bubble.png          ← KV reference
│       ├── kv-2026-reference.png
│       └── kv-2025-speaker-reference.png
├── references/
│   ├── narrative-design.md          ← READ FIRST: 議題 → 剖析 → arc → beats → layout
│   ├── framework-rules.md           ← META-RULES: rhythm / type / data / chip / voice
│   ├── slide-kinds.md               ← DICTIONARY: 7 kinds × 9 content layout variants
│   ├── scenarios.md                 ← FALLBACK templates only — for stuck moments
│   └── checklist.md                 ← P0/P1/P2 self-review + smoke test
└── examples/
    ├── keynote-2026.html            ← composer-rendered from inputs.example.keynote.json
    └── saleskit-template.html       ← composer-rendered from inputs.example.saleskit.json
```

## Workflow

### Step 0 — Pre-flight (read in this order)

1. **`references/narrative-design.md` FIRST** — design order is 議題 →
   剖析 → arc → beats → layout. Without this you'll vend a template.
2. **`references/framework-rules.md`** — meta-rules: 2 substrates,
   type hierarchy, stats modes, chip 5 roles, voice DNA. The
   execution layer (after design is set).
3. **`schema.ts`** — the 7 kinds and content layout variants. This
   is the contract.
4. **`references/slide-kinds.md`** — dictionary. Look up after beats
   are decided, NOT before.
5. **Skim `references/scenarios.md`** — fallback rhythms when topic
   analysis is stuck. Don't open as Step 1.
6. **Open `assets/glass/kv-2026-reference.png`** — calibrate the eye.

### Step 1 — Open with ONE question

Ask the user, verbatim:

> **「你希望設計什麼議題的簡報?」**

That's it. Whatever shape the topic comes in, that shape is the
starting point.

### Step 2 — Analyze the topic out loud

Following `narrative-design.md` §1, infer five dimensions and say
them back to the user. Don't ask the five dimensions as five separate
questions — that's vending again.

```
我聽到的議題是「[reframe]」。
我的初步剖析:

受眾    | [推論]
立場    | [他們現在相信什麼]
核心命題 | [一句話 — 散場該記得的]
自然弧   | [arc 名] — 因為 [理由]

段落:
  ① [beat 名]    [N] 頁
  ② [beat 名]    [N] 頁
  ...
總計 [N] 頁(含封面)

我這樣抓對嗎?有什麼我漏掉的?
```

User corrects / OK's. **No HTML or JSON written yet.**

### Step 3 — Map beats to slide kinds

Query `references/slide-kinds.md` per the beat→layout mapping in
`narrative-design.md` §3. Show the kind sequence back to user:

```
01  cover                                [topic title]
02  content (speakers)                   beat ① 主講團隊
03  stats (1 cell mega)                  beat ② '78%' 認知缺口
04  content (pain)                       beat ② 你卡在哪
...
N   cta                                  行動
```

### Step 4 — Write `inputs.json` and run composer

```bash
# 1. Author inputs.json against schema.ts (start from the example)
cp inputs.example.keynote.json my-deck.json
# 2. Replace [REPLACE] / placeholder strings with real copy
# 3. Compose
npx tsx scripts/compose.ts my-deck.json out/index.html
```

The composer enforces structural rules (max 1 cta, source on stats,
substrate per kind). It does **not** check voice DNA — that's on you.

### Step 5 — Self-review

Run `references/checklist.md`:
- P0 brand iron rules (no banned classes, no banned colors, no fake
  logo wall, no banned words, max 1 cta)
- P0 content density (cover ≤ 4 zones, mockup ≤ 4 sub-elements, source
  on stats)
- Quick `grep` validations at the bottom

### Step 6 — Browser smoke test

Open the output in Chrome/Edge. The 7-second smoke test:

- `→` / Space / PageDown flip slides; counter + dot nav + progress update
- `←` / PageUp go back; `Home` / `End` jump to first / last
- `ESC` opens the overview grid; click any thumbnail to jump
- Trackpad burst (5 fast wheels) advances **one** slide, not five —
  the 700ms lock guards against overshoot
- Glass cards show frosted blur + magenta/pink edge leak
- `F5` reloads to slide 1 (no scroll-restore — keynote always opens at cover)
- Resize to half-width: text reflows, glass cards don't break

Report status to the user before declaring done.

### Nav contract (locked — do not rewrite)

The nav model is the transform-track pattern from
`open-design-landing-deck` and `kami-deck` — **not** native
`overflow-x: scroll` with scroll-snap. Native scroll fails as a
keynote because trackpad bursts skip multiple pages and there is no
overview / dot nav / lock. If you regenerate the runtime, match
`scripts/compose.ts` `RUNTIME_SCRIPT`:

- `body { overflow: hidden }` — native scroll fully disabled
- `#rc-deck` flex track moved by `transform: translateX(-idx * 100vw)`
- `go(n)` is the only entrypoint; 700ms lock guards wheel/touch/key burst
- Wheel accumulator threshold 60; touch threshold 50px
- `ESC` toggles overview; opening hides `#rc-deck` (no leaked content)
- Dot nav strip + counter + progress bar; no localStorage scroll-restore

## Hard rules — 7 do-nots

These are not preferences. The composer enforces some structurally;
the rest is on you.

1. **Do not** invent a third substrate. Only `rc-bg-deep` /
   `rc-bg-light`. The composer assigns substrate per kind; you do not
   pick. KV photographic moments use `rc-bg-deep` with optional
   `image` / `--rc-bg-image` hook.
2. **Do not** put speakers on cover. Cover does ONE job — define the
   deck. Speakers run in their own `content (speakers)` slide.
3. **Do not** use typography to fake a logo wall. Real client logo
   PNGs only. Until the brand-asset pipeline ships them, fall back to
   `stats` (quad) with metrics.
4. **Do not** mix two `cta` slides. Composer rejects. Secondary action
   goes in `cta.secondary`, not as a second slide.
5. **Do not** put UI mockups with > 4 sub-elements. Stage audience
   can't read 12px from row 30. Abstract / symbolic, not realistic.
6. **Do not** write banned words: `chatbot` / `機器人` / `革命性` /
   `顛覆性` / `自動化`. Voice DNA forbids — see `framework-rules.md §8`.
   This applies even in `matrix.them_label` (use `規則型客服`).
7. **Do not** ship a `stats` slide without `source`. Number without
   citation reads as decoration; trust drops.

## What this skill is NOT

- **Not a PDF exporter** — composer's `@media print` CSS handles
  Chrome → Print → Save as PDF. Open the rendered HTML and print.
- **Not a generic deck skill** — for non-RaccoonAI brands, use
  `kami-deck`, `open-design-landing-deck`, `simple-deck`, or
  `html-ppt-*`. This skill bakes RaccoonAI brand into the tokens.
- **Not Racco-character-enabled (yet)** — IP image pipeline is still
  maturing. When ready, add Racco hero-shots and an optional Racco
  image slot to `cover` / `quote` / `cta`. Tracked.
- **Not a python-pptx pipeline** — for editable .pptx output, see
  `pptx-html-fidelity-audit`.

## Sister skill — pending: `raccoonai-landing`

This skill currently owns its own brand `tokens.css`. When the sister
skill `raccoonai-landing` (RaccoonAI brand long-form landing page)
ships, it will become the source of truth for brand styles:

- `BrandBlock` interface moves from `raccoonai-deck/schema.ts` to the
  sister skill's `schema.ts`; this skill re-exports.
- `tokens.css` moves to `raccoonai-landing/styles.css`; the composer
  reads it via `readFile('../raccoonai-landing/styles.css')`.
- Image library (KV photo, glass primitives, future Racco hero-shots)
  moves to `raccoonai-landing/assets/`.

Mirror of how `open-design-landing-deck` reuses `open-design-landing`'s
stylesheet + 16-slot image library. Until then, this skill is
self-contained.

## Iteration log

### v4 phase 2-4 (2026-05-08, schema-driven rebuild)

After Phase 1 (nav model swap) the skill was still over-designed: 25
slide kinds, 5 substrates, paste-block authoring with no schema, no
sister skill. Sister skills `open-design-landing-deck` and `kami-deck`
gave the pattern: small kind count, two substrates, schema +
composer, sister-skill stylesheet share.

Changes:
- **schema.ts** added — 7 kinds (cover · chapter · content · stats ·
  quote · cta · end). `content` absorbs structured layouts via
  `layout` variant: left / right / full / flow / speakers / pain /
  hub / storyboard / matrix.
- **`scripts/compose.ts`** added — reads `inputs.json` + `tokens.css`
  → writes single self-contained HTML with `RUNTIME_SCRIPT` inlined.
  Composer enforces max-1-cta and substrate-per-kind structurally.
- **`inputs.example.{keynote,saleskit}.json`** added — canonical
  example inputs. Examples are now composer-rendered, not hand-written
  (no more drift between example and template).
- **`tokens.css` slimmed** — 5 substrate utilities → 2 (`rc-bg-deep`
  + `rc-bg-light`). Removed: `rc-bg-deep-stage`, `rc-bg-black`,
  `rc-bg-image-hero`, `rc-grid-mask`, `rc-glass-folded`, `rc-stat-num`
  legacy. KV image hook merged into `rc-bg-deep` via `--rc-bg-image`.
- **Hard rules 13 → 7** in "Do not" format, mirroring sister skills.
- **References rewritten**: `slide-kinds.md` aligned 1:1 with schema;
  `framework-rules.md` updated for 2-substrate / 1-stats-kind / 11-slide
  pacing; `scenarios.md` reframed as fallback templates.
- **Examples lag note removed** — examples are now generated, can't lag.
- **Sister skill marker added** — `raccoonai-landing` pending.

Phase 1 (2026-05-08, nav model swap):
- Replaced native `overflow-x: scroll-snap` with transform-track
  pattern from `open-design-landing-deck` / `kami-deck`. Trackpad
  burst now advances 1 slide, not 5; ESC overview added; dot nav
  strip added; localStorage scroll-restore removed. See `RUNTIME_SCRIPT`
  in `scripts/compose.ts`.

### v3 (2026-05-08, topic-first protocol)

- Added `references/narrative-design.md` — design order is 議題 →
  剖析 → arc → beats → layout, not the reverse.
- SKILL.md Step 1 reduced to ONE open question.
- Step 2 = analyze 5 dimensions out loud, no HTML written yet.
- `scenarios.md` reframed: "Fallback templates only".
- `slide-kinds.md` prefixed: "dictionary, not outline".

### v2 (2026-05-08, framework deepened)

- 14 → 25 slide kinds (split stats / feature; added hub-spoke /
  storyboard / matrix / etc.). [Reverted in v4 — too many.]
- KV assets wired into `rc-bg-deep-stage`. [Reverted in v4 — substrate
  bloat.]
- Stage readability minimums (CN ≥ 24px keynote body).
- Speaker notes hook + `S` key popup + `R` timer. [Kept in
  `assets/template.html` paste-block fallback.]
- `@media print` CSS so SalesKit can print to PDF.

### v1 (2026-05-08, initial cut)

14 slide kinds, 4 substrates, KV assets sitting unused.

## Brand source-of-truth

| What | Where | Sync direction |
|---|---|---|
| Color hex / typography stack | `creative/raigc_assets/brand/meta.yaml` | meta.yaml → tokens.css |
| Voice / forbidden words | same `meta.yaml` (voice section) | meta.yaml → framework-rules.md §8 |
| Design tokens (HSL form, app side) | `creative/raccoonui/design-systems/raccoonai/DESIGN.md` | DESIGN.md ↔ tokens.css (bidirectional) |
| Visual reference (KV) | `creative/2026產品發表大會視覺/` | KV → assets/glass/ (already copied) |
| Brand-locked styles (future) | `skills/raccoonai-landing/styles.css` | sister skill becomes the source when it ships |
| Racco character (future) | `creative/prompt-engine/brand/BRAND_KNOWLEDGE.md` | when Racco image slot ships |
