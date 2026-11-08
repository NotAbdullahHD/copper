# Chat setup (Supabase, free plan)

Takes about 10 minutes. Menu names in the Supabase dashboard move around a little over time; the idea stays the same.

## 1. Make the project
1. Go to supabase.com and sign in (GitHub login is fine).
2. **New project** → name it `copper-chat`, pick a region close to you (for you: Stockholm or Frankfurt), choose a strong database password and save it somewhere safe, keep the **Free** plan.
3. Wait a couple of minutes until it finishes setting up.

## 2. Allow anonymous sign-ins
People join chat with just a nickname, no email or password. That uses Supabase's anonymous sign-in.
- **Authentication → Sign In / Providers** (or Settings) → turn on **Allow anonymous sign-ins**.
- Optional, recommended once people use it: **Authentication → Attack Protection → CAPTCHA** (Cloudflare Turnstile) to stop bots creating accounts.

## 3. Create the tables
- **SQL Editor → New query**, paste everything from `supabase/schema.sql`, press **Run**.
- You should see "Success. No rows returned". Run it only once. (If you must start over, delete the project's tables or make a new project.)

## 4. Copy the two public values
- **Project Settings → API** (or **API Keys**).
- Copy the **Project URL** and the **anon / publishable** key.
- Never use or share the **service_role / secret** key. It can bypass every rule.

## 5. Put them in your site
Create `public/js/config.local.js` (it is yours, my zips never contain it):
```js
window.COPPER_SUPABASE = {
  url: 'https://YOUR-PROJECT.supabase.co',
  key: 'YOUR-ANON-OR-PUBLISHABLE-KEY'
};
```
Upload/deploy as usual. The `chat` button in the top right now works.

## 6. Make yourself admin
1. Open Copper → chat → make your profile.
2. Supabase **SQL Editor**, run (use your own username):
   ```sql
   update public.profiles set role = 'admin' where username = 'yourusername';
   ```
3. Reload chat. You now have a crown, can post in #announcements, and can make other people mods (click a name → pick a role). Mods can remove messages, time people out and ban.

## 7. Try it with two people
Open the site in a normal window and a private window. You are two different people.

## Running it
- **Reports:** Table Editor → `reports` (the reported message id and the reason). Messages are in `messages`.
- **Old messages:** to keep the free 500 MB database small, run now and then:
  `delete from public.messages where created_at < now() - interval '30 days';`
- **Free plan pause:** free projects pause after 7 days with no activity. Regular visitors keep it awake. You can un-pause in the dashboard.
- **Limits (free):** about 200 people connected to chat at the same moment, 2 million realtime messages a month, 500 MB database. Chat connections are closed whenever someone leaves the chat page.
- **People's data:** a nickname, color, avatar, bio and their messages. No email. Anyone can erase theirs from chat → their profile → "delete my chat data".
