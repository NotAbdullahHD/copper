/* notes, wallpapers, command bar, golem pals */
/* notes */
const nt=$('#nt'),nta=$('#nta');
$('#nx').onclick=()=>nt.close();
$('#open-notes').onclick=()=>{nta.value=store.get('notes','');nt.showModal();nta.focus()};
nta.oninput=()=>store.set('notes',nta.value);

/* wallpapers: tiny pixel scenes drawn on a canvas, tinted by the current copper stage */
const W=$('#wall'),wx=W.getContext('2d');W.width=192;W.height=108;
const rng=seed=>()=>(seed=seed*16807%2147483647)/2147483647;
const px=(x,y,w,h,c)=>{wx.fillStyle=c;wx.fillRect(x,y,w,h)};
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const WALLS={
  night(r){
    for(let y=0;y<108;y++)px(0,y,192,1,`rgb(${mix([6,9,24],[30,30,62],y/108)})`);
    for(let i=0;i<70;i++)px(r()*192|0,r()*60|0,1,1,`rgba(255,255,255,${.3+r()*.6})`);
    for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++)if(x*x+y*y<=49)px(150+x,22+y,1,1,'#e9e3d3');
    for(let x=0;x<192;x++){px(x,72+Math.round(7*Math.sin(x/17)+4*Math.sin(x/6+1)),1,40,'#0e1128');px(x,86+Math.round(5*Math.sin(x/11+2)),1,30,'#070918')}
  },
  cave(r,ac){
    for(let y=0;y<108;y++)for(let x=0;x<192;x++){const v=16+r()*12|0;px(x,y,1,1,`rgb(${v+5},${v+2},${v})`)}
    for(let i=0;i<34;i++){let x=r()*190|0,y=r()*104|0;for(let k=0;k<3+r()*5;k++){px(x,y,2,2,ac);x+=(r()*3|0)-1;y+=(r()*3|0)-1}}
  },
  desert(r){
    for(let y=0;y<108;y++)px(0,y,192,1,`rgb(${mix([30,14,22],[150,62,28],Math.min(1,y/70))})`);
    for(let y=-9;y<=9;y++)for(let x=-9;x<=9;x++)if(x*x+y*y<=81)px(130+x,62+y,1,1,'#ffb066');
    for(let x=0;x<192;x++){px(x,74+Math.round(5*Math.sin(x/21)+3*Math.sin(x/8)),1,40,'#2a120c');px(x,88+Math.round(4*Math.sin(x/15+1)),1,30,'#1a0b08')}
  }
};
function drawWall(){
  const n=store.get('wall','none');wx.clearRect(0,0,192,108);
  W.style.display=WALLS[n]?'block':'none';
  if(WALLS[n])WALLS[n](rng(7),getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
}
new MutationObserver(drawWall).observe(document.documentElement,{attributes:true,attributeFilter:['data-stage']});
drawWall();

/* golem pals */
const palsEl=$('#pals');let palT=[];
function spawnPals(n){
  palsEl.textContent='';palT.forEach(clearTimeout);palT=[];
  for(let i=0;i<n;i++){
    const im=new Image();im.src=$('#golem').src;im.className='pal';im.alt='';palsEl.append(im);
    let x=60+Math.random()*Math.max(60,innerWidth-120);im.style.left=x+'px';
    const loop=()=>{
      const nx=Math.max(8,Math.min(innerWidth-32,x+Math.random()*600-300)),d=Math.abs(nx-x);
      if(d<30)return void palT.push(setTimeout(loop,1500));
      im.style.setProperty('--f',nx<x?-1:1);im.style.transitionDuration=d/40+'s';im.classList.add('walk');im.style.left=nx+'px';x=nx;
      palT.push(setTimeout(()=>{im.classList.remove('walk');palT.push(setTimeout(loop,1000+Math.random()*3500))},d/40*1000));
    };
    palT.push(setTimeout(loop,i*900+500));
    im.onclick=()=>{im.classList.remove('hop','walk');void im.offsetWidth;im.classList.add('hop');
      toast(['clink','tink tink','*copper noises*','still shiny','oxidizing… slowly'][Math.random()*5|0])};
    im.onanimationend=e=>{if(e.animationName==='phop')im.classList.remove('hop')};
  }
}
const setPals=on=>{store.set('pals',on);spawnPals(on?3:0)};
spawnPals(store.get('pals',true)?3:0);

/* settings rows for the above */
function syncMore(){
  document.querySelectorAll('#s-wall button').forEach(b=>b.classList.toggle('on',b.dataset.v===store.get('wall','none')));
  document.querySelectorAll('#s-pals button').forEach(b=>b.classList.toggle('on',b.dataset.v===(store.get('pals',true)?'1':'0')));
}
$('#open-set').addEventListener('click',syncMore);
$('#s-wall').onclick=e=>{const b=e.target.closest('button');if(b){store.set('wall',b.dataset.v);drawWall();syncMore()}};
$('#s-pals').onclick=e=>{const b=e.target.closest('button');if(b){setPals(b.dataset.v==='1');syncMore()}};

/* command bar (ctrl/cmd + K) */
const cm=$('#cmd'),ci=$('#ci'),cl=$('#cl');let shown=[],sel=0;
const A=(label,hint,fn)=>({label,hint,fn});
function allCmds(){
  const c=[A('Go home','',goHome),A('Play Golem Hop','games',()=>$('#open-games').click()),A('Open notes','',()=>$('#open-notes').click()),A('Open settings','',()=>$('#open-set').click())];
  ['lite','scramjet','uv','direct'].forEach(v=>c.push(A('Engine: '+v,'engine',()=>{store.set('engine',v);$('#eng').value=v;toast('engine · '+v)})));
  Object.keys(SE).forEach(v=>c.push(A('Search with '+v,'search',()=>{store.set('search',v);toast('search · '+v)})));
  ['none','night','cave','desert'].forEach(v=>c.push(A('Wallpaper: '+v,'look',()=>{store.set('wall',v);drawWall()})));
  [['auto',null],['fresh',0],['exposed',1],['weathered',2],['oxidized',3]].forEach(([n,v])=>c.push(A('Copper: '+n,'look',()=>{store.set('wax',v);paint()})));
  c.push(A('Golem pals on','look',()=>setPals(true)),A('Golem pals off','look',()=>setPals(false)));
  links.forEach(l=>c.push(A('Open '+l.n,host(l.u),()=>newTab(l.u))));
  tabs.forEach((t,i)=>c.push(A('Tab: '+t.title,'switch',()=>select(i))));
  return c;
}
function renderCmd(){
  const v=ci.value.trim(),words=v.toLowerCase().split(/\s+/).filter(Boolean);
  shown=allCmds().filter(c=>words.every(w=>c.label.toLowerCase().includes(w))).slice(0,8);
  if(v){const u=normalize(v);shown.unshift(u?A('Open '+u,'link',()=>newTab(u)):A('Search “'+v+'”',SE[store.get('search','ddg')]?store.get('search','ddg'):'ddg',()=>newTab(toUrl(v))))}
  sel=Math.min(sel,shown.length-1);cl.textContent='';
  shown.forEach((c,i)=>{const d=document.createElement('div');d.className='ci'+(i===sel?' sel':'');
    const s=document.createElement('span');s.textContent=c.label;const h=document.createElement('small');h.textContent=c.hint;
    d.append(s,h);d.onclick=()=>runCmd(i);cl.append(d)});
}
function runCmd(i){const c=shown[i];if(!c)return;closeCmd();c.fn()}
function openCmd(){cm.classList.add('on');ci.value='';sel=0;renderCmd();ci.focus()}
function closeCmd(){cm.classList.remove('on');ci.blur()}
$('#open-cmd').onclick=openCmd;
cm.addEventListener('pointerdown',e=>{if(e.target===cm)closeCmd()});
ci.addEventListener('input',()=>{sel=0;renderCmd()});
ci.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();closeCmd()}
  else if(e.key==='ArrowDown'){e.preventDefault();sel=(sel+1)%Math.max(1,shown.length);renderCmd()}
  else if(e.key==='ArrowUp'){e.preventDefault();sel=(sel-1+shown.length)%Math.max(1,shown.length);renderCmd()}
  else if(e.key==='Enter'){e.preventDefault();runCmd(sel)}
});
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();cm.classList.contains('on')?closeCmd():openCmd()}});
