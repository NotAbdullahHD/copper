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
   one <video>, one hls.js instance, and controls we drew ourselves.

   A scraped url is a guess. The api hands over every server it found, live ones
   first, and this player opens them in turn until one really plays. Each
   candidate is tried two ways — through the api's relay, which adds CORS and the
   referer the host wants, and straight from the host, which is the only way when
   the host blocks the relay's network. A fatal error, a dead source or twelve
   seconds without a picture moves to the next candidate by itself. */
const mvp=$('#mvp'),mvpSel=$('#mvp-sel'),mvpTitle=$('#mvp-t'),mvpV=$('#mvp-v'),
  mvpLoad=$('#mvp-load'),mvpPlay=$('#mvp-play'),mvpBack=$('#mvp-back'),mvpFwd=$('#mvp-fwd'),
  mvpSeek=$('#mvp-seek'),mvpCur=$('#mvp-cur'),mvpDur=$('#mvp-dur'),
  mvpMute=$('#mvp-mute'),mvpVol=$('#mvp-vol'),mvpCC=$('#mvp-cc'),mvpCCL=$('#mvp-ccl'),
  mvpFS=$('#mvp-fs'),mvpPip=$('#mvp-pip'),mvpX=$('#mvp-x');

const MVICON={
  play:'<svg viewBox="0 0 24 24"><path d="M8 5.1v13.8L19 12z"/></svg>',
  pause:'<svg viewBox="0 0 24 24"><rect x="7" y="5" width="3.6" height="14" rx="1"/><rect x="13.4" y="5" width="3.6" height="14" rx="1"/></svg>',
  back:'<svg viewBox="0 0 24 24"><path d="M12 4.6V2L6.6 6.6 12 11.2V8.4a6.1 6.1 0 1 1-6.1 6.1H3.7A8.3 8.3 0 1 0 12 4.6z"/><text x="12.4" y="16.6" text-anchor="middle" font-size="6.6" font-weight="600" stroke="none">10</text></svg>',
  fwd:'<svg viewBox="0 0 24 24"><path d="M12 4.6V2l5.4 4.6L12 11.2V8.4a6.1 6.1 0 1 0 6.1 6.1h2.2A8.3 8.3 0 1 1 12 4.6z"/><text x="11.6" y="16.6" text-anchor="middle" font-size="6.6" font-weight="600" stroke="none">10</text></svg>',
  volume:'<svg viewBox="0 0 24 24"><path d="M4 9.4h3.4L12 5.4v13.2L7.4 14.6H4z"/><path d="M15.3 9.1a4 4 0 0 1 0 5.8M17.7 6.6a7.4 7.4 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  muted:'<svg viewBox="0 0 24 24"><path d="M4 9.4h3.4L12 5.4v13.2L7.4 14.6H4z"/><path d="M15.6 9.7l5 4.6M20.6 9.7l-5 4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  pip:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="12.2" y="11.6" width="7.2" height="5.8" rx="1.1"/></svg>',
  fs:'<svg viewBox="0 0 24 24"><path d="M4 9.4V4h5.4M20 9.4V4h-5.4M4 14.6V20h5.4M20 14.6V20h-5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  close:'<svg viewBox="0 0 24 24"><path d="M6.2 6.2l11.6 11.6M17.8 6.2L6.2 17.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  retry:'<svg viewBox="0 0 24 24"><path d="M12 5.5V2.6L7.4 6.4 12 10.2V7.3a5.6 5.6 0 1 1-5.6 5.6H4.2A7.8 7.8 0 1 0 12 5.5z"/></svg>'
};

mvpPlay.innerHTML=MVICON.play;mvpBack.innerHTML=MVICON.back;mvpFwd.innerHTML=MVICON.fwd;
mvpMute.innerHTML=MVICON.volume;mvpPip.innerHTML=MVICON.pip;mvpFS.innerHTML=MVICON.fs;mvpX.innerHTML=MVICON.close;

