/* chat page: sign in / sign up, channels in categories, DMs, friends, replies, reactions, edits, emoji + GIFs,
   profiles with uploaded avatar/banner, roles, the helper bot. Talks only to ChatAPI (see chat-api.js). */
(()=>{
const ch=$('#ch'),chb=$('#chbody');
const AV=[['copper',0,1],['gold',15,1.1],['red',335,1.2],['pink',305,1.2],['purple',245,1.1],['blue',200,1.1],['teal',150,1],['green',95,.9],['ash',0,0]];
const COLORS=['#ff7b2e','#ffa31f','#ff4b4b','#ff3fa4','#a35cf6','#6d7bff','#3ecdb2','#7fd36a','#e9e3d3'];
const RANK={bot:0,member:1,og:2,vip:2,mod:3,admin:4,owner:5};
const BOT='00000000-0000-0000-0000-00000000c0b0';
const QUICK=['👍','😂','🔥','👀','🎉','💀','😮','🧡'];
const RESERVED=['admin','mod','moderator','owner','copper','system','staff','support','everyone','here','helper','bot','copperbot'];
const ROLE_LABEL={owner:'owner',admin:'admins',mod:'mods',vip:'vip',og:'og'};
const BADGE={owner:['crown','#ffb21e'],admin:['shieldok','#ff5a4e'],mod:['shield','#3ecdb2'],vip:['gem','#a35cf6'],og:['flame','#ff7b2e']};
/* icons: Lucide (lucide.dev, ISC licence), drawn on a 24 grid */
const ICON={
  dm:'<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />',
  channels:'<line x1="4" x2="20" y1="9" y2="9" /> <line x1="4" x2="20" y1="15" y2="15" /> <line x1="10" x2="8" y1="3" y2="21" /> <line x1="16" x2="14" y1="3" y2="21" />',
  friends:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /> <path d="M16 3.128a4 4 0 0 1 0 7.744" /> <path d="M22 21v-2a4 4 0 0 0-3-3.87" /> <circle cx="9" cy="7" r="4" />',
  smile:'<path d="M15 10V9" /> <path d="M16.472 15a6 6 0 01-8.943 0" /> <path d="M9 10V9" /> <circle cx="12" cy="12" r="10" />',
  send:'<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /> <path d="m21.854 2.147-10.94 10.939" />',
  search:'<path d="m21 21-4.34-4.34" /> <circle cx="11" cy="11" r="8" />',
  hash:'<line x1="4" x2="20" y1="9" y2="9" /> <line x1="4" x2="20" y1="15" y2="15" /> <line x1="10" x2="8" y1="3" y2="21" /> <line x1="16" x2="14" y1="3" y2="21" />',
  mega:'<path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /> <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" /> <path d="M8 6v8" />',
  lock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /> <path d="M7 11V7a5 5 0 0 1 10 0v4" />',
  reply:'<path d="M20 18v-2a4 4 0 0 0-4-4H4" /> <path d="m9 17-5-5 5-5" />',
  edit:'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /> <path d="m15 5 4 4" />',
  trash:'<path d="M10 11v6" /> <path d="M14 11v6" /> <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /> <path d="M3 6h18" /> <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />',
  flag:'<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" />',
  back:'<path d="m12 19-7-7 7-7" /> <path d="M19 12H5" />',
  react:'<path d="M13.267 2.08a10 10 0 108.653 8.653" /> <path d="M15 10V9" /> <path d="M16 5h6" /> <path d="M16.472 15a6 6 0 01-8.943 0" /> <path d="M19 2v6" /> <path d="M9 10V9" />',
  gear:'<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /> <circle cx="12" cy="12" r="3" />',
  crown:'<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" /> <path d="M5 21h14" />',
  shieldok:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /> <path d="m9 12 2 2 4-4" />',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />',
  gem:'<path d="M10.5 3 8 9l4 13 4-13-2.5-6" /> <path d="M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z" /> <path d="M2 9h20" />',
  flame:'<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />',
  user:'<circle cx="12" cy="8" r="5" /> <path d="M20 21a8 8 0 0 0-16 0" />',
  out:'<path d="m16 17 5-5-5-5" /> <path d="M21 12H9" /> <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />',
  x:'<path d="M18 6 6 18" /> <path d="m6 6 12 12" />',
  plus:'<path d="M5 12h14" /> <path d="M12 5v14" />'};
const icon=(n,cls='ico',px=16)=>{const s=el('span',cls);s.innerHTML=`<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]||''}</svg>`;return s};

let me=null,cats=[],chans=[],people=new Map(),online=new Set(),pmeta={},friends=[],dms=[],cur=null,msgs=[],hasMore=false,seq=0;
let unread=new Map(),mentions=new Map(),seen={},typers=new Map(),newAfter=null,newBelow=0,ment=null,lastTyping=0,offTyping=null,offAll=null;
let replyTo=null,editing=null,editDraft='',started=false,chErr='',myBan=null,collapsed=new Set(),friendTab='all',pendingRender=false;
let offScope=null,offPres=null,offFriends=null,offDms=null,panel=null;

/* ---------- small helpers ---------- */
function el(t,c,txt){const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
const rank=r=>RANK[r]==null?1:RANK[r];
const myRank=()=>me?rank(me.role):0;
const prof=id=>people.get(id)||{id,display_name:'someone',username:'?',color:'#8c8279',avatar:'ash',role:'member',bio:'',pronouns:''};
function avatar(p,size=32){
  if(typeof p==='string')p={avatar:p};
  if(p.avatar_url){const i=new Image();i.src=p.avatar_url;i.alt='';i.loading='lazy';i.referrerPolicy='no-referrer';i.className='cav up';i.style.cssText=`width:${size}px;height:${size}px`;
    i.onerror=()=>i.replaceWith(avatar({avatar:p.avatar},size));return i}
  const a=AV.find(x=>x[0]===p.avatar)||AV[0],i=new Image();i.src=$('#golem').src;i.alt='';i.className='cav';
  i.style.cssText=`width:${size*.75}px;height:${size}px;filter:hue-rotate(${a[1]}deg) saturate(${a[2]})`;return i}
function avatarDot(p,size=30){const w=el('span','pa');w.append(avatar(p,size));if(online.has(p.id)){w.append(el('i','pd'))}return w}
function roleBadge(role){
  if(role==='bot'){const s=el('span','rbot','bot');s.title='bot';return s}
  const b=BADGE[role];if(!b)return null;const s=el('span','rb');s.title=role;s.style.color=b[1];s.append(icon(b[0],'rb-i',14));return s}
const timeOf=iso=>{const d=new Date(iso),n=new Date(),t=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});return d.toDateString()===n.toDateString()?t:d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+t};
const snip=(t,n=80)=>{t=(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1)+'…':t};
const preview=m=>m.content?snip(m.content):m.gif_url?'GIF':'';
const nameEl=(p,cls)=>{const n=el('b',cls||'',p.display_name);n.style.color=p.color;return n};
const openDialog=d=>{document.body.append(d);d.showModal();document.activeElement&&document.activeElement.blur()};
const dialog=(title,cls='wide')=>{const d=el('dialog',cls);d.append(Object.assign(el('div','dh'),{innerHTML:`<h3></h3><button class="ib" type="button">×</button>`}));
  d.querySelector('h3').textContent=title;d.querySelector('button').onclick=()=>d.close();d.onclose=()=>d.remove();return d};
const rel=id=>{const f=friends.find(f=>f.requester===id||f.addressee===id);return !f?null:f.status==='accepted'?{s:'friends',f}:f.requester===me.id?{s:'out',f}:{s:'in',f}};
const dmOther=d=>d.user_a===me.id?d.user_b:d.user_a;
const dmUnread=d=>{const mine=d.user_a===me.id?d.a_read_at:d.b_read_at;return !!(d.last_sender&&d.last_sender!==me.id&&d.last_message_at&&(!mine||new Date(d.last_message_at)>new Date(mine)))};
const pendingIn=()=>friends.filter(f=>f.status==='pending'&&f.addressee===me.id);
const canSeeChan=c=>myRank()>=c.read_rank;
const sc=()=>cur.t==='dm'?{dm:cur.d.id}:{channel:cur.c.id};
const bar=n=>chb.querySelector(n);
const guard=fn=>async()=>{try{await fn()}catch(e){toast(e.message,3000)}};
const reloadFriends=async()=>{friends=await ChatAPI.friendships();renderLeft();if(cur&&cur.t==='friends')renderFriends()};

/* ---------- opening and closing ---------- */
$('#open-chat').onclick=openChat;
$('#ch-back').onclick=closeChat;
$('#ch-members').onclick=()=>{chb.classList.remove('show-left');chb.classList.toggle('show-members')};
$('#ch-menu').onclick=()=>{chb.classList.remove('show-members');chb.classList.toggle('show-left')};
addEventListener('keydown',e=>{if(e.key==='Escape'&&ch.classList.contains('on')&&!document.querySelector('dialog[open]')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){if(panel)closePanel();else closeChat()}});
function unsub(){[offScope,offPres,offFriends,offDms,offAll].forEach(f=>f&&f());offScope=offPres=offFriends=offDms=offAll=null;if(offTyping){offTyping.off();offTyping=null}}
function closeChat(){closePanel();closeMent();if(me&&cur&&cur.t==='channel')markSeen(cur.c.id);ch.classList.remove('on');unsub()}   // free the connections while the page is closed
async function openChat(){
  ch.classList.add('on');
  if(!started){started=true;return boot()}
  if(me)resume();
}
async function boot(){
  if(!ChatAPI.configured){chb.replaceChildren(empty("chat isn't switched on yet"));return}
  chb.replaceChildren(empty('connecting…'));
  try{me=await ChatAPI.start()}catch(e){started=false;return chb.replaceChildren(empty(e.message,boot))}
  if(!me)return showAuth();
  enter();
}
async function loadAll(){
  const [c,k,,f,d]=await Promise.all([ChatAPI.categories(),ChatAPI.channels(),refreshPeople(),ChatAPI.friendships(),ChatAPI.dms()]);
  cats=c;chans=k;friends=f;dms=d;
  myBan=await ChatAPI.myBan().catch(()=>null);
  await loadUnread();
}
async function enter(first){
  try{await loadAll()}catch(e){started=false;return chb.replaceChildren(empty(e.message,boot))}
  layout();connect();
  go({t:'channel',c:chans.find(c=>c.name==='general')||chans.find(canSeeChan)||chans[0]});
  if(first)openAccountSettings(true);
}
async function resume(){ // coming back to the chat page after closing it
  try{await loadAll()}catch(e){return toast(e.message,3000)}
  renderLeft();connect();
  if(cur&&cur.t==='channel')cur.c=chans.find(c=>c.id===cur.c.id)||chans[0];
  go(cur&&cur.t==='dm'?{t:'dm',d:dms.find(d=>d.id===cur.d.id)||cur.d}:cur||{t:'channel',c:chans[0]});
}
async function refreshPeople(){(await ChatAPI.members()).forEach(p=>people.set(p.id,p));if(me&&people.has(me.id))me=people.get(me.id)}
function empty(msg,retry){const d=el('div','mg-empty',msg);if(retry){const b=el('button','mg-btn','try again');b.onclick=retry;d.append(document.createElement('br'),b)}return d}

/* ---------- live connections ---------- */
function connect(){
  unsub();
  online=new Set([BOT]);
  offPres=ChatAPI.presence(me,m=>{pmeta=m;online=new Set([...Object.keys(m),BOT]);renderMembers();renderLeft();counts()},{st:myStatus()});
  offAll=ChatAPI.onAll(onAny);
  offFriends=ChatAPI.onFriends(async()=>{
    const before=new Set(pendingIn().map(f=>f.id));
    try{friends=await ChatAPI.friendships()}catch{return}
    if(friends.some(f=>!people.has(f.requester)||!people.has(f.addressee)))await refreshPeople().catch(()=>{});
    pendingIn().filter(f=>!before.has(f.id)).forEach(f=>toast(prof(f.requester).display_name+' sent you a friend request',3000));
    renderLeft();if(cur&&cur.t==='friends')renderFriends();
  });
  offDms=ChatAPI.onDms(async row=>{
    const i=dms.findIndex(d=>d.id===row.id),old=i>=0?dms[i]:null;
    if(i>=0)dms[i]={...old,...row};else dms.push(row);
    const d=dms.find(d=>d.id===row.id);
    if(cur&&cur.t==='dm'&&cur.d.id===d.id){cur.d=d;if(d.last_sender!==me.id)markRead(d)}
    else if(d.last_sender&&d.last_sender!==me.id&&(!old||old.last_message_at!==d.last_message_at)){
      if(!people.has(d.last_sender))await refreshPeople().catch(()=>{});toast('new message from '+prof(d.last_sender).display_name,2500)}
    renderLeft();
  });
}
function markRead(d){const k=d.user_a===me.id?'a_read_at':'b_read_at';d[k]=new Date().toISOString();ChatAPI.markDmRead(d.id).catch(()=>{});renderLeft()}

/* ---------- sign in / sign up (nothing else on this page, everything else happens inside) ---------- */
function showAuth(target=chb,done){
  let mode='in';
  const box=el('div','setup auth');
  const draw=()=>{
    const up=mode==='up';
    const tabs=el('div','seg');[['in','sign in'],['up','sign up']].forEach(([k,t])=>{const b=el('button',k===mode?'on':'',t);b.type='button';b.onclick=()=>{mode=k;draw()};tabs.append(b)});
    const f=el('form','pf');f.noValidate=true;
    const row=(label,node,hint)=>{const w=el('label','pf-row');w.append(el('span','',label),node);if(hint)w.append(el('small','pf-hint',hint));return w};
    const un=el('input');un.placeholder='username';un.maxLength=20;un.autocomplete='username';un.autocapitalize='off';un.spellcheck=false;
    const pw=el('input');pw.type='password';pw.placeholder=up?'at least 8 characters':'password';pw.autocomplete=up?'new-password':'current-password';
    const em=el('input');em.type='email';em.placeholder='you@example.com';em.autocomplete='email';
    const show=el('label','pf-show');const cb=el('input');cb.type='checkbox';cb.onchange=()=>pw.type=cb.checked?'text':'password';show.append(cb,' show password');
    const err=el('p','pf-err'),go=el('button','mg-btn pri',up?'create account':'sign in');go.type='submit';
    f.append(row('username',un,up?'3-20 letters, numbers or _ · cannot be changed later':null),
      ...(up?[row('email (optional)',em,'only used to recover your password. never shown to anyone')]:[]),
      row('password',pw),show,err,go);
    f.onsubmit=async e=>{e.preventDefault();err.textContent='';
      const u=un.value.trim().toLowerCase(),p=pw.value,m=em.value.trim();
      if(!/^[a-z0-9_]{3,20}$/.test(u))return err.textContent='username: 3-20 letters, numbers or _';
      if(up&&RESERVED.includes(u))return err.textContent='that username is reserved';
      if(up&&p.length<8)return err.textContent='password: at least 8 characters';
      if(!p)return err.textContent='enter your password';
      if(up&&m&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m))return err.textContent="that email doesn't look right (or leave it empty)";
      go.disabled=true;go.textContent='one sec…';
      try{me=up?await ChatAPI.signUp({username:u,password:p,email:m}):await ChatAPI.signIn({username:u,password:p});
        if(!me)throw new Error('could not load your account, try again');
        people.set(me.id,me);done?done(up):enter(up)}
      catch(x){err.textContent=x.message;go.disabled=false;go.textContent=up?'create account':'sign in'}};
    box.replaceChildren(el('h2','',up?'join Copper chat':'welcome back'),
      el('p','hint',up?'One account per person. You can make your avatar, banner and bio after you are in. Keep real names, schools and addresses out of chat.':'Sign in with your username and password.'),
      tabs,f,
      el('p','hint small',up?'Forgot your password later? Without an email, a staff member has to reset it for you.':'No account yet? Use the sign up tab.'));
    un.focus();
  };
  draw();target.replaceChildren(box);
}

