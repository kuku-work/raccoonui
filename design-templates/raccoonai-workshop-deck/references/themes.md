# Themes — RaccoonAI Workshop Deck

This skill is **single-brand-locked**. Unlike the magazine-web-ppt skill which offers 5 different visual directions, this deck always uses the RaccoonAI design system. There is exactly one palette and one type stack. What varies is the **slide-level theme** — light vs dark vs hero — and how you stitch them together to create rhythm.

## The single palette (locked)

```css
:root{
  --ink:#142572;          /* RaccoonAI brand-primary navy */
  --ink-rgb:20,37,114;
  --paper:#FAFAF7;        /* Warm cream off-white */
  --paper-rgb:250,250,247;
  --paper-tint:#DCE3F8;
  --ink-tint:#1B2D7E;     /* For light-slide nb / accent on cream */
  --accent:#FFC648;       /* RaccoonAI --accent-yellow */
  --accent-rgb:255,198,72;
}
```

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#142572` | Dark slide bg, headlines on light slides, logo navy |
| `--paper` | `#FAFAF7` | Light slide bg, text on dark slides |
| `--paper-tint` | `#DCE3F8` | Gradient end-stop at bottom of light slides |
| `--ink-tint` | `#1B2D7E` | Light-slide `.nb-row .nb` color, accent on cream where amber lacks contrast |
| `--accent` | `#FFC648` | Sole accent: headline emphasis, `.flow-cell.accent`, accent borders |

**Reject any request for additional colors.** If the user asks "can we make this part green / red / purple" — politely decline and explain that RaccoonAI is a single-accent system. The only sanctioned non-palette colors are:
- `#E24E24` for `.flow-cell.danger .ic` (RaccoonAI `--accent-red` for warning state)
- `#1b1c1d` for `.frame-img` video background (just dark neutral, not a brand token)

## The four slide themes

Every `<section class="slide ...">` carries one of four theme combinations. These are NOT user choices — they're determined by the slide's **role** in the deck.

### 1. `slide light` — Light content page

Default cream paper bg with subtle gradient to `--paper-tint` at the bottom (the only sanctioned gradient in the design system, mirrored here). Navy ink text. Used for body content — concept cards, comparisons, demos.

- **WebGL bg shows through**: barely (96% paper overlay)
- **Logo**: `images/logo-navy.svg`
- **Accent visibility on this theme**: amber `#FFC648` has only ~1.4:1 contrast on cream → use `var(--ink-tint)` for accent borders / numbers when amber would be illegible

### 2. `slide dark` — Dark content page

Navy bg with 93% overlay. Cream text. Used for content pages with high accent budget (the amber pops against navy).

- **WebGL bg shows through**: barely (93% navy overlay)
- **Logo**: `images/logo-white.svg`
- **Accent visibility**: ~5.4:1 contrast on navy → use `var(--accent)` freely

### 3. `slide hero light` — Light hero / takeaway / recap

Same cream paper but **only 32% overlay** — the WebGL light shader (FBM noise, pale silver-blue) shows through prominently. Plus a top-to-bottom gradient overlay for breathing room. Used for: section takeaways, mid-deck breathers, final recap.

- **Headlines should drop to 5.4-6vw** (vs default 8.4vw) to feel like a "moment" not a wall of text
- Reduce ornament — typically just one `arc-deco c` decorative circle
- Accent on light hero → prefer `var(--ink-tint)` (amber lacks contrast)

### 4. `slide hero dark` — Dark hero / cover / closing / section divider

Navy bg with 55% overlay — WebGL dark shader (navy fluid + amber sparks) shows through. The most ornamented theme: typically `arc-deco` + `arc-deco b` for cover, `section-num` for section dividers.

- Cover, section dividers, closing question all live here
- Amber accent works at full brightness
- The mood: weighty, dramatic, "look at this moment"

## Theme rhythm — hard rules

The deck's editorial feel comes from how you sequence themes, not from the themes themselves. Three rules, no exceptions:

### Rule 1: No 3+ consecutive same-theme slides

If slides N, N+1, N+2 all share the same theme class, the eye fatigues. Break the run by inserting a different theme between them.

**Bad**:
```
03 light · 04 light · 05 light · 06 light
```

**Good**:
```
03 light · 04 dark · 05 light · 06 dark
```

### Rule 2: Every 3-4 content slides, insert a hero

A run of 3-4 `light/dark` content slides is a "movement". Punctuate movements with a hero. This is what makes a 30-slide deck feel paced instead of grinding.

**Standard 5-slide section pattern**:
```
section divider (hero dark)
→ content (light)
→ content (dark)
→ content (light or dark)
→ section takeaway (hero light or hero dark)
```

### Rule 3: At ≥8 slides, balance hero colors

Don't make every hero a `hero dark`. The deck needs at least 1 `hero light` for visual variety. Typical balance for a 15-slide deck: 3-4 `hero dark` + 2-3 `hero light`.

## Validating rhythm

After building the deck, run:

```bash
grep -E 'class="slide [a-z]' index.html
```

Output should be readable as a list of themes. Scan for:
- ❌ 3+ same in a row → swap the middle slide's theme
- ❌ Only `light` or only `dark` content → rebalance
- ❌ No `hero light` at all → convert one takeaway/recap to hero light
- ❌ Last slide is `light` (anti-climactic) → end on `hero dark` for closing

## Accent strategy across the deck

Treat amber as a finite resource. **Spread accents across the deck**, not within a single slide.

| Slide role | Accent usage |
|---|---|
| Cover (hero dark) | 1 accent: kicker line in amber |
| Roadmap (dark) | 1-2 accents: `.nb-row .nb` are amber by default |
| Section divider (hero dark) | 1-2 accents: kicker + emphasis word in headline |
| Content cards (light/dark) | 0-1 accent: one card border + en label, OR one headline emphasis word |
| Bad vs Better (light) | 1 accent: right column `border-color:var(--accent)` |
| Takeaway (hero light) | 1-2 accents: emphasis word (use `--ink-tint`!) + middle `flow-cell.accent` |
| Recap (hero light) | 1 accent: final `.recap-card[style="border-color:var(--accent)"]` |
| Closing question (hero dark) | 1 accent: emphasis word in headline |

**Cumulative anti-pattern**: every slide having an amber kicker. Then nothing stands out. Reserve amber kickers for slides that genuinely deserve emphasis — section dividers, takeaway claims, closing question.

## What we explicitly removed (history note)

Earlier iterations of this design tried:
- ❌ Amber pill background on headline highlights (e.g. `<span style="background:rgba(var(--accent-rgb),.4)">資訊密度</span>`)
- ❌ Multiple competing accent colors
- ❌ Serif Chinese display face (replaced with Noto Sans TC after design-system review)
- ❌ Page-bg gradient washes on every slide (only retained on `light:not(.hero)` per design-system spec)
- ❌ Backdrop-blur frosted glass on cards

All of these were rolled back during the actual workshop deck build. If you find yourself reaching for any of them — stop. The single-accent, hairline-border, top-bordered-card aesthetic is the entire RaccoonAI editorial system. More chrome makes it worse, not better.
