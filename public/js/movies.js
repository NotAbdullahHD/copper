/* movies page. TMDB for browsing and trailers; Watchmode (through the Lite worker) for where-to-watch links.
   No pirated streams: Copper shows what's trending and sends you to the legal services that carry it. */
const mv=$('#mv'),mvb=$('#mvbody'),TM='https://api.themoviedb.org/3',TI='https://image.tmdb.org/t/p/',KEY=window.COPPER_TMDB||'';
let mq='',mback=closeMovies;
const mNote=(t,retry)=>mvb.replaceChildren(empty(t,retry,t==='loading…'));
function closeMovies(){mv.classList.remove('on')}
async function tmdb(path){
  const r=await fetch(TM+path+(path.includes('?')?'&':'?')+'api_key='+encodeURIComponent(KEY));
  if(r.status===401)throw new Error('TMDB rejected the key in config.js');
  if(!r.ok)throw new Error('TMDB error '+r.status);return r.json();
}
function embed(src){const f=h('iframe',{class:'mv-frame',allow:'autoplay; fullscreen; picture-in-picture',title:'player'});
  if(window.crossOriginIsolated)f.setAttribute('credentialless','');f.src=src;return f}
const mCard=(img,title,sub,fn)=>h('button',{class:'mg-card',onclick:fn},h('img',{src:img||'',loading:'lazy',alt:''}),h('span',{},title+(sub?' · '+sub:'')));

$('#open-movies').onclick=()=>{mv.classList.add('on');if(!mvb.childElementCount)mList()};
$('#mv-back').onclick=()=>mback();
let mqt;$('#mv-q').oninput=e=>{clearTimeout(mqt);mqt=setTimeout(()=>{mq=e.target.value.trim();mList()},450)};
addEventListener('keydown',e=>{if(e.key==='Escape'&&mv.classList.contains('on')&&!/INPUT/.test(document.activeElement.tagName))mback()});

async function mList(){
  mback=closeMovies;mNote('loading…');
  try{
    if(!KEY)return mNote('add a free TMDB key in js/config.js to browse movies');
    const d=await tmdb(mq?'/search/movie?include_adult=false&query='+encodeURIComponent(mq):'/trending/movie/week');
    const res=d.results.filter(m=>m.poster_path);if(!res.length)return mNote('no results');
    mvb.replaceChildren(h('div',{class:'mg-grid'},...res.map(m=>mCard(TI+'w342'+m.poster_path,m.title,(m.release_date||'').slice(0,4),()=>mDetail(m.id)))),
      h('p',{class:'mg-credit'},'This product uses the TMDB API but is not endorsed or certified by TMDB.'));
  }catch(e){mNote(e.message,mList)}
}
async function wmSources(id,region){ // where-to-watch links via the Lite worker (it holds the Watchmode key); null means use TMDB's data
  if(!window.COPPER_LITE)return null;
  try{const r=await fetch(COPPER_LITE.replace(/\/$/,'')+'/wm?tmdb='+id+'&region='+region);if(!r.ok)return null;const d=await r.json();return d.sources&&d.sources.length?d.sources:null}catch{return null}
}
function userRegion(){ // 'sv' -> SE, 'en' -> US, 'zh-Hans-CN' -> CN
  try{return new Intl.Locale(navigator.language||'en-US').maximize().region||'US'}catch{return 'US'}
}
async function mDetail(id){
  mback=mList;mNote('loading…');badge('cinema');
  try{
    const region=userRegion();
    const [d,wm]=await Promise.all([tmdb(`/movie/${id}?append_to_response=videos,watch/providers`),wmSources(id,region)]);
    const all=(d['watch/providers']||{}).results||{},w=all[region]||all.US||null,reg=all[region]?region:'US';
    const vids=((d.videos||{}).results||[]).filter(v=>v.site==='YouTube'),tr=vids.find(v=>v.type==='Trailer')||vids[0];
    const T={sub:'stream',free:'free',rent:'rent',buy:'buy'};
    const groups=wm?Object.entries(T).map(([k,l])=>[l,wm.filter(s=>s.type===k)]).filter(g=>g[1].length)
      :w?[['stream',w.flatrate],['free with ads',w.ads],['rent',w.rent],['buy',w.buy]].filter(g=>g[1]&&g[1].length):[];
    const chip=p=>p.url?h('a',{class:'mv-chip',href:p.url,target:'_blank',rel:'noopener'},p.name):h('span',{class:'mv-chip'},p.provider_name||p.name);
    const slot=h('div');
    const prov=h('div',{class:'mv-prov'},h('p',{class:'mg-note',style:'margin:0;text-align:left'},groups.length?'available in '+(wm?region:reg):'no streaming info for your region'),
      ...groups.map(([k,list])=>h('div',{class:'mv-row'},h('small',{},k),...list.map(chip))));
    mvb.replaceChildren(slot,
      h('div',{class:'mg-detail'},h('img',{class:'mg-cover',src:d.poster_path?TI+'w500'+d.poster_path:'',alt:''}),h('div',{},
        h('h2',{},d.title),
        h('p',{class:'mg-desc'},[(d.release_date||'').slice(0,4),d.runtime?d.runtime+' min':'',d.vote_average?'★ '+d.vote_average.toFixed(1):''].filter(Boolean).join(' · ')),
        h('p',{class:'mg-desc'},(d.overview||'').slice(0,500)),
        h('div',{class:'mg-actions'},
          tr?h('button',{class:'mg-btn pri',onclick:()=>slot.replaceChildren(embed('https://www.youtube-nocookie.com/embed/'+tr.key+'?autoplay=1'))},'watch trailer'):null,
          !wm&&w&&w.link?h('a',{class:'mg-btn',href:w.link,target:'_blank',rel:'noopener'},'where to watch ↗'):null),
        prov)),
      h('p',{class:'mg-credit'},'This product uses the TMDB API but is not endorsed or certified by TMDB. '+(wm?'Streaming links by Watchmode.':'Streaming data by JustWatch.')));
  }catch(e){mNote(e.message,()=>mDetail(id))}
}