let mStreams=[],mLabels=[],mHls=null,mSub='-1',mPick=-1,mToken=0,mBad=new Set(),mWatch=null,mIdle=null;

const mvClock=s=>{s=Math.max(0,Math.round(s||0));const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=String(s%60).padStart(2,'0');return h?h+':'+String(m).padStart(2,'0')+':'+x:m+':'+x};
const mvLabel=i=>mLabels[i]||(mStreams[i]&&mStreams[i].providerName)||'server';

/* ---- the one message area -----------------------------------------------
   a ring and a line while something is being found, a reason and a retry when
   nothing was, and nothing at all once a picture is up. */
function mvSpinner(text){
  mvpLoad.className='mvp-load';
  mvpLoad.innerHTML='<span class="mvp-ring"></span><p class="mvp-note"></p>';
  mvpLoad.querySelector('.mvp-note').textContent=text||'';
  mvpLoad.hidden=false;
}
function mvNote(text){
  mvpLoad.className='mvp-load plain';
  mvpLoad.innerHTML='<p class="mvp-note"></p>';
  mvpLoad.querySelector('.mvp-note').textContent=text||'';
  mvpLoad.hidden=!text;
}
function mvStuck(text){
  mvpLoad.className='mvp-load ended';
  mvpLoad.innerHTML='<span class="mvp-ico">'+MVICON.retry+'</span><p class="mvp-note"></p>'+
    '<button class="mvp-again" type="button">try every server again</button>';
  mvpLoad.querySelector('.mvp-note').textContent=text;
  mvpLoad.querySelector('.mvp-again').onclick=()=>{mBad.clear();mvReload()};
  mvpLoad.hidden=false;
}
const mvQuiet=()=>{mvpLoad.hidden=true};

function mvDetach(){
  clearTimeout(mWatch);mWatch=null;
  if(mHls){try{mHls.destroy()}catch{/* already gone */}mHls=null}
  for(const t of [...mvpV.querySelectorAll('track')])t.remove();
  mvpV.removeAttribute('src');mvpV.load();
}
function mvUnload(){
  mToken++;
  mvDetach();
  mSub='-1';mvpCC.setAttribute('aria-pressed','false');mvpCCL.hidden=true;
  mvpSeek.value='0';mvpSeek.style.setProperty('--p','0%');
  mvpCur.textContent='0:00';mvpDur.textContent='0:00';
}

async function mvPlayerStreams(id,refresh=false){
  if(!API)throw new Error('no movies api set — put its address in js/config.js');
  const r=await fetch(API+'/api/stream/movie/'+id+(refresh?'?refresh=1':''),{headers:{accept:'application/json'}});
  const d=await r.json().catch(()=>null);
  if(!r.ok||!d||d.error)throw new Error((d&&d.error)||'streams answered '+r.status);
  return d.streams||[];
}

/* a stream can carry two kinds of subtitle: tracks inside the playlist, and
   separate files the api handed over (served as vtt by its subtitle route).
   both belong in one menu, so rows are keyed h<index> and t<index>. */
