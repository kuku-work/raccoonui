# Design System Inspired by RaccoonAI

> Category: AI & LLM
> Taiwan-based AI customer-service platform. Calm B2B console with deep navy + light blue, mostly opaque flat surfaces, single sanctioned page-bg gradient.

## 1. Visual Theme & Atmosphere

RaccoonAI's interface is a B2B operations console disguised as a calm reading room — quiet, precise, and deliberately un-flashy. Where most AI products lean into glow, frosted glass, and chromatic gradients, RaccoonAI strips all of that out and lets a fully opaque, white-page-on-card layout do the work. The product is a tool merchants live inside for hours at a time tuning AI agents, reviewing conversations, and wiring CRMs — so the visual language is designed for endurance, not first impressions.

The signature move is the **layered blue stack** — three distinct blue tokens that each carry a specific job: `--brand-primary` (deep navy `hsl(230, 70%, 26%)`) is the brand voice for borders, marketing, and identity; `--button-dark-blue` (`hsl(228, 70%, 26%)`) is the actual primary CTA fill (2° hue shift bluer than brand-primary); `--primary` (`hsl(224, 76%, 67%)`) is the lighter "interactive blue" for focus rings, switches, and AI-message accents. The product also uses `--brand-light` (`hsl(220, 77%, 67%)`) for approachability moments — outlines, dashed borders, "add new" affordances. Together these four blues cover the entire brand surface; accents (yellow `--accent-yellow`, red `--accent-red`) are sparse and saturated colors are quarantined to avatars and tag categories.

Typography pairs **Pontano Sans** (Latin) with **思源黑體 / Source Han Sans TW** (CJK) and falls back to Noto Sans TC / Microsoft JhengHei — this is the entire SSOT type stack. Neutrals are pure HSL 0% saturation; there are no tinted grays anywhere. Every product surface is fully opaque (no backdrop-blur, no frosted glass, no chromatic gradient washes) — with one sanctioned exception: the page body carries a subtle `--page-bg-gradient` (180deg, neutral grey at 0–70% transitioning to a pale brand-tinted blue `hsl(228, 68%, 93%)` at the bottom). It's the only gradient anywhere in the system.

**Key Characteristics:**
- Four-blue stack: `--brand-primary` (navy 231°), `--button-dark-blue` (CTA fill 228°), `--primary` (interactive 224°), `--brand-light` (accent 220°) — each with a distinct role
- Pure grayscale neutrals — zero tinted grays, zero warm undertones
- Self-hosted Pontano Sans (Latin) + 思源黑體 (CJK) as the only SSOT face pair
- 4px spacing grid; 24 / 16 / 12 / 8 / 4 / 9999px radius scale
- Card-on-card composition — outer 24px-radius card containing 16px-radius inner cards
- One sanctioned gradient (`--page-bg-gradient` body), zero blur, zero textures, zero spot illustrations
- Restrained 200ms ease transitions — no springs, no parallax
- Bilingual-first: zh-TW is the primary product language; English is first-class secondary; system tested across L1/L2/L3 locale stress groups

## 2. Color Palette & Roles

> **HSL channel tokens**: Every color that needs alpha has a `--xxx-hsl` channel variant. Use `hsla(var(--token-hsl), α)` — never `hsl(var(--token) / α)`. The two patterns are not interchangeable in this codebase.

### Primary Blue Stack (Four Distinct Roles)
- **Brand Primary Navy** (`#142572`): Brand identity color — borders, marketing surfaces, brand wordmarks, dialogue tag fills. *Not* the CTA fill. CSS token `--brand-primary` (`hsl(230, 70%, 26%)`).
- **Button Dark Blue** (`#142671`): The actual primary-CTA fill. Visually almost identical to brand-primary but 3° bluer. Token `--button-dark-blue` (`hsl(228, 70%, 26%)`); pairs with `--button-dark-blue-hover` (`hsl(229, 72%, 21%)`), `--button-dark-blue-focus` (`hsl(230, 77%, 17%)`), `--button-dark-blue-disabled` (`hsl(229, 28%, 75%)`).
- **Primary Interactive** (`#6B8FEB`): Focus rings (`--ring`), switch checked, AI message accent, sidebar Workspace shadow tint. Token `--primary` (`hsl(224, 76%, 67%)`); pairs with `--primary-hover` (`hsl(224, 69%, 62%)`) and `--primary-focus` (`hsl(222, 63%, 57%)`).
- **Brand Light** (`#6B96EC`): Outline buttons, dashed "add new" borders, approachability accents. Token `--brand-light` (`hsl(220, 77%, 67%)`); pairs with `--brand-hover` (`hsl(220.8, 68.4%, 61.6%)`) and `--brand-disabled` (`hsl(218, 100%, 91%)`).

### Brand Secondary
- **Brand Secondary Mid Blue** (`#3D5BCD`): Switch checked alternate, secondary brand emphasis, trial-banner upgrade links. Token `--brand-secondary` (`hsl(230, 59%, 52%)`).
- **Button Blue** (`#5FA8F9`): Bright-blue CTA variant for non-primary surfaces. Token `--button-blue` (`hsl(213, 94%, 68%)`).

### Accent
- **Accent Yellow** (`#FFC648`): Positive moments, highlights. Token `--accent-yellow` (`hsl(42, 100%, 64%)`).
- **Accent Red** (`#E24E24`): Aligned with `--destructive`. Alerts and important messages. Token `--accent-red` (`hsl(13, 76%, 52%)`).

### Surface & Background
- **Page Background** (`#FFFFFF`): The page canvas (overridden by `--page-bg-gradient` on body). Token `--background` (`hsl(0, 0%, 100%)`).
- **Card Surface** (`#FFFFFF`): Surface white for outer cards / popovers. Tokens `--card` and `--popover` (`hsl(0, 0%, 100%)`).
- **Card Inner BG** (`#F8FAFC`): Inner-card "settings panel" background. Token `--card-inner-bg` (`hsl(210, 20%, 98%)`).
- **Muted Surface** (`#F5F5F5`): Near-white neutral used for muted/secondary/accent. Tokens `--muted`, `--secondary`, `--accent` (all `hsl(0, 0%, 96.1%)`).
- **Empty State Background** (`#F8FAFC`): Token `--empty-state-bg` (`hsl(210, 20%, 98%)`).
- **Overlay** (`#000000`): Modal backdrop at 50% (`hsla(var(--overlay-hsl), 0.5)`). No blur. Token `--overlay`.
- **Page BG Gradient End** (`#DCE3F8`): The pale brand-tinted blue at the bottom of `--page-bg-gradient`. Full gradient: `linear-gradient(180deg, hsl(0,0%,95.3%) 0%, hsl(0,0%,95.3%) 70%, hsl(228, 68%, 93%) 100%)` applied to `body` with `background-attachment: fixed`. **The only sanctioned gradient in the system.**

### Neutrals & Text
- **Foreground** (`#0A0A0A`): Primary text. Token `--foreground` (`hsl(0, 0%, 3.9%)`).
- **Muted Foreground** (`#737373`): Secondary body text. Token `--muted-foreground` (`hsl(0, 0%, 45.1%)`).
- **Border** (`#E5E5E5`): Standard 1px divider. Tokens `--border` and `--input` (`hsl(0, 0%, 89.8%)`).
- **Dashed Border** (`#C2C2C2`): Empty states, upload areas. Token `--dashed-border` (`hsl(0, 0%, 76%)`).
- **Ring** (`#6B8FEB`): Focus outline — matches `--primary`. Token `--ring` (`hsl(224, 76%, 67%)`).

