/* movies page. TMDB (through our own movie api) for the catalogue, and our own
   player for watching: streams come from the api, the bytes through its relay,
   so there is no embed page, no provider chrome and no ads.
   two addresses: /movies for the shelves, /movies/movie/<id> for one film. */
const mv=$('#mv'),mvb=$('#mvbody'),TM='https://api.themoviedb.org/3',TI='https://image.tmdb.org/t/p/',KEY=window.COPPER_TMDB||'',API=(window.COPPER_MOVIES_API||'').replace(/\/+$/,'');
let mq='',mback=closeMovies,mcurId=null,mPlayId=null;
const mNote=(t,retry)=>mvb.replaceChildren(empty(t,retry,t==='loading…'));
function closeMovies(){mv.classList.remove('on')}
window.mvPath=()=>mcurId?'/movies/movie/'+mcurId:'/movies';
async function tmdb(path){
  /* our own movies-api leads: same paths, and the catalogue key stays on its server */
  if(API){
    try{
      const r=await fetch(API+'/api'+path,{headers:{accept:'application/json'}});
      const d=await r.json().catch(()=>null);
      if(r.ok&&d&&!d.error)return d;
      throw new Error(d&&d.error?d.error:'movies api '+r.status);
    }catch(e){
      if(!KEY)throw new Error('your movies api did not answer — '+e.message);
    }
  }
  let r;try{r=await fetch(TM+path+(path.includes('?')?'&':'?')+'api_key='+encodeURIComponent(KEY),{headers:{accept:'application/json'}})}catch{throw new Error('TMDB did not answer. the key or the connection.')}
  if(r.status===401)throw new Error('TMDB rejected the key in config.js');
  const t=await r.text();let d=null;try{d=JSON.parse(t)}catch{}
  if(!r.ok||!d)throw new Error(r.ok?'TMDB sent something unexpected':'TMDB error '+r.status);
  return d;
}

/* ---- the player ---------------------------------------------------------
   one <video>, one hls.js instance, and controls we drew ourselves. */
const mvp=$('#mvp'),mvpSel=$('#mvp-sel'),mvpTitle=$('#mvp-t'),mvpV=$('#mvp-v'),mvpMsg=$('#mvp-msg'),
  mvpPlay=$('#mvp-play'),mvpSeek=$('#mvp-seek'),mvpCur=$('#mvp-cur'),mvpDur=$('#mvp-dur'),
  mvpMute=$('#mvp-mute'),mvpVol=$('#mvp-vol'),mvpCC=$('#mvp-cc'),mvpCCL=$('#mvp-ccl'),
  mvpFS=$('#mvp-fs'),mvpPip=$('#mvp-pip');
let mStreams=[],mLabels=[],mHls=null,mSub=-1;

const clock=s=>{s=Math.max(0,Math.round(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,'0');return h?h+':'+String(m).padStart(2,'0')+':'+x:m+':'+x};
/* playback goes through the relay: these hosts answer without CORS and check the
   referer, and the playlist has to be rewritten under our origin to be playable. */
const relay=s=>API+'/api/proxy?url='+encodeURIComponent(s.url)+(s.headers?'&headers='+encodeURIComponent(JSON.stringify(s.headers)):'');
const say=t=>{mvpMsg.textContent=t||'';mvpMsg.hidden=!t};

function unload(){
  if(mHls){mHls.destroy();mHls=null}
  mvpV.removeAttribute('src');mvpV.load();
  mSub=-1;mvpCC.setAttribute('aria-pressed','false');mvpCCL.hidden=true;
}
async function playerStreams(id){
  if(!API)throw new Error('no movies api set — put its address in js/config.js');
  const r=await fetch(API+'/api/stream/movie/'+id,{headers:{accept:'application/json'}});
  const d=await r.json().catch(()=>null);
  if(!r.ok||!d||d.error)throw new Error((d&&d.error)||'streams answered '+r.status);
  return d.streams||[];
}
function buildSubs(){
  const tracks=(mHls&&mHls.subtitleTracks)||[];
  const rows=[{i:-1,label:'off'}].concat(tracks.map((t,i)=>({i,label:t.name||t.lang||'subtitle '+(i+1)})));
  mvpCCL.replaceChildren(...rows.map(o=>h('button',{'aria-selected':String(o.i===mSub),onclick:()=>{
    mSub=o.i;
    if(mHls){mHls.subtitleDisplay=o.i>-1;mHls.subtitleTrack=o.i}
    mvpCC.setAttribute('aria-pressed',String(o.i>-1));mvpCCL.hidden=true;buildSubs();
  }},o.label)));
}
/* one provider can answer with several servers, and three rows called "2Embed" is
   not a choice — number the repeats instead. */
function labelStreams(list){
  const seen={};
  mLabels=list.map(s=>{const n=s.providerName||s.provider||'server';seen[n]=(seen[n]||0)+1;return seen[n]>1?n+' '+seen[n]:n});
}
function play(stream,at=0){
  unload();
  if(!stream)return say('no server answered for this film');
  mvpSel.value=String(mStreams.indexOf(stream));
  mSub=-1;buildSubs();
  say('loading '+stream.providerName+'…');
  const url=relay(stream);
  const start=()=>{if(at>0&&Number.isFinite(at))mvpV.currentTime=at;mvpV.play().catch(()=>say('press play to start'))};
  if(window.Hls&&Hls.isSupported()){
    mHls=new Hls({enableWorker:true,maxBufferLength:30,maxMaxBufferLength:60});
    mHls.on(Hls.Events.MANIFEST_PARSED,()=>{say('');buildSubs();start()});
    mHls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED,buildSubs);
    mHls.on(Hls.Events.ERROR,(_e,d)=>{
      if(d&&d.fatal)say((d.details==='manifestLoadError'?'this server did not answer — ':'')+'try another server');
    });
    mHls.loadSource(url);mHls.attachMedia(mvpV);
  }else if(mvpV.canPlayType('application/vnd.apple.mpegurl')){
    mvpV.src=url;
    mvpV.addEventListener('loadedmetadata',start,{once:true});
    mvpV.addEventListener('error',()=>say('try another server'),{once:true});
  }else say('this browser cannot play hls');
}
async function playMovie(id,title){
  mPlayId=id;mvpTitle.textContent=title||'';mvp.classList.add('on');
  mvpSel.replaceChildren();unload();say('finding a server…');
  try{
    mStreams=await playerStreams(id);
    if(!mStreams.length)return say('no server answered for this one yet');
    labelStreams(mStreams);
    mvpSel.replaceChildren(...mLabels.map((n,i)=>new Option(n,String(i))));
    const want=store.get('mvsrc',''),at=Math.max(0,mLabels.indexOf(want));
    play(mStreams[at]||mStreams[0]);
  }catch(e){say(e.message)}
}
function closePlayer(){mvp.classList.remove('on');unload();mPlayId=null;mStreams=[];mLabels=[]}

