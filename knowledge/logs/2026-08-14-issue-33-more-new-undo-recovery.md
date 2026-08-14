# Issue #33 · Collection Dial More / New / Undo / durable recovery

- Date: 2026-08-14
- Ticket: GitHub #33
- Scope: More / New frozen-scope handoff, operation-scoped Undo, durable Browse recovery

## Implemented

- `CollectionDialPickup` retains a copied full eligible catalog in addition to its seven quick targets. Search normalizes name / description without querying, inserting or reordering live collections. A More selection is promoted into the seven-target quick window while the frozen catalog and repository IDs remain unchanged.
- More uses the existing Graphite Glass Dialog on desktop and bottom Sheet below 640px. Search receives initial focus; closing restores the More trigger. New reuses `CollectionFormDialog`, which now follows the same responsive Dialog / Sheet boundary and can restore its invoking trigger.
- An empty eligible catalog no longer blocks pickup: the Dial presents New as the primary path. Creating a collection preserves input on validation / transport failure; after success it closes the form, promotes the real collection ID and starts a Collection Dial add for the original scope. Add failure keeps the created entity and retries only the durable relation operation.
- Migration `20260814170000_collection_dial_undo.sql` starts a non-extending 30-second expiry atomically with the first effective Collection Dial add receipt, fails closed when expiry is absent, creates at most one Undo per original operation, and persists eligible / skipped / conflict / expired counts. Only succeeded effective add items with an exact current head receipt become remove items.
- Undo execution rechecks the original receipt and relation head in the same transaction. A reclaimed item that already persisted its own mutation receipt replays that receipt, covering the remove-write / response-loss gap without misclassifying it as drift. Initial or execution-time target/repository loss and head drift fail closed.
- The trusted HTTP and `packages/db` boundaries accept an explicit `undo` action with a distinct client request UUID and reject unknown projections. Browse lists recent Collection Dial ledgers, resumes pending adds, retries only retryable add/Undo items, exposes Undo for partial effective success, and distinguishes ledger read failure from server write failure.

## Verification

- TDD seams: core frozen catalog / promotion, trusted HTTP Undo routing, typed DB parsing, More focus/search/Escape, durable status actions and zero-change Undo suppression.
- Browser: authenticated local Browse at default desktop and 390×844; light and dark; empty-catalog New; desktop Dialog and mobile Sheet; first Escape closes the overlay and restores New, second Escape cancels Dial and restores the source Grip. No form was submitted and no remote data changed. Console errors: 0.
- Impeccable detector: 0 findings on changed UI surfaces.
- Full repository gates: `pnpm lint`, `pnpm typecheck`, 343 Vitest tests, and `pnpm build` passed.
- Two-axis review found and fixed receipt-time expiry, NULL-expiry fail-closed behavior, pending Undo resume recovery, and terminal-conflict result/retry handling.
- pgTAP expanded from 20 to 26 assertions for receipt-time server expiry, NULL-expiry fail-closed behavior, eligible/skipped counts, response-loss replay and unique Undo identity. `pnpm test:db` could not connect because the local Supabase/Postgres database was not running.
- Remote migration and `bulk-organize` deployment were intentionally not performed.

## Recovery point

Complete two-axis review and commit #33, then proceed to #34 only in a new task/context. Before real #33 smoke, apply migration `20260814170000` and deploy the matching `bulk-organize` function together to avoid client/server projection skew.
