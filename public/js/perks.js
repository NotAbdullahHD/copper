/* small reasons to come back: streak, badges, tagline, an idle golem */
const BADGES={
  'first-tab':['first tab','Open your first site'],'pinned':['pinned','Pin a tab'],
  'hop50':['hop 50','Score 50 in Golem Hop'],'gamer':['gamer','Play 5 different games'],
  'oxidized':['green at last','Reach the oxidized stage'],'streak3':['three days','Visit 3 days in a row'],
  'streak7':['a whole week','Visit 7 days in a row'],'owl':['night owl','Visit between midnight and 5'],
  'ready':['ready','Set your own panic key'],'streak14':['two weeks','Visit 14 days in a row'],'streak30':['a full month','Visit 30 days in a row'],
  'hop150':['hop 150','Score 150 in Golem Hop'],'gamer15':['arcade regular','Play 15 different games'],'tabs100':['hundred sites','Open 100 sites'],'reader':['reader','Open a manga'],'cinema':['movie night','Open a movie']
};
function badge(id){const b=store.get('badges',[]);if(b.includes(id)||!BADGES[id])return;b.push(id);store.set('badges',b);toast('badge · '+BADGES[id][0])}

/* streak: a flame in the corner whose glow changes color the longer you keep it going */
const FLAME=['....#....','....##...','...###...','...####..','..#######','.########','.########','.########','.#######.','..#####..','...###...'];
const FLAME_IN=['.........','.........','.........','.........','.........','....#....','...###...','..#####..','..#####..','...###...','.........'];
const TIERS=[[1,'#d9854f','ember'],[3,'#ffa31f','gold'],[10,'#ff7410','orange'],[30,'#ff4b4b','red'],[100,'#ff3fa4','pink'],[200,'#a35cf6','purple']];
const tierOf=s=>[...TIERS].reverse().find(t=>s>=t[0])||TIERS[0];
const lighten=(hex,k)=>'#'+[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)+(255-parseInt(hex.slice(i,i+2),16))*k).toString(16).padStart(2,'0')).join('');
function flameSvg(c){
  const px=(rows,col)=>rows.map((r,y)=>[...r].map((ch,x)=>ch==='#'?`<rect x="${x}" y="${y}" width="1" height="1" fill="${col}"/>`:'').join('')).join('');
  return `<svg viewBox="0 0 9 11" width="18" height="22" shape-rendering="crispEdges" aria-hidden="true">${px(FLAME,c)}${px(FLAME_IN,lighten(c,.55))}</svg>`;
}
function drawStreak(s){
  const t=tierOf(s),el=$('#streak');el.style.setProperty('--sc',t[1]);el.innerHTML=flameSvg(t[1])+'<span>'+s+'</span>';
  const next=TIERS.find(x=>x[0]>s);
  el.title=s+'-day streak'+(next?' · '+(next[0]-s)+' more day'+(next[0]-s>1?'s':'')+' for '+next[2]:' · top color reached');
  el.onclick=()=>streakInfo(s);
}
let skd=null;
function streakInfo(s){
  if(!skd){skd=document.createElement('dialog');skd.className='wide';skd.id='sk';document.body.append(skd);
    skd.addEventListener('click',e=>{if(e.target===skd||e.target.id==='skx')skd.close()})}
  const t=tierOf(s),next=TIERS.find(x=>x[0]>s),steps=TIERS.slice(1);
  skd.innerHTML=`<div class="dh"><h3>streak</h3><button class="ib" id="skx">×</button></div>
    <div class="sk-big" style="--sc:${t[1]}">${flameSvg(t[1])}<b>${s}</b><span>day${s>1?'s':''}</span></div>
    <p class="hint">Open Copper on consecutive days to keep your streak going. Miss a day and it starts over.${next?' '+(next[0]-s)+' more day'+(next[0]-s>1?'s':'')+' until the flame turns '+next[2]+'.':' You have the top flame.'}</p>
    <div class="ladder">${steps.map(x=>`<div class="${s>=x[0]?'got':''}">${flameSvg(x[1])}<small>${x[0]}d</small></div>`).join('<i></i>')}</div>`;
  skd.showModal();document.activeElement&&document.activeElement.blur();
}
const dayKey=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
(function(){
  const now=new Date(),today=dayKey(now),last=store.get('visit',''),yest=dayKey(new Date(now-864e5));let s=store.get('streak',0);
  if(last!==today){s=last===yest?s+1:1;store.set('streak',s);store.set('visit',today)}
  s=Math.max(1,s);drawStreak(s);
  if(s>=3)badge('streak3');if(s>=7)badge('streak7');if(s>=14)badge('streak14');if(s>=30)badge('streak30');if(now.getHours()<5)badge('owl');
})();

/* a different line under the wordmark each visit */
(function(){
  const hr=new Date().getHours(),pool=['no accounts. all copper.','oxidizing slowly','fresh from the mine','hop, don\'t walk','still shiny','patina builds character',
    'please do not lick the copper','one golem, many tabs','ticks like a clock, not a creeper','a green golem is just an old one','built by hand, pixel by pixel'];
  const timed=hr<5?['why are you awake'] : hr<12?['good morning'] : hr>=22?['good night, then another tab']:[];
  const all=pool.concat(timed,timed);$('#tag').textContent=all[Math.random()*all.length|0];
})();

/* the golem hops on its own now and then */
(function idle(){setTimeout(()=>{if(!document.body.classList.contains('viewing')&&!document.hidden)hop();idle()},25000+Math.random()*30000)})();

/* oxidized badge */
const chkOx=()=>{if(document.documentElement.dataset.stage==='oxidized')badge('oxidized')};
new MutationObserver(chkOx).observe(document.documentElement,{attributes:true,attributeFilter:['data-stage']});chkOx();

/* badge list */
const bd=$('#bd');
function drawBadges(){
  const got=store.get('badges',[]);$('#bdl').replaceChildren(...Object.entries(BADGES).map(([id,[n,d]])=>{
    const row=document.createElement('div');row.className='set'+(got.includes(id)?'':' lock');
    const l=document.createElement('span'),b=document.createElement('b'),sm=document.createElement('small');b.textContent=n;sm.textContent=d;l.append(b,document.createElement('br'),sm);
    const r=document.createElement('span');r.textContent=got.includes(id)?'done':'locked';row.append(l,r);return row}));
}
const badgeCount=()=>'badges '+store.get('badges',[]).length+'/'+Object.keys(BADGES).length;
$('#open-set').addEventListener('click',()=>$('#s-badges').textContent=badgeCount());
$('#s-badges').onclick=()=>{st.close();drawBadges();bd.showModal()};
$('#bdx').onclick=()=>bd.close();
