# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

Per `AGENTS.md`, `knowledge/` is the single source of truth for this repo:

- **`knowledge/contracts/`** — the project's domain language and product / architecture / data-model / conventions / ui-ux contracts. This is the `CONTEXT.md` equivalent for the engineering skills.
- **`knowledge/decisions/`** — ADRs (one decision per file: context, trade-offs, conclusion). This is the `docs/adr/` equivalent.

If any of these directories don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo. Domain context and ADRs live under `knowledge/` (not the conventional root `CONTEXT.md` + `docs/adr/`, to stay consistent with this repo's `knowledge/` single-source-of-truth convention):

```
/
├── knowledge/
│   ├── contracts/        ← domain language & product/architecture contracts (CONTEXT.md equivalent)
│   └── decisions/        ← ADRs (docs/adr/ equivalent)
└── ...
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `knowledge/contracts/`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR in `knowledge/decisions/`, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
