-- =====================================================================
-- Copper chat v2: database setup for Supabase.
--
-- !! THIS WIPES THE OLD CHAT TABLES (profiles, messages, ...) AND REBUILDS !!
-- !! THEM. Old test accounts/messages are lost. That is intended: the old  !!
-- !! anonymous accounts cannot log in with a password anyway.              !!
--
-- Paste the whole file into Supabase > SQL Editor > New query > Run.
-- You can run it again later to reset chat completely.
--
-- Makes: profiles, categories, channels, messages (with replies + edits),
-- reactions, friends, DMs, bans, reports, the Copper Helper bot, all the
-- permission rules (RLS) and the moderation functions.
-- =====================================================================

-- ---------- 0. clean slate ----------
drop table if exists public.reactions, public.reports, public.friendships, public.bans,
  public.messages, public.dms, public.channels, public.categories,
  public.bot_config, public.profiles_private, public.profiles cascade;

do $$ declare r record; begin
  for r in select p.oid::regprocedure as sig from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname = any (array[
      'rank','my_role','my_rank','is_mod','is_admin','is_banned','can_read','can_write','are_friends','in_dm',
      'can_dm_write','bot_id','bot_say','bot_answer','profiles_guard','messages_guard','messages_before_insert',
      'messages_after','reports_after','handle_new_user','ban_user','unban_user','set_role','delete_me',
      'friend_request','friend_respond','friend_remove','open_dm','mark_dm_read','set_recovery_email','toggle_reaction'])
  loop execute 'drop function if exists ' || r.sig || ' cascade'; end loop;
end $$;

-- ---------- 1. tables ----------
create table public.profiles (
  id           uuid primary key,          -- = auth.users.id (the bot has no auth user)
  username     text not null unique
               check (username ~ '^[a-z0-9_]{3,20}$'
                      and username not in ('admin','mod','moderator','owner','copper','system','staff','support','everyone','here','helper','bot')),
  display_name text not null check (char_length(display_name) between 1 and 24),
  color        text not null default '#ff7b2e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  avatar       text not null default 'copper'  check (avatar ~ '^[a-z0-9_-]{1,20}$'),
  bio          text not null default ''        check (char_length(bio) <= 140),
  role         text not null default 'member'  check (role in ('member','og','vip','mod','admin','owner','bot')),
  created_at   timestamptz not null default now()
);

-- the optional recovery email lives apart so nobody else can ever read it
create table public.profiles_private (
  id             uuid primary key references public.profiles(id) on delete cascade,
  recovery_email text check (char_length(recovery_email) <= 254)
);

create table public.bot_config (key text primary key, value text not null);

create table public.categories (
  id       bigint generated always as identity primary key,
  name     text not null unique check (char_length(name) between 2 and 24),
  position int not null default 0
);

create table public.channels (
  id          bigint generated always as identity primary key,
  category_id bigint references public.categories(id) on delete set null,
  name        text not null unique check (name ~ '^[a-z0-9-]{2,24}$'),
  topic       text not null default '' check (char_length(topic) <= 120),
  position    int  not null default 0,
  read_rank   int  not null default 1,   -- 1 member, 2 og/vip, 3 mod, 4 admin, 5 owner
  write_rank  int  not null default 1    -- 99 = nobody (only the bot posts)
);

