# Copper

Black + copper start page: search, shortcuts, tabs, and three ways to load sites.
The accent color oxidizes over time; click the golem to wax it.

## Static hosting (Vercel, Cloudflare Pages, GitHub Pages) + Lite
1. Deploy the repo with `public/` as the output directory (`vercel.json` does this on Vercel).
2. Deploy the Worker (below) and paste its URL into `public/js/config.js`.

### Copper Lite Worker (no git, no command line)
Cloudflare dashboard → Workers & Pages → Create → Hello World → Deploy → Edit code → paste `worker/index.js` → Deploy.
Copy the `https://....workers.dev` URL into `public/js/config.js`.

## Full proxies (Scramjet v2 + Ultraviolet)
Need a Node host with WebSockets: `npm install && npm start`. Serve over HTTPS.

## Layout
`public/` site · `worker/` Lite proxy · `node/server.js` full-proxy server
