# slide-kinds.md — 7 kinds × content layout variants

**Read AFTER `narrative-design.md` (議題剖析) and `framework-rules.md`
(節奏 / type / data / chip 規則).** This file is the **dictionary** —
you query it once your beats are decided. Reading it first turns the
deck into a vending machine.

The schema is in `../schema.ts`. The composer reads inputs that match
this dictionary 1:1. Paste-block authoring (`assets/template.html`)
follows the same kind names but you write HTML by hand.

---

## The seven kinds

| Kind | Substrate | Use it for | Schema field |
|---|---|---|---|
| `cover`   | deep  | Opening title plate (no speakers — those go on a separate slide) | `CoverSlide` |
| `chapter` | deep  | Roman / arabic numeral divider between movements                  | `ChapterSlide` |
| `content` | deep / light by layout | The workhorse — 9 layout variants (see below)        | `ContentSlide` |
| `stats`   | deep  | 1-4 cells. Visual weight auto-scales by cell count               | `StatsSlide` |
| `quote`   | deep  | Pull quote from a customer / leader                              | `QuoteSlide` |
| `cta`     | deep  | Closing action (max ONE per deck — hard rule)                    | `CTASlide` |
| `end`     | deep  | Optional kicker word + footer                                    | `EndSlide` |

Substrate is decided by the composer per kind — you do **not** specify
it manually. Two substrates only: `rc-bg-deep` / `rc-bg-light`. No third.

---

## `cover` — the opener

```jsonc
{
  "kind": "cover",
  "eyebrow": "2026 / RACCOON AI PRODUCT LAUNCH",
  "title": "產品發表會 2026",
  "subtitle": "超越對話,定義新世代智能客服。",
  "pillars": ["對話智能", "數據驅動", "多通路整合"],
  "meta": "6/3 (三) 12:30-16:00 · 華南銀行國際會議中心 2F",
  "image": "./assets/glass/kv-2026.png"
}
```

Hard rule: **do not put speakers on cover.** Cover does ONE job — define
the deck. Speakers go in a separate `content` slide with `layout="speakers"`.

When `image` is set, it becomes the slide background (KV ceremonial
moment). Reserve this — gradient + radial glow are usually enough.

---

## `chapter` — divider

```jsonc
{
  "kind": "chapter",
  "numeral": "II",
  "title": "我們怎麼做。",
  "lead": "三個能力,把對話變成業績流程。"
}
```

Centered, minimal. ≤ 14ch title. Optional 1-line `lead`. Use sparingly
— 1 chapter per major movement, not per slide.

---

## `content` — 9 layout variants

`content` absorbs everything that needs a structured body. Pick the
layout based on what the beat demands — not because it looks cool.

### `layout: "left"` (default when `image` is set)

Copy left, image right. Standard feature page.
Required: `title`. Optional: `eyebrow`, `body`, `bullets[]`, `image`,
`chips[]`, `source`.

### `layout: "right"`

Image left, copy right. Same fields as `left`, just flipped.

### `layout: "full"` (default when no `image`)

Copy only. For text-dense slides where the image would be filler.

### `layout: "flow"` — 3-step pipeline

```jsonc
{
  "layout": "flow",
  "title": "三步,把對話變成業績。",
  "flow": [
    { "nb": "01 / 03", "title": "接通你現有通路", "body": "..." },
    { "nb": "02 / 03", "title": "AI 學品牌語氣",  "body": "..." },
    { "nb": "03 / 03", "title": "對話即轉換",      "body": "..." }
  ]
}
```

Exactly 3 steps. More than 3 = the process is too complex to be a flow;
break into a `chapter` + multiple slides.

### `layout: "speakers"` — 4-up speaker row

```jsonc
{
  "layout": "speakers",
  "title": "把 6/3 交給這四個人。",
  "speakers": [
    { "name": "James Chou",   "role": "CEO",              "initial": "JC" },
    { "name": "Stanley Chen", "role": "COO",              "initial": "SC" },
    { "name": "DC Chen",      "role": "Product Director", "initial": "DC" },
    { "name": "Carol Wang",   "role": "業務開發經理",       "initial": "CW" }
  ]
}
```

Always **independent slide** — never on cover. 4 speakers max. For more,
run two speaker slides.

### `layout: "pain"` — 1-3 pain blocks

```jsonc
{
  "layout": "pain",
  "title": "你們現在每天卡在哪。",
  "pains": [
    { "label": "PAIN · 01", "text": "客服回應像填表格——客戶問三句就跑去找對手。" }
  ]
}
```

Coral left-rule. Use for opening problem-framing; do not use for
negative comparisons (those go in `matrix`).

### `layout: "hub"` — hub-and-spoke integration

