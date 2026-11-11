create table public.nexora_demo_seed_records (
  seed_key text not null,
  record_type text not null check (record_type in ('task', 'note')),
  record_id uuid not null,
  user_id uuid not null references auth.users (id) on delete restrict,
  expected_data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (seed_key, record_type, record_id),
  unique (record_type, record_id)
);

alter table public.nexora_demo_seed_records enable row level security;
revoke all on public.nexora_demo_seed_records from anon, authenticated;
grant select, insert, update, delete on public.nexora_demo_seed_records to service_role;
grant select, insert on public.profiles to service_role;
grant select, insert, delete on public.tasks, public.notes to service_role;

create or replace function public.seed_demo_record(
  p_seed_key text,
  p_record_type text,
  p_record_id uuid,
  p_user_id uuid,
  p_record jsonb
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_expected jsonb;
  v_actual jsonb;
  v_owned public.nexora_demo_seed_records%rowtype;
  v_has_ownership boolean;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Demo record operations require the service role.';
  end if;
  if p_seed_key is distinct from 'nexora-five-student-v1'
    or p_record_type is null
    or p_record_type not in ('task', 'note')
    or (p_record ->> 'id')::uuid is distinct from p_record_id
    or (p_record ->> 'user_id')::uuid is distinct from p_user_id then
    raise exception 'Invalid demo record scope or identity.';
  end if;

  if p_record_type = 'task' then
    v_expected := jsonb_build_object(
      'id', p_record_id,
      'user_id', p_user_id,
      'title', p_record ->> 'title',
      'description', p_record ->> 'description',
      'priority', p_record ->> 'priority',
      'category', p_record ->> 'category',
      'due_date', case when p_record ->> 'due_date' is null then null else to_jsonb((p_record ->> 'due_date')::date) end,
      'status', p_record ->> 'status',
      'completed_at', case when p_record ->> 'completed_at' is null then null else to_jsonb((p_record ->> 'completed_at')::timestamptz) end
    );
    select to_jsonb(t) - 'created_at' - 'updated_at' into v_actual
    from public.tasks as t where t.id = p_record_id;
  else
    v_expected := jsonb_build_object(
      'id', p_record_id,
      'user_id', p_user_id,
      'title', p_record ->> 'title',
      'content', p_record ->> 'content',
      'category', p_record ->> 'category',
      'is_pinned', (p_record ->> 'is_pinned')::boolean
    );
    select to_jsonb(n) - 'created_at' - 'updated_at' into v_actual
    from public.notes as n where n.id = p_record_id;
  end if;

  select * into v_owned
  from public.nexora_demo_seed_records
  where seed_key = p_seed_key and record_type = p_record_type and record_id = p_record_id
  for update;
  v_has_ownership := found;

  if v_has_ownership then
    if v_owned.user_id is distinct from p_user_id or v_owned.expected_data is distinct from v_expected then
      raise exception 'The existing demo ownership record does not match the requested record.';
    end if;
    if v_actual is not null then
      if v_actual is distinct from v_expected then
        raise exception 'The tracked demo record was changed; refusing to overwrite it.';
      end if;
      return 'already_seeded';
    end if;
  elsif v_actual is not null then
    raise exception 'A record with the generated ID exists without seed ownership; refusing to overwrite it.';
  end if;

  if p_record_type = 'task' then
    insert into public.tasks (id, user_id, title, description, priority, category, due_date, status, completed_at)
    values (
      p_record_id, p_user_id, p_record ->> 'title', p_record ->> 'description',
      p_record ->> 'priority', p_record ->> 'category',
      nullif(p_record ->> 'due_date', '')::date, p_record ->> 'status',
      nullif(p_record ->> 'completed_at', '')::timestamptz
    );
  else
    insert into public.notes (id, user_id, title, content, category, is_pinned)
    values (
      p_record_id, p_user_id, p_record ->> 'title', p_record ->> 'content',
      p_record ->> 'category', (p_record ->> 'is_pinned')::boolean
    );
  end if;

  if not v_has_ownership then
    insert into public.nexora_demo_seed_records (seed_key, record_type, record_id, user_id, expected_data)
    values (p_seed_key, p_record_type, p_record_id, p_user_id, v_expected);
  else
    update public.nexora_demo_seed_records
    set expected_data = v_expected
    where seed_key = p_seed_key and record_type = p_record_type and record_id = p_record_id;
  end if;

  return 'seeded';
end;
$$;

create or replace function public.cleanup_demo_record(
  p_seed_key text,
  p_record_type text,
  p_record_id uuid,
  p_user_id uuid,
  p_expected_data jsonb
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_owned public.nexora_demo_seed_records%rowtype;
  v_deleted integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Demo record operations require the service role.';
  end if;
  if p_seed_key is distinct from 'nexora-five-student-v1'
    or p_record_type is null
    or p_record_type not in ('task', 'note') then
    raise exception 'Invalid demo cleanup scope.';
  end if;

  select * into v_owned
  from public.nexora_demo_seed_records
  where seed_key = p_seed_key and record_type = p_record_type and record_id = p_record_id
  for update;
  if not found then
    return false;
  end if;
  if v_owned.user_id is distinct from p_user_id or v_owned.expected_data is distinct from p_expected_data then
    raise exception 'Demo cleanup ownership does not match; refusing to delete the record.';
  end if;

  if p_record_type = 'task' then
    delete from public.tasks as t
    where t.id = p_record_id
      and t.user_id = p_user_id
      and to_jsonb(t) - 'created_at' - 'updated_at' = v_owned.expected_data;
    get diagnostics v_deleted = row_count;
    if v_deleted = 0 and exists (select 1 from public.tasks as t where t.id = p_record_id) then
      raise exception 'The tracked task changed; refusing to delete it.';
    end if;
  else
    delete from public.notes as n
    where n.id = p_record_id
      and n.user_id = p_user_id
      and to_jsonb(n) - 'created_at' - 'updated_at' = v_owned.expected_data;
    get diagnostics v_deleted = row_count;
    if v_deleted = 0 and exists (select 1 from public.notes as n where n.id = p_record_id) then
      raise exception 'The tracked note changed; refusing to delete it.';
    end if;
  end if;

  delete from public.nexora_demo_seed_records
  where seed_key = p_seed_key and record_type = p_record_type and record_id = p_record_id;
  return true;
end;
$$;

revoke all on function public.seed_demo_record(text, text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.cleanup_demo_record(text, text, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.seed_demo_record(text, text, uuid, uuid, jsonb) to service_role;
grant execute on function public.cleanup_demo_record(text, text, uuid, uuid, jsonb) to service_role;
