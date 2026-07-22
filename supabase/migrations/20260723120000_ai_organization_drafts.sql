-- Review-only AI organization drafts. Provider calls complete and validate
-- before this table is touched; one atomic upsert replaces a user's old draft.

create table public.ai_organization_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  source_repo_ids uuid[] not null
    check (cardinality(source_repo_ids) between 1 and 50),
  suggestion_version integer not null default 1
    check (suggestion_version >= 1),
  suggestions jsonb not null
    check (jsonb_typeof(suggestions) = 'object'),
  generation_connection_id uuid not null,
  generation_adapter text not null
    check (generation_adapter in ('openai', 'google', 'anthropic', 'openrouter', 'openai-compatible')),
  generation_model text not null check (char_length(generation_model) between 1 and 200),
  review_state text not null default 'review'
    check (review_state = 'review'),
  revision integer not null default 1 check (revision >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_organization_drafts_connection_fkey
    foreign key (generation_connection_id, user_id)
    references public.ai_provider_connections (id, user_id)
    on delete cascade
);

create index ai_organization_drafts_user_updated_idx
  on public.ai_organization_drafts (user_id, updated_at desc);

create trigger ai_organization_drafts_set_updated_at
  before update on public.ai_organization_drafts
  for each row execute function public.set_updated_at();

alter table public.ai_organization_drafts enable row level security;

-- The authenticated client has no table privileges. Generation, reading and
-- discard all flow through the JWT-authenticated Edge Function. This owner
-- policy remains defense-in-depth for privileged callers that honor RLS.
revoke all on public.ai_organization_drafts from anon, authenticated;

create policy "ai_organization_drafts_owner_select" on public.ai_organization_drafts
  for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.replace_ai_organization_draft(
  p_user_id uuid,
  p_source_repo_ids uuid[],
  p_suggestion_version integer,
  p_suggestions jsonb,
  p_generation_connection_id uuid,
  p_generation_adapter text,
  p_generation_model text
)
returns public.ai_organization_drafts
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_organization_drafts (
    user_id,
    source_repo_ids,
    suggestion_version,
    suggestions,
    generation_connection_id,
    generation_adapter,
    generation_model
  ) values (
    p_user_id,
    p_source_repo_ids,
    p_suggestion_version,
    p_suggestions,
    p_generation_connection_id,
    p_generation_adapter,
    p_generation_model
  )
  on conflict (user_id) do update set
    id = gen_random_uuid(),
    source_repo_ids = excluded.source_repo_ids,
    suggestion_version = excluded.suggestion_version,
    suggestions = excluded.suggestions,
    generation_connection_id = excluded.generation_connection_id,
    generation_adapter = excluded.generation_adapter,
    generation_model = excluded.generation_model,
    review_state = 'review',
    revision = public.ai_organization_drafts.revision + 1,
    created_at = now(),
    updated_at = now()
  returning *;
$$;

revoke all on function public.replace_ai_organization_draft(
  uuid, uuid[], integer, jsonb, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.replace_ai_organization_draft(
  uuid, uuid[], integer, jsonb, uuid, text, text
) to service_role;
