# Checklist — RaccoonAI Workshop Deck

Run through this BEFORE emitting `<artifact>` or telling the user the deck is done. Issues are graded by severity:

- **P0** — visual failure, must fix before shipping
- **P1** — quality regression, fix unless explicitly deferred
- **P2** — polish, fix when time permits
- **P3** — judgment calls, log and move on

## P0 — must-pass gates

### P0-1 · Brand tokens unchanged

- [ ] `:root` block contains exactly the 7 brand tokens: `--ink`, `--ink-rgb`, `--paper`, `--paper-rgb`, `--paper-tint`, `--ink-tint`, `--accent`, `--accent-rgb`
- [ ] No new hex values introduced anywhere — all colors via `var(--token)` or `rgba(var(--token-rgb), α)`
- [ ] The only sanctioned exceptions: `#E24E24` for danger flow-cell, `#1b1c1d` for video bg
- [ ] No `hsl(...)`, no `oklch(...)`, no foreign palette

### P0-2 · Type stacks unchanged

- [ ] `--sans-zh` = Noto Sans TC stack (covers all zh AND zh display titles)
- [ ] `--serif-en` = Urbanist stack (English titles, NOT a serif despite the variable name)
- [ ] `--serif-body-en` = Pontano Sans (English body)
- [ ] `--mono` = IBM Plex Mono (chrome, kicker, meta)
- [ ] No serif Chinese face anywhere (rejected during design-system alignment)
- [ ] No Inter / Roboto / Arial as display fonts

### P0-3 · Theme rhythm

- [ ] Run `grep -E 'class="slide [a-z]' index.html` and scan output
- [ ] No 3+ consecutive same-theme slides
- [ ] Deck has at least 1 `hero light` AND 1 `hero dark` (if ≥8 slides)
- [ ] Cover is `hero dark`
- [ ] Section dividers exist between major sections (not just light/dark content flowing forever)

### P0-4 · Accent budget

- [ ] No slide has 3+ accent emphases (count: amber kickers + amber emphasis spans + amber borders + flow-cell.accent)
- [ ] Accent on `hero light` slides uses `var(--ink-tint)` NOT `var(--accent)` (amber on cream = 1.4:1 contrast, fails)
- [ ] No background pill highlights on headlines (e.g. `background:rgba(var(--accent-rgb),.4)`) — removed across the deck
- [ ] Only `var(--accent)` for accent — no orange / red / green / purple anywhere

### P0-5 · Logo files referenced correctly

- [ ] Every `slide.dark` and `slide.hero.dark` uses `images/logo-white.svg`
- [ ] Every `slide.light` and `slide.hero.light` uses `images/logo-navy.svg`
- [ ] `images/logo-white.svg` and `images/logo-navy.svg` exist (or `.svg` is replaced by user-provided files)
- [ ] No broken `<img>` tags pointing to missing logos

### P0-6 · No emoji in product UI

- [ ] No emoji anywhere in slide content (kicker / headline / body / chrome / foot)
- [ ] Decorative arrows are `→` (Unicode arrow), not images, not emoji
- [ ] Bullets are `<li>` with CSS `::before` dashes, not `•` or `→` characters

### P0-7 · Page counter / total correct

- [ ] Every `.foot` shows `NN / TOTAL` where TOTAL matches the actual slide count
- [ ] All page numbers are sequential, no gaps, no duplicates
- [ ] Cover is `01 / TOTAL`
- [ ] Last slide is `TOTAL / TOTAL`

### P0-8 · Video data-deck-video attribute

- [ ] Every `<video>` tag that should react to slide navigation has `data-deck-video` attribute
- [ ] Without it: video autoplays on load and never pauses → multiple videos can play simultaneously
- [ ] Videos have `poster="..."` referencing a real frame so they don't flash black before metadata loads

## P1 — quality regressions

### P1-1 · Class names exist in template

- [ ] Every class used in a slide is defined in `template.html` `<style>` block
- [ ] No custom class invented per-slide (use inline `style="..."` instead)
- [ ] If you needed a new class, you added it to `template.html`, not the slide

### P1-2 · Chinese title length

- [ ] No `.h-hero` or `.h-xl` zh headline auto-wraps to single characters per line
- [ ] Use `<br>` to break at natural boundaries
- [ ] If headline is >12 chars per line at 8.4vw, drop the size inline to 5.4-6vw

### P1-3 · Chrome / Kicker / Foot semantics

