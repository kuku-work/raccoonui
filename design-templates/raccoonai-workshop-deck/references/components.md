# Components — RaccoonAI Workshop Deck

The class system, tokens, and atomic-component specs. Use this as the reference when tweaking a slide that's already in place — for adding new slides, start from `layouts.md` skeletons.

## 1. Brand tokens

The deck is brand-locked to RaccoonAI design system. **Do not introduce new color hex values.** Six color tokens + four type stacks cover everything.

```css
:root{
  --ink:#142572;          /* RaccoonAI brand-primary navy */
  --ink-rgb:20,37,114;
  --paper:#FAFAF7;        /* Warm cream off-white */
  --paper-rgb:250,250,247;
  --paper-tint:#DCE3F8;   /* Echoes --page-bg-gradient end */
  --ink-tint:#1B2D7E;     /* Hover state of ink, also light-slide nb color */
  --accent:#FFC648;       /* RaccoonAI --accent-yellow, sole accent */
  --accent-rgb:255,198,72;

  --mono:"IBM Plex Mono",ui-monospace,monospace;
  --serif-en:"Urbanist","Pontano Sans",-apple-system,BlinkMacSystemFont,sans-serif;
  --serif-body-en:"Pontano Sans","Urbanist",-apple-system,sans-serif;
  --serif-zh:"Noto Sans TC","Source Han Sans TC","Microsoft JhengHei",sans-serif;
  --sans-zh:"Noto Sans TC","Source Han Sans TC","Microsoft JhengHei",sans-serif;
}
```

For alpha overlays the convention is `rgba(var(--ink-rgb), α)` — match the RaccoonAI design-system rule. Never `hsl(...)` or new hex codes.

### Accent budget

- 1 accent per slide is ideal, 2 is acceptable, 3 is over-budget.
- Accent uses: highlight word inside headline · accent border on one card · `flow-cell.accent` · `recap-card[style="border-color:var(--accent)"]`.
- Never use accent as a body-text color or on multiple competing elements in the same slide.
- **Accent on hero-light slides has low contrast on cream paper (~1.4:1)** — for accent on light hero, prefer `var(--ink-tint)` instead, save the actual amber for dark slides.

## 2. Typography

The four faces are loaded via one Google Fonts `<link>` already in `template.html`. The four stacks above map directly to roles:

| Role | Stack | Notes |
|---|---|---|
| 中文 / 中英混排 body / 標題 | `var(--sans-zh)` Noto Sans TC | Used for all Chinese, including headlines |
| 英文標題 / 大字 | `var(--serif-en)` Urbanist | "serif-en" naming is legacy; it's a sans variable font |
| 英文 inline body | `var(--serif-body-en)` Pontano Sans | When zh and en mix, zh wins via `--sans-zh` |
| Mono / meta / kicker | `var(--mono)` IBM Plex Mono | All-caps + letter-spacing for chrome / kicker |

### Type scale

| Class | Family | Size | Weight | Use |
|---|---|---|---|---|
| `.h-hero` | sans-zh | 8.4vw | 900 | Cover title, closing question (often overridden inline to 5.4-6vw for multi-line) |
| `.h-xl` | sans-zh | 5.2vw | 800 | Standard slide headline (2-line max) |
| `.h-sub` | sans-zh | 2.6vw | 500 | Sub-headline, opacity .78 |
| `.h-md` | sans-zh | 2.0vw | 700 | Inline mini-headline (rarely used) |
| `.h-hero-en` / `.h-xl-en` | serif-en (Urbanist) | inline | 800 | English-only display title |
| `.h-eyebrow-en` | serif-en | .85vw | 600 | English eyebrow, all-caps, .18em tracking |
| `.lead` | sans-zh | 1.55vw | 400 | Sub-headline / lead paragraph, opacity .82 |
| `.body-zh` | sans-zh | 1.18vw | 400 | Body paragraph after section header, opacity .82 |
| `.meta` | mono | .85vw | 400 | Mono uppercase meta text, .16em tracking |
| `.kicker` | mono | .78vw | 400 | All-caps eyebrow above headline, opacity .62 |

**Practical headline rules**:
- Chinese display titles (`.h-hero`, `.h-xl`) cap at 12 chars per line. Force breaks with `<br>` rather than auto-wrap.
- For section dividers, override `.h-hero` to `font-size:5.4-5.6vw; line-height:1.12-1.18` inline — full 8.4vw is too large for 2-line section thesis.
- Mixed zh/en in headlines: leave them inline, `--sans-zh` covers both (Noto Sans TC has Latin glyphs).

## 3. Chrome + Foot

Every slide has a `.chrome` (top brand row) + `.foot` (bottom counter). They are the deck's persistent identity.

```html
<div class="chrome">
  <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
  <div>[SECTION LABEL · stable across multiple pages in same section]</div>
</div>
<!-- ... main content ... -->
<div class="foot">
  <div>[PAGE-SPECIFIC ANCHOR · 1-line, can differ per slide]</div>
  <div>NN / TOTAL</div>
</div>
```

