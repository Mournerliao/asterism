-- Extend bulk_operations.source CHECK to include 'promotion' (ADR 0026 §8).
-- Promotion is the dual-plane's only write bridge: a user promotes a derived
-- cluster into a canonical collection via the existing bulk operations ledger.

alter table public.bulk_operations
  drop constraint if exists bulk_operations_source_check;

alter table public.bulk_operations
  add constraint bulk_operations_source_check
    check (source in ('manual', 'ai_draft', 'promotion'));