/* ---------- profile card (used in someone's popup and in the settings preview) ---------- */
function profileCard(p,live){
  const c=el('div','pc'),top=el('div','pc-banner');
  if(p.banner_url){const i=new Image();i.src=p.banner_url;i.alt='';i.referrerPolicy='no-referrer';i.onerror=()=>i.remove();top.append(i)}
  else top.style.background=`linear-gradient(120deg,${p.color}66,${p.color}11 70%)`;
  const av=el('div','pc-av');av.append(avatarDot(p,72));
  const body=el('div','pc-body'),nm=el('div','pc-name');nm.append(nameEl(p));const rb=roleBadge(p.role);if(rb)nm.append(rb);
  const sub=el('div','pc-sub','@'+p.username+(p.pronouns?' · '+p.pronouns:''));
  body.append(nm,sub);
  if(p.bio||live)body.append(el('p','pc-bio',p.bio||'your bio shows here'));
  if(p.created_at)body.append(el('small','pc-join','member since '+new Date(p.created_at).toLocaleDateString([],{year:'numeric',month:'short',day:'numeric'})+(p.role&&p.role!=='member'?' · '+p.role:'')));
  c.append(top,av,body);return c;
}

/* ---------- image helpers for uploads ---------- */
async function cropImage(file,w,h,q=.86){
  if(!/^image\/(png|jpe?g|webp|gif)$/.test(file.type))throw new Error('pick a png, jpg, webp or gif image');
  if(file.size>12e6)throw new Error('that image is too big (max 12 MB)');
  let bmp;try{bmp=await createImageBitmap(file)}catch{throw new Error("couldn't read that image")}
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
  const s=Math.max(w/bmp.width,h/bmp.height),dw=bmp.width*s,dh=bmp.height*s;
  x.imageSmoothingQuality='high';x.drawImage(bmp,(w-dw)/2,(h-dh)/2,dw,dh);   // centered crop, so any picture fits
  let blob=await new Promise(r=>c.toBlob(r,'image/webp',q));
  if(!blob||blob.type!=='image/webp')blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q));
  return blob;
}

