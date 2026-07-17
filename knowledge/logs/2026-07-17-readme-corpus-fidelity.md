# README corpus fidelity gate (Issue #10)

## Summary

Landed a repeatable README content-area fidelity acceptance gate: fixed HTML corpus fixtures, Vitest sanitizer/outline gate, DEV-only corpus lab, one general sanitizer fix for relative image paths, and Cursor built-in browser visual/a11y review across light/dark and 390/900/1200 viewports.

## Changes

- `apps/web/src/fixtures/readme-corpus/` — maintained corpus + `manifest.ts`
- `apps/web/src/lib/readme-corpus.test.ts` — automated acceptance gate
- `apps/web/src/pages/readme-corpus-lab.tsx` + DEV route `/dev/readme-corpus`
- `apps/web/src/lib/readme-content.ts` — normalize relative image URLs; drop paths that escape repo root
- Diff log: `knowledge/logs/2026-07-17-readme-corpus-fidelity-diff.md`

## Verification

- Vitest: `readme-corpus.test.ts` + `readme-content.test.ts`
- Browser: all fixtures, light/dark, skeleton, no page overflow, 44px lab controls
- Full suite / typecheck / lint run at close of loop