Logo files (committed to project `images/`):
- `images/logo-white.svg` · `images/logo-navy.svg` — wordmark
- `images/mark-white.svg` · `images/mark-navy.svg` — mark only

Rule: `logo-white` for `slide.dark` + `slide.hero.dark`, `logo-navy` for `slide.light` + `slide.hero.light`. Mark-only versions are for narrow chrome slots — not used in the current deck but available if you need a compact lockup.

**Chrome right-side label** should stay stable across the multiple pages within one section (e.g. "Section 2 · Prompt Anatomy" repeats on slides 8-14). The page-specific kicker goes inside `.kicker` underneath.

**Foot left** is page-specific — describe what the slide proves, in 6-12 Chinese chars or short EN.

## 4. Atomic components

### `.kicker` — eyebrow above headline

Mono uppercase, .3em tracking, opacity .62 by default. Override `style="color:var(--accent);opacity:1"` for accent kickers (typically on dark slides for emphasis).

### `.lead` — first paragraph after headline

Used as a sub-headline. Cap width to `max-width:55-68vw` so it doesn't span full width.

### `.body-zh` — paragraph after main content

Used to drop a one-sentence takeaway below cards / flow. Always `max-width:62-78vw`.

### `.meta-row` — inline meta tags below cover lead

Mono small caps with `.sep` (1×24px line) dividers between items. Used on cover only.

### `.callout` — quote / template prompt box

Left-bordered accent box. The container picks up surrounding theme (light slides get `rgba(var(--ink-rgb),.04)` background; dark slides get `rgba(var(--paper-rgb),.06)`). Add `.callout-src` inside as a mono uppercase source line.

### `.tag` — outlined pill (rarely used)

Small mono uppercase chip with 1px border. Use when you need a non-pill-row pill atom in custom layouts.

### `.rule` — horizontal divider

1px line with opacity .25, 3vh margin top/bottom. Use sparingly to separate intra-slide regions.

## 5. Layout cards

### `.ccard` (3-col or 4-col concept card)

Top-bordered card with EN term + zh term + 1-line description. **Top border is the visual anchor** — for accent emphasis, change the top border to `2px solid var(--accent)` and color the `.ccard-en` to accent.

```html
<div class="ccard">
  <div class="ccard-en">[English term]</div>
  <div class="ccard-zh">[中文]</div>
  <div class="ccard-desc">[1-sentence description.]</div>
</div>
```

The container `.grid-3` / `.grid-cols-4` controls column count.

### `.flow-cell` (3-stage or 4-stage horizontal flow)

Rounded card inside `.flow-row` or `.flow-row.k4`. Three theme variants:

