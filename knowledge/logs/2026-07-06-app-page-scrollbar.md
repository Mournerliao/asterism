# 2026-07-06 · App page scrollbar alignment

## Context

Browse and collection detail repository lists created their own vertical scroll containers. This placed the scrollbar at the right edge of the centered content column instead of the app page edge, making it look like a scrollbar embedded inside the repository cards.

The desired app-level rule is: page content scrolls through the `AppLayout` main content area; local scrollbars are reserved for panels, menus, previews, and horizontal table overflow.

## Changes

- Added a main scroll element context from `AppLayout` so virtualized page content can bind to the app page scroll container.
- Updated `RepoCollection` to remove its internal vertical scroll container and use the app main scroll element for virtualization.
- Kept virtual row transforms in the collection's local coordinate system while binding measurement to the app page scroll offset.
- Removed page-level vertical inner scrolling from Browse loading state and collection detail list layout.
- Kept local scroll behavior for drawer content, menus, select popovers, code previews, and horizontal table overflow.
- Tuned global scrollbar tokens to make the thumb lighter and visually thinner while preserving an 8px hit area.
- Updated the UI/UX contract with the app-level page scrolling rule.

## Verification

- `pnpm lint`
- `pnpm --filter @asterism/web typecheck`
- `pnpm --filter @asterism/web build`
- Browser verification for Browse, collection detail, and other authenticated app pages.
