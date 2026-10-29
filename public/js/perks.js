/* small reasons to come back: streak, badges, tagline, an idle golem */
const BADGES={
  'first-tab':['first tab','Open your first site'],'pinned':['pinned','Pin a tab'],
  'hop50':['hop 50','Score 50 in Golem Hop'],'gamer':['gamer','Play 5 different games'],
  'oxidized':['green at last','Reach the oxidized stage'],'streak3':['three days','Visit 3 days in a row'],
  'streak7':['a whole week','Visit 7 days in a row'],'owl':['night owl','Visit between midnight and 5'],
  'ready':['ready','Set your own panic key'],'reader':['reader','Open a manga'],'cinema':['movie night','Open a movie']
};
function badge(id){const b=store.get('badges',[]);if(b.includes(id)||!BADGES[id])return;b.push(id);store.set('badges',b);toast('badge · '+BADGES[id][0])}

/* streak */
const dayKey=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
(function(){
  const now=new Date(),today=dayKey(now),last=store.get('visit',''),yest=dayKey(new Date(now-864e5));let s=store.get('streak',0);
  if(last!==today){s=last===yest?s+1:1;store.set('streak',s);store.set('visit',today)}
  $('#streak').textContent=s>=2?' · streak '+s:'';
  if(s>=3)badge('streak3');if(s>=7)badge('streak7');if(now.getHours()<5)badge('owl');
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