### Status & Semantic
- **Status Success** (`#36D6B5`): Teal "AI 服務中" state. Token `--status-success` (`hsl(168, 68%, 52%)`); foreground white.
- **Status Warning** (`#DB8205`): Amber alert / transferred state. Token `--status-warning` (`hsl(32, 95%, 44%)`); foreground white.
- **Status Info** (`#3B82F6`): Standard blue info. Token `--status-info` (`hsl(217, 91%, 60%)`); foreground white.
- **Destructive** (`#EF4444`): Aligned with Accent Red. Token `--destructive` (`hsl(0, 84.2%, 60.2%)`); foreground `hsl(0, 0%, 98%)`.

### Conversation & Message
- **Conversation Primary** `--conversation-primary` (`hsl(226, 66%, 52%)`)
- **Conversation Secondary / Light** `--conversation-secondary` / `--conversation-light` (`hsl(223, 76%, 67%)`)
- **Conversation BG** `--conversation-bg` (`hsl(223, 76%, 95%)`) / **Border** `--conversation-border` (`hsl(223, 76%, 85%)`) / **Hover** `--conversation-hover` (`hsl(226, 66%, 45%)`)
- **Message Entry** `--message-entry-border` (`hsl(214, 95%, 87%)`) / `-bg` (`hsl(214, 100%, 97%)`) / `-icon` (`hsl(214, 93%, 78%)`)
- **AI Section Border** `--ai-section-border` (`hsl(214, 89%, 93%)`)
- **AI Message** `--ai-message` (`hsl(219, 76%, 67%)`)

### Tag, Switch, Progress, Input Disabled
- **Tag Primary** `--tag-primary` (`hsl(237, 67%, 50%)`, `#2B35D6`) / `-foreground` (`hsl(0, 0%, 100%)`)
- **Switch Checked** `--switch-checked` (`hsl(230, 59%, 52%)`)
- **Progress Blue** `--progress-blue` (`hsl(219, 77%, 67%)`)
- **Input Disabled** `--input-disabled` (`hsl(0, 0%, 96.1%)`) / `-foreground` (`hsl(0, 0%, 45.1%)`)

### Conversation Status
- **Serving** `--conv-status-serving` (`hsl(168, 68%, 52%)`) / `-foreground` (`hsl(0, 0%, 100%)`) — teal pill for "AI 服務中"
- **Ended** `--conv-status-ended` (`hsl(0, 0%, 64%)`) — neutral gray
- **Transferred** bg `hsl(46, 100%, 95%)` / text `hsl(32, 90%, 45%)` / border `hsl(43, 80%, 72%)` — amber chip with visible border

### Avatar & Tag Categories *(quarantined hues — never in primary UI or marketing)*
- Tag categories: blue `hsl(217, 91%, 60%)` / green `hsl(142, 71%, 45%)` / orange `hsl(25, 95%, 53%)` / purple `hsl(270, 70%, 60%)`
- Avatar fallbacks: purple `hsl(233, 89%, 76%)` / green `hsl(168, 68%, 52%)` / orange `hsl(32, 95%, 44%)`

### Satisfaction
- **Positive** text `hsl(170, 69%, 28%)` / mid `hsl(170, 63%, 33%)` / light `hsl(170, 57%, 40%)` / bg `hsl(166, 76%, 97%)` / border `hsl(167, 72%, 85%)`
- **Neutral** text `hsl(38, 90%, 44%)` / light `hsl(43, 96%, 52%)` / bg `hsl(43, 96%, 97%)` / border `hsl(43, 80%, 82%)`
- **Negative** text `hsl(14, 78%, 52%)` / dark `hsl(0, 74%, 50%)` / light `hsl(0, 75%, 63%)` / bg `hsl(0, 86%, 97%)` / border `hsl(0, 72%, 85%)`

### Trial Banner
- **Trial BG** `--trial-bg` (`hsl(229, 71%, 95%)`) / **Border** `--trial-border` (`hsl(222, 77%, 79%)`)

### Sidebar (8 dedicated tokens)
- **Background** `--sidebar-background` (`hsl(0, 0%, 98%)`)
- **Foreground** `--sidebar-foreground` (`hsl(240, 5.3%, 26.1%)`)
- **Primary** `--sidebar-primary` (`hsl(240, 5.9%, 10%)`) / `-foreground` (`hsl(0, 0%, 98%)`)
- **Accent** `--sidebar-accent` (`hsl(240, 4.8%, 95.9%)`) / `-foreground` (`hsl(240, 5.9%, 10%)`)
- **Border** `--sidebar-border` (`hsl(220, 13%, 91%)`)
- **Ring** `--sidebar-ring` (`hsl(217.2, 91.2%, 59.8%)`)

### ReactFlow Edges & Handles
- **Edge Stroke** `--edge-stroke` (`hsl(213, 27%, 63%)`) — primary edge
- **Edge Stroke Alt** `--edge-stroke-alt` (`hsl(240, 5%, 83%)`) — secondary / background-grid
- **Handle Custom** `--handle-custom` (`hsl(224, 76%, 72%)`) — node connection points

### Empty State
- **Title** `--empty-state-title` (`hsl(221, 39%, 11%)`) / **Description** `--empty-state-description` (`hsl(218, 11%, 65%)`) / **Icon** `--empty-state-icon` (`hsl(213, 18%, 82%)`)

### SEO Accent (Section-specific)
- **SEO Gold** `--seo-gold` (`hsl(40, 100%, 65%)`) / **SEO Teal** `--seo-teal` (`hsl(168, 64%, 60%)`)

### Chart — Categorical (5 colors) + Gradient (10 steps)
- **Categorical**: `--chart-1` (`hsl(12, 76%, 61%)`) / `--chart-2` (`hsl(173, 58%, 39%)`) / `--chart-3` (`hsl(197, 37%, 24%)`) / `--chart-4` (`hsl(43, 74%, 66%)`) / `--chart-5` (`hsl(27, 87%, 67%)`)
- **Gradient (dark → light, hue 224 → 214)**: `--chart-gradient-1` (`hsl(224, 70%, 55%)`) → `--chart-gradient-10` (`hsl(214, 95%, 85%)`)
- **Chart Grid** `--chart-grid` (`hsl(0, 0%, 0%)` at 10% via `hsla(var(--chart-grid-hsl), 0.1)`) / **Chart BG Muted** `--chart-bg-muted` (`hsl(220, 13%, 91%)`)

## 3. Typography Rules

### Font Family — SSOT
- **`--font-sans`** (the only sanctioned UI face): `'Pontano Sans', 'Source Han Sans TW', 'Noto Sans TC', 'Microsoft JhengHei', sans-serif`
- All UI, body, headings, buttons, labels go through this single stack — Pontano Sans renders Latin, 思源黑體 renders CJK, with regional fallbacks for environments without the self-hosted faces.
- All faces self-hosted from `/fonts`.

> *Note*: The 2025 Brand Guidelines PDF mentions **Urbanist** as an opt-in secondary face for marketing display moments, and **JetBrains Mono** for code — these are *not* in the product CSS spec (`application.css`). Treat them as brand-deck options only. UI surfaces must stay on `--font-sans`.

### Size Scale — SSOT (6 steps)

| Token | Size | Use |
|------|------|-----|
| `--font-size-xs` | 12px | Captions, badges, footnotes, status-chip icons |
| `--font-size-sm` | 14px | Console body, buttons, table cells, dialog body — the dominant size |
| `--font-size-base` | 16px | Marketing body; **mobile inputs** (locked, prevents iOS zoom) |
| `--font-size-lg` | 18px | H5, list-section titles |
| `--font-size-xl` | 20px | H4, sub-section, settings panels |
| `--font-size-2xl` | 24px | H1/H3 page titles, dashboard widgets |

> *Note*: The 6-step scale is the SSOT. `--font-size-3xl` (30px) and `--font-size-4xl` (36px) appear in some marketing contexts but are not part of `application.css`. Stay inside xs–2xl for product surfaces.

