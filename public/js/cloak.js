/* tab cloak + panic key */
const CLOAKS={docs:['Untitled document - Google Docs','docs.google.com'],class:['Classroom','classroom.google.com'],drive:['My Drive - Google Drive','drive.google.com'],cal:['Google Calendar','calendar.google.com']};
const iconEl=document.querySelector('link[rel~="icon"]'),origIcon=iconEl.href,origTitle=document.title;
const iconUrl=v=>!v?origIcon:/^(https?:|data:)/i.test(v)?v:'https://www.google.com/s2/favicons?domain='+encodeURIComponent(v)+'&sz=64';
function cloakNow(){
  const c=store.get('cloak',{k:'off'}),mode=store.get('cmode','always');
  let t=origTitle,i=origIcon;
  if(c.k&&c.k!=='off'&&(mode==='always'||document.hidden)){
    if(c.k==='custom'){t=c.t||origTitle;i=iconUrl(c.i)}else{t=CLOAKS[c.k][0];i=iconUrl(CLOAKS[c.k][1])}
  }
  document.title=t;iconEl.href=i;
}
document.addEventListener('visibilitychange',cloakNow);

/* panic: jump to a safe page, replacing Copper in the history */
const keyLabel=k=>k==='`'?'` (backtick)':k===' '?'space':k;
const panicUrl=()=>normalize(store.get('purl',''))||'https://classroom.google.com';
const panic=()=>location.replace(panicUrl());
const isPanic=e=>e.key===store.get('pkey','`')&&!e.ctrlKey&&!e.metaKey&&!e.altKey;
let recording=false;
function hookPanic(f){try{f.contentWindow.addEventListener('keydown',e=>{if(isPanic(e)){e.preventDefault();panic()}},true)}catch{}} // same-origin frames (Scramjet/UV)
addEventListener('message',e=>{ // Lite frames report the key through the Worker
  if(e.data&&e.data.copperPanic&&[...document.querySelectorAll('#frames iframe')].some(f=>f.contentWindow===e.source))panic();
});
addEventListener('keydown',e=>{
  if(recording){e.preventDefault();e.stopPropagation();recording=false;if(e.key!=='Escape')store.set('pkey',e.key);syncStealth();return}
  if(isPanic(e)){e.preventDefault();panic()}
},true);

/* settings wiring */
function syncStealth(){
  const c=store.get('cloak',{k:'off'});
  $('#s-cloak').value=c.k||'off';$('#cloak-custom').hidden=c.k!=='custom';$('#cc-t').value=c.t||'';$('#cc-i').value=c.i||'';
  document.querySelectorAll('#s-cmode button').forEach(b=>b.classList.toggle('on',b.dataset.v===store.get('cmode','always')));
  $('#pk-set').textContent=recording?'press a key…':keyLabel(store.get('pkey','`'));$('#pk-url').value=store.get('purl','https://classroom.google.com');
  document.querySelectorAll('#s-dots button').forEach(b=>b.classList.toggle('on',b.dataset.v===(store.get('dots',true)?'1':'0')));
}
$('#open-set').addEventListener('click',syncStealth);
$('#s-cloak').onchange=e=>{store.set('cloak',{...store.get('cloak',{}),k:e.target.value});syncStealth();cloakNow()};
['cc-t','cc-i'].forEach(id=>$('#'+id).oninput=()=>{store.set('cloak',{k:'custom',t:$('#cc-t').value,i:$('#cc-i').value});cloakNow()});
$('#s-cmode').onclick=e=>{const b=e.target.closest('button');if(b){store.set('cmode',b.dataset.v);syncStealth();cloakNow()}};
$('#pk-set').onclick=()=>{recording=true;syncStealth()};
$('#pk-url').onchange=e=>{const u=normalize(e.target.value);if(u)store.set('purl',u);else{toast('enter a valid link');syncStealth()}};
cloakNow();