- [ ] **Chrome right-side label** stays stable across slides in the same section (e.g. "Section 2 · Prompt Anatomy" repeats on every slide in that section)
- [ ] **Kicker** is page-specific (not the same as chrome — that creates redundancy)
- [ ] **Foot left** describes what THIS slide proves, not the section

### P1-4 · Lead and body max-widths

- [ ] `.lead` has `max-width:48-68vw` (never full-width)
- [ ] `.body-zh` has `max-width:62-78vw` (never full-width)
- [ ] Headlines have `max-width:84-88vw` to leave breathing room on the right

### P1-5 · Image aspect ratio sanity

- [ ] No image uses bizarre native aspect ratio (e.g. 2592/1798)
- [ ] Screenshots use `object-fit:contain` (whole image visible)
- [ ] Decorative photos use `object-fit:cover` with `object-position:top center` (default)
- [ ] Image grids use `height:Nvh` fixed height, NOT `aspect-ratio:N/M` (which can overflow)

### P1-6 · No alignment-to-bottom traps

- [ ] No `align-self:end` on images (will get cropped by browser chrome)
- [ ] Use grid + `align-items:start` to keep images vertically anchored at top

### P1-7 · Localstorage STORE_KEY

- [ ] `STORE_KEY` in `<script>` is unique to this deck (NOT the template default)
- [ ] If multiple decks on same origin, they don't restore each other's position

### P1-8 · Section-divider giant number color

- [ ] `slide.hero.dark .section-num` color is `var(--accent)` (amber)
- [ ] `slide.hero.light .section-num` is overridden inline to `color:var(--ink-tint)` (amber has no contrast on cream)

## P2 — polish

### P2-1 · Consistent kicker tone within section

- [ ] All section-1 slides have kickers like "Section 1 · X" / "Mental Model · X" — coherent vocabulary
- [ ] Mix of all-Chinese + all-English + mixed is OK but should feel intentional

### P2-2 · Italic English usage

- [ ] `.en-italic` used for taglines, never for body text
- [ ] If a slide has an italic phrase, it's a deliberate "moment" — not decoration

### P2-3 · arc-deco placement

- [ ] `.arc-deco` only used on `hero` slides
- [ ] `.cover-arc` only used on cover (slide 01)
- [ ] Not stacked more than 2 deep (`a + b` or `a + c`, never 3)

### P2-4 · Foot label specificity

- [ ] Foot label is more specific than chrome (e.g. "Email Example · 判斷在前" not "Section 3")
- [ ] Doesn't restate the slide title verbatim — adds an interpretive anchor

### P2-5 · Comparison column tag pattern

- [ ] `.vs-col.dim` always paired with non-dim `.vs-col` with accent border
- [ ] Tags follow "Before / After" or "普通 / 更好" or "情境 A / 情境 B" pattern — consistent verb mood across the deck

## P3 — judgment

### P3-1 · Should this slide exist?

- [ ] If a slide is just text → ask: would a sentence on the previous slide do? Cut.
- [ ] If a slide has 6+ bullets → ask: is this 2 slides? Split.
- [ ] If a slide has 1 image + 3 lines → ask: is this `.full-img`? Convert.

### P3-2 · Accent placement makes the audience's eye land

- [ ] On a 4-card row with 1 accent card, the accent card should be the conclusion / focus
- [ ] On a headline with 1 accent word, the accent word should be the operative noun ("資訊**密度**" not "**華麗** prompt")

### P3-3 · Mobile / window-resize behavior

- [ ] Resizing the window doesn't break layouts (test once at 1280×720)
- [ ] At <900px the `@media` query kicks in: hero font drops to 13vw, grids collapse to 1-col
- [ ] You don't need to test mobile — the deck is for 1920×1080 projection — but it shouldn't crash if accidentally opened on phone

## Final verification sweep

Before shipping:

1. Open `index.html` in a browser
2. ← → through every slide once — confirm no broken images, no JS errors in console
3. Hit ESC, scroll the overview, click a thumbnail in row 3 — confirm jump works
4. Refresh the page — confirm position restores
5. Hit ← from slide 1 / → from last slide — confirm no error (just stops)
6. Check the bottom-right `← → ESC` hint is visible but unobtrusive
7. Count slides match `NN / TOTAL` displayed in foot

If all P0 pass and you've eyeballed every slide once, the deck is shippable. If any P0 fails, fix and re-run the check.
