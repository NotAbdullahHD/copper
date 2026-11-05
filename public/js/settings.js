/* settings: one category at a time */
let spanel='appearance';
function showPanel(p){spanel=p;document.querySelectorAll('#stabs button').forEach(b=>b.classList.toggle('on',b.dataset.p===p));
  document.querySelectorAll('.sp').forEach(s=>s.classList.toggle('on',s.dataset.p===p))}
$('#stabs').onclick=e=>{const b=e.target.closest('button');if(b)showPanel(b.dataset.p)};
$('#open-set').addEventListener('click',()=>showPanel(spanel));
$('#cr-contact').textContent=window.COPPER_CONTACT||'';$('#cr-contact').hidden=!window.COPPER_CONTACT;

/* custom servers */
const okWisp=v=>/^wss?:\/\/[^\s]+$/.test(v)&&!(location.protocol==='https:'&&v.startsWith('ws://'));
const okLite=v=>/^https?:\/\/[^\s]+$/.test(v);
function syncPx(){$('#s-wisp').value=store.get('wisp','');$('#s-liteurl').value=store.get('liteurl','')}
$('#open-set').addEventListener('click',syncPx);
$('#s-wisp').onchange=e=>{const v=e.target.value.trim();if(!v){store.set('wisp','');toast('wisp: using the default · reload to apply',4000);return}
  if(!okWisp(v)){toast(location.protocol==='https:'?'a Wisp address must start with wss:// on this site':'a Wisp address must start with ws:// or wss://',4000);syncPx();return}
  store.set('wisp',v);toast('wisp saved · reload to apply',4000)};
$('#s-liteurl').onchange=e=>{const v=e.target.value.trim().replace(/\/$/,'');if(!v){store.set('liteurl','');toast('lite worker: using the default · reload to apply',4000);return}
  if(!okLite(v)){toast('a Lite Worker address must start with https://',4000);syncPx();return}
  store.set('liteurl',v);toast('lite worker saved · reload to apply',4000)};
$('#s-pxreset').onclick=()=>{store.set('wisp','');store.set('liteurl','');syncPx();toast('defaults restored · reload to apply',4000)};
