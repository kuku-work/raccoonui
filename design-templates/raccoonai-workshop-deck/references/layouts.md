# Layouts — RaccoonAI Workshop Deck

16 paste-ready section skeletons. Copy whole `<section>` blocks into `index.html` between the existing samples and replace the bracketed placeholders. Do not invent new layouts — almost every workshop slide maps to one of these.

## Pre-flight class checklist

Before pasting any layout below, confirm `template.html` `<style>` block defines these classes (it does, out-of-the-box):

`h-hero` · `h-xl` · `h-sub` · `h-md` · `lead` · `body-zh` · `kicker` · `meta` · `meta-row` · `chrome` · `foot` · `frame` · `frame-img` · `img-cap` · `img-slot` · `full-img` · `tag` · `rule` · `callout` · `callout-src` · `cover-arc` · `arc-deco` · `section-num` · `stat-card` · `stat-label` · `stat-nb` · `stat-unit` · `stat-note` · `nb-row` (`.nb` `.k` `.v`) · `pipeline-section` · `pipeline-label` · `pipeline` (with `data-cols`) · `step` · `step-nb` · `step-title` · `step-desc` · `ccard` (`.ccard-en` `.ccard-zh` `.ccard-desc`) · `vs-col` (`.dim` · `.vs-tag` · `.vs-h`) · `pill-row` (`.pill` · `.pill-nb` · `.qq`) · `flow-row` (`.k4` modifier) · `flow-cell` (`.accent` · `.danger` · `.ic` · `.ttl` · `.sub`) · `flow-arr` · `ladder` (`.step-pad` · `.nb` · `.lbl` · `.arr`) · `recap-card` (`.nb` · `.ttl`) · `ref-row` (`.src` · `.desc`) · `grid-2-7-5` · `grid-2-6-6` · `grid-2-8-4` · `grid-3` · `grid-3-3` · `grid-4` · `grid-6` · `grid-cols-4` · `grid-cols-5`

If any class is missing, the layout will fall back to default styling and look broken — fix the template, not the slide.

## Theme rhythm rules (read first)

Every `<section>` carries one of four theme classes:

| Class | Use |
|---|---|
| `slide light` | Light cream content page · default 60-65% of deck |
| `slide dark` | Dark navy content page · alternates with light to create breathing rhythm |
| `slide hero light` | Light hero (section divider, takeaway, recap) · WebGL bg shows through |
| `slide hero dark` | Dark hero (cover, big claim, closing question) · WebGL bg shows through |

**Hard rules**:
- Never 3+ consecutive same-theme slides
- Every 3-4 content slides, insert a hero (light or dark)
- ≥8-slide deck must have ≥1 `hero dark` AND ≥1 `hero light`
- Cover (slide 01) → always `hero dark`
- Closing question / recap → mix of `hero dark` and `hero light`
- Section dividers (numbered) → typically `hero dark`, but breaking up with one `hero light` is good

## Image / video placeholder convention

Drop screenshots / videos under `images/` and `videos/` (sibling of `index.html`). Reference by relative path:

```html
<img src="images/your-screenshot.jpg" alt="...">
<video data-deck-video src="videos/your-clip.mov" poster="images/your-poster.jpg"
       muted loop playsinline controls preload="metadata"></video>
```

The `data-deck-video` attribute is required — `go()` watches for it and auto-plays / pauses videos as the user navigates between slides. Without it the video will autoplay on load and never stop.

For positions that need an image you don't have yet, drop in a dashed placeholder:

```html
<div class="img-slot">
  <span class="label">[01 Cover Screenshot]</span>
  <span class="hint">Drop 1920×1080 PNG into images/ and replace this div</span>
</div>
```

---

## L01 · Cover (hero dark)

The opening page. Logo top-left, accent kicker, oversized title, lead, meta-row with italic English tagline.

