// Copper Lite: a Cloudflare Worker that fetches pages for you, strips the headers that block framing,
// and rewrites links/assets so everything flows through the Worker. No Node server, no Wisp needed.
// Good for articles, docs, search, simple sites. No cookies/logins; heavy web apps won't run.
const PRIVATE = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$)/i;
const DROP = ['x-frame-options','content-security-policy','content-security-policy-report-only','set-cookie','cross-origin-opener-policy','cross-origin-embedder-policy','content-length','content-encoding','strict-transport-security'];
const SKIP = /^(data:|javascript:|#|mailto:|tel:|blob:|about:)/i;

export default {
  async fetch(req) {
    const self = new URL(req.url);
    const cors = { 'access-control-allow-origin': '*' };
    const raw = self.searchParams.get('url');
    if (!raw) return new Response('copper lite ok', { headers: cors });
    let target;
    try { target = new URL(raw); } catch { return new Response('bad url', { status: 400, headers: cors }); }
    if (!/^https?:$/.test(target.protocol) || PRIVATE.test(target.hostname)) return new Response('blocked', { status: 403, headers: cors });

    const P = self.origin;
    const px = u => `${P}/?url=${encodeURIComponent(u)}`;
    const abs = v => { try { return v && !SKIP.test(v.trim()) ? new URL(v.trim(), target).href : null; } catch { return null; } };
    const rw = v => { const a = abs(v); return a ? px(a) : v; };

    const h = { 'user-agent': req.headers.get('user-agent') || 'Mozilla/5.0', accept: req.headers.get('accept') || '*/*',
      'accept-language': req.headers.get('accept-language') || 'en', referer: target.origin + '/' };
    if (req.headers.get('range')) h.range = req.headers.get('range');
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    if (hasBody && req.headers.get('content-type')) h['content-type'] = req.headers.get('content-type');
    let up;
    try { up = await fetch(target, { method: req.method, body: hasBody ? req.body : undefined, headers: h, redirect: 'manual' }); }
    catch (e) { return new Response('could not reach ' + target.host, { status: 502, headers: cors }); }

    const out = new Headers(up.headers);
    DROP.forEach(k => out.delete(k));
    out.set('access-control-allow-origin', '*');
    out.set('cross-origin-resource-policy', 'cross-origin');
    const loc = up.headers.get('location');
    if (loc && up.status >= 300 && up.status < 400) { out.set('location', rw(loc)); return new Response(null, { status: up.status, headers: out }); }

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

    const inject = `<script>(()=>{const P=${JSON.stringify(P)},T=${JSON.stringify(target.href)};
const R=u=>{try{if(typeof u!=='string')u=String(u);const a=new URL(u,T);if(a.origin===P||!/^https?:/.test(a.protocol))return u;return P+'/?url='+encodeURIComponent(a.href)}catch{return u}};
const f=window.fetch;window.fetch=(i,o)=>f(i instanceof Request?new Request(R(i.url),i):R(i),o);
const x=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,...r){return x.call(this,m,R(u),...r)};
const wo=window.open;window.open=(u,...r)=>wo(u?R(u):u,...r);
const ifd=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'src');if(ifd&&ifd.set)Object.defineProperty(HTMLIFrameElement.prototype,'src',{get:ifd.get,set(v){ifd.set.call(this,v?R(v):v)},configurable:true});
const sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){return sa.call(this,n,this instanceof HTMLIFrameElement&&n==='src'&&v?R(v):v)};
['pushState','replaceState'].forEach(k=>{const o=history[k];history[k]=function(...a){try{return o.apply(this,a)}catch{}}});
const go=u=>location.href=R(u);
document.addEventListener('submit',e=>{const fm=e.target;if((fm.method||'get').toLowerCase()!=='get')return;e.preventDefault();let u=new URL(fm.getAttribute('action')||T,T);if(u.origin===P&&u.searchParams.get('url'))u=new URL(u.searchParams.get('url'));new FormData(fm).forEach((v,k)=>u.searchParams.set(k,v));go(u.href)},true);
})()</script>`;

    const hr = new HTMLRewriter()
      .on('base', { element(el) { el.remove(); } })
      .on('meta[http-equiv]', { element(el) { if (/content-security-policy|refresh/i.test(el.getAttribute('http-equiv'))) el.remove(); } })
      .on('head', { element(el) { el.prepend(inject, { html: true }); } })
      .on('script[integrity], link[integrity]', strip(['integrity']))
      .on('script[nonce]', strip(['nonce']));
    [['a', 'href'], ['area', 'href'], ['link', 'href'], ['img', 'src'], ['script', 'src'], ['iframe', 'src'], ['source', 'src'],
     ['video', 'src'], ['video', 'poster'], ['audio', 'src'], ['embed', 'src'], ['track', 'src'], ['form', 'action']]
      .forEach(([t, n]) => hr.on(`${t}[${n}]`, attr(t, n).handler));
    hr.on('img[srcset], source[srcset]', srcset);
    return hr.transform(new Response(up.body, { status: up.status, headers: out }));
  },
};
