create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;

select extensions.plan(26);

insert into auth.users (id, email)
values
  ('10000000-0000-4000-8000-000000000001', 'relation-a@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'relation-b@example.test');

insert into public.repos (id, github_id, full_name, name, owner)
values
  ('20000000-0000-4000-8000-000000000001', 300000001, 'test/relation', 'relation', 'test'),
  ('20000000-0000-4000-8000-000000000002', 300000002, 'test/relation-two', 'relation-two', 'test');

insert into public.user_stars (user_id, repo_id)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002');

insert into public.collections (id, user_id, name)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Concurrent'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Baseline'),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'Other user');

insert into public.collection_repos (user_id, collection_id, repo_id)
values (
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001'
);

select extensions.is(
  (public.apply_collection_relation_mutation(
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'add'
  )->>'effectiveChanged')::boolean,
  false,
  'a legacy membership is a no-op'
);
select extensions.is(
  (select version from public.collection_relation_heads
   where collection_id = '30000000-0000-4000-8000-000000000002'),
  1::bigint,
  'a legacy membership receives a version-one baseline head'
);
select extensions.ok(
  (select present and last_operation_item_id is null
   from public.collection_relation_heads
   where collection_id = '30000000-0000-4000-8000-000000000002'),
  'the baseline is present and has no fabricated operation identity'
);

do $concurrent_setup$
declare
  local_connection_string text := format(
    'hostaddr=%s port=%s dbname=%s user=postgres password=postgres require_auth=scram-sha-256',
    inet_server_addr(),
    current_setting('port'),
    current_database()
  );
begin
  perform extensions.dblink_connect('relation_add_a', local_connection_string);
  perform extensions.dblink_connect('relation_add_b', local_connection_string);
  perform extensions.dblink_send_query(
    'relation_add_a',
    $$select public.apply_collection_relation_mutation(
      '10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'add'
    )$$
  );
  perform extensions.dblink_send_query(
    'relation_add_b',
    $$select public.apply_collection_relation_mutation(
      '10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      'add'
    )$$
  );
end
$concurrent_setup$;

create temporary table concurrent_results (receipt jsonb);
insert into concurrent_results
select receipt from extensions.dblink_get_result('relation_add_a') as response(receipt jsonb);
insert into concurrent_results
select receipt from extensions.dblink_get_result('relation_add_b') as response(receipt jsonb);
do $concurrent_cleanup$
begin
  perform extensions.dblink_disconnect('relation_add_a');
  perform extensions.dblink_disconnect('relation_add_b');
end
$concurrent_cleanup$;

select extensions.is(
  (select count(*) from concurrent_results where (receipt->>'effectiveChanged')::boolean),
  1::bigint,
  'only one concurrent add is effective'
);
select extensions.is(
  (select count(*) from public.collection_repos
   where collection_id = '30000000-0000-4000-8000-000000000001'),
  1::bigint,
  'concurrent adds create one canonical membership'
);
select extensions.is(
  (select version from public.collection_relation_heads
   where collection_id = '30000000-0000-4000-8000-000000000001'),
  1::bigint,
  'concurrent adds advance the head once'
);

set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set role authenticated;

create temporary table first_receipt as
select public.mutate_collection_relation(
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'remove',
  '40000000-0000-4000-8000-000000000001'
) as receipt;

select extensions.is(
  public.mutate_collection_relation(
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'remove',
    '40000000-0000-4000-8000-000000000001'
  ),
  (select receipt from first_receipt),
  'response-loss replay returns the exact original receipt'
);
select extensions.is(
  (select count(*) from public.bulk_operations
   where client_request_id = '40000000-0000-4000-8000-000000000001'),
  1::bigint,
  'response-loss replay restores the same operation'
);
select extensions.is(
  (select count(*) from public.bulk_operation_items
   where operation_id = ((select receipt from first_receipt)->>'operationId')::uuid),
  1::bigint,
  'response-loss replay restores the same item'
);

select extensions.throws_ok(
  $$select public.mutate_collection_relation(
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'add',
    '40000000-0000-4000-8000-000000000002'
  )$$,
  'P0001',
  'target_not_owned',
  'a user cannot mutate another user collection'
);
select extensions.throws_ok(
  $$select public.mutate_collection_relation(
    '30000000-0000-4000-8000-000000000099',
    '20000000-0000-4000-8000-000000000001',
    'add',
    '40000000-0000-4000-8000-000000000003'
  )$$,
  'P0001',
  'target_not_owned',
  'a deleted or unknown target is rejected'
);
select extensions.throws_ok(
  $$insert into public.collection_repos (user_id, collection_id, repo_id) values (
    '10000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001'
  )$$,
  '42501',
  null,
  'authenticated direct collection writes are denied'
);

reset role;
reset request.jwt.claim.sub;

select extensions.ok(
  (select effective_relation_version is not null
   from public.bulk_operation_items
   where operation_id = ((select receipt from first_receipt)->>'operationId')::uuid),
  'the item durably stores its original relation version'
);
select extensions.is(
  (select (receipt->>'relationVersion')::bigint from first_receipt),
  (select effective_relation_version
   from public.bulk_operation_items
   where operation_id = ((select receipt from first_receipt)->>'operationId')::uuid),
  'the response and persisted receipt versions agree'
);
select extensions.is(
  (select count(*) from public.collection_relation_heads
   where user_id = '10000000-0000-4000-8000-000000000002'),
  0::bigint,
  'rejected cross-user commands create no relation head'
);
select extensions.is(
  (select count(*) from public.collection_relation_heads
   where collection_id = '30000000-0000-4000-8000-000000000099'),
  0::bigint,
  'invalid targets create no relation head'
);
select extensions.is(
  (select count(*) from public.collection_repos
   where collection_id = '30000000-0000-4000-8000-000000000002'),
  1::bigint,
  'baseline bootstrapping preserves the canonical membership'
);

