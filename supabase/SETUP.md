# Chat setup v2 (Supabase, free plan)

You already have a Supabase project and `public/js/config.local.js`. Keep both. This update only needs three things in the dashboard and one SQL run.

## 1. Auth settings (Authentication → Sign In / Providers)
- **Email provider → turn OFF "Confirm email".** Sign-ups use a hidden address (`username@members.copper-chat.app`), no mail is ever sent. If "Confirm email" stays on, sign-up will say it is not ready.
- **Minimum password length: 8** (same page, optional but matches the site).
- **Anonymous sign-ins can now be switched OFF.** The new database refuses accounts without a username anyway.
- Recommended before you share the link: **Attack Protection → CAPTCHA** (Cloudflare Turnstile) so bots cannot mass-create accounts.

## 2. Run the new database script
- **SQL Editor → New query**, paste all of `supabase/schema.sql`, **Run**.
- **This wipes the old chat tables** (old profiles and messages). That is intended, the old anonymous accounts cannot sign in with a password.
- Success looks like "Success. No rows returned". You can re-run it any time to reset chat completely.
- Optional cleanup: **Authentication → Users**, delete the old anonymous users.

## 3. Deploy the new site files
Upload/deploy the whole project as usual (`public/js/chat.js`, `chat-api.js`, `css/style.css`, `index.html` changed).

## 4. Make yourself owner
1. Open Copper → chat → **sign up** (username + password, email optional).
2. SQL Editor:
   ```sql
   update public.profiles set role = 'owner' where username = 'yourusername';
   ```
3. Reload chat. You now see the **staff** category too.

## Roles
| role | what it can do |
|---|---|
| owner | everything, can make admins. Set only through SQL. Cannot be deleted from the app |
| admin | make mod / vip / og, create channels (Table Editor), plus all mod powers |
| mod | delete messages, time out and ban, read staff channels and reports, post in info channels |
| vip, og | cosmetic badge + access to `#vip-lounge` (use og for early members, vip for supporters) |
| member | normal |

Click a name → **set role**. The bot logs role changes, bans and timeouts in `#mod-log`, and reports in `#mod-reports`.

## The bot (Copper Helper)
Lives in the database, so nobody can fake it. It answers `/help /rules /roll 20 /coinflip /8ball /choose a, b /slots /ping /about` in any channel, or `@copperbot help`. In a DM with it, it answers everything. New people get a welcome in `#general` and a DM from it.
Edit its texts (rules, about, welcome) in **Table Editor → bot_config**. Do not change the `email_domain` row.

## Channels
Edit in **Table Editor → channels / categories**. Columns: `read_rank` and `write_rank` (1 member, 2 og/vip, 3 mod, 4 admin, 5 owner, 99 = bot only). Example:
```sql
insert into public.channels (category_id, name, topic, position, read_rank, write_rank)
values ((select id from public.categories where name='general'), 'memes', 'Funny stuff', 5, 1, 1);
```

## Friends and DMs
Friends page is the top item in the left list. DMs only work between friends (and with the bot), so strangers cannot message people. Unfriending makes the DM read-only.

## Passwords
- Logged-in people can change their password in chat → ⚙.
- The optional recovery email is **stored but not used yet**: Supabase sends mail to the hidden login address, so automatic reset needs custom email sending (SMTP + a domain) and a small function. Until then, if someone forgets, reset it for them in SQL Editor:
  ```sql
  update auth.users set encrypted_password = crypt('a-new-temporary-password', gen_salt('bf'))
  where email = 'theirusername@members.copper-chat.app';
  ```
  and tell them to change it after signing in.

## Running it
- **Reports:** Table Editor → `reports` (has the message text at report time, also for DMs, which staff cannot otherwise read).
- **Old messages:** `delete from public.messages where created_at < now() - interval '30 days';`
- **Free plan pause:** projects pause after 7 days with no activity. Regular visitors keep it awake.
- **Limits (free):** about 200 connected at once, 2 million realtime messages a month, 500 MB. Chat connections close whenever someone leaves the chat page.
- **People's data:** username, optional recovery email, hashed password, profile, friends, DMs, messages. Anyone can erase theirs in chat → ⚙ → delete my account.
