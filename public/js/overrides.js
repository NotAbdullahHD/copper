/* values the visitor set in settings > proxy win over config.js (read before the engines start) */
(()=>{try{
  const g=k=>JSON.parse(localStorage.getItem('copper.'+k));
  const l=g('liteurl'),w=g('wisp');
  if(typeof l==='string'&&/^https?:\/\//.test(l))window.COPPER_LITE=l;
  if(typeof w==='string'&&/^wss?:\/\//.test(w))window.COPPER_WISP=w;
}catch{}})();