```jsonc
{
  "layout": "hub",
  "title": "接得起你已經在用的工具——不是另一個孤島。",
  "hub_spoke": {
    "hub": "Raccoon AI",
    "hub_pillars": ["通路", "CRM", "數據"],
    "spokes": ["LINE OA", "FB Messenger", "Instagram", "HubSpot", "Shopify", "BigQuery", "GA4", "Slack"]
  }
}
```

Up to 8 spokes. Composer auto-arranges; you don't specify positions.
Use only when "we connect to N things" is the actual story.

### `layout: "storyboard"` — 4-up sequence

```jsonc
{
  "layout": "storyboard",
  "title": "在同一個視窗,從問答走到下單。",
  "storyboard": [
    { "caption": "客戶開啟對話", "meta": "CHAT · 14:23",  "body": "想找昨天那雙鞋,還有嗎?",            "tone": "neutral" },
    { "caption": "AI 識別意圖",  "meta": "AI · DRAFT",     "body": "是說粉色拼接的這款嗎? · 庫存 8",     "tone": "ai"      },
    { "caption": "真人微調送出", "meta": "AGENT · LILY",   "body": "對對對就那雙~ 還有 36/37 號喔!",     "tone": "agent"   },
    { "caption": "完成轉單",    "meta": "ORDER · #7821",  "body": "SS-1042 · 36 號 · $2,480",          "tone": "success" }
  ]
}
```

Exactly 4 frames. Each `body` is 1 line — abstract, symbolic. **Do not**
paint detailed UI mockups; stage audience can't read 12px from row 30.

### `layout: "matrix"` — head-to-head comparison

```jsonc
{
  "layout": "matrix",
  "title": "Raccoon AI vs. 規則型客服系統。",
  "matrix": {
    "us_label": "RACCOON AI",
    "them_label": "規則型客服系統",
    "rows": [
      { "dim": "設定方式", "us": "AI 自動學品牌口調", "them": "工程師寫規則樹" },
      { "dim": "上線時間", "us": "14 天",             "them": "6–12 週" }
    ]
  }
}
```

3-5 rows. **Do not** write `chatbot` or `機器人` in `them` even as
derogatory — voice DNA forbids (see `framework-rules.md §9.5`). Use
`規則型客服 / 傳統問答系統`.

---

## `stats` — auto-sized 1-4 cells

```jsonc
{
  "kind": "stats",
  "eyebrow": "DATA · 市場現況",
  "title": "客戶等待回應的耐心,正在崩潰。",
  "stats": [
    { "value": "78", "unit": "%", "label": "客戶在第一句就決定要不要繼續對話", "tone": "plain" }
  ],
  "source": "Gartner 2025 · Customer Journey Report"
}
```

Visual weight auto-scales by `stats.length`:

| Cells | Class  | Pixel range | Use when                                |
|---|---|---|---|
| 1     | `mega` | 200-360px   | One unforgettable number = the argument |
| 2     | `duo`  | 120-220px   | Dramatic before/after or in/out         |
| 3-4   | `quad` |  56-96px    | KPI grid — share airspace               |

`tone`: `plain` (light blue, default) / `warm` (yellow, positive) /
`alert` (coral, problem). Pick by emotional weight, not aesthetics.

**`source` is required** — number without source reads as decoration.

---

## `quote` — pull quote

```jsonc
{
  "kind": "quote",
  "quote": "以前一週只能跑 3 個檔期,現在一週 9 個——同一支客服隊伍。",
  "author": { "name": "林雅婷", "title": "客服總監" },
  "context": "美妝電商 · 2025 H2"
}
```

≤ 26ch quote. `context` chip carries situational source (industry,
period). Don't paraphrase the customer.

---

## `cta` — closing action

```jsonc
{
  "kind": "cta",
  "eyebrow": "立即體驗",
  "title": "現在就讓對話,開始替你工作。",
  "primary":   { "label": "raccoonai.com/launch-2026", "url": "https://...", "qr": true },
  "secondary": { "label": "1:1 顧問 onboarding",       "url": "https://...", "qr": true },
  "highlight": "前 100 名免費試用 14 天"
}
```

**Max ONE cta per deck** — composer throws if you put two. Secondary
action goes in `secondary`, not as a second cta slide.

`qr: true` renders a QR placeholder; replace with a real QR image in
production. `highlight` chip sits below the QR pair.

---

## `end` — optional bookend

```jsonc
{
  "kind": "end",
  "mega": "我們 6/3 見。",
  "footer": "Raccoon AI · 2026 / Q2 / Product Launch"
}
```

Use only when the deck demands a quiet ceremonial close after `cta`.
Most decks end at `cta` directly.
