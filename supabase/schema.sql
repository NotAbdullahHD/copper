-- =====================================================================
-- Copper chat: database setup for Supabase.
-- Paste this whole file into Supabase > SQL Editor > New query, then Run.
-- Safe to run once on a fresh project. It makes: profiles, channels,
-- messages, bans, reports, the permission rules (RLS), and a few
-- moderation functions.
-- =====================================================================

-- ---------- tables ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique
               check (username ~ '^[a-z0-9_]{3,20}$'
                      and username not in ('admin','mod','moderator','copper','system','staff','support','everyone')),
  display_name text not null check (char_length(display_name) between 1 and 24),
  color        text not null default '#ff7b2e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  avatar       text not null default 'copper'  check (avatar ~ '^[a-z0-9_-]{1,20}$'),
  bio          text not null default ''        check (char_length(bio) <= 140),
  role         text not null default 'member'  check (role in ('member','mod','admin')),
  created_at   timestamptz not null default now()
);

create table public.channels (
  id         bigint generated always as identity primary key,
  name       text not null unique check (name ~ '^[a-z0-9-]{2,24}$'),
  topic      text not null default '' check (char_length(topic) <= 120),
  position   int  not null default 0,
  write_role text not null default 'member' check (write_role in ('member','mod','admin'))
);

create table public.messages (
  id         bigint generated always as identity primary key,
  channel_id bigint not null references public.channels(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  content    text   not null check (char_length(content) between 1 and 500),
  deleted    boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_channel_created on public.messages (channel_id, created_at desc);

create table public.bans (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  reason     text not null default '',
  until      timestamptz,                       -- null = permanent
  by         uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reports (
  id          bigint generated always as identity primary key,
  message_id  bigint not null references public.messages(id) on delete cascade,
  reporter_id uuid   not null references public.profiles(id) on delete cascade,
  reason      text   not null default '' check (char_length(reason) <= 200),
  created_at  timestamptz not null default now(),
  unique (message_id, reporter_id)
);

-- ---------- helper functions ----------
create function public.rank(r text) returns int language sql immutable as $$
  select case r when 'admin' then 3 when 'mod' then 2 when 'member' then 1 else 0 end $$;

create function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'none') $$;

create function public.is_mod() returns boolean language sql stable security definer set search_path = public as $$
  select public.rank(public.my_role()) >= 2 $$;

create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.rank(public.my_role()) >= 3 $$;

create function public.is_banned(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bans where user_id = uid and (until is null or until > now())) $$;

create function public.can_write(cid bigint) returns boolean language sql stable security definer set search_path = public as $$
  select public.rank(public.my_role()) >= public.rank((select write_role from public.channels where id = cid))
         and not public.is_banned(auth.uid()) $$;

-- ---------- guards (triggers) ----------
create function public.profiles_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.id is distinct from old.id or new.username is distinct from old.username or new.created_at is distinct from old.created_at then
    raise exception 'username and join date cannot be changed';
  end if;
  -- auth.uid() is null when you run SQL yourself in the dashboard, so you can always promote someone there
  if new.role is distinct from old.role and not (auth.uid() is null or public.is_admin()) then
    raise exception 'only admins can change roles';
  end if;
  return new;
end $$;
create trigger profiles_guard_t before update on public.profiles
  for each row execute function public.profiles_guard();

create function public.messages_guard() returns trigger language plpgsql as $$
begin
  if new.content is distinct from old.content or new.user_id is distinct from old.user_id
     or new.channel_id is distinct from old.channel_id or new.created_at is distinct from old.created_at then
    raise exception 'messages cannot be edited';
  end if;
  if old.deleted and not new.deleted then raise exception 'removed messages stay removed'; end if;
  return new;
end $$;
create trigger messages_guard_t before update on public.messages
  for each row execute function public.messages_guard();

create function public.messages_rate() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.messages where user_id = new.user_id and created_at > now() - interval '10 seconds') >= 5 then
    raise exception 'slow down';
  end if;
  return new;
end $$;
create trigger messages_rate_t before insert on public.messages
  for each row execute function public.messages_rate();

-- ---------- permissions (row level security) ----------
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.bans     enable row level security;
alter table public.reports  enable row level security;

revoke all on public.profiles, public.channels, public.messages, public.bans, public.reports from anon;

create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid() and role = 'member');
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy channels_read  on public.channels for select to authenticated using (true);
create policy channels_admin on public.channels for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy messages_read   on public.messages for select to authenticated using (true);
create policy messages_insert on public.messages for insert to authenticated
  with check (user_id = auth.uid() and not deleted and public.can_write(channel_id));
create policy messages_update on public.messages for update to authenticated
  using (user_id = auth.uid() or public.is_mod()) with check (user_id = auth.uid() or public.is_mod());

create policy bans_mods on public.bans for all to authenticated using (public.is_mod()) with check (public.is_mod());

create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_read   on public.reports for select to authenticated using (public.is_mod());
create policy reports_delete on public.reports for delete to authenticated using (public.is_mod());

-- ---------- moderation functions (the app calls these) ----------
create function public.ban_user(target uuid, minutes int default null, why text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_mod() then raise exception 'mods only'; end if;
  if target = auth.uid() then raise exception 'you cannot ban yourself'; end if;
  if public.rank((select role from public.profiles where id = target)) >= public.rank(public.my_role()) then
    raise exception 'you cannot act on someone of the same or higher role';
  end if;
  insert into public.bans (user_id, reason, until, by)
  values (target, left(coalesce(why,''), 200), case when minutes is null then null else now() + make_interval(mins => minutes) end, auth.uid())
  on conflict (user_id) do update set reason = excluded.reason, until = excluded.until, by = excluded.by, created_at = now();
end $$;

create function public.unban_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_mod() then raise exception 'mods only'; end if;
  delete from public.bans where user_id = target;
end $$;

create function public.set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if new_role not in ('member','mod','admin') then raise exception 'unknown role'; end if;
  if target = auth.uid() then raise exception 'ask another admin to change your own role'; end if;
  update public.profiles set role = new_role where id = target;
end $$;

-- lets a person erase their own account: profile, messages and sign-in all go
create function public.delete_me() returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid() $$;

revoke all on function public.ban_user(uuid,int,text), public.unban_user(uuid), public.set_role(uuid,text), public.delete_me() from public, anon;
grant execute on function public.ban_user(uuid,int,text), public.unban_user(uuid), public.set_role(uuid,text), public.delete_me() to authenticated;

-- ---------- starter channels ----------
insert into public.channels (name, topic, position, write_role) values
  ('announcements',    'News from the Copper team',       0, 'mod'),
  ('general',          'Say hi',                          1, 'member'),
  ('games',            'What are you playing?',           2, 'member'),
  ('movies-and-manga', 'Watching and reading',            3, 'member'),
  ('sound-effects',    'Editing and sound talk',          4, 'member'),
  ('help',             'Something broken? Ask here',      5, 'member');

-- ---------- live updates ----------
alter publication supabase_realtime add table public.messages;