### Weight & Line-Height & Tracking
- **Weight**: spec does not define `--font-weight-*` tokens. In practice the product uses 400 (body), 500 (buttons / labels / nav), 600 (Toast titles, page titles, h-tags), 700 (rare emphasis). Pontano Sans variable supports 300–700.
- **Line-height** is set per element, not via tokens. Common values: `leading-none` (1) for labels, `leading-tight` (1.25) for headings, `leading-normal` (1.5) for body, `leading-relaxed` (1.625) for Widget message bubbles.
- **Letter-spacing** is set per element, not via tokens. Headings use `tracking-tight` (≈-0.025em) where needed; body stays at normal tracking.

### Hierarchy in Practice

| Role | Size | Weight | Notes |
|------|------|--------|-------|
| Page Title (H1) | 24px (`text-2xl`) → 20px on `<sm:` | 600 (`font-semibold`) | `tracking-tight` |
| Sub-section (H4) | 20px (`text-xl`) | 600 | |
| List-section (H5) | 18px (`text-lg`) | 500 | |
| Body / Console | 14px (`text-sm`) | 400 | The dominant text size in the product |
| Body / Marketing | 16px (`text-base`) | 400 | |
| Button | 14px (`text-sm`) | 500 (`font-medium`) | `whitespace-nowrap` |
| Label | 14px (`text-sm`) | 500 | `leading-none` |
| Caption / Badge | 12px (`text-xs`) | 400 (caption) / 600 (badge) | `--muted-foreground` for caption |
| Code | 14px / 12px monospace | 400 | Mono face is not in SSOT — use system mono |

### Principles
- **One sans for everything**: Pontano Sans + 思源黑體 covers headings, body, UI labels, buttons. The system avoids serif/sans split — calm consistency comes from one face family.
- **Weight as hierarchy, not color**: H tags use 600, buttons/labels 500, body 400. Inline emphasis is rare — use chips, badges, or button color instead.
- **16px on mobile inputs always**: `Input` is `text-base` on touch (16px) and `md:text-sm` (14px) on desktop. Locking 16px prevents iOS Safari zoom-on-focus.
- **CJK first-class**: 思源黑體 loads alongside Pontano Sans on every text element via `--font-sans` — no per-locale font switching.

## 4. Component Stylings

### Buttons (§7.1)

**Sizes** (radius `16px` for all except icon)

| Size | Height | Px (horizontal) | Tailwind |
|------|--------|-----------------|----------|
| `sm` | 36px | 12px | `h-9 px-3 rounded-[16px]` |
| `default` | 40px | 16px | `h-10 px-4 rounded-[16px]` |
| `lg` | 44px | 32px | `h-11 px-8 rounded-[16px]` |
| `icon` | 40×40px | — | `h-10 w-10 rounded-[12px]` |

**Internal**: 14px / 500 weight, 16px lucide icons (`shrink-0`), 8px gap between icon and text, `whitespace-nowrap`.

**Variants**

| Variant | Background | Text | Border | Use |
|---------|------------|------|--------|-----|
| `default` | `--button-dark-blue` | white | — | Primary CTA |
| `destructive` | `--destructive` | `--destructive-foreground` | — | Delete, dangerous |
| `outline` | `--background` | `--brand-light` | 1px `--brand-light` | Secondary action |
| `secondary` | `--secondary` | `--secondary-foreground` | — | Auxiliary |
| `ghost` | transparent | inherit | — | Icon buttons, low emphasis |
| `form-trigger` | `--background` | `--foreground` | 1px `--border` | Date pickers / popover triggers inside forms — visually matches Input |
| `link` | transparent | `--primary` | — | Inline text link |

**States**: hover → `--button-dark-blue-hover`; focus → `outline: 2px solid --ring; outline-offset: 2px`; disabled → `opacity: 0.5; pointer-events: none`.

### Inputs & Textarea (§7.2 / §7.3)

| Property | Input | Textarea |
|----------|-------|----------|
| Height | 40px (`h-10`) | min 80px (`min-h-[80px]`) |
| Radius | 16px | 16px |
| Border | 1px `--border` | 1px `--border` |
| Padding | 12px / 8px | 12px / 8px |
| Font (desktop) | 14px | 14px |
| Font (mobile) | **16px locked** (prevents iOS zoom) | 14px |
| Placeholder | `--muted-foreground` | — |
| Focus | `ring-2 ring-ring ring-offset-2` | same |
| Disabled | `cursor-not-allowed opacity-50` + `--input-disabled` bg | same |

### Select (§7.4)

| Element | Spec |
|---------|------|
| Trigger | 40px h, 16px radius, 1px `--border`, 12/8px padding, `flex items-center justify-between` |
| ChevronDown | 16px, opacity 0.5, controlled by 12px right padding |
| Content | max-h 384px, min-w 128px, 8px radius, `--popover` bg, `--shadow-md`, 4px padding |
| Item | `rounded-sm` (2px), `pl-6 pr-2 py-1.5`, 14px text, focus → `--accent` bg |
| Small Trigger (inline) | 32px h, min-w 64px, 16px radius, 12-px ChevronDown |

### Dropdown Menu (§7.5)

- Panel: min-w 128px, 8px radius, 1px `--border`, `--popover` bg, 6px padding, `--shadow-lg`, sideOffset 4
- Item: 4px radius, 12/8px padding, 14px, focus → `--accent`
- Submenu trigger: 8/6px padding, ChevronRight 16px `ml-auto`

### Popover & Tooltip (§7.6 / §7.7)

- **Popover**: 288px default width, 6px base radius (commonly overridden to 16px), 16px padding, `--shadow-md`
- **Tooltip**: 6px radius, 12/6px padding, 14px text, `--popover` bg

### Form Atoms (§7.8 – §7.13)

| Component | Spec |
|-----------|------|
| **Checkbox** | 16×16, 2px radius, 1px `--primary` border, checked → `--brand-secondary` bg + white check 16px |
| **Switch** | 44×24 shell, `rounded-full`, on `--switch-checked` / off `--input`, 20×20 thumb (`bg-background` + `--shadow-lg`), translateX 0/20px |
| **Radio** | 16×16, `rounded-full`, 1px `--primary` border, 10px filled circle indicator |
| **Label** | 14px / 500 / `leading-none`, disabled → `opacity-70 cursor-not-allowed` |
| **Badge** | `rounded-full`, 10/2px padding, 12px / 600 weight |
| **Progress** | 16px h, `rounded-full`, track `--secondary`, fill `--progress-blue` |

### Accordion (§7.14)
- Item: `border-b`. Trigger: 16px vertical padding, `flex justify-between`, ChevronDown 16px rotates 180° on open (200ms transform). Content: `pt-0 pb-4`, 14px text.

### Tabs (§7.15)

| Variant | TabsList | Trigger |
|---------|----------|---------|
| Base | 40px h, 6px radius, `--muted` bg, 4px padding | 12/6px padding, 2px radius, 14/500 |
| Dashboard | 56px h, **20px radius**, `--card` bg + 1px border + `--shadow-sm` | **16px radius**, active → `--primary` bg + `--primary-foreground` + `--shadow-sm` |

### Search Input (§7.16)
- Search icon (lucide): 16px, absolute `left-3 top-1/2 -translate-y-1/2`, color `--foreground`
- Input: 40px h, 16px radius, **left padding 36px** (`pl-9`) to clear the icon

### MultiSelectTagsPopover (§7.17)
- Trigger: min-h 40px, 16px radius, 12/8px padding
- Selected badge: 8/4px padding, 12/400, border `--conversation-border`, text `--conversation-primary`, X-icon 8px `ml-1`
- Panel: 280px wide, 16px radius, list 200px scrollable
- Option: 12/8px padding, 8px radius, hover `--muted`, checkbox gap 12px

