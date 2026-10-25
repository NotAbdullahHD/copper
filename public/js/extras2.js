/* notes + wallpapers */
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

/* settings row */
function syncMore(){document.querySelectorAll('#s-wall button').forEach(b=>b.classList.toggle('on',b.dataset.v===store.get('wall','none')))}
$('#open-set').addEventListener('click',syncMore);
$('#s-wall').onclick=e=>{const b=e.target.closest('button');if(b){store.set('wall',b.dataset.v);drawWall();syncMore()}};
