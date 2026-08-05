# NobodysWatching.live — Design System

A quick reference for anyone designing brand assets (logo, banners, merch, etc). Everything here is pulled directly from the live site, so it's accurate as of today, not a guess.

---

## Brand voice, in one line

*"Where small streamers get seen."* Dry, self-deprecating humour. Built by one person for a real problem. Never corporate, never salesy.

---

## Colour Palette

### Core brand colours

| Name | Hex | Usage |
|---|---|---|
| **Teal (Accent)** | `#0ea5a5` | Primary brand colour — borders, glows, links |
| **Teal Bright** | `#2dd4bf` | Secondary accent — the "WATCHING" in the logo, hover states, highlights |
| **Gold** | `#fbbf24` | Reserved accent — Founder badge, spotlight callouts, "special" moments |

### Backgrounds (darkest to lightest)

| Name | Hex | Usage |
|---|---|---|
| Primary background | `#0a0a0f` | Page background, near-black |
| Secondary background | `#12121a` | Section backgrounds |
| Card background | `#16161f` | Cards, panels |
| Card hover | `#1c1c28` | Interactive hover state |

### Text

| Name | Hex | Usage |
|---|---|---|
| Primary text | `#e8e6f0` | Headlines, body copy — soft white, not pure white |
| Secondary text | `#8a879a` | Supporting copy |
| Muted text | `#5a576a` | Captions, disclaimers, fine print |

### Borders & glow

| Name | Hex | Usage |
|---|---|---|
| Border | `#2a2a3a` | Card borders, dividers |
| Border glow / Accent glow | `rgba(14, 165, 165, 0.15)` | Soft teal glow behind hero sections |

### Functional colours

| Name | Hex | Usage |
|---|---|---|
| Live red | `#ef4444` | "LIVE" badges only — never used decoratively |
| Success | `#22c55e` | Confirmation states |

### Platform brand colours (used for integrations, not the core NW brand)

| Platform | Hex |
|---|---|
| Twitch | `#9146ff` |
| YouTube | `#ff0000` |
| Kick | `#53fc18` |
| Rumble | `#85c742` |
| TikTok | `#ff0050` |
| Velora | `#f0b429` |

*(These are only used when displaying a streamer's linked platforms — they are not part of the core brand identity and shouldn't appear in the logo or primary branding.)*

---

## Typography

### Display font — **Outfit**
Used for all headings, buttons, and body copy.
- Google Fonts: `Outfit`
- Weights in use: 300, 400, 500, 600, 700, 800, 900
- Headlines typically sit at 800–900 weight, uppercase, tight letter-spacing
- Character: clean, modern, geometric sans-serif — friendly but not soft

### Monospace font — **JetBrains Mono**
Used for section markers, labels, badges, technical/meta text (timestamps, viewer counts, disclaimers).
- Google Fonts: `JetBrains Mono`
- Weights in use: 300, 400, 500, 700
- Always paired with a `//` prefix for section headers (e.g. `// browse the directory`) — this is a signature stylistic device across the whole site, worth preserving in any branding

**Import (for reference):**
```
https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap
```

---

## Existing Logo / Favicon

The current mark is simple — worth using as a *starting point*, not a constraint:

- A rounded-square dark tile (`#0a0a0f`, 6px corner radius on a 32×32 base)
- An outlined circle (the "lens" or "eye") in Teal Bright (`#2dd4bf`)
- A solid dot at the centre (same teal)
- A short rounded bar underneath at 60% opacity — reads as a "status bar" or "signal" motif

The concept is intentionally simple: a lens/eye watching, plus a subtle nod to a stream/signal indicator. Your friend has full creative licence to elevate this — the only things worth preserving conceptually are:
1. The teal colour identity
2. Some visual link to "watching" / discovery / visibility (the whole site's mission)
3. Simplicity — it needs to work as a tiny favicon as well as a large logo

---

## Shape language

- **Border radius scale in use:** 3px, 4px, 6px, 8px, 10px, 12px, 14px, 16px, and fully rounded (pill/circle) for tags and buttons
- Cards and panels: 12–14px radius
- Buttons and pills: fully rounded or 6–8px
- Nothing sharp-cornered — the whole site favours soft, rounded shapes

---

## Tone in visual terms

- **Dark theme only** — no light mode exists or is planned
- **Glow effects** are used sparingly around hero sections (soft teal radial glows), not neon or garish
- **Grid/scanline textures** occasionally used in the background at very low opacity for a "terminal/technical" feel without being try-hard
- Overall mood: **calm, confident, a bit understated** — the humour lives in the copy, not in loud visual gimmicks

---

## What NOT to do

- Don't make it look like a generic "gaming" brand (no aggressive angular shapes, no red/black esports clichés)
- Don't use pure black or pure white — everything sits in soft near-black/off-white for a more premium feel
- Don't overcomplicate the logo — it needs to work small (favicon, Discord icon, Twitch panel)
- Avoid corporate polish — a little imperfection/personality fits the brand better than something too slick
