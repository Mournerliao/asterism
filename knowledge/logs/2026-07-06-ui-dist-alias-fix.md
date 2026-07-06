# 2026-07-06 · UI dist alias fix

## Context

Running the Web app failed during Vite import analysis:

```text
[plugin:vite:import-analysis] Failed to resolve import "@/lib/utils" from "../../packages/ui/dist/components/ui/tooltip.js"
```

`packages/ui` used `@/*` path aliases in source files. The normal `build` script runs `tsc-alias`, but the package `dev` script only runs `tsc --watch`, so regenerated `dist` files could retain unresolved `@/` imports.

## Changes

- Replaced `packages/ui/src` internal `@/lib/utils` and `@/components/*` imports with relative imports.
- Rebuilt `@asterism/ui` so `packages/ui/dist` no longer contains `@/` imports.
- Removed one Biome-blocking non-null assertion in `apps/web/src/pages/import-export.tsx` by introducing an explicit default format option.

## Verification

- `corepack pnpm lint`
- `corepack pnpm --filter @asterism/ui build`
- `corepack pnpm --filter @asterism/web build`
- `rg` confirmed no `@/` imports remain in `packages/ui/src` or `packages/ui/dist`.