function mvAddSubs(stream){
  for(const t of [...mvpV.querySelectorAll('track')])t.remove();
  for(const s of (stream&&stream.subtitles)||[]){
    if(!s||!s.url)continue;
    const t=document.createElement('track');
    t.kind='subtitles';t.label=s.label||'subtitles';
    t.srclang=/^[a-z]{2,3}$/i.test(s.lang||'')?s.lang:'und';
    t.src=s.url;mvpV.appendChild(t);
  }
}
function mvApplySubs(){
  const tags=[...mvpV.querySelectorAll('track')];
  tags.forEach((t,i)=>{try{t.track.mode=mSub==='t'+i?'showing':'disabled'}catch{/* not loaded yet */}});
  const inHls=mSub[0]==='h'?Number(mSub.slice(1)):-1;
  if(mHls){try{mHls.subtitleDisplay=inHls>-1;mHls.subtitleTrack=inHls}catch{/* no track list */}}
  mvpCC.setAttribute('aria-pressed',String(mSub!=='-1'));
}
function mvBuildSubs(){
  const tracks=(mHls&&mHls.subtitleTracks)||[],tags=[...mvpV.querySelectorAll('track')];
  const rows=[{k:'-1',label:'off'}]
    .concat(tracks.map((t,i)=>({k:'h'+i,label:t.name||t.lang||'subtitle '+(i+1)})))
    .concat(tags.map((t,i)=>({k:'t'+i,label:t.label||'subtitle '+(i+1)})));
  mvpCCL.replaceChildren(...rows.map(o=>h('button',{'aria-selected':String(o.k===mSub),onclick:()=>{
    mSub=o.k;mvApplySubs();mvpCCL.hidden=true;
  }},o.label)));
}
/* one provider can answer with several servers, and three rows called "2Embed"
   is not a choice — number the repeats instead. */
function mvLabelStreams(list){
  const seen={};
  mLabels=list.map(s=>{const n=s.providerName||s.provider||'server';seen[n]=(seen[n]||0)+1;return seen[n]>1?n+' '+seen[n]:n});
}
/* ---- servers the page fetches itself ------------------------------------
   The api scrapes from a datacenter, and some of these hosts answer a
   datacenter ip with a rate-limit page while a visitor's own connection gets
   the streams. Their api allows any origin, so this is that second attempt:
   the same encrypted reply, fetched and opened here, so the server picker is
   not limited to what one network could reach. */
const MVVN={api:'https://new.vidnest.fun',secret:'K3p8vQ2mX9rL5wZ0fN7bG1sH4tJ6dC9_y8S3wM1nQ5pL2',
  servers:{Catflix:'yflix',Filxer:'rogflix',Gama:'vidzee',Lamda:'ophim',Beta:'flixhq',Prime:'rpmvid',Ophim:'klikxxi',Delta:'allmovies'}};