```html
<section class="slide hero dark" data-screen-label="01 Cover">
  <div class="cover-arc"></div>
  <div class="cover-arc b"></div>
  <div class="chrome">
    <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
    <div>[EVENT · YYYY.MM]</div>
  </div>
  <div class="frame" style="display:grid;gap:5vh;align-content:center;min-height:78vh">
    <div class="kicker" style="color:var(--accent);opacity:1">[KICKER · 講師版 / Edition]</div>
    <h1 class="h-hero" style="font-size:9.4vw">[主標 ≤ 12 字<br>可換行]</h1>
    <p class="lead" style="max-width:62vw;font-size:1.85vw;opacity:.88">
      [副標 12-28 字 · 一句話傳遞主論點]
    </p>
    <div class="meta-row" style="margin-top:1vh">
      <span class="en-italic" style="font-size:1.1vw">[en-italic tagline · short]</span>
      <span class="sep" style="width:32px;height:1px;background:currentColor;opacity:.4;display:inline-block"></span>
      <span>[Speaker / Org]</span>
    </div>
  </div>
  <div class="foot">
    <div>[Deck name]</div>
    <div>01 / [TOTAL]</div>
  </div>
</section>
```

## L02 · 3-stage flow / promise (light or dark)

Workshop premise + 3-cell `→` flow (INPUT → JUDGE → OUTPUT). Middle cell typically accent.

```html
<section class="slide light" data-screen-label="02 Promise">
  <div class="chrome">
    <div class="brand"><img src="images/logo-navy.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL]</div>
  </div>
  <div class="frame" style="padding-top:5vh">
    <div class="kicker">[Page kicker]</div>
    <h2 class="h-xl" style="max-width:80vw">[主張一句話 · 可帶 <span style="color:var(--accent)">accent</span> 重點]</h2>

    <div class="flow-row" style="margin-top:7vh;max-width:90vw">
      <div class="flow-cell">
        <div class="ic">01 · INPUT</div>
        <div class="ttl">[輸入]</div>
        <div class="sub">[一句說明]</div>
      </div>
      <div class="flow-arr">→</div>
      <div class="flow-cell accent">
        <div class="ic">02 · JUDGE</div>
        <div class="ttl">[判斷]</div>
        <div class="sub">[一句說明]</div>
      </div>
      <div class="flow-arr">→</div>
      <div class="flow-cell">
        <div class="ic">03 · OUTPUT</div>
        <div class="ttl">[輸出]</div>
        <div class="sub">[一句說明]</div>
      </div>
    </div>

    <p class="body-zh" style="margin-top:6vh;max-width:62vw">[Optional · narrative paragraph below the flow]</p>
  </div>
  <div class="foot">
    <div>[Foot label]</div>
    <div>02 / [TOTAL]</div>
  </div>
</section>
```

For 4-stage flow, add `k4` class to `.flow-row` and append a 4th `.flow-cell` + `.flow-arr` pair. See L09.

## L03 · Numbered roadmap (5 nb-rows)

Used as agenda / table of contents. Each row is `nb (1-2 digit) | key (zh) | value description (zh)`. 3-col grid.

```html
<section class="slide dark" data-screen-label="03 Roadmap">
  <div class="chrome">
    <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL]</div>
  </div>
  <div class="frame" style="padding-top:4vh">
    <div class="kicker" style="color:var(--accent);opacity:1">Roadmap · 路線圖</div>
    <h2 class="h-xl" style="margin-bottom:1vh">[Roadmap title]</h2>
    <p class="lead" style="max-width:55vw;margin-bottom:3vh">[一句概括 · 將要走過的路徑]</p>

    <div style="margin-top:2vh">
      <div class="nb-row">
        <div class="nb">01</div>
        <div class="k">[Step name]</div>
        <div class="v">[One-sentence description]</div>
      </div>
      <div class="nb-row">
        <div class="nb">02</div>
        <div class="k">[Step name]</div>
        <div class="v">[One-sentence description]</div>
      </div>
      <div class="nb-row">
        <div class="nb">03</div>
        <div class="k">[Step name]</div>
        <div class="v">[One-sentence description]</div>
      </div>
      <div class="nb-row">
        <div class="nb">04</div>
        <div class="k">[Step name]</div>
        <div class="v">[One-sentence description]</div>
      </div>
      <div class="nb-row">
        <div class="nb">05</div>
        <div class="k">[Step name]</div>
        <div class="v">[One-sentence description]</div>
      </div>
    </div>
  </div>
  <div class="foot">
    <div>[Foot label]</div>
    <div>03 / [TOTAL]</div>
  </div>
</section>
```