create table public.dms (
  id              bigint generated always as identity primary key,
  user_a          uuid not null references public.profiles(id) on delete cascade,
  user_b          uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  last_sender     uuid,
  a_read_at       timestamptz,
  b_read_at       timestamptz,
  created_at      timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table public.messages (
  id         bigint generated always as identity primary key,
  channel_id bigint references public.channels(id) on delete cascade,
  dm_id      bigint references public.dms(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  content    text   not null check (deleted or char_length(content) between 1 and 500),
  reply_to   bigint references public.messages(id) on delete set null,
  deleted    boolean not null default false,
  edited_at  timestamptz,
  created_at timestamptz not null default now(),
  check ((channel_id is null) <> (dm_id is null))
);
create index messages_channel_created on public.messages (channel_id, created_at desc) where channel_id is not null;
create index messages_dm_created      on public.messages (dm_id, created_at desc)      where dm_id is not null;
create index messages_user_recent     on public.messages (user_id, created_at desc);

create table public.reactions (
  message_id bigint not null references public.messages(id) on delete cascade,
  user_id    uuid   not null references public.profiles(id) on delete cascade,
  emoji      text   not null check (emoji in ('👍','😂','🔥','👀','🎉','💀','😮','🧡')),
  active     boolean not null default true,   -- toggled instead of deleted so realtime can follow it
  channel_id bigint,
  dm_id      bigint,
  primary key (message_id, user_id, emoji)
);
create index reactions_channel on public.reactions (channel_id) where channel_id is not null;
create index reactions_dm      on public.reactions (dm_id)      where dm_id is not null;

create table public.friendships (
  id         bigint generated always as identity primary key,
  requester  uuid not null references public.profiles(id) on delete cascade,
  addressee  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index friendships_addressee on public.friendships (addressee);

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
  snapshot    text,                              -- the message text at report time (for DMs mods cannot read)
  created_at  timestamptz not null default now(),
  unique (message_id, reporter_id)
);

-- ---------- 2. helper functions ----------
create function public.rank(r text) returns int language sql immutable as $$
  select case r when 'owner' then 5 when 'admin' then 4 when 'mod' then 3 when 'vip' then 2 when 'og' then 2 when 'member' then 1 else 0 end $$;

create function public.bot_id() returns uuid language sql immutable as $$ select '00000000-0000-0000-0000-00000000c0b0'::uuid $$;

create function public.my_role() returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'none') $$;
create function public.my_rank() returns int language sql stable security definer set search_path = public as $$
  select public.rank(public.my_role()) $$;
create function public.is_mod() returns boolean language sql stable security definer set search_path = public as $$
  select public.my_rank() >= 3 $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.my_rank() >= 4 $$;
create function public.is_banned(uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bans where user_id = uid and (until is null or until > now())) $$;

create function public.can_read(cid bigint) returns boolean language sql stable security definer set search_path = public as $$
  select public.my_rank() >= coalesce((select read_rank from public.channels where id = cid), 99) $$;
create function public.can_write(cid bigint) returns boolean language sql stable security definer set search_path = public as $$
  select public.my_rank() >= coalesce((select write_rank from public.channels where id = cid), 99)
         and not public.is_banned(auth.uid()) $$;

create function public.are_friends(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships where status = 'accepted'
                 and ((requester = a and addressee = b) or (requester = b and addressee = a))) $$;
create function public.in_dm(did bigint) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dms where id = did and auth.uid() in (user_a, user_b)) $$;
-- you can write in a DM if you are in it, not banned, and (you are friends, or the other side is the bot)
create function public.can_dm_write(did bigint) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.dms d where d.id = did and auth.uid() in (d.user_a, d.user_b)
    and (d.user_a = public.bot_id() or d.user_b = public.bot_id() or public.are_friends(d.user_a, d.user_b)))
    and not public.is_banned(auth.uid()) $$;

create function public.bot_say(ch text, txt text) returns void language sql security definer set search_path = public as $$
  insert into public.messages (channel_id, user_id, content)
  select id, public.bot_id(), left(txt, 500) from public.channels where name = ch $$;

-- ---------- 3. the Copper Helper bot's brain ----------
-- Anything it says in chat is produced here on the server, so nobody can fake a bot message.
create function public.bot_answer(txt text, loud boolean) returns text language plpgsql security definer set search_path = public as $$
declare m text[]; cmd text; arg text; n int; opts text[]; a text[] := array['🍒','🍋','🔔','⭐','💎','🧡']; x text; y text; z text;
  ball text[] := array['yes, definitely','without a doubt','most likely','signs point to yes','ask me later','cannot tell right now','i would not count on it','my sources say no','very doubtful','absolutely not'];