mvpSel.onchange=()=>{const i=Number(mvpSel.value);store.set('mvsrc',mLabels[i]||'');play(mStreams[i],mvpV.currentTime)};
$('#mvp-x').onclick=closePlayer;
mvpPlay.onclick=()=>{mvpV.paused?mvpV.play().catch(()=>{}):mvpV.pause()};
mvpV.onclick=()=>mvpPlay.onclick();
mvpV.ondblclick=()=>mvpFS.onclick();
mvpV.onplay=()=>{mvpPlay.textContent='❚❚'};
mvpV.onpause=()=>{mvpPlay.textContent='▶'};
mvpV.ontimeupdate=()=>{
  mvpCur.textContent=clock(mvpV.currentTime);
  const d=mvpV.duration;
  if(d&&Number.isFinite(d))mvpSeek.value=String(Math.round(mvpV.currentTime/d*1000));
};
mvpV.onloadedmetadata=()=>{mvpDur.textContent=clock(mvpV.duration)};
mvpV.ondurationchange=mvpV.onloadedmetadata;
mvpV.onwaiting=()=>say('buffering…');
mvpV.onplaying=()=>say('');
mvpV.onerror=()=>{if(mvpV.error)say('this stream stopped — try another server')};
mvpSeek.oninput=()=>{const d=mvpV.duration;if(d&&Number.isFinite(d))mvpV.currentTime=mvpSeek.value/1000*d};
mvpSeek.onchange=()=>{const d=mvpV.duration;if(d&&Number.isFinite(d))mvpV.currentTime=mvpSeek.value/1000*d};
mvpMute.onclick=()=>{mvpV.muted=!mvpV.muted};
mvpVol.oninput=()=>{mvpV.volume=Number(mvpVol.value)/100;mvpV.muted=!mvpV.volume};
mvpV.onvolumechange=()=>{
  mvpVol.value=String(Math.round((mvpV.muted?0:mvpV.volume)*100));
  mvpMute.textContent=mvpV.muted||!mvpV.volume?'🔇':'🔊';
};
mvpCC.onclick=()=>{mvpCCL.hidden=!mvpCCL.hidden;if(!mvpCCL.hidden)buildSubs()};
mvpFS.onclick=()=>{document.fullscreenElement?document.exitFullscreen():mvp.requestFullscreen&&mvp.requestFullscreen().catch(()=>{})};
mvpPip.onclick=()=>{
  if(document.pictureInPictureElement)document.exitPictureInPicture();
  else if(mvpV.requestPictureInPicture)mvpV.requestPictureInPicture().catch(()=>{});
};

addEventListener('keydown',e=>{
  if(!mvp.classList.contains('on'))return;
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  const k=e.key.toLowerCase();
  if(k===' '||k==='k'){e.preventDefault();mvpV.paused?mvpV.play().catch(()=>{}):mvpV.pause()}
  else if(k==='arrowleft'){e.preventDefault();mvpV.currentTime=Math.max(0,mvpV.currentTime-10)}
  else if(k==='arrowright'){e.preventDefault();mvpV.currentTime=Math.min(mvpV.duration||Infinity,mvpV.currentTime+10)}
  else if(k==='arrowup'){e.preventDefault();mvpV.volume=Math.min(1,mvpV.volume+.1);mvpV.muted=false}
  else if(k==='arrowdown'){e.preventDefault();mvpV.volume=Math.max(0,mvpV.volume-.1)}
  else if(k==='m')mvpV.muted=!mvpV.muted;
  else if(k==='f')mvpFS.onclick();
  else if(k==='c')mvpCC.onclick();
});

const mCard=(img,title,fn)=>h('button',{class:'mg-card',onclick:fn},h('img',{src:img||'',loading:'lazy',alt:''}),h('span',{},title));

$('#open-movies').onclick=()=>{mv.classList.add('on');if(!mvb.childElementCount)mList()};
$('#mv-back').onclick=()=>mback();
let mqt;$('#mv-q').oninput=e=>{clearTimeout(mqt);mqt=setTimeout(()=>{mq=e.target.value.trim();mList()},450)};
addEventListener('keydown',e=>{
  if(e.key!=='Escape'||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(mvp.classList.contains('on'))return closePlayer();
  if(mv.classList.contains('on'))mback();
});

/* leaving the page takes the player with it, so nothing keeps playing in the background */
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
    if(!KEY&&!API)return mNote('no TMDB key yet — put one in js/config.js and the posters appear');
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