const mvMedia=/\.(m3u8|mp4|mkv|webm|mpd)(\?|$)/i;
const mvB64=t=>{const p=t.replace(/-/g,'+').replace(/_/g,'/'),b=atob(p+'='.repeat((4-p.length%4)%4)),o=new Uint8Array(b.length);for(let i=0;i<b.length;i++)o[i]=b.charCodeAt(i);return o};
async function mvDecrypt(reply,key){
  const buf=mvB64(reply.d);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(reply.n+'|'+key));
  const k=await crypto.subtle.importKey('raw',digest,'AES-GCM',false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:buf.subarray(0,12)},k,buf.subarray(12));
  try{return JSON.parse(new TextDecoder().decode(plain))}catch{return null}
}
/* one reply, six shapes: walk it and take every media url and subtitle file. */
function mvWalk(node,found,inherited,depth){
  if(!node||typeof node!=='object'||depth>8)return;
  if(Array.isArray(node)){for(const item of node)mvWalk(item,found,inherited,depth+1);return}
  const headers={...(inherited||{})};
  if(node.headers&&typeof node.headers==='object')
    for(const [n,v] of Object.entries(node.headers))
      if(/^(referer|origin|user-agent)$/i.test(n)&&typeof v==='string'&&v)headers[n.toLowerCase()]=v;
  const url=typeof node.url==='string'?node.url:'',kind=String(node.type||'').toLowerCase();
  if(/^https?:\/\//i.test(url)&&!/\/embed[./]/i.test(url)&&(mvMedia.test(url)||kind==='hls'||kind==='mp4')){
    const q=/(\d{3,4})p?/i.exec(String(node.quality||node.resolution||''));
    found.streams.push({url,type:/mp4|mkv|webm/.test(kind)||/\.(mp4|mkv|webm)(\?|$)/i.test(url)?'file':'hls',
      quality:q?q[1]+'p':undefined,headers:Object.keys(headers).length?headers:undefined});
  }
  const subs=node.subtitles||node.captions||node.tracks;
  if(Array.isArray(subs))
    for(const e of subs){
      const u=e&&(e.url||e.file||e.src);
      if(typeof u==='string'&&/^https?:\/\//i.test(u))
        found.subs.push({url:u,label:String(e.label||e.language||e.lang||'subtitle'),lang:String(e.lang||e.language||'')});
    }
  for(const v of Object.values(node))if(v&&typeof v==='object')mvWalk(v,found,headers,depth+1);
}
const mvRelay=(url,headers)=>API+'/api/proxy?url='+encodeURIComponent(url)+(headers?'&headers='+encodeURIComponent(JSON.stringify(headers)):'');
async function mvBrowserServers(type,id,season,episode){
  if(!window.crypto||!crypto.subtle)return [];
  const bytes=crypto.getRandomValues(new Uint8Array(16));let raw='';
  for(const b of bytes)raw+=String.fromCharCode(b);
  const nonce=btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const jobs=Object.entries(MVVN.servers).map(async([name,seg])=>{
    const path=type==='tv'?'/'+seg+'/tv/'+id+'/'+season+'/'+episode:'/'+seg+'/movie/'+id;
    try{
      const r=await fetch(MVVN.api+path+'?_n='+nonce,{headers:{accept:'application/json'},signal:AbortSignal.timeout(12000)});
      const reply=await r.json().catch(()=>null);
      if(!reply||!reply.d)return [];
      const data=await mvDecrypt(reply,MVVN.secret);
      if(!data||data.error)return [];
      const found={streams:[],subs:[]};
      mvWalk(data,found,null,0);
      return found.streams.map(s=>({...s,provider:'vidnest',providerName:'VidNest '+name,subtitles:found.subs,direct:true,proxy:mvRelay(s.url,s.headers)}));
    }catch{return []}
  });
  const seen=new Set();
  return (await Promise.all(jobs)).flat().filter(s=>seen.has(s.url)?false:seen.add(s.url)).slice(0,10);
}
/* late arrivals go into the picker without interrupting what is playing. */
function mvMerge(extra){
  if(!extra||!extra.length)return -1;
  const have=new Set(mStreams.map(s=>s.url));
  const add=extra.filter(s=>have.has(s.url)?false:have.add(s.url));
  if(!add.length)return -1;
  const playing=mStreams[mPick],at=mStreams.length;
  mStreams=mStreams.concat(add);
  mvLabelStreams(mStreams);mvFillSelect();
  if(playing){const i=mStreams.indexOf(playing);if(i>-1){mPick=i;mvpSel.value=String(i)}}
  return at;
}
function mvMoreServers(type,id,season,episode){
  mvBrowserServers(type,id,season,episode).then(list=>{
    if(!mvp.classList.contains('on')||String(mPlayId)!==String(id))return;
    const at=mvMerge(list);
    if(at>-1&&mvpLoad.classList.contains('ended')){mBad.clear();mvSpinner('found another server — trying it…');mvStart(at,0)}
  }).catch(()=>{/* the hosts said no; the api's list stands */});
}
function mvFillSelect(){
  mvpSel.replaceChildren(...mLabels.map((n,i)=>new Option(n,String(i))));
  mvpSel.value=String(Math.max(0,mPick));
}

/* ---- opening one candidate ----------------------------------------------
   Resolves true once a frame is actually on screen, false when the host said no
   or went mvQuiet. "playing" is the only proof: a manifest that parses can still
   carry no bytes. */
function mvOpen(url,isFile,token,at){
  return new Promise(resolve=>{
    let settled=false;
    const done=ok=>{if(settled)return;settled=true;clearTimeout(mWatch);resolve(ok)};
    const started=()=>done(true);

    if(token!==mToken)return done(false);

    if(isFile||!(window.Hls&&Hls.isSupported())){
      if(!isFile&&!mvpV.canPlayType('application/vnd.apple.mpegurl'))return done(false);
      mvpV.addEventListener('playing',started,{once:true});
      mvpV.addEventListener('loadedmetadata',()=>{
        if(at>0&&Number.isFinite(at))mvpV.currentTime=at;
        mvpV.play().catch(()=>{/* needs a click */});
      },{once:true});
      mvpV.addEventListener('error',()=>done(false),{once:true});
      mvpV.src=url;
    }else{
      mHls=new Hls({
        enableWorker:true,maxBufferLength:30,maxMaxBufferLength:60,
        manifestLoadingTimeOut:8000,manifestLoadingMaxRetry:0,levelLoadingMaxRetry:1,fragLoadingMaxRetry:1
      });
      mHls.on(Hls.Events.MANIFEST_PARSED,()=>{
        mvBuildSubs();mvApplySubs();
        if(at>0&&Number.isFinite(at))mvpV.currentTime=at;
        mvpV.play().catch(()=>{/* needs a click */});
      });
      mHls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED,()=>{mvBuildSubs();mvApplySubs()});
      mHls.on(Hls.Events.ERROR,(_e,d)=>{if(d&&d.fatal)done(false)});
      mvpV.addEventListener('playing',started,{once:true});
      mHls.loadSource(url);mHls.attachMedia(mvpV);
    }
    // A host that neither answers nor fails would hold the whole player up.
    mWatch=setTimeout(()=>done(false),12000);
  });
}