### Dashed-Border Patterns (§7.18)

| Use | Border | Radius | Background | Border Color |
|-----|--------|--------|------------|--------------|
| Upload area | 1px dashed | 16px | `--sidebar-background` | `--dashed-border` |
| "Add new" button | 1px dashed | 16px | transparent | `--brand-light` |
| Empty state | 1px dashed | 8px | `--muted` | `--dashed-border` |

Icon-text gap: `gap-2` (8px) when full-width; `gap-1` (4px) when inline / table-row.

### Border Width Rule (§7.20)
- Default: **1px**
- Flow nodes & avatars: **2px**
- **Forbidden**: 4px and above

### Scrollbar (§7.21)
- 4px-wide track, transparent. Thumb: `--border` default, hover `--muted-foreground`, 4px radius. Firefox: `scrollbar-width: thin`.

### Cards & Containers (§24, §30.3)
- **Outer card**: `--card` bg, 1px `--border`, 24px radius (16px on `<sm:`), 24px padding (16px on `<sm:`), `--shadow-sm`
- **Inner card**: 16px radius, 16–24px padding, optional `--card-inner-bg` or `hsla(var(--muted-hsl), 0.3)` for "settings panel"
- **Card-on-card composition** is the signature pattern — outer 24px-radius + inner 16px-radius reads as two levels without redundant shadows.

### Sidebar (§7.22 / §21)

**Desktop (≥1024px)**
- `fixed left-0 top-0 bottom-0 z-30`, **108px wide**, `hidden lg:flex`, main content `ml-[108px]`
- Workspace selector: 48×48 `rounded-full`, `--button-dark-blue` bg, `hover:scale-105`, `--shadow-sidebar-active`
- Main nav: 16px gap, 30px left padding, 48×48 buttons `rounded-full`, default `--card` bg + `--shadow-sidebar-inactive`, active `--button-dark-blue` bg + `--shadow-sidebar-active` (`0 4px 8px hsla(228, 70%, 26%, 0.25)`), 20px icons
- Hover: button auto-expands to show 14/500 label with 16px right padding
- UserProfile dropdown: 192px, 16px radius, items 12/8px / 6px radius / 14px, sign-out → `--destructive`

**Mobile / Tablet (<1024px)**
- Hamburger: 40×40 `rounded-full` `fixed top-4 left-4 z-40`, `--background` + 1px `--border` + `--shadow-md`
- Sheet: 280px wide, slides from left, items 16/12px padding / 16px radius / gap-3, active → `--button-dark-blue`

### Dialog / Modal (§4 RWD spec, §7.25, §7.26)
- Container 24px radius, content 16px radius, 20px content padding
- Close button 20px at `top-[24px] right-[24px]`, `--muted-foreground`
- Footer: `flex flex-row` with cancel left (`--cancel-button-bg`) and confirm right (`--button-dark-blue`)
- Title-description gap: `mt-1` (4px)
- Mobile: `w-[calc(100%-2rem)] sm:max-w-lg`

### Drawer / Sheet Interactions (§5 RWD spec)
- Open: trigger button + `open` state. Close: overlay click, ESC, internal close button, or item-select auto-close
- Body scroll locks while open (Radix native)
- Focus trap inside; focus returns to trigger on close
- 200ms slide animation
- Overlay: `bg-overlay/50`, click to close
- z-index: overlay & content both `z-50`, hamburger `z-40` — DOM order handles stacking

### Toast (§25)
- 16px radius, 24px padding (right 32px for close), `--shadow-lg`, `flex items-center gap-4`
- Mobile: `top-4 right-4 w-[calc(100%-2rem)]`. Desktop: `top-[72px] right-6 max-w-[420px]`. z-index 100.
- **Variants**: `default` / `destructive` (AlertCircle) / `success` (CheckCircle, `--status-success` bg) / `warning` (AlertTriangle, `--status-warning` bg)
- Title 14/600, description 14 with opacity 0.9, action 32px h / 6px radius / 14/500
- Close button: absolute `right-2 top-2`, 6px radius, X 16px, hidden until `group-hover:opacity-100`

### Form Validation (§26)
- **Error Input**: border `--destructive`, focus ring `--destructive`, bg unchanged
- **Error message**: 14px `--destructive`, mt-2 (8px), optional AlertCircle 14px `mr-1`, **must wrap — never truncate**
- **Field highlight**: bg `hsla(var(--destructive-hsl), 0.05)`, label `--destructive`
- **Global Alert**: 16px radius, bg `hsla(var(--destructive-hsl), 0.1)` + 1px border `hsla(var(--destructive-hsl), 0.3)` + 16px padding, AlertCircle 16px + 14px text both `--destructive`

### File Upload Progress (§27)
- Container: 1px `--border`, 16px radius, 16px padding
- Track: 8px h, `rounded-full`, `--secondary`
- Fill: `--progress-blue`, `transition-all duration-300`
- Status mapping: `uploading` → `--progress-blue` + Loader2 spin / `processing` → `--status-info` / `completed` → `--status-success` + CheckCircle / `error` → `--destructive` + AlertCircle

### Table / DataTable (§22)
- Row: `border-b` (1px `--border` bottom)
- TableHead (`th`): 12px / 500 weight / `--muted-foreground`
- TableCell (`td`): 14px
- Row hover: `bg-muted/50`. **No zebra striping.**
- Mobile collapses to Card via `hidden lg:block` / `lg:hidden` paired DOM (see RWD §6)

### Pagination (§23)
- Items reuse Button `outline` variant; active → `default`
- Prev / Next: ChevronLeft / ChevronRight 16px

### Charts (§28)

| Chart Type | Color Source | Rule |
|------------|--------------|------|
| Pie / donut | `--chart-gradient-1` … `-10` | First N steps, dark first |
| Bar | `--chart-gradient-1` … `-10` | Same; per-group hue per series |
| Trend line | Fixed mapping (below) | No gradient |
| Area | `--chart-gradient-4` + fill `hsla(var(--primary-hsl), 0.1)` | Low-alpha fill |

**Trend line fixed colors**: 總處理量 → `--button-dark-blue` (228 70 26) / 完成量 → `--primary` (224 76 67) / 轉真人 → `hsla(var(--foreground-hsl), 0.3)`

**Axes**: grid `hsla(var(--chart-grid-hsl), 0.1)`, axis line `--border`, label `--muted-foreground` 14px, tooltip bg `--popover` + `--shadow-md`. Bar corner radius 4px. Data point radius 4px (≤14 points) / 0px (>14), hover 6px. Line tension 0.4.

**Forbidden**: hardcoded hex / mixing brand & status colors / using `--destructive` as a chart series.

### Icon Color Rules (§29)

| Scenario | Token |
|----------|-------|
| Primary action icon | `--foreground` |
| Secondary / hint icon | `--muted-foreground` (e.g. ChevronDown, Info, Clock) |
| Status success icon | `--status-success` |
| Status warning icon | `--status-warning` |
| Status error icon | `--destructive` (AlertCircle, Trash2) |
| Brand icon | `--brand-light` (Plus, "add new") |
| Empty-state icon | `--empty-state-icon` |
| Inverted icon (on dark bg) | `--primary-foreground` |

**Sizes**: inline 16px (`h-4 w-4`) / list-row 20px (`h-5 w-5`) / empty-state 24–48px (`h-6 w-6` to `h-12 w-12`).

**SVG**: stroke-width 2 default, 1.6 for empty-state and large icons. `fill: none` (no fill except Radio indicator).

### Distinctive Components

