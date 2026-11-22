/* analytics: Google Analytics 4. Counts visits automatically (opt-out in settings > data). It never receives the sites you open or what you search. */
const GA_ID=window.COPPER_GA||'',GTM_ID=window.COPPER_GTM||'';let gaOn=false;
/* The Tag Manager container. It shares the dataLayer with gtag above, so anything the container
   fires and anything Copper tracks land in one place, and the same opt-out stops both. */
function gtmLoad(){
  if(!GTM_ID||window.__gtm)return;window.__gtm=1;
  window.dataLayer=window.dataLayer||[];
  window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  const s=document.createElement('script');s.async=true;
  s.src='https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(GTM_ID);document.head.append(s);
}
function gaLoad(){
  if(!GA_ID||gaOn)return;gaOn=true;
  window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};
  gtag('consent','default',{analytics_storage:window.COPPER_GA_COOKIELESS?'denied':'granted'});
  gtag('js',new Date());gtag('config',GA_ID);
  const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(GA_ID);document.head.append(s);
}
function track(name,params){if(gaOn&&window.gtag)gtag('event',name,params||{})}
function syncAn(){document.querySelectorAll('#s-an button').forEach(b=>b.classList.toggle('on',b.dataset.v===(store.get('analytics',true)?'1':'0')))}
if(!GA_ID&&!GTM_ID){const r=$('#s-an')&&$('#s-an').closest('.set');if(r)r.remove();const c=$('#cr-an');if(c)c.remove()}
else{
  $('#open-set').addEventListener('click',syncAn);
  $('#s-an').onclick=e=>{const b=e.target.closest('button');if(!b)return;const on=b.dataset.v==='1';store.set('analytics',on);
    if(on){window['ga-disable-'+GA_ID]=false;gaLoad();gtmLoad()}else{window['ga-disable-'+GA_ID]=true;toast('visit counting off')}syncAn()};
  if(store.get('analytics',true)){gaLoad();gtmLoad()}
}
