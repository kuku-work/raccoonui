# Framework Rules — RaccoonAI Brand Deck

**Read this AFTER `narrative-design.md`, BEFORE `slide-kinds.md`.**

`narrative-design.md` decides **what** to make (議題 → 剖析 → arc → beats).
This file decides **how to render** what was decided (rhythm / type /
data / chip / voice).
`slide-kinds.md` is the dictionary you query once both are clear.

Distilled from the 88-slide 2025 keynote and rebuilt to align with
sister skills `open-design-landing-deck` / `kami-deck`: small kind
count, single source of truth, schema-driven composition.

---

## 0. Design order (the layer hierarchy)

```
narrative-design.md     →   議題 → 剖析 → arc → beats           (WHAT)
                              ↓
framework-rules.md      →   rhythm · type · data · chip          (HOW)
                              ↓
schema.ts               →   7 kinds × content layout variants    (SHAPE)
                              ↓
slide-kinds.md          →   dictionary look-up                   (PASTE / FILL)
                              ↓
tokens.css              →   colors · fonts · glass               (FINISH)
```

Inverting this order is the **#1 failure mode**:
- Picking pages before topic = template-shopping
- Picking layout before beat = visual-shopping
- Picking color before content = aesthetics-shopping

**Rule**: don't read down a layer until the layer above is settled.

---

## 1. Two substrates (was three)

| Substrate | Visual feel | Used for |
|---|---|---|
| `rc-bg-deep`  | Brand-blue gradient + radial glow | Cover · Chapter · Stats · Quote · CTA · End |
| `rc-bg-light` | Armor-white + soft glow | Most `content` layouts (left / right / full / pain / matrix) |

Some `content` layouts that need glass cards (flow / speakers /
storyboard / hub) live on `rc-bg-deep` — the composer decides per
layout, you don't pick.

### Substrate iron rule
**No flat colors.** Every substrate carries ≥ 2 layers of depth (gradient
+ radial light). Pure `#142572` / `#FFFFFF` / `#000000` violate the
brand. KV signature is depth, not flatness.

### KV photographic moments
Set inline `--rc-bg-image: url(...)` on a `rc-bg-deep` slide (or pass
`image` field on `cover`). The image takes over the substrate; gradient
remains as fallback.

### Pacing
- Alternate deep / light by beat, not by template.
- 8-15 slides per deck (matches `open-design-landing-deck` / `kami-deck`
  sweet spot). Below 6 = thin; above 18 = audience loses thread.
- ≥ 5 deep + ≥ 3 light in a 11-slide deck → not all ceremonial, not all
  content-heavy.

---

## 2. Type hierarchy

Locked in `tokens.css`. Sized by **insight weight**, not name.

| Role | Token | Range | Font | When to use |
|---|---|---|---|---|
| Stats hero (1 cell)  | `--rc-stat-mega` | 200-360px | Urbanist 800 | One unforgettable number |
| Stats duo (2 cells)  | `--rc-stat-duo`  | 120-220px | Urbanist 800 | Two compared numbers |
| Stats quad (3-4 cells) | `--rc-stat-quad` | 56-96px | Urbanist 800 | KPI grid |
| Cover title          | `--rc-h-mega`    |  80-156px | Noto Sans TC 900 | Cover only |
| Hero title           | `--rc-h-hero`    |  64-120px | Noto Sans TC 800 | Chapter / CTA |
| Section title        | `--rc-h-xl`      |  44-72px  | Noto Sans TC 700 | Content / Stats title |
| Card title           | `--rc-h-md`      |  22-32px  | Noto Sans TC 600 | Glass card / step / milestone |
| Body lead            | `--rc-lead`      |  18-24px  | Noto Sans TC + Pontano | Subhead, paragraph |
| Chip                 | (inline `.rc-chip`) | 13-15px | Noto Sans TC 500 | All pill chips |
| Mono meta            | `--rc-meta`      | 13px      | JetBrains Mono | "FEATURE · 03", counter |
| Source citation      | `--rc-source`    | 12px      | JetBrains Mono | Stats footnotes |

### Stage readability minimums (大螢幕投影、後排座位)