/* ---- trying every candidate until one plays ------------------------------ */
async function mvStart(index,at=0){
  const token=++mToken;
  mvDetach();
  mPick=index;
  const stream=mStreams[index];
  if(!stream)return mvStuck('couldn\'t find a working server for this film');

  mvpSel.value=String(index);
  mvAddSubs(stream);mvBuildSubs();
  mvpCCL.hidden=true;

  const ways=[];
  if(stream.proxy)ways.push(stream.proxy);
  if(stream.url&&stream.url!==stream.proxy)ways.push(stream.url);
  // the page's own connection first when the page found the url, and a plain
  // file without its host refusing our origin
  if(stream.direct||stream.type==='file')ways.reverse();

  for(const url of ways){
    if(token!==mToken)return;
    mvSpinner('connecting to '+mvLabel(index)+(stream.live?'…':' (not verified)…'));
    const ok=await mvOpen(url,stream.type==='file',token,at);
    if(token!==mToken)return;
    if(ok){mvQuiet();mvWake();return}
    mvDetach();
  }

  mBad.add(index);
  const after=mStreams.findIndex((s,i)=>i>index&&!mBad.has(i));
  const before=after<0?mStreams.findIndex((s,i)=>!mBad.has(i)):-1;
  const fallback=after>-1?after:before;
  if(fallback>-1){
    mvNote(mvLabel(index)+' did not answer — switching to '+mvLabel(fallback)+'…');
    await new Promise(r=>setTimeout(r,700));
    if(token!==mToken)return;
    return mvStart(fallback,at);
  }
  mvStuck('couldn\'t find a working server for this film');
}

async function mvReload(){
  const id=mPlayId;
  if(!id)return;
  mBad.clear();
  mvSpinner('finding sources…');
  try{
    mStreams=await mvPlayerStreams(id,true);
    if(!mStreams.length)mStreams=await mvBrowserServers('movie',id);
    if(!mStreams.length)return mvStuck('no server has this film right now');
    mvLabelStreams(mStreams);mvFillSelect();
    mvStart(0);
    mvMoreServers('movie',id);
  }catch(e){mvStuck(e.message||'the movies api did not answer')}
}

