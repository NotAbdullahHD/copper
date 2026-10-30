/* analytics: Google Analytics 4. Counts visits automatically (opt-out in settings > data). It never receives the sites you open or what you search. */
const GA_ID=window.COPPER_GA||'';let gaOn=false;
function gaLoad(){
  if(!GA_ID||gaOn)return;gaOn=true;
  window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};
  gtag('consent','default',{analytics_storage:window.COPPER_GA_COOKIELESS?'denied':'granted'});
  gtag('js',new Date());gtag('config',GA_ID);
  const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA_ID);document.head.append(s);
}
function track(name,params){if(gaOn&&window.gtag)gtag('event',name,params||{})}
function syncAn(){document.querySelectorAll('#s-an button').forEach(b=>b.classList.toggle('on',b.dataset.v===(store.get('analytics',true)?'1':'0')))}
if(!GA_ID){const r=$('#s-an').closest('.set');if(r)r.remove();const c=$('#cr-an');if(c)c.remove()}
else{
  $('#open-set').addEventListener('click',syncAn);
  $('#s-an').onclick=e=>{const b=e.target.closest('button');if(!b)return;const on=b.dataset.v==='1';store.set('analytics',on);
    if(on){window['ga-disable-'+GA_ID]=false;gaLoad()}else{window['ga-disable-'+GA_ID]=true;toast('visit counting off')}syncAn()};
  if(store.get('analytics',true))gaLoad();
}
