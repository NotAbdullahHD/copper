-- Copper chat v4 · fewer channels, each with a clear purpose.
-- OPTIONAL. The new chat page works without it. Safe to run more than once. Nothing is wiped except the channels listed below.
--
-- After this the channel list is:
--   info   : rules · announcements                  (read-only, staff post)
--   chat   : general · games · arcade · feedback
--   vip    : vip-lounge                             (og + vip only)
--   staff  : staff-chat · mod-reports · mod-log     (staff only)
--
-- general, rules, announcements, mod-reports and mod-log keep their names because the bot and the
-- sign-up welcome use them. casino becomes arcade and suggestions becomes feedback, with their history.
-- Channels that are not in the list above (general-2, media, updates, links, hall-of-fame, help,
-- movies-and-manga, sound-effects, staff-notes) are deleted together with their messages.
-- Want to keep one of them? Delete its name from the "delete from public.channels" list near the bottom.

do $$
declare c_info bigint; c_chat bigint; c_vip bigint; c_staff bigint;
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

  -- keep the history of two channels by renaming them
  if exists (select 1 from public.channels where name = 'casino') and not exists (select 1 from public.channels where name = 'arcade') then
    update public.channels set name = 'arcade' where name = 'casino';
  end if;
  if exists (select 1 from public.channels where name = 'suggestions') and not exists (select 1 from public.channels where name = 'feedback') then
    update public.channels set name = 'feedback' where name = 'suggestions';
  end if;

  -- the channels we keep (created if missing, updated if they exist)
  insert into public.channels (category_id, name, topic, position, read_rank, write_rank) values
    (c_info,  'rules',         'Read this first',                                        0, 1, 3),
    (c_info,  'announcements', 'News and updates from the Copper team',                  1, 1, 3),
    (c_chat,  'general',       'Hang out and talk about anything',                       0, 1, 1),
    (c_chat,  'games',         'What are you playing? Find people to play with',         1, 1, 1),
    (c_chat,  'arcade',        'Bot games: /slots /roll /coinflip /8ball /choose. Just for fun', 2, 1, 1),
    (c_chat,  'feedback',      'Ideas, bugs and questions for Copper',                   3, 1, 1),
    (c_vip,   'vip-lounge',    'For og and vip members',                                 0, 2, 2),
    (c_staff, 'staff-chat',    'Staff only',                                             0, 3, 3),
    (c_staff, 'mod-reports',   'Reports land here (bot posts, staff read)',              1, 3, 99),
    (c_staff, 'mod-log',       'Bans, timeouts and role changes',                        2, 3, 99)
  on conflict (name) do update set category_id = excluded.category_id, topic = excluded.topic,
    position = excluded.position, read_rank = excluded.read_rank, write_rank = excluded.write_rank;

  -- the channels that are folded into the ones above
  delete from public.channels where name in
    ('general-2', 'media', 'updates', 'links', 'hall-of-fame', 'help', 'movies-and-manga', 'sound-effects', 'staff-notes');

  -- drop a category that has nothing left in it
  delete from public.categories c where c.name = 'community' and not exists (select 1 from public.channels k where k.category_id = c.id);

  -- the welcome DM the bot sends to new people
  update public.bot_config set value = E'hey! i''m Copper Helper 👋\n• read #rules before you post\n• say hi in #general, find people to play with in #games\n• try /help in any channel to see what i can do\n• click your name at the bottom left to set a status, and the gear to change your avatar, color and bio'
    where key = 'welcome';
end $$;
