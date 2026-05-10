# Checklist — Brand Deck Self-Review

Run before declaring done. P0 = must fix; P1 = should fix; P2 = polish.

The composer enforces some checks structurally (max 1 cta, source on
stats). The rest is on you.

---

## P0 — brand iron rules

1. **No third substrate.** Only `rc-bg-deep` / `rc-bg-light` exist. If
   you see `rc-bg-deep-stage` / `rc-bg-black` / `rc-bg-image-hero` in
   your output, you're on a stale template — re-render via composer.
2. **No banned colors.** Green / rainbow / neon are out. Magenta/pink
   appears only as glass `::after` edge leak — never fill.
3. **No fake logo wall.** Until real logo PNGs ship, do not write
   `CHANEL` / `UNIQLO` etc. as typography "logos". Use `stats` (quad)
   with metrics if you need to show scale.
4. **No banned words.** `chatbot` / `機器人` / `革命性` / `顛覆性` /
   `自動化` are forbidden in any slide. See `framework-rules.md §8`.
5. **One `cta` per deck.** Composer rejects multiple. Secondary actions
   go in `cta.secondary`, not as a second `cta` slide.

## P0 — content density

6. **Cover ≤ 4 zones.** `eyebrow + title + subtitle + pillars + meta`
   already lives in cover schema; **do not** add speakers, demo art, or
   chips on cover. Speakers run in their own `content (speakers)` slide.
7. **UI mockup ≤ 4 sub-elements.** If your `content (left)` art slot
   carries 12 dots / labels / bezels, you're recreating Figma in
   keynote — no one past row 15 can see it.
8. **Stats `source` is not optional.** Number without source = decoration.

## P1 — voice + signature

9. **Signature numbers used:** `14 天` / `70-80%` / `24/7` should appear
   in copy where they fit. Cross-touchpoint repetition = brand memory.
10. **≥ 6 chips across 5 roles** (pillar / sub-cap / section / CTA
    highlight / context). See `framework-rules.md §5`.
11. **Stat tone is semantic.** Pain = `alert` (coral). Positive emphasis
    = `warm` (yellow). Default = `plain` (light blue). Don't pick by
    aesthetics.
12. **No 4+ same-substrate slides in a row.** If 4 consecutive slides
    are all `rc-bg-deep` ceremonial, audience flatlines.

## P1 — type readability (scenario-aware)

13. **Keynote scenario** — CN body ≥ 24px, EN body ≥ 18px, glass-card
    auxiliary ≥ 18px.
14. **SalesKit scenario** — CN body ≥ 16px, mono meta ≥ 12px.

## P2 — polish

15. **Every stats slide cites source** (P0 says required; here check
    it's the *real* source, not "internal data").
16. **`quote.context` is a chip.** Don't use a sentence — keep it tight.
17. **`@supports not (backdrop-filter)` fallback** — open the deck on a
    browser without backdrop-filter (Firefox legacy / older Edge); glass
    should degrade to solid panel, not transparent ghost.
18. **Print test** — Chrome → Print → Save as PDF, no margins,
    background graphics on. Each slide = 1 page, no overflow.

---

## Browser smoke test (10 秒)

1. 用 Chrome / Edge 開 `index.html` (composer-rendered) 或
   composer 直接吐到 `examples/`.
2. 按 `→` 翻完所有頁 — 玻璃漏光 / 模糊 / 漸變數字 / dot nav highlight 都該出現
3. 按 `Home` 跳第一頁、按 `End` 跳最後一頁 — counter / progress / dot 同步
4. **Trackpad 連續滑 5 下** — 應該只跳 1 頁(700ms lock 防 burst);
   跳超過 1 頁 = nav model 跑掉
5. 按 `ESC` — overview 縮圖 grid 出現,點任一張跳到該頁;再按 `ESC` 關閉
6. 按 `F5` 重新整理 — 該回到 slide 1(keynote 場景每次從 cover 開始)
7. 縮窗到一半寬度 — 文字應該 reflow,glass card 不爆框

跑完七項都 OK,deck 才能交。

---

## Quick `grep` validations

對 composer 輸出 (`examples/*.html`) 跑這幾條,任何一條有 hit = 重做：

```bash
# v3 殘留 — 應為空
grep -nE 'rc-bg-deep-stage|rc-bg-black|rc-bg-image-hero|rc-grid-mask|rc-glass-folded' examples/*.html

# 禁字 voice DNA
grep -nE 'chatbot|機器人|革命性|顛覆性|自動化' examples/*.html

# 禁字體
grep -nE 'Roboto|Open Sans|Helvetica' examples/*.html

# composer placeholder 未填
grep -n 'REPLACE\|\[客戶公司名\]' examples/keynote-2026.html
```

(SalesKit 範例會留 `[客戶公司名]` placeholder — 簽約前替換成真名。)
