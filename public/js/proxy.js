/* proxy engines: Lite (a rewriting worker), Scramjet v2, Ultraviolet, direct.
   "auto" is deliberately Lite, not Scramjet. Scramjet has to compile a wasm rewriter and boot a
   worker before the first byte of a page arrives, and on a school laptop that is ten seconds with
   a frozen tab — the exact complaint browsing was getting. Lite answers in one round trip, so it
   leads, and the heavier engines are there when you pick them. */
const wispUrl=window.COPPER_WISP||((location.protocol==='https:'?'wss://':'ws://')+location.host+'/wisp/'); // settings > proxy can override it
const loadScript=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('missing '+src));document.head.append(s)});
const withTimeout=(p,ms,what)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error(what+' timed out after '+ms+'ms')),ms))]);
const liteBase=()=>window.COPPER_LITE?String(window.COPPER_LITE).replace(/\/$/,''):'';

// A worker that has just been registered is not usable yet: it still has to install, evaluate its
// scripts and activate. Waiting on it with no limit is what turns a worker that never activates
// into a tab that hangs forever with nothing in the console to explain it.
async function activeWorker(reg,ms = 9000){
  const w=reg.active||reg.installing||reg.waiting;
  if(!w)throw new Error('service worker did not start');
  if(w.state!=='activated')
    await withTimeout(new Promise(r=>{
      const check=()=>{if(w.state==='activated'){w.removeEventListener('statechange',check);setTimeout(r,0)}};
      w.addEventListener('statechange',check);check();
    }),ms,'worker activation');
  if(!reg.active)throw new Error('service worker never became active');
  return reg.active;
}

let uvP,sjP;
function initUV(){return uvP??=(async()=>{
  if(!('serviceWorker' in navigator))throw new Error('service workers unavailable (use https)');
  await loadScript('/uv/uv.bundle.js');await loadScript('/uvconfig.js');
  const {BareMuxConnection}=await import('/baremux/index.mjs');
  await new BareMuxConnection('/baremux/worker.js').setTransport('/libcurl/index.mjs',[{wisp:wispUrl}]);
  await activeWorker(await navigator.serviceWorker.register('/uv-sw.js',{scope:'/service/',updateViaCache:'none'}));
})().catch(e=>{uvP=null;throw e})}
function initSJ(){return sjP??=(async()=>{
  if(!('serviceWorker' in navigator))throw new Error('service workers unavailable (use https)');
  await loadScript('/scramjet/scramjet.js');await loadScript('/controller/controller.api.js');
  const {default:LibcurlClient}=await import('/libcurl/index.mjs');
  const transport=new LibcurlClient({wisp:wispUrl});
  const sw=await activeWorker(await navigator.serviceWorker.register('/sj-sw.js',{scope:'/~/sj/',updateViaCache:'none'}));
  const c=new $scramjetController.Controller({serviceworker:sw,transport});
  await c.wait();return c;
})().catch(e=>{sjP=null;throw e})}

const DEFAULT_ENGINE='auto';
const Engines={
  // Fast path: the rewriting worker. One request, no engine to boot, and the page is there.
  async auto(t,u){return liteBase()?Engines.lite(t,u):Engines.direct(t,u)},
  // strict-origin-when-cross-origin rather than origin: the worker needs the whole address of the
  // page a navigation starts from to know which site it belongs to (a site moving itself to
  // '/inbox' has nothing else to go on), and it still only sees an origin for the first load.
  async lite(t,u){liteCheck();if(!window.COPPER_LITE)throw new Error('set COPPER_LITE in js/config.js');t.f.referrerPolicy='strict-origin-when-cross-origin';t.f.src=liteBase()+'/?url='+encodeURIComponent(u)+'&pk='+encodeURIComponent(store.get('pkey','`'))},
  // Heavy engines, only when asked for by name: both need a Wisp server and a few megabytes of
  // engine scripts, which a static host does not have.
  async scramjet(t,u){const c=await initSJ();(t.sj??=c.createFrame(t.f)).go(u)},
  async uv(t,u){await initUV();t.f.src=__uv$config.prefix+__uv$config.encodeUrl(u)},
  async direct(t,u){t.f.src=u}
};