## L04 · Section divider (hero dark or hero light)

Giant section number on left, title + kicker + lead on right. Used between every major section.

```html
<section class="slide hero dark" data-screen-label="04 Section N">
  <div class="arc-deco"></div>
  <div class="arc-deco b"></div>
  <div class="chrome">
    <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
    <div>Section · 0[N] / [TOTAL_SECTIONS]</div>
  </div>
  <div class="frame" style="display:grid;grid-template-columns:auto 1fr;gap:5vw;align-items:center;min-height:78vh">
    <div class="section-num">0[N]</div>
    <div style="display:flex;flex-direction:column;gap:3vh;max-width:55vw">
      <div class="kicker" style="color:var(--accent);opacity:1">Section [N] · [EN section name]</div>
      <h1 class="h-hero" style="font-size:5.4vw;line-height:1.12">
        [Section thesis 1-2 lines<br>可帶 <span style="color:var(--accent)">accent</span> 強調。]
      </h1>
      <p class="lead" style="max-width:48vw">[One-sentence subtitle.]</p>
    </div>
  </div>
  <div class="foot">
    <div>Section [N] of [TOTAL_SECTIONS]</div>
    <div>04 / [TOTAL]</div>
  </div>
</section>
```

**Light variant**: change to `hero light`, replace `arc-deco / arc-deco b` with `<div class="arc-deco c" style="opacity:.18"></div>`, swap logo to `logo-navy.svg`, remove `color:var(--accent)` from kicker (keep monochrome), set `.section-num` color via inline `style="color:var(--ink-tint);opacity:.92"`.

## L05 · Mental model demo / interactive mock UI (light)

A custom inline mock (phone, IDE, chat input, etc.) demonstrating a concept. The pattern: title + a freeform mock UI block + closing narrative paragraph.

```html
<section class="slide light" data-screen-label="05 Demo">
  <div class="chrome">
    <div class="brand"><img src="images/logo-navy.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL]</div>
  </div>
  <div class="frame" style="padding-top:5vh">
    <div class="kicker">[Demo kicker]</div>
    <h2 class="h-xl" style="max-width:88vw">[Demo headline — 描述要展示什麼]</h2>

    <div style="margin-top:6vh;display:flex;flex-direction:column;gap:3vh;align-items:flex-start;max-width:88vw">
      <!-- Replace the mock below with any custom UI:
           phone autocomplete · chat input · IDE snippet · screenshot region -->
      <div style="font-family:var(--sans-zh);font-weight:600;font-size:2.6vw;padding:2.6vh 3vw;border:1px solid currentColor;border-color:rgba(var(--ink-rgb),.25);border-radius:14px;background:rgba(255,255,255,.6);box-shadow:0 1px 2px rgba(var(--ink-rgb),.05)">
        [Mock input · placeholder line]<span style="color:var(--ink-tint);opacity:.32;letter-spacing:.1em">＿＿＿＿＿＿</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.2vw;width:100%;max-width:78vw">
        <div style="padding:1.6vh 1.4vw;border-radius:999px;border:1px solid rgba(var(--ink-rgb),.35);font-family:var(--sans-zh);font-weight:600;font-size:1.4vw;background:rgba(var(--ink-rgb),.04);display:flex;align-items:center;justify-content:center;gap:.6em">
          <span class="en" style="opacity:.55;font-weight:600">1.</span> [option]
        </div>
        <div style="padding:1.6vh 1.4vw;border-radius:999px;border:1px solid rgba(var(--ink-rgb),.35);font-family:var(--sans-zh);font-weight:600;font-size:1.4vw;background:rgba(var(--ink-rgb),.04);display:flex;align-items:center;justify-content:center;gap:.6em">
          <span class="en" style="opacity:.55;font-weight:600">2.</span> [option]
        </div>
        <div style="padding:1.6vh 1.4vw;border-radius:999px;border:1.5px solid var(--accent);font-family:var(--sans-zh);font-weight:700;font-size:1.4vw;background:rgba(var(--accent-rgb),.16);display:flex;align-items:center;justify-content:center;gap:.6em;color:var(--ink)">
          <span class="en" style="opacity:.6;font-weight:700">3.</span> [accent option]
        </div>
      </div>
    </div>

    <p class="body-zh" style="margin-top:5vh;max-width:62vw">[Narrative · what the demo proves]</p>
  </div>
  <div class="foot">
    <div>[Foot label]</div>
    <div>05 / [TOTAL]</div>
  </div>
</section>
```