begin
  m := regexp_match(trim(txt), '^/?(\S+)\s*(.*)$', 's');
  if m is null then return null; end if;
  cmd := lower(m[1]); arg := trim(m[2]);
  if cmd = 'help' then
    return 'i''m Copper Helper. try /rules · /roll 20 · /coinflip · /8ball will this work? · /choose pizza, tacos · /slots · /ping · /about. friends and dms live under "friends" at the top left. in a dm with me i answer everything.';
  elsif cmd = 'rules' then return (select value from public.bot_config where key = 'rules');
  elsif cmd = 'about' then return (select value from public.bot_config where key = 'about');
  elsif cmd = 'ping' then return 'pong';
  elsif cmd in ('coinflip','flip','coin') then return case when random() < .5 then 'heads' else 'tails' end;
  elsif cmd in ('roll','dice') then
    n := case when arg ~ '^[0-9]{1,4}$' and arg::int >= 2 then arg::int else 6 end;
    return 'you rolled ' || (1 + floor(random() * n))::int || ' (1-' || n || ')';
  elsif cmd = '8ball' then
    if arg = '' then return 'ask a question first, like /8ball will it rain?'; end if;
    return ball[1 + floor(random() * array_length(ball, 1))::int];
  elsif cmd in ('choose','pick') then
    opts := regexp_split_to_array(arg, '\s*(,|\sor\s)\s*', 'i');
    if arg = '' or array_length(opts, 1) < 2 then return 'give me at least two options, like /choose pizza, tacos'; end if;
    return 'i pick: ' || left(opts[1 + floor(random() * array_length(opts, 1))::int], 100);
  elsif cmd = 'slots' then
    x := a[1 + floor(random() * 6)::int]; y := a[1 + floor(random() * 6)::int]; z := a[1 + floor(random() * 6)::int];
    return x || ' ' || y || ' ' || z || case when x = y and y = z then '  JACKPOT!' when x = y or y = z or x = z then '  so close' else '' end;
  end if;
  return case when loud then 'i don''t know that one. try /help' end;
end $$;

-- ---------- 4. guards (triggers) ----------
create function public.profiles_guard() returns trigger language plpgsql as $$
begin
  if new.id is distinct from old.id or new.username is distinct from old.username or new.created_at is distinct from old.created_at then
    raise exception 'username and join date cannot be changed';
  end if;
  -- auth.uid() is null when you run SQL yourself in the dashboard, so you can always promote someone there
  if new.role is distinct from old.role and not (auth.uid() is null or current_setting('copper.role_change', true) = '1') then
    raise exception 'roles are changed with set_role';
  end if;
  return new;
end $$;
create trigger profiles_guard_t before update on public.profiles
  for each row execute function public.profiles_guard();

create function public.messages_guard() returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id or new.channel_id is distinct from old.channel_id
     or new.dm_id is distinct from old.dm_id or new.created_at is distinct from old.created_at
     or new.reply_to is distinct from old.reply_to then
    raise exception 'only the text of a message can change';
  end if;
  if old.deleted then
    if new.deleted is distinct from old.deleted or new.content is distinct from old.content then
      raise exception 'removed messages stay removed';
    end if;
    return new;
  end if;
  if new.deleted then
    new.content := '';                       -- a removed message no longer exposes its text
    return new;
  end if;
  if new.content is distinct from old.content then
    if auth.uid() is not null and auth.uid() <> old.user_id then raise exception 'you can only edit your own messages'; end if;
    new.edited_at := now();
  end if;
  return new;
end $$;
create trigger messages_guard_t before update on public.messages
  for each row execute function public.messages_guard();

create function public.messages_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id <> public.bot_id() and
     (select count(*) from public.messages where user_id = new.user_id and created_at > now() - interval '10 seconds') >= 5 then
    raise exception 'slow down';
  end if;
  if new.reply_to is not null and not exists (
       select 1 from public.messages r where r.id = new.reply_to
       and r.channel_id is not distinct from new.channel_id and r.dm_id is not distinct from new.dm_id) then
    raise exception 'you can only reply to a message in the same place';
  end if;
  return new;
end $$;
create trigger messages_before_insert_t before insert on public.messages
  for each row execute function public.messages_before_insert();

-- after a message: keep DM unread info fresh, and let the bot answer commands / DMs
create function public.messages_after() returns trigger language plpgsql security definer set search_path = public as $$
declare other uuid; t text; ans text; rest text;
begin
  if new.dm_id is not null then
    update public.dms set last_message_at = new.created_at, last_sender = new.user_id where id = new.dm_id;
  end if;
  if new.user_id = public.bot_id() then return new; end if;

  if new.dm_id is not null then
    select case when user_a = new.user_id then user_b else user_a end into other from public.dms where id = new.dm_id;
    if other = public.bot_id() then
      ans := public.bot_answer(new.content, true);
      if ans is not null then insert into public.messages (dm_id, user_id, content, reply_to) values (new.dm_id, public.bot_id(), left(ans, 500), new.id); end if;
    end if;
  else
    t := trim(new.content);
    if t ~* '^@copperbot(\s|$)' then
      rest := trim(regexp_replace(t, '^@copperbot', '', 'i'));
      t := case when rest = '' then '/help' when left(rest, 1) = '/' then rest else '/' || rest end;
      ans := public.bot_answer(t, true);
    elsif left(t, 1) = '/' then
      ans := public.bot_answer(t, false);
    end if;
    if ans is not null then insert into public.messages (channel_id, user_id, content, reply_to) values (new.channel_id, public.bot_id(), left(ans, 500), new.id); end if;
  end if;
  return new;