let liteState=null; // null = unchecked, else {ok,v}
const LITE_NEEDED=6;
async function liteCheck(){
  if(!window.COPPER_LITE)return liteState={ok:false,none:true};
  if(liteState)return liteState;
  try{const t=await(await fetch(COPPER_LITE.replace(/\/$/,'')+'/')).text(),m=/ v(\d+)/.exec(t);liteState={ok:!!m&&+m[1]>=LITE_NEEDED,v:m?+m[1]:1}}
  catch{liteState={ok:false,down:true}}
  if(!liteState.ok&&!liteState.none&&!liteState.down)toast('the Lite worker is old — redeploy copper-lite-worker.js',6000);
  return liteState;
}

/* Which engines can this host actually serve? A static host (the Worker deployment) has no
   Scramjet bundles, and offering them there is how a tab ended up frozen on an engine that could
   never start. Probe once, then grey out what is missing instead of failing after a click. */
let supportP=null;
function engineSupport(){
  if(supportP)return supportP;
  const has=async src=>{
    try{
      const r=await fetch(src,{cache:'no-store'});
      const ct=(r.headers.get('content-type')||'').toLowerCase();
      return r.ok&&/javascript|ecmascript/.test(ct);
    }catch{return false}
  };
  supportP=(async()=>({
    scramjet:await has('/scramjet/scramjet.js'),
    uv:await has('/uv/uv.bundle.js')
  }))();
  return supportP;
}
function paintEngineSupport(s){
  for(const sel of ['#eng','#s-eng']){
    const el=document.querySelector(sel);if(!el)continue;
    [...el.options].forEach(o=>{
      if(o.value==='scramjet')o.disabled=!s.scramjet;
      if(o.value==='uv')o.disabled=!s.uv;
      o.title=o.disabled?'needs the full engine host (node/server.js)':'';
    });
  }
  const e=store.get('engine',DEFAULT_ENGINE);
  if((e==='scramjet'&&!s.scramjet)||(e==='uv'&&!s.uv)){store.set('engine','auto');const el=$('#eng');if(el)el.value='auto'}
}
engineSupport().then(paintEngineSupport);

if($('#open-set'))$('#open-set').addEventListener('click',async()=>{
  const el=$('#s-lite');if(!el)return;el.textContent='checking…';liteState=null;const s=await liteCheck();
  el.textContent=s.none?'not set (js/config.js)':s.down?"can't reach it":s.ok?'up to date · v'+s.v:'outdated · redeploy the worker file';
});

/* The engine only appears in the address bar once a tab has picked one, so it is obvious which
   path a page came down. */
function paintEngine(t){
  const el=$('#eng-used');if(!el)return;
  const e=t&&t.engine;
  el.textContent=e&&e!=='search'?({auto:'lite',lite:'lite',scramjet:'scramjet',uv:'ultraviolet',direct:'direct'}[e]||e):'';
  el.title=e?'this tab is loading through '+e:'';
}

/* Warm the *bytes* of a heavy engine without running it: a prefetch costs the network while the
   person is still typing and none of the parse cost that used to freeze the box on focus. */
let prefetched=false;
function prefetchEngine(){
  if(prefetched||!('serviceWorker' in navigator))return;
  const e=store.get('engine',DEFAULT_ENGINE);
  if(e!=='scramjet'&&e!=='uv')return;
  prefetched=true;
  const add=(href,as)=>{const l=document.createElement('link');l.rel='prefetch';l.href=href;l.as=as;document.head.append(l)};
  add(e==='uv'?'/uv/uv.bundle.js':'/scramjet/scramjet.js','script');
}