**ReactFlow Script Editor (§19)**
- Node: 16px radius, **2px border**, 12×12 filled-circle handles (`border-2 border-white`)
- Edge stroke: `--edge-stroke`. Background grid: `--edge-stroke-alt`
- 11+ node-type color themes (each maps icon + bg + border + handle + accent text):
  - **MessageEntry**: `--message-entry-bg` / `--message-entry-border` / `--primary` & `--muted-foreground` handles / `--status-info` accent
  - **KeywordTrigger / UserTagTrigger**: `--status-info/10` + `--status-info/30` (or `--tag-primary` variants)
  - **ConditionalFlow / IfCondition / SwitchCondition**: `--status-warning/10` + `--status-warning/30` (warning theme)
  - **ReplyMessage / AddTag**: `--status-success/10` + `--status-success/30`
  - **RemoveTag**: `--destructive/10` + `--destructive/30`
  - **TransferToHuman**: `--primary/10` + `--primary/30`
  - **AISmartScript**: `--background/95` + `--message-entry-border`
- IfCondition: True handle `top: 45%` `--status-success`, False handle `top: 65%` `--destructive`, branch labels at `right: -60px`
- Toolbar: `min-h-[48px] md:h-16`, `border-b border-border`, `bg-muted/50`, padding `px-3 md:px-[16px] py-2 md:py-0`

**Customer-Facing Widget (§7.23)**
- Floating button: 56×56 `rounded-full`, `bg-primary`, `fixed bottom-6 right-6 z-50`, MessageSquare 24px, `--shadow-2xl`
- Container: **400×650px, 24px radius**, `--card` bg, 1px `--border`, `--shadow-xl` (enhanced)
- Header: 20/16px padding, `--muted` bg, agent avatar 40×40, agent name 14/500, gap-3, reset button 32×32 / 8px radius
- **Message bubbles**: max-w 267px, 16/12px padding, 14px / `leading-relaxed` (1.625)
  - User: `--button-dark-blue` bg, white text
  - AI: `--muted` bg, `--foreground` text
- **Bubble corner-radius rules** (signature detail):

| Position | TL | TR | BL | BR |
|----------|----|----|----|----|
| User | 16 | 16 | 16 | 4 |
| AI single | 16 | 16 | 4 | 16 |
| AI sequence head | 16 | 16 | 4 | 16 |
| AI sequence middle | 4 | 16 | 4 | 16 |
| AI sequence tail | 4 | 16 | 16 | 16 |

- Spacing: different speakers `mt-4` / consecutive AI `mt-1` / after carousel `mt-0`
- AI avatar (sequence head): 24×24 `rounded-full`, `--accent` bg, name 12/500/`--muted-foreground`, `gap-2 mb-1.5`
- Timestamp: 12px `--muted-foreground`, mt-1, 24h `HH:mm`
- Quick-reply buttons: `flex-col gap-2 items-end`, mt-3, max-w 267px, 12/6px padding, 14px left-aligned
- Product carousel: 1.6:1 (167h × 267w), `rounded-t-[16px]`
- Typing dots: `animate-bounce` with staggered 0/150/300ms delays
- **Widget is not responsive** — locked at 400×650 across all viewports

## 5. Layout Principles

### Spacing System (4px grid)
Tokens: `--sp-0` (0) / `--sp-1` (4) / `--sp-2` (8) / `--sp-3` (12) / `--sp-4` (16) / `--sp-5` (20) / `--sp-6` (24) / `--sp-7` (28) / `--sp-8` (32) / `--sp-9` (36) / `--sp-10` (40) / `--sp-11` (44) / `--sp-12` (48) / `--sp-14` (56) / `--sp-16` (64) / `--sp-20` (80) / `--sp-24` (96) / `--sp-32` (128).

Semantic: `--card-padding` = 24, `--input-padding-x/y` = 12/8, `--btn-padding-x/y` = 16/8, `--section-gap` = 24, `--item-gap` = 16.

Page horizontal margin: 16 (mobile) / 24 (tablet) / 40 (desktop) — tokens `--page-mx-sm` / `-md` / `-lg`.

### Component Heights
- Input / Button default: 40px (`--height-input`, `--height-btn`)
- Compact: 32px / 36px (`--height-input-sm`, `--height-btn-sm`)
- Large button: 44px (`--height-btn-lg`)
- Textarea minimum: 80px (`--height-textarea-min`)
- Sheet width: 360px desktop / 280px mobile sidebar (`--width-sheet`)

### Border Radius Scale
- 4px (`--radius-xs`): Dropdown menu items
- 8px (`--radius-sm`): Badges, popover items, tags
- 12px (`--radius-md`): Icon buttons
- 16px (`--radius-lg`): Buttons, inputs, dialogs (content), inner cards
- 24px (`--radius-card`): Outer cards, dialog containers, **Widget container**
- 9999px (`--radius-full`): Avatars, status pills, sidebar circular buttons, quick-reply chips

### Grid & Container
- Console: full-width with 108px fixed left sidebar (≥1024px)
- Cards in 1 / 2 / 3 / 4 / 5 column responsive grids
- Dashboard uses 12-col grid; cards span variable columns
- Widget: locked at 400×650
- No magazine asymmetry — everything aligns to the 4px grid

### Data-Dense Components — Table ↔ Card Collapse (§6 RWD)
- Switch breakpoint: `lg:` (≥1024px). Below 1024px tables collapse to cards
- Implementation: `hidden lg:block` (Table) + `lg:hidden` (Card) — paired DOM, both rendered
- **Field priority**:
  - **P0 (must show)** — primary identity (name / ID / title) — `truncate max-w-[200px]`
  - **P1 (important)** — status badge, action button — moved to card top-right or bottom on mobile
  - **P2 (secondary)** — timestamp, description, secondary numbers — `text-xs text-muted-foreground`, may truncate
  - **P3 (hideable)** — full URLs, detailed stats — `hidden sm:block` or collapsible
- **Long strings**: tokens / API keys → `truncate max-w-[200px]` + copy button. URLs → `break-words min-w-0`. User names → `truncate`. Long descriptions → `line-clamp-2` + Tooltip.
- **Horizontal scroll**: forbidden at page level (`overflow-x-hidden`), allowed inside Tables / Tabs nav / canvas.

### Whitespace Philosophy
- **Functional density over editorial breathing**: this is a console where merchants spend hours. Spacing is generous enough to scan but tight enough to fit dense data — closer to a financial dashboard than a marketing site.
- **Card-on-card layering**: sections are demarcated by card boundaries, not whitespace. Two stacked cards beat two paragraphs separated by 80px of air.

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow, no border | Body, inline content |
| Bordered | 1px `--border`, no shadow | Inputs, list rows |
| `--shadow-sm` | `0 1px 2px /5%` | Outer cards |
| `--shadow-md` | `0 2px 8px /8%` | Popovers, dropdowns, tooltips |
| `--shadow-lg` | `0 4px 12px /10%` | Toast, lifted cards, dropdown panels |
| `--shadow-xl` | `0 10px 30px /15%` | Dialogs, Widget container |
| `--shadow-2xl` (computed) | `0 20px 50px /20%` | Floating Widget button |

**Sidebar-specific shadows** (the only colored shadows in the system):
- `--shadow-sidebar-active`: `0 4px 8px hsla(228, 70%, 26%, 0.25)` — navy-tinted glow on active sidebar button
- `--shadow-sidebar-active-hover`: `0 6px 12px hsla(228, 70%, 26%, 0.35)`
- `--shadow-sidebar-inactive`: `0 2px 4px hsla(var(--overlay-hsl), 0.05)`
- `--shadow-sidebar-inactive-hover`: `0 4px 8px hsla(var(--overlay-hsl), 0.1)`
- `--shadow-sheet`: `-4px 0 16px hsla(var(--overlay-hsl), 0.1)` — left-side sheet panel

