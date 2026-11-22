/* Copper's own results page. It is a tab like any other — the tab strip and the address bar stay
   where they are — but the document is drawn by Copper from the Lite worker's JSON instead of
   being somebody else's results page in a frame. That is why every engine answers here: Google
   and DuckDuckGo hand a framed page a captcha wall, but the worker asks them directly and the
   hits arrive as data. The engine is chosen in settings; this page only reports which one answered
   and when a different one had to fill in. */
(function(){
  const NAME={ddg:'DuckDuckGo',bing:'Bing',brave:'Brave',google:'Google'};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const base=()=>window.COPPER_LITE?String(window.COPPER_LITE).replace(/\/$/,''):'';
  const engine=()=>store.get('search','bing');

  function theme(){
    const cs=getComputedStyle(document.documentElement),v=(n,f)=>cs.getPropertyValue(n).trim()||f;
    return {accent:v('--accent','#c98b5f'),bg:v('--bg','#0c0b0a'),text:v('--text','#e9e4de'),
      muted:v('--muted','#8b8178'),surface:v('--surface','#171412')};
  }
  function shell(title,body){
    const c=theme();
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
:root{color-scheme:dark}
html,body{margin:0;background:${c.bg};color:${c.text}}
body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:20px clamp(16px,4vw,42px) 60px;
  -webkit-font-smoothing:antialiased}
.f{font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:${c.muted};margin:0 0 16px}
.f b{color:${c.text};font-weight:500}
ol{list-style:none;margin:0;padding:0;counter-reset:n}
li{position:relative;padding:11px 14px 13px 42px;border-radius:10px;counter-increment:n}
li:hover{background:${c.surface}}
li::before{content:counter(n);position:absolute;left:8px;top:13px;width:26px;text-align:right;
  font:11px ui-monospace,Menlo,monospace;color:${c.muted};opacity:.6}
.u{display:block;font:11px ui-monospace,Menlo,monospace;color:${c.muted}}
a{display:inline-block;margin:3px 0 4px;color:${c.accent};text-decoration:none;font-size:17px;
  font-weight:600;line-height:1.35}
a:hover{text-decoration:underline}
p{margin:0;color:${c.muted};font-size:13.5px;line-height:1.5}
.empty{margin:10px 2px;font:13px ui-monospace,Menlo,monospace;color:${c.muted}}
</style></head><body>${body}
<script>
document.addEventListener('click',e=>{const a=e.target.closest('a[data-u]');if(!a)return;
  e.preventDefault();parent.postMessage({copperOpen:a.getAttribute('data-u')},'*')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')parent.postMessage({copperHome:1},'*')});
</script>
</body></html>`;
  }
  const hits=rows=>'<ol>'+rows.map(r=>`<li><span class="u">${esc(r.site||r.url)}</span>`
    +`<a data-u="${esc(r.url)}" href="${esc(r.url)}">${esc(r.title)}</a>`
    +`<p>${esc(r.snippet)}</p></li>`).join('')+'</ol>';

  function skeleton(q){
    const c=theme();
    return shell('search · '+q,`<p class="f" style="color:${c.muted}">searching ${esc(NAME[engine()])} for <b style="color:${c.text}">${esc(q)}</b>…</p>`);
  }
  async function ask(q){
    if(!base())throw new Error('no Lite worker is set, so Copper cannot ask an engine');
    const r=await fetch(base()+'/search?format=json&q='+encodeURIComponent(q)+'&e='+encodeURIComponent(engine()),{cache:'no-store'});
    if(!r.ok||!/json/i.test(r.headers.get('content-type')||''))throw new Error('this Lite worker is older than its /search route');
    return r.json();
  }
  /* the tab asks for this: draw the skeleton now, then the hits when the worker answers */
  window.srDraw=async function(t,q){
    t.f.srcdoc=skeleton(q);
    let d;
    try{d=await ask(q)}
    catch(err){
      console.warn('search:',err);
      if(t.q!==q)return;
      const url=(SE[engine()]||SE.bing)+encodeURIComponent(q);
      t.f.srcdoc=shell('search · '+q,`<p class="f">${esc(err.message||err)}</p>`
        +`<ol><li><span class="u">${esc(NAME[engine()])}</span><a data-u="${esc(url)}" href="${esc(url)}">open this search on ${esc(NAME[engine()])}</a><p>Copper could not ask the engine itself this time.</p></li></ol>`);
      return;
    }
    if(t.q!==q)return;
    const rows=d.results||[];
    const note=d.note?`<p class="f">${esc(d.note)}</p>`:'';
    const head=`<p class="f"><b>${rows.length}</b> result${rows.length===1?'':'s'} for `
      +`<b>${esc(q)}</b> · ${esc(NAME[d.engine]||NAME[engine()])}</p>`;
    if(!rows.length){
      const why=(d.tried||[]).map(x=>NAME[x.e]+': '+x.why).join(' · ');
      t.f.srcdoc=shell('search · '+q,head+`<p class="empty">nothing came back${why?' · '+esc(why):''}</p>`);
      return;
    }
    t.f.srcdoc=shell('search · '+q,note+head+hits(rows));
  };
  /* the home bar calls this */
  window.srOpen=q=>{
    q=String(q||'').trim();if(!q)return;
    if(typeof openSearchTab==='function')openSearchTab(q);
    else newTab((SE[engine()]||SE.bing)+encodeURIComponent(q));
  };
})();
