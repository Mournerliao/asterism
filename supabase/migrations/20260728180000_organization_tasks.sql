create table public.organization_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('initial_order', 'new_stars')),
  suggested_goal text not null check (char_length(suggested_goal) between 1 and 4000),
  repository_count integer not null check (repository_count > 0),
  context_repo_ids uuid[] not null default '{}',
  status text not null default 'available' check (status in ('available', 'accepted', 'ignored')),
  accepted_task_id uuid,
  sync_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sync_fingerprint)
);

create table public.organization_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin text not null check (origin in ('direct_goal', 'opportunity')),
  opportunity_id uuid references public.organization_opportunities(id) on delete set null,
  status text not null default 'clarifying'
    check (status in (
      'clarifying',
      'discovering',
      'awaiting_generation_approval',
      'generation_approved',
      'ended'
    )),
  goal text not null check (char_length(goal) between 1 and 4000),
  suggested_goal text,
  context_repo_ids uuid[] not null default '{}',
  revision integer not null default 1 check (revision > 0),
  current_snapshot_revision integer,
  current_manifest_fingerprint text,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_opportunities
  add constraint organization_opportunities_accepted_task_id_fkey
  foreign key (accepted_task_id) references public.organization_tasks(id) on delete set null;

create table public.organization_task_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'checkpoint')),
  text text not null check (char_length(text) between 1 and 4000),
  checkpoint_type text check (checkpoint_type in ('goal', 'discovery', 'generation_approval', 'ended')),
  checkpoint_revision integer,
  created_at timestamptz not null default now()
);

create table public.organization_task_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  event_type text not null,
  task_revision integer not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.organization_candidate_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  revision integer not null check (revision > 0),
  discovery_version text not null,
  library_count integer not null check (library_count >= 0),
  candidate_count integer not null check (candidate_count >= 0),
  fingerprint text not null,
  created_at timestamptz not null default now(),
  unique (task_id, revision),
  unique (task_id, fingerprint)
);

create table public.organization_candidate_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid not null references public.organization_candidate_snapshots(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  repo_id uuid not null references public.repos(id) on delete restrict,
  content_fingerprint text not null,
  included boolean not null default true,
  reasons jsonb not null,
  created_at timestamptz not null default now(),
  unique (snapshot_id, repo_id)
);

create table public.organization_generation_manifests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  snapshot_revision integer not null,
  fingerprint text not null,
  candidate_count integer not null check (candidate_count > 0),
  page_count integer not null check (page_count > 0),
  max_initial_calls integer not null check (max_initial_calls > 0),
  max_retry_calls integer not null check (max_retry_calls >= 0),
  max_total_calls integer not null check (max_total_calls > 0),
  estimated_token_ceiling integer not null check (estimated_token_ceiling > 0),
  connection_id uuid not null,
  adapter text not null,
  model text not null,
  fields text[] not null,
  description_code_point_limit integer not null check (description_code_point_limit >= 0),
  note_code_point_limit integer not null check (note_code_point_limit >= 0),
  monetary_cost jsonb not null default '{"kind":"unknown"}',
  created_at timestamptz not null default now(),
  unique (task_id, fingerprint)
);

create table public.organization_generation_manifest_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manifest_id uuid not null references public.organization_generation_manifests(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  page_key text not null,
  page_index integer not null check (page_index > 0),
  repo_ids uuid[] not null check (cardinality(repo_ids) between 1 and 50),
  created_at timestamptz not null default now(),
  unique (manifest_id, page_key),
  unique (manifest_id, page_index)
);

create table public.organization_generation_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  task_revision integer not null,
  snapshot_revision integer not null,
  manifest_fingerprint text not null,
  connection_id uuid not null,
  adapter text not null,
  model text not null,
  fields text[] not null,
  description_code_point_limit integer not null,
  note_code_point_limit integer not null,
  max_initial_calls integer not null,
  max_retry_calls integer not null,
  max_total_calls integer not null,
  estimated_token_ceiling integer not null,
  approved_at timestamptz not null default now(),
  unique (task_id, task_revision)
);

create index organization_tasks_user_updated_idx
  on public.organization_tasks(user_id, updated_at desc);
create index organization_task_messages_task_created_idx
  on public.organization_task_messages(task_id, created_at);
create index organization_candidate_items_snapshot_idx
  on public.organization_candidate_items(snapshot_id);
create index organization_opportunities_user_status_idx
  on public.organization_opportunities(user_id, status, created_at desc);

create trigger organization_opportunities_set_updated_at
before update on public.organization_opportunities
for each row execute function public.set_updated_at();

create trigger organization_tasks_set_updated_at
before update on public.organization_tasks
for each row execute function public.set_updated_at();

alter table public.organization_opportunities enable row level security;
alter table public.organization_tasks enable row level security;
alter table public.organization_task_messages enable row level security;
alter table public.organization_task_events enable row level security;
alter table public.organization_candidate_snapshots enable row level security;
alter table public.organization_candidate_items enable row level security;
alter table public.organization_generation_manifests enable row level security;
alter table public.organization_generation_manifest_pages enable row level security;
alter table public.organization_generation_approvals enable row level security;

