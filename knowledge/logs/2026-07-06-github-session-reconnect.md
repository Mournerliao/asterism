# 2026-07-06 · GitHub session reconnect UX

## Context

Supabase keeps the app session across refreshes, but GitHub `provider_token` is only available on the OAuth session that includes the provider token. When that token is missing, `sync-stars` cannot call GitHub, so the Sync action showed "session expired" while the app still appeared signed in.

This created an inconsistent recovery path: the user was authenticated in Asterism, but there was no clear way to refresh GitHub authorization.

## Changes

- Added a pure `getGitHubSessionStatus` helper to distinguish:
  - no app session,
  - app session with GitHub provider token,
  - app session requiring GitHub reconnect.
- Added `useGitHubReconnect` to restart GitHub OAuth from inside the authenticated app.
- Updated Sync entry points to call a shared `sync()` action while keeping the reconnect-required state visually owned by the session banner.
- Added a top app banner for the reconnect-required state, with the only default-visible Reconnect GitHub CTA.
- Added immediate pending feedback for reconnect: the CTA disables, shows a spinner, and switches to a connecting label before the OAuth redirect starts.
- Kept a Reconnect GitHub item in the account menu as a secondary, hidden-until-opened recovery path.
- Hid the topbar Sync button and page empty-state Sync actions while reconnect is required to avoid duplicate CTAs.
- Added English and Simplified Chinese i18n strings.
- Added web package Vitest coverage for the reconnect-required session state and included `@asterism/web` in `turbo run test`.

## Verification

- `pnpm --filter @asterism/web test`
- `pnpm --filter @asterism/web typecheck`
- `pnpm lint`
- `pnpm --filter @asterism/web build`
- `pnpm test`
- `pnpm typecheck`
