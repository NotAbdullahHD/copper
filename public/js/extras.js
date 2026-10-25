/* settings + games (golem hop) */
const gm=$('#gm'),st=$('#st');
$('#gx').onclick=()=>gm.close();$('#sx').onclick=()=>st.close();

/* settings */
function syncSettings(){
  $('#s-eng').value=store.get('engine',DEFAULT_ENGINE);$('#s-se').value=store.get('search','ddg');
  const w=store.get('wax',null);
  document.querySelectorAll('#s-pat button').forEach(b=>b.classList.toggle('on',b.dataset.s===(w===null?'auto':String(w))));
}
$('#open-set').onclick=()=>{syncSettings();st.showModal()};
$('#s-eng').onchange=e=>{store.set('engine',e.target.value);$('#eng').value=e.target.value};
$('#s-se').onchange=e=>store.set('search',e.target.value);
$('#s-pat').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  store.set('wax',b.dataset.s==='auto'?null:+b.dataset.s);paint();syncSettings()};
$('#s-reset').onclick=()=>{links=DEFAULTS.map(([n,u])=>({n,u}));store.set('links',links);render();toast('shortcuts reset')};
$('#s-clear').onclick=()=>{if(confirm('Clear all Copper data in this browser?')){
  Object.keys(localStorage).filter(k=>k.startsWith('copper.')).forEach(k=>localStorage.removeItem(k));location.reload()}};

/* your games: open in a tab, loaded directly (games need to run natively) */
let games=store.get('games',[]);
function drawGames(){
  const el=$('#glist');el.textContent='';
  if(!games.length){el.textContent='none yet';return}
  games.forEach((g,i)=>{const b=document.createElement('button');b.className='g';b.textContent=g.n;
    const x=document.createElement('i');x.textContent='×';
    x.onclick=e=>{e.stopPropagation();games.splice(i,1);store.set('games',games);drawGames()};
    b.append(x);b.onclick=()=>{gm.close();newTab(g.u,'direct')};el.append(b)});
}
$('#ga').onsubmit=e=>{e.preventDefault();const u=normalize($('#gu').value),n=$('#gn').value.trim()||(u&&host(u));
  if(!u){toast('enter a valid link');return}games.push({n,u});store.set('games',games);$('#gn').value=$('#gu').value='';drawGames()};

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
  for(const o of s.obs)if(78>o.x+4&&48<o.x+o.w-4&&s.y<o.h-4){s.dead=true;
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
  if(s.dead){cx.textAlign='center';cx.fillStyle='#f0e9e1';cx.font='22px "Instrument Serif",serif';cx.fillText('you oxidized',cv.width/2,86);
    cx.font='12px "DM Mono",monospace';cx.fillStyle='#8c8279';cx.fillText('tap or space to retry',cv.width/2,108)}
}
function loop(){if(!run)return;if(!s.dead)step();draw();raf=requestAnimationFrame(loop)}
$('#open-games').onclick=()=>{drawGames();$('#best').textContent=store.get('best',0);reset();gm.showModal();run=true;loop()};
gm.addEventListener('close',()=>{run=false;cancelAnimationFrame(raf)});
cv.addEventListener('pointerdown',jump);
addEventListener('keydown',e=>{if(run&&gm.open&&(e.code==='Space'||e.code==='ArrowUp')&&!/INPUT/.test(document.activeElement.tagName)){e.preventDefault();jump()}});