create policy organization_opportunities_owner_read on public.organization_opportunities
  for select using (auth.uid() = user_id);
create policy organization_tasks_owner_read on public.organization_tasks
  for select using (auth.uid() = user_id);
create policy organization_task_messages_owner_read on public.organization_task_messages
  for select using (auth.uid() = user_id);
create policy organization_task_events_owner_read on public.organization_task_events
  for select using (auth.uid() = user_id);
create policy organization_candidate_snapshots_owner_read on public.organization_candidate_snapshots
  for select using (auth.uid() = user_id);
create policy organization_candidate_items_owner_read on public.organization_candidate_items
  for select using (auth.uid() = user_id);
create policy organization_generation_manifests_owner_read on public.organization_generation_manifests
  for select using (auth.uid() = user_id);
create policy organization_generation_manifest_pages_owner_read
  on public.organization_generation_manifest_pages for select using (auth.uid() = user_id);
create policy organization_generation_approvals_owner_read on public.organization_generation_approvals
  for select using (auth.uid() = user_id);

create or replace function public.create_organization_task(
  p_user_id uuid,
  p_goal text,
  p_context_repo_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task_id uuid;
begin
  insert into public.organization_tasks (
    user_id, origin, goal, context_repo_ids
  ) values (
    p_user_id, 'direct_goal', p_goal, coalesce(p_context_repo_ids, '{}')
  ) returning id into v_task_id;
  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (p_user_id, v_task_id, 'user', p_goal, 'goal', 1);
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision
  ) values (p_user_id, v_task_id, 'task_created', 1);
  return v_task_id;
end;
$$;

create or replace function public.accept_organization_opportunity(
  p_user_id uuid,
  p_opportunity_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opportunity public.organization_opportunities%rowtype;
  v_task_id uuid;
begin
  select * into v_opportunity
  from public.organization_opportunities
  where id = p_opportunity_id and user_id = p_user_id
  for update;
  if v_opportunity.id is null or v_opportunity.status = 'ignored' then return null; end if;
  if v_opportunity.accepted_task_id is not null then
    return v_opportunity.accepted_task_id;
  end if;

  insert into public.organization_tasks (
    user_id, origin, opportunity_id, goal, suggested_goal, context_repo_ids
  ) values (
    p_user_id, 'opportunity', v_opportunity.id, v_opportunity.suggested_goal,
    v_opportunity.suggested_goal, v_opportunity.context_repo_ids
  ) returning id into v_task_id;
  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, v_task_id, 'user', v_opportunity.suggested_goal, 'goal', 1
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision, payload
  ) values (
    p_user_id, v_task_id, 'opportunity_accepted', 1,
    jsonb_build_object('opportunityId', v_opportunity.id)
  );
  update public.organization_opportunities
  set status = 'accepted', accepted_task_id = v_task_id
  where id = v_opportunity.id;
  return v_task_id;
end;
$$;

create or replace function public.save_organization_task_checkpoint(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer,
  p_snapshot jsonb,
  p_manifest jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot_id uuid;
  v_manifest_id uuid;
  v_item jsonb;
  v_page jsonb;
  v_next_revision integer;
begin
  update public.organization_tasks
  set status = 'awaiting_generation_approval',
      revision = revision + 1,
      current_snapshot_revision = (p_snapshot->>'revision')::integer,
      current_manifest_fingerprint = p_manifest->>'fingerprint'
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status <> 'ended'
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  insert into public.organization_candidate_snapshots (
    user_id, task_id, revision, discovery_version, library_count,
    candidate_count, fingerprint
  ) values (
    p_user_id, p_task_id, (p_snapshot->>'revision')::integer,
    p_snapshot->>'discoveryVersion', (p_snapshot->>'libraryCount')::integer,
    (p_snapshot->>'candidateCount')::integer, p_snapshot->>'fingerprint'
  ) returning id into v_snapshot_id;

  for v_item in select * from jsonb_array_elements(p_snapshot->'items')
  loop
    insert into public.organization_candidate_items (
      user_id, snapshot_id, task_id, repo_id, content_fingerprint, included, reasons
    ) values (
      p_user_id, v_snapshot_id, p_task_id, (v_item->>'repositoryId')::uuid,
      v_item->>'contentFingerprint', (v_item->>'included')::boolean, v_item->'reasons'
    );
  end loop;

  if p_manifest is not null then
    insert into public.organization_generation_manifests (
      user_id, task_id, snapshot_revision, fingerprint, candidate_count, page_count,
      max_initial_calls, max_retry_calls, max_total_calls, estimated_token_ceiling,
      connection_id, adapter, model, fields, description_code_point_limit,
      note_code_point_limit, monetary_cost
    ) values (
      p_user_id, p_task_id, (p_manifest->>'snapshotRevision')::integer,
      p_manifest->>'fingerprint', (p_manifest->>'candidateCount')::integer,
      (p_manifest->>'pageCount')::integer, (p_manifest->>'maxInitialCalls')::integer,
      (p_manifest->>'maxRetryCalls')::integer, (p_manifest->>'maxTotalCalls')::integer,
      (p_manifest->>'estimatedTokenCeiling')::integer,
      (p_manifest->'connection'->>'id')::uuid, p_manifest->'connection'->>'adapter',
      p_manifest->'connection'->>'model',
      array(select jsonb_array_elements_text(p_manifest->'fields')),
      (p_manifest->'truncation'->>'descriptionCodePoints')::integer,
      (p_manifest->'truncation'->>'noteCodePoints')::integer,
      p_manifest->'monetaryCost'
    ) returning id into v_manifest_id;

    for v_page in select * from jsonb_array_elements(p_manifest->'pages')
    loop
      insert into public.organization_generation_manifest_pages (
        user_id, manifest_id, task_id, page_key, page_index, repo_ids
      ) values (
        p_user_id, v_manifest_id, p_task_id, v_page->>'key',
        (v_page->>'index')::integer,
        array(select jsonb_array_elements_text(v_page->'repositoryIds'))::uuid[]
      );
    end loop;
  end if;

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'candidate_snapshot_saved',
    'discovery', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision, payload
  ) values (
    p_user_id, p_task_id, 'discovery_checkpoint_saved', v_next_revision,
    jsonb_build_object(
      'snapshotRevision', p_snapshot->>'revision',
      'manifestFingerprint', p_manifest->>'fingerprint'
    )
  );
  return true;
