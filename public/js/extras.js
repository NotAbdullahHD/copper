/* settings + games (golem hop) */
const gm=$('#gm'),st=$('#st');
$('#gx').onclick=()=>gm.close();$('#sx').onclick=()=>st.close();

/* settings */
function syncSettings(){
  $('#s-eng').value=store.get('engine',DEFAULT_ENGINE);$('#s-se').value=store.get('search','bing');
  const w=store.get('wax',null);
  document.querySelectorAll('#s-pat button').forEach(b=>b.classList.toggle('on',b.dataset.s===(w===null?'auto':String(w))));
  paintTheme();paintAccent();
}
$('#open-set').onclick=()=>{syncSettings();st.showModal()};
$('#s-eng').onchange=e=>{store.set('engine',e.target.value);store.set('engmem',{});toast('engine · '+e.target.value+' (applies on next load)')};
// The results page is Copper's own, so switching the engine re-runs the open search at once
// instead of waiting for the next one.
$('#s-se').onchange=e=>{
  store.set('search',e.target.value);
  const t=tabs.find(x=>x.q);
  if(t&&t.q)load(t,SEARCH_MARK+encodeURIComponent(t.q));
};
$('#s-pat').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  store.set('wax',b.dataset.s==='auto'?null:+b.dataset.s);paintPatina();syncSettings()};

/* appearance: light, dark or the device, and the accent every active item uses */
const ACC={slate:'#a9b6ca',ember:'#e6b58c',moss:'#a9c8a5',rose:'#f2a8c2',violet:'#bda6f2',ocean:'#9ad6dc',midnight:'#94a0f5',crimson:'#f394a4'};
function paintTheme(){const t=store.get('theme','dark');
  document.documentElement.dataset.theme=t==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;
  document.querySelectorAll('#s-theme button').forEach(b=>b.classList.toggle('on',b.dataset.v===t))}
function paintAccent(){const a=store.get('accent',null),r=document.documentElement;
  if(a)r.style.setProperty('--accent',a);else r.style.removeProperty('--accent');
  const custom=!!a&&!Object.values(ACC).includes(a);
  document.querySelectorAll('#s-acc .acc').forEach(b=>{const v=b.dataset.v;
    if(v==='custom'&&custom)b.style.setProperty('--c',a);
    b.classList.toggle('on',v==='default'?!a:v==='custom'?custom:ACC[v]===a)});
  const cu=$('#s-acc-custom');if(cu&&a)cu.value=a}
$('#s-theme').onclick=e=>{const b=e.target.closest('button');if(!b)return;store.set('theme',b.dataset.v);paintTheme()};
$('#s-acc').onclick=e=>{const b=e.target.closest('.acc');if(!b||b.dataset.v==='custom')return;
  store.set('accent',b.dataset.v==='default'?null:ACC[b.dataset.v]);paintAccent()};
$('#s-acc-custom').oninput=e=>{store.set('accent',e.target.value);paintAccent()};
matchMedia('(prefers-color-scheme: light)').addEventListener('change',()=>{if(store.get('theme','dark')==='system')paintTheme()});
paintTheme();paintAccent();
$('#s-reset').onclick=()=>{links=DEFAULTS.map(([n,u])=>({n,u}));store.set('links',links);render();toast('shortcuts reset')};
$('#s-clear').onclick=()=>{if(confirm('Clear all Copper data in this browser?')){
  Object.keys(localStorage).filter(k=>k.startsWith('copper.')).forEach(k=>localStorage.removeItem(k));location.reload()}};

/* golem hop */
const cv=$('#gc'),cx=cv.getContext('2d'),spr=$('#golem'),GY=160;
let run=false,raf,s;
const reset=()=>s={y:0,vy:0,obs:[],sc:0,sp:5,next:50,dead:false};
function jump(){if(!run)return;if(s.dead)return reset();if(s.y===0)s.vy=9.5}
function step(){
  s.sc+=s.sp/60;s.sp=5+Math.min(6,s.sc/35);
  s.vy-=.62;s.y=Math.max(0,s.y+s.vy);if(s.y===0)s.vy=0;
  if(--s.next<=0){s.obs.push({x:cv.width,w:16+Math.random()*16|0,h:18+Math.random()*28|0});s.next=(42+Math.random()*50)*5/s.sp|0}
  s.obs.forEach(o=>o.x-=s.sp);s.obs=s.obs.filter(o=>o.x>-40);
  for(const o of s.obs)if(78>o.x+4&&48<o.x+o.w-4&&s.y<o.h-4){s.dead=true;if(s.sc>=50)badge('hop50');if(s.sc>=150)badge('hop150');
    if(s.sc>store.get('best',0)){store.set('best',Math.floor(s.sc));$('#best').textContent=Math.floor(s.sc)}}
}
function draw(){
  const cs=getComputedStyle(document.documentElement),ac=cs.getPropertyValue('--accent'),ln=cs.getPropertyValue('--line');
  cx.clearRect(0,0,cv.width,cv.height);cx.imageSmoothingEnabled=false;
  cx.fillStyle=ln;cx.fillRect(0,GY,cv.width,2);
  cx.fillStyle=ac;s.obs.forEach(o=>cx.fillRect(o.x,GY-o.h,o.w,o.h));
  try{cx.filter=getComputedStyle(spr).filter}catch{}
  cx.drawImage(spr,44,GY-48-s.y,36,48);cx.filter='none';
  cx.font='12px "DM Mono",monospace';cx.fillStyle='#8c8279';cx.textAlign='right';cx.fillText(String(Math.floor(s.sc)).padStart(5,'0'),cv.width-14,24);
  if(s.dead){cx.textAlign='center';cx.fillStyle='#f0e9e1';cx.font='22px "Pixelify Sans",sans-serif';cx.fillText('you oxidized',cv.width/2,86);
    cx.font='12px "DM Mono",monospace';cx.fillStyle='#8c8279';cx.fillText('tap or space to retry',cv.width/2,108)}
}
function loop(){if(!run)return;if(!s.dead)step();draw();raf=requestAnimationFrame(loop)}
function startHop(){$('#best').textContent=store.get('best',0);reset();gm.showModal();run=true;loop()}
gm.addEventListener('close',()=>{run=false;cancelAnimationFrame(raf)});
cv.addEventListener('pointerdown',jump);
addEventListener('keydown',e=>{if(run&&gm.open&&(e.code==='Space'||e.code==='ArrowUp')&&!/INPUT/.test(document.activeElement.tagName)){e.preventDefault();jump()}});
