-- Copper chat · a small server with a clear purpose for every channel (the shape of a popular community server).
-- RUN THIS ONCE in Supabase > SQL Editor > New query > paste > Run. Safe to run again.
--
-- Members see only these 6 channels (plus vip-lounge if they are og or vip):
--   INFO   : rules · announcements          (staff post, everyone reads)
--   CHAT   : general · games · arcade · support
--   VIP    : vip-lounge                      (og + vip only)
--   STAFF  : staff-chat · mod-reports · mod-log   (staff only, members never see them)
--
--   general  = talk about anything          games  = what you are playing, find people to play with
--   arcade   = bot games (/slots /roll ...)  support = something broken, a site that is blocked, or an idea for Copper
--
-- Names the bot and sign-up rely on are kept: general, rules, announcements, mod-reports, mod-log.
-- Renamed with their history kept: casino -> arcade, and help / feedback / suggestions -> support (the first one found).
-- DELETED together with their messages: general-2, media, updates, links, hall-of-fame, movies-and-manga,
-- sound-effects, staff-notes, and any extra help / feedback / suggestions left over after the rename.

do $$
declare c_info bigint; c_chat bigint; c_vip bigint; c_staff bigint; old text;
begin
  -- categories: "general" becomes "chat" (a channel called general inside a category called general reads oddly)
  if exists (select 1 from public.categories where name = 'general') and not exists (select 1 from public.categories where name = 'chat') then
    update public.categories set name = 'chat' where name = 'general';
  end if;
  insert into public.categories (name, position) values ('info', 0), ('chat', 1), ('vip', 2), ('staff', 3)
    on conflict (name) do nothing;
  update public.categories set position = case name when 'info' then 0 when 'chat' then 1 when 'vip' then 2 when 'staff' then 3 else position end;
  select id into c_info  from public.categories where name = 'info';
  select id into c_chat  from public.categories where name = 'chat';
  select id into c_vip   from public.categories where name = 'vip';
  select id into c_staff from public.categories where name = 'staff';

  -- keep the history of the channels we fold together by renaming one of them
  if exists (select 1 from public.channels where name = 'casino') and not exists (select 1 from public.channels where name = 'arcade') then
    update public.channels set name = 'arcade' where name = 'casino';
  end if;
  if not exists (select 1 from public.channels where name = 'support') then
    select name into old from public.channels where name in ('help', 'feedback', 'suggestions')
      order by case name when 'help' then 0 when 'feedback' then 1 else 2 end limit 1;
    if old is not null then update public.channels set name = 'support' where name = old; end if;
  end if;

  -- the channels we keep (created if missing, updated if they exist)
  insert into public.channels (category_id, name, topic, position, read_rank, write_rank) values
    (c_info,  'rules',         'Read this first',                                          0, 1, 3),
    (c_info,  'announcements', 'News and updates from the Copper team',                    1, 1, 3),
    (c_chat,  'general',       'Hang out and talk about anything',                         0, 1, 1),
    (c_chat,  'games',         'What are you playing? Find people to play with',           1, 1, 1),
    (c_chat,  'arcade',        'Bot games: /slots /roll /coinflip /8ball /choose',         2, 1, 1),
    (c_chat,  'support',       'Something broken or blocked? Got an idea? Post it here',   3, 1, 1),
    (c_vip,   'vip-lounge',    'For og and vip members',                                   0, 2, 2),
    (c_staff, 'staff-chat',    'Staff only',                                               0, 3, 3),
    (c_staff, 'mod-reports',   'Reports land here (the bot posts, staff read)',            1, 3, 99),
    (c_staff, 'mod-log',       'Bans, timeouts and role changes',                          2, 3, 99)
  on conflict (name) do update set category_id = excluded.category_id, topic = excluded.topic,
    position = excluded.position, read_rank = excluded.read_rank, write_rank = excluded.write_rank;

  -- everything else goes
  delete from public.channels where name not in
    ('rules', 'announcements', 'general', 'games', 'arcade', 'support', 'vip-lounge', 'staff-chat', 'mod-reports', 'mod-log');

  -- drop categories with nothing left in them
  delete from public.categories c where c.name not in ('info', 'chat', 'vip', 'staff')
    and not exists (select 1 from public.channels k where k.category_id = c.id);

  -- the welcome DM the bot sends to new people
  update public.bot_config set value = E'hey! i''m Copper Helper 👋\n• read #rules before you post\n• say hi in #general, find people to play with in #games\n• stuck or something blocked? ask in #support\n• try /help in any channel to see what i can do\n• open Settings > account to set your avatar, color and bio, and click your name at the bottom left to set a status'
    where key = 'welcome';
end $$;
