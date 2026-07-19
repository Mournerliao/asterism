-- Durable, ownership-scoped bulk relationship writes (ADR 0023).

create table public.bulk_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('manual', 'ai_draft')),
  source_repo_ids uuid[] not null check (cardinality(source_repo_ids) > 0),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'needs_attention', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bulk_operations_user_created_idx
  on public.bulk_operations (user_id, created_at desc);

create trigger bulk_operations_set_updated_at
  before update on public.bulk_operations
  for each row execute function public.set_updated_at();

create table public.bulk_operation_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  operation_id uuid not null references public.bulk_operations (id) on delete cascade,
  repo_id uuid not null references public.repos (id) on delete cascade,
  relation_type text not null check (relation_type in ('tag', 'collection')),
  target_id uuid not null,
  action text not null check (action in ('add', 'remove')),
  status text not null default 'pending'
    check (status in (
      'pending', 'running', 'succeeded', 'retryable_failed', 'terminal_failed', 'dismissed'
    )),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (operation_id, repo_id, relation_type, target_id, action)
);

create index bulk_operation_items_operation_status_idx
  on public.bulk_operation_items (operation_id, status);

create trigger bulk_operation_items_set_updated_at
  before update on public.bulk_operation_items
  for each row execute function public.set_updated_at();

alter table public.bulk_operations enable row level security;
alter table public.bulk_operation_items enable row level security;

create policy "bulk_operations_owner_select" on public.bulk_operations
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "bulk_operation_items_owner_select" on public.bulk_operation_items
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.bulk_operations from anon, authenticated;
revoke all on public.bulk_operation_items from anon, authenticated;
grant select on public.bulk_operations to authenticated;
grant select on public.bulk_operation_items to authenticated;

create or replace function public.create_bulk_operation(
  p_user_id uuid,
  p_source text,
  p_repo_ids uuid[],
  p_changes jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_id uuid;
  normalized_repo_ids uuid[];
  change_count integer;
begin
  if p_source not in ('manual', 'ai_draft') or jsonb_typeof(p_changes) <> 'array' then
    raise exception 'invalid_bulk_request';
  end if;

  select array_agg(repo_id order by ordinal)
    into normalized_repo_ids
  from (
    select repo_id, min(ordinal) as ordinal
    from unnest(p_repo_ids) with ordinality as selected(repo_id, ordinal)
    group by repo_id
  ) stable_scope;

  select count(*) into change_count from jsonb_array_elements(p_changes);
  if coalesce(cardinality(normalized_repo_ids), 0) = 0
    or change_count = 0
    or cardinality(normalized_repo_ids) * change_count > 10000 then
    raise exception 'invalid_bulk_request';
  end if;

  if (
    select count(*) from public.user_stars
    where user_id = p_user_id and repo_id = any(normalized_repo_ids)
  ) <> cardinality(normalized_repo_ids) then
    raise exception 'repository_not_owned';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_changes) change
    where change->>'relationType' not in ('tag', 'collection')
      or change->>'action' not in ('add', 'remove')
      or not (
        case change->>'relationType'
          when 'tag' then exists (
            select 1 from public.tags
            where id = (change->>'targetId')::uuid and user_id = p_user_id
          )
          when 'collection' then exists (
            select 1 from public.collections
            where id = (change->>'targetId')::uuid and user_id = p_user_id
          )
          else false
        end
      )
  ) then
    raise exception 'target_not_owned';
  end if;

  insert into public.bulk_operations (user_id, source, source_repo_ids)
  values (p_user_id, p_source, normalized_repo_ids)
  returning id into operation_id;

  insert into public.bulk_operation_items (
    user_id, operation_id, repo_id, relation_type, target_id, action
  )
  select distinct
    p_user_id,
    operation_id,
    repo_id,
    change->>'relationType',
    (change->>'targetId')::uuid,
    change->>'action'
  from unnest(normalized_repo_ids) repo_id
  cross join jsonb_array_elements(p_changes) change;

  return operation_id;
