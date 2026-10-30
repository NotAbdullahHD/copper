/* background: a pixel dot grid whose dots lean toward the cursor. Kept very faint on purpose. */
const dc=$('#dots'),dxc=dc.getContext('2d'),GAP=28,RAD=210,PULL=24;
let dots=[],mx=-999,my=-999,DW=0,DH=0,acc=[255,123,46];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function readAccent(){const m=/^#?([0-9a-f]{6})$/i.exec(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  if(m)acc=[0,2,4].map(i=>parseInt(m[1].slice(i,i+2),16))}
function dsetup(){
  const r=devicePixelRatio||1;DW=innerWidth;DH=innerHeight;dc.width=DW*r;dc.height=DH*r;dxc.setTransform(r,0,0,r,0,0);
  dots=[];for(let y=GAP/2;y<DH;y+=GAP)for(let x=GAP/2;x<DW;x+=GAP)dots.push({hx:x,hy:y,x,y});
}
function dframe(){
  requestAnimationFrame(dframe);
  if(document.body.classList.contains('viewing')||document.hidden||!store.get('dots',true))return void dxc.clearRect(0,0,DW,DH);
  dxc.clearRect(0,0,DW,DH);
  const near=[];dxc.fillStyle='rgba(255,255,255,.085)';
  for(const d of dots){
    const dx=mx-d.hx,dy=my-d.hy,dist=Math.hypot(dx,dy);let tx=d.hx,ty=d.hy;
    if(!reduce&&dist<RAD){const k=Math.pow(1-dist/RAD,2),pull=k*PULL;tx+=dx/dist*pull;ty+=dy/dist*pull;d.k=k}else d.k=0;
    d.x+=(tx-d.x)*.16;d.y+=(ty-d.y)*.16;
    if(d.k>.02)near.push(d);else dxc.fillRect(d.x-1,d.y-1,2,2);
  }
  for(const d of near){dxc.fillStyle=`rgba(${acc[0]},${acc[1]},${acc[2]},${.085+d.k*.55})`;const s=2+(d.k>.35?1:0)+(d.k>.7?1:0);dxc.fillRect(d.x-s/2,d.y-s/2,s,s)}
}
addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
addEventListener('mouseleave',()=>{mx=my=-999});
addEventListener('resize',dsetup);
new MutationObserver(readAccent).observe(document.documentElement,{attributes:true,attributeFilter:['data-stage']});
readAccent();dsetup();dframe();
$('#s-dots').onclick=e=>{const b=e.target.closest('button');if(b){store.set('dots',b.dataset.v==='1');syncStealth()}};