/* ---------- your account lives in Settings > account (nothing separate inside chat) ---------- */
let accUrls=[],accWelcome=false;
function openAccountSettings(welcome=false){
  accWelcome=welcome;
  const ev=new MouseEvent('click',{bubbles:true});ev.keepPage=true;   // runs the normal settings open, and the router leaves the chat page open behind it
  $('#open-set').dispatchEvent(ev);showPanel('account');
}
window.renderAccountPanel=box=>{box.replaceChildren(empty('loading…'));renderAccount(box)};
async function renderAccount(box){
  accUrls.forEach(u=>URL.revokeObjectURL(u));accUrls=[];
  if(!ChatAPI.configured)return box.replaceChildren(empty("chat isn't switched on yet, so there are no accounts"));
  if(!me){
    try{me=await ChatAPI.start()}catch(e){return box.replaceChildren(empty(e.message,()=>renderAccount(box)))}
    if(me)await refreshPeople().catch(()=>{});
  }
  if(!me)return showAuth(box,up=>{
    if(ch.classList.contains('on'))enter(false);else started=false;   // the chat page builds itself when it is opened
    accWelcome=up;renderAccount(box)});
  drawAccountPanel(box);
}
function drawAccountPanel(box){
  const v={display_name:me.display_name,pronouns:me.pronouns||'',bio:me.bio||'',color:me.color,avatar:me.avatar,avatar_url:me.avatar_url||null,banner_url:me.banner_url||null};
  const pend={avatar:null,banner:null};   // a new image (Blob) or 'remove'
  const row=(label,hint,...ctl)=>{const r=el('div','set ac'),l=el('div','ac-l');l.append(el('b','',label));if(hint)l.append(el('small','',hint));const c=el('div','ac-c');c.append(...ctl);r.append(l,c);return r};
  const pvBox=el('div','ac-pv'),form=el('form','ac-form');
  const dn=el('input');dn.value=v.display_name;dn.maxLength=24;dn.placeholder='what people see';
  const pr=el('input');pr.value=v.pronouns;pr.maxLength=24;pr.placeholder='she/her, he/him…';
  const bio=el('textarea');bio.value=v.bio;bio.maxLength=190;bio.rows=3;bio.placeholder='a few words about you';
  const cnt=el('small','ac-cnt','');
  const sw=el('div','swatches');COLORS.forEach(c=>{const b=el('button','sw');b.type='button';b.style.background=c;b.title=c;b.onclick=()=>{v.color=c;refresh()};sw.append(b)});
  const gl=el('div','swatches');AV.forEach(a=>{const b=el('button','sw av');b.type='button';b.title=a[0]+' golem';b.append(avatar({avatar:a[0]},26));b.onclick=()=>{v.avatar=a[0];v.avatar_url=null;pend.avatar=me.avatar_url?'remove':null;refresh()};gl.append(b)});
  const pick=(kind,w,h)=>{const f=el('input');f.type='file';f.accept='image/png,image/jpeg,image/webp,image/gif';f.hidden=true;
    f.onchange=async()=>{const file=f.files[0];f.value='';if(!file)return;
      try{const blob=await cropImage(file,w,h);pend[kind]=blob;const u=URL.createObjectURL(blob);accUrls.push(u);v[kind+'_url']=u;refresh()}catch(e){toast(e.message,3000)}};
    const up=el('button','mg-btn','upload');up.type='button';up.onclick=()=>f.click();
    const rm=el('button','mg-btn','remove');rm.type='button';rm.onclick=()=>{pend[kind]='remove';v[kind+'_url']=null;refresh()};
    const r=el('div','ac-btns');r.append(up,rm,f);r.rm=rm;return r};
  const avUp=pick('avatar',256,256),bnUp=pick('banner',960,320);
  const err=el('p','pf-err'),save=el('button','mg-btn pri','save changes');save.type='submit';
  const bioRow=row('bio','A few words about you, up to 190 characters.');bioRow.classList.add('stack');bioRow.append(bio,cnt);
  const avCtl=el('div','ac-col');avCtl.append(avUp,gl);
  form.append(row('display name','Shown above your username.',dn),row('pronouns','Optional.',pr),bioRow,row('name color','Your name in chat.',sw),
    row('profile picture','Cropped to a square. Or pick a golem.',avCtl),row('banner','Cropped to a wide 3:1 strip.',bnUp),el('div','ac-save'),);
  form.lastChild.append(err,save);
  const refresh=()=>{
    sw.querySelectorAll('.sw').forEach((b,i)=>b.classList.toggle('on',COLORS[i]===v.color));
    gl.querySelectorAll('.sw').forEach((b,i)=>b.classList.toggle('on',AV[i][0]===v.avatar&&!v.avatar_url));
    avUp.rm.style.display=v.avatar_url?'':'none';bnUp.rm.style.display=v.banner_url?'':'none';
    cnt.textContent=bio.value.length+'/190';
    pvBox.replaceChildren(profileCard({...me,...v,display_name:dn.value.trim()||'your name',pronouns:pr.value.trim(),bio:bio.value.trim()},true));
  };
  [dn,pr,bio].forEach(i=>i.oninput=refresh);refresh();
  form.onsubmit=async e=>{e.preventDefault();err.textContent='';
    const name=dn.value.trim();if(!name)return err.textContent='pick a display name';
    save.disabled=true;save.textContent='saving…';
    try{
      let au=me.avatar_url||null,bu=me.banner_url||null;const old=[];
      if(pend.avatar instanceof Blob){old.push(au);au=await ChatAPI.uploadImage('avatars',pend.avatar)}else if(pend.avatar==='remove'){old.push(au);au=null}
      if(pend.banner instanceof Blob){old.push(bu);bu=await ChatAPI.uploadImage('banners',pend.banner)}else if(pend.banner==='remove'){old.push(bu);bu=null}
      me=await ChatAPI.updateProfile({display_name:name,pronouns:pr.value.trim(),bio:bio.value.trim(),color:v.color,avatar:v.avatar,avatar_url:au,banner_url:bu});
      old.filter(Boolean).forEach(u=>ChatAPI.removeImage(u).catch(()=>{}));
      people.set(me.id,me);accWelcome=false;
      if(chb.querySelector('.cl-left')){renderLeft();renderMembers();renderMsgs()}
      pend.avatar=pend.banner=null;Object.assign(v,{avatar_url:me.avatar_url,banner_url:me.banner_url});toast('profile saved');refresh();
    }catch(x){err.textContent=x.message}finally{save.disabled=false;save.textContent='save changes'}};

  /* sign-in details */
  const em=el('input');em.type='email';em.placeholder='you@example.com';em.autocomplete='email';
  ChatAPI.myRecoveryEmail().then(e=>em.value=e).catch(()=>{});
  const saveEm=el('button','mg-btn','save');saveEm.type='button';saveEm.onclick=async()=>{try{await ChatAPI.setRecoveryEmail(em.value.trim());toast('email saved')}catch(x){toast(x.message,3000)}};
  const emC=el('div','ac-btns');emC.append(em,saveEm);
  const op=el('input');op.type='password';op.placeholder='current password';op.autocomplete='current-password';
  const np=el('input');np.type='password';np.placeholder='new password (8+ characters)';np.autocomplete='new-password';
  const chg=el('button','mg-btn','change password');chg.type='button';chg.onclick=async()=>{
    if(np.value.length<8)return toast('new password: at least 8 characters',2500);
    try{await ChatAPI.changePassword(op.value,np.value);op.value=np.value='';toast('password changed')}catch(x){toast(x.message,3000)}};
  const pwC=el('div','ac-col');pwC.append(op,np,chg);
  const out=el('button','mg-btn','log out');out.type='button';out.onclick=signOut;
  const del=el('button','mg-btn warn','delete account');del.type='button';
  del.onclick=async()=>{if(!confirm('Delete your account, messages, friends and DMs? This cannot be undone.'))return;
    try{await ChatAPI.deleteMe();location.reload()}catch(x){toast(x.message,3500)}};
  const acts=el('div','ac-btns');acts.append(out,del);

  box.replaceChildren(
    ...(accWelcome?[el('p','hint ac-welcome','Welcome to Copper chat! Make it yours. Everything here is optional and you can change it any time.')]:[]),
    pvBox,form,
    el('h4','ac-h','sign-in details'),
    row('recovery email','Only you can see it. Used to get back in if you forget your password.',emC),
    row('password','Change it any time.',pwC),
    row('session','Deleting removes your account, messages, friends, DMs and pictures for good.',acts));
}
async function signOut(){
  document.querySelectorAll('dialog[open]:not(#st)').forEach(d=>d.close());unsub();closePanel();
  try{await ChatAPI.signOut()}catch{}
  me=null;people.clear();friends=[];dms=[];cur=null;msgs=[];unread.clear();mentions.clear();seen={};pmeta={};started=true;showAuth();$('#ch-counts').textContent='';
  const sp=$('#sp-account');if(sp&&$('#st').open)renderAccount(sp);
}

