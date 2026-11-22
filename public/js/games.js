/* games page: a hand-picked library (games-data.js), a small player, and golem hop */
const gp=$('#gp'),gl=$('#gl');let gcat='all',gq='';
const GSRC={s:'https://rawcdn.githack.com/sslightly/Html5-games/main/',t:'https://rawcdn.githack.com/he-is-talha/html-css-javascript-games/main/'};
const CATS=['all','arcade','action','puzzle','strategy','sandbox','sports','racing','classic','retro'];
const BUILTIN={n:'Golem Hop',cat:'arcade',own:true,e:'🗿',h:24,k:'copper golem jump',run:startHop};

function library(){
  const list=GAMES.map(([n,s,p,c,e,h,t,k])=>({n,u:GSRC[s]+p,cat:c,e,h,tag:t,k:k||''}));
  return [BUILTIN].concat(list);
}
function card(g){
  const b=document.createElement('button');b.className='gcard';b.type='button';b.title=g.n;
  const art=document.createElement('div');art.className='gcover';art.style.setProperty('--h',g.h);
  const ic=document.createElement('i');ic.textContent=g.e;ic.setAttribute('aria-hidden','true');art.append(ic);
  if(g.tag){const t=document.createElement('span');t.className='gbadge';t.textContent=g.tag;art.append(t)}
  const n=document.createElement('b');n.textContent=g.n;
  const s=document.createElement('small');s.textContent=g.own?'built in · by copper':g.cat;
  b.append(art,n,s);
  b.onclick=()=>{
    track('game_play',{game:g.n});
    const pl=new Set(store.get('played',[]));pl.add(g.n);store.set('played',[...pl]);
    if(pl.size>=5)badge('gamer');if(pl.size>=15)badge('gamer15');
    g.run?g.run():playGame(g.n,g.u);
  };
  return b;
}
function match(g){
  const q=gq;
  return (gcat==='all'||g.cat===gcat)&&(!q||g.n.toLowerCase().includes(q)||(g.k||'').includes(q));
}
function drawLib(){
  const all=library(),list=all.filter(match);
  const cards=list.map(card);
  if(!cards.length){const p=document.createElement('p');p.className='gp-empty';p.textContent='nothing here for “'+gq+'”';cards.push(p)}
  gl.replaceChildren(...cards);
  $('#gp-count').textContent=list.length+(list.length===1?' game':' games');
  $('#gp-cats').replaceChildren(...CATS.filter(c=>c==='all'||all.some(g=>g.cat===c)).map(c=>{
    const b=document.createElement('button');b.type='button';b.textContent=c;b.className=c===gcat?'on':'';
    b.onclick=()=>{gcat=c;drawLib()};return b}));
}

let curGame=null,gTimer=0;
function playGame(name,u){
  curGame=u;$('#gpl-t').textContent=name;gp.classList.add('playing');clearTimeout(gTimer);
  const load=document.createElement('div');load.className='gload';
  const t=document.createElement('b');t.textContent=name;
  const spin=document.createElement('span');spin.className='gspin';
  const tip=document.createElement('small');tip.textContent='starting… if it never does, open it in a new tab ↗';
  load.append(spin,t,tip);
  const f=document.createElement('iframe');
  f.allow='fullscreen; autoplay; gamepad; clipboard-write; pointer-lock';
  f.setAttribute('allowfullscreen','');f.title=name;
  if(window.crossOriginIsolated)f.setAttribute('credentialless',''); // Copper's own server isolates the page; third-party games need this to load
  f.addEventListener('load',()=>{clearTimeout(gTimer);load.classList.add('gone')});
  f.src=u;$('#gslot').replaceChildren(load,f);
  // some of these pages take a while on first run; say so instead of showing a spinner forever
  gTimer=setTimeout(()=>{if(!load.classList.contains('gone'))tip.textContent='still loading — big games take a minute the first time. if it stays black, use "new tab ↗" in the bar'},25000);
}
function stopGame(){clearTimeout(gTimer);gp.classList.remove('playing');$('#gslot').replaceChildren();curGame=null}

$('#open-games').onclick=()=>{drawLib();gp.classList.add('on')};
$('#gp-back').onclick=()=>gp.classList.remove('on');
$('#gpl-back').onclick=stopGame;
$('#gpl-fs').onclick=()=>{const f=$('#gslot iframe');f&&f.requestFullscreen&&f.requestFullscreen()};
$('#gpl-ext').onclick=()=>curGame&&window.open(curGame,'_blank','noopener');
$('#gp-q').oninput=e=>{gq=e.target.value.trim().toLowerCase();drawLib()};
addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!gp.classList.contains('on')||gm.open||/INPUT/.test(document.activeElement.tagName))return;
  gp.classList.contains('playing')?stopGame():gp.classList.remove('on');
});
