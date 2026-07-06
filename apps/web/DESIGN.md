# Design

> **Source of truth**: `knowledge/contracts/ui-ux.md` (repo root). This file is an **alignment layer** for impeccable — it mirrors the tokens/rules impeccable needs at a glance, but never edit values here directly. When the visual system changes, update `knowledge/contracts/ui-ux.md` first (plus its ADRs: [0005](../../knowledge/decisions/0005-design-tokens-github-primer.md) color/radius, [0007](../../knowledge/decisions/0007-typography-spacing-tokens.md) type/spacing), then re-sync this file. Tokens live as CSS variables in `packages/ui/src/styles/globals.css`.

## Design Language

- **Visual system**: GitHub Primer-derived. 克制、专业、面向开发者的产品语气；秩序感与信息密度优先于装饰。
- **Base**: shadcn/ui + Tailwind CSS. Reuse `packages/ui` components before building new ones; new components must land in `packages/ui` and follow these tokens.
- **Theming**: light + dark are both first-class; default follows OS preference, explicit toggle available, persisted per user.

## Color

Authoritative values + full CSS block in `ui-ux.md` § Design Tokens. Core roles (hex, light → dark):

| Role | Light | Dark |
|---|---|---|
| `--background` | `#FFFFFF` | `#0D1117` |
| `--foreground` | `#1F2328` | `#E6EDF3` |
| `--primary` (main actions — Create/New/Sync/Import) | `#1F883D` | `#238636` |
| `--secondary` / `--muted` | `#F6F8FA` | `#21262D` / `#161B22` |
| `--destructive` | `#CF222E` | `#DA3633` |
| `--border` / `--input` | `#D0D7DE` | `#30363D` |
| `--ring` / `--link` (brand blue) | `#0969DA` | `#58A6FF` |
| Brand gradient (logo only) | `#0969DA → #8250DF` | `#58A6FF → #8C5CFF` |

Color strategy: **Restrained** — tinted neutrals + Primer green as the one committed accent for primary actions; brand blue reserved for links/focus/logo, not competing with the primary action color. Tag/category palette (8 hues: blue/green/purple/orange/sky/amber/pink/lime) is the only place multi-color coding is allowed (tag dots, chart series).

## Typography

- **Fonts**: `"Geist Variable"` (sans, body/UI), `"Geist Mono Variable"` (numbers/dates).
- **Scale** (desktop): display 28px/Bold → page-title 24px/Bold → section-title 20px/SemiBold → drawer-title 16px/SemiBold → repo-name 22px/Bold → body 13px/1.25 line-height → caption 12px → micro 11px/Medium (table headers).
- **Weights**: Regular 400 · Medium 500 · SemiBold 600 · Bold 700.
- Full scale + usage mapping in `ui-ux.md`.

## Spacing & Layout

- **4px grid**: xs 4 · sm 8 · md 12 · lg 16 · xl 20 · 2xl 24 · 3xl 32.
- `AppLayout` main content region is `flex flex-col overflow-hidden`; individual pages own their own scroll region (`flex-1 min-h-0 overflow-y-auto`), Browse page uses a fixed header + scrolling list split. Never add `position: sticky` or extra `main` padding to work around this — follow the pattern already in `ui-ux.md` § Scrollbar.
- Custom thin-pill scrollbar (`--scrollbar-size: 8px`, always visible, theme-aware via `color-mix`) — reuse, don't reinvent per-component scrollbars.

## Radius

Base `--radius: 0.5rem` (8px), shadcn standard derivation: `sm` 4px (badges/tags) · `md` 6px (buttons/inputs/nav items) · `lg` 8px (cards/drawers) · `xl` 12px (large containers).

## Motion

- Currently minimal/restrained by brand tone; no committed motion system yet beyond standard shadcn transitions.
- When adding motion: ease-out exponential curves, no bounce/elastic, respect `prefers-reduced-motion`, and keep it purposeful (state feedback — sync progress, drawer open/close — not decoration).

## Components

- **Base**: shadcn/ui primitives + Tailwind, from `packages/ui`.
- **Richer libraries, scoped use only**: shadcn Charts/Recharts for the insights dashboard; Magic UI / Aceternity permitted **only** in marketing surfaces (none currently in `apps/web`, which is entirely product register) — never in core app UI.
- **Anti-patterns to avoid** (see `PRODUCT.md` Anti-references): gradient text, side-stripe borders, glassmorphism-as-default, identical card grids, hero-metric template, uppercase eyebrows / 01-02-03 numbered section markers as default scaffolding.
- Cards are not the default affordance — Browse's card view is a deliberate mode (toggle vs. list/table), not a reflexive "wrap everything in a card" pattern.

## Dark Mode

Both themes are equal citizens; dark values are measured from the Ardot design source (not derived by formula), light values are official GitHub Primer pairs. See `ui-ux.md` § Design Source for the Ardot file reference (`fileId 698428420561751`) if pixel-level re-verification against the design file is ever needed.

## Accessibility

Target **WCAG 2.1 AA**: ≥4.5:1 body text contrast, ≥3:1 large text, visible focus ring (`--ring`), keyboard operability, semantic markup/ARIA, accessible virtualized lists (TanStack Virtual).

## Brand Assets

- Wordmark: "Asterism". Theme: stars / constellation — scattered GitHub stars organized into a meaningful constellation. Keep the metaphor as flavor (naming, logo gradient, subtle iconography), not as a literal visual motif imposed on every screen.