/* ---------- layout ---------- */
function layout(){
  const left=el('aside','cl-left'),main=el('div','cl-main'),right=el('aside','cl-right');
  const back=el('button','ib cl-back');back.type='button';back.title='back to Copper';back.append(icon('back'));back.onclick=closeChat;
  const tt=el('div','cl-title');tt.append(el('b','','copper'));const cn=el('small','');cn.id='cl-counts';tt.append(cn);
  const top=el('div','cl-top');top.append(back,tt);
  left.append(top,el('div','cl-scroll'),el('div','cl-me'));
  const chat=el('div','cl-chat'),head=el('div','cl-head'),list=el('div','cmsgs'),jump=el('button','cl-jump','new messages ↓'),rep=el('div','cl-reply'),notice=el('div','cl-notice'),typ=el('div','cl-typing'),bb=el('div','cl-bar'),box=el('div','cl-box'),inp=el('textarea');
  inp.rows=1;inp.maxLength=500;inp.id='ch-in';inp.autocomplete='off';const count=el('small','cl-count','');jump.type='button';
  const gifB=el('button','cb gifb','GIF');gifB.type='button';gifB.title='send a GIF';gifB.onclick=e=>{e.stopPropagation();openPanel('gif')};
  const emoB=el('button','cb');emoB.type='button';emoB.title='emoji';emoB.append(icon('smile'));emoB.onclick=e=>{e.stopPropagation();openPanel('emoji')};
  const sendB=el('button','cb sendb');sendB.type='button';sendB.title='send';sendB.append(icon('send'));sendB.onclick=()=>send();
  box.append(inp,count,gifB,emoB,sendB);bb.append(box);
  chat.append(head,list,jump,rep,notice,typ,bb);
  main.append(chat,el('div','cl-friends'));
  right.append(el('div','cl-people'));
  chb.replaceChildren(left,main,right);chb.classList.remove('show-members','show-left');
  inp.onkeydown=e=>{
    if(ment){
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();ment.i=(ment.i+(e.key==='ArrowDown'?1:-1)+ment.items.length)%ment.items.length;drawMent();return}
      if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();pickMent(ment.items[ment.i]);return}
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMent();return}
    }
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}
    if(e.key==='Escape'){if(panel)closePanel();else if(replyTo){replyTo=null;renderReply()}}};
  inp.oninput=()=>{
    count.textContent=inp.value.length>400?inp.value.length+'/500':'';inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,140)+'px';
    mentionCheck(inp);
    if(inp.value.trim()&&inp.value[0]!=='/'&&offTyping&&Date.now()-lastTyping>2500){lastTyping=Date.now();offTyping.send()}};
  inp.onblur=()=>setTimeout(closeMent,150);
  list.addEventListener('click',e=>{ // tap a message to show its tools on touch screens
    if(!matchMedia('(hover:none)').matches)return;const row=e.target.closest('.cm');if(!row||e.target.closest('button,a,textarea'))return;
    const was=row.classList.contains('open');list.querySelectorAll('.cm.open').forEach(x=>x.classList.remove('open'));if(!was)row.classList.add('open')});
  list.addEventListener('scroll',()=>{if(nearEnd(list)){newBelow=0;jump.classList.remove('on')}},{passive:true});
  jump.onclick=()=>{list.scrollTop=list.scrollHeight;newBelow=0;jump.classList.remove('on')};
  renderLeft();
}
const nearEnd=b=>b.scrollHeight-b.scrollTop-b.clientHeight<140;

/* ---------- unread dots and @mentions (what happened while you were elsewhere) ---------- */
const seenKey=()=>'copper.chat.seen.'+(me&&me.id);
function loadSeen(){try{return JSON.parse(localStorage.getItem(seenKey())||'{}')||{}}catch{return{}}}
function saveSeen(){try{localStorage.setItem(seenKey(),JSON.stringify(seen))}catch{}}
function markSeen(id){seen[id]=new Date().toISOString();unread.delete(id);mentions.delete(id);saveSeen()}
const mentionsMe=t=>!!(me&&t&&new RegExp('(^|[^a-z0-9_])@'+me.username+'(?![a-z0-9_])','i').test(t));
async function loadUnread(){
  seen=loadSeen();unread.clear();mentions.clear();
  const now=new Date().toISOString();let fresh=false;
  chans.forEach(k=>{if(!seen[k.id]){seen[k.id]=now;fresh=true}});   // a channel you have never opened starts out read
  const rows=await ChatAPI.recent().catch(()=>[]);
  rows.forEach(r=>{if(r.user_id===me.id)return;const at=seen[r.channel_id];if(!at||new Date(r.created_at)<=new Date(at))return;
    unread.set(r.channel_id,(unread.get(r.channel_id)||0)+1);if(mentionsMe(r.content))mentions.set(r.channel_id,(mentions.get(r.channel_id)||0)+1)});
  if(fresh)saveSeen();
}
async function onAny(r){
  if(!me||r.user_id===me.id)return;
  if(cur&&cur.t==='channel'&&cur.c.id===r.channel_id)return;
  const k=chans.find(c=>c.id===r.channel_id);if(!k)return;
  unread.set(k.id,(unread.get(k.id)||0)+1);
  if(mentionsMe(r.content)){
    mentions.set(k.id,(mentions.get(k.id)||0)+1);
    if(!people.has(r.user_id))await refreshPeople().catch(()=>{});
    toast(prof(r.user_id).display_name+' mentioned you in #'+k.name,3000);
  }
  renderLeft();
}

/* ---------- status (the short line under your name) ---------- */
const myStatus=()=>{try{return(localStorage.getItem('copper.chat.status')||'').slice(0,40)}catch{return''}};
function setStatus(t){try{localStorage.setItem('copper.chat.status',t)}catch{}if(offPres&&offPres.update)offPres.update({st:t});pmeta[me.id]={st:t};renderLeft();renderMembers()}
function openStatus(){
  const d=dialog('your status','st'),b=el('div','st-body'),inp=el('input');inp.maxLength=40;inp.placeholder='what are you up to?';inp.value=myStatus();
  const save=v=>{setStatus(v.trim());d.close();toast(v.trim()?'status updated':'status cleared')};
  const chips=el('div','st-chips');['playing games','studying','on a break','afk','building something','listening to music'].forEach(t=>{const c=el('button','mg-btn',t);c.type='button';c.onclick=()=>save(t);chips.append(c)});
  const row=el('div','st-row'),ok=el('button','mg-btn pri','save');ok.type='button';ok.onclick=()=>save(inp.value);
  const clr=el('button','mg-btn','clear');clr.type='button';clr.onclick=()=>save('');
  const prof_=el('button','mg-btn','edit profile');prof_.type='button';prof_.onclick=()=>{d.close();openAccountSettings()};
  inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();save(inp.value)}};
  row.append(ok,clr,prof_);b.append(el('p','hint','Shown under your name in the member list while you are online. Everyone in chat can see it.'),inp,chips,row);
  d.append(b);openDialog(d);inp.focus();
}

/* ---------- left side: friends, channels in categories, direct messages ---------- */
function chanIcon(k){return k.read_rank>=2?'lock':(k.write_rank>=3?'mega':'hash')}
function renderLeft(){
  const s=bar('.cl-scroll'),m=bar('.cl-me');if(!s||!me)return;
  const keep=s.scrollTop,pend=pendingIn().length,parts=[];
  const fr=el('button','chn fr'+(cur&&cur.t==='friends'?' on':''));fr.append(icon('friends'),el('span','nm','friends'));if(pend)fr.append(el('em','pill',String(pend)));fr.onclick=()=>go({t:'friends'});parts.push(fr);
  channelPanel(parts);dmPanel(parts);
  s.replaceChildren(...parts);s.scrollTop=keep;
  const info=el('div','cl-meinfo'),line=el('div','cl-line');line.append(nameEl(me));const rb=roleBadge(me.role);if(rb)line.append(rb);
  info.append(line,el('small','st',myStatus()||'online'));
  const gear=el('button','ib');gear.append(icon('gear'));gear.title='settings';gear.onclick=()=>openAccountSettings();
  const who=el('button','cl-who');who.append(avatarDot(me,34),info);who.onclick=openStatus;who.title='set your status';
  m.replaceChildren(who,gear);
}
function channelPanel(parts){
  cats.forEach(c=>{
    const list=chans.filter(k=>k.category_id===c.id&&canSeeChan(k));if(!list.length)return;
    const shut=collapsed.has(c.id),h=el('button','cl-cat'+(shut?' shut':''),c.name);
    h.onclick=()=>{shut?collapsed.delete(c.id):collapsed.add(c.id);renderLeft()};parts.push(h);
    list.forEach(k=>{
      const here=cur&&cur.t==='channel'&&cur.c.id===k.id,un=unread.get(k.id)||0,mn=mentions.get(k.id)||0;
      if(shut&&!here&&!un)return;   // a closed category still shows what needs you
      const b=el('button','chn'+(here?' on':'')+(un?' unread':''));b.title=k.topic||'';
      b.append(icon(chanIcon(k)),el('span','nm',k.name));
      if(mn)b.append(el('em','pill ping',String(mn)));
      b.onclick=()=>go({t:'channel',c:k});parts.push(b);
    });
  });
}
function dmPanel(parts){
  const sorted=[...dms].sort((a,b)=>(b.last_message_at||'').localeCompare(a.last_message_at||''));
  const h=el('div','cl-cat static','direct messages');parts.push(h);
  if(!sorted.length)parts.push(el('p','cl-none','nothing yet. add a friend, then message them from their profile'));
  sorted.forEach(d=>{const p=prof(dmOther(d)),u=dmUnread(d),b=el('button','chn dm'+(cur&&cur.t==='dm'&&cur.d.id===d.id?' on':'')+(u?' unread':''));
    b.append(avatarDot(p,26),el('span','nm',p.display_name));const rb=roleBadge(p.role);if(rb)b.append(rb);if(u)b.append(el('em','dot'));
    b.onclick=()=>go({t:'dm',d});parts.push(b)});
}
function counts(){
  const n=[...online].filter(id=>people.has(id)&&prof(id).role!=='bot').length,t=[...people.values()].filter(p=>p.role!=='bot').length;
  const txt=`${n} online · ${t} member${t===1?'':'s'}`;
  $('#ch-counts').textContent=txt;const c=$('#cl-counts');if(c)c.textContent=txt;
}

