# Design guidelines — HealthBook

Visual discipline adapted from [Munchkin](../../startups/munchkin) (`app/theme/tokens.ts` + UI primitives), extended for phone / tablet / desktop shells.

## Philosophy

- **90% neutral surface.** Exactly **one accent** (`#0052FF`).
- Semantic colors (`success` / `warning` / `danger`) for state only.
- Quiet atmosphere wash — never loud gradient heroes.
- Surfaces over card theater: separation via background shift and rare hairlines.
- Accent CTAs sparingly (~10% of chrome). Primary conversion actions: Book / Confirm.

## Tokens (source of truth)

| Concern | Module |
|---------|--------|
| Colors, space, type, radius, motion | `app/theme/tokens.ts` |
| Fonts | `app/theme/fonts.ts` — Fraunces (display) + Plus Jakarta Sans (UI) + IBM Plex Mono (times) |
| Theme runtime | `app/theme/ThemeProvider.tsx` (light / dark / system) |
| Selection chips | `app/theme/selectionChip.ts` — selected = accent + white |

### Spacing

8pt grid via `space[1..12]`. Screen edge pad = `screenPad` (20).

### Typography

| Variant | Use |
|---------|-----|
| `hero` / `h1` | Fraunces |
| `h2` / `body` / `caption` / `label` | Plus Jakarta Sans |

Rules: max **4 sizes per view**; weights **400 / 500 / 600 / 700** only. Times use `DateTimeBlock` (calendar + clock icons, Today/Tomorrow labels, `10:00 – 10:30 AM` ranges) with IBM Plex Mono for the clock line.

### Motion

- Press = spring scale `0.97` via `PressableScale`
- Springs: `spring.press` / `spring.settle` — never linear easings for chrome
- Haptics via `lib/haptics.ts` (web audio fallback)

## Primitives

Always prefer:

- `Screen` — canvas + `Atmosphere` + safe padding
- `Surface` — raised plane (`borderCurve: "continuous"`)
- `AppText` — typed text
- `Button` — `primary` (ink) / `accent` (brand) / `secondary` / `ghost`
- `AppShell` — responsive navigation chrome
- `DateTimeBlock` — calendar/clock date-time (Google Calendar–style)

## Responsive shells (desktop-primary)

| Breakpoint | Width | Layout |
|------------|-------|--------|
| `phone` | < 768 | Bottom tabs, single column |
| `tablet` | 768–1199 | Persistent sidebar + main workspace |
| `desktop` | ≥ 1200 | Sidebar + wide main + detail/booking rails |

**Desktop is the primary target for web.** On wide viewports:

- Bottom tabs are hidden; navigation is the left sidebar (`AppShell`)
- Pages use multi-column workspaces (list + detail, chat + composer, slots + booking rail)
- Department cards and slots use wrapping grids
- Auth centers a max-width card (`Screen variant="auth"`)

Hooks: `hooks/useBreakpoint.ts`, `hooks/useAppNav.ts`.

## Checklist

- [ ] Token-only colors (`useTheme().colors`) — no ad-hoc hex in screens
- [ ] One accent; neutrals dominate
- [ ] ≤4 type sizes per view
- [ ] Spacing from `space` / `screenPad`
- [ ] Cards only for tappable groups / listings
- [ ] Accent CTA reserved for conversion
- [ ] Skeletons match final layout when loading lists
- [ ] Friendly error copy (no raw stack traces in UI)