The accent on one of the chips/pills is the slide's focal point — keep exactly ONE accent per slide.

## L06 · 3-col concept cards (light or dark)

`grid-3` with three `.ccard` blocks. Each card: English term + Chinese term + 1-sentence description. The most reusable workhorse layout.

```html
<section class="slide dark" data-screen-label="06 Concepts">
  <div class="chrome">
    <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL]</div>
  </div>
  <div class="frame" style="padding-top:5vh">
    <div class="kicker" style="color:var(--accent);opacity:1">[Page kicker]</div>
    <h2 class="h-xl" style="max-width:84vw">[Headline — 1-2 lines]</h2>

    <div class="grid-3" style="margin-top:6vh">
      <div class="ccard">
        <div class="ccard-en">[Concept EN]</div>
        <div class="ccard-zh">[概念中文]</div>
        <div class="ccard-desc">[1-sentence description.]</div>
      </div>
      <div class="ccard">
        <div class="ccard-en">[Concept EN]</div>
        <div class="ccard-zh">[概念中文]</div>
        <div class="ccard-desc">[1-sentence description.]</div>
      </div>
      <div class="ccard">
        <div class="ccard-en">[Concept EN]</div>
        <div class="ccard-zh">[概念中文]</div>
        <div class="ccard-desc">[1-sentence description.]</div>
      </div>
    </div>

    <p class="body-zh" style="margin-top:5vh;max-width:68vw">[Optional · takeaway one-liner]</p>
  </div>
  <div class="foot">
    <div>[Foot label]</div>
    <div>06 / [TOTAL]</div>
  </div>
</section>
```

To make ONE card the accent: add `style="border-top:2px solid var(--accent)"` on the `.ccard` and `style="color:var(--accent)"` (dark) or `style="color:var(--ink-tint)"` (light) on its `.ccard-en`.

## L07 · Takeaway / hero with embedded flow (hero light or hero dark)

Closing line for a section. Hero-flavored, with a 3-stage flow embedded below the headline (typically `danger → mid → accent` to show transformation).

```html
<section class="slide hero light" data-screen-label="07 Takeaway">
  <div class="arc-deco c"></div>
  <div class="chrome">
    <div class="brand"><img src="images/logo-navy.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL · Takeaway]</div>
  </div>
  <div class="frame" style="display:grid;gap:6vh;align-content:center;min-height:78vh">
    <div class="kicker">[Takeaway kicker · 帶走一句話]</div>
    <h1 class="h-hero" style="font-size:6vw;max-width:80vw">
      [Closing claim — can include<br><span style="color:var(--accent)">accent emphasis</span>.]
    </h1>
    <p class="lead" style="max-width:62vw;font-size:1.7vw">
      [Supporting sentence with <span class="en-italic">italic phrase</span> if natural.]
    </p>

    <div class="flow-row" style="margin-top:3vh;max-width:90vw">
      <div class="flow-cell danger">
        <div class="ic">01 · IN</div>
        <div class="ttl">[Starting state]</div>
      </div>
      <div class="flow-arr">→</div>
      <div class="flow-cell">
        <div class="ic">02 · MID</div>
        <div class="ttl">[Transition]</div>
      </div>
      <div class="flow-arr">→</div>
      <div class="flow-cell accent">
        <div class="ic">03 · OUT</div>
        <div class="ttl">[Outcome]</div>
      </div>
    </div>
  </div>
  <div class="foot">
    <div>[Section · Takeaway]</div>
    <div>07 / [TOTAL]</div>
  </div>
</section>
```

## L08 · Bad vs Better comparison (`grid-2-6-6`, light or dark)

Two `.vs-col`: left is `dim` (the bad approach), right has `border-color:var(--accent)` (the recommended approach). Each side has tag + heading + bullet list.

