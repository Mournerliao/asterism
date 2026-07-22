-- BYOK generation connections and per-user settings (ADR 0017, 0018, 0024).
-- Client roles get no direct access to ai_provider_connections; the whole
-- credential lifecycle flows through the trusted manage-ai-connections Edge
-- Function running as the service role. The safe projection (no ciphertext /
-- nonce) is returned by that function, never by a direct client select.

create table public.ai_provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  adapter text not null
    check (adapter in ('openai', 'google', 'anthropic', 'openrouter', 'openai-compatible')),
  name text not null check (char_length(name) between 1 and 120),
  base_url text check (base_url is null or char_length(base_url) <= 2048),
  credential_ciphertext text not null,
  credential_nonce text not null,
  credential_version integer not null default 1 check (credential_version >= 1),
  credential_hint text check (credential_hint is null or char_length(credential_hint) <= 120),
  status text not null default 'untested'
    check (status in ('untested', 'valid', 'invalid', 'disabled')),
  generation_capability jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite target so user_settings can reference (id, user_id) and never
  -- point at another user's connection.
  unique (id, user_id),
  -- Built-in adapters use the project's fixed endpoint (no base_url); a custom
  -- openai-compatible connection must carry its own base_url.
  constraint ai_provider_connections_base_url_by_adapter check (
    (adapter = 'openai-compatible' and base_url is not null)
    or (adapter <> 'openai-compatible' and base_url is null)
  )
);

-- At most one built-in connection per user per adapter; custom
-- openai-compatible connections may repeat under distinct names.
create unique index ai_provider_connections_builtin_unique
  on public.ai_provider_connections (user_id, adapter)
  where adapter <> 'openai-compatible';

create index ai_provider_connections_user_created_idx
  on public.ai_provider_connections (user_id, created_at desc);

create trigger ai_provider_connections_set_updated_at
  before update on public.ai_provider_connections
  for each row execute function public.set_updated_at();

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  generation_connection_id uuid,
  generation_model text,
  include_notes_in_ai boolean not null default false,
  locale text check (locale is null or locale in ('en', 'zh-CN')),
  theme text check (theme is null or theme in ('system', 'light', 'dark')),
  preferences jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deferred so an auth.users cascade can drop both rows in one transaction;
  -- the Edge Function clears this reference before deleting a live connection.
  constraint user_settings_generation_connection_fkey
    foreign key (generation_connection_id, user_id)
    references public.ai_provider_connections (id, user_id)
    deferrable initially deferred
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Keep the active pair valid even if a future trusted caller forgets the application-level check.
create function public.validate_generation_selection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_status text;
  selected_capability jsonb;
begin
  if new.generation_connection_id is null and new.generation_model is null then
    return new;
  end if;

  if new.generation_connection_id is null or new.generation_model is null then
    raise exception using errcode = '23514', message = 'generation_selection_incomplete';
  end if;

  select status, generation_capability
  into selected_status, selected_capability
  from public.ai_provider_connections
  where id = new.generation_connection_id and user_id = new.user_id;

  if selected_status is distinct from 'valid'
    or selected_capability ->> 'ok' is distinct from 'true'
    or selected_capability ->> 'model' is distinct from new.generation_model then
    raise exception using errcode = '23514', message = 'generation_selection_not_verified';
  end if;

  return new;
end;
$$;
revoke all on function public.validate_generation_selection() from public;

create trigger user_settings_validate_generation_selection
  before insert or update of generation_connection_id, generation_model on public.user_settings
  for each row execute function public.validate_generation_selection();

-- Replacing a credential/base URL, disabling, or re-testing with another model invalidates
-- an existing active selection immediately at the database boundary.
create function public.clear_invalid_generation_selection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_settings
  set generation_connection_id = null, generation_model = null
  where generation_connection_id = new.id
    and (
      new.status <> 'valid'
      or new.generation_capability ->> 'ok' is distinct from 'true'
      or generation_model is distinct from new.generation_capability ->> 'model'
    );
  return new;
end;
$$;
revoke all on function public.clear_invalid_generation_selection() from public;

create trigger ai_provider_connections_clear_invalid_selection
  after update of status, generation_capability on public.ai_provider_connections
  for each row execute function public.clear_invalid_generation_selection();

-- ai_provider_connections: no client role touches this table. RLS stays enabled
-- as defense-in-depth; the service role bypasses RLS for the Edge Function.
alter table public.ai_provider_connections enable row level security;
revoke all on public.ai_provider_connections from anon, authenticated;

-- user_settings: the owner may read the safe settings row directly. Writes must
-- pass through manage-ai-connections so active Connection/model validation cannot
-- be bypassed by a modified client.
alter table public.user_settings enable row level security;
revoke all on public.user_settings from anon, authenticated;
grant select on public.user_settings to authenticated;

create policy "user_settings_owner_select" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);
