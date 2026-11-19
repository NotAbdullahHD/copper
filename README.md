# copper

A start page for a browser that opens on a blank tab. Black background, copper
accent, a small golem standing on the search bar. It does the usual start-page
things — search, shortcuts, recent sites — and it also has a proxy, so most
sites open inside the page instead of a new window.

I built it because the new-tab pages I tried either wanted an account, shipped
a feed, or turned into a slow dashboard. This one is one file of HTML, one
stylesheet, and a handful of scripts with no build step.

![copper](docs/screenshot.webp)

## what's in it

- **One bar.** Type `github.com` and it opens as a tab; type `rust ownership`
  and it goes to the search engine you picked. A small badge tells you which
  one it will do before you press enter.
- **Shortcuts** in a six-column grid, stored in `localStorage`. Click the × to
  remove, the + to add.
- **Tabs** with four ways to load a site: the Lite worker, Scramjet,
  Ultraviolet, or plain direct embedding.
- **Pages** for games, manga (MangaDex), movies (TMDB), sound effects and chat
  (Supabase). All optional — an empty key just hides the feature.
- **Oxidation.** The accent moves from fresh copper to green over the first ten
  days. Click the golem to wax it back; shift-click to let it age again.
- Real addresses: `/games`, `/manga`, `/settings/general`, with back and forward
  working.
- A dot in the top right shows the Lite worker's round-trip time, red when it
  stops answering.

## layout

```
public/     the site (HTML, CSS, JS, fonts, the two proxy service workers)
worker/     the Lite proxy: a Cloudflare Worker that fetches and rewrites pages
node/       the full proxy server: Scramjet + Ultraviolet + a Wisp endpoint
supabase/   schema for the optional chat
```

## running it locally

```
npm install
npm start
```

That starts `node/server.js`, which serves `public/` and the full proxy on
`http://localhost:8080` (see the top of the file for the port). The static part
also works from any file server — `npx serve public` is enough if you only want
the start page.

## self-hosting

### 1. the site

Put `public/` on any static host. Cloudflare Workers is what this repo is set up
for — `wrangler.jsonc` uploads `public/` as assets with single-page-app fallback,
so `/games` and `/settings/theme` survive a reload:

```
npx wrangler deploy
```

Vercel works too (`vercel.json` has the same rewrites). The site is static, so a
plain bucket plus a rewrite rule is fine.

### 2. the Lite worker (needed for the proxy)

`worker/index.js` is a Cloudflare Worker that fetches a page, drops the headers
that stop it being framed, and rewrites links so they keep flowing through the
worker. No Wisp server, no Node. Deploy it, then put its address in
`public/js/config.js`:

```js
window.COPPER_LITE = 'https://your-worker.workers.dev';
```

Only sites listed in the worker's allow-list can be proxied through it — look
for the permission check near the top of `worker/index.js`.

### 3. the full proxy (optional)

Scramjet and Ultraviolet need a Node host with WebSockets, because they use a
Wisp server instead of rewriting pages:

```
npm install
npm start
```

Render, Railway, Fly or any box with a real port will do. Serve it over HTTPS;
Wisp will not work over plain HTTP from an HTTPS page.

## configuration

`public/js/config.js` holds the things you might want to change:

| key | what it does |
| --- | --- |
| `COPPER_LITE` | address of your Lite worker |
| `COPPER_TMDB` | TMDB key for the movies page |
| `COPPER_GA` | GA4 measurement id; leave empty for no analytics |
| `COPPER_CONTACT` | shown under settings → credit |

Secrets stay in the worker, not in this file: `WATCHMODE_KEY` (where-to-watch
links) and `FREESOUND_KEY` (sound search) are read from the worker's environment.

## what it does not do

- It is not a VPN. The Lite worker fetches pages for you; it does not hide your
  address from the site you visit, and it only sees sites you allow in it.
- It does not bypass logins or paywalls, and some sites will still refuse to be
  framed no matter what headers are stripped.
- Nothing is stored on a server except chat messages, if you turn chat on.

## credit

Games catalogue from OnlineGames.io, extra games are community web ports. Manga
data from MangaDex, movie data from TMDB, sound previews from Freesound. The
golem, the fonts and everything else are in this repo.