```html
<section class="slide light" data-screen-label="08 Bad vs Better">
  <div class="chrome">
    <div class="brand"><img src="images/logo-navy.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL]</div>
  </div>
  <div class="frame" style="padding-top:4vh">
    <div class="kicker">[Page kicker · Bad vs Better]</div>
    <h2 class="h-xl" style="margin-bottom:1vh">[Headline · 比較的核心命題]</h2>

    <div class="grid-2-6-6" style="margin-top:4vh;gap:3vw 4vh">
      <div class="vs-col dim">
        <div class="vs-tag">Before · 無效</div>
        <div class="vs-h">[Bad approach name]</div>
        <ul>
          <li>[Bad bullet 1]</li>
          <li>[Bad bullet 2]</li>
        </ul>
      </div>
      <div class="vs-col" style="border-color:var(--accent)">
        <div class="vs-tag" style="color:var(--ink-tint)">After · 高效</div>
        <div class="vs-h">[Better approach name]</div>
        <ul>
          <li>[Better bullet 1]</li>
          <li>[Better bullet 2]</li>
          <li>[Better bullet 3]</li>
          <li>[Better bullet 4]</li>
        </ul>
      </div>
    </div>
  </div>
  <div class="foot">
    <div>[Foot label]</div>
    <div>08 / [TOTAL]</div>
  </div>
</section>
```

**Dark variant**: `.vs-tag` accent color is `var(--accent)` (cream paper changes contrast).

## L09 · 4-col concept cards (`grid-cols-4`, dark or light)

Same atom as L06 but with 4 columns. Useful when you need an "escalation" pattern (Prompt → Template → Project → Tool) — final card is accent.

```html
<section class="slide dark" data-screen-label="09 Anatomy">
  <div class="chrome">
    <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL]</div>
  </div>
  <div class="frame" style="padding-top:5vh">
    <div class="kicker" style="color:var(--accent);opacity:1">[Kicker · 結構 / Anatomy]</div>
    <h2 class="h-xl" style="max-width:88vw">[標題 · 切出 <span style="color:var(--accent)">N 個區塊</span>]</h2>

    <div class="grid-cols-4" style="margin-top:6vh">
      <div class="ccard">
        <div class="ccard-en">[Slot 1 EN]</div>
        <div class="ccard-zh">[區塊 1]</div>
        <div class="ccard-desc">[One line.]</div>
      </div>
      <div class="ccard">
        <div class="ccard-en">[Slot 2 EN]</div>
        <div class="ccard-zh">[區塊 2]</div>
        <div class="ccard-desc">[One line.]</div>
      </div>
      <div class="ccard">
        <div class="ccard-en">[Slot 3 EN]</div>
        <div class="ccard-zh">[區塊 3]</div>
        <div class="ccard-desc">[One line.]</div>
      </div>
      <div class="ccard" style="border-top:2px solid var(--accent)">
        <div class="ccard-en" style="color:var(--accent)">[Slot 4 EN]</div>
        <div class="ccard-zh">[區塊 4 · 強調]</div>
        <div class="ccard-desc">[One line.]</div>
      </div>
    </div>

    <p class="body-zh" style="margin-top:5vh;max-width:78vw">
      [Optional · pro tip · 可使用 <code style="font-family:var(--mono);font-size:.95em;padding:.1em .35em;background:rgba(var(--paper-rgb),.1);border-radius:3px">###</code> 標記語法。]
    </p>
  </div>
  <div class="foot">
    <div>[Foot label]</div>
    <div>09 / [TOTAL]</div>
  </div>
</section>
```

## L10 · Full-bleed image + caption above/below (light or dark, slim padding)

For chat screenshots, demo recordings, before/after photos. **Section padding shrinks** (`padding:3vh 4vw 3vh 4vw`) to maximize media area to ~70% of viewport height.

