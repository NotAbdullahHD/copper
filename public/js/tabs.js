/* search, tabs, page viewer */
function normalize(s){s=s.trim();if(!s||/\s/.test(s))return null;
  if(/^https?:\/\//i.test(s))return s;
  if(/^(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i.test(s))return 'https://'+s;return null}
const SE={ddg:'https://duckduckgo.com/html/?q=',bing:'https://www.bing.com/search?q=',brave:'https://search.brave.com/search?q=',google:'https://www.google.com/search?q='};
const toUrl=s=>normalize(s)||(SE[store.get('search','ddg')]||SE.ddg)+encodeURIComponent(s.trim());

const tabs=[],frames=$('#frames'),bar=$('#load');let act=-1,hintT;
function hint(){const h=$('#hint');h.classList.remove('on');clearTimeout(hintT);
  hintT=setTimeout(()=>{h.classList.add('on');setTimeout(()=>h.classList.remove('on'),7000)},3500)}
function drawTabs(){
  const el=$('#tabs');el.textContent='';
  tabs.forEach((t,i)=>{const b=document.createElement('button');b.className='tab'+(i===act?' on':'');
    const s=document.createElement('span');s.textContent=t.title;
    const x=document.createElement('i');x.textContent='×';x.onclick=e=>{e.stopPropagation();closeTab(i)};
    b.append(s,x);b.onclick=()=>select(i);el.append(b)});
  const p=document.createElement('button');p.className='tab plus';p.textContent='+';p.title='New tab';p.onclick=goHome;el.append(p);
  const bk=$('#back');bk.hidden=!tabs.length;bk.textContent='↩ '+tabs.length+(tabs.length>1?' tabs':' tab');
}
async function load(t,u){
  t.u=u;t.title=t.fixed||host(u);$('#url').value=u;
  bar.style.width='0';requestAnimationFrame(()=>bar.style.width='70%');hint();drawTabs();
  const e=t.pre||store.get('engine',DEFAULT_ENGINE);
  if(t.engine&&t.engine!==e){const nf=document.createElement('iframe');nf.referrerPolicy='no-referrer';nf.allow='fullscreen';nf.title='page';
    nf.className=t.f.className;nf.onload=t.f.onload;t.f.replaceWith(nf);t.f=nf;t.sj=null}
  t.engine=e;
  try{await Engines[e](t,u)}catch(err){console.error(err);toast(e+' failed ('+(err.message||err)+')');if(window.COPPER_LITE&&e!=='lite'){t.engine='lite';return Engines.lite(t,u)}t.f.src=u}
}
function newTab(u,pre,title){
  const f=document.createElement('iframe');f.referrerPolicy='no-referrer';f.allow='fullscreen';f.title='page';frames.append(f);
  const t={u,f,title:title||host(u),fixed:title,pre};
  f.onload=()=>{if(t===tabs[act]){bar.style.width='100%';setTimeout(()=>bar.style.width='0',350)}};
  tabs.push(t);select(tabs.length-1);load(t,u);
}
function select(i){act=i;document.body.classList.add('viewing');
  tabs.forEach((t,j)=>t.f.classList.toggle('on',j===i));$('#url').value=tabs[i].u;drawTabs()}
function closeTab(i){tabs[i].f.remove();tabs.splice(i,1);
  if(!tabs.length){act=-1;drawTabs();return goHome()}select(Math.min(i,tabs.length-1))}
function goHome(){document.body.classList.remove('viewing');act=-1;$('#hint').classList.remove('on');drawTabs()}
const openUrl=newTab;

$('#sf').onsubmit=e=>{e.preventDefault();if(q.value.trim()){newTab(toUrl(q.value));q.value='';q.blur()}};
$('#home-btn').onclick=goHome;
$('#eng').value=store.get('engine',DEFAULT_ENGINE);$('#eng').onchange=e=>{store.set('engine',e.target.value);toast('engine · '+e.target.value+' (applies on next load)')};
$('#back').onclick=()=>tabs.length&&select(tabs.length-1);
$('#reload').onclick=()=>act>=0&&load(tabs[act],tabs[act].u);
$('#ext').onclick=$('#hint-ext').onclick=()=>act>=0&&window.open(tabs[act].u,'_blank','noopener');
$('#url').addEventListener('keydown',e=>{if(e.key==='Enter'&&act>=0)load(tabs[act],toUrl(e.target.value))});
addEventListener('keydown',e=>{
  const viewing=document.body.classList.contains('viewing');
  if(e.key==='Escape'&&viewing&&!$('#dlg').open)goHome();
  if(e.key==='/'&&!viewing&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();q.focus()}
});
