/* movies page. TMDB for the catalogue, an embed player for watching.
   two addresses: /movies for the shelves, /movies/movie/<id> for one film. */
const mv=$('#mv'),mvb=$('#mvbody'),TM='https://api.themoviedb.org/3',TI='https://image.tmdb.org/t/p/',KEY=window.COPPER_TMDB||'';
let mq='',mback=closeMovies,mcurId=null,mPlayId=null;
const mNote=(t,retry)=>mvb.replaceChildren(empty(t,retry,t==='loading…'));
function closeMovies(){mv.classList.remove('on')}
window.mvPath=()=>mcurId?'/movies/movie/'+mcurId:'/movies';
async function tmdb(path){
  let r;try{r=await fetch(TM+path+(path.includes('?')?'&':'?')+'api_key='+encodeURIComponent(KEY),{headers:{accept:'application/json'}})}catch{throw new Error('TMDB did not answer. the key or the connection.')}
  if(r.status===401)throw new Error('TMDB rejected the key in config.js');
  const t=await r.text();let d=null;try{d=JSON.parse(t)}catch{}
  if(!r.ok||!d)throw new Error(r.ok?'TMDB sent something unexpected':'TMDB error '+r.status);
  return d;
}
/* players. each one takes a TMDB id and answers with a page that can be framed. */
function accentHex(){
  const v=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),m=/^#?([0-9a-f]{6})$/i.exec(v);
  return m?m[1]:'ff7b2e';
}
const SRC=[
  ['vidlink',id=>'https://vidlink.pro/movie/'+id+'?autoplay=true&primaryColor='+accentHex()],
  ['cinesrc',id=>'https://cinesrc.st/embed/movie/'+id+'?autoplay=true&color=%23'+accentHex()],
  ['vidfast',id=>'https://vidfast.pro/movie/'+id+'?autoPlay=true'],
  ['vidsrc',id=>'https://vidsrc.to/embed/movie/'+id],
  ['vidlux',id=>'https://vidlux.xyz/embed/movie/'+id],
  ['2embed',id=>'https://www.2embed.cc/embed/'+id],
  ['moviesapi',id=>'https://moviesapi.to/movie/'+id],
  ['embedbandit',id=>'https://embedbandit.com/embed/movie?tmdb='+id]
];
const mvp=$('#mvp'),mvpBox=$('#mvp-box'),mvpSel=$('#mvp-sel'),mvpTitle=$('#mvp-t');
function mountPlayer(){
  if(!mPlayId)return;
  const [,url]=(SRC.find(s=>s[0]===mvpSel.value)||SRC[0]);
  const f=h('iframe',{class:'mvp-frame',title:'player',allow:'autoplay; fullscreen; picture-in-picture; encrypted-media'});
  f.setAttribute('allowfullscreen','');f.setAttribute('referrerpolicy','origin');
  if(window.crossOriginIsolated)f.setAttribute('credentialless','');
  f.src=url(mPlayId);mvpBox.replaceChildren(f);
}
function playMovie(id,title){
  mPlayId=id;mvpTitle.textContent=title||'';
  if(mvpSel.options.length!==SRC.length)mvpSel.replaceChildren(...SRC.map(s=>new Option(s[0],s[0])));
  const want=store.get('mvsrc','vidlink');
  mvpSel.value=SRC.some(s=>s[0]===want)?want:SRC[0][0];
  mountPlayer();mvp.classList.add('on');
}
function closePlayer(){mvp.classList.remove('on');mvpBox.replaceChildren();mPlayId=null}
mvpSel.onchange=()=>{store.set('mvsrc',mvpSel.value);mountPlayer()};
$('#mvp-x').onclick=closePlayer;

const mCard=(img,title,fn)=>h('button',{class:'mg-card',onclick:fn},h('img',{src:img||'',loading:'lazy',alt:''}),h('span',{},title));

