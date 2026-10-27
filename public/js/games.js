/* games page: Golem Hop + a one-file catalog (games-data.js) + an in-page player */
const gp=$('#gp'),gl=$('#gl');let gcat='all',gq='';
const GH={w:'https://www.onlinegames.io/games/',c:'https://cloud.onlinegames.io/games/'},GI='https://www.onlinegames.io/media/posts/';
const CATS=['all','racing','arcade','puzzle','sports','action','sandbox','classic'];

function card(g){
  const b=document.createElement('button');b.className='gcard';let art;
  if(g.own){art=document.createElement('div');art.className='gart';const i=new Image();i.src=$('#golem').src;i.alt='';art.append(i)}
  else{art=new Image();art.src=g.img;art.alt='';art.loading='lazy';art.onerror=()=>art.style.visibility='hidden'}
  const t=document.createElement('b');t.textContent=g.n;
  const s=document.createElement('small');s.textContent=g.own?'built in · by Copper':g.cat;
  b.append(art,t,s);b.onclick=()=>g.run?g.run():playGame(g.n,g.u);return b;
}
function drawLib(){
  const all=[{n:'Golem Hop',cat:'arcade',own:true,run:startHop}].concat(GAMES.map(([n,h,p,i,c])=>({n,cat:c,u:GH[h]+p,img:GI+i})));
  gl.replaceChildren(...all.filter(g=>(gcat==='all'||g.cat===gcat)&&g.n.toLowerCase().includes(gq)).map(card));
  $('#gp-cats').replaceChildren(...CATS.map(c=>{const b=document.createElement('button');b.textContent=c;b.className=c===gcat?'on':'';
    b.onclick=()=>{gcat=c;drawLib()};return b}));
}

let curGame=null;
function playGame(name,u){
  curGame=u;$('#gpl-t').textContent=name;gp.classList.add('playing');
  const f=document.createElement('iframe');f.allow='fullscreen; autoplay; gamepad; clipboard-write';f.title=name;
  if(window.crossOriginIsolated)f.setAttribute('credentialless',''); // Copper's own server isolates the page; third-party games need this to load
  f.src=u;$('#gslot').replaceChildren(f);
}
function stopGame(){gp.classList.remove('playing');$('#gslot').replaceChildren();curGame=null}

$('#open-games').onclick=()=>{drawLib();drawGames();gp.classList.add('on')};
$('#gp-back').onclick=()=>gp.classList.remove('on');
$('#gpl-back').onclick=stopGame;
$('#gpl-fs').onclick=()=>{const f=$('#gslot iframe');f&&f.requestFullscreen&&f.requestFullscreen()};
$('#gpl-ext').onclick=()=>curGame&&window.open(curGame,'_blank','noopener');
$('#gp-q').oninput=e=>{gq=e.target.value.trim().toLowerCase();drawLib()};
addEventListener('keydown',e=>{
  if(e.key!=='Escape'||!gp.classList.contains('on')||gm.open||/INPUT/.test(document.activeElement.tagName))return;
  gp.classList.contains('playing')?stopGame():gp.classList.remove('on');
});