/* ---------- going somewhere (channel, DM or friends page) ---------- */
async function go(t){
  const my=++seq;cur=t;chb.classList.remove('show-left','show-members');closePanel();closeMent();
  if(offScope){offScope();offScope=null}
  if(offTyping){offTyping.off();offTyping=null}
  typers.forEach(x=>clearTimeout(x));typers.clear();newBelow=0;
  replyTo=null;editing=null;msgs=[];hasMore=false;
  if(t.t==='channel'){newAfter=seen[t.c.id]||null;markSeen(t.c.id)}else newAfter=null;
  renderLeft();
  chb.dataset.view=t.t==='friends'?'friends':'chat';
  if(t.t==='friends'){renderFriends();return}
  renderHead();updateComposer();renderReply();renderTyping();renderMsgs();
  const s=sc();
  try{msgs=await ChatAPI.messages(s);if(my!==seq)return;hasMore=msgs.length>=60}catch(e){chErr=e.message}
  if(msgs.some(m=>!people.has(m.user_id)))await refreshPeople().catch(()=>{});
  if(my!==seq)return;
  renderMsgs(true);
  offScope=ChatAPI.onScope(s,ev=>onEvent(my,ev));
  offTyping=ChatAPI.typing(t.t==='dm'?'d'+t.d.id:'c'+t.c.id,id=>onTyping(my,id));
  if(t.t==='dm'&&dmUnread(t.d))markRead(t.d);
  const inp=$('#ch-in');if(inp&&!inp.disabled&&!matchMedia('(hover:none)').matches)inp.focus();
}
function renderHead(){
  const head=bar('.cl-head');if(!head)return;
  if(cur.t==='dm'){const p=prof(dmOther(cur.d));const n=nameEl(p);n.onclick=()=>profilePopup(p.id);head.replaceChildren(avatarDot(p,26),n,el('span','',' @'+p.username+(p.role==='bot'?' · answers every message':'')));return}
  const k=cur.c,ic=icon(chanIcon(k),'ico hi');
  const tog=el('button','ib cl-mtog');tog.type='button';tog.title='show or hide members';tog.append(icon('friends'));tog.onclick=()=>chb.classList.toggle('hide-members');
  head.replaceChildren(ic,el('b','',k.name),...(k.topic?[el('i','sep'),el('span','',k.topic)]:[]),Object.assign(el('span','sp'),{}),tog);
}
function canPostHere(){
  if(myBan)return 'you are '+(myBan.until?'timed out until '+new Date(myBan.until).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'banned')+(myBan.reason?' · '+myBan.reason:'');
  if(cur.t==='channel'){if(cur.c.write_rank>=99)return 'only the bot posts here';if(myRank()<cur.c.write_rank)return 'only '+(cur.c.write_rank>=3?'staff':'og and vip members')+' can post here'}
  else{const o=dmOther(cur.d);if(prof(o).role!=='bot'&&!(rel(o)&&rel(o).s==='friends'))return "you are not friends anymore, so this dm is read-only"}
  return '';
}
function updateComposer(){
  const inp=$('#ch-in'),why=canPostHere();if(!inp)return;
  inp.disabled=!!why;inp.placeholder=why?why:cur.t==='dm'?'Message @'+prof(dmOther(cur.d)).username:'Message #'+cur.c.name;
  chb.querySelectorAll('.cl-bar .cb').forEach(b=>b.disabled=!!why);
  bar('.cl-box').classList.toggle('off',!!why);
  bar('.cl-notice').textContent=why&&myBan?why:'';bar('.cl-notice').style.display=why&&myBan?'block':'none';
}

/* ---------- typing ---------- */
function onTyping(my,id){
  if(my!==seq||id===me.id)return;
  clearTimeout(typers.get(id));typers.set(id,setTimeout(()=>{typers.delete(id);renderTyping()},5000));renderTyping();
}
function renderTyping(){
  const t=bar('.cl-typing');if(!t)return;
  const n=[...typers.keys()].map(id=>prof(id).display_name);
  t.textContent=!n.length?'':n.length===1?n[0]+' is typing…':n.length===2?n[0]+' and '+n[1]+' are typing…':'several people are typing…';
  t.classList.toggle('on',n.length>0);
}

/* ---------- @mention suggestions while typing ---------- */
function mentionCheck(inp){
  if(!cur||cur.t==='friends')return closeMent();
  const pos=inp.selectionStart??inp.value.length,m=/(^|[^a-z0-9_])@([a-z0-9_]{0,20})$/i.exec(inp.value.slice(0,pos));
  if(!m)return closeMent();
  const q=m[2].toLowerCase(),start=pos-m[2].length-1;
  const items=[...people.values()].filter(p=>p.id!==me.id&&(p.username.includes(q)||p.display_name.toLowerCase().includes(q)))
    .sort((a,b)=>(b.username.startsWith(q)-a.username.startsWith(q))||(online.has(b.id)-online.has(a.id))||a.username.localeCompare(b.username)).slice(0,6);
  if(!items.length)return closeMent();
  ment={items,i:0,start,end:pos};drawMent();
}
function drawMent(){
  const chat=bar('.cl-chat');if(!chat||!ment)return;
  let pop=chat.querySelector('.cl-ment');if(!pop){pop=el('div','cl-ment');chat.append(pop)}
  pop.replaceChildren(...ment.items.map((p,i)=>{const b=el('button',i===ment.i?'on':'');b.type='button';b.append(avatarDot(p,22),nameEl(p),el('small','','@'+p.username));
    b.onmousedown=e=>{e.preventDefault();pickMent(p)};return b}));
}
function closeMent(){ment=null;const p=document.querySelector('.cl-ment');if(p)p.remove()}
function pickMent(p){
  const inp=$('#ch-in');if(!inp||!ment||!p)return;
  const v=inp.value,add='@'+p.username+' ';inp.value=v.slice(0,ment.start)+add+v.slice(ment.end);
  const at=ment.start+add.length;closeMent();inp.focus();inp.setSelectionRange(at,at);inp.dispatchEvent(new Event('input'));
}