```html
<section class="slide dark" data-screen-label="10 Case Study" style="padding:3vh 4vw 3vh 4vw">
  <div class="chrome">
    <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL]</div>
  </div>
  <div style="display:flex;align-items:baseline;gap:1.6vw;margin-top:1vh;margin-bottom:.9vh;flex-wrap:nowrap">
    <span class="kicker" style="color:var(--accent);opacity:1;margin:0;flex:0 0 auto">[Kicker]</span>
    <span style="font-family:var(--sans-zh);font-weight:700;font-size:1.55vw;line-height:1.2;min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">[Inline headline · one line, ≤ 28 字]</span>
    <span class="meta" style="opacity:.55;white-space:nowrap;flex:0 0 auto">[Meta tag · short]</span>
  </div>
  <figure class="frame-img" style="flex:1 1 0;min-height:0;background:#1b1c1d;border-radius:6px;margin:0">
    <!-- For static image: -->
    <img src="images/your-screenshot.jpg" alt="[description]" style="width:100%;height:100%;object-fit:contain;object-position:center;display:block;image-rendering:auto">
    <!-- For video, replace <img> above with this: -->
    <!--
    <video data-deck-video src="videos/your-clip.mov" poster="images/your-poster.jpg"
           preload="metadata" muted loop playsinline controls
           style="width:100%;height:100%;object-fit:contain;object-position:center;background:#1b1c1d;display:block"></video>
    -->
  </figure>
  <div style="display:flex;align-items:baseline;gap:1.4vw;margin-top:.9vh;flex-wrap:nowrap">
    <span style="font-family:var(--sans-zh);font-weight:500;font-size:max(11px,.86vw);line-height:1.4;opacity:.78;font-style:italic;border-left:2px solid var(--accent);padding-left:.8vw;flex:1;min-width:0">[左下角 · prompt 摘要或來源敘述]</span>
    <span style="font-family:var(--sans-zh);font-weight:500;font-size:max(11px,.86vw);line-height:1.4;opacity:.82;flex:0 0 auto;text-align:right">→ [右下角 · 結論 · 結果]</span>
  </div>
  <div class="foot" style="margin-top:.8vh">
    <div>[Foot label]</div>
    <div>10 / [TOTAL]</div>
  </div>
</section>
```

**Light variant**: change to `slide light`, swap logo to `logo-navy.svg`, change `background:#1b1c1d` on figure to `rgba(var(--ink-rgb),.04)`, set the right-side `→ accent` text to use `var(--ink-tint)` instead of accent.

**Video performance**: `<video>` lazy-loads metadata only until you navigate to that slide; first visit may show a 0.5–1s buffer.

## L11 · Surface vs Real (pill-row, 3 rows, light)

Three pill-rows. Left column: pill labeled with `pill-nb` + short surface task. Right column: the real question to ask.

```html
<section class="slide light" data-screen-label="11 Surface vs Real">
  <div class="chrome">
    <div class="brand"><img src="images/logo-navy.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL]</div>
  </div>
  <div class="frame" style="padding-top:4vh">
    <div class="kicker">[Page kicker · Surface vs Real]</div>
    <h2 class="h-xl" style="max-width:88vw">[Headline — 表面 vs 真正要判斷的事]</h2>

    <div style="margin-top:5vh">
      <div class="pill-row">
        <div><span class="pill"><span class="pill-nb">01</span>[Surface task]</span></div>
        <div class="qq">[Real question to actually ask?]</div>
      </div>
      <div class="pill-row">
        <div><span class="pill"><span class="pill-nb">02</span>[Surface task]</span></div>
        <div class="qq">[Real question to actually ask?]</div>
      </div>
      <div class="pill-row">
        <div><span class="pill"><span class="pill-nb">03</span>[Surface task]</span></div>
        <div class="qq">[Real question to actually ask?]</div>
      </div>
    </div>
  </div>
  <div class="foot">
    <div>[Foot label]</div>
    <div>11 / [TOTAL]</div>
  </div>
</section>
```

Use `vs` separator inside `.qq` for "A vs B" framing: `<span style="opacity:.4;margin:0 .4em">vs</span>`.

## L12 · Question ladder (horizontal circle steps + callout, dark)

4-step circular ladder with arrows between steps, followed by a `.callout` template prompt. First circle is accent-bordered to mark the entry point.