async function mvPlayMovie(id,title){
  mPlayId=id;mvpTitle.textContent=title||'';mvp.classList.add('on');
  mvpSel.replaceChildren();mvUnload();
  mBad.clear();mStreams=[];mPick=-1;
  mvSpinner('finding sources…');
  try{
    let apiDown=false;
    try{mStreams=await mvPlayerStreams(id)}catch{apiDown=true}
    if(!mStreams.length)mStreams=await mvBrowserServers('movie',id);
    if(!mStreams.length)return mvStuck(apiDown?'the movies api did not answer':'no server has this film right now');
    mvLabelStreams(mStreams);mvFillSelect();
    const want=store.get('mvsrc',''),at=Math.max(0,mLabels.indexOf(want));
    mvStart(at);
    mvMoreServers('movie',id);
  }catch(e){mvStuck(e.message||'the movies api did not answer')}
}
function mvClosePlayer(){mvp.classList.remove('on','idle');mvUnload();mvQuiet();mPlayId=null;mStreams=[];mLabels=[];mPick=-1;mBad.clear()}

/* ---- controls ----------------------------------------------------------- */
const mvSeekTo=t=>{if(Number.isFinite(mvpV.duration))mvpV.currentTime=Math.min(mvpV.duration,Math.max(0,t))};
const mvJump=by=>mvSeekTo((mvpV.currentTime||0)+by);

mvpSel.onchange=()=>{
  const i=Number(mvpSel.value);
  store.set('mvsrc',mLabels[i]||'');
  mBad.delete(i);
  mvStart(i,mvpV.currentTime||0);
};
mvpX.onclick=mvClosePlayer;
mvpPlay.onclick=()=>{mvpV.paused?mvpV.play().catch(()=>{}):mvpV.pause()};
mvpBack.onclick=()=>mvJump(-10);
mvpFwd.onclick=()=>mvJump(10);
mvpV.onclick=mvpPlay.onclick;
mvpV.ondblclick=()=>mvpFS.onclick();
mvpV.onplay=()=>{mvpPlay.innerHTML=MVICON.pause;mvWake()};
mvpV.onpause=()=>{mvpPlay.innerHTML=MVICON.play;mvWake()};
mvpV.ontimeupdate=()=>{
  mvpCur.textContent=mvClock(mvpV.currentTime);
  const d=mvpV.duration;
  if(d&&Number.isFinite(d)){
    const p=Math.round(mvpV.currentTime/d*1000);
    mvpSeek.value=String(p);
    mvpSeek.style.setProperty('--p',(p/10)+'%');
  }
};
mvpV.onloadedmetadata=()=>{mvpDur.textContent=mvClock(mvpV.duration)};
mvpV.ondurationchange=mvpV.onloadedmetadata;
mvpV.onwaiting=()=>{if(!mvpV.paused&&!mvpLoad.querySelector('.mvp-ring'))mvSpinner('buffering…')};
mvpV.onplaying=()=>{mvpPlay.innerHTML=MVICON.pause;mvQuiet();mvWake()};
mvpV.onerror=()=>{if(mvpV.error)mvNote('this server stopped answering — pick another')};
mvpSeek.oninput=()=>{
  const d=mvpV.duration;
  if(d&&Number.isFinite(d)){
    mvpV.currentTime=mvpSeek.value/1000*d;
    mvpSeek.style.setProperty('--p',(mvpSeek.value/10)+'%');
  }
};
mvpMute.onclick=()=>{mvpV.muted=!mvpV.muted;if(!mvpV.muted&&!mvpV.volume)mvpV.volume=.5};
mvpVol.oninput=()=>{mvpV.volume=Number(mvpVol.value)/100;mvpV.muted=!mvpV.volume};
mvpV.onvolumechange=()=>{
  const level=mvpV.muted?0:mvpV.volume;
  mvpVol.value=String(Math.round(level*100));
  mvpVol.style.setProperty('--p',Math.round(level*100)+'%');
  mvpMute.innerHTML=level?MVICON.volume:MVICON.muted;
};
mvpCC.onclick=e=>{
  e.stopPropagation();
  mvpCCL.hidden=!mvpCCL.hidden;
  if(!mvpCCL.hidden){mvBuildSubs();mvWake()}
};
mvpFS.onclick=()=>{
  if(document.fullscreenElement)document.exitFullscreen();
  else if(mvp.requestFullscreen)mvp.requestFullscreen().catch(()=>{});
};
mvpPip.onclick=()=>{
  if(document.pictureInPictureElement)document.exitPictureInPicture();
  else if(mvpV.requestPictureInPicture)mvpV.requestPictureInPicture().catch(()=>{});
};

