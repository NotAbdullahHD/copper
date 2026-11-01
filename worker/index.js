// Copper Lite: a Cloudflare Worker that fetches pages for you, strips the headers that block framing,
// and rewrites links/assets so everything flows through the Worker. No Node server, no Wisp needed.
// Good for articles, docs, search, simple sites, and now anything that needs cookies or a socket.
// Heavy web apps still won't run here — they need the full engine (node/server.js).
const PRIVATE = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$)/i;
const DROP = ['x-frame-options','content-security-policy','content-security-policy-report-only','set-cookie','cross-origin-opener-policy','cross-origin-embedder-policy','content-length','content-encoding','strict-transport-security','referrer-policy'];
// Only these sites may use this proxy. Add your own domain here when you get one (no trailing slash).
const ALLOWED = ['https://copper.gghh.workers.dev', 'https://copper-p08m.onrender.com'];
const VERSION = 5; // bump when the browser side needs something new; Copper warns if your deployed copy is older
const SKIP = /^(data:|javascript:|#|mailto:|tel:|blob:|about:)/i;

// Every proxied site shares this worker's origin, so their cookies would land in one jar and
// overwrite each other. Give each site's cookies a short tag from its host and hide the rest.
const tagOf = host => 'c' + [...host].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36) + '_';

// Which site does this request belong to? A page that navigates itself (location.href = '/inbox',
// a reload after pushState) asks for a path on this worker's own origin, and the only thing left
// that remembers the site is the referer of the page doing it.
function refererTarget(req, self) {
  try {
    const ref = new URL(req.headers.get('referer'));
    if (ref.origin !== self.origin) return null;
    const u = ref.searchParams.get('url');
    if (!u) return null;
    const t = new URL(u);
    return /^https?:$/.test(t.protocol) ? t : null;
  } catch { return null; }
}

function refPk(req) {
  try { return new URL(req.headers.get('referer')).searchParams.get('pk'); } catch { return null; }
}

function permitted(req, self) {
  if (req.headers.get('sec-fetch-site') === 'same-origin') return true; // the proxied page loading its own assets
  const origin = req.headers.get('origin') || '';
  let ref = '';
  try { ref = new URL(req.headers.get('referer')).origin; } catch {}
  return [origin, ref].some(o => o === self.origin || ALLOWED.includes(o));
}

async function watchmode(self, req, env, ctx) {
  const hdr = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
  const out = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { ...hdr, ...extra } });
  if (!permitted(req, self)) return out({ error: 'blocked' }, 403);
  if (!env.WATCHMODE_KEY) return out({ error: 'not configured' }, 501);
  const tmdb = (self.searchParams.get('tmdb') || '').replace(/\D/g, '').slice(0, 10);
  const region = (self.searchParams.get('region') || 'US').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'US';
  if (!tmdb) return out({ error: 'missing tmdb id' }, 400);
  const cache = caches.default, ck = new Request(`https://watchmode.cache/${tmdb}/${region}`);
  const hit = await cache.match(ck);
  if (hit) return new Response(hit.body, { headers: hdr });
  const base = env.WATCHMODE_BASE || 'https://api.watchmode.com/v1', key = encodeURIComponent(env.WATCHMODE_KEY);
  let r = await fetch(`${base}/title/movie-${tmdb}/sources/?apiKey=${key}&regions=${region}`);
  if (!r.ok) { // fall back to looking the title up by its TMDB id
    const s = await fetch(`${base}/search/?apiKey=${key}&search_field=tmdb_movie_id&search_value=${tmdb}`).then(x => x.json()).catch(() => ({}));
    const id = s.title_results && s.title_results[0] && s.title_results[0].id;
    if (!id) return out({ sources: [] }, 200, { 'cache-control': 'public, max-age=3600' });
    r = await fetch(`${base}/title/${id}/sources/?apiKey=${key}&regions=${region}`);
  }
  if (!r.ok) return out({ error: 'watchmode ' + r.status }, 502);
  const seen = new Set(), sources = [];
  for (const s of await r.json()) {
    if (!['sub', 'free', 'rent', 'buy'].includes(s.type)) continue;
    const k = s.name + s.type; if (seen.has(k)) continue; seen.add(k);
    sources.push({ name: s.name, type: s.type, url: s.web_url || '' });
  }
  const res = out({ sources }, 200, { 'cache-control': 'public, max-age=86400' });
  ctx.waitUntil(cache.put(ck, res.clone()));
  return res;
}