```html
<section class="slide dark" data-screen-label="12 Ladder">
  <div class="chrome">
    <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
    <div>[SECTION LABEL]</div>
  </div>
  <div class="frame" style="padding-top:5vh">
    <div class="kicker" style="color:var(--accent);opacity:1">[Kicker · Template / 句型]</div>
    <h2 class="h-xl" style="max-width:88vw">[Headline · 4 個動作的順序]</h2>

    <div class="ladder">
      <div class="step-pad">
        <div class="nb" style="border-color:var(--accent);color:var(--accent)">1</div>
        <div class="lbl">[Step 1<br>label]</div>
      </div>
      <div class="arr">→</div>
      <div class="step-pad">
        <div class="nb">2</div>
        <div class="lbl">[Step 2<br>label]</div>
      </div>
      <div class="arr">→</div>
      <div class="step-pad">
        <div class="nb">3</div>
        <div class="lbl">[Step 3<br>label]</div>
      </div>
      <div class="arr">→</div>
      <div class="step-pad">
        <div class="nb">4</div>
        <div class="lbl">[Step 4<br>label]</div>
      </div>
    </div>

    <div class="callout" style="margin-top:5vh;max-width:78vw">
      [Template prompt · 可直接複製給聽眾的句型]
      <div class="callout-src">— Template prompt · [optional source]</div>
    </div>
  </div>
  <div class="foot">
    <div>[Foot label]</div>
    <div>12 / [TOTAL]</div>
  </div>
</section>
```

## L13 · Recap / numbered cards (3xN grid, hero light typical)

3-column grid of `.recap-card`. Final card typically accent-bordered. Used for chapter recaps and end-of-deck summaries.

```html
<section class="slide hero light" data-screen-label="13 Recap">
  <div class="arc-deco c" style="opacity:.16"></div>
  <div class="chrome">
    <div class="brand"><img src="images/logo-navy.svg" alt="Raccoon AI"></div>
    <div>[Workshop · Recap]</div>
  </div>
  <div class="frame" style="padding-top:4vh">
    <div class="kicker">Recap · 快速總複習</div>
    <h2 class="h-xl" style="max-width:88vw;color:var(--ink)">[Recap headline — 把 N 個動作框起來]</h2>

    <div style="margin-top:5vh;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:auto auto;gap:1.6vh 1.4vw">
      <div class="recap-card"><div class="nb">01</div><div class="ttl">[動作 1]</div></div>
      <div class="recap-card"><div class="nb">02</div><div class="ttl">[動作 2]</div></div>
      <div class="recap-card"><div class="nb">03</div><div class="ttl">[動作 3]</div></div>
      <div class="recap-card"><div class="nb">04</div><div class="ttl">[動作 4]</div></div>
      <div class="recap-card" style="border-color:var(--accent)"><div class="nb" style="color:var(--ink-tint)">05</div><div class="ttl">[動作 5 · 強調]</div></div>
      <div></div>
    </div>
  </div>
  <div class="foot">
    <div>[Recap · N 件事帶走]</div>
    <div>13 / [TOTAL]</div>
  </div>
</section>
```

Use `repeat(3,1fr)` for 5-6 cards, `repeat(4,1fr)` for 7-8. Leave trailing `<div></div>` empty cells to balance the last row.

## L14 · Sources / references list (dark)

Title + lead + 4 `.ref-row` (source name in serif EN + description in zh) + raw URL footer in mono.

```html
<section class="slide dark" data-screen-label="14 Sources">
  <div class="chrome">
    <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
    <div>[Workshop · Sources]</div>
  </div>
  <div class="frame" style="padding-top:4vh">
    <div class="kicker" style="color:var(--accent);opacity:1">Sources · 來源與延伸閱讀</div>
    <h2 class="h-xl" style="max-width:88vw">[Sources headline]</h2>
    <p class="lead" style="max-width:65vw;margin-top:1.4vh;opacity:.78">
      [One sentence · what these sources have in common]
    </p>

    <div style="margin-top:4vh">
      <div class="ref-row">
        <div class="src">[Source name]</div>
        <div class="desc">[1-2 sentence description.]</div>
      </div>
      <div class="ref-row">
        <div class="src">[Source name]</div>
        <div class="desc">[1-2 sentence description.]</div>
      </div>
      <div class="ref-row">
        <div class="src">[Source name]</div>
        <div class="desc">[1-2 sentence description.]</div>
      </div>
      <div class="ref-row">
        <div class="src">[Source name]</div>
        <div class="desc">[1-2 sentence description.]</div>
      </div>
    </div>

    <p class="body-zh" style="margin-top:3vh;max-width:96vw;opacity:.6;font-size:max(11px,.92vw);font-family:var(--mono);letter-spacing:.06em;line-height:1.7">
      [domain1.com/path · domain2.com/path · arxiv.org/abs/xxxx · domain3]
    </p>
  </div>
  <div class="foot">
    <div>Sources · [N] References</div>
    <div>14 / [TOTAL]</div>
  </div>
</section>
```