$('#open-movies').onclick=()=>{mv.classList.add('on');if(!mvb.childElementCount)mList()};
$('#mv-back').onclick=()=>mback();
let mqt;$('#mv-q').oninput=e=>{clearTimeout(mqt);mqt=setTimeout(()=>{mq=e.target.value.trim();mList()},450)};
addEventListener('keydown',e=>{
  if(e.key!=='Escape'||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(mvp.classList.contains('on'))return closePlayer();
  if(mv.classList.contains('on'))mback();
});

/* leaving the page takes the player with it, so nothing keeps playing in a hidden frame */
new MutationObserver(()=>{if(!mv.classList.contains('on'))closePlayer()}).observe(mv,{attributes:true,attributeFilter:['class']});

function mRow(title,items){
  const sc=h('div',{class:'mrow-scroll'},...items.filter(m=>m.poster_path).map(m=>mCard(TI+'w342'+m.poster_path,m.title,()=>mDetail(m.id))));
  const go=d=>()=>sc.scrollBy({left:d*sc.clientWidth*.8,behavior:'smooth'});
  return h('section',{class:'mrow'},h('div',{class:'mrow-head'},h('h4',{},title),
    h('span',{},h('button',{class:'mrow-nav',onclick:go(-1),'aria-label':'scroll left'},'‹'),h('button',{class:'mrow-nav',onclick:go(1),'aria-label':'scroll right'},'›'))),sc);
}
async function mList(push=true){
  mcurId=null;mv.classList.remove('detail');mvb.classList.remove('dt');
  mback=closeMovies;mNote('loading…');
  try{
    if(!KEY)return mNote('no TMDB key yet — put one in js/config.js and the posters appear');
    const credit=h('p',{class:'mg-credit'},'This product uses the TMDB API but is not endorsed or certified by TMDB.');
    if(mq){
      const d=await tmdb('/search/movie?include_adult=false&query='+encodeURIComponent(mq));
      const res=(d.results||[]).filter(m=>m.poster_path);
      if(!res.length)return mNote('nothing found. the catalogue is thinner than it looks.');
      mvb.replaceChildren(h('div',{class:'mg-grid'},...res.map(m=>mCard(TI+'w342'+m.poster_path,m.title,()=>mDetail(m.id)))),credit);
      if(push)setPath('/movies',true);
      return;
    }
    const [tr,po,tp,up]=await Promise.all(['/trending/movie/week','/movie/popular','/movie/top_rated','/movie/upcoming'].map(p=>tmdb(p)));
    const seen=store.get('mvrecent',[]);
    mvb.replaceChildren(...[seen.length?mRow('recently viewed',seen):null,mRow('trending this week',tr.results),mRow('popular',po.results),mRow('top rated',tp.results),mRow('coming soon',up.results)].filter(Boolean),credit);
    if(push)setPath('/movies',true);
  }catch(e){mNote(e.message,()=>mList())}
}
function runTime(n){return n?Math.floor(n/60)+'h '+(n%60)+'m':''}
async function mDetail(id,push=true){
  mback=()=>mList();mcurId=Number(id);mNote('loading…');badge('cinema');
  try{
    const d=await tmdb('/movie/'+id);
    {const r=store.get('mvrecent',[]).filter(x=>x.id!==d.id);r.unshift({id:d.id,title:d.title,poster_path:d.poster_path,release_date:d.release_date});store.set('mvrecent',r.slice(0,12))}
    const meta=[(d.release_date||'').slice(0,4),runTime(d.runtime),d.vote_average?'★ '+d.vote_average.toFixed(1):''].filter(Boolean).join(' · ');
    mvb.replaceChildren(
      h('article',{class:'mvx'},
        h('div',{class:'mvx-ban'},d.backdrop_path?h('img',{src:TI+'w1280'+d.backdrop_path,alt:'',loading:'lazy'}):null),
        h('div',{class:'mvx-in'},
          h('img',{class:'mvx-poster',src:d.poster_path?TI+'w500'+d.poster_path:'',alt:''}),
          h('div',{class:'mvx-txt'},
            h('h2',{},d.title),
            meta?h('p',{class:'mvx-meta'},meta):null,
            d.tagline?h('p',{class:'mvx-tag'},d.tagline):null,
            h('p',{class:'mvx-desc'},d.overview||'no description yet.'),
            h('div',{class:'mvx-act'},h('button',{class:'mvx-play',onclick:()=>playMovie(d.id,d.title)},'▶ play'))))),
      h('p',{class:'mg-credit'},'This product uses the TMDB API but is not endorsed or certified by TMDB.'));
    mv.classList.add('detail');mvb.classList.add('dt');
    if(push)setPath('/movies/movie/'+d.id,true);
  }catch(e){mNote(e.message,()=>mDetail(id,push))}
}
