/* first-run guide: a short spotlight tour. Replay it from settings. */
const STEPS=[
  {s:'.brand',t:'welcome to copper',x:'Search, browse, play games and read manga from one start page. This takes ten seconds.'},
  {s:'#sf',t:'search or paste a link',x:'Type a site or a search and press enter. It opens in a tab. Press / anywhere to jump back here.'},
  {s:'#tiles',t:'your shortcuts',x:'Press + to add one, or hover a tile and hit × to remove it. Sites you open show up under the shortcuts, and double-clicking a tab pins it.'},
  {s:'#golem',t:'this is the golem',x:'It slowly oxidizes the longer you use Copper. Click it to change its copper stage and keep it there.'},
  {s:'#streak',t:'your streak',x:'Visit every day to keep the flame lit. It changes color at 3, 10, 30, 100 and 200 days, ending in purple. Tap it to see the ladder.'},
  {s:'.top',t:'more pages',x:'Games, manga, movies and settings live up here.'},
  {s:'#open-set',t:'set up cloak and panic',x:'Settings has seven sections. Cloaking disguises the tab title and icon, and panic jumps to a page of your choice. Worth setting up now.'}
];
let gi=-1,gEl=null;
function gBuild(){
  gEl=document.createElement('div');gEl.id='guide';
  gEl.innerHTML='<div id="g-spot"></div><div id="g-card"><small id="g-n"></small><b id="g-t"></b><p id="g-x"></p><div class="g-row"><button id="g-skip">skip</button><button id="g-next" class="pri">next</button></div></div>';
  document.body.append(gEl);$('#g-skip').onclick=gEnd;$('#g-next').onclick=gNext;
}
function gShow(i){
  const st=STEPS[i],el=document.querySelector(st.s);
  if(!el||!el.offsetParent&&getComputedStyle(el).position!=='fixed'){return i+1>=STEPS.length?gEnd():gShow(i+1)}
  gi=i;const r=el.getBoundingClientRect(),pad=8;
  Object.assign($('#g-spot').style,{left:r.left-pad+'px',top:r.top-pad+'px',width:r.width+pad*2+'px',height:r.height+pad*2+'px'});
  $('#g-n').textContent=(i+1)+' / '+STEPS.length;$('#g-t').textContent=st.t;$('#g-x').textContent=st.x;
  $('#g-next').textContent=i===STEPS.length-1?'done':'next';
  const c=$('#g-card'),cw=Math.min(300,innerWidth-24);c.style.width=cw+'px';
  const ch=c.offsetHeight;let top=r.bottom+pad+14;if(top+ch>innerHeight-12)top=Math.max(12,r.top-pad-14-ch);
  c.style.top=top+'px';c.style.left=Math.min(Math.max(12,r.left+r.width/2-cw/2),innerWidth-cw-12)+'px';
}
const gNext=()=>gi+1>=STEPS.length?gEnd():gShow(gi+1);
function gEnd(){store.set('guided',true);gEl&&gEl.remove();gEl=null;gi=-1}
function guide(){if(gEl)return;if(document.body.classList.contains('viewing'))goHome();gBuild();gShow(0)}
$('#s-tour').onclick=()=>{st.close();guide()};
addEventListener('resize',()=>gEl&&gi>=0&&gShow(gi));
addEventListener('keydown',e=>{
  if(!gEl)return;
  if(e.key==='Escape')gEnd();else if(e.key==='Enter'||e.key==='ArrowRight')gNext();else if(e.key==='ArrowLeft'&&gi>0)gShow(gi-1);else return;
  e.preventDefault();e.stopPropagation();
},true);
if(!store.get('guided',false))setTimeout(guide,900);
