/* settings: one category at a time */
let spanel='appearance';
function showPanel(p){spanel=p;document.querySelectorAll('#stabs button').forEach(b=>b.classList.toggle('on',b.dataset.p===p));
  document.querySelectorAll('.sp').forEach(s=>s.classList.toggle('on',s.dataset.p===p))}
$('#stabs').onclick=e=>{const b=e.target.closest('button');if(b)showPanel(b.dataset.p)};
$('#open-set').addEventListener('click',()=>showPanel(spanel));
$('#cr-contact').textContent=window.COPPER_CONTACT||'';$('#cr-contact').hidden=!window.COPPER_CONTACT;