- `.flow-cell` — neutral, hairline border
- `.flow-cell.accent` — amber border + tinted bg, `.ic` colored accent
- `.flow-cell.danger` — opacity .85 + red `.ic` color (#E24E24)

Inside each cell: `.ic` (mono small uppercase, "01 · INPUT" pattern) + `.ttl` (zh bold) + optional `.sub` (lighter description).

The `.flow-arr` between cells is just `→` — keep it lightweight, not a button.

### `.recap-card` (numbered chapter card)

Rounded card with big serif-EN number + zh title. Default border is hairline rgba; accent variant adds `style="border-color:var(--accent)"`. Light slides get `var(--ink-tint)` number color, dark slides get `var(--accent)`.

```html
<div class="recap-card">
  <div class="nb">01</div>
  <div class="ttl">[Card title]</div>
</div>
```

### `.nb-row` (numbered roadmap row)

3-col grid: `9vw | 1fr | 1fr`. Big accent number on left, key in middle, description on right. Top border + last child gets bottom border. Use for agendas, ordered roadmaps.

### `.vs-col` (comparison column inside `.grid-2-6-6`)

Left-bordered 3px column. Two variants:
- `.vs-col.dim` — opacity .55, used for the "Before / Bad / Surface" side
- `.vs-col` with `style="border-color:var(--accent)"` — used for "After / Better / Real" side

Inside: `.vs-tag` (mono kicker) + `.vs-h` (zh bold sub-headline) + `<ul>` with `.vs-col li` bullets (custom dash bullet via `::before`).

### `.pill-row` (surface vs real question)

2-col grid: `14vw | 1fr`. Left: a `.pill` containing `.pill-nb` (serif EN dimmed number) + label. Right: `.qq` (zh bold question).

### `.ladder` (horizontal numbered ladder)

`grid-template-columns:repeat(7,auto)` (4 step-pads + 3 arrows). Each `.step-pad` has a circular `.nb` (3.6vw diameter, 1.5px border, big serif-EN number) + `.lbl` (zh bold, two-line via `<br>`). First circle typically accent: `style="border-color:var(--accent);color:var(--accent)"`.

### `.ref-row` (source list)

2-col grid: `14vw | 1fr`. `.src` is serif-EN bold (source name); `.desc` is zh body. Hairline border top + final bottom border.

### `.stat-card` (big number with note)

Top-bordered stack: `.stat-label` (mono kicker) + `.stat-nb` (5.4vw serif-EN bold number) + `.stat-note` (zh body). Number can include `.stat-unit` inline for "12%", "200ms", etc.

Currently the workshop deck doesn't use this — it's available for product-launch / metric-heavy slides if you adapt the skill.

## 6. Grids

| Class | Layout | Use |
|---|---|---|
| `.grid-2-7-5` | 7fr + 5fr two-column | Wide text + narrow image |
| `.grid-2-6-6` | 1fr + 1fr two-column | Bad vs Better comparison |
| `.grid-2-8-4` | 8fr + 4fr two-column | Wide image + narrow text |
| `.grid-3` | 3 equal cols | 3-col concept cards |
| `.grid-3-3` | 3×N with `1fr` rows | Recap card grid (3xN) |
| `.grid-4` | 2 cols × 2 rows | Rarely used, 4-cell grid |
| `.grid-6` | 3 cols × 2 rows, content-centered | 6-cell mega grid (no current use) |
| `.grid-cols-4` | 4 equal cols | 4-col concept cards |
| `.grid-cols-5` | 5 equal cols | 5-stage pipeline alt |

All grids gap is `~3vw 4vh` (horizontal | vertical). Don't tighten — the breathing space is part of the editorial feel.

## 7. Pipeline (`.pipeline`)

Alternative to `.flow-row` for non-arrowed multi-step stacks. Default 5 columns; use `data-cols="3"` / `"4"` / `"6"` to change.

```html
<div class="pipeline-section">
  <div class="pipeline-label">[STEP GROUP LABEL]</div>
  <div class="pipeline" data-cols="3">
    <div class="step">
      <div class="step-nb">01</div>
      <div class="step-title">[Step name]</div>
      <div class="step-desc">[Description.]</div>
    </div>
    <!-- ... more steps -->
  </div>
</div>
```

Steps use top border + numbered eyebrow. Used when you have ≥4 atomic steps that don't fit `.flow-row` (which caps at 3-4 cells).

## 8. Image components

### `.frame` + grid modifiers

The main content `.frame` is a flex column that takes remaining height (`flex:1`). Add grid modifiers (`grid-2-7-5` etc.) to make it a CSS grid instead.

### `.frame-img`

Image container with 1px hairline border, 6px radius, slight bg tint per theme. Children `img` use `object-fit:cover; object-position:top center` by default — override to `object-fit:contain; object-position:center` for screenshots where you want the whole image visible.

### `.full-img`

Absolute-positioned 8vh × 6vw inset border container. Image gets `object-fit:contain`. Use for live-demo screenshots where chrome stays minimal.

### `.img-slot`

Dashed-border placeholder. Use when image isn't ready yet. Replace with `<img>` once asset arrives.

### `.img-cap`

Small mono uppercase caption below an image. .8vh top margin, opacity .6.

### Video embedding

```html
<video data-deck-video src="videos/clip.mov" poster="images/poster.jpg"
       preload="metadata" muted loop playsinline controls></video>
```

The `data-deck-video` attribute is **required** — the `go()` navigation function looks for it and auto-plays / pauses videos as you navigate. Without it the video plays once on load and never reacts to navigation.

## 9. Navigation behavior (deck framework)

The `go(n)` function (in `template.html` `<script>`) handles:
- Transform-translate the deck container by `-idx * 100vw`
- Toggle `body.light-bg` based on current slide's theme class (cross-fades WebGL bg)
- Update nav dots active state
- Play current slide's `<video data-deck-video>`, pause others
- Persist `idx` to `localStorage[STORE_KEY]`

The `STORE_KEY` is `'raccoonAi_workshop_deck_pos'` — **change this per deck** if you'll host multiple decks on the same origin, otherwise they'll restore each other's position.

ESC opens an overview grid (5-column thumbnail mosaic, each scaled to 1/5 of viewport). Click any thumb to jump.

Keyboard: ← → space pgUp/pgDown Home End. Wheel: vertical or horizontal, debounced 50px threshold. Touch: horizontal swipe 50px.

## 10. WebGL background

Two canvases (`#bg-dark` + `#bg-light`) render simultaneously, cross-fade via `opacity` on body class toggle. The shaders:

- `FS_DARK` — navy palette with low-chroma cool blues + warm amber spark, low intensity (`mix(base, col, 0.78)` blends with `vec3(0.078, 0.115, 0.32)`)
- `FS_LIGHT` — FBM noise mixing cream paper `vec3(0.980, 0.980, 0.970)` with brand-tint `vec3(0.864, 0.890, 0.972)`

Slide content overlays cover most of the bg via `.slide::before` (96% opacity on `light`, 93% on `dark`). The bg shows through more on `hero` slides where the cover drops to 32-55%.

**Don't edit the shaders unless you're explicitly changing brand mood.** They're tuned to look subtle behind content and dominant in hero slides — that's the entire system.
