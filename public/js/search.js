/* Copper's own results page. A search engine in a frame is what made only Brave look like it
   worked: Google answers a datacenter IP with a JavaScript wall and DuckDuckGo with an "anomaly"
   page, so the frame showed that instead of results. The Lite worker asks the engine itself and
   returns plain JSON; Copper draws the hits, so every engine in the picker returns real results,
   instantly, with no captcha anywhere. If the worker is missing or older than /search, the engine's
   own page opens as a tab, exactly as before. */
(function(){
  const sec=$('#sr'),list=$('#srbody'),input=$('#sr-q'),eng=$('#sr-eng');
  if(!sec||!list)return;
  const NAME={ddg:'DuckDuckGo',bing:'Bing',brave:'Brave',google:'Google'};
  let q='',e=store.get('search','bing'),seq=0,last=null;

  const base=()=>window.COPPER_LITE?String(window.COPPER_LITE).replace(/\/$/,''):'';
  const note=t=>{const p=document.createElement('p');p.className='sr-note';p.textContent=t;return p};
  function markEng(){eng.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.e===e))}
  function close(){sec.classList.remove('on')}
  function enginePage(){
    close();
    newTab((SE[e]||SE.bing)+encodeURIComponent(q));
    toast('opening '+NAME[e]+' in a tab');
  }
  function hit(r,i){
    const a=document.createElement('a');a.className='sr-hit';a.href=r.url;a.rel='noreferrer';
    const n=document.createElement('span');n.className='sr-n';n.textContent=i+1;
    const u=document.createElement('span');u.className='sr-u';u.textContent=r.site||host(r.url);
    const t=document.createElement('h4');t.textContent=r.title;
    const p=document.createElement('p');p.textContent=r.snippet||'';
    a.append(n,u,t,p);
    a.onclick=ev=>{ev.preventDefault();close();newTab(r.url)};
    return a;
  }
  function render(d){
    list.textContent='';
    if(d.note)list.append(note(d.note));
    const rows=d.results||[];
    if(!rows.length){
      const why=(d.tried||[]).map(t=>NAME[t.e]+': '+t.why).join(' · ');
      list.append(note('no results for “'+q+'”'+(why?' · '+why:'')));
      const again=document.createElement('button');again.className='mg-btn';again.textContent='try '+NAME[e]+' directly';
      again.onclick=enginePage;list.append(again);
      return;
    }
    const frag=document.createDocumentFragment();
    rows.forEach((r,i)=>frag.append(hit(r,i)));
    list.append(frag);
  }
  async function run(){
    const my=++seq;markEng();
    if(!base())return enginePage();
    list.textContent='';list.append(note('asking '+NAME[e]+'…'));
    try{
      const r=await fetch(base()+'/search?format=json&q='+encodeURIComponent(q)+'&e='+encodeURIComponent(e),{cache:'no-store'});
      if(!r.ok||!/json/i.test(r.headers.get('content-type')||''))throw new Error('this Lite worker predates /search');
      const d=await r.json();
      if(my!==seq)return;
      last=d;render(d);
    }catch(err){
      if(my!==seq)return;
      console.warn('search:',err);
      enginePage();
    }
  }
  function open(v,engine){
    if(engine){e=engine;store.set('search',e)}
    q=(v==null?input.value:v).trim();if(!q)return;
    document.querySelectorAll('section.on').forEach(s=>{if(s!==sec)s.classList.remove('on')});
    if(document.body.classList.contains('viewing'))goHome();
    sec.classList.add('on');input.value=q;
    if(navigator.onLine!==false&&typeof track==='function')track('search',{engine:e});
    run();
  }
  input.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();open(input.value)}});
  $('#sr-back').onclick=()=>{close();goHome()};
  eng.addEventListener('click',ev=>{
    const b=ev.target.closest('button[data-e]');if(!b)return;
    e=b.dataset.e;store.set('search',e);
    if($('#s-se'))$('#s-se').value=e;
    if(q)run();
  });
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&sec.classList.contains('on')&&!$('#st').open)close()});
  markEng();
  window.srOpen=open;
})();