**Decorative depth**:
- **Card-on-card layering** is the primary depth tool — outer 24px + inner 16px reads as two levels without redundant shadows
- **Page background gradient** (`--page-bg-gradient`) provides ambient depth without per-card chrome
- **No backdrop-blur, no frosted glass** — surfaces are fully opaque

## 7. Do's and Don'ts

### Do
- Use `--button-dark-blue` (`hsl(228, 70%, 26%)`) for primary CTA fills — *not* `--brand-primary`
- Use `--brand-primary` (`hsl(230, 70%, 26%)`) for brand identity, borders, marketing
- Use `--primary` (`hsl(224, 76%, 67%)`) for focus rings, switch checked, AI accents
- Use `--brand-light` (`hsl(220, 77%, 67%)`) for outlines and "add new" dashed borders
- Pair Pontano Sans with 思源黑體 via the single `--font-sans` stack on every text element
- Stay on the 4px spacing grid; reach for `--sp-*` tokens, never magic numbers
- Use card-on-card composition (outer 24px + inner 16px) to communicate hierarchy
- Hover buttons *darker*, never lighter (`--button-dark-blue-hover`)
- Keep neutrals pure grayscale (HSL 0% saturation)
- Use the 10-step `--chart-gradient-*` ramp for data viz; the 5 categorical `--chart-1..5` for series with no ordinal meaning
- Use `9999px` radius for avatars, status pills, sidebar circular buttons, quick-reply chips
- Use 16px on mobile inputs (locked) to prevent iOS zoom; 14px is the dominant body size in console
- Use 您 (polite "you") in zh-TW; sentence case in English UI; action verbs (確認 / 取消 / 儲存 / 下一步)
- Validation errors and toast messages must wrap — never truncate
- For alpha, use `hsla(var(--xxx-hsl), α)` — never `hsl(var(--token) / α)`
- Cards reflow `rounded-[16px] sm:rounded-[24px]` and `p-3 sm:p-6` across breakpoints

### Don't
- Don't introduce gradient washes beyond `--page-bg-gradient` body and the 10-step `--chart-gradient` ramp
- Don't use backdrop-blur, frosted glass, or any non-opaque surface treatment
- Don't tint grays — neutrals are HSL 0% saturation across the entire system
- Don't mix `--brand-primary` with `--button-dark-blue` — they are 3° apart and serve different roles
- Don't use purple or green in primary UI — quarantined to avatar fallbacks and tag categories only
- Don't use emoji in product copy or as UI icons; lucide-react is the icon system
- Don't use stock photography in the UI; merchant product photos appear only inside the Widget carousel at 1.6:1
- Don't use border widths above 2px (flow nodes / avatars are the 2px ceiling)
- Don't use exclamation marks in product copy or playful microcopy — tone is operational B2B
- Don't break the 200ms ease animation budget — no springs, bounces, or parallax (typing-dot bounce is the single exception)
- Don't truncate validation messages, toast errors, or sidebar labels (use Tooltip for sidebar overflow)
- Don't use Urbanist, JetBrains Mono, `--font-size-3xl` / `-4xl`, or `--font-weight-*` tokens — they are not in the SSOT CSS
- Don't apply colored shadows except the sidebar `--shadow-sidebar-active*` family
- Don't full-bleed imagery on any product surface; cards always contain content
- Don't put Dialog form Labels horizontally with Inputs in L3 locales — default to vertical `flex flex-col gap-1.5`
- Don't fix Button widths (`w-[120px]`) — L3 locale text will overflow; let `flex-wrap` handle the parent
- Don't introduce hardcoded hex / rgb in chart colors — must reference `--chart-gradient-*` or `--chart-1..5`

## 8. Responsive Behavior

### Breakpoints (Tailwind min-width)

| Stage | Tailwind | Width | Use |
|-------|----------|-------|-----|
| Mobile | (default) | <640px | Single column, vertical stack, minimal |
| Large Mobile | `sm:` | ≥640px | Inline labels, horizontal switches, grid transitions |
| Tablet | `md:` | ≥768px | Dual-column or switching layouts |
| Desktop | `lg:` | ≥1024px | Multi-column, sidebar permanent (108px) |

`sm:` is for fine progressive enhancement — `hidden sm:inline` (label visibility), `flex-col sm:flex-row` (orientation), `rounded-[16px] sm:rounded-[24px]`, `p-3 sm:p-6`, `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5`. `sm:` does not change major layout structure (sidebar / 3-col → 1-col is `md:`/`lg:`).

**Edge rules**: 1024px exactly triggers `lg:` (sidebar permanent, 3-col). 768px triggers `md:` but not `lg:`. Forbid fuzzy ranges like `> 1024` or `768–1024`.

### Touch Targets (§30.2)
- Mobile interactive button: 40×40 min (`h-10 w-10` or `min-h-[40px]`)
- List item: ≥44px tall (`min-h-[44px]`)
- Small close/delete buttons: 24×24 desktop / 32×32 mobile (`h-6 w-6 sm:h-8 sm:w-8`)

### Spacing Scaling Across Breakpoints

| Element | Mobile | Tablet | Desktop | Tailwind |
|---------|--------|--------|---------|----------|
| Page horizontal margin | 16px | 24px | 40px | `mx-4 md:mx-6 lg:mx-10` |
| Card padding | 16px | 24px | 24px | `p-4 md:p-6` |
| Card radius | 16px | 24px | 24px | `rounded-[16px] md:rounded-[24px]` |
| Section gap | 16px | 24px | 24px | `space-y-4 md:space-y-6` |

### Text Scaling
- Input: 16px mobile / 14px desktop (`text-base md:text-sm`) — locked to prevent iOS zoom
- Page title: 20px mobile / 24px desktop (`text-xl sm:text-2xl`)
- Body / Tab / description: 14px (no scaling)

### Page-Level Patterns (§3 RWD spec — partial)
- **Conversations** (`/conversations`): three-column desktop (list / thread / detail) → single-column mobile with `mobileShowDetail` toggle. Mobile shows list by default; tap row to swap to thread view.
- **Dashboard** (`/dashboard`): 12-col grid desktop. Date filter inputs **must stack vertically** on 375px (not horizontal), or they overflow. Tabs use Dashboard variant (56px h, 20px radius).
- **CreateAIAgent** (`/`): wizard stepper. Progress indicator: 32×32 circles, current step `--brand-light/10` bg.
- **ScriptEditor** (`/script-editor`): Header `md:flex-nowrap` desktop allows everything in one row; `flex-wrap` mobile lets toolbar wrap to multiple rows. Canvas full-bleed.
- **Settings**: left tabs permanent on desktop (`w-80` panel) → Drawer on mobile. Tab labels truncate inside Drawer with Tooltip.
- **Widget** (`/widget`): locked 400×650, fixed bottom-right — does not respond to viewport.

### i18n Overflow Rules (§7 RWD spec)

**Locale stress groups**:
- **L1 (1.0x)**: zh-TW, zh-CN, ja, ko — CJK, naturally compact
- **L2 (1.2x–1.5x)**: en, id, vi
- **L3 (1.5x–2.0x)**: de, fr, es, th — German compounds, French verb conjugations, Thai no-spaces

**Component overflow strategy**:

