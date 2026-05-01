# Lucide icons

The product uses **lucide-react** icons. There is no custom icon font, SVG sprite, or icon component library to copy — icons are referenced by name throughout the specs and rendered inline at the sizes below.

## Loading

In an HTML artifact, load lucide from CDN:

```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>lucide.createIcons();</script>
```

And use:

```html
<i data-lucide="message-square" class="h-4 w-4"></i>
```

## Size conventions

| Size | px | Tailwind | Used for |
|---|---|---|---|
| xs | 12 | `h-3 w-3` | status-badge icons, flow-node action buttons (Copy/X) |
| sm | 16 | `h-4 w-4` | **default** — buttons, inputs, list-row icons, ChevronDown |
| md | 20 | `h-5 w-5` | page section-title icons, settings nav, flow-node headers |
| lg | 24 | `h-6 w-6` | widget floating button icon |
| xl | 32 | `h-8 w-8` | upload-area icon, empty-state sm |
| 2xl | 48 | `h-12 w-12` | empty-state md, knowledge-training loader |
| 3xl | 64 | `h-16 w-16` | empty-state lg |

Stroke weight is lucide's default (~1.5). The **dashed** empty-state variant overrides to `strokeWidth: 1` with `strokeDasharray: "1 0.5"` for a softer, more decorative feel.

## Icons referenced in the specs

Navigation & chrome: `ArrowLeft`, `ChevronDown`, `ChevronRight`, `MoreHorizontal`, `X`, `Plus`, `Minus`, `Check`

Messaging / widget: `MessageSquare`, `MessageCircle`, `Send`, `Paperclip`, `Bot`

Content / files: `FileText`, `Upload`, `Download`, `Copy`, `Trash2`, `Edit`, `Info`, `AlertCircle`

Form: `Eye`, `EyeOff`, `Search`, `Clock`, `Loader2`

## Emoji & unicode

- **No emoji** in product UI. Ever.
- Only unicode used as a visual element is the `→` / `↓` separator between date-range fields (desktop/mobile respectively).
