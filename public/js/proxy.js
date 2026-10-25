/* proxy engines: Scramjet v2, Ultraviolet, direct. Service workers need https (or localhost). */
const wispUrl=(location.protocol==='https:'?'wss://':'ws://')+location.host+'/wisp/';
const loadScript=src=>new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>no(new Error('missing '+src));document.head.append(s)});
async function activeWorker(reg){
  if(reg.active)return reg.active;
  const w=reg.installing||reg.waiting;
  await new Promise(r=>{if(w.state==='activated')return r();w.addEventListener('statechange',()=>w.state==='activated'&&r())});
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
const DEFAULT_ENGINE=window.COPPER_LITE?'lite':'scramjet';
const Engines={
  async lite(t,u){if(!window.COPPER_LITE)throw new Error('set COPPER_LITE in js/config.js');t.f.src=COPPER_LITE.replace(/\/$/,'')+'/?url='+encodeURIComponent(u)},
  async uv(t,u){await initUV();t.f.src=__uv$config.prefix+__uv$config.encodeUrl(u)},
  async scramjet(t,u){const c=await initSJ();(t.sj??=c.createFrame(t.f)).go(u)},
  async direct(t,u){t.f.src=u}
};