| Component | Width Rule | Overflow | L3 Behavior |
|-----------|------------|----------|-------------|
| Button | Auto-fit, **never `w-fixed`** | `whitespace-nowrap` | Container `flex-wrap` |
| Tab label | Auto-fit | `whitespace-nowrap` | Container `overflow-x-auto` |
| Sidebar nav | `max-w-[108px]` desktop | `truncate` + Tooltip | Hover expands, Sheet truncates |
| Table header | `min-w-[80px]` start | `truncate` | `<lg:` collapse to Card |
| Card title | `min-w-0` | `truncate` or `line-clamp-2` | Same |
| Dialog title | `max-w-[calc(100%-48px)]` | `truncate` or wrap | Wrap |
| PageHeader title | Auto | Wrap | Wrap |
| PageHeader actions | `flex-shrink-0` → `flex-wrap` | Multi-line | Buttons wrap to row 2 |
| Toast | Mobile `w-full`, desktop `max-w-[420px]` | Wrap | Multi-line, `line-clamp-3` extreme |
| Validation error | Follows Input width | Wrap | Multi-line, **never truncate** |
| Dialog form Label | Auto | `whitespace-normal` | Switch to vertical `flex-col` (4+ chars) |

**Action priority** (when space-constrained):
- **P0**: Save / Confirm — always visible, `flex-1` or full-width
- **P1**: Cancel / Back — always visible, `flex-1`
- **P2**: Export / Copy — collapse into `DropdownMenu`, icon-only + Tooltip on L3
- **P3**: Batch / Settings — `hidden sm:flex`, in menu

**Dialog form labels**: default to vertical stacking (`flex flex-col gap-1.5` + Input `w-full`). Horizontal `gap-3` is allowed only for ≤4-char labels in L1 locales. **For L3 always use vertical** to prevent label-Input compression.

**Dates & numbers**:
- All date formats use ISO (`yyyy-MM-dd`, `MM/dd HH:mm`) regardless of locale — explicit decision to avoid locale-specific format confusion (no `DD/MM` for fr)
- `Intl.NumberFormat(locale)` for statistics (`1,000` en vs `1.000` de) and percent
- IDs and tokens are **never** number-formatted — display raw

### Acceptance Viewports (§10.1)

| Viewport | Width | Device | Class |
|----------|-------|--------|-------|
| Mobile portrait | 375px | iPhone SE / 14 | Mobile |
| Mobile landscape | 667px | iPhone landscape | Mobile horizontal |
| Tablet portrait | 768px | iPad Mini | Tablet |
| Tablet landscape | 1024px | iPad Pro landscape | Desktop edge |
| Desktop | 1440px | Standard desktop | Desktop |

**Per-page checklist**: 375px no horizontal scroll → 768px layout switch correct → 1024px full sidebar + multi-col → 50+ char names truncate without overflow → empty states centered → buttons ≥40px touch → Drawer ESC / focus return / scroll lock all work → tokens not hardcoded → L3 locales pass at every viewport → 2× pseudolocale strings respect truncate/wrap/line-clamp.

## 9. Agent Prompt Guide

### Quick Color Reference
- **Primary CTA fill**: "Button Dark Blue (`--button-dark-blue`, `hsl(228, 70%, 26%)`)" — *not* brand-primary
- **Brand identity**: "Brand Primary Navy (`--brand-primary`, `hsl(230, 70%, 26%)`)"
- **Interactive accent**: "Primary (`--primary`, `hsl(224, 76%, 67%)`)" — focus, switch, AI message
- **Outline / dashed**: "Brand Light (`--brand-light`, `hsl(220, 77%, 67%)`)"
- **Page background**: "Page BG Gradient (`--page-bg-gradient`, 180deg neutral grey → `hsl(228, 68%, 93%)`)"
- **Card surface**: "Card (`--card`, white) with 1px `--border` (`hsl(0, 0%, 89.8%)`)"
- **Inner card**: "Card Inner BG (`--card-inner-bg`, `hsl(210, 20%, 98%)`)"
- **Primary text**: "Foreground (`--foreground`, `hsl(0, 0%, 3.9%)`)"
- **Secondary text**: "Muted Foreground (`--muted-foreground`, `hsl(0, 0%, 45.1%)`)"
- **Status (teal serving)**: "`--status-success` `hsl(168, 68%, 52%)`"
- **Status (warning amber)**: "`--status-warning` `hsl(32, 95%, 44%)`"
- **Destructive red**: "`--destructive` `hsl(0, 84.2%, 60.2%)`"

### Example Component Prompts
- "Create a primary CTA button: `--button-dark-blue` background (`hsl(228, 70%, 26%)`), white text, 16px radius, `h-10` (40px) height, `px-4`, Pontano Sans 14px / 500. Hover transitions to `--button-dark-blue-hover` (`hsl(229, 72%, 21%)`) over 200ms ease. Focus outline `2px --ring` with `outline-offset: 2px`."
- "Design a console outer card on `--card` (white) with `1px solid --border`, **24px radius desktop / 16px radius mobile** (`rounded-[16px] sm:rounded-[24px]`), padding `p-4 md:p-6`, `--shadow-sm`. Inner card uses 16px radius and `--card-inner-bg` (`hsl(210, 20%, 98%)`)."
- "Build a status chip pill (`rounded-full`) with text `--status-success`, background `hsla(var(--status-success-hsl), 0.1)`, 12px lucide MessageSquare icon, label '
AI 服務中' in Pontano Sans 12px / 500."
- "Compose a Dashboard chart with the 10-step `--chart-gradient-*` ramp (`hsl(224, 70%, 55%)` → `hsl(214, 95%, 85%)`). Trend lines use fixed mapping: total → `--button-dark-blue`, completed → `--primary`, transferred-to-human → `hsla(var(--foreground-hsl), 0.3)`. No grid lines beyond `hsla(var(--chart-grid-hsl), 0.1)`. Line tension 0.4."
- "Build a customer-facing Widget: 400×650 fixed bottom-right, **24px container radius**, `--card` bg, `--shadow-xl` enhanced. User bubbles `--button-dark-blue` bg + white text, AI bubbles `--muted` + `--foreground`, max-w 267px, leading-relaxed. Apply the bubble corner-radius rule table: user `[16,16,16,4]`, AI single `[16,16,4,16]`, AI mid `[4,16,4,16]`, AI tail `[4,16,16,16]`."
- "Render a Toast (success): `--status-success` bg, white text, 16px radius, 24px padding (right 32px), `--shadow-lg`, mobile `top-4 right-4 w-[calc(100%-2rem)]` desktop `top-[72px] right-6 max-w-[420px]`, z-100. Title 14/600, description 14 opacity-90, CheckCircle icon 16px."
- "Build a sidebar (desktop): `fixed left-0 z-30 w-[108px] hidden lg:flex`. Active nav button — 48×48 `rounded-full`, `--button-dark-blue` bg, `--shadow-sidebar-active` (`0 4px 8px hsla(228, 70%, 26%, 0.25)`). Mobile collapses to hamburger 40×40 at `top-4 left-4 z-40` triggering a 280px Sheet."
- "Render a ScriptEditor IfCondition node: 16px radius, **2px** border, `--status-warning/10` bg with `--status-warning/30` border. True handle at `top: 45%` color `--status-success`; False handle at `top: 65%` color `--destructive`. Branch labels at `right: -60px` matching the handle colors. Handle is 12×12 with `border-2 border-white`."
- "Validation: error Input border switches to `--destructive`, error message below at `mt-2` 14px `--destructive` (allow wrap, never truncate). Global form Alert: `rounded-[16px]` with `bg-destructive/10` + `border-destructive/30`."

