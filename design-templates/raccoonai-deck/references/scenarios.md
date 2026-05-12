# Scenarios — Fallback Templates

**⚠️ Read `narrative-design.md` FIRST.** If the 議題剖析 went smoothly,
you should **not** open this file — you already know the structure from
the user's topic. Templates are for when reasoning gets stuck, not as
defaults.

Inputs follow `../schema.ts`. Two canonical examples ship with the skill:

- `inputs.example.keynote.json`  — 12-slide product launch keynote
- `inputs.example.saleskit.json` — 9-slide 1:1 client proposal

Both render via:

```bash
npx tsx scripts/compose.ts inputs.example.keynote.json examples/keynote-2026.html
```

---

## Scenario A — Product launch keynote (大會場)

**Audience**: 50-150 人會場、後排 15 公尺、約 60-90 分鐘演講
**Goal**: 讓觀眾離場時記得 1-2 個 signature numbers + 1 個產品故事

11-slide rhythm:

| # | Kind | Layout | Beat |
|---|---|---|---|
| 01 | `cover`   | —          | Title + pillars + meta |
| 02 | `content` | speakers   | 4-up speaker row (講師獨立頁) |
| 03 | `stats`   | mega (1)   | Opening stat — '78% 客戶第一句決定' |
| 04 | `content` | pain       | 3 條痛點 |
| 05 | `chapter` | —          | '我們怎麼做' |
| 06 | `content` | left       | Feature 01 — Brand Voice |
| 07 | `content` | flow       | 3-step onboard |
| 08 | `content` | storyboard | 4-up user journey |
| 09 | `quote`   | —          | Customer voice |
| 10 | `content` | matrix     | vs 規則型客服 |
| 11 | `cta`     | —          | QR + 14 天免費 |

Stage type minimums kick in: CN body ≥ 24px, glass-card auxiliary ≥ 18px.

### When to extend (12-15 slides)
- Add second `content (left)` for Feature 02 / 03
- Add `stats` (duo) before cta — "2,000 萬+ vs <100 萬" close-the-deal numbers
- Add `chapter` III between matrix and cta if there's a "為什麼選我們" beat
- Add `end` after cta for ceremonial close

### When to compress (8-10 slides)
- Drop speakers slide if it's an internal follow-up to a known intro
- Merge pain + stats into single `stats` (alert tone)
- Drop matrix if no direct competitor named yet

---

## Scenario B — SalesKit (1:1 客戶提案)

**Audience**: 1 位主決策 + 0-3 位幕僚、筆電 1.5 公尺、約 30-45 分鐘對談
**Goal**: 拿到下一步具體承諾 (簽約 / pilot / trial)

9-slide rhythm:

| # | Kind | Layout | Beat |
|---|---|---|---|
| 01 | `cover`   | —      | 客戶名 + 提案版本 + meta |
| 02 | `content` | pain   | 我們聽到的問題 (訪談摘要) |
| 03 | `content` | left   | 三條支柱 (我們的提案) |
| 04 | `content` | left   | Feature — Brand Voice |
| 05 | `stats`   | quad   | Proof — 14 天 / 70% / 3.2x / 24/7 |
| 06 | `quote`   | —      | 同產業客戶 reference |
| 07 | `stats`   | quad   | ROI — 投資 vs 回報 |
| 08 | `content` | matrix | Pricing — 建議方案 vs 入門 |
| 09 | `cta`     | —      | 下一步行動 (mailto / trial link) |

SalesKit type minimums: CN body ≥ 16px (closer distance, allowed
smaller). The composer's `scenario: "saleskit"` opens this latitude.

### Confidentiality
SalesKit decks should:
- Add `· CONFIDENTIAL` to `brand.edition`
- Use placeholder `[客戶公司名]` until specific deal — never commit a
  real client's name to git
- Avoid competitor brand names in `matrix.them_label`

### Print to PDF
SalesKit is often handed off as PDF. The composer's `@media print` CSS
already handles: transform-track unwound, glass collapsed to solid, dot
nav / overview / counter hidden, each slide = one 1920×1080 page.

Open the rendered HTML in Chrome → Print → Save as PDF, with margins
"None" and "Background graphics" enabled.

---

## When to deviate from these templates

These are **fallback shapes**, not contracts. Deviate when:

- Topic dictates fewer beats (e.g. internal Q-review needs only 6 slides)
- Audience already knows the product (skip pain / matrix)
- The single most-important number is the entire story (1 cover + 1
  stats mega + 1 cta is a legitimate 3-slide deck)

If you're picking a template **before** doing 議題剖析, you're
template-shopping. Go back to `narrative-design.md`.
