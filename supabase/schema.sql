-- Applied to the Supabase project as migrations "omerta_realtime_chat" and "lock_down_rls_auto_enable".
create table if not exists public.players (
  player_id text primary key check (player_id ~ '^OM-[A-Z0-9]{4}$'),
  auth_id uuid not null default auth.uid() unique,
  name text not null default '' check (length(name) <= 16),
  created_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  uid text not null check (uid ~ '^OM-[A-Z0-9]{4}$'),
  username text not null check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  flag text not null default '' check (length(flag) <= 8),
  text text not null check (length(text) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at desc);
create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  pair text not null check (pair ~ '^OM-[A-Z0-9]{4}_OM-[A-Z0-9]{4}$'),
  from_id text not null check (from_id ~ '^OM-[A-Z0-9]{4}$'),
  text text not null check (length(text) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists dm_messages_pair_idx on public.dm_messages (pair, created_at);
create table if not exists public.inbox (
  owner text not null check (owner ~ '^OM-[A-Z0-9]{4}$'),
  peer text not null check (peer ~ '^OM-[A-Z0-9]{4}$'),
  name text not null default '' check (length(name) <= 16),
  text text not null default '' check (length(text) <= 120),
  t timestamptz not null default now(),
  unread boolean not null default false,
  primary key (owner, peer)
);
create or replace function public.mine(pid text) returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.players where player_id = pid and auth_id = (select auth.uid())) $$;
revoke all on function public.mine(text) from public, anon;
grant execute on function public.mine(text) to authenticated;
create or replace function public.throttle() returns trigger
language plpgsql security definer set search_path = public as
$$
declare who text; n int;
begin
  who := case tg_table_name when 'chat_messages' then new.uid else new.from_id end;
  execute format('select count(*) from public.%I where %s = $1 and created_at > now() - interval ''8 seconds''', tg_table_name,
    case tg_table_name when 'chat_messages' then 'uid' else 'from_id' end) into n using who;
  if n >= 5 then raise exception 'slow down' using errcode = 'P0001'; end if;
  return new;
end $$;
revoke all on function public.throttle() from public, anon, authenticated;
create trigger chat_throttle before insert on public.chat_messages for each row execute function public.throttle();
create trigger dm_throttle before insert on public.dm_messages for each row execute function public.throttle();
alter table public.players enable row level security;
alter table public.chat_messages enable row level security;
alter table public.dm_messages enable row level security;
alter table public.inbox enable row level security;
create policy players_read on public.players for select to authenticated using (true);
create policy players_claim on public.players for insert to authenticated with check (auth_id = (select auth.uid()));
create policy players_rename on public.players for update to authenticated using (auth_id = (select auth.uid())) with check (auth_id = (select auth.uid()));
create policy chat_read on public.chat_messages for select to authenticated using (true);
create policy chat_send on public.chat_messages for insert to authenticated with check (public.mine(uid));
create policy dm_read on public.dm_messages for select to authenticated using (public.mine(split_part(pair,'_',1)) or public.mine(split_part(pair,'_',2)));
create policy dm_send on public.dm_messages for insert to authenticated with check (public.mine(from_id) and from_id in (split_part(pair,'_',1), split_part(pair,'_',2)));
create policy inbox_read on public.inbox for select to authenticated using (public.mine(owner));
create policy inbox_write on public.inbox for insert to authenticated with check (public.mine(owner) or public.mine(peer));
create policy inbox_update on public.inbox for update to authenticated using (public.mine(owner) or public.mine(peer)) with check (public.mine(owner) or public.mine(peer));
alter publication supabase_realtime add table public.chat_messages, public.dm_messages, public.inbox;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