/* ---------- messages ---------- */
const byId=id=>msgs.find(m=>m.id===id);
const byName=u=>{u=u.toLowerCase();for(const p of people.values())if(p.username===u)return p;return null};
async function onEvent(my,ev){
  if(my!==seq)return;const r=ev.row;let fresh=false;
  if(ev.type==='message'){
    if(!people.has(r.user_id))await refreshPeople().catch(()=>{});
    const i=msgs.findIndex(m=>m.id===r.id);
    if(i>=0)msgs[i]={...msgs[i],...r,reactions:msgs[i].reactions,reply:msgs[i].reply};
    else{const n={...r,reactions:[],reply:null};
      if(r.reply_to){const q=byId(r.reply_to);n.reply=q?{id:q.id,user_id:q.user_id,content:q.content,deleted:q.deleted,gif_url:q.gif_url}:await ChatAPI.message(r.reply_to).catch(()=>null)}
      if(!msgs.some(m=>m.id===r.id)){msgs.push(n);fresh=true}
      if(typers.has(r.user_id)){clearTimeout(typers.get(r.user_id));typers.delete(r.user_id);renderTyping()}
      if(cur.t==='dm'&&r.user_id!==me.id)markRead(cur.d);
      if(cur.t==='channel'){seen[cur.c.id]=new Date().toISOString();saveSeen()}}
  }else{
    const m=byId(r.message_id);if(!m)return;
    const has=m.reactions.some(x=>x.user_id===r.user_id&&x.emoji===r.emoji);
    if(r.active&&!has)m.reactions=[...m.reactions,{user_id:r.user_id,emoji:r.emoji}];
    if(!r.active&&has)m.reactions=m.reactions.filter(x=>!(x.user_id===r.user_id&&x.emoji===r.emoji));
  }
  if(editing){pendingRender=true;return}
  const box=bar('.cmsgs'),near=nearEnd(box)||r.user_id===me.id;renderMsgs(near);
  if(fresh&&!near){newBelow++;const j=bar('.cl-jump');j.textContent=newBelow+(newBelow===1?' new message ↓':' new messages ↓');j.classList.add('on')}
}
const dayLabel=d=>{const n=new Date(),y=new Date(n-864e5);return d.toDateString()===n.toDateString()?'Today':d.toDateString()===y.toDateString()?'Yesterday':d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})};
function welcomeEl(){
  const w=el('div','cm-welcome');
  if(cur.t==='dm'){const p=prof(dmOther(cur.d));w.append(avatar(p,64),el('h2','',p.display_name),el('p','','This is the start of your conversation with @'+p.username+'.'));return w}
  const k=cur.c,ic=el('div','cw-ic');ic.append(icon(chanIcon(k),'ico'));
  w.append(ic,el('h2','','Welcome to #'+k.name),el('p','',k.topic||'This is the start of the channel.'));return w;
}
function renderMsgs(stick){
  const box=bar('.cmsgs');if(!box)return;const keep=box.scrollTop;pendingRender=false;
  const nodes=[];
  if(hasMore){const b=el('button','cm-more','load older messages');b.onclick=loadOlder;nodes.push(b)}else if(cur&&cur.t!=='friends')nodes.push(welcomeEl());
  let day='',marked=false;
  msgs.forEach((m,i)=>{
    let brk=false;const d=new Date(m.created_at),dk=d.toDateString();
    if(dk!==day){day=dk;brk=true;const dv=el('div','cm-day');dv.append(el('span','',dayLabel(d)));nodes.push(dv)}
    if(!marked&&newAfter&&m.user_id!==me.id&&d>new Date(newAfter)){marked=true;brk=true;const nv=el('div','cm-new');nv.append(el('span','','new'));nodes.push(nv)}
    nodes.push(msgEl(m,brk?null:msgs[i-1]));
  });
  if(chErr){nodes.push(el('p','cm-empty',chErr));chErr=''}
  box.replaceChildren(...nodes);
  box.scrollTop=stick?box.scrollHeight:keep;
  if(editing){const t=box.querySelector('.cm-edit');if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length)}}
}
async function loadOlder(){
  const box=bar('.cmsgs'),h=box.scrollHeight;
  try{const older=await ChatAPI.messages(sc(),msgs[0].created_at);hasMore=older.length>=60;msgs=[...older,...msgs];
    if(older.some(m=>!people.has(m.user_id)))await refreshPeople().catch(()=>{});renderMsgs();box.scrollTop=box.scrollHeight-h}
  catch(e){toast(e.message,3000)}
}
function linkify(text,node){ // only staff-written text in staff-only channels gets clickable links
  const re=/https?:\/\/[^\s<>"']+/g;let last=0,m;
  while((m=re.exec(text))){node.append(text.slice(last,m.index));const a=el('a','',m[0]);a.href=m[0];a.target='_blank';a.rel='noopener noreferrer nofollow';node.append(a);last=m.index+m[0].length}
  node.append(text.slice(last));
}
/* small bits of formatting: **bold** *italic* ~~strike~~ `code` ||spoiler|| > quote @mention. Built with the DOM, never HTML. */
function rich(text,node,links){
  const put=(h,s)=>links?linkify(s,h):h.append(s);
  const re=/`([^`\n]+)`|\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|\|\|([^|\n]+)\|\||\*([^*\n]+)\*|@([a-z0-9_]{3,20})(?![a-z0-9_])/gi;
  const inline=(ln,host)=>{let last=0,m;re.lastIndex=0;
    while((m=re.exec(ln))){
      const i=m.index;let n=null;
      if(m[6]!=null){const p=/[a-z0-9_]/i.test(ln[i-1]||'')?null:byName(m[6]);if(!p)continue;
        n=el('span','mn'+(p.id===me.id?' me':''),'@'+p.display_name);n.onclick=()=>profilePopup(p.id)}
      else if(m[1]!=null)n=el('code','',m[1]);
      else if(m[2]!=null)n=el('strong','',m[2]);
      else if(m[3]!=null)n=el('s','',m[3]);
      else if(m[4]!=null){n=el('span','spo',m[4]);n.title='click to reveal';n.onclick=()=>n.classList.toggle('show')}
      else n=el('em','',m[5]);
      put(host,ln.slice(last,i));host.append(n);last=i+m[0].length;
    }
    put(host,ln.slice(last));};
  const lines=text.split('\n');
  lines.forEach((ln,i)=>{
    if(/^>\s/.test(ln)){const q=el('span','qt');inline(ln.slice(2),q);node.append(q)}
    else{inline(ln,node);if(i<lines.length-1)node.append('\n')}
  });
}
const STAFF_CHIP={owner:'owner',admin:'admin',mod:'mod'};
function msgEl(m,prev){
  const p=prof(m.user_id),mine=m.user_id===me.id,pinged=!mine&&!m.deleted&&mentionsMe(m.content);
  const same=prev&&prev.user_id===m.user_id&&!prev.deleted&&!m.deleted&&!m.reply_to&&new Date(m.created_at)-new Date(prev.created_at)<3e5;
  const row=el('div','cm'+(same?' same':'')+(m.deleted?' gone':'')+(p.role==='bot'?' bot':'')+(pinged?' ping':''));row.dataset.id=m.id;
  if(!same){const a=avatar(p,38);a.onclick=()=>profilePopup(m.user_id);row.append(a)}
  else row.append(el('span','cm-ht',new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})));
  const body=el('div','cm-body');
  if(m.reply_to){
    const q=m.reply||byId(m.reply_to),rp=q?prof(q.user_id):null,r=el('div','cm-reply');
    r.append(el('i','','↳'));
    if(q){r.append(nameEl(rp,'rn'),el('span','rt',q.deleted?'message removed':preview(q)))}else r.append(el('span','rt','original message not available'));
    r.onclick=()=>{const t=bar(`.cm[data-id="${m.reply_to}"]`);if(t){t.scrollIntoView({block:'center'});t.classList.add('flash');setTimeout(()=>t.classList.remove('flash'),1200)}else toast('that message is further up. load older messages',2500)};
    body.append(r);
  }
  if(!same){const h=el('div','cm-h'),n=nameEl(p,'cm-name');n.onclick=()=>profilePopup(m.user_id);h.append(n);
    const rb=roleBadge(p.role);if(rb)h.append(rb);
    if(STAFF_CHIP[p.role])h.append(el('span','rtag '+p.role,STAFF_CHIP[p.role]));
    h.append(el('small','',timeOf(m.created_at)));body.append(h)}
  if(editing===m.id){
    const t=el('textarea','cm-edit');t.value=editDraft;t.maxLength=500;t.rows=Math.min(6,Math.max(2,editDraft.split('\n').length));
    t.oninput=()=>editDraft=t.value;
    t.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveEdit(m)}if(e.key==='Escape'){e.stopPropagation();stopEdit()}};
    body.append(t,el('small','cm-edit-hint','enter to save · esc to cancel'));
  }else{
    if(m.deleted||m.content){
      const t=el('div','cm-t');
      if(m.deleted)t.textContent='message removed';
      else rich(m.content,t,cur&&cur.t==='channel'&&cur.c.write_rank>=3&&rank(p.role)>=3);
      if(m.edited_at&&!m.deleted)t.append(Object.assign(el('small','edited',' (edited)'),{title:'edited '+timeOf(m.edited_at)}));
      body.append(t);
    }
    if(m.gif_url&&!m.deleted){const g=new Image();g.src=m.gif_url;g.alt='gif';g.loading='lazy';g.referrerPolicy='no-referrer';g.className='cm-gif';g.onerror=()=>{g.replaceWith(el('small','cm-t edited','[gif could not load]'))};body.append(g)}
  }
  if(!m.deleted&&m.reactions&&m.reactions.length){
    const g=new Map();m.reactions.forEach(x=>{if(!g.has(x.emoji))g.set(x.emoji,[]);g.get(x.emoji).push(x.user_id)});
    const rr=el('div','cm-rx');
    [...g.keys()].forEach(e=>{const users=g.get(e),b=el('button','rx'+(users.includes(me.id)?' mine':''));b.append(el('span','',e),el('b','',String(users.length)));
      b.title=users.map(u=>prof(u).display_name).join(', ');b.onclick=()=>react(m,e);rr.append(b)});
    body.append(rr);
  }
  row.append(body);
  if(!m.deleted&&editing!==m.id)row.append(toolbar(m,mine,row));
  return row;
}
function toolbar(m,mine,row){
  const tools=el('div','cm-tools');
  const add=(ic,title,fn,cls)=>{const b=el('button',cls||'');b.type='button';b.title=title;b.setAttribute('aria-label',title);b.append(icon(ic));b.onclick=e=>{e.stopPropagation();fn(b)};tools.append(b)};
  if(!myBan)add('react','add reaction',()=>quickPick(m,row));
  if(!canPostHere())add('reply','reply',()=>{replyTo=m;renderReply();$('#ch-in').focus()});
  if(mine&&!myBan)add('edit','edit your message',()=>{editing=m.id;editDraft=m.content;renderMsgs()});
  if((mine||(cur.t==='channel'&&myRank()>=3))&&!(mine&&myBan))add('trash','delete',async()=>{
    try{await ChatAPI.remove(m.id);const i=msgs.findIndex(x=>x.id===m.id);if(i>=0)msgs[i]={...msgs[i],deleted:true,content:'',gif_url:null};renderMsgs()}catch(e){toast(e.message,3000)}},'danger');
  if(!mine&&prof(m.user_id).role!=='bot')add('flag','report this message',async()=>{
    const why=prompt('Report this message? Say why (optional):');if(why===null)return;
    try{await ChatAPI.report(m.id,why);toast('reported · thanks')}catch(e){toast(e.message,3000)}});
  return tools;
}
function quickPick(m,row){ // the 8 favourites, plus "+" for every emoji
  document.querySelectorAll('.cm-pick').forEach(x=>x.remove());
  const pk=el('div','cm-pick');QUICK.forEach(e=>{const b=el('button','',e);b.onclick=ev=>{ev.stopPropagation();pk.remove();react(m,e)};pk.append(b)});
  const more=el('button','more','+');more.title='all emoji';more.onclick=ev=>{ev.stopPropagation();pk.remove();openPanel('react',e=>react(m,e))};pk.append(more);
  row.append(pk);const off=ev=>{if(!pk.contains(ev.target)){pk.remove();document.removeEventListener('click',off,true)}};setTimeout(()=>document.addEventListener('click',off,true),0);
}
async function react(m,emoji){
  const i=m.reactions.findIndex(x=>x.user_id===me.id&&x.emoji===emoji);   // show it right away, the server confirms through realtime
  m.reactions=i>=0?m.reactions.filter((_,k)=>k!==i):[...m.reactions,{user_id:me.id,emoji}];renderMsgs();
  try{await ChatAPI.react(m.id,emoji)}catch(e){m.reactions=i>=0?[...m.reactions,{user_id:me.id,emoji}]:m.reactions.filter(x=>!(x.user_id===me.id&&x.emoji===emoji));renderMsgs();toast(e.message,3000)}
}
function stopEdit(){editing=null;editDraft='';renderMsgs()}
async function saveEdit(m){
  const text=editDraft.trim();if(!text&&!m.gif_url)return toast('a message cannot be empty. delete it instead',2500);
  if(text===m.content)return stopEdit();
  try{await ChatAPI.edit(m.id,text);const i=msgs.findIndex(x=>x.id===m.id);if(i>=0)msgs[i]={...msgs[i],content:text,edited_at:new Date().toISOString()};stopEdit()}
  catch(e){toast(e.message,3000)}
}
function renderReply(){
  const r=bar('.cl-reply');if(!r)return;
  if(!replyTo){r.style.display='none';r.replaceChildren();return}
  const p=prof(replyTo.user_id),x=el('button','ib','×');x.title='cancel reply';x.onclick=()=>{replyTo=null;renderReply()};
  r.style.display='flex';r.replaceChildren(el('span','','replying to '),nameEl(p),el('span','rt',preview(replyTo)),x);
}
async function send(gifUrl){
  closePanel();closeMent();
  const inp=$('#ch-in'),text=gifUrl?'':inp.value.trim();if((!text&&!gifUrl)||inp.disabled||!cur||cur.t==='friends')return;inp.disabled=true;
  try{const r=await ChatAPI.send(sc(),text,replyTo&&replyTo.id,gifUrl);if(!gifUrl){inp.value='';inp.style.height='auto';bar('.cl-count').textContent=''}
    replyTo=null;renderReply();lastTyping=0;
    if(r&&!msgs.some(m=>m.id===r.id)){msgs.push(r);renderMsgs(true)}
    if(typeof badge==='function')badge('hello')}
  catch(e){toast(e.message,3000)}finally{updateComposer();if(!inp.disabled)inp.focus()}
}

/* ---------- emoji + GIF panel ---------- */
let emojiLoad=null;
const loadEmoji=()=>window.COPPER_EMOJI?Promise.resolve():(emojiLoad||(emojiLoad=new Promise((res,rej)=>{const s=document.createElement('script');s.src='js/emoji-data.js';s.onload=res;s.onerror=()=>{emojiLoad=null;rej(new Error("couldn't load emoji"))};document.head.append(s)})));
const recent=()=>{try{return JSON.parse(localStorage.getItem('copper.chat.recent')||'[]').slice(0,24)}catch{return[]}};
const pushRecent=e=>{try{localStorage.setItem('copper.chat.recent',JSON.stringify([e,...recent().filter(x=>x!==e)].slice(0,24)))}catch{}};
function closePanel(){if(panel){panel.el.remove();document.removeEventListener('click',panel.off,true);panel=null}}
function openPanel(mode,onPick){ // mode: 'emoji' (types into the box), 'gif' (sends), 'react' (calls onPick)
  const was=panel&&panel.mode;closePanel();if(was===mode&&mode!=='react')return;
  const chat=bar('.cl-chat');if(!chat)return;
  const pop=el('div','cl-pop'),head=el('div','pop-tabs'),search=el('div','pop-search'),grid=el('div','pop-grid'),foot=el('div','pop-foot');
  const input=el('input');input.placeholder=mode==='gif'?'search GIFs':'search emoji';input.maxLength=40;input.autocomplete='off';search.append(icon('search'),input);
  const setTab=m=>{if(m!==mode){openPanel(m)}};
  if(mode!=='react'){[['emoji','emoji'],['gif','GIF']].forEach(([k,t])=>{const b=el('button',k===mode?'on':'',t);b.type='button';b.onclick=e=>{e.stopPropagation();setTab(k)};head.append(b)})}
  pop.append(...(mode==='react'?[]:[head]),search,grid,foot);chat.append(pop);
  panel={el:pop,mode,off:e=>{if(!pop.contains(e.target)&&!e.target.closest('.cb,.cm-pick'))closePanel()}};
  setTimeout(()=>panel&&document.addEventListener('click',panel.off,true),0);
  input.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closePanel();const t=$('#ch-in');t&&!t.disabled&&t.focus()}});
  input.focus();
  const choose=e=>{pushRecent(e);if(mode==='react'){closePanel();onPick(e)}else{const t=$('#ch-in');if(t.disabled)return;const a=t.selectionStart??t.value.length,b=t.selectionEnd??a;
    if(t.value.length+e.length<=500){t.value=t.value.slice(0,a)+e+t.value.slice(b);t.focus();t.setSelectionRange(a+e.length,a+e.length);t.dispatchEvent(new Event('input'))}}};
  if(mode==='gif')gifPanel(grid,foot,input);else emojiPanel(grid,foot,input,choose);
}
async function emojiPanel(grid,foot,input,choose){
  grid.append(el('p','pop-note','loading…'));
  try{await loadEmoji()}catch(e){grid.replaceChildren(el('p','pop-note',e.message));return}
  const btn=(e,name)=>{const b=el('button','em',e);b.type='button';b.title=name||'';b.onclick=ev=>{ev.stopPropagation();choose(e)};return b};
  const draw=()=>{
    const q=input.value.trim().toLowerCase();grid.replaceChildren();foot.replaceChildren();
    if(q){const out=[];for(const [,list] of window.COPPER_EMOJI)for(const [e,k] of list){if(k.includes(q)){out.push([e,k]);if(out.length>=160)break}}
      if(!out.length)grid.append(el('p','pop-note','no emoji found'));
      const g=el('div','eg');out.forEach(([e,k])=>g.append(btn(e,k.split(' ').slice(0,3).join(' '))));grid.append(g);return}
    const r=recent();
    if(r.length){grid.append(el('h6','','recent'));const g=el('div','eg');r.forEach(e=>g.append(btn(e)));grid.append(g)}
    window.COPPER_EMOJI.forEach(([name,list])=>{const h=el('h6','',name);h.dataset.g=name;grid.append(h);const g=el('div','eg');list.forEach(([e,k])=>g.append(btn(e,k.split(' ').slice(0,3).join(' '))));grid.append(g)});
    window.COPPER_EMOJI.forEach(([name,list])=>{const b=el('button','pg',list[0][0]);b.type='button';b.title=name;b.onclick=ev=>{ev.stopPropagation();const h=grid.querySelector(`h6[data-g="${name}"]`);if(h)grid.scrollTop=h.offsetTop-grid.offsetTop-4};foot.append(b)});
  };
  input.oninput=draw;draw();
}
function gifPanel(grid,foot,input){
  foot.append(el('small','pop-by','GIFs from KLIPY'));
  let page=1,q='',timer=null,busy=false;
  const col=el('div','gg');
  const more=el('button','mg-btn gmore','load more');more.type='button';more.style.display='none';
  const load=async reset=>{
    if(busy)return;busy=true;
    if(reset){page=1;col.replaceChildren();grid.scrollTop=0}
    if(!col.children.length)grid.replaceChildren(el('p','pop-note','loading…'),col,more);
    try{const r=await ChatAPI.gifs(q,page);
      grid.querySelector('.pop-note')?.remove();
      if(!r.items.length&&page===1)grid.prepend(el('p','pop-note','no GIFs found'));
      r.items.forEach(g=>{const b=el('button','gi');b.type='button';b.title=g.title;const i=new Image();i.src=g.preview;i.alt=g.title;i.loading='lazy';i.referrerPolicy='no-referrer';
        if(g.w&&g.h)i.style.aspectRatio=g.w+'/'+g.h;b.append(i);b.onclick=ev=>{ev.stopPropagation();closePanel();send(g.url)};col.append(b)});
      more.style.display=r.hasNext?'':'none';page++;
    }catch(e){grid.replaceChildren(el('p','pop-note',e.message))}finally{busy=false}
  };
  more.onclick=ev=>{ev.stopPropagation();load(false)};
  input.oninput=()=>{clearTimeout(timer);timer=setTimeout(()=>{q=input.value.trim();load(true)},350)};
  load(true);
}

/* ---------- people on the right: who is here now (staff first), then everyone who is away ---------- */
let showOff=false;
function renderMembers(){
  const box=bar('.cl-people');if(!box)return;
  const real=[...people.values()].filter(p=>p.role!=='bot');
  const byRank=(a,b)=>(rank(b.role)-rank(a.role))||a.display_name.localeCompare(b.display_name);
  const item=p=>{const here=online.has(p.id),b=el('button','cp'+(here?'':' off')),t=el('div','cp-t'),l=el('div','cp-l');l.append(nameEl(p));const rb=roleBadge(p.role);if(rb)l.append(rb);t.append(l);
    const st=here&&pmeta[p.id]&&pmeta[p.id].st;if(st)t.append(el('small','',st));
    b.append(avatarDot(p,32),t);b.onclick=()=>profilePopup(p.id);return b};
  const sec=(t,list,more)=>{if(!list.length)return null;const s=el('div','cp-sec');s.append(el('h5','',t+' — '+list.length),...list.map(item));if(more)s.append(more);return s};
  const here=real.filter(p=>online.has(p.id)).sort(byRank),away=real.filter(p=>!online.has(p.id)).sort(byRank);
  const roles=Object.keys(ROLE_LABEL).map(r=>sec(ROLE_LABEL[r],here.filter(p=>p.role===r)));
  const plain=here.filter(p=>!ROLE_LABEL[p.role]);
  const bots=[...people.values()].filter(p=>p.role==='bot');
  const LIM=30,shown=showOff?away:away.slice(0,LIM);let more=null;
  if(away.length>LIM){more=el('button','cp-more',showOff?'show fewer':'show all '+away.length);more.onclick=()=>{showOff=!showOff;renderMembers()}}
  const offSec=away.length?(()=>{const s=sec('offline',shown,more);s.querySelector('h5').textContent='offline — '+away.length;return s})():null;
  box.replaceChildren(...[...roles,sec(roles.some(Boolean)?'online':'online',plain),bots.length?sec('bot',bots):null,offSec].filter(Boolean));
  if(!here.length&&!bots.length&&!away.length)box.replaceChildren(el('p','cl-none','nobody here yet'));
  counts();
}

/* ---------- friends page ---------- */
function renderFriends(){
  const box=bar('.cl-friends');if(!box||!cur||cur.t!=='friends')return;
  const mine=friends.filter(f=>f.status==='accepted').map(f=>prof(f.requester===me.id?f.addressee:f.requester));
  const inc=pendingIn(),out=friends.filter(f=>f.status==='pending'&&f.requester===me.id);
  const tabs=el('div','seg');
  [['all','all friends ('+mine.length+')'],['online','online'],['pending','requests'+(inc.length?' ('+inc.length+')':'')],['add','add friend']].forEach(([k,t])=>{
    const b=el('button',k===friendTab?'on':'',t);b.onclick=()=>{friendTab=k;renderFriends()};tabs.append(b)});
  const list=el('div','fr-list');
  const person=(p,btns)=>{const r=el('div','fr-row');r.append(avatarDot(p,34));const w=el('div','fr-who');w.append(nameEl(p),el('small','','@'+p.username+(online.has(p.id)?' · online':'')));
    w.onclick=()=>profilePopup(p.id);r.append(w);const a=el('div','fr-act');btns.forEach(([t,fn,cls])=>{const b=el('button','mg-btn '+(cls||''),t);b.onclick=fn;a.append(b)});r.append(a);return r};
  if(friendTab==='all'||friendTab==='online'){
    const l=(friendTab==='online'?mine.filter(p=>online.has(p.id)):mine);
    if(!l.length)list.append(el('p','cm-empty',friendTab==='online'?'none of your friends are online right now':'no friends yet. use "add friend" and type their username'));
    l.forEach(p=>list.append(person(p,[['message',guard(()=>openDmWith(p.id))],['remove',guard(async()=>{if(!confirm('Remove '+p.display_name+' from your friends?'))return;await ChatAPI.friendRemove(p.id);await reloadFriends()}),'warn']])));
  }else if(friendTab==='pending'){
    if(!inc.length&&!out.length)list.append(el('p','cm-empty','no pending requests'));
    if(inc.length)list.append(el('h5','fr-h','incoming — '+inc.length));
    inc.forEach(f=>list.append(person(prof(f.requester),[['accept',guard(async()=>{await ChatAPI.friendRespond(f.id,true);await reloadFriends();toast('you are now friends')}),'pri'],['decline',guard(async()=>{await ChatAPI.friendRespond(f.id,false);await reloadFriends()})]])));
    if(out.length)list.append(el('h5','fr-h','sent — '+out.length));
    out.forEach(f=>list.append(person(prof(f.addressee),[['cancel',guard(async()=>{await ChatAPI.friendRemove(f.addressee);await reloadFriends()})]])));
  }else{
    const f=el('form','pf fr-add');const i=el('input');i.placeholder='their username';i.maxLength=20;i.autocomplete='off';i.autocapitalize='off';
    const err=el('p','pf-err'),go=el('button','mg-btn pri','send friend request');go.type='submit';
    f.append(el('p','hint','Type the exact username (the part after @). They get a request and can accept or decline.'),i,err,go);
    f.onsubmit=async e=>{e.preventDefault();err.textContent='';const u=i.value.trim().toLowerCase().replace(/^@/,'');if(!u)return;go.disabled=true;
      try{const r=await ChatAPI.friendRequest(u);i.value='';toast(r==='accepted'?'you are now friends':'request sent to @'+u);await reloadFriends()}
      catch(x){err.textContent=x.message}finally{go.disabled=false}};
    list.append(f);
  }
  const head=el('div','cl-head');head.append(el('b','','friends'),el('span','','requests, adding people and starting dms'));
  box.replaceChildren(head,tabs,list);
}
async function openDmWith(id){
  const did=await ChatAPI.openDm(id);
  if(!dms.some(d=>d.id===did))dms=await ChatAPI.dms();
  go({t:'dm',d:dms.find(d=>d.id===did)});
}

/* ---------- someone's profile ---------- */
function profilePopup(id){
  const p=prof(id),d=el('dialog','pp');d.onclose=()=>d.remove();
  const x=el('button','ib set-x','×');x.onclick=()=>d.close();
  d.append(profileCard(p),x);
  const act=el('div','pp-act');
  const run=(fn,msg)=>async()=>{try{await fn();if(msg)toast(msg);d.close()}catch(e){toast(e.message,3000)}};
  const btn=(t,fn,cls)=>{const b=el('button','mg-btn '+(cls||''),t);b.onclick=fn;act.append(b);return b};
  if(id===me.id)btn('edit profile',()=>{d.close();openAccountSettings()});
  else{
    if(p.role==='bot')btn('message',run(()=>openDmWith(id)),'pri');
    else{const r=rel(id);
      if(!r)btn('add friend',run(async()=>{const x=await ChatAPI.friendRequest(p.username);await reloadFriends();toast(x==='accepted'?'you are now friends':'request sent')}),'pri');
      else if(r.s==='out')btn('cancel request',run(async()=>{await ChatAPI.friendRemove(id);await reloadFriends()}));
      else if(r.s==='in'){btn('accept request',run(async()=>{await ChatAPI.friendRespond(r.f.id,true);await reloadFriends()}),'pri');btn('decline',run(async()=>{await ChatAPI.friendRespond(r.f.id,false);await reloadFriends()}))}
      else{btn('message',run(()=>openDmWith(id)),'pri');btn('remove friend',run(async()=>{await ChatAPI.friendRemove(id);await reloadFriends();if(cur&&cur.t==='dm')updateComposer()}),'warn')}
    }
    if(myRank()>=3&&rank(p.role)<myRank()){
      act.append(el('div','pp-sep'));
      [['timeout 10 min',()=>ChatAPI.ban(id,10),'timed out for 10 minutes'],['timeout 1 hour',()=>ChatAPI.ban(id,60),'timed out for 1 hour'],['ban',()=>ChatAPI.ban(id,null),'banned'],['unban',()=>ChatAPI.unban(id),'unbanned']]
        .forEach(([t,fn,msg])=>btn(t,run(fn,msg)));
      if(myRank()>=4){const roles=['member','og','vip','mod','admin'].filter(r=>rank(r)<myRank()),sel=el('select');
        roles.forEach(r=>{const o=el('option','',r);o.value=r;if(r===p.role)o.selected=true;sel.append(o)});
        if(!roles.includes(p.role)){const o=el('option','',p.role);o.value=p.role;o.selected=true;sel.prepend(o)}
        const b=btn('set role',run(async()=>{await ChatAPI.setRole(id,sel.value);await refreshPeople();renderMembers();renderMsgs()},'role changed'));act.insertBefore(sel,b)}
    }
  }
  d.append(act);openDialog(d);
}
})();
