/* sound effects: a search over Freesound (through the Lite worker, CC0 and CC BY only) with Openverse as a fallback,
   a few basics Copper makes itself, and your own uploads kept in your browser. Every result shows its creator and license. */
const sb=$('#sb'),sbb=$('#sbbody');
let actx=null,master=null,sbq='',webRes=[],webNote='',webSrc='';const live=new Set();
const seq=(arr,step,fn)=>arr.forEach((f,i)=>fn(f,i*step));
const sbVol=()=>store.get('sbvol',80)/100;
function ac(){
  if(!actx){actx=new(window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.connect(actx.destination)}
  master.gain.value=sbVol();if(actx.state==='suspended')actx.resume();return actx;
}
function tone(f,d,o={}){const c=ac(),t=c.currentTime+(o.at||0),os=c.createOscillator(),g=c.createGain();os.type=o.type||'sine';os.frequency.setValueAtTime(f,t);
  if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t+d);g.gain.setValueAtTime(o.gain||.5,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);os.connect(g).connect(master);os.start(t);os.stop(t+d+.03)}
function noise(d,o={}){const c=ac(),t=c.currentTime+(o.at||0),b=c.createBuffer(1,Math.max(1,c.sampleRate*d|0),c.sampleRate),x=b.getChannelData(0);
  for(let i=0;i<x.length;i++)x[i]=Math.random()*2-1;const s=c.createBufferSource();s.buffer=b;let n=s;const g=c.createGain();g.gain.setValueAtTime(o.gain||.4,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
  for(const[k,ty]of[['hp','highpass'],['lp','lowpass']])if(o[k]){const f=c.createBiquadFilter();f.type=ty;f.frequency.value=o[k];n.connect(f);n=f}
  n.connect(g).connect(master);s.start(t)}
function rise(d){
  const c=ac(),t=c.currentTime,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();
  o.type='sawtooth';o.frequency.setValueAtTime(120,t);o.frequency.exponentialRampToValueAtTime(1400,t+d);
  f.type='lowpass';f.frequency.setValueAtTime(300,t);f.frequency.exponentialRampToValueAtTime(5000,t+d);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.35,t+d*.95);g.gain.exponentialRampToValueAtTime(.0001,t+d+.05);
  o.connect(f).connect(g).connect(master);o.start(t);o.stop(t+d+.08);
}
const BUILTIN=[
  ['whoosh',()=>noise(.7,{lp:2500,gain:.5})],
  ['swish',()=>noise(.25,{hp:1500,lp:6000,gain:.4})],
  ['riser',()=>rise(1.6)],
  ['impact',()=>{tone(70,.7,{to:25,gain:.95});noise(.35,{lp:1800,gain:.6});noise(.08,{hp:4000,gain:.3})}],
  ['boom',()=>{tone(90,.9,{to:28,gain:.9});noise(.25,{lp:400,gain:.5})}],
  ['kick',()=>tone(150,.25,{to:40,gain:.9})],
  ['snare',()=>{noise(.18,{hp:1000,gain:.6});tone(200,.1,{type:'triangle',gain:.4})}],
  ['clap',()=>{noise(.05,{hp:1200,gain:.6});noise(.05,{hp:1200,gain:.6,at:.03});noise(.2,{hp:1200,gain:.5,at:.06})}],
  ['click',()=>{noise(.015,{hp:2000,gain:.6});tone(1800,.02,{type:'square',gain:.12})}],
  ['glitch',()=>{for(let i=0;i<7;i++)tone(200+Math.random()*1800,.04,{type:'square',gain:.14,at:i*.045})}],
  ['ding',()=>tone(1320,.6,{gain:.4})],
  ['notify',()=>{tone(1175,.15,{gain:.3});tone(1568,.35,{gain:.3,at:.14})}],
  ['bell',()=>{tone(880,1.2,{gain:.4});tone(1760,.8,{gain:.15})}],
  ['error',()=>{tone(220,.12,{type:'square',gain:.25});tone(165,.25,{type:'square',gain:.25,at:.14})}],
  ['power up',()=>seq([262,330,392,523],.08,(f,at)=>tone(f,.12,{type:'square',gain:.2,at}))],
  ['power down',()=>seq([523,392,330,262],.09,(f,at)=>tone(f,.14,{type:'square',gain:.2,at}))],
  ['alarm',()=>seq([880,660,880,660],.18,(f,at)=>tone(f,.17,{type:'square',gain:.2,at}))],
  ['laser',()=>tone(1500,.3,{type:'sawtooth',to:120,gain:.25})],
  ['zap',()=>{noise(.2,{hp:1500,gain:.4});tone(900,.2,{type:'square',to:200,gain:.15})}],
  ['pop',()=>tone(300,.08,{to:900,gain:.55})],
  ['coin',()=>{tone(988,.08,{type:'square',gain:.18});tone(1319,.35,{type:'square',gain:.18,at:.08})}],
  ['copper clink',()=>{tone(2200,.18,{gain:.3});tone(3300,.12,{gain:.15,at:.03});tone(1480,.4,{gain:.12,at:.05})}]
];
const SPK='<svg viewBox="0 0 9 9" width="22" height="22" shape-rendering="crispEdges" fill="currentColor"><path d="M0 3h2l3-3v9L2 6H0z"/><rect x="6" y="3" width="1" height="3"/><rect x="8" y="2" width="1" height="5"/></svg>';

