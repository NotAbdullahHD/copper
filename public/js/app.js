const $=s=>document.querySelector(s), root=document.documentElement;
const store={get:(k,d)=>{try{return JSON.parse(localStorage.getItem('copper.'+k))??d}catch{return d}},
             set:(k,v)=>{try{localStorage.setItem('copper.'+k,JSON.stringify(v))}catch{}}};

/* patina: copper slowly oxidizes the longer you've had it; click the golem to wax it at a stage */
const STAGES=['fresh','exposed','weathered','oxidized'];
if(!store.get('first'))store.set('first',Date.now());
function stageIdx(){
  const w=store.get('wax',null); if(w!==null)return w;
  const d=(Date.now()-store.get('first'))/864e5;
  return d<2?0:d<5?1:d<10?2:3;
}
function paint(){const s=STAGES[stageIdx()];root.dataset.stage=s;$('#stage').textContent=s+(store.get('wax',null)!==null?' · waxed':'')}
let toastT;function toast(m,ms=1800){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),ms)}
$('#golem').addEventListener('click',e=>{
  if(e.shiftKey){store.set('wax',null);paint();toast('unwaxed · oxidizing naturally');return}
  const n=(stageIdx()+1)%4;store.set('wax',n);paint();toast('waxed · '+STAGES[n]+' (shift+click to unwax)');
});
paint();

/* golem hops while you type */
const q=$('#q'),g=$('#golem');
function hop(){g.classList.remove('hop');void g.offsetWidth;g.classList.add('hop')}
q.addEventListener('input',()=>{if(!g.classList.contains('hop'))hop()});
g.addEventListener('animationend',()=>g.classList.remove('hop'));

/* shortcuts */
const DEFAULTS=[['YouTube','https://www.youtube.com'],['Discord','https://discord.com/app'],['GitHub','https://github.com'],['Wikipedia','https://en.wikipedia.org'],['Twitch','https://www.twitch.tv']];
let links=store.get('links',DEFAULTS.map(([n,u])=>({n,u})));
const host=u=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return u}};
function render(){
  const el=$('#tiles');el.textContent='';
  links.forEach((l,i)=>{
    const a=document.createElement('a');a.className='tile';a.href='#';a.style.animationDelay=i*45+'ms';
    const img=new Image();img.src='https://www.google.com/s2/favicons?domain='+host(l.u)+'&sz=64';img.alt='';
    img.onerror=()=>{const f=document.createElement('div');f.className='fb';f.textContent=l.n[0].toUpperCase();img.replaceWith(f)};
    const s=document.createElement('span');s.textContent=l.n;
    const x=document.createElement('button');x.className='x';x.textContent='×';x.title='Remove';
    x.onclick=e=>{e.preventDefault();e.stopPropagation();links.splice(i,1);store.set('links',links);render()};
    a.append(img,s,x);a.onclick=e=>{e.preventDefault();openUrl(l.u)};el.append(a);
  });
  if(links.length<12){const a=document.createElement('a');a.className='tile add';a.href='#';a.textContent='+';
    a.style.animationDelay=links.length*45+'ms';a.onclick=e=>{e.preventDefault();$('#dn').value='';$('#dlg').showModal();$('#dn').focus()};$('#tiles').append(a)}
}
$('#dc').onclick=()=>$('#dlg').close();
$('#df').onsubmit=()=>{const u=normalize($('#dn').value);if(u){links.push({n:host(u).split('.')[0].replace(/^./,c=>c.toUpperCase()),u});store.set('links',links);render()}};
render();

/* url or search? say which before enter is pressed */
const qmode=$('#qmode');
const isUrl=v=>/^https?:\/\//i.test(v)||/^(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i.test(v);
function paintMode(){
  const v=q.value.trim();if(!v){qmode.hidden=true;return}
  const u=isUrl(v);qmode.hidden=false;qmode.textContent=u?'URL':'SEARCH';qmode.dataset.k=u?'url':'search'}
q.addEventListener('input',paintMode);q.addEventListener('change',paintMode);

/* proxy status: how long the Lite worker takes to answer, red when it stops answering */
const pingEl=$('#ping'),pingNum=pingEl.querySelector('b');let pingBusy=false;
async function pingProxy(){
  if(pingBusy)return;pingBusy=true;
  if(!window.COPPER_LITE){pingEl.dataset.state='off';pingNum.textContent='local';pingBusy=false;return}
  const t0=performance.now(),ac=new AbortController(),to=setTimeout(()=>ac.abort(),6000);
  try{
    const r=await fetch(window.COPPER_LITE.replace(/\/$/,'')+'/',{cache:'no-store',signal:ac.signal});
    const t=await r.text();clearTimeout(to);
    if(!r.ok||!/copper lite/i.test(t))throw 0;
    pingEl.dataset.state='ok';pingNum.textContent=Math.round(performance.now()-t0)+'ms';
  }catch{clearTimeout(to);pingEl.dataset.state='down';pingNum.textContent='down'}
  pingBusy=false;
}
pingProxy();setInterval(()=>{if(!document.hidden)pingProxy()},20000);addEventListener('online',pingProxy);

/* the light that follows the pointer on home: home::before reads these two vars */
const homeEl=$('#home');let glowX=0,glowY=0,glowQueued=0;
addEventListener('pointermove',e=>{glowX=e.clientX;glowY=e.clientY;
  if(!glowQueued)glowQueued=requestAnimationFrame(()=>{glowQueued=0;
    if(homeEl){homeEl.style.setProperty('--px',glowX+'px');homeEl.style.setProperty('--py',glowY+'px')}})},{passive:true});

/* clock */
const tick=()=>$('#clock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
tick();setInterval(tick,1000);
