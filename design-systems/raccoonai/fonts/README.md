# Fonts

All three brand faces are **self-hosted** from this folder. Role assignment follows the **2025 RaccoonAI Brand Guidelines** (see `uploads/Raccoon AI.pdf`, pages 15–16).

## Files and roles

| File | Family | Role (per Brand Guidelines) |
|---|---|---|
| `PontanoSans-VariableFont_wght.ttf` | Pontano Sans | **Primary typeface** — brand messaging, UI, titles, buttons |
| `SourceHanSansTW-VF.otf` | 思源黑體 / Source Han Sans TW | **Primary CJK face** — pairs with both Latin faces |
| `Urbanist-VariableFont_wght.ttf` | Urbanist | **Secondary typeface** — small screens, article body, extreme weight contrast |

JetBrains Mono is still loaded from Google Fonts for code and tabular numerics; upload a local `JetBrainsMono-*.ttf` if you want it self-hosted too.

## Role split

The Brand Guidelines explicitly distinguish a *primary* and a *secondary* typeface:

- **Pontano Sans** is the default for every Latin string — titles, body, labels, buttons. It carries "professional × approachable" brand tone.
- **Urbanist** is opt-in, for contexts where its wider weight range (100–900 vs Pontano's 300–700) is needed: long-form article body, small-screen dense text, or marketing moments requiring Black (900) weight.
- **思源黑體** sits as fallback in every stack and picks up CJK glyphs automatically via the unicode-range cascade.

## Approved weights per face

| Face | Weights used | Notes |
|---|---|---|
| Pontano Sans | 400 Regular · 500 Medium · 600 SemiBold · 700 Bold | No 800/900 available |
| Urbanist | 200 ExtraLight · 300 Light · 400 Regular · 500 Medium · 600 SemiBold · 700 Bold · 800 ExtraBold · 900 Black | Full variable range sanctioned for secondary use |
| Source Han Sans TW | Regular · Normal · Medium · Bold · Heavy | 思源黑體 spec weights |

## CSS declarations

```css
@font-face { font-family: 'Pontano Sans';       src: url('fonts/PontanoSans-VariableFont_wght.ttf')  format('truetype-variations'); font-weight: 300 700; }
@font-face { font-family: 'Urbanist';           src: url('fonts/Urbanist-VariableFont_wght.ttf')     format('truetype-variations'); font-weight: 100 900; }
@font-face { font-family: 'Source Han Sans TW'; src: url('fonts/SourceHanSansTW-VF.otf')             format('opentype-variations'); font-weight: 250 900; }

--font-sans:      'Pontano Sans', 'Source Han Sans TW', ..., sans-serif;   /* default / primary */
--font-secondary: 'Urbanist',     'Source Han Sans TW', ..., sans-serif;   /* opt-in */
--font-cjk:       'Source Han Sans TW', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
--font-mono:      'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
```

All semantic classes (`.h1`–`.h5`, `.body`, `.caption`) inherit from `--font-sans`. To opt into Urbanist, add class `.secondary` or set `font-family: var(--font-secondary)` on the element.

## ⚠️ Asks

1. **Monospace** — upload `JetBrainsMono-*.ttf` if you want code self-hosted (currently from Google Fonts).
2. **Urbanist subset** — the variable TTF covers 100–900. If you want a weight-subsetted file for smaller payload, let me know which weights to keep.
3. **Sanctioned usage** — confirm that Urbanist article body is appropriate inside the product console, or whether it should be limited to marketing pages only. The Brand Guidelines wording ("for computer and small-screen displays") is somewhat ambiguous.