export default {
  async fetch(req, env, ctx) {
    const self = new URL(req.url);
    // cross-origin-resource-policy on every response, not just documents: a redirect in the middle
    // of a navigation is checked too, and without it Chrome refuses the whole chain in a Copper tab.
    const cors = { 'access-control-allow-origin': '*', 'cross-origin-resource-policy': 'cross-origin' };
    const raw = self.searchParams.get('url');
    if (self.pathname === '/wm') return watchmode(self, req, env || {}, ctx);
    if (!raw) {
      // Nav inside a page: rebuild the site address from the referer instead of answering with
      // plain text, which used to throw the page away and look like the site vanished.
      const from = refererTarget(req, self);
      if (from) {
        let real = null;
        try { real = new URL(self.pathname + self.search, from); } catch {}
        if (real && /^https?:$/.test(real.protocol) && real.href.split('#')[0] !== from.href.split('#')[0]) {
          const k = (self.searchParams.get('pk') || refPk(req) || '').slice(0, 20);
          return new Response(null, { status: 302, headers: { ...cors, 'cache-control': 'no-store',
            location: `${self.origin}/?url=${encodeURIComponent(real.href)}${k ? '&pk=' + encodeURIComponent(k) : ''}` } });
        }
      }
      return new Response('copper lite ok v' + VERSION, { headers: cors });
    }
    if (!permitted(req, self)) return new Response('Copper Lite only works inside Copper.', { status: 403, headers: cors });
    let target;
    try { target = new URL(raw); } catch { return new Response('bad url', { status: 400, headers: cors }); }
    if (target.protocol === 'ws:' || target.protocol === 'wss:') {
      // A page opening a socket (chat, live scores, a stream) used to fail outright, and the site
      // would retry and reload forever. Carry the upgrade through to the site instead.
      const socket = new URL(target.href.replace(/^ws/, 'http'));
      if (PRIVATE.test(socket.hostname)) return new Response('blocked', { status: 403, headers: cors });
      if ((req.headers.get('upgrade') || '').toLowerCase() !== 'websocket') return new Response('expected a socket', { status: 400, headers: cors });
      let upws;
      try { upws = await fetch(socket, { headers: req.headers }); } catch { return new Response('could not reach ' + socket.host, { status: 502, headers: cors }); }
      if (upws.status !== 101 || !upws.webSocket) return new Response('socket refused', { status: 502, headers: cors });
      return new Response(null, { status: 101, webSocket: upws.webSocket });
    }
    if (!/^https?:$/.test(target.protocol) || PRIVATE.test(target.hostname)) return new Response('blocked', { status: 403, headers: cors });

    const P = self.origin;
    const pk = (self.searchParams.get('pk') || '').slice(0, 20);
    const px = u => `${P}/?url=${encodeURIComponent(u)}${pk ? '&pk=' + encodeURIComponent(pk) : ''}`;
    const abs = v => { try { return v && !SKIP.test(v.trim()) ? new URL(v.trim(), target).href : null; } catch { return null; } };
    const rw = v => { const a = abs(v); return a ? px(a) : v; };

    const ck = tagOf(target.hostname);
    const h = { 'user-agent': req.headers.get('user-agent') || 'Mozilla/5.0', accept: req.headers.get('accept') || '*/*',
      'accept-language': req.headers.get('accept-language') || 'en', referer: target.origin + '/' };
    // Only this site's cookies go back to this site.
    const cookieIn = (req.headers.get('cookie') || '').split(';').map(c => c.trim())
      .filter(c => c.startsWith(ck)).map(c => c.slice(ck.length)).join('; ');
    if (cookieIn) h.cookie = cookieIn;
    if (req.headers.get('range')) h.range = req.headers.get('range');
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    if (hasBody && req.headers.get('content-type')) h['content-type'] = req.headers.get('content-type');
    let up;
    try { up = await fetch(target, { method: req.method, body: hasBody ? req.body : undefined, headers: h, redirect: 'manual' }); }
    catch (e) { return new Response('could not reach ' + target.host, { status: 502, headers: cors }); }

    const setCookies = typeof up.headers.getSetCookie === 'function' ? up.headers.getSetCookie() : [];
    const out = new Headers(up.headers);
    DROP.forEach(k => out.delete(k));
    // Hand the site its own cookies back under a per-site name, on this origin, for an iframe -
    // without them a consent wall or a session check never passes and the page reloads itself.
    for (const sc of setCookies) {
      const semi = sc.indexOf(';'), pair = semi === -1 ? sc : sc.slice(0, semi), eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const keep = (semi === -1 ? '' : sc.slice(semi)).split(';').map(a => a.trim())
        .filter(a => a && !/^(domain|path|samesite)=/i.test(a));
      out.append('set-cookie', ck + name + '=' + pair.slice(eq + 1) + (keep.length ? '; ' + keep.join('; ') : '') + '; Path=/; SameSite=None; Secure');
    }
    out.set('access-control-allow-origin', '*');
    out.set('cross-origin-resource-policy', 'cross-origin');
    const loc = up.headers.get('location');
    if (loc && up.status >= 300 && up.status < 400) {
      // A site that redirects to the address it was just asked for makes the browser reload the
      // same proxied URL forever. Notice that and stop, rather than handing the bounce back.
      let same = false;
      try { same = new URL(loc, target).href.split('#')[0] === target.href.split('#')[0]; } catch {}
      if (same) {
        if (self.searchParams.get('rd')) return new Response('this site keeps redirecting to itself', { status: 502, headers: cors });
        const hop = new URL(self); hop.searchParams.set('rd', '1');
        return new Response(null, { status: 302, headers: { ...cors, 'cache-control': 'no-store', location: hop.href } });
      }
      out.set('location', rw(loc)); return new Response(null, { status: up.status, headers: out });
    }

    const type = up.headers.get('content-type') || '';
    if (type.includes('text/css')) {
      let css = await up.text();
      css = css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => (abs(u) ? `url(${q}${rw(u)}${q})` : m))
               .replace(/@import\s+(['"])([^'"]+)\1/g, (m, q, u) => (abs(u) ? `@import ${q}${rw(u)}${q}` : m));
      return new Response(css, { status: up.status, headers: out });
    }
    if (!type.includes('text/html')) return new Response(up.body, { status: up.status, headers: out });

    out.set('cross-origin-embedder-policy', 'credentialless'); // lets Copper's isolated pages frame this
    const attr = (sel, name) => ({ sel, name, handler: { element(el) { const v = el.getAttribute(name); if (v) el.setAttribute(name, rw(v)); } } });
    const srcset = { element(el) { const v = el.getAttribute('srcset'); if (v) el.setAttribute('srcset', v.split(',').map(p => { const [u, ...r] = p.trim().split(/\s+/); return [rw(u), ...r].join(' '); }).join(', ')); } };
    const strip = names => ({ element(el) { names.forEach(n => el.removeAttribute(n)); } });

    const inject = `<script>(()=>{const P=${JSON.stringify(P)},T=${JSON.stringify(target.href)},K=${JSON.stringify(pk)},CK=${JSON.stringify(tagOf(target.hostname))},SX=K?'&pk='+encodeURIComponent(K):'';
document.addEventListener('keydown',e=>{if(K&&e.key===K&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();parent.postMessage({copperPanic:1},'*')}},true);
const R=u=>{try{if(typeof u!=='string')u=String(u);const a=new URL(u,T);if(a.origin===P||!/^https?:/.test(a.protocol))return u;return P+'/?url='+encodeURIComponent(a.href)+SX}catch{return u}};
const f=window.fetch;window.fetch=(i,o)=>f(i instanceof Request?new Request(R(i.url),i):R(i),o);
const x=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){return x.call(this,m,R(u),...r)};
const wo=window.open;window.open=(u,...r)=>wo(u?R(u):u,...r);
addEventListener('message',e=>{if(parent!==window&&e.source===parent&&e.data&&e.data.copperNav){e.data.copperNav==='back'?history.back():history.forward()}});
const say=()=>{if(parent!==window)parent.postMessage({copperPage:{u:T,t:document.title}},'*')};
document.addEventListener('DOMContentLoaded',say);addEventListener('load',say);
const ifd=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'src');if(ifd&&ifd.set)Object.defineProperty(HTMLIFrameElement.prototype,'src',{get:ifd.get,set(v){ifd.set.call(this,v?R(v):v)},configurable:true});
const sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){return sa.call(this,n,this instanceof HTMLIFrameElement&&n==='src'&&v?R(v):v)};
['pushState','replaceState'].forEach(k=>{const o=history[k];history[k]=function(...a){try{return o.apply(this,a)}catch{}}});const go=u=>location.href=R(u);
const dc=Object.getOwnPropertyDescriptor(Document.prototype,'cookie');
if(dc&&dc.get&&dc.set)try{Object.defineProperty(document,'cookie',{configurable:true,
  get(){return (dc.get.call(document)||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(CK)).map(s=>s.slice(CK.length)).join('; ')},
  set(v){const i=v.indexOf('=');if(i>0)dc.set.call(document,CK+v.slice(0,i).trim()+v.slice(i))}})}catch{}
const WS=window.WebSocket;
if(WS){const W2=function(u,p){let q=u;try{const a=new URL(u,T);if(a.origin!==P)q=P.replace(/^http/,'ws')+'/?url='+encodeURIComponent(a.protocol.replace('http','ws')+'//'+a.host+a.pathname+a.search)+SX}catch{}
  return p===undefined?new WS(q):new WS(q,p)};
  ['CONNECTING','OPEN','CLOSING','CLOSED'].forEach(k=>W2[k]=WS[k]);W2.prototype=WS.prototype;window.WebSocket=W2}
document.addEventListener('submit',e=>{const fm=e.target;if((fm.method||'get').toLowerCase()!=='get')return;e.preventDefault();let u=new URL(fm.getAttribute('action')||T,T);if(u.origin===P&&u.searchParams.get('url'))u=new URL(u.searchParams.get('url'));new FormData(fm).forEach((v,k)=>u.searchParams.set(k,v));go(u.href)},true);
})()</script>`;

    // The script has to reach the page before anything else runs, but a document without a <head>
    // never fires that handler, so body is the fallback. Without it the whole page is dead.
    let injected = false;
    const injectInto = el => { if (injected) return; injected = true; el.prepend(inject, { html: true }); };
    const hr = new HTMLRewriter()
      .on('base', { element(el) { el.remove(); } })
      .on('meta[http-equiv]', { element(el) { if (/content-security-policy|refresh/i.test(el.getAttribute('http-equiv'))) el.remove(); } })
      .on('meta[name="referrer"]', { element(el) { el.remove(); } })
      .on('head', { element: injectInto })
      .on('body', { element: injectInto })
      .on('script[integrity], link[integrity]', strip(['integrity']))
      .on('script[nonce]', strip(['nonce']));
    [['a', 'href'], ['area', 'href'], ['link', 'href'], ['img', 'src'], ['script', 'src'], ['iframe', 'src'], ['source', 'src'],
     ['video', 'src'], ['video', 'poster'], ['audio', 'src'], ['embed', 'src'], ['track', 'src'], ['form', 'action'],
     ['object', 'data'], ['use', 'href'], ['image', 'href']]
      .forEach(([t, n]) => hr.on(`${t}[${n}]`, attr(t, n).handler));
    hr.on('img[srcset], source[srcset]', srcset);
    // url(...) inside style="" never went through the rewriter, so those images stayed broken.
    hr.on('[style]', { element(el) {
      const v = el.getAttribute('style');
      if (v && /url\(/i.test(v)) el.setAttribute('style', v.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => (abs(u) ? `url(${q}${rw(u)}${q})` : m)));
    } });
    return hr.transform(new Response(up.body, { status: up.status, headers: out }));
  },
};
