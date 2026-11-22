/* search, tabs (icons, pins, recent), page viewer */
function normalize(s){s=s.trim();if(!s||/\s/.test(s))return null;
  if(/^https?:\/\//i.test(s))return s;
  if(/^(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i.test(s))return 'https://'+s;return null}
const SE={ddg:'https://duckduckgo.com/html/?q=',bing:'https://www.bing.com/search?q=',brave:'https://search.brave.com/search?q=',google:'https://www.google.com/search?q='};
const liteOrigin=()=>window.COPPER_LITE?String(window.COPPER_LITE).replace(/\/$/,''):'';
const toUrl=s=>normalize(s)||(SE[store.get('search','bing')]||SE.bing)+encodeURIComponent(s.trim());
/* Sites remember the engine that last loaded them: a page that only works on Scramjet should not
   be handed back to Lite on the next visit, and a page Lite opens instantly should not pay for a
   heavy engine again. */
const engmem=()=>store.get('engmem',{})||{};
function engineFor(h){return engmem()[h]||store.get('engine',DEFAULT_ENGINE)}
function rememberEngine(h,e){if(!h||!e||e==='search')return;const m=engmem();m[h]=e;const ks=Object.keys(m);if(ks.length>80)delete m[ks[0]];store.set('engmem',m)}
/* A page that never finished is the one case where retrying the same engine is pointless: the tab
   remembers that and ↻ comes back on the other one instead of waiting out the same silence again. */
const ENG_NAME={auto:'fast',lite:'lite',scramjet:'scramjet',uv:'ultraviolet',direct:'direct',search:'search'};
const otherEngine=e=>(e==='lite'||e==='auto')?'scramjet':'lite';

const tabs=[],frames=$('#frames'),bar=$('#load'),golemSrc=$('#golem').src;let act=-1,hintT;
const favSrc=t=>t.fixed?golemSrc:'https://www.google.com/s2/favicons?domain='+host(t.u)+'&sz=32';
const icon=src=>{const i=new Image();i.src=src;i.alt='';i.onerror=()=>i.remove();return i};
const loaded=()=>tabs.filter(t=>t.f).length;

function hint(){const h=$('#hint');h.classList.remove('on');clearTimeout(hintT);
  hintT=setTimeout(()=>{h.classList.add('on');setTimeout(()=>h.classList.remove('on'),7000)},3500)}

/* pins persist; they come back as lazy tabs (no page loads until you click them) */
const savePins=()=>store.set('pins',tabs.filter(t=>t.pinned).map(t=>({u:t.u,title:t.title,fixed:t.fixed,pre:t.pre})));
store.get('pins',[]).forEach(p=>tabs.push({...p,pinned:true,f:null}));
function togglePin(i){
  const t=tabs[i],cur=tabs[act];t.pinned=!t.pinned;
  if(!t.pinned&&!t.f)tabs.splice(i,1);
  tabs.sort((a,b)=>!!b.pinned-!!a.pinned);act=tabs.indexOf(cur);
  savePins();drawTabs();toast(t.pinned?'pinned · stays after you close Copper':'unpinned');if(t.pinned)badge('pinned');
}

/* recent sites (games excluded) */
function addRecent(t){
  if(t.fixed)return;
  const r=store.get('recent',[]).filter(x=>x.u!==t.u);r.unshift({u:t.u,t:t.title});store.set('recent',r.slice(0,8));
}
function chip(label,src,onclick,pin){
  const b=document.createElement('button');b.className='rc'+(pin?' pin':'');
  const s=document.createElement('span');s.textContent=label;b.append(icon(src),s);b.onclick=onclick;return b;
}
function drawRecent(){
  const el=$('#recent');el.textContent='';
  const pins=tabs.map((t,i)=>[t,i]).filter(([t])=>t.pinned);
  const rec=store.get('recent',[]).filter(r=>!tabs.some(t=>t.pinned&&t.u===r.u)).slice(0,6);
  if(!pins.length&&!rec.length)return;
  pins.forEach(([t,i])=>el.append(chip(t.title,favSrc(t),()=>select(i),true)));
  rec.forEach(r=>el.append(chip(r.t,'https://www.google.com/s2/favicons?domain='+host(r.u)+'&sz=32',()=>newTab(r.u))));
  if(rec.length){const c=document.createElement('button');c.className='rc clear';c.textContent='clear';
    c.onclick=()=>{store.set('recent',[]);drawRecent()};el.append(c)}
}

function drawTabs(){
  const el=$('#tabs');el.textContent='';
  tabs.forEach((t,i)=>{
    const b=document.createElement('button');b.className='tab'+(i===act?' on':'')+(t.pinned?' pin':'');
    b.title=t.pinned?t.title+' · double-click to unpin':'double-click to pin';
    const s=document.createElement('span');s.textContent=t.title;
    const x=document.createElement('i');x.textContent='×';x.onclick=e=>{e.stopPropagation();closeTab(i)};
    b.append(icon(favSrc(t)),s,x);
    b.onclick=()=>select(i);b.ondblclick=()=>togglePin(i);
    b.oncontextmenu=e=>{e.preventDefault();togglePin(i)};
    b.onauxclick=e=>{if(e.button===1&&!t.pinned)closeTab(i)};
    el.append(b);
  });
  const p=document.createElement('button');p.className='tab plus';p.textContent='+';p.title='New tab';p.onclick=goHome;el.append(p);
  const n=loaded(),bk=$('#back');bk.hidden=!n;bk.textContent='↩ '+n+(n>1?' tabs':' tab');
  drawRecent();
}

function syncSame(t){ // Scramjet and Ultraviolet pages share our origin, so we can read their title (and UV's real address)
  try{
    const d=t.f.contentDocument;if(!d)return;
    if(d.title&&!t.fixed)t.title=d.title.slice(0,40);
    if(window.__uv$config){const p=t.f.contentWindow.location.pathname,x=__uv$config.prefix;
      if(p.startsWith(x)){const u=__uv$config.decodeUrl(p.slice(x.length));if(/^https?:\/\//.test(u)){t.u=u;if(tabs[act]===t)$('#url').value=u}}}
    drawTabs();
  }catch{}
}
/* A site that reloads itself — a cookie wall it can never satisfy, a bot check, an app waiting
   for something a proxy can't hand it — never settles: every load restarts the page, so it spins
   forever and the tab can never be used. Nothing in Copper noticed that, so the tab just kept
   reloading. Watch what each tab loads; if the same address comes back three times, or a tab eats
   a dozen loads, stop it and say why. Reload (↻) resets this and tries once more. */
const LOOP_HITS=3,LOOP_TOTAL=12,LOOP_MS=15000;
// Scramjet puts a fresh random id in every address it navigates to, so the same page looks like a
// new one each time. Drop that segment before comparing.
const loadKey=src=>String(src||'').replace(/\/~\/sj\/[^/]+\/[^/]+\//,'/~/sj/');
function watchReloads(t){
  if(t.looped)return;
  const now=Date.now(),src=loadKey(t.f&&t.f.src);
  t.loads=(t.loads||[]).filter(x=>now-x.at<LOOP_MS);t.loads.push({at:now,src});
  if(t.loads.filter(x=>x.src===src).length<LOOP_HITS&&t.loads.length<LOOP_TOTAL)return;
  t.looped=true;t.loads=[];
  try{t.f.src='about:blank'}catch{}
  if(t===tabs[act]){toast('this site keeps reloading itself · try ↗ open in a new tab',6000);hint()}
}
function mkFrame(t){
  const f=document.createElement('iframe');f.referrerPolicy='no-referrer';f.allow='fullscreen';f.title='page';frames.append(f);
  f.onload=()=>{t.busy=false;t.failed=false;setReloadIcon(t);watchReloads(t);hookPanic(f);syncSame(t);if(t===tabs[act]){bar.style.width='100%';setTimeout(()=>bar.style.width='0',350)}};
  t.f=f;t.sj=null;
}
function setReloadIcon(t){const b=$('#reload');if(!b)return;const busy=!!(t&&t.busy);b.textContent=busy?'×':'↻';b.title=busy?'Stop loading':'Reload'}
async function load(t,u){
  t.u=u;t.looped=false;t.loads=[];t.title=t.fixed||host(u);$('#url').value=u;addRecent(t);if(t.pinned)savePins();
  bar.style.width='0';requestAnimationFrame(()=>bar.style.width='70%');hint();drawTabs();
  const h=host(u),e=t.pre||engineFor(h);
  if(t.engine&&t.engine!==e){const nf=document.createElement('iframe');nf.referrerPolicy='no-referrer';nf.allow='fullscreen';nf.title='page';
    nf.className=t.f.className;nf.onload=t.f.onload;t.f.replaceWith(nf);t.f=nf;t.sj=null}
  t.engine=e;t.busy=true;t.failed=false;setReloadIcon(t);paintEngine(t);track('site_open',{engine:e});
  // A frame the browser refuses to render (a blocked or refused response) fires no load event at
  // all, so the tab used to sit on a spinner forever. Say so, and let ↻ bring the other engine.
  clearTimeout(t.wd);
  t.wd=setTimeout(()=>{
    if(!t.busy)return;
    t.busy=false;t.failed=true;setReloadIcon(t);
    if(t===tabs[act])toast('not loading on '+ENG_NAME[e]+' · ↻ retries on '+ENG_NAME[otherEngine(e)],7000);
  },14000);
  try{await Engines[e](t,u);rememberEngine(h,e)}
  catch(err){
    console.error(err);t.busy=false;setReloadIcon(t);
    if(e!=='lite'&&e!=='auto'&&window.COPPER_LITE){
      toast(e+' could not start · using Lite',4000);t.engine='lite';t.busy=true;paintEngine(t);setReloadIcon(t);
      try{await Engines.lite(t,u);rememberEngine(h,'lite');return}catch(err2){console.error(err2)}
    }
    toast(e+' failed ('+(err.message||err)+')');
    if(window.COPPER_LITE&&e!=='lite'){t.engine='lite';return Engines.lite(t,u)}t.f.src=u
  }
}
function newTab(u,pre,title){
  badge('first-tab');{const n=store.get('opened',0)+1;store.set('opened',n);if(n>=100)badge('tabs100')}
  const t={u,title:title||host(u),fixed:title,pre};tabs.push(t);mkFrame(t);select(tabs.length-1);load(t,u);
}
function select(i){
  const t=tabs[i];act=i;document.body.classList.add('viewing');
  if(!t.f){mkFrame(t);load(t,t.u)}
  tabs.forEach((x,j)=>x.f&&x.f.classList.toggle('on',j===i));$('#url').value=t.u;paintEngine(t);setReloadIcon(t);drawTabs();
}
function closeTab(i){
  const t=tabs[i];t.f&&t.f.remove();tabs.splice(i,1);
  if(!loaded()){act=-1;drawTabs();return goHome()}
  let j=Math.min(i,tabs.length-1);while(j>=0&&!tabs[j].f)j--;if(j<0)j=tabs.findIndex(x=>x.f);select(j);
}
function goHome(){document.body.classList.remove('viewing');act=-1;$('#hint').classList.remove('on');drawTabs()}
const openUrl=newTab;

$('#sf').onsubmit=e=>{
  e.preventDefault();const v=q.value.trim();if(!v)return;
  const u=normalize(v);
  if(u)newTab(u);else if(typeof srOpen==='function')srOpen(v);else newTab(toUrl(v));
  q.value='';q.blur();
};
$('#home-btn').onclick=goHome;
$('#eng').value=store.get('engine',DEFAULT_ENGINE);
$('#eng').onchange=e=>{store.set('engine',e.target.value);store.set('engmem',{});toast('engine · '+e.target.value+' (applies on next load)')};
$('#back').onclick=()=>{let j=tabs.length-1;while(j>=0&&!tabs[j].f)j--;if(j>=0)select(j)};
function navTab(dir){
  const t=tabs[act];if(!t||!t.f)return;
  if(window.COPPER_LITE&&t.f.src.startsWith(COPPER_LITE.replace(/\/$/,''))){t.f.contentWindow.postMessage({copperNav:dir},'*');return}
  if(t.sj){t.sj[dir]();return}
  try{t.f.contentWindow.history[dir]()}catch{toast('back and forward need Lite, Scramjet or Ultraviolet')}
}
$('#nav-back').onclick=()=>navTab('back');$('#nav-fwd').onclick=()=>navTab('forward');
addEventListener('message',e=>{ // Lite pages report their real address and title
  const d=e.data&&e.data.copperPage;if(!d||!/^https?:\/\//.test(d.u||''))return;
  const t=tabs.find(x=>x.f&&x.f.contentWindow===e.source);if(!t)return;
  t.u=d.u;if(d.t&&!t.fixed)t.title=String(d.t).slice(0,40);if(t.pinned)savePins();if(tabs[act]===t){$('#url').value=d.u;paintEngine(t)}drawTabs();
});
$('#reload').onclick=()=>{
  const t=tabs[act];if(!t)return;
  if(t.busy){t.busy=false;t.failed=false;try{t.f.src='about:blank'}catch{}setReloadIcon(t);toast('stopped');return}
  if(t.failed){
    const alt=otherEngine(t.engine||'lite');t.pre=alt;t.failed=false;
    toast('trying '+ENG_NAME[alt]);load(t,t.u);return;
  }
  load(t,t.u);
};
$('#ext').onclick=$('#hint-ext').onclick=()=>act>=0&&window.open(tabs[act].u,'_blank','noopener');
$('#url').addEventListener('keydown',e=>{
  if(e.key!=='Enter'||act<0)return;
  const v=e.target.value.trim();if(!v)return;
  if(!normalize(v)&&typeof srOpen==='function'){srOpen(v);return}
  load(tabs[act],toUrl(v));
});
addEventListener('keydown',e=>{
  const viewing=document.body.classList.contains('viewing');
  if(e.key==='Escape'&&viewing&&!$('#dlg').open)goHome();
  if(viewing&&e.altKey&&e.key==='ArrowLeft'){e.preventDefault();navTab('back')}
  if(viewing&&e.altKey&&e.key==='ArrowRight'){e.preventDefault();navTab('forward')}
  if(e.key==='/'&&!viewing&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();q.focus()}
});
drawTabs();
