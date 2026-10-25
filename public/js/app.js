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
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),1800)}
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

/* clock */
const tick=()=>$('#clock').textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
tick();setInterval(tick,1000);
