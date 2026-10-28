/* analytics: Google Analytics 4. Consent first, and it never receives the sites you open or what you search. */
const GA_ID=window.COPPER_GA||'';let gaOn=false;
function gaLoad(){
  if(!GA_ID||gaOn)return;gaOn=true;
  window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};
  gtag('js',new Date());gtag('config',GA_ID);
  const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA_ID);document.head.append(s);
}
function track(name,params){if(gaOn&&window.gtag)gtag('event',name,params||{})}
function anBanner(){
  const b=document.createElement('div');b.id='an';
  b.innerHTML='<span>Copper uses Google Analytics to count visits (never the sites you open).</span><button id="an-y">ok</button><button id="an-n">no thanks</button>';
  document.body.append(b);
  b.querySelector('#an-y').onclick=()=>{store.set('analytics',true);b.remove();gaLoad();syncAn()};
  b.querySelector('#an-n').onclick=()=>{store.set('analytics',false);b.remove();syncAn()};
}
function syncAn(){document.querySelectorAll('#s-an button').forEach(b=>b.classList.toggle('on',b.dataset.v===(store.get('analytics',false)?'1':'0')))}
const anRow=$('#s-an')&&$('#s-an').closest('.set');
if(!GA_ID){if(anRow)anRow.remove()}
else{
  $('#open-set').addEventListener('click',syncAn);
  $('#s-an').onclick=e=>{const b=e.target.closest('button');if(!b)return;const on=b.dataset.v==='1';store.set('analytics',on);if(on)gaLoad();else toast('analytics off · fully applies after reload');syncAn()};
  const c=store.get('analytics',null);if(c===true)gaLoad();else if(c===null)anBanner();
}