end;
$$;

create or replace function public.claim_bulk_operation_items(
  p_user_id uuid,
  p_operation_id uuid,
  p_statuses text[]
) returns setof public.bulk_operation_items
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.bulk_operations where id = p_operation_id and user_id = p_user_id
  ) then
    return;
  end if;

  -- A worker lost before recording an outcome can be safely reclaimed because writes are idempotent.
  update public.bulk_operation_items
  set status = 'pending'
  where operation_id = p_operation_id
    and user_id = p_user_id
    and status = 'running'
    and updated_at < now() - interval '1 minute';

  update public.bulk_operations
  set status = 'running', completed_at = null
  where id = p_operation_id and user_id = p_user_id;

  return query
  with claimable as (
    select id
    from public.bulk_operation_items
    where operation_id = p_operation_id
      and user_id = p_user_id
      and status = any(p_statuses)
    order by created_at, id
    limit 50
    for update skip locked
  )
  update public.bulk_operation_items item
  set status = 'running'
  from claimable
  where item.id = claimable.id
  returning item.*;
end;
$$;

create or replace function public.record_bulk_operation_item_result(
  p_user_id uuid,
  p_item_id uuid,
  p_status text,
  p_error_code text default null,
  p_error_message text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_id uuid;
begin
  if p_status not in ('succeeded', 'retryable_failed', 'terminal_failed') then
    raise exception 'invalid_item_status';
  end if;

  update public.bulk_operation_items
  set
    status = p_status,
    attempt_count = attempt_count + 1,
    last_error_code = p_error_code,
    last_error_message = p_error_message
  where id = p_item_id and user_id = p_user_id
  returning bulk_operation_items.operation_id into operation_id;

  if operation_id is null then
    raise exception 'operation_not_owned';
  end if;

  update public.bulk_operations operation
  set
    status = case
      when exists (
        select 1 from public.bulk_operation_items
        where bulk_operation_items.operation_id = operation.id
          and status in ('retryable_failed', 'terminal_failed')
      ) then 'needs_attention'
      when exists (
        select 1 from public.bulk_operation_items
        where bulk_operation_items.operation_id = operation.id
          and status in ('pending', 'running')
      ) then 'running'
      else 'completed'
    end,
    completed_at = case
      when not exists (
        select 1 from public.bulk_operation_items
        where bulk_operation_items.operation_id = operation.id
          and status <> 'succeeded'
      ) then now()
      else null
    end
  where id = operation_id and user_id = p_user_id;
end;
$$;

create or replace function public.complete_bulk_operation(
  p_user_id uuid,
  p_operation_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.bulk_operation_items
    where operation_id = p_operation_id
      and user_id = p_user_id
      and status in ('pending', 'running', 'retryable_failed')
  ) then
    return false;
  end if;

  update public.bulk_operation_items
  set status = 'dismissed'
  where operation_id = p_operation_id
    and user_id = p_user_id
    and status = 'terminal_failed';

  update public.bulk_operations
  set status = 'completed', completed_at = now()
  where id = p_operation_id and user_id = p_user_id;

  return found;
end;
$$;

revoke all on function public.create_bulk_operation(uuid, text, uuid[], jsonb) from public;
revoke all on function public.claim_bulk_operation_items(uuid, uuid, text[]) from public;
revoke all on function public.record_bulk_operation_item_result(uuid, uuid, text, text, text) from public;
revoke all on function public.complete_bulk_operation(uuid, uuid) from public;
grant execute on function public.create_bulk_operation(uuid, text, uuid[], jsonb) to service_role;
grant execute on function public.claim_bulk_operation_items(uuid, uuid, text[]) to service_role;
grant execute on function public.record_bulk_operation_item_result(uuid, uuid, text, text, text) to service_role;
grant execute on function public.complete_bulk_operation(uuid, uuid) to service_role;