end $$;
create trigger messages_after_t after insert on public.messages
  for each row execute function public.messages_after();

-- a report is copied into the staff channel #mod-reports by the bot
create function public.reports_after() returns trigger language plpgsql security definer set search_path = public as $$
declare m record; who text; au text; rp text;
begin
  select ms.content, ms.user_id, ms.channel_id, ms.dm_id into m from public.messages ms where ms.id = new.message_id;
  update public.reports set snapshot = left(m.content, 500) where id = new.id;
  select username into au from public.profiles where id = m.user_id;
  select username into rp from public.profiles where id = new.reporter_id;
  who := case when m.channel_id is not null then '#' || (select name from public.channels where id = m.channel_id) else 'a dm' end;
  perform public.bot_say('mod-reports', '🚩 report #' || new.id || ' · @' || rp || ' reported @' || au || ' in ' || who || ': "' || left(m.content, 160) || '"'
    || case when new.reason <> '' then ' · reason: ' || left(new.reason, 100) else '' end);
  return new;
end $$;
create trigger reports_after_t after insert on public.reports
  for each row execute function public.reports_after();

-- ---------- 5. permissions (row level security) ----------
alter table public.profiles         enable row level security;
alter table public.profiles_private enable row level security;
alter table public.bot_config       enable row level security;
alter table public.categories       enable row level security;
alter table public.channels         enable row level security;
alter table public.dms              enable row level security;
alter table public.messages         enable row level security;
alter table public.reactions        enable row level security;
alter table public.friendships      enable row level security;
alter table public.bans             enable row level security;
alter table public.reports          enable row level security;

revoke all on public.profiles, public.profiles_private, public.bot_config, public.categories, public.channels, public.dms,
  public.messages, public.reactions, public.friendships, public.bans, public.reports from anon;

-- tables that only the functions below may change
revoke insert, update, delete on public.profiles, public.profiles_private, public.bot_config, public.dms,
  public.reactions, public.friendships, public.bans from authenticated;
revoke all on public.bot_config from authenticated;
grant update (display_name, color, avatar, bio) on public.profiles to authenticated;   -- NOT role, NOT username

create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy private_read    on public.profiles_private for select to authenticated using (id = auth.uid());

create policy categories_read  on public.categories for select to authenticated using (true);
create policy categories_admin on public.categories for all    to authenticated using (public.is_admin()) with check (public.is_admin());
create policy channels_read    on public.channels for select to authenticated using (public.my_rank() >= read_rank);
create policy channels_admin   on public.channels for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy dms_read on public.dms for select to authenticated using (auth.uid() in (user_a, user_b));

create policy messages_read on public.messages for select to authenticated
  using ((channel_id is not null and public.can_read(channel_id)) or (dm_id is not null and public.in_dm(dm_id)));
create policy messages_insert on public.messages for insert to authenticated
  with check (user_id = auth.uid() and not deleted
    and ((channel_id is not null and public.can_write(channel_id)) or (dm_id is not null and public.can_dm_write(dm_id))));
create policy messages_update on public.messages for update to authenticated
  using ((user_id = auth.uid() and not public.is_banned(auth.uid())) or (public.is_mod() and channel_id is not null))
  with check ((user_id = auth.uid() and not public.is_banned(auth.uid())) or (public.is_mod() and channel_id is not null));

create policy reactions_read on public.reactions for select to authenticated
  using ((channel_id is not null and public.can_read(channel_id)) or (dm_id is not null and public.in_dm(dm_id)));

create policy friendships_read on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));

create policy bans_read_mods on public.bans for select to authenticated using (public.is_mod() or user_id = auth.uid());

