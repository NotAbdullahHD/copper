/* games page: a hand-picked library (games-data.js), a small player, and golem hop */
const gp=$('#gp'),gl=$('#gl');let gcat='all',gq='';
const SD='https://rawcdn.githack.com/ShadowDevLabs/files/main/';        // game pages (the rawcid githack host serves text/html, with no notice page)
const SDICON='https://cdn.jsdelivr.net/gh/ShadowDevLabs/files@main/';   // the logos living in each folder
const CATS=['all','arcade','action','puzzle','strategy','sandbox','sports','racing','classic'];
const BUILTIN={n:'Golem Hop',cat:'arcade',own:true,h:24,k:'copper golem jump',run:startHop};

function library(){
  return [BUILTIN].concat(GAMES.map(([n,f,c,h,t,k,icon])=>{
    const direct=/^https?:/.test(f);
    return {n,folder:direct?'':f,u:direct?f:SD+f+'/index.html',cat:c,h,tag:t,k:k||'',icon:icon||''};
  }));
}
function initials(n){
  const words=n.replace(/[^\w\s.]/g,'').split(/[\s.]+/).filter(Boolean);
  return (words.length>1?words[0][0]+words[1][0]:n.replace(/[^\w]/g,'').slice(0,2)).toUpperCase();
}
/* a folder keeps its own artwork under one of a few names; walk the list until one loads */
function iconInto(art,g){
  if(!g.folder||!g.icon)return; // folders with no artwork keep their initials tile instead of firing 404s
  const tries=[g.icon,'logo.png','logo.jpg','icon.png', g.folder+'.png', g.folder+'.jpg','splash.png','favicon.png','favicon.ico']
    .filter((v,i,a)=>v&&a.indexOf(v)===i);
  const im=new Image();im.className='gic';im.alt='';im.loading='lazy';im.decoding='async';im.referrerPolicy='no-referrer';
  let at=0;
  im.onload=()=>{
    if(im.naturalWidth<2)return;
    art.classList.add('has');
    if(im.naturalWidth/im.naturalHeight>1.75)art.classList.add('cover'); // wide splash art fills the card
  };
  im.onerror=()=>{if(++at<tries.length)im.src=SDICON+g.folder+'/'+tries[at];else im.remove()};
  im.src=SDICON+g.folder+'/'+tries[0];
  art.append(im);
}
function card(g){
  const b=document.createElement('button');b.className='gcard';b.type='button';b.title=g.n;
  const art=document.createElement('div');art.className='gcover';art.style.setProperty('--h',g.h);
  const tile=document.createElement('span');tile.className='gtile';tile.setAttribute('aria-hidden','true');
  tile.textContent=initials(g.n);art.append(tile);
  iconInto(art,g);
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