create temporary table dial_scope_operation as
select public.create_bulk_operation(
  '10000000-0000-4000-8000-000000000001',
  'manual',
  'collection_dial',
  '40000000-0000-4000-8000-000000000010',
  array[
    '20000000-0000-4000-8000-000000000001'::uuid,
    '20000000-0000-4000-8000-000000000002'::uuid
  ],
  array['20000000-0000-4000-8000-000000000002'::uuid],
  '[{"relationType":"collection","targetId":"30000000-0000-4000-8000-000000000001","action":"add"}]'::jsonb
) as id;

select extensions.is(
  (select source_repo_ids from public.bulk_operations
   where id = (select id from dial_scope_operation)),
  array[
    '20000000-0000-4000-8000-000000000001'::uuid,
    '20000000-0000-4000-8000-000000000002'::uuid
  ],
  'Collection Dial persists the complete frozen source scope'
);
select extensions.is(
  (select array_agg(repo_id order by repo_id) from public.bulk_operation_items
   where operation_id = (select id from dial_scope_operation)),
  array['20000000-0000-4000-8000-000000000002'::uuid],
  'Collection Dial creates items only for the frozen missing subset'
);

set request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
set role authenticated;
select extensions.ok(
  public.has_unfinished_multi_collection_dial_operation(
    '10000000-0000-4000-8000-000000000001'
  ),
  'the owner can detect an unfinished multi Collection Dial without a history window'
);
reset role;
reset request.jwt.claim.sub;

create temporary table dial_item as
select * from public.claim_bulk_operation_items(
  '10000000-0000-4000-8000-000000000001',
  (select id from dial_scope_operation),
  array['pending']
);

create temporary table dial_mutation as
select public.apply_collection_relation_mutation(
  '10000000-0000-4000-8000-000000000001',
  target_id,
  repo_id,
  action,
  id
) as receipt
from dial_item;

select extensions.ok(
  (select undo_expires_at > statement_timestamp()
   from public.bulk_operations where id = (select id from dial_scope_operation)),
  'the effective mutation receipt starts Undo before result recording'
);

select public.record_bulk_operation_item_result(
  '10000000-0000-4000-8000-000000000001',
  (select id from dial_item),
  'succeeded',
  null,
  null,
  (select (receipt->>'effectiveChanged')::boolean from dial_mutation),
  (select (receipt->>'effectiveMutationId')::uuid from dial_mutation),
  (select (receipt->>'relationVersion')::bigint from dial_mutation)
);

create temporary table first_undo as
select public.create_collection_dial_undo(
  '10000000-0000-4000-8000-000000000001',
  (select id from dial_scope_operation),
  '40000000-0000-4000-8000-000000000011'
) as outcome;

select extensions.is(
  (select (outcome->>'eligibleCount')::integer from first_undo),
  1,
  'Undo includes only the effective relation whose head still matches'
);
select extensions.is(
  (select (outcome->>'skippedCount')::integer from first_undo),
  1,
  'Undo reports the already-present repository from the frozen scope as skipped'
);
select extensions.is(
  public.create_collection_dial_undo(
    '10000000-0000-4000-8000-000000000001',
    (select id from dial_scope_operation),
    '40000000-0000-4000-8000-000000000011'
  ),
  (select outcome from first_undo),
  'response-loss replay restores the same Undo outcome'
);
select extensions.is(
  (select count(*) from public.bulk_operations
   where undo_of_operation_id = (select id from dial_scope_operation)),
  1::bigint,
  'each original Collection Dial operation has at most one Undo operation'
);

create temporary table historical_dial_operation as
select public.create_bulk_operation(
  '10000000-0000-4000-8000-000000000001',
  'manual',
  'collection_dial',
  '40000000-0000-4000-8000-000000000012',
  array['20000000-0000-4000-8000-000000000001'::uuid],
  array['20000000-0000-4000-8000-000000000001'::uuid],
  '[{"relationType":"collection","targetId":"30000000-0000-4000-8000-000000000001","action":"add"}]'::jsonb
) as id;

create temporary table historical_dial_item as
select * from public.claim_bulk_operation_items(
  '10000000-0000-4000-8000-000000000001',
  (select id from historical_dial_operation),
  array['pending']
);

create temporary table historical_dial_mutation as
select public.apply_collection_relation_mutation(
  '10000000-0000-4000-8000-000000000001',
  target_id,
  repo_id,
  action,
  id
) as receipt
from historical_dial_item;

select public.record_bulk_operation_item_result(
  '10000000-0000-4000-8000-000000000001',
  (select id from historical_dial_item),
  'succeeded',
  null,
  null,
  (select (receipt->>'effectiveChanged')::boolean from historical_dial_mutation),
  (select (receipt->>'effectiveMutationId')::uuid from historical_dial_mutation),
  (select (receipt->>'relationVersion')::bigint from historical_dial_mutation)
);

update public.bulk_operations
set undo_expires_at = null
where id = (select id from historical_dial_operation);

select extensions.ok(
  (public.create_collection_dial_undo(
    '10000000-0000-4000-8000-000000000001',
    (select id from historical_dial_operation),
    '40000000-0000-4000-8000-000000000013'
  )->>'expired')::boolean,
  'a historical operation without a server expiry is fail-closed'
);

select * from extensions.finish();

delete from auth.users
where id in (
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002'
);
