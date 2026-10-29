/* movies page. TMDB for browsing, trailers and where-to-watch; Internet Archive for full, free films.
   No pirated streams: Copper only plays what the Archive hosts and sends you to legal services for the rest. */
const mv=$('#mv'),mvb=$('#mvbody'),TM='https://api.themoviedb.org/3',TI='https://image.tmdb.org/t/p/',KEY=window.COPPER_TMDB||'';
let mtab=KEY?'trending':'classics',mq='',mback=closeMovies;
const mNote=t=>mvb.replaceChildren(h('p',{class:'mg-note'},t));
function closeMovies(){mv.classList.remove('on')}
async function tmdb(path){
  const r=await fetch(TM+path+(path.includes('?')?'&':'?')+'api_key='+encodeURIComponent(KEY));
  if(r.status===401)throw new Error('TMDB rejected the key in config.js');
  if(!r.ok)throw new Error('TMDB error '+r.status);return r.json();
}
async function iaFetch(u){ // direct first; fall back through the Lite worker if the browser blocks it
  try{const r=await fetch(u);if(!r.ok)throw 0;return await r.json()}
  catch{if(!window.COPPER_LITE)throw new Error('could not reach the Internet Archive');const r=await fetch(lite(u));if(!r.ok)throw new Error('Internet Archive error '+r.status);return r.json()}
}
function embed(src){const f=h('iframe',{class:'mv-frame',allow:'autoplay; fullscreen; picture-in-picture',title:'player'});
  if(window.crossOriginIsolated)f.setAttribute('credentialless','');f.src=src;return f}
const mCard=(img,title,sub,fn)=>h('button',{class:'mg-card',onclick:fn},h('img',{src:img||'',loading:'lazy',alt:''}),h('span',{},title+(sub?' · '+sub:'')));

$('#open-movies').onclick=()=>{mv.classList.add('on');if(!mvb.childElementCount)mList()};
$('#mv-back').onclick=()=>mback();
document.querySelector('#mv-tabs button[data-t="'+mtab+'"]').classList.add('on');
$('#mv-tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;mtab=b.dataset.t;mq='';$('#mv-q').value='';
  document.querySelectorAll('#mv-tabs button').forEach(x=>x.classList.toggle('on',x===b));mList()};
let mqt;$('#mv-q').oninput=e=>{clearTimeout(mqt);mqt=setTimeout(()=>{mq=e.target.value.trim();mList()},450)};
addEventListener('keydown',e=>{if(e.key==='Escape'&&mv.classList.contains('on')&&!/INPUT/.test(document.activeElement.tagName))mback()});

async function mList(){
  mback=closeMovies;mNote('loading…');
  try{
    if(mtab==='classics')return await iaList();
    if(!KEY)return mNote('add a free TMDB key in js/config.js to browse trending movies');
    const d=await tmdb(mq?'/search/movie?include_adult=false&query='+encodeURIComponent(mq):'/trending/movie/week');
    const res=d.results.filter(m=>m.poster_path);if(!res.length)return mNote('no results');
    mvb.replaceChildren(h('div',{class:'mg-grid'},...res.map(m=>mCard(TI+'w342'+m.poster_path,m.title,(m.release_date||'').slice(0,4),()=>mDetail(m.id)))),
      h('p',{class:'mg-credit'},'This product uses the TMDB API but is not endorsed or certified by TMDB.'));
  }catch(e){mNote(e.message)}
}
async function mDetail(id){
  mback=mList;mNote('loading…');badge('cinema');
  try{
    const d=await tmdb(`/movie/${id}?append_to_response=videos,watch/providers`);
    const region=((navigator.language||'en-US').split('-')[1]||'US').toUpperCase();
    const all=(d['watch/providers']||{}).results||{},w=all[region]||all.US||null,reg=all[region]?region:'US';
    const vids=((d.videos||{}).results||[]).filter(v=>v.site==='YouTube'),tr=vids.find(v=>v.type==='Trailer')||vids[0];
    const groups=w?[['stream',w.flatrate],['free with ads',w.ads],['rent',w.rent],['buy',w.buy]].filter(g=>g[1]&&g[1].length):[];
    const slot=h('div');
    mvb.replaceChildren(slot,
      h('div',{class:'mg-detail'},h('img',{class:'mg-cover',src:d.poster_path?TI+'w500'+d.poster_path:'',alt:''}),h('div',{},
        h('h2',{},d.title),
        h('p',{class:'mg-desc'},[(d.release_date||'').slice(0,4),d.runtime?d.runtime+' min':'',d.vote_average?'★ '+d.vote_average.toFixed(1):''].filter(Boolean).join(' · ')),
        h('p',{class:'mg-desc'},(d.overview||'').slice(0,500)),
        h('div',{class:'mg-actions'},
          tr?h('button',{class:'mg-btn pri',onclick:()=>slot.replaceChildren(embed('https://www.youtube-nocookie.com/embed/'+tr.key+'?autoplay=1'))},'watch trailer'):null,
          w&&w.link?h('a',{class:'mg-btn',href:w.link,target:'_blank',rel:'noopener'},'where to watch ↗'):null))),
      h('div',{class:'mv-prov'},h('p',{class:'mg-note',style:'margin:0;text-align:left'},groups.length?'available in '+reg:'no streaming info for your region'),
        ...groups.map(([k,list])=>h('div',{class:'mv-row'},h('small',{},k),...list.map(p=>h('span',{class:'mv-chip'},p.provider_name))))),
      h('p',{class:'mg-credit'},'This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming data by JustWatch.'));
  }catch(e){mNote(e.message)}
}
async function iaList(){
  const term=mq.replace(/[^\w\s'-]/g,' ').trim();
  const q=(term?`title:(${term}) AND `:'')+'collection:feature_films AND mediatype:movies';
  const d=await iaFetch('https://archive.org/advancedsearch.php?q='+encodeURIComponent(q)+'&fl[]=identifier&fl[]=title&fl[]=year&sort[]='+encodeURIComponent('downloads desc')+'&rows=40&output=json');
  const docs=(d.response&&d.response.docs)||[];if(!docs.length)return mNote('no results');
  mvb.replaceChildren(h('div',{class:'mg-grid'},...docs.map(x=>mCard('https://archive.org/services/img/'+x.identifier,x.title,x.year,()=>iaPlay(x)))),
    h('p',{class:'mg-credit'},'free films from the Internet Archive'));
}
function iaPlay(x){
  mback=mList;badge('cinema');
  mvb.replaceChildren(h('h2',{class:'mg-desc',style:'max-width:900px;margin:0 auto 14px;color:var(--text)'},x.title+(x.year?' · '+x.year:'')),
    embed('https://archive.org/embed/'+encodeURIComponent(x.identifier)),
    h('p',{class:'mg-credit'},'from the Internet Archive'));
}
