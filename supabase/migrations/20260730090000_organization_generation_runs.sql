-- #25: resumable Organization Plan generation. Pages are leased and completed
-- through service-role RPCs with a call ledger that survives lost responses;
-- accepted pages merge into immutable, revisioned organization_plans rows.

alter table public.organization_tasks
  drop constraint organization_tasks_status_check;
alter table public.organization_tasks
  add constraint organization_tasks_status_check
  check (status in (
    'clarifying',
    'discovering',
    'awaiting_generation_approval',
    'generation_approved',
    'generating',
    'generation_paused',
    'needs_attention',
    'plan_ready',
    'ended'
  ));
alter table public.organization_tasks
  add column attention_code text;

alter table public.organization_task_messages
  drop constraint organization_task_messages_checkpoint_type_check;
alter table public.organization_task_messages
  add constraint organization_task_messages_checkpoint_type_check
  check (checkpoint_type in (
    'goal', 'discovery', 'generation_approval', 'generation', 'plan', 'ended'
  ));

create table public.organization_generation_page_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  approval_id uuid not null references public.organization_generation_approvals(id) on delete cascade,
  page_key text not null,
  page_index integer not null check (page_index > 0),
  repo_ids uuid[] not null check (cardinality(repo_ids) between 1 and 50),
  status text not null default 'pending'
    check (status in ('pending', 'leased', 'succeeded', 'failed', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  lease_id uuid,
  lease_expires_at timestamptz,
  result jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (approval_id, page_key)
);

-- Immutable per-call ledger: a row is inserted at claim time so a lost
-- response still counts against the approved ceilings. Never stores
-- credentials, authorization headers, or unsanitized upstream errors.
create table public.organization_generation_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  approval_id uuid not null references public.organization_generation_approvals(id) on delete cascade,
  page_run_id uuid not null references public.organization_generation_page_runs(id) on delete cascade,
  page_key text not null,
  attempt integer not null check (attempt > 0),
  lease_id uuid not null,
  connection_id uuid not null,
  adapter text not null,
  model text not null,
  request_schema text not null default 'organization-generation-v1',
  request_hash text,
  fields text[] not null,
  truncation jsonb,
  status text not null default 'started'
    check (status in ('started', 'succeeded', 'failed', 'lost')),
  error_code text,
  usage jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.organization_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.organization_tasks(id) on delete cascade,
  revision integer not null check (revision > 0),
  plan jsonb not null,
  precondition_fingerprint text not null,
  fingerprint text not null,
  action_count integer not null check (action_count >= 0),
  conflict_count integer not null check (conflict_count >= 0),
  uncertainty_count integer not null check (uncertainty_count >= 0),
  created_at timestamptz not null default now(),
  unique (task_id, revision)
);

create index organization_generation_page_runs_claim_idx
  on public.organization_generation_page_runs(approval_id, status, page_index);
create index organization_generation_calls_approval_idx
  on public.organization_generation_calls(approval_id, started_at);
create index organization_plans_task_idx
  on public.organization_plans(task_id, revision desc);

create trigger organization_generation_page_runs_set_updated_at
before update on public.organization_generation_page_runs
for each row execute function public.set_updated_at();

alter table public.organization_generation_page_runs enable row level security;
alter table public.organization_generation_calls enable row level security;
alter table public.organization_plans enable row level security;

create policy organization_generation_page_runs_owner_read
  on public.organization_generation_page_runs for select using (auth.uid() = user_id);
create policy organization_generation_calls_owner_read
  on public.organization_generation_calls for select using (auth.uid() = user_id);
create policy organization_plans_owner_read
  on public.organization_plans for select using (auth.uid() = user_id);

create or replace function public.start_organization_generation(
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
  v_approval public.organization_generation_approvals%rowtype;
begin
  update public.organization_tasks
  set status = 'generating', revision = revision + 1, attention_code = null
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status = 'generation_approved'
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  select * into v_approval
  from public.organization_generation_approvals
  where task_id = p_task_id and user_id = p_user_id
  order by task_revision desc
  limit 1;
  if v_approval.id is null then
    raise exception 'organization generation approval missing for task %', p_task_id;
  end if;

  insert into public.organization_generation_page_runs (
    user_id, task_id, approval_id, page_key, page_index, repo_ids
  )
  select p_user_id, p_task_id, v_approval.id, mp.page_key, mp.page_index, mp.repo_ids
  from public.organization_generation_manifest_pages mp
  join public.organization_generation_manifests m on m.id = mp.manifest_id
  where m.task_id = p_task_id
    and m.user_id = p_user_id
    and m.fingerprint = v_approval.manifest_fingerprint
    and m.snapshot_revision = v_approval.snapshot_revision
  on conflict (approval_id, page_key) do nothing;

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'generation_started', 'generation', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision
  ) values (p_user_id, p_task_id, 'generation_started', v_next_revision);
  return true;