| Context | Minimum | Why |
|---|---|---|
| **CN body** on stage (50-100 人會場) | **≥ 24px** | Below 24px is illegible past row 15 |
| **EN body** on stage                | ≥ 18px      | Latin tighter — 18px still reads |
| **CN bullet inside glass card**     | ≥ 18px      | Auxiliary copy can be smaller |
| **CN body on SalesKit** (1:1 筆電 1.5 公尺) | ≥ 16px | Close distance, can be smaller |
| **Mono meta / source**              | ≥ 12px      | Audience doesn't need to read; it's chrome |

The composer's `scenario: "keynote" | "saleskit"` tightens or relaxes
these minimums. Paste-block authors must respect manually.

### Hierarchy rule
**Number size reflects insight weight.** A `78%` that is the entire
point of the slide = `mega`. Same number as a side-stat in a 4-up KPI
grid = `quad`. Don't burn `mega` on side-stats; don't bury punchlines
in tile grids.

---

## 3. One stats kind, three modes (was five)

The old framework had `stat-hero` / `stat-duo` / `stat-quad` /
`stat-narrative` / `stat-on-logo-wall` as separate kinds. v4 has **one**
`stats` kind whose visual weight scales by cell count:

| `stats.length` | Visual mode | Use when |
|---|---|---|
| 1 | mega | One number = entire argument. 200-360px. |
| 2 | duo  | Compare two metrics (in/out, before/after). 120-220px. |
| 3-4 | quad | KPI grid, no priority. 56-96px. |

Stat slides should be **20-30% of the deck**. Stats without `source` is
a hard rule violation — composer will not render the slide as
"finished" if `source` is missing.

