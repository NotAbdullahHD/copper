# changelog

## 1.1.0 — 2026-11-27

The first release. Everything below is in the build that goes out.

### the start page
- One bar that decides for itself: a domain opens as a tab, anything else goes to
  the engine you picked. A badge says which before you press enter.
- Six-column shortcut grid in `localStorage` (click × to remove, + to add), plus
  a row of recent sites.
- Notes, a replayable guide, and badges for mileage.
- The golem: blinks, leans into the bar, and oxidizes from fresh copper to green
  over ten days. Click to wax it back, shift-click to let it age.
- Themes (system/light/dark), nine accents plus a custom colour, four wallpapers.

### browsing
- Four ways to load a site: Fast (Lite worker), Lite, Scramjet v2, Ultraviolet,
  or direct. Unready pages fall back to a second engine instead of dying.
- Real addresses — `/games`, `/settings/general`, `/movies/movie/:id` — with back
  and forward. The dev server now behaves like the deployed SPA fallback.
- Dock latency dot for the Lite worker, red when it stops answering.
- Tab cloaking (Docs, Classroom, Drive, Calendar or your own title/icon), a panic
  key, and a proxy section that points at your own worker or Wisp server.

### pages
- **Games:** a hand-picked library of 46 games with each folder's real logo, plus
  Golem Hop built in. Search, categories, fullscreen, open-in-tab fallback.
- **Manga:** MangaDex popular/latest, search, a saved library and reading
  progress, with retries when MangaDex serves a challenge page.
- **Movies:** films and shows, a shelf from our own movies api (TMDB as the
  fallback), and our own player — server switching, subtitles, resume, PiP,
  keyboard controls, no embeds and no ads.
- **Chat:** channels and DMs on Supabase, with a hidden login domain.

### fixed since v1.0.5
- Deep links answered "Cannot GET /home" on the dev server only.
- The film player's fullscreen box was styled as a class while the markup used an id.
- Manga covers came from the wrong endpoint; the Lite worker handed MangaDex a
  browser user-agent and stalled on its challenge bounce.
- Every asset was re-downloaded on each visit.
- The dock's "join discord" link had no styling at all and sat off the baseline;
  it is now a Discord mark, alignment-checked against its neighbours.

### changed
- The sounds page is gone.
- One wrangler config for the Lite worker (`wrangler.lite.jsonc`); the duplicate
  `worker/wrangler.toml` that would have deployed a differently-named worker is gone.

## 1.0.5 — 2026-11-19

Tagged on `main`: dock tooltips, proxy latency, the url/search badge, and cleaner
chrome around the bar.
