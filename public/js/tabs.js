/* search, tabs (icons, pins, recent), page viewer */
function normalize(s){s=s.trim();if(!s||/\s/.test(s))return null;
  if(/^https?:\/\//i.test(s))return s;
  if(/^(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i.test(s))return 'https://'+s;return null}
const SE={ddg:'https://duckduckgo.com/html/?q=',bing:'https://www.bing.com/search?q=',brave:'https://search.brave.com/search?q=',google:'https://www.google.com/search?q='};
const toUrl=s=>normalize(s)||(SE[store.get('search','ddg')]||SE.ddg)+encodeURIComponent(s.trim());

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
  savePins();drawTabs();toast(t.pinned?'pinned · stays after you close Copper':'unpinned');
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

function mkFrame(t){
  const f=document.createElement('iframe');f.referrerPolicy='no-referrer';f.allow='fullscreen';f.title='page';frames.append(f);
  f.onload=()=>{if(t===tabs[act]){bar.style.width='100%';setTimeout(()=>bar.style.width='0',350)}};
  t.f=f;t.sj=null;
}
async function load(t,u){
  t.u=u;t.title=t.fixed||host(u);$('#url').value=u;addRecent(t);if(t.pinned)savePins();
  bar.style.width='0';requestAnimationFrame(()=>bar.style.width='70%');hint();drawTabs();
  const e=t.pre||store.get('engine',DEFAULT_ENGINE);
  if(t.engine&&t.engine!==e){const nf=document.createElement('iframe');nf.referrerPolicy='no-referrer';nf.allow='fullscreen';nf.title='page';
    nf.className=t.f.className;nf.onload=t.f.onload;t.f.replaceWith(nf);t.f=nf;t.sj=null}
  t.engine=e;track('site_open',{engine:e});
  try{await Engines[e](t,u)}catch(err){console.error(err);toast(e+' failed ('+(err.message||err)+')');
    if(window.COPPER_LITE&&e!=='lite'){t.engine='lite';return Engines.lite(t,u)}t.f.src=u}
}
function newTab(u,pre,title){
  const t={u,title:title||host(u),fixed:title,pre};tabs.push(t);mkFrame(t);select(tabs.length-1);load(t,u);
}
function select(i){
  const t=tabs[i];act=i;document.body.classList.add('viewing');
  if(!t.f){mkFrame(t);load(t,t.u)}
  tabs.forEach((x,j)=>x.f&&x.f.classList.toggle('on',j===i));$('#url').value=t.u;drawTabs();
}
function closeTab(i){
  const t=tabs[i];t.f&&t.f.remove();tabs.splice(i,1);
  if(!loaded()){act=-1;drawTabs();return goHome()}
  let j=Math.min(i,tabs.length-1);while(j>=0&&!tabs[j].f)j--;if(j<0)j=tabs.findIndex(x=>x.f);select(j);
}
function goHome(){document.body.classList.remove('viewing');act=-1;$('#hint').classList.remove('on');drawTabs()}
const openUrl=newTab;

$('#sf').onsubmit=e=>{e.preventDefault();if(q.value.trim()){newTab(toUrl(q.value));q.value='';q.blur()}};
$('#home-btn').onclick=goHome;
$('#eng').value=store.get('engine',DEFAULT_ENGINE);
$('#eng').onchange=e=>{store.set('engine',e.target.value);toast('engine · '+e.target.value+' (applies on next load)')};
$('#back').onclick=()=>{let j=tabs.length-1;while(j>=0&&!tabs[j].f)j--;if(j>=0)select(j)};
$('#reload').onclick=()=>act>=0&&load(tabs[act],tabs[act].u);
$('#ext').onclick=$('#hint-ext').onclick=()=>act>=0&&window.open(tabs[act].u,'_blank','noopener');
$('#url').addEventListener('keydown',e=>{if(e.key==='Enter'&&act>=0)load(tabs[act],toUrl(e.target.value))});
addEventListener('keydown',e=>{
  const viewing=document.body.classList.contains('viewing');
  if(e.key==='Escape'&&viewing&&!$('#dlg').open)goHome();
  if(e.key==='/'&&!viewing&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();q.focus()}
});
drawTabs();