/* Controls fade out while the picture plays and come back on any sign of life. */
function mvWake(){
  mvp.classList.remove('idle');
  clearTimeout(mIdle);
  if(!mvpV.paused&&mvpCCL.hidden)mIdle=setTimeout(()=>mvp.classList.add('idle'),3200);
}
for(const ev of ['mousemove','pointerdown','touchstart','keydown'])
  mvp.addEventListener(ev,mvWake,{passive:true});
mvp.addEventListener('mouseleave',()=>{
  if(!mvpV.paused&&mvpCCL.hidden){clearTimeout(mIdle);mIdle=setTimeout(()=>mvp.classList.add('idle'),900)}
});
document.addEventListener('click',e=>{
  if(!mvpCCL.hidden&&!mvpCCL.contains(e.target)&&e.target!==mvpCC)mvpCCL.hidden=true;
});

document.addEventListener('keydown',e=>{
  if(!mvp.classList.contains('on'))return;
  if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  const k=e.key.toLowerCase();
  if(k===' '||k==='k'){e.preventDefault();mvpV.paused?mvpV.play().catch(()=>{}):mvpV.pause()}
  else if(k==='arrowleft'||k==='j'){e.preventDefault();mvJump(-10)}
  else if(k==='arrowright'||k==='l'){e.preventDefault();mvJump(10)}
  else if(k==='arrowup'){e.preventDefault();mvpV.volume=Math.min(1,mvpV.volume+.1);mvpV.muted=false}
  else if(k==='arrowdown'){e.preventDefault();mvpV.volume=Math.max(0,mvpV.volume-.1)}
  else if(k==='m')mvpV.muted=!mvpV.muted;
  else if(k==='f')mvpFS.onclick();
  else if(k==='c'){e.preventDefault();mvpCC.onclick(e)}
  else if(k==='p')mvpPip.onclick();
  else if(k==='n'&&mStreams.length>1){
    const next=(mPick+1)%mStreams.length;
    mBad.delete(next);mvStart(next,mvpV.currentTime||0);
  }
});

const mCard=(img,title,fn)=>h('button',{class:'mg-card',onclick:fn},h('img',{src:img||'',loading:'lazy',alt:''}),h('span',{},title));

$('#open-movies').onclick=()=>{mv.classList.add('on');if(!mvb.childElementCount)mList()};
$('#mv-back').onclick=()=>mback();
let mqt;$('#mv-q').oninput=e=>{clearTimeout(mqt);mqt=setTimeout(()=>{mq=e.target.value.trim();mList()},450)};
addEventListener('keydown',e=>{
  if(e.key!=='Escape'||/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))return;
  if(mvp.classList.contains('on'))return mvClosePlayer();
  if(mv.classList.contains('on'))mback();
});

/* leaving the page takes the player with it, so nothing keeps playing in the background */
new MutationObserver(()=>{if(!mv.classList.contains('on'))mvClosePlayer()}).observe(mv,{attributes:true,attributeFilter:['class']});

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
            h('div',{class:'mvx-act'},h('button',{class:'mvx-play',onclick:()=>mvPlayMovie(d.id,d.title)},'▶ play'))))),
      h('p',{class:'mg-credit'},'This product uses the TMDB API but is not endorsed or certified by TMDB.'));
    mv.classList.add('detail');mvb.classList.add('dt');
    if(push)setPath('/movies/movie/'+d.id,true);
  }catch(e){mNote(e.message,()=>mDetail(id,push))}
}