end;
$$;

create or replace function public.claim_organization_generation_page(
  p_user_id uuid,
  p_task_id uuid,
  p_lease_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.organization_tasks%rowtype;
  v_approval public.organization_generation_approvals%rowtype;
  v_page public.organization_generation_page_runs%rowtype;
  v_calls_started integer;
  v_tokens_used bigint;
  v_per_call_budget integer;
  v_max_attempts integer;
  v_lease_id uuid;
  v_call_id uuid;
begin
  select * into v_task
  from public.organization_tasks
  where id = p_task_id and user_id = p_user_id
  for update;
  if v_task.id is null then return jsonb_build_object('outcome', 'not_found'); end if;
  if v_task.status <> 'generating' then
    return jsonb_build_object('outcome', 'not_generating', 'status', v_task.status);
  end if;

  select * into v_approval
  from public.organization_generation_approvals
  where task_id = p_task_id and user_id = p_user_id
  order by task_revision desc
  limit 1;
  if v_approval.id is null then return jsonb_build_object('outcome', 'not_found'); end if;

  select count(*) into v_calls_started
  from public.organization_generation_calls
  where approval_id = v_approval.id;
  if v_calls_started >= v_approval.max_total_calls then
    return jsonb_build_object('outcome', 'call_ceiling');
  end if;

  select coalesce(sum((usage->>'totalTokens')::bigint), 0) into v_tokens_used
  from public.organization_generation_calls
  where approval_id = v_approval.id;
  v_per_call_budget := ceil(
    v_approval.estimated_token_ceiling::numeric / v_approval.max_total_calls
  );
  if v_tokens_used + v_per_call_budget > v_approval.estimated_token_ceiling then
    return jsonb_build_object('outcome', 'token_ceiling');
  end if;

  v_max_attempts := 1 + floor(
    v_approval.max_retry_calls::numeric / greatest(v_approval.max_initial_calls, 1)
  );

  select * into v_page
  from public.organization_generation_page_runs
  where approval_id = v_approval.id
    and attempt_count < v_max_attempts
    and (
      status = 'pending'
      or (status = 'leased' and lease_expires_at <= now())
    )
  order by page_index
  limit 1
  for update;

  if v_page.id is null then
    if not exists (
      select 1 from public.organization_generation_page_runs
      where approval_id = v_approval.id and status <> 'succeeded'
    ) then
      return jsonb_build_object('outcome', 'complete');
    end if;
    if exists (
      select 1 from public.organization_generation_page_runs
      where approval_id = v_approval.id
        and status = 'leased' and lease_expires_at > now()
    ) then
      return jsonb_build_object('outcome', 'in_flight');
    end if;
    return jsonb_build_object('outcome', 'exhausted');
  end if;

  -- A stale lease with a still-open ledger row means the response was lost:
  -- close it so the attempt stays visible and keeps counting against ceilings.
  update public.organization_generation_calls
  set status = 'lost',
      error_code = 'organization_generation_response_lost',
      finished_at = now()
  where page_run_id = v_page.id and status = 'started';

  v_lease_id := gen_random_uuid();
  update public.organization_generation_page_runs
  set status = 'leased',
      lease_id = v_lease_id,
      lease_expires_at = now() + make_interval(secs => greatest(p_lease_seconds, 30)),
      attempt_count = attempt_count + 1,
      error_code = null
  where id = v_page.id;

  insert into public.organization_generation_calls (
    user_id, task_id, approval_id, page_run_id, page_key, attempt, lease_id,
    connection_id, adapter, model, fields
  ) values (
    p_user_id, p_task_id, v_approval.id, v_page.id, v_page.page_key,
    v_page.attempt_count + 1, v_lease_id, v_approval.connection_id,
    v_approval.adapter, v_approval.model, v_approval.fields
  ) returning id into v_call_id;

  return jsonb_build_object(
    'outcome', 'claimed',
    'callId', v_call_id,
    'pageRunId', v_page.id,
    'pageKey', v_page.page_key,
    'pageIndex', v_page.page_index,
    'repoIds', to_jsonb(v_page.repo_ids),
    'attempt', v_page.attempt_count + 1,
    'leaseId', v_lease_id,
    'connectionId', v_approval.connection_id,
    'adapter', v_approval.adapter,
    'model', v_approval.model,
    'fields', to_jsonb(v_approval.fields),
    'descriptionCodePointLimit', v_approval.description_code_point_limit,
    'noteCodePointLimit', v_approval.note_code_point_limit,
    'snapshotRevision', v_approval.snapshot_revision,
    'manifestFingerprint', v_approval.manifest_fingerprint
  );
end;
$$;

create or replace function public.complete_organization_generation_page(
  p_user_id uuid,
  p_task_id uuid,
  p_call_id uuid,
  p_lease_id uuid,
  p_status text,
  p_request_hash text,
  p_truncation jsonb,
  p_usage jsonb,
  p_error_code text,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_call public.organization_generation_calls%rowtype;
  v_page public.organization_generation_page_runs%rowtype;
begin
  if p_status not in ('succeeded', 'failed') then
    return jsonb_build_object('outcome', 'invalid_status');
  end if;

  select * into v_call
  from public.organization_generation_calls
  where id = p_call_id
    and user_id = p_user_id
    and task_id = p_task_id
    and lease_id = p_lease_id;
  if v_call.id is null then return jsonb_build_object('outcome', 'not_found'); end if;

  -- Lock page before call to keep the same ordering as claim.
  select * into v_page
  from public.organization_generation_page_runs
  where id = v_call.page_run_id
  for update;

  select * into v_call
  from public.organization_generation_calls
  where id = p_call_id
  for update;
  if v_call.status <> 'started' then
    return jsonb_build_object('outcome', 'already_recorded');
  end if;

  -- No task-status guard: an in-flight call finishing after pause/end still
  -- gets recorded exactly once; only page acceptance below is state-dependent.
  update public.organization_generation_calls
  set status = p_status,
      request_hash = coalesce(p_request_hash, request_hash),
      truncation = p_truncation,
      usage = p_usage,
      error_code = p_error_code,
      finished_at = now()
  where id = p_call_id;

  if p_status = 'succeeded' then
    if v_page.status = 'succeeded' then
      return jsonb_build_object('outcome', 'duplicate_success');
    end if;
    if v_page.status = 'cancelled' then
      return jsonb_build_object('outcome', 'cancelled');
    end if;
    update public.organization_generation_page_runs
    set status = 'succeeded',
        result = p_result,
        error_code = null,
        lease_id = null,
        lease_expires_at = null
    where id = v_page.id;
    return jsonb_build_object('outcome', 'accepted');
  end if;

  if v_page.status = 'leased' and v_page.lease_id = p_lease_id then
    update public.organization_generation_page_runs
    set status = 'failed',
        error_code = p_error_code,
        lease_id = null,
        lease_expires_at = null
    where id = v_page.id;
    return jsonb_build_object('outcome', 'failed_recorded');
  end if;
  return jsonb_build_object('outcome', 'stale');
end;
$$;

create or replace function public.pause_organization_generation(
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
  set status = 'generation_paused', revision = revision + 1
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status = 'generating'
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'generation_paused', 'generation', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision
  ) values (p_user_id, p_task_id, 'generation_paused', v_next_revision);
  return true;
end;
$$;

create or replace function public.resume_organization_generation(
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
  set status = 'generating', revision = revision + 1
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status = 'generation_paused'
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'generation_resumed', 'generation', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision
  ) values (p_user_id, p_task_id, 'generation_resumed', v_next_revision);
  return true;
end;
$$;

create or replace function public.retry_organization_generation(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_revision integer;
  v_approval public.organization_generation_approvals%rowtype;
  v_max_attempts integer;
begin
  select * into v_approval
  from public.organization_generation_approvals
  where task_id = p_task_id and user_id = p_user_id
  order by task_revision desc
  limit 1;
  if v_approval.id is null then return jsonb_build_object('outcome', 'not_found'); end if;

  v_max_attempts := 1 + floor(
    v_approval.max_retry_calls::numeric / greatest(v_approval.max_initial_calls, 1)
  );
  if not exists (
    select 1 from public.organization_generation_page_runs
    where approval_id = v_approval.id
      and attempt_count < v_max_attempts
      and status in ('pending', 'leased', 'failed')
  ) then
    return jsonb_build_object('outcome', 'exhausted');
  end if;

  update public.organization_tasks
  set status = 'generating', revision = revision + 1, attention_code = null
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status = 'needs_attention'
  returning revision into v_next_revision;
  if v_next_revision is null then return jsonb_build_object('outcome', 'conflict'); end if;

  update public.organization_generation_page_runs
  set status = 'pending',
      lease_id = null,
      lease_expires_at = null,
      error_code = null
  where approval_id = v_approval.id
    and status = 'failed'
    and attempt_count < v_max_attempts;

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'generation_retried', 'generation', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision
  ) values (p_user_id, p_task_id, 'generation_retried', v_next_revision);
  return jsonb_build_object('outcome', 'retrying');
end;
$$;

create or replace function public.flag_organization_generation_attention(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer,
  p_code text
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
  set status = 'needs_attention', attention_code = p_code, revision = revision + 1
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status = 'generating'
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'generation_needs_attention', 'generation', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision, payload
  ) values (
    p_user_id, p_task_id, 'generation_attention_flagged', v_next_revision,
    jsonb_build_object('code', p_code)
  );
  return true;
end;
$$;

create or replace function public.save_organization_plan(
  p_user_id uuid,
  p_task_id uuid,
  p_expected_revision integer,
  p_plan jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_revision integer;
  v_approval public.organization_generation_approvals%rowtype;
  v_plan_revision integer;
begin
  select * into v_approval
  from public.organization_generation_approvals
  where task_id = p_task_id and user_id = p_user_id
  order by task_revision desc
  limit 1;
  if v_approval.id is null then return jsonb_build_object('outcome', 'not_found'); end if;

  if exists (
    select 1 from public.organization_generation_page_runs
    where approval_id = v_approval.id and status <> 'succeeded'
  ) then
    return jsonb_build_object('outcome', 'pages_incomplete');
  end if;

  update public.organization_tasks
  set status = 'plan_ready', revision = revision + 1
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status = 'generating'
  returning revision into v_next_revision;
  if v_next_revision is null then return jsonb_build_object('outcome', 'conflict'); end if;

  v_plan_revision := (p_plan->>'revision')::integer;
  insert into public.organization_plans (
    user_id, task_id, revision, plan, precondition_fingerprint, fingerprint,
    action_count, conflict_count, uncertainty_count
  ) values (
    p_user_id, p_task_id, v_plan_revision, p_plan,
    p_plan->>'preconditionFingerprint', p_plan->>'fingerprint',
    (p_plan->'counts'->>'actions')::integer,
    (p_plan->'counts'->>'conflicts')::integer,
    (p_plan->'counts'->>'uncertainties')::integer
  );

  insert into public.organization_task_messages (
    user_id, task_id, role, text, checkpoint_type, checkpoint_revision
  ) values (
    p_user_id, p_task_id, 'checkpoint', 'organization_plan_saved', 'plan', v_next_revision
  );
  insert into public.organization_task_events (
    user_id, task_id, event_type, task_revision, payload
  ) values (
    p_user_id, p_task_id, 'plan_saved', v_next_revision,
    jsonb_build_object('planRevision', v_plan_revision, 'fingerprint', p_plan->>'fingerprint')
  );
  return jsonb_build_object('outcome', 'saved', 'planRevision', v_plan_revision);
end;
$$;

-- Ending a task or revising its goal explicitly cancels unclaimed work.
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

  update public.organization_generation_page_runs
  set status = 'cancelled', lease_id = null, lease_expires_at = null
  where task_id = p_task_id
    and user_id = p_user_id
    and status in ('pending', 'leased');

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
      current_manifest_fingerprint = null,
      attention_code = null
  where id = p_task_id
    and user_id = p_user_id
    and revision = p_expected_revision
    and status <> 'ended'
  returning revision into v_next_revision;
  if v_next_revision is null then return false; end if;

  update public.organization_generation_page_runs
  set status = 'cancelled', lease_id = null, lease_expires_at = null
  where task_id = p_task_id
    and user_id = p_user_id
    and status in ('pending', 'leased');

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

revoke all on function public.start_organization_generation(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.claim_organization_generation_page(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.complete_organization_generation_page(uuid, uuid, uuid, uuid, text, text, jsonb, jsonb, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.pause_organization_generation(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.resume_organization_generation(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.retry_organization_generation(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.flag_organization_generation_attention(uuid, uuid, integer, text)
  from public, anon, authenticated;
revoke all on function public.save_organization_plan(uuid, uuid, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.start_organization_generation(uuid, uuid, integer)
  to service_role;
grant execute on function public.claim_organization_generation_page(uuid, uuid, integer)
  to service_role;
grant execute on function public.complete_organization_generation_page(uuid, uuid, uuid, uuid, text, text, jsonb, jsonb, text, jsonb)
  to service_role;
grant execute on function public.pause_organization_generation(uuid, uuid, integer)
  to service_role;
grant execute on function public.resume_organization_generation(uuid, uuid, integer)
  to service_role;
grant execute on function public.retry_organization_generation(uuid, uuid, integer)
  to service_role;
grant execute on function public.flag_organization_generation_attention(uuid, uuid, integer, text)
  to service_role;
grant execute on function public.save_organization_plan(uuid, uuid, integer, jsonb)
  to service_role;
