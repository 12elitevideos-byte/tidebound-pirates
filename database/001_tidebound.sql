-- Run once in the Supabase SQL editor before starting the game server.
begin;
create table if not exists public.tb_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 0,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(data)='object'),
  check ((data->>'gold')::bigint >= 0),
  check ((data->>'xp')::bigint >= 0)
);
create table if not exists public.tb_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pirate_name text not null check (char_length(pirate_name) between 2 and 24),
  title text not null,
  xp bigint not null default 0
);
create table if not exists public.tb_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  details jsonb not null,
  gold_delta bigint not null,
  revision bigint not null,
  created_at timestamptz not null default now(),
  unique(user_id,operation)
);
create table if not exists public.tb_consumed_loot (
  item_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_operation text not null,
  consumed_at timestamptz not null default now()
);
create table if not exists public.tb_pvp_claims (
  winner uuid references auth.users(id) on delete cascade,
  target uuid references auth.users(id) on delete cascade,
  reward_day date not null,
  primary key(winner,target,reward_day),
  check(winner<>target)
);
create table if not exists public.tb_active_voyages (
  user_id uuid primary key references auth.users(id) on delete cascade,
  voyage_id uuid not null unique,
  room_id text not null,
  mode text not null check(mode in ('solo','online')),
  server_boot uuid not null,
  started_at timestamptz not null default now()
);
alter table public.tb_accounts enable row level security;
alter table public.tb_public_profiles enable row level security;
alter table public.tb_ledger enable row level security;
alter table public.tb_consumed_loot enable row level security;
alter table public.tb_active_voyages enable row level security;
alter table public.tb_pvp_claims enable row level security;
revoke all on public.tb_accounts,public.tb_public_profiles,public.tb_ledger,public.tb_consumed_loot,public.tb_active_voyages,public.tb_pvp_claims from anon,authenticated;
grant select on public.tb_accounts,public.tb_ledger to authenticated;
grant select on public.tb_public_profiles to authenticated;
grant all on public.tb_accounts,public.tb_public_profiles,public.tb_ledger,public.tb_consumed_loot,public.tb_active_voyages,public.tb_pvp_claims to service_role;
grant usage,select on sequence public.tb_ledger_id_seq to service_role;
create policy "Read own account" on public.tb_accounts for select to authenticated using((select auth.uid())=user_id);
create policy "Read own transactions" on public.tb_ledger for select to authenticated using((select auth.uid())=user_id);
create policy "Read public captain names" on public.tb_public_profiles for select to authenticated using(true);