### Iteration Guide
1. Default to **white surfaces and pure grayscale neutrals** — if a tinted gray sneaks in, it's wrong
2. Use the **right blue token** for the role: `--button-dark-blue` for CTA fill, `--brand-primary` for identity, `--primary` for interactive accents, `--brand-light` for outlines. They look almost identical but encode different intent.
3. State color names with the token AND HSL — "use `--status-success` (`hsl(168, 68%, 52%)`)" not "make it green"
4. Reference radius by token — `--radius-card` (24), `--radius-lg` (16), `--radius-md` (12), `--radius-sm` (8), `--radius-xs` (4), `--radius-full` (9999)
5. Spacing is always `--sp-*` — never `13px` or `21px`
6. Specify font as **Pontano Sans + 思源黑體 via `--font-sans`** — both load on every text element
7. For buttons, hover **darker** — never lighter, never differently colored
8. Use the named shadow step (`--shadow-sm` / `-md` / `-lg` / `-xl` / `-2xl`) — never invent new ones
9. Lucide-react is the icon system — name the specific icon (`ChevronDown`, `MessageSquare`, `Bot`, `AlertCircle`) and the size class (`h-3 w-3` / `h-4 w-4` / `h-5 w-5` / `h-6 w-6`)
10. UI tone in zh-TW: 您 not 你, no emoji, no exclamation marks, action verbs (確認 / 取消 / 儲存 / 下一步)
11. RWD: `mobile-first`, use `sm:` for fine progressive enhancement, `md:` for layout switches, `lg:` (1024) for sidebar/desktop. Test at 375 / 667 / 768 / 1024 / 1440.
12. i18n: never `w-[120px]` on Buttons. Default Dialog form Labels to vertical (`flex-col`). Always wrap toast and validation errors. Tables collapse to Cards under 1024px via `hidden lg:block` / `lg:hidden` paired DOM.
13. For alpha: `hsla(var(--xxx-hsl), α)` — *not* `hsl(var(--token) / α)`. The codebase enforces this.
14. If you reach for blur, frosted glass, multi-hue gradient, stock illustration, or the Don't list — stop. The system is opaque, single-gradient (page-bg only), single-ramp (chart-gradient only).

## 10. Brand Assets

> Per the **2025 RaccoonAI Brand Guidelines** (canonical source: `Raccoon AI.pdf` pages 6–10 for logo, 13–14 for color, 15–16 for type). The bundled `assets/` and `fonts/` folders ship alongside this DESIGN.md.

### Logo Anatomy

The mark is a chat-bubble symbol fusing the letter **"R"** with a dialogue shape — deep navy over a light-blue stacked card. The wordmark uses a clean modern sans in the primary navy. Source SVG (`logo-source.svg`) is **2054 × 362** (≈ 5.67:1 aspect). All variants are recolored from this single source.

The brand-asset navy is `#142572` — aligned with product CSS `--brand-primary` (`hsl(230, 70%, 26%)`). Treat the SVG as canonical for printed / external surfaces; in product code, reference `--brand-primary` and let the CSS token render.

### Asset Inventory (`assets/`)

| File | Purpose | When to use |
|------|---------|-------------|
| `logo-source.svg` | Original supplied wordmark (light-blue background lockup) | Provenance reference only — do not embed |
| `logo-light-bg.svg` / `.png` | Wordmark on white | Default light surface (websites, docs, decks, white cards) |
| `logo-lightblue-bg.svg` | Wordmark on `--brand-light` `hsl(220, 77%, 67%)` | Light-blue brand surface |
| `logo-darkblue-bg.svg` / `.png` | Wordmark on `--brand-primary` navy | Navy brand surface |
| `logo-dark-bg.svg` / `.png` | Wordmark on black | Pure-black backgrounds, dark-deck slides |
| `logo-mono-navy.svg` | Single-color navy wordmark | Knockout / press / one-color print |
| `logo-mono-white.svg` | Single-color white wordmark | Photo / saturated-color backgrounds, embossing |
| `logo-mark-light-bg.svg` … `logo-mark-mono-white.svg` (6 variants) | **Mark only** (no wordmark) | Avatars, favicons, app icons, social profile pics, `<32px` lockups |
| `logo-mark.png` / `logo-mark-small.png` | Raster fallbacks for mark | Legacy surfaces requiring PNG |

**Six wordmark variants × six matching mark-only variants** = full background coverage. PNG exports retained as raster fallbacks for legacy surfaces.

### Logo Usage Rules

- **Clearspace**: minimum **2x on all sides**, where *x* is the distance between the mark and the wordmark in the primary lockup (Brand Guidelines p. 7). Never violate clearspace.
- **Approved backgrounds**: white, brand navy (`--brand-primary`), black, low-saturation neutral tints (Brand Guidelines p. 9).
- **On navy surfaces**: use `logo-darkblue-bg.svg` (white-and-navy variant).
- **On photographic / saturated-color surfaces**: use `logo-mono-white.svg` or `logo-mono-navy.svg` (single-color knockout). **Never** place the multi-color wordmark over photos.
- **Switch to mark-only** below ~32px or for avatar / favicon / app-icon contexts where wordmark legibility fails.
- **Never** rotate, distort, recolor outside the sanctioned six variants, or apply effects (drop shadow, glow, outline) to any logo file.

### Font Files (`fonts/`)

| File | Family | Role | Variable Range |
|------|--------|------|----------------|
| `PontanoSans-VariableFont_wght.ttf` | Pontano Sans | **Primary** Latin face — UI, body, titles, buttons | wght 300–700 |
| `SourceHanSansTW-VF.otf` | 思源黑體 / Source Han Sans TW | **Primary CJK** face — pairs with Pontano Sans via unicode-range cascade | wght 250–900 |
| `Urbanist-VariableFont_wght.ttf` | Urbanist | **Secondary** — opt-in for small-screen / article body / 800–900 weight contrast (marketing only, *not* the product UI SSOT) | wght 100–900 |

Three brand faces self-hosted. **JetBrains Mono** for code is loaded from Google Fonts (not bundled); upload a local TTF if self-hosting is needed.

**Approved weights per face**:
- Pontano Sans: 400 / 500 / 600 / 700 (no 800–900 available)
- Urbanist: 200–900 full variable range (secondary use only)
- 思源黑體: Regular / Normal / Medium / Bold / Heavy

### Icon System (`assets/icons/lucide-cheatsheet.md`)

The product uses **lucide-react** — no custom icon font, no SVG sprite. Icons load from CDN in static artifacts:

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>lucide.createIcons();</script>
<i data-lucide="message-square" class="h-4 w-4"></i>
```

**Sizing scale (matches Component spec §29)**:

| Class | px | Use |
|-------|-----|-----|
| `h-3 w-3` | 12 | Status-badge icons, flow-node action buttons (Copy/X) |
| `h-4 w-4` | 16 | **Default** — buttons, inputs, list rows, ChevronDown |
| `h-5 w-5` | 20 | Section-title icons, settings nav, flow-node headers |
| `h-6 w-6` | 24 | Widget floating button |
| `h-8 w-8` | 32 | Upload area, empty-state sm |
| `h-12 w-12` | 48 | Empty-state md, knowledge-training loader |
| `h-16 w-16` | 64 | Empty-state lg |

Stroke weight: lucide default (~1.5). Dashed empty-state variant overrides to `strokeWidth: 1`, `strokeDasharray: "1 0.5"`.

**Icons referenced across the spec**:
- Navigation: `ArrowLeft` `ChevronDown` `ChevronRight` `MoreHorizontal` `X` `Plus` `Minus` `Check`
- Messaging: `MessageSquare` `MessageCircle` `Send` `Paperclip` `Bot`
- Content: `FileText` `Upload` `Download` `Copy` `Trash2` `Edit` `Info` `AlertCircle`
- Form: `Eye` `EyeOff` `Search` `Clock` `Loader2`

**No emoji in product UI**. The only sanctioned unicode is `→` (desktop) / `↓` (mobile) as a date-range separator between filter fields.

### What's NOT Bundled (Asks)

- Monochrome white-on-transparent SVG for press / embossing (asked, awaiting source)
- Multi-size favicon ICO bundle (16 / 32 / 180)
- Self-hosted JetBrains Mono TTF (currently Google Fonts)
- Marketing slide template (none provided in original spec)
- Stock photography / spot illustrations — by design, the system does not use any. Empty states use single lucide icons in `--empty-state-icon`.