create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and exists (select 1 from public.messages m where m.id = message_id));
create policy reports_read   on public.reports for select to authenticated using (public.is_mod());
create policy reports_delete on public.reports for delete to authenticated using (public.is_mod());

-- ---------- 6. functions the app calls ----------
-- (a) moderation
create function public.ban_user(target uuid, minutes int default null, why text default '') returns void
language plpgsql security definer set search_path = public as $$
declare tn text; mn text;
begin
  if not public.is_mod() then raise exception 'mods only'; end if;
  if target = auth.uid() then raise exception 'you cannot ban yourself'; end if;
  if public.rank((select role from public.profiles where id = target)) >= public.my_rank() then
    raise exception 'you cannot act on someone of the same or higher role';
  end if;
  insert into public.bans (user_id, reason, until, by)
  values (target, left(coalesce(why,''), 200), case when minutes is null then null else now() + make_interval(mins => minutes) end, auth.uid())
  on conflict (user_id) do update set reason = excluded.reason, until = excluded.until, by = excluded.by, created_at = now();
  select username into tn from public.profiles where id = target;
  select username into mn from public.profiles where id = auth.uid();
  perform public.bot_say('mod-log', '🔨 @' || mn || (case when minutes is null then ' banned @' || tn else ' timed out @' || tn || ' for ' || minutes || ' min' end));
end $$;

create function public.unban_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare tn text; mn text;
begin
  if not public.is_mod() then raise exception 'mods only'; end if;
  delete from public.bans where user_id = target;
  select username into tn from public.profiles where id = target;
  select username into mn from public.profiles where id = auth.uid();
  perform public.bot_say('mod-log', '✅ @' || mn || ' lifted the ban/timeout on @' || tn);
end $$;

-- admins can give member/og/vip/mod; only the owner can make admins; the owner role itself is set in SQL only
create function public.set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = public as $$
declare tn text; mn text;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if new_role not in ('member','og','vip','mod','admin') then raise exception 'unknown role'; end if;
  if target = auth.uid() then raise exception 'ask someone above you to change your own role'; end if;
  if public.rank((select role from public.profiles where id = target)) >= public.my_rank()
     or public.rank(new_role) >= public.my_rank() then
    raise exception 'you cannot give or change that role';
  end if;
  perform set_config('copper.role_change', '1', true);
  update public.profiles set role = new_role where id = target;
  select username into tn from public.profiles where id = target;
  select username into mn from public.profiles where id = auth.uid();
  perform public.bot_say('mod-log', '🎖️ @' || mn || ' set @' || tn || ' to ' || new_role);
end $$;

-- lets a person erase their own account: profile, messages, friends, DMs and sign-in all go
create function public.delete_me() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if public.my_role() = 'owner' then raise exception 'the owner account cannot be deleted from the app'; end if;
  delete from public.profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;

-- (b) reactions: one tap toggles
create function public.toggle_reaction(mid bigint, emo text) returns void
language plpgsql security definer set search_path = public as $$
declare m record;
begin
  select id, channel_id, dm_id, deleted into m from public.messages where id = mid;
  if m.id is null or m.deleted then raise exception 'message not found'; end if;
  if public.is_banned(auth.uid()) then raise exception 'you are timed out'; end if;
  if not ((m.channel_id is not null and public.can_read(m.channel_id)) or (m.dm_id is not null and public.in_dm(m.dm_id))) then
    raise exception 'message not found';
  end if;
  insert into public.reactions (message_id, user_id, emoji, channel_id, dm_id) values (mid, auth.uid(), emo, m.channel_id, m.dm_id)
  on conflict (message_id, user_id, emoji) do update set active = not public.reactions.active;
end $$;

-- (c) friends
create function public.friend_request(uname text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); t uuid; f record;
begin
  if me is null or not exists (select 1 from public.profiles where id = me) then raise exception 'sign in first'; end if;
  select id into t from public.profiles where username = lower(trim(uname)) and role <> 'bot';
  if t is null then raise exception 'no one has that username'; end if;
  if t = me then raise exception 'that is you'; end if;
  select * into f from public.friendships where (requester = me and addressee = t) or (requester = t and addressee = me);
  if found then
    if f.status = 'accepted' then raise exception 'you are already friends'; end if;
    if f.requester = me then raise exception 'request already sent'; end if;
    update public.friendships set status = 'accepted' where id = f.id;   -- they had asked you first, so this accepts
    return 'accepted';
  end if;
  if (select count(*) from public.friendships where requester = me and status = 'pending') >= 50 then raise exception 'too many pending requests'; end if;
  insert into public.friendships (requester, addressee) values (me, t);
  return 'sent';