create or replace function public.tb_ensure_account(p_user uuid,p_default jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.tb_accounts;
begin
  insert into public.tb_accounts(user_id,data) values(p_user,p_default) on conflict do nothing;
  update public.tb_accounts set last_seen=now() where user_id=p_user returning * into a;
  insert into public.tb_public_profiles(user_id,pirate_name,title,xp) values(p_user,a.data->>'pirateName',a.data->>'title',(a.data->>'xp')::bigint) on conflict(user_id) do nothing;
  return a.data||jsonb_build_object('revision',a.revision,'createdAt',a.created_at,'lastSeen',a.last_seen,'savedAt',a.updated_at);
end $$;
create or replace function public.tb_commit_account(p_user uuid,p_revision bigint,p_data jsonb,p_operation text,p_meta jsonb,p_items uuid[] default '{}',p_pvp_target uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.tb_accounts; old_meta jsonb; old_gold bigint; i uuid; n bigint;
begin
  select * into a from public.tb_accounts where user_id=p_user for update;
  if not found then raise exception 'ACCOUNT_MISSING'; end if;
  select details into old_meta from public.tb_ledger where user_id=p_user and operation=p_operation;
  if found then
    if old_meta<>p_meta then raise exception 'Operation ID already used.'; end if;
    return a.data||jsonb_build_object('revision',a.revision,'savedAt',a.updated_at);
  end if;
  if a.revision<>p_revision then raise exception 'REVISION_CONFLICT'; end if;
  old_gold=(a.data->>'gold')::bigint;
  if jsonb_typeof(p_data)<>'object' or (p_data->>'version')::int<>1 or (p_data->>'gold')::numeric<>trunc((p_data->>'gold')::numeric) then raise exception 'INVALID_SAVE'; end if;
  if p_pvp_target is not null then
    if p_meta->>'mode'<>'online' then raise exception 'ONLINE_ONLY'; end if;
    insert into public.tb_pvp_claims values(p_user,p_pvp_target,(now() at time zone 'UTC')::date) on conflict do nothing;
    get diagnostics n=row_count;
    if n=0 then raise exception 'Bounty already rewarded for this captain today.'; end if;
  end if;
  foreach i in array p_items loop
    insert into public.tb_consumed_loot(item_id,user_id,bank_operation) values(i,p_user,p_operation);
  end loop;
  update public.tb_accounts set data=p_data-'revision'-'savedAt'-'createdAt'-'lastSeen',revision=revision+1,updated_at=now(),last_seen=now() where user_id=p_user returning * into a;
  insert into public.tb_ledger(user_id,operation,details,gold_delta,revision) values(p_user,p_operation,p_meta,(p_data->>'gold')::bigint-old_gold,a.revision);
  insert into public.tb_public_profiles values(p_user,a.data->>'pirateName',a.data->>'title',(a.data->>'xp')::bigint) on conflict(user_id) do update set pirate_name=excluded.pirate_name,title=excluded.title,xp=excluded.xp;
  return a.data||jsonb_build_object('revision',a.revision,'savedAt',a.updated_at);
end $$;
create or replace function public.tb_start_voyage(p_user uuid,p_voyage uuid,p_room text,p_mode text,p_boot uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.tb_active_voyages(user_id,voyage_id,room_id,mode,server_boot) values(p_user,p_voyage,p_room,p_mode,p_boot);
exception when unique_violation then raise exception 'This account already has a voyage. Reconnect or wait 30 seconds.';
end $$;
create or replace function public.tb_reset_boot(p_boot uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  update public.tb_accounts set data=jsonb_set(data,'{contract}','null'),revision=revision+1,updated_at=now()
    where user_id in(select user_id from public.tb_active_voyages where server_boot<>p_boot);
  delete from public.tb_active_voyages where server_boot<>p_boot;
end $$;
create or replace function public.tb_end_voyage(p_user uuid,p_voyage uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.tb_accounts; n bigint;
begin
  select * into a from public.tb_accounts where user_id=p_user for update;
  delete from public.tb_active_voyages where user_id=p_user and voyage_id=p_voyage;
  get diagnostics n=row_count;
  if n>0 then
    update public.tb_accounts set data=jsonb_set(data,'{contract}','null'),revision=revision+1,updated_at=now() where user_id=p_user returning * into a;
    insert into public.tb_ledger(user_id,operation,details,gold_delta,revision) values(p_user,'end:'||p_voyage,jsonb_build_object('type','endVoyage'),0,a.revision) on conflict do nothing;
  end if;
  return a.data||jsonb_build_object('revision',a.revision,'savedAt',a.updated_at);
end $$;
revoke all on function public.tb_ensure_account(uuid,jsonb),public.tb_commit_account(uuid,bigint,jsonb,text,jsonb,uuid[],uuid),public.tb_start_voyage(uuid,uuid,text,text,uuid),public.tb_reset_boot(uuid),public.tb_end_voyage(uuid,uuid) from public,anon,authenticated;
grant execute on function public.tb_ensure_account(uuid,jsonb),public.tb_commit_account(uuid,bigint,jsonb,text,jsonb,uuid[],uuid),public.tb_start_voyage(uuid,uuid,text,text,uuid),public.tb_reset_boot(uuid),public.tb_end_voyage(uuid,uuid) to service_role;
commit;
