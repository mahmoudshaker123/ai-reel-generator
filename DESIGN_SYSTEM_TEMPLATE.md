# Project Design System Specification & Token Architecture

This template defines the complete design system and token contract for a project before writing code.
Duplicate or adapt this specification for each new project to guarantee a bespoke visual identity.

---

## 1. Brand Identity & Creative Direction

| Property | Value |
|---|---|
| **Product Name** | AI Reel Studio |
| **Domain / Industry** | Generative AI Video Editing & Social Media Creator Tooling |
| **Target Audience** | Short-form content creators, marketing agencies, video editors, podcasters |
| **Aesthetic Personality** | Dark studio canvas, precision audio-video editing controls, high-contrast typography, zero generic purple AI gradient tropes |
| **Design References** | Descript, Premiere Pro Timeline, Runway ML, Linear, Raycast |

---

## 2. Color Tokens & Semantic Architecture

```css
:root {
  /* Canvas & Studio Surfaces */
  --color-ground: #0D0F12;             /* Deep studio charcoal canvas */
  --color-surface: #14171C;            /* Video editor panels, sidebar */
  --color-surface-hover: #1A1F26;      /* Hover state for panels & buttons */
  --color-elevated: #202630;           /* Modal dialogs, floating dropdowns */
  --color-overlay: rgba(0, 0, 0, 0.7); /* Modal scrim */

  /* Borders & Separation (Razor 1px Lines) */
  --color-border-subtle: #242B35;      /* Timeline tracks, panel dividers */
  --color-border-strong: #364150;      /* Selected track boundaries, focused inputs */

  /* Inks (Typography & Icons) */
  --color-ink-primary: #F8FAFC;        /* Primary labels, active values */
  --color-ink-secondary: #94A3B8;      /* Track timestamps, parameter labels */
  --color-ink-muted: #64748B;          /* Inactive tools, keyboard hints */
  --color-ink-inverse: #0F172A;        /* Text on white or bright accent buttons */

  /* Studio Brand & Action Accent */
  --color-brand-primary: #38BDF8;      /* Sky cyan - precision playhead & render highlight */
  --color-brand-accent: #818CF8;       /* Audio waveform secondary highlight */

  /* Status Colors */
  --color-status-success: #10B981;     /* Render complete */
  --color-status-warning: #F59E0B;     /* Approaching audio clipping */
  --color-status-error: #EF4444;       /* Generation failure */
}
```

---

## 3. Typography Scale & Font Roles

- **Primary Interface Font:** Inter or Geist Sans (crisp, modern geometric grotesque).
- **Data & Timers Font:** JetBrains Mono or Geist Mono with `font-variant-numeric: tabular-nums` (essential for video timestamps `00:01:24:12` and render progress percentages).
- **Display / Marketing Font:** Plus Jakarta Sans (bold, modern).

### Modular Scale (Minor Third - 1.200):
| Token | Size | Line Height | Tracking | Purpose |
|---|---|---|---|---|
| `text-2xs` | 11px (0.6875rem) | 14px | `+0.04em` | Timeline tick markers, audio dB units |
| `text-xs` | 12px (0.75rem) | 16px | `+0.02em` | Track labels, parameter titles |
| `text-sm` | 14px (0.875rem) | 20px | `0em` | Button text, standard controls |
| `text-base` | 16px (1.0rem) | 24px | `0em` | Panel titles, modal body |
| `text-lg` | 18px (1.125rem) | 26px | `-0.015em` | View titles, major dialog headings |
| `text-xl` | 20px (1.25rem) | 28px | `-0.02em` | Workspace header |
| `text-2xl` | 24px (1.5rem) | 32px | `-0.025em` | Project title |

---

## 4. Spacing, Borders & Radius Rules

### The 4px / 8px Grid:
- `space-1` (4px), `space-2` (8px), `space-3` (12px), `space-4` (16px), `space-6` (24px), `space-8` (32px).

### Border Radius Hierarchy:
- Timeline buttons & tool icons: `rounded-md` (6px).
- Inner clips & waveforms: `rounded-md` (6px).
- Floating toolbars: `rounded-lg` (8px).
- Studio panels & modals: `rounded-xl` (12px).
- Nested radius rule enforced: $\text{Radius}_{\text{inner}} = \text{Radius}_{\text{outer}} - \text{Padding}$.

### Elevation & Shadow:
- Studio surfaces: Flat, zero box-shadow; separation via `1px solid var(--color-border-subtle)`.
- Floating canvas tools: `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4)`.

---

## 5. Component Variants & Button Hierarchy

### 1. Primary Action (Generate / Export Reel)
- Background: `bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold shadow-sm`
- Active: `active:scale-[0.98]`
- Accessible focus: `focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2`

### 2. Secondary Action (Split Clip, Add Subtitle)
- Background: `bg-surface border border-border-subtle hover:bg-surface-hover text-ink-primary`

### 3. Ghost / Tool Action (Play, Pause, Trim)
- Background: `hover:bg-surface-hover text-ink-secondary hover:text-ink-primary`
- Hit target: Minimum 36x36px on desktop; 44x44px on touch.

---

## 6. Interaction & Motion Guidelines

1. **Playback Scrubber:** 0ms animation delay, updates directly via requestAnimationFrame / DOM transform.
2. **Track Drag & Drop:** Gentle spring physics (`stiffness: 400, damping: 30`).
3. **Modal Dialogs:** 180ms ease-out entrance scaling from `0.96` to `1.0`. 120ms ease-in exit.
4. **Tooltips:** 300ms hover delay; instant hide on pointer leave.