end $$;

create function public.friend_respond(req bigint, accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.friendships where id = req and addressee = auth.uid() and status = 'pending') then
    raise exception 'that request is gone';
  end if;
  if accept then update public.friendships set status = 'accepted' where id = req;
  else delete from public.friendships where id = req; end if;
end $$;

-- remove a friend, cancel a request you sent
create function public.friend_remove(other uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.friendships where (requester = auth.uid() and addressee = other) or (requester = other and addressee = auth.uid()) $$;

-- (d) DMs: only between friends (or with the bot)
create function public.open_dm(other uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; did bigint;
begin
  if other = me or not exists (select 1 from public.profiles where id = other) then raise exception 'no such person'; end if;
  if other <> public.bot_id() and not public.are_friends(me, other) then raise exception 'you can only dm friends'; end if;
  a := least(me, other); b := greatest(me, other);
  insert into public.dms (user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
  select id into did from public.dms where user_a = a and user_b = b;
  return did;
end $$;

create function public.mark_dm_read(did bigint) returns void
language sql security definer set search_path = public as $$
  update public.dms set a_read_at = case when user_a = auth.uid() then now() else a_read_at end,
                        b_read_at = case when user_b = auth.uid() then now() else b_read_at end
  where id = did and auth.uid() in (user_a, user_b) $$;

-- (e) optional recovery email (empty text clears it)
create function public.set_recovery_email(e text) returns void
language plpgsql security definer set search_path = public as $$
begin
  e := nullif(lower(trim(coalesce(e, ''))), '');
  if e is not null and e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'that does not look like an email'; end if;
  insert into public.profiles_private (id, recovery_email) values (auth.uid(), e)
  on conflict (id) do update set recovery_email = excluded.recovery_email;
end $$;

-- who can call what
revoke all on function public.ban_user(uuid,int,text), public.unban_user(uuid), public.set_role(uuid,text), public.delete_me(),
  public.toggle_reaction(bigint,text), public.friend_request(text), public.friend_respond(bigint,boolean), public.friend_remove(uuid),
  public.open_dm(uuid), public.mark_dm_read(bigint), public.set_recovery_email(text),
  public.my_role(), public.my_rank(), public.is_mod(), public.is_admin(), public.is_banned(uuid), public.can_read(bigint), public.can_write(bigint),
  public.are_friends(uuid,uuid), public.in_dm(bigint), public.can_dm_write(bigint) from public, anon;
-- the bot's internals are for the database only: nobody can call them from the app
revoke all on function public.bot_say(text,text), public.bot_answer(text,boolean) from public, anon, authenticated;
grant execute on function public.ban_user(uuid,int,text), public.unban_user(uuid), public.set_role(uuid,text), public.delete_me(),
  public.toggle_reaction(bigint,text), public.friend_request(text), public.friend_respond(bigint,boolean), public.friend_remove(uuid),
  public.open_dm(uuid), public.mark_dm_read(bigint), public.set_recovery_email(text),
  public.my_role(), public.my_rank(), public.is_mod(), public.is_admin(), public.is_banned(uuid), public.can_read(bigint), public.can_write(bigint),
  public.are_friends(uuid,uuid), public.in_dm(bigint), public.can_dm_write(bigint) to authenticated;

-- ---------- 7. the bot, text it reads from, starter categories + channels ----------
insert into public.profiles (id, username, display_name, color, avatar, bio, role)
values (public.bot_id(), 'copperbot', 'Copper Helper', '#3ecdb2', 'teal', 'I answer questions and keep things tidy. Type /help', 'bot');

-- edit these any time in Table Editor > bot_config (no code needed). 'email_domain' must match config.js.
insert into public.bot_config (key, value) values
  ('email_domain', 'members.copper-chat.app'),
  ('rules', E'1. be kind. no hate, harassment or slurs\n2. no spam, ads or invite links\n3. keep real names, schools, addresses and phone numbers private\n4. nothing illegal, nsfw or gory\n5. listen to mods. report problems with the flag button\nbreaking rules = timeout or ban'),
  ('about', 'Copper Helper · lives in Copper chat · rolls dice, flips coins, answers questions and tells staff when something gets reported.'),
  ('welcome', E'hey! i''m Copper Helper 👋\n• read #rules before you post\n• type /help in any channel to see what i can do\n• add friends from the "friends" button, then you can dm them\n• click your name at the bottom left to change your avatar, color and bio');

insert into public.categories (name, position) values ('info', 0), ('general', 1), ('community', 2), ('vip', 3), ('staff', 4);

insert into public.channels (category_id, name, topic, position, read_rank, write_rank)
select c.id, v.name, v.topic, v.pos, v.rr, v.wr from (values
  ('info','rules',           'Read this first',                          0, 1, 3),
  ('info','announcements',   'News from the Copper team',                1, 1, 3),
  ('info','updates',         'What changed on the site',                 2, 1, 3),
  ('info','links',           'Useful links from staff',                  3, 1, 3),
  ('info','hall-of-fame',    'People and moments worth remembering',     4, 1, 3),
  ('general','general',      'Say hi',                                   0, 1, 1),
  ('general','general-2',    'Overflow for when general is busy',        1, 1, 1),
  ('general','media',        'Clips, screenshots, art (describe them, no links)', 2, 1, 1),
  ('general','casino',       'Try /coinflip /roll /slots. Just for fun, no real money',  3, 1, 1),
  ('community','games',      'What are you playing?',                    0, 1, 1),
  ('community','movies-and-manga', 'Watching and reading',               1, 1, 1),
  ('community','sound-effects',    'Editing and sound talk',             2, 1, 1),
  ('community','suggestions','Ideas for Copper',                         3, 1, 1),
  ('community','help',       'Something broken? Ask here',               4, 1, 1),
  ('vip','vip-lounge',       'For og and vip members',                   0, 2, 2),
  ('staff','staff-chat',     'Staff only',                               0, 3, 3),
  ('staff','mod-reports',    'Reports land here (bot posts, staff read)',1, 3, 99),
  ('staff','mod-log',        'Bans, timeouts and role changes',          2, 3, 99),
  ('staff','staff-notes',    'Handover notes and todo',                  3, 3, 3)
) as v(cat, name, topic, pos, rr, wr) join public.categories c on c.name = v.cat;

insert into public.messages (channel_id, user_id, content)
select id, public.bot_id(), (select value from public.bot_config where key = 'rules') from public.channels where name = 'rules';
insert into public.messages (channel_id, user_id, content)
select id, public.bot_id(), 'welcome to Copper chat. this channel is for news. say hi in #general.' from public.channels where name = 'announcements';

-- ---------- 8. sign-up: one account = one username + password ----------
-- The site signs people up with a hidden address <username>@<email_domain> (no mail is ever sent),
-- so a username can only exist once. This trigger builds the profile in the same step, so a
-- sign-up either fully works or fully fails. Anonymous sign-ins (no username) are refused too.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare uname text := lower(coalesce(new.raw_user_meta_data->>'username', ''));
        rec text := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'recovery_email', ''))), '');
        dom text := (select value from public.bot_config where key = 'email_domain');
        av text := (array['copper','copper','gold','red','pink','purple','blue','teal','green'])[1 + floor(random() * 9)::int];
        gid bigint; did bigint;
begin
  if uname = '' or new.email is distinct from uname || '@' || dom then raise exception 'sign up through the Copper chat page'; end if;
  insert into public.profiles (id, username, display_name, avatar) values (new.id, uname, uname, av);
  if rec is not null and rec ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(rec) <= 254 then
    insert into public.profiles_private (id, recovery_email) values (new.id, rec);
  end if;
  select id into gid from public.channels where name = 'general';
  if gid is not null then
    insert into public.messages (channel_id, user_id, content) values (gid, public.bot_id(), 'welcome to Copper, @' || uname || '! say hi 👋 (type /help to see what i do)');
  end if;
  insert into public.dms (user_a, user_b) values (least(new.id, public.bot_id()), greatest(new.id, public.bot_id())) returning id into did;
  insert into public.messages (dm_id, user_id, content) values (did, public.bot_id(), (select value from public.bot_config where key = 'welcome'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 9. live updates ----------
do $$ begin
  begin alter publication supabase_realtime add table public.messages;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.reactions;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.friendships; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.dms;         exception when duplicate_object then null; end;
end $$;
