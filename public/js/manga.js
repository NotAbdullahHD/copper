/* manga page: MangaDex public API, routed through the Copper Lite worker
   (MangaDex sends no CORS headers to other sites and asks that images be proxied). */
const mg=$('#mg'),mgb=$('#mgbody'),MD='https://api.mangadex.org',RATE='&contentRating[]=safe&contentRating[]=suggestive';
const lite=u=>window.COPPER_LITE.replace(/\/$/,'')+'/?url='+encodeURIComponent(u);
async function api(p){
  if(!window.COPPER_LITE)throw new Error('set COPPER_LITE in js/config.js');
  const r=await fetch(lite(MD+p));
  if(!r.ok)throw new Error(r.status===429?'MangaDex is rate limiting, wait a few seconds':'MangaDex error '+r.status);
  return r.json();
}
const h=(t,p={},...k)=>{const e=document.createElement(t);
  for(const[a,v]of Object.entries(p)){if(a==='class')e.className=v;else if(a.startsWith('on'))e[a]=v;else e.setAttribute(a,v)}
  e.append(...k.filter(x=>x!=null));return e};
const mTitle=m=>{const t=m.attributes.title;return t.en||Object.values(t)[0]||'Untitled'};
const cover=(m,sz=256)=>{const r=m.relationships.find(x=>x.type==='cover_art');
  return r&&r.attributes?lite(`https://uploads.mangadex.org/covers/${m.id}/${r.attributes.fileName}.${sz}.jpg`):''};
function empty(t,retry,busy){
  t=/failed to fetch|networkerror|load failed/i.test(t)?"couldn't reach the server. check your connection and try again":t;
  const i=new Image();i.src=$('#golem').src;i.alt='';
  return h('div',{class:'mg-empty'+(busy?' busy':'')},i,h('span',{},t),retry?h('button',{class:'mg-btn',onclick:retry},'try again'):null);
}
const note=(t,retry)=>mgb.replaceChildren(empty(t,retry,t==='loading…'||t==='loading chapters…'||t==='loading chapter…'));
const credit=()=>h('p',{class:'mg-credit'},'data and images from MangaDex');

let tab='popular',query='',cur=null,back=closeManga;
function closeManga(){mg.classList.remove('on')}
$('#open-manga').onclick=()=>{mg.classList.add('on');if(!mgb.childElementCount)showList()};
$('#mg-back').onclick=()=>back();
$('#mg-tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;tab=b.dataset.t;query='';$('#mg-q').value='';
  document.querySelectorAll('#mg-tabs button').forEach(x=>x.classList.toggle('on',x===b));showList()};
let qt;$('#mg-q').oninput=e=>{clearTimeout(qt);qt=setTimeout(()=>{query=e.target.value.trim();showList()},450)};
addEventListener('keydown',e=>{if(e.key==='Escape'&&mg.classList.contains('on')&&!/INPUT/.test(document.activeElement.tagName))back()});

async function showList(){
  back=closeManga;note('loading…');
  const lib=store.get('lib',[]);
  let path;
  if(query)path=`/manga?limit=30&title=${encodeURIComponent(query)}&order[relevance]=desc&hasAvailableChapters=true`;
  else if(tab==='library'){if(!lib.length)return note('nothing saved yet · open a manga and press save');
    path='/manga?limit=100&'+lib.slice(0,100).map(i=>'ids[]='+i).join('&')}
  else path='/manga?limit=30&order['+(tab==='latest'?'latestUploadedChapter':'followedCount')+']=desc&hasAvailableChapters=true&availableTranslatedLanguage[]=en';
  try{
    const d=await api(path+'&includes[]=cover_art'+RATE);
    if(!d.data.length)return note('no results');
    mgb.replaceChildren(h('div',{class:'mg-grid'},...d.data.map(m=>h('button',{class:'mg-card',onclick:()=>openManga(m)},
      h('img',{src:cover(m),loading:'lazy',alt:''}),h('span',{},mTitle(m))))),credit());
  }catch(e){note(e.message,showList)}
}

async function openManga(m){
  track('manga_open');badge('reader');
  back=showList;note('loading chapters…');
  try{
    const seen=new Map();
    for(let o=0;o<500;o+=100){
      const d=await api(`/manga/${m.id}/feed?limit=100&offset=${o}&translatedLanguage[]=en&order[chapter]=asc&includeExternalUrl=0${RATE}`);
      d.data.filter(c=>c.attributes.pages>0).forEach(c=>{const k=c.attributes.chapter??c.id;if(!seen.has(k))seen.set(k,{id:c.id,n:c.attributes.chapter||'oneshot',t:c.attributes.title||''})});
      if(o+100>=d.total)break;
    }
    cur={m,chs:[...seen.values()]};detail();
  }catch(e){note(e.message)}
}
function detail(){
  const {m,chs}=cur,lib=store.get('lib',[]),prog=store.get('prog',{}),last=prog[m.id],
    li=Math.max(0,chs.findIndex(c=>c.id===last)),saved=lib.includes(m.id);
  back=showList;
  const save=h('button',{class:'mg-btn',onclick:()=>{const l=store.get('lib',[]);
    store.set('lib',l.includes(m.id)?l.filter(i=>i!==m.id):[m.id,...l]);detail()}},saved?'saved ✓':'save');
  mgb.replaceChildren(
    h('div',{class:'mg-detail'},h('img',{class:'mg-cover',src:cover(m,512),alt:''}),h('div',{},
      h('h2',{},mTitle(m)),h('p',{class:'mg-desc'},(m.attributes.description.en||'').slice(0,420)),
      h('div',{class:'mg-actions'},chs.length?h('button',{class:'mg-btn pri',onclick:()=>read(li)},last?'continue · ch '+chs[li].n:'start reading'):null,save))),
    chs.length?h('div',{class:'mg-chs'},...chs.map((c,i)=>h('button',{class:'mg-ch'+(i<li&&last?' done':''),onclick:()=>read(i)},'ch '+c.n+(c.t?' · '+c.t:'')))):h('p',{class:'mg-note'},'no english chapters hosted on MangaDex'),
    credit());
}
async function read(i){
  const {m,chs}=cur,c=chs[i];back=detail;note('loading chapter…');
  try{
    const d=await api(`/at-home/server/${c.id}?forcePort443=true`);
    const base=`${d.baseUrl}/data-saver/${d.chapter.hash}/`;
    const p=store.get('prog',{});p[m.id]=c.id;store.set('prog',p);
    const nav=()=>h('div',{class:'mg-nav'},h('button',{class:'mg-btn',onclick:()=>detail()},'chapters'),
      i>0?h('button',{class:'mg-btn',onclick:()=>read(i-1)},'← prev'):null,
      i<chs.length-1?h('button',{class:'mg-btn pri',onclick:()=>read(i+1)},'next →'):null);
    mgb.replaceChildren(nav(),h('div',{class:'mg-read'},...d.chapter.dataSaver.map(f=>h('img',{class:'mg-page',src:lite(base+f),loading:'lazy',alt:''}))),nav(),credit());
    mgb.scrollTop=0;
  }catch(e){note(e.message)}
}