/* your sounds live in IndexedDB so they survive reloads */
const idb=()=>new Promise((ok,no)=>{const r=indexedDB.open('copper',1);r.onupgradeneeded=()=>r.result.createObjectStore('sounds',{keyPath:'id',autoIncrement:true});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const idbDo=(mode,fn)=>idb().then(d=>new Promise((ok,no)=>{const t=d.transaction('sounds',mode),q=fn(t.objectStore('sounds'));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)}));
const mySounds=()=>idbDo('readonly',s=>s.getAll()).catch(()=>[]);

function play(url){
  ac();const a=new Audio(url);a.volume=sbVol();live.add(a);a.onended=()=>live.delete(a);
  a.play().catch(()=>{live.delete(a);toast("that one wouldn't play")});
}
function snd(name,fn,opt={}){
  const b=document.createElement('button');b.className='snd'+(opt.add?' add':'');b.innerHTML=opt.add?'<span style="font-size:20px">+</span>':SPK;
  const t=document.createElement('span');t.textContent=name;b.append(t);
  if(opt.sub){const s=document.createElement('small');s.textContent=opt.sub;b.append(s)}
  if(opt.link){const a=document.createElement('a');a.className='lnk';a.href=opt.link;a.target='_blank';a.rel='noopener';a.textContent='↗';a.title='open the original page (download the full-quality file there)';a.onclick=e=>e.stopPropagation();b.append(a)}
  if(opt.del){const x=document.createElement('i');x.className='x';x.textContent='×';x.title='Remove';x.onclick=e=>{e.stopPropagation();opt.del()};b.append(x)}
  b.onclick=()=>{fn();if(!opt.add){b.classList.add('on');setTimeout(()=>b.classList.remove('on'),180)}};return b;
}
function sec(title,note,items){
  const s=document.createElement('section');s.className='sb-sec';const h4=document.createElement('h4');h4.textContent=title;
  if(note){const sm=document.createElement('small');sm.textContent=note;h4.append(sm)}
  const g=document.createElement('div');g.className='sb-grid';g.append(...items);s.append(h4,g);return s;
}
const CHIPS=['whoosh','swoosh','impact','hit','riser','transition','glitch','click','ui','notification','camera','typing','footsteps','door','explosion','glass','ambience','cinematic','sparkle','swipe'];
async function drawSb(){
  const q=sbq.toLowerCase(),has=n=>n.toLowerCase().includes(q),mine=await mySounds();
  const chips=document.createElement('div');chips.className='seg chips';
  CHIPS.forEach(c=>{const b=document.createElement('button');b.textContent=c;b.onclick=()=>{sbq=c;$('#sb-q').value=c;webSearch(c)};chips.append(b)});
  const parts=[chips];
  if(webRes.length||webNote){
    const s=sec('sound effects',webSrc?'from '+webSrc+' · free to use, credit shown · ↗ opens the original':'',webRes.map(r=>snd(r.title||'untitled',()=>play(r.url),{sub:r.sub,link:r.page})));
    if(webNote){const p=document.createElement('p');p.className='hint';p.textContent=webNote;s.append(p)}parts.push(s);
  }
  const bi=BUILTIN.filter(([n])=>has(n)).map(([n,fn])=>snd(n,()=>{ac();fn()}));
  if(bi.length)parts.push(sec('basics','made by Copper',bi));
  parts.push(sec('your sounds','kept in this browser',[...mine.filter(m=>has(m.name)).map(m=>snd(m.name,()=>play(URL.createObjectURL(m.blob)),{del:async()=>{await idbDo('readwrite',s=>s.delete(m.id));drawSb()}})),
    snd('add a sound',()=>$('#sb-file').click(),{add:true})]));
  sbb.replaceChildren(...parts);
}
async function readJson(r,who){
  const t=await r.text();let d=null;try{d=JSON.parse(t)}catch{}
  if(r.status===429)throw Object.assign(new Error(who+' is rate limiting · try again in a minute'),{rate:true});
  if(!r.ok||!d||d.error)throw new Error((d&&d.error)||who+' error '+r.status);return d;
}
async function fsSearch(q){
  if(!window.COPPER_LITE)throw new Error('no worker');
  const r=await fetch(COPPER_LITE.replace(/\/$/,'')+'/snd?q='+encodeURIComponent(q),{headers:{accept:'application/json'}});
  const d=await readJson(r,'Freesound');
  return d.results.map(x=>({title:x.name,sub:x.by+' · '+x.license+' · '+x.dur+'s',url:x.url,page:x.page}));
}
async function ovSearch(q){
  const u='https://api.openverse.org/v1/audio/?category=sound_effect&mature=false&page_size=30&q='+encodeURIComponent(q);
  let r;try{r=await fetch(u,{headers:{accept:'application/json'}})}catch{
    if(!window.COPPER_LITE)throw new Error("couldn't reach the sound search");r=await fetch(lite(u),{headers:{accept:'application/json'}})}
  const d=await readJson(r,'Openverse');
  return(d.results||[]).filter(x=>x.url&&(!x.duration||x.duration<=20000)).map(x=>({title:x.title||'untitled',url:x.url,page:x.foreign_landing_url,
    sub:(x.creator||'unknown')+' · '+String(x.license||'').toUpperCase()+(x.license_version?' '+x.license_version:'')}));
}
async function webSearch(q){
  webRes=[];webNote='searching…';webSrc='';drawSb();
  try{
    try{webRes=await fsSearch(q);webSrc='Freesound'}
    catch(e){if(e.rate)throw e;webRes=await ovSearch(q);webSrc='Openverse'} // not configured or unreachable: fall back
    webNote=webRes.length?'':'no sound effects found for that';
  }catch(e){webRes=[];webNote=e.message}
  drawSb();
}
function stopAll(){live.forEach(a=>a.pause());live.clear();if(actx){actx.close().catch(()=>{});actx=null;master=null}}

$('#open-sounds').onclick=()=>{sb.classList.add('on');$('#sb-vol').value=store.get('sbvol',80);drawSb()};
$('#sb-back').onclick=()=>{stopAll();sb.classList.remove('on')};
$('#sb-stop').onclick=stopAll;
$('#sb-vol').oninput=e=>{store.set('sbvol',+e.target.value);if(master)master.gain.value=sbVol();live.forEach(a=>a.volume=sbVol())};
$('#sb-q').oninput=e=>{sbq=e.target.value.trim();drawSb()};
$('#sb-q').addEventListener('keydown',e=>{if(e.key==='Enter'&&sbq)webSearch(sbq)});
$('#sb-file').onchange=async e=>{
  let n=0;for(const f of e.target.files){if(f.size>8*1024*1024){toast(f.name+' is over 8 MB');continue}
    try{await idbDo('readwrite',s=>s.add({name:f.name.replace(/\.[^.]+$/,'').slice(0,40),blob:f}));n++}catch{toast("couldn't save that here (private window?)")}}
  e.target.value='';if(n)toast(n+' sound'+(n>1?'s':'')+' added');drawSb();
};
addEventListener('keydown',e=>{if(e.key==='Escape'&&sb.classList.contains('on')&&!/INPUT/.test(document.activeElement.tagName))$('#sb-back').click()});