### Logo wall (still wanted, not yet shipped)
The old `stat-on-logo-wall` kind required real customer logo PNGs.
Until the brand-asset pipeline ships them, fake-logo typography grids
are banned (see Hard Rule #5 in SKILL.md). When logos arrive, this
section will get a `layout: "logo-wall"` variant of `stats`.

---

## 4. Layout direction & rhythm

| Direction | Used by | Why |
|---|---|---|
| **Centered** | `cover`, `chapter`, `stats` (1-cell), `quote`, `cta`, `end` | Concept demands silence around it |
| **Left-text / Right-visual** | `content` layout `left` / `right` | Reading flow + supporting evidence |
| **Top-banner / Bottom-grid** | `content` `flow`, `speakers`, `storyboard` | Headline frames the grid |

### Direction rule
**No more than 3 consecutive slides in the same direction.** Slides 5-8
all left-right = the deck flatlines. Break with a centered stat or a
top-bottom storyboard.

---

## 5. Chip is load-bearing (≥ 6 per deck across 5 roles)

| Role | Where | Example |
|---|---|---|
| **Hero pillar** | Cover `pillars[]` | `對話智能 × 數據驅動 × 多通路整合` |
| **Feature sub-cap** | `content.chips[]` above title | `No-Code · Multi-Agent · LLM-Based` |
| **Section label** | Small heading on a content block | `FAQ 變現方案` |
| **CTA highlight** | `cta.highlight` next to QR | `前 100 名免費試用 14 天` |
| **Source / context** | `quote.context` after author | `美妝電商 · 2025 H2` |

A 12-page deck should contain **≥ 6 chips across all 5 roles**. If you
finish with only 2 chips, you skipped half the brand voice.

---

## 6. Color rules

### What's allowed
- **Logo wall** (when ships): native logo colors. Logos are data, not decoration.
- **Comparison matrix**: `us` column tinted brand-blue, `them` muted gray. Contrast IS the message.
- **Status / sentiment**: coral = pain / risk; yellow = highlight / positive emphasis; light-blue = neutral positive.

### What's banned
- Random saturated colors with no semantic role
- Rainbow / neon (meta.yaml hard-bans these)
- Solid-fill warm or accent backgrounds covering whole slides
- Magenta/pink as fill — the glow is `::after` edge-leak only, never paint magenta panels

### Contrast iron rule
Text color must not be similar in hue to its background. Use
`.rc-on-dark` / `.rc-on-light` helpers when a glass card flips
substrate. Banned combos:
- `--rc-light-blue` text on `rc-bg-light` (both blue-leaning)
- `--rc-mid-blue` text on `rc-bg-deep` (both deep blue)
- `--rc-fur-light` text on `rc-bg-light` (gray on white)
- `--rc-fur-dark` text on a deep glass card (gray on near-black)

### Stat tone semantics
| Tone | Color | Use for |
|---|---|---|
| `plain` (default) | `--rc-light-blue` | Neutral / positive — most KPIs |
| `warm`            | `--rc-yellow`     | Positive emphasis — record-breaking, signature numbers |
| `alert`           | `--rc-coral`      | Problem — churn rate, missed SLA, lost deals |

Don't pick by aesthetics. A "客服離職率 42%" is `alert`, not `plain` —
even though plain looks calmer.

---

## 7. Pacing — 11-slide template

```
01  cover                    opener
02  content (speakers)       — 講師獨立頁,不放 cover
03  stats (1 cell mega)      — opening fact ('78%')
04  content (pain)           — '你們現在每天卡在哪'
05  chapter                  — '我們怎麼做'
06  content (left, feature)  — Feature 01
07  content (flow)           — 14 天 onboard 三步
08  content (storyboard)     — user journey 4-up
09  quote                    — customer voice
10  content (matrix)         — vs 規則型客服
11  cta                      — QR + 14 天免費
```

Numbers across the deck:
- **2-3 stats slides** of different cell counts (1 / 2 / 4) — variety required.
- **1-2 chapter dividers** — one per major movement.
- **≥ 6 chips** across pillar / sub-cap / section / CTA / context roles.
- **1 signature layout** — hub-spoke OR storyboard OR matrix.
- **Exactly 1 cta** — composer enforces.

This is a fallback rhythm. If the topic dictates a different shape,
follow the topic. Don't force an 11-slide pattern onto a 6-slide
problem.

---

## 8. Voice DNA — copy rules (locked from meta.yaml)

The deck is brand surface — what's written ON it must match the brand
voice. Composer doesn't enforce voice; you check yourself before ship.

### Forbidden words

| 禁字 | 為什麼 | 替代詞 |
|---|---|---|
| `chatbot`   | 自貶為玩具型對話機器,非 RaccoonAI 定位 | 生成式 AI / 智能客服 / 對話式 AI |
| `機器人`     | 同上 + 中文語境更廉價                  | AI 助理 / 智能腳本 / 對話 agent |
| `革命性`     | 行銷話術疲勞詞,客戶會 tune out          | 改變 / 新世代 / 重新定義 |
| `顛覆性`     | 同上                                   | 同上 |
| `自動化`     | 帶有「取代人」的負面聯想                 | 自動處理 / 智能輔助 / AI 接住 |

### Recommended terms (品牌口調)
生成式 AI · 品牌口調 · 智能腳本 · 多通路整合 · 快速上線

### Signature numbers (品牌記憶點)
- **14 天** 上線
- **70-80%** 自動處理率
- **24/7** 不打烊

寫文案時優先用 signature 數字 — 客戶會在多個 touchpoint 看到一樣的數字,
記憶累積。

### Comparison-matrix 特別提醒
比較對手時用「規則型客服 / 傳統問答系統」,**禁止寫 "chatbot" 即使是貶義對手**
— 上品牌會場 deck 出現禁字會被 Rindy 退回。

---

## 9. Failure modes (what NOT to do)

- **All stats slides are 4-up KPI grids** → deck feels like dashboard, not story.
- **Every content slide uses left-right** → reads like spec sheet, not keynote.
- **Chip used only on cover** → brand voice fades after page 1.
- **Stats slide without source** → number reads as decoration; trust drops.
- **Cover crammed with speakers + meta + pillar + 4 things** → audience can't read in 5 seconds.
- **Two cta slides** → composer rejects. Pick one; secondary action goes in `secondary` field.
- **UI mockup with > 4 sub-elements on stage** → invisible past row 15.
- **Logo wall as typography** → fake-logo strings are banned. Wait for real PNG library.
- **Pure flat substrate** → looks like a template, not a brand.