## L15 · Closing question / open ending (hero dark)

Same as cover layout but used at the end: huge `h-hero` question with `accent` emphasis on the key word. No buttons, no CTAs — workshop-style cliffhanger.

```html
<section class="slide hero dark" data-screen-label="15 Closing Question">
  <div class="arc-deco"></div>
  <div class="arc-deco b"></div>
  <div class="chrome">
    <div class="brand"><img src="images/logo-white.svg" alt="Raccoon AI"></div>
    <div>[Workshop · End]</div>
  </div>
  <div class="frame" style="display:grid;gap:6vh;align-content:center;min-height:78vh">
    <div class="kicker" style="color:var(--accent);opacity:1">End · 留給你的問題</div>
    <h1 class="h-hero" style="font-size:5.6vw;line-height:1.18;max-width:78vw">
      [Open question line 1,<br>line 2 with<br><span style="color:var(--accent)">accent</span> on the punchline word?]
    </h1>
    <p class="lead" style="max-width:55vw">
      [Optional · one-sentence bridge to what comes next / live demo]
    </p>
  </div>
  <div class="foot">
    <div>[Foot label]</div>
    <div>15 / [TOTAL]</div>
  </div>
</section>
```

## L16 · Full-bleed screenshot (no chrome interior)

A demo screenshot or recorded artifact that fills the whole viewport with an 8vh × 6vw inset border. No headline — just chrome + image. Used for live-demo sequences (4-page run).

```html
<section class="slide light" data-screen-label="16 Demo Full">
  <div class="chrome">
    <div class="brand"><img src="images/logo-navy.svg" alt="Raccoon AI"></div>
    <div>Live Demo · [01 / 04]</div>
  </div>
  <div class="full-img">
    <img src="images/demo-01.jpg" alt="[demo description]">
  </div>
</section>
```

If you don't have the screenshot yet, drop a placeholder:

```html
<div class="full-img">
  <div class="img-slot">
    <span class="label">[Demo screenshot]</span>
    <span class="hint">Drop 1920×1080 JPG into images/demo-01.jpg</span>
  </div>
</div>
```

## Bonus mini-atoms

### Inline `<code>` style (for prompt syntax markers like `###` or `"""`)

```html
<code style="font-family:var(--mono);font-size:.95em;padding:.1em .35em;background:rgba(var(--paper-rgb),.1);border-radius:3px">###</code>
```

For light slides, change background to `rgba(var(--ink-rgb),.06)`.

### Accent emphasis inside headlines

```html
<span style="color:var(--accent)">[強調詞]</span>
```

Rule: maximum 1-2 accent emphases per headline. Never highlight with background pills (we previously tried that — looks marketing, removed in the workshop deck).

### Dim secondary text inside headlines

```html
<span style="opacity:.55">[次要詞]</span>
```

Useful for "從 X 變成 Y" framings — dim X, accent Y.

---

## Putting it together — a 15-slide deck sketch

| # | Layout | Theme |
|---|---|---|
| 01 | L01 Cover | hero dark |
| 02 | L02 Promise | light |
| 03 | L03 Roadmap | dark |
| 04 | L04 Section 1 | hero dark |
| 05 | L05 Demo | light |
| 06 | L06 Concept cards | dark |
| 07 | L07 Takeaway | hero light |
| 08 | L04 Section 2 | hero dark |
| 09 | L08 Bad vs Better | light |
| 10 | L09 4-col anatomy | dark |
| 11 | L10 Case study | dark |
| 12 | L11 Surface vs Real | light |
| 13 | L12 Question ladder | dark |
| 14 | L13 Recap | hero light |
| 15 | L15 Closing question | hero dark |

Run `grep -E 'class="slide [a-z]' index.html` after building — confirm rhythm has no 3+ consecutive same themes.