end;
$$;

create or replace function public.update_organization_task_goal(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer,
  p_goal text,
  p_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_revision integer;
begin
  update public.organization_tasks
  set goal = p_goal,
      status = 'clarifying',
      revision = revision + 1,
      current_snapshot_revision = null,
      current_manifest_fingerprint = null
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status <> 'ended'
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'user', coalesce(p_message, p_goal), 'goal', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision
  ) values (p_user_id, p_task_id, 'goal_updated', v_next_revision);
  return true;
end;
$$;

create or replace function public.end_organization_task(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_revision integer;
begin
  update public.organization_tasks
  set status = 'ended', revision = revision + 1, ended_at = now()
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status <> 'ended'
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'task_ended', 'ended', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision
  ) values (p_user_id, p_task_id, 'task_ended', v_next_revision);
  return true;
end;
$$;

create or replace function public.approve_organization_task_generation(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer,
  p_manifest_fingerprint text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manifest public.organization_generation_manifests%rowtype;
  v_next_revision integer;
begin
  select * into v_manifest
  from public.organization_generation_manifests
  where user_id = p_user_id and task_id = p_task_id and fingerprint = p_manifest_fingerprint;
  if v_manifest.id is null then return false; end if;

  update public.organization_tasks
  set status = 'generation_approved', revision = revision + 1
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status = 'awaiting_generation_approval'
    and current_manifest_fingerprint = p_manifest_fingerprint
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  insert into public.organization_generation_approvals (
    user_id, task_id, task_revision, snapshot_revision, manifest_fingerprint,
    connection_id, adapter, model, fields, description_code_point_limit,
    note_code_point_limit, max_initial_calls, max_retry_calls, max_total_calls,
    estimated_token_ceiling
  ) values (
    p_user_id, p_task_id, v_next_revision, v_manifest.snapshot_revision,
    v_manifest.fingerprint, v_manifest.connection_id, v_manifest.adapter,
    v_manifest.model, v_manifest.fields, v_manifest.description_code_point_limit,
    v_manifest.note_code_point_limit, v_manifest.max_initial_calls,
    v_manifest.max_retry_calls, v_manifest.max_total_calls,
    v_manifest.estimated_token_ceiling
  );
  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'generation_approved',
    'generation_approval', v_next_revision
  );
  return true;
end;
$$;

revoke all on function public.save_organization_task_checkpoint(uuid, uuid, integer, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.create_organization_task(uuid, text, uuid[])
  from public, anon, authenticated;
revoke all on function public.accept_organization_opportunity(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.update_organization_task_goal(uuid, uuid, integer, text, text)
  from public, anon, authenticated;
revoke all on function public.end_organization_task(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.approve_organization_task_generation(uuid, uuid, integer, text)
  from public, anon, authenticated;
grant execute on function public.save_organization_task_checkpoint(uuid, uuid, integer, jsonb, jsonb)
  to service_role;
grant execute on function public.create_organization_task(uuid, text, uuid[])
  to service_role;
grant execute on function public.accept_organization_opportunity(uuid, uuid)
  to service_role;
grant execute on function public.update_organization_task_goal(uuid, uuid, integer, text, text)
  to service_role;
grant execute on function public.end_organization_task(uuid, uuid, integer)
  to service_role;
grant execute on function public.approve_organization_task_generation(uuid, uuid, integer, text)
  to service_role;
