/* proxy engines: Scramjet v2, Ultraviolet, direct. Service workers need https (or localhost). */
const wispUrl=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/wisp/';
const loadScript=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('missing '+src));document.head.append(s)});
const withTimeout=(p,ms,what)=>Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error(what+' timed out after '+ms+'ms')),ms))]);

// A worker that has just been registered is not usable yet: it still has to install, evaluate its
// scripts and activate. Waiting on it with no limit is what turns a worker that never activates
// into a tab that hangs forever with nothing in the console to explain it.
async function activeWorker(reg,ms=15000){
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
  await activeWorker(await navigator.serviceWorker.register('/uv-sw.js',{scope:'/service/'}));
})().catch(e=>{uvP=null;throw e})}
function initSJ(){return sjP??=(async()=>{
  if(!('serviceWorker' in navigator))throw new Error('service workers unavailable (use https)');
  await loadScript('/scramjet/scramjet.js');await loadScript('/controller/controller.api.js');
  const {default:LibcurlClient}=await import('/libcurl/index.mjs');
  const transport=new LibcurlClient({wisp:wispUrl});
  const sw=await activeWorker(await navigator.serviceWorker.register('/sj-sw.js',{scope:'/~/sj/'}));
  const c=new $scramjetController.Controller({serviceworker:sw,transport});
  await c.wait();return c;
})().catch(e=>{sjP=null;throw e})}
const DEFAULT_ENGINE='auto',LITE_NEEDED=4;
let liteState=null; // null = unchecked, else {ok,v}
async function liteCheck(){
  if(!window.COPPER_LITE)return liteState={ok:false,none:true};
  if(liteState)return liteState;
  try{const t=await(await fetch(COPPER_LITE.replace(/\/$/,'')+'/')).text(),m=/ v(\d+)/.exec(t);liteState={ok:!!m&&+m[1]>=LITE_NEEDED,v:m?+m[1]:1}}
  catch{liteState={ok:false,down:true}}
  if(!liteState.ok&&!liteState.none&&!liteState.down)toast('Your Lite Worker is out of date · redeploy copper-lite-worker.js',6000);
  return liteState;
}
let fullDead=false;
$('#open-set').addEventListener('click',async()=>{
  const el=$('#s-lite');el.textContent='checking…';liteState=null;const s=await liteCheck();
  el.textContent=s.none?'not set (js/config.js)':s.down?"can't reach it":s.ok?'up to date · v'+s.v:'outdated · redeploy the worker file';
});
const Engines={
  async auto(t,u){
    if(!fullDead){try{await Engines.scramjet(t,u);return}catch(e){fullDead=true;console.warn('full engine unavailable, using Lite',e)}}
    return window.COPPER_LITE?Engines.lite(t,u):Engines.direct(t,u);
  },
  async lite(t,u){liteCheck();if(!window.COPPER_LITE)throw new Error('set COPPER_LITE in js/config.js');t.f.referrerPolicy='origin';t.f.src=COPPER_LITE.replace(/\/$/,'')+'/?url='+encodeURIComponent(u)+'&pk='+encodeURIComponent(store.get('pkey','`'))},
  async uv(t,u){await initUV();t.f.src=__uv$config.prefix+__uv$config.encodeUrl(u)},
  async scramjet(t,u){const c=await initSJ();(t.sj??=c.createFrame(t.f)).go(u)},
  async direct(t,u){t.f.src=u}
};

// Booting the engine costs about two and a half seconds, and today all of it is spent after the
// person presses Enter — the search box has focus long before that. Starting the boot when they
// reach for the box moves the wait under the time they spend typing instead of in front of them.
// It is wired to focus rather than page load on purpose: someone who only uses the manga or games
// pages never triggers it, so it costs those people nothing. Best effort only — if it fails the
// real navigation runs it again and reports the error properly.
const warmable=()=>{const e=store.get('engine',DEFAULT_ENGINE);return e==='scramjet'||e==='auto'?initSJ:e==='uv'?initUV:null};
let warmed=false;
function warmEarly(){
  if(warmed||!('serviceWorker' in navigator))return;
  const boot=warmable();if(!boot)return;
  warmed=true;boot().catch(()=>{warmed=false});
}
for(const sel of ['#q','#url']){
  const el=document.querySelector(sel);
  if(el){el.addEventListener('focus',warmEarly);el.addEventListener('pointerdown',warmEarly);el.addEventListener('input',warmEarly)}
}
