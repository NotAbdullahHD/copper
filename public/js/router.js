/* addresses: every page has its own path, so a page can be linked to and the back button works.
   The pages already open themselves; this mirrors that into the address bar and back again. */
const HOME = '/home';
const SEC = { games: '#gp', manga: '#mg', movies: '#mv', chat: '#ch' };
const PANEL = { account: 'account', general: 'general', appearance: 'appearance', proxy: 'proxy', cloaking: 'cloaking', panic: 'panic', credit: 'credit' };
const secEls = () => Object.keys(SEC).map(n => $(SEC[n]));
const openSec = () => Object.keys(SEC).find(n => $(SEC[n]).classList.contains('on'));

function routeNow() {
  const s = openSec();
  if (s) return s === 'movies' && window.mvPath ? window.mvPath() : '/' + s;
  if ($('#st').open) return '/settings/' + spanel;
  return HOME;
}
function setPath(p, push) {
  if (location.pathname === p) return;
  try { (push ? history.pushState : history.replaceState).call(history, null, '', p); } catch {}
}
function paintDock(p) {
  const root = '/' + String(p || routeNow()).split('/')[1];
  document.querySelectorAll('#dock .dk').forEach(b => b.classList.toggle('on', b.dataset.route === root));
}

/* replay the quiet fly-up whenever home comes back */
function pulseHome() {
  const h = $('#home');
  if (!h) return;
  h.classList.remove('in');
  void h.offsetWidth;
  h.classList.add('in');
}

/* the pages toggle their own class, so watch that instead of rewriting each page */
let syncT;
function sync() {
  clearTimeout(syncT);
  syncT = setTimeout(() => {
    const p = routeNow();
    setPath(p, true);
    paintDock(p);
    if (p === HOME) pulseHome();
  }, 0);
}

/* open whatever the address points at, using the page's own open handler */
function openPath(p, push) {
  const parts = String(p).split('/'), name = parts[1] || '', sub = parts[2] || '';
  secEls().forEach(e => e.classList.remove('on'));
  if ($('#st').open) $('#st').close();
  let out = p;
  if (name === 'settings') {
    const panel = PANEL[sub] || 'general';
    showPanel(panel);
    $('#st').showModal();
    out = '/settings/' + (PANEL[sub] ? sub : 'general');
  } else if (SEC[name]) {
    if (document.body.classList.contains('viewing')) goHome();
    if (name === 'movies' && window.mvPath) {
      /* one film has its own address inside the movies page */
      $('#mv').classList.add('on');
      if ((sub === 'movie' || sub === 'tv') && /^\d+$/.test(parts[3] || '')) { mDetail(parts[3], false, sub); out = '/movies/' + sub + '/' + parts[3]; }
      else { if (mcurId || !$('#mvbody').childElementCount) mList(false); out = '/movies'; }
    } else {
      $('#open-' + name).click();
      out = '/' + name;
    }
  } else if (name !== 'home') {
    out = HOME;
  }
  setPath(out, push !== false);
  paintDock(out);
  return out;
}

const mo = new MutationObserver(sync);
secEls().forEach(e => mo.observe(e, { attributes: true, attributeFilter: ['class'] }));
mo.observe($('#st'), { attributes: true, attributeFilter: ['open'] });

/* the dock is one page at a time: clear the rest before a button opens its own page */
$('#dock').addEventListener('click', e => {
  if (e.keepPage) return; /* the chat opens settings over itself, so it must stay open */
  const b = e.target.closest('.dk, #open-home');
  if (!b) return;
  e.preventDefault();
  if (b.id === 'open-home') {
    secEls().forEach(el => el.classList.remove('on'));
    if ($('#st').open) $('#st').close();
    if (document.body.classList.contains('viewing')) goHome();
    setPath(HOME, true);
    paintDock(HOME);
    return;
  }
  secEls().forEach(el => el.classList.remove('on'));
}, true);

/* settings sections keep their own address too */
$('#stabs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b && !openSec()) setPath('/settings/' + b.dataset.p, true);   // over a page (the chat), the address stays on that page
});

addEventListener('popstate', () => openPath(location.pathname, false));

(function boot() {
  const p = (location.pathname || '/').replace(/\/+$/, '') || '/';
  if (/^\/(home|games|manga|movies|chat|settings)(\/|$)/.test(p)) openPath(p, false);
  else { setPath(HOME, false); paintDock(HOME); }
  if (routeNow() === HOME) pulseHome();
})();
