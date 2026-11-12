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
const ROLE_GROUPS=[['owner','owner'],['admin','admins'],['mod','mods'],['vip','vip'],['og','og'],['member','members']];
const PX={
  crown:['#...#...#','##..#..##','#########','#########','.#######.'],
  shield:['#######','#######','#######','#######','#######','.#####.','..###..','...#...'],
  gem:['..###..','.#####.','#######','.#####.','..###..','...#...'],
  flame:['...#...','..##...','..###..','.#####.','#######','#######','.#####.']};
const BADGE={owner:['crown','#ffb21e'],admin:['shield','#ff5a4e'],mod:['shield','#3ecdb2'],vip:['gem','#a35cf6'],og:['flame','#ff7b2e']};
const ICON={
  dm:'<path d="M2 3h12v8H7l-3 2.5V11H2z"/>',
  channels:'<path d="M6.5 2 5.5 14M10.5 2l-1 12M2.5 6h11.5M2 10h11.5"/>',
  friends:'<circle cx="6" cy="5.5" r="2.5"/><path d="M1.5 13c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4"/><path d="M10.5 3.2a2.5 2.5 0 0 1 0 4.6M12 9.3c1.6.5 2.5 1.7 2.5 3.7"/>',
  smile:'<circle cx="8" cy="8" r="6"/><path d="M5.5 9.5c.7 1 1.5 1.5 2.5 1.5s1.8-.5 2.5-1.5M6 6.5h.01M10 6.5h.01"/>',
  send:'<path d="M14 2 7 9M14 2l-4.5 12L7 9 1.5 6.5z"/>',
  search:'<circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3.5 3.5"/>',
  gear:'<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>'};
const icon=(n,cls='ico')=>{const s=el('span',cls);s.innerHTML=`<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;return s};

let me=null,cats=[],chans=[],people=new Map(),online=new Set(),friends=[],dms=[],cur=null,msgs=[],hasMore=false,seq=0,navTab='channels';
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
function pxSvg(rows,color,px=2){const w=rows[0].length;return `<svg viewBox="0 0 ${w} ${rows.length}" width="${w*px}" height="${rows.length*px}" shape-rendering="crispEdges" fill="${color}">`+
  rows.map((r,y)=>[...r].map((c,x)=>c==='#'?`<rect x="${x}" y="${y}" width="1" height="1"/>`:'').join('')).join('')+'</svg>'}
function roleBadge(role){
  if(role==='bot'){const s=el('span','rbot','bot');s.title='bot';return s}
  const b=BADGE[role];if(!b)return null;const s=el('span','rb');s.title=role;s.innerHTML=pxSvg(PX[b[0]],b[1]);return s}
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
function unsub(){[offScope,offPres,offFriends,offDms].forEach(f=>f&&f());offScope=offPres=offFriends=offDms=null}
function closeChat(){closePanel();ch.classList.remove('on');unsub()}   // free the connections while the page is closed
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
}
async function enter(first){
  try{await loadAll()}catch(e){started=false;return chb.replaceChildren(empty(e.message,boot))}
  layout();connect();
  go({t:'channel',c:chans.find(c=>c.name==='general')||chans.find(canSeeChan)||chans[0]});
  if(first)openSettings('profile',true);
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
  offPres=ChatAPI.presence(me,ids=>{online=new Set([...ids,BOT]);renderMembers();renderLeft();counts()});
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
function showAuth(){
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
        people.set(me.id,me);enter(up)}
      catch(x){err.textContent=x.message;go.disabled=false;go.textContent=up?'create account':'sign in'}};
    box.replaceChildren(el('h2','',up?'join Copper chat':'welcome back'),
      el('p','hint',up?'One account per person. You can make your avatar, banner and bio after you are in. Keep real names, schools and addresses out of chat.':'Sign in with your username and password.'),
      tabs,f,
      el('p','hint small',up?'Forgot your password later? Without an email, a staff member has to reset it for you.':'No account yet? Use the sign up tab.'));
    un.focus();
  };
  draw();chb.replaceChildren(box);
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

/* ---------- settings (like Discord: categories on the left) ---------- */
function openSettings(section='profile',welcome=false){
  const d=el('dialog','set'),nav=el('nav','set-nav'),body=el('div','set-body'),x=el('button','ib set-x','×');
  const urls=[];x.onclick=()=>d.close();d.onclose=()=>{urls.forEach(u=>URL.revokeObjectURL(u));d.remove()};
  const secs=[['profile','profile'],['account','my account']];
  const draw=s=>{section=s;nav.querySelectorAll('.sn').forEach(b=>b.classList.toggle('on',b.dataset.k===s));body.scrollTop=0;
    body.replaceChildren(el('h2','',s==='profile'?'profile':'my account'));(s==='profile'?drawProfile:drawAccount)(body)};
  nav.append(el('h5','','user settings'));
  secs.forEach(([k,t])=>{const b=el('button','sn',t);b.dataset.k=k;b.onclick=()=>draw(k);nav.append(b)});
  nav.append(el('div','sp'));const out=el('button','sn danger','log out');out.onclick=signOut;nav.append(out);
  d.append(nav,body,x);

  function drawProfile(box){
    const v={display_name:me.display_name,pronouns:me.pronouns||'',bio:me.bio||'',color:me.color,avatar:me.avatar,avatar_url:me.avatar_url||null,banner_url:me.banner_url||null};
    const pend={avatar:null,banner:null};   // a new image (Blob) or 'remove'
    if(welcome)box.append(el('p','hint','Welcome! Make it yours. Everything here is optional and you can change it any time.'));
    const wrap=el('div','set-cols'),form=el('form','pf'),side=el('div','set-side'),pvBox=el('div');
    const row=(label,node,hint)=>{const w=el('div','pf-row');w.append(el('span','',label),node);if(hint)w.append(el('small','pf-hint',hint));return w};
    const dn=el('input');dn.value=v.display_name;dn.maxLength=24;dn.placeholder='what people see';
    const pr=el('input');pr.value=v.pronouns;pr.maxLength=24;pr.placeholder='e.g. she/her, he/him, they/them';
    const bio=el('textarea');bio.value=v.bio;bio.maxLength=190;bio.rows=3;bio.placeholder='a few words about you';
    const cnt=el('small','pf-hint','');
    const sw=el('div','swatches');COLORS.forEach(c=>{const b=el('button','sw');b.type='button';b.style.background=c;b.title=c;b.onclick=()=>{v.color=c;refresh()};sw.append(b)});
    const av=el('div','swatches');AV.forEach(a=>{const b=el('button','sw av');b.type='button';b.title=a[0]+' golem';b.append(avatar({avatar:a[0]},26));b.onclick=()=>{v.avatar=a[0];refresh()};av.append(b)});
    const pick=(kind,w,h,label)=>{const f=el('input');f.type='file';f.accept='image/png,image/jpeg,image/webp,image/gif';f.hidden=true;
      f.onchange=async()=>{const file=f.files[0];f.value='';if(!file)return;
        try{const blob=await cropImage(file,w,h);pend[kind]=blob;const u=URL.createObjectURL(blob);urls.push(u);v[kind+'_url']=u;refresh()}catch(e){toast(e.message,3000)}};
      const up=el('button','mg-btn',label);up.type='button';up.onclick=()=>f.click();
      const rm=el('button','mg-btn warn','remove');rm.type='button';rm.onclick=()=>{pend[kind]='remove';v[kind+'_url']=null;refresh()};
      const r=el('div','up-row');r.append(up,rm,f);r.rm=rm;r.kind=kind;return r};
    const avUp=pick('avatar',256,256,'upload avatar'),bnUp=pick('banner',960,320,'upload banner');
    const err=el('p','pf-err'),save=el('button','mg-btn pri','save changes');save.type='submit';
    form.append(row('display name',dn),row('pronouns',pr),row('bio',bio),cnt,row('name color',sw),
      row('avatar',av,'Upload your own picture, or pick a golem. Uploads are cropped to a square.'),avUp,
      row('banner',el('span'),'Wide pictures work best (cropped to 3:1).'),bnUp,err,save);
    const refresh=()=>{
      sw.querySelectorAll('.sw').forEach((b,i)=>b.classList.toggle('on',COLORS[i]===v.color));
      av.querySelectorAll('.sw').forEach((b,i)=>b.classList.toggle('on',AV[i][0]===v.avatar&&!v.avatar_url));
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
        people.set(me.id,me);welcome=false;renderLeft();renderMembers();renderMsgs();
        pend.avatar=pend.banner=null;Object.assign(v,{avatar_url:me.avatar_url,banner_url:me.banner_url});toast('profile saved');refresh();
      }catch(x){err.textContent=x.message}finally{save.disabled=false;save.textContent='save changes'}};
    side.append(el('h5','','preview'),pvBox);wrap.append(form,side);box.append(wrap);
  }

  function drawAccount(box){
    const row=(label,...nodes)=>{const w=el('div','pf-row');w.append(el('span','',label),...nodes);return w};
    const info=el('div','acct-info');info.append(avatar(me,44),Object.assign(el('div'),{}));info.lastChild.append(nameEl(me),el('small','','@'+me.username+' · '+me.role));
    const em=el('input');em.type='email';em.placeholder='recovery email (optional)';em.autocomplete='email';
    ChatAPI.myRecoveryEmail().then(e=>em.value=e).catch(()=>{});
    const saveEm=el('button','mg-btn','save');saveEm.type='button';saveEm.onclick=async()=>{try{await ChatAPI.setRecoveryEmail(em.value.trim());toast('email saved')}catch(x){toast(x.message,3000)}};
    const r1=el('div','acct-row');r1.append(em,saveEm);
    const op=el('input');op.type='password';op.placeholder='current password';op.autocomplete='current-password';
    const np=el('input');np.type='password';np.placeholder='new password (8+)';np.autocomplete='new-password';
    const chg=el('button','mg-btn','change password');chg.type='button';chg.onclick=async()=>{
      if(np.value.length<8)return toast('new password: at least 8 characters',2500);
      try{await ChatAPI.changePassword(op.value,np.value);op.value=np.value='';toast('password changed')}catch(x){toast(x.message,3000)}};
    const r2=el('div','acct-col');r2.append(op,np,chg);
    const dz=el('div','danger-zone');dz.append(el('h4','','delete account'),el('p','hint','Removes your account, messages, friends, DMs and uploaded pictures. This cannot be undone.'));
    const del=el('button','mg-btn warn','delete my account');del.type='button';
    del.onclick=async()=>{if(!confirm('Delete your account, messages, friends and DMs? This cannot be undone.'))return;
      try{await ChatAPI.deleteMe();location.reload()}catch(x){toast(x.message,3500)}};
    dz.append(del);
    box.append(info,row('recovery email',r1,el('small','pf-hint','Only you can see it. Staff reset passwords by hand until automatic email is set up.')),row('change password',r2),dz);
  }
  draw(section);openDialog(d);
}
async function signOut(){
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());unsub();closePanel();
  try{await ChatAPI.signOut()}catch{}
  me=null;people.clear();friends=[];dms=[];cur=null;msgs=[];started=true;showAuth();$('#ch-counts').textContent='';
}

/* ---------- layout ---------- */
function layout(){
  const left=el('aside','cl-left'),main=el('div','cl-main'),right=el('aside','cl-right');
  left.append(el('div','cl-tabs'),el('div','cl-scroll'),el('div','cl-me'));
  const chat=el('div','cl-chat'),head=el('div','cl-head'),list=el('div','cmsgs'),rep=el('div','cl-reply'),notice=el('div','cl-notice'),bb=el('div','cl-bar'),inp=el('textarea');
  inp.rows=1;inp.maxLength=500;inp.id='ch-in';const count=el('small','cl-count','');
  const gifB=el('button','cb gifb','GIF');gifB.type='button';gifB.title='send a GIF';gifB.onclick=e=>{e.stopPropagation();openPanel('gif')};
  const emoB=el('button','cb');emoB.type='button';emoB.title='emoji';emoB.append(icon('smile'));emoB.onclick=e=>{e.stopPropagation();openPanel('emoji')};
  const sendB=el('button','cb sendb');sendB.type='button';sendB.title='send';sendB.append(icon('send'));sendB.onclick=()=>send();
  bb.append(inp,count,gifB,emoB,sendB);
  chat.append(head,list,rep,notice,bb);
  main.append(chat,el('div','cl-friends'));
  right.append(el('div','cl-people'));
  chb.replaceChildren(left,main,right);chb.classList.remove('show-members','show-left');
  inp.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}if(e.key==='Escape'){if(panel)closePanel();else if(replyTo){replyTo=null;renderReply()}}};
  inp.oninput=()=>{count.textContent=inp.value.length>400?inp.value.length+'/500':'';inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,120)+'px'};
  list.addEventListener('click',e=>{ // tap a message to show its tools on touch screens
    if(!matchMedia('(hover:none)').matches)return;const row=e.target.closest('.cm');if(!row||e.target.closest('button,a,textarea'))return;
    const was=row.classList.contains('open');list.querySelectorAll('.cm.open').forEach(x=>x.classList.remove('open'));if(!was)row.classList.add('open')});
  renderLeft();
}

/* ---------- left side: three tabs (direct messages, channels, friends) ---------- */
function renderLeft(){
  const tabs=bar('.cl-tabs'),s=bar('.cl-scroll'),m=bar('.cl-me');if(!s||!me)return;
  const keep=s.scrollTop,unread=dms.filter(dmUnread).length,pend=pendingIn().length;
  const tab=(k,ic,label,n)=>{const b=el('button','cl-tab'+(navTab===k?' on':''));b.append(icon(ic),el('span','',label));if(n)b.append(el('em','pill',String(n)));
    b.onclick=()=>{navTab=k;if(k==='friends')go({t:'friends'});else renderLeft()};return b};
  tabs.replaceChildren(tab('dms','dm','direct messages',unread),tab('channels','channels','channels',0),tab('friends','friends','friends',pend));
  const parts=[];
  if(navTab==='dms')dmPanel(parts);else if(navTab==='friends')friendsPanel(parts);else channelPanel(parts);
  s.replaceChildren(...parts);s.scrollTop=keep;
  const info=el('div','cl-meinfo'),line=el('div','cl-line');line.append(nameEl(me));const rb=roleBadge(me.role);if(rb)line.append(rb);
  info.append(line,el('small','','@'+me.username));
  const gear=el('button','ib');gear.append(icon('gear'));gear.title='settings';gear.onclick=()=>openSettings('profile');
  const who=el('button','cl-who');who.append(avatarDot(me,34),info);who.onclick=()=>openSettings('profile');who.title='edit your profile';
  m.replaceChildren(who,gear);
}
function channelPanel(parts){
  cats.forEach(c=>{
    const list=chans.filter(k=>k.category_id===c.id&&canSeeChan(k));if(!list.length)return;
    const h=el('button','cl-cat'+(collapsed.has(c.id)?' shut':''),c.name);h.onclick=()=>{collapsed.has(c.id)?collapsed.delete(c.id):collapsed.add(c.id);renderLeft()};parts.push(h);
    if(!collapsed.has(c.id))list.forEach(k=>{const b=el('button','chn'+(cur&&cur.t==='channel'&&cur.c.id===k.id?' on':''),k.name);b.prepend(el('i','','#'));
      const tag=k.write_rank>=99?'bot':k.read_rank>=3?'staff':k.read_rank===2?'vip':k.write_rank>=3?'read-only':'';if(tag)b.append(el('em','tag',tag));
      b.onclick=()=>go({t:'channel',c:k});parts.push(b)});
  });
}
function dmPanel(parts){
  const sorted=[...dms].sort((a,b)=>(b.last_message_at||'').localeCompare(a.last_message_at||''));
  parts.push(el('div','cl-cat static','direct messages'));
  if(!sorted.length)parts.push(el('p','cl-none','no dms yet. add a friend, then message them from the friends tab'));
  sorted.forEach(d=>{const p=prof(dmOther(d)),u=dmUnread(d),b=el('button','chn dm'+(cur&&cur.t==='dm'&&cur.d.id===d.id?' on':'')+(u?' unread':''));
    b.append(avatarDot(p,26),el('span','nm',p.display_name));const rb=roleBadge(p.role);if(rb)b.append(rb);if(u)b.append(el('em','dot'));
    b.onclick=()=>go({t:'dm',d});parts.push(b)});
}
function friendsPanel(parts){
  const f=el('form','fq'),i=el('input');i.placeholder='add a friend by username';i.maxLength=20;i.autocomplete='off';i.autocapitalize='off';
  const a=el('button','mg-btn pri','add');a.type='submit';f.append(i,a);
  f.onsubmit=async e=>{e.preventDefault();const u=i.value.trim().toLowerCase().replace(/^@/,'');if(!u)return;a.disabled=true;
    try{const r=await ChatAPI.friendRequest(u);i.value='';toast(r==='accepted'?'you are now friends':'request sent to @'+u);await reloadFriends()}catch(x){toast(x.message,3000)}finally{a.disabled=false}};
  parts.push(f);
  const inc=pendingIn(),out=friends.filter(x=>x.status==='pending'&&x.requester===me.id);
  const mine=friends.filter(x=>x.status==='accepted').map(x=>prof(x.requester===me.id?x.addressee:x.requester)).sort((a,b)=>(online.has(b.id)-online.has(a.id))||a.display_name.localeCompare(b.display_name));
  const row=(p,acts)=>{const r=el('div','lrow');const w=el('button','lwho');w.append(avatarDot(p,26),nameEl(p));w.onclick=()=>profilePopup(p.id);r.append(w);acts.forEach(([t,title,fn,cls])=>{const b=el('button','ib '+(cls||''),t);b.title=title;b.onclick=guard(fn);r.append(b)});return r};
  if(inc.length){parts.push(el('div','cl-cat static','incoming — '+inc.length));
    inc.forEach(x=>parts.push(row(prof(x.requester),[['✓','accept',async()=>{await ChatAPI.friendRespond(x.id,true);await reloadFriends();toast('you are now friends')},'ok'],['✕','decline',async()=>{await ChatAPI.friendRespond(x.id,false);await reloadFriends()},'no']])))}
  parts.push(el('div','cl-cat static','friends — '+mine.length));
  if(!mine.length)parts.push(el('p','cl-none','nobody here yet. type a username above and send a request'));
  mine.forEach(p=>parts.push(row(p,[['✉','message',()=>openDmWith(p.id)]])));
  if(out.length){parts.push(el('div','cl-cat static','sent — '+out.length));
    out.forEach(x=>parts.push(row(prof(x.addressee),[['✕','cancel request',async()=>{await ChatAPI.friendRemove(x.addressee);await reloadFriends()},'no']])))}
}
function counts(){const n=[...online].filter(id=>people.has(id)&&prof(id).role!=='bot').length,t=[...people.values()].filter(p=>p.role!=='bot').length;$('#ch-counts').textContent=`${n} online · ${t} member${t===1?'':'s'}`}

/* ---------- going somewhere (channel, DM or friends page) ---------- */
async function go(t){
  const my=++seq;cur=t;chb.classList.remove('show-left','show-members');closePanel();
  navTab=t.t==='dm'?'dms':t.t==='friends'?'friends':'channels';
  if(offScope){offScope();offScope=null}
  replyTo=null;editing=null;msgs=[];hasMore=false;
  renderLeft();
  chb.dataset.view=t.t==='friends'?'friends':'chat';
  if(t.t==='friends'){renderFriends();return}
  renderHead();updateComposer();renderReply();renderMsgs();
  const s=sc();
  try{msgs=await ChatAPI.messages(s);if(my!==seq)return;hasMore=msgs.length>=60}catch(e){chErr=e.message}
  if(msgs.some(m=>!people.has(m.user_id)))await refreshPeople().catch(()=>{});
  if(my!==seq)return;
  renderMsgs(true);
  offScope=ChatAPI.onScope(s,ev=>onEvent(my,ev));
  if(t.t==='dm'&&dmUnread(t.d))markRead(t.d);
}
function renderHead(){
  const head=bar('.cl-head');if(!head)return;
  if(cur.t==='dm'){const p=prof(dmOther(cur.d));const n=nameEl(p);n.onclick=()=>profilePopup(p.id);head.replaceChildren(avatarDot(p,26),n,el('span','','@'+p.username+(p.role==='bot'?' · answers every message':'')))}
  else head.replaceChildren(el('b','','# '+cur.c.name),el('span','',cur.c.topic||''));
}
function canPostHere(){
  if(myBan)return 'you are '+(myBan.until?'timed out until '+new Date(myBan.until).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'banned')+(myBan.reason?' · '+myBan.reason:'');
  if(cur.t==='channel'){if(cur.c.write_rank>=99)return 'only the bot posts here';if(myRank()<cur.c.write_rank)return 'only '+(cur.c.write_rank>=3?'staff':'og and vip members')+' can post here'}
  else{const o=dmOther(cur.d);if(prof(o).role!=='bot'&&!(rel(o)&&rel(o).s==='friends'))return "you are not friends anymore, so this dm is read-only"}
  return '';
}
function updateComposer(){
  const inp=$('#ch-in'),why=canPostHere();if(!inp)return;
  inp.disabled=!!why;inp.placeholder=why?why:cur.t==='dm'?'message @'+prof(dmOther(cur.d)).username:'message #'+cur.c.name+' · try /help';
  chb.querySelectorAll('.cl-bar .cb').forEach(b=>b.disabled=!!why);
  bar('.cl-notice').textContent=why&&myBan?why:'';bar('.cl-notice').style.display=why&&myBan?'block':'none';
}

/* ---------- messages ---------- */
const byId=id=>msgs.find(m=>m.id===id);
async function onEvent(my,ev){
  if(my!==seq)return;const r=ev.row;
  if(ev.type==='message'){
    if(!people.has(r.user_id))await refreshPeople().catch(()=>{});
    const i=msgs.findIndex(m=>m.id===r.id);
    if(i>=0)msgs[i]={...msgs[i],...r,reactions:msgs[i].reactions,reply:msgs[i].reply};
    else{const n={...r,reactions:[],reply:null};
      if(r.reply_to){const q=byId(r.reply_to);n.reply=q?{id:q.id,user_id:q.user_id,content:q.content,deleted:q.deleted,gif_url:q.gif_url}:await ChatAPI.message(r.reply_to).catch(()=>null)}
      if(!msgs.some(m=>m.id===r.id))msgs.push(n);
      if(cur.t==='dm'&&r.user_id!==me.id)markRead(cur.d)}
  }else{
    const m=byId(r.message_id);if(!m)return;
    const has=m.reactions.some(x=>x.user_id===r.user_id&&x.emoji===r.emoji);
    if(r.active&&!has)m.reactions=[...m.reactions,{user_id:r.user_id,emoji:r.emoji}];
    if(!r.active&&has)m.reactions=m.reactions.filter(x=>!(x.user_id===r.user_id&&x.emoji===r.emoji));
  }
  if(editing){pendingRender=true;return}
  const box=bar('.cmsgs'),near=box.scrollHeight-box.scrollTop-box.clientHeight<140;renderMsgs(near);
}
function renderMsgs(stick){
  const box=bar('.cmsgs');if(!box)return;const keep=box.scrollTop;pendingRender=false;
  if(!msgs.length){box.replaceChildren(el('p','cm-empty',chErr||(cur&&cur.t==='dm'?'no messages yet. say hi.':cur&&cur.t==='channel'?'no messages yet in #'+cur.c.name+'.':'')));chErr='';return}
  const nodes=msgs.map((m,i)=>msgEl(m,msgs[i-1]));
  if(hasMore){const b=el('button','cm-more','load older messages');b.onclick=loadOlder;nodes.unshift(b)}
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
function msgEl(m,prev){
  const p=prof(m.user_id),mine=m.user_id===me.id;
  const same=prev&&prev.user_id===m.user_id&&!prev.deleted&&!m.deleted&&!m.reply_to&&new Date(m.created_at)-new Date(prev.created_at)<3e5;
  const row=el('div','cm'+(same?' same':'')+(m.deleted?' gone':'')+(p.role==='bot'?' bot':''));row.dataset.id=m.id;
  if(!same){const a=avatar(p,34);a.onclick=()=>profilePopup(m.user_id);row.append(a)}
  const body=el('div','cm-body');
  if(m.reply_to){
    const q=m.reply||byId(m.reply_to),rp=q?prof(q.user_id):null,r=el('div','cm-reply');
    r.append(el('i','','↳'));
    if(q){r.append(nameEl(rp,'rn'),el('span','rt',q.deleted?'message removed':preview(q)))}else r.append(el('span','rt','original message not available'));
    r.onclick=()=>{const t=bar(`.cm[data-id="${m.reply_to}"]`);if(t){t.scrollIntoView({block:'center'});t.classList.add('flash');setTimeout(()=>t.classList.remove('flash'),1200)}else toast('that message is further up. load older messages',2500)};
    body.append(r);
  }
  if(!same){const h=el('div','cm-h'),n=nameEl(p,'cm-name');n.onclick=()=>profilePopup(m.user_id);h.append(n);const rb=roleBadge(p.role);if(rb)h.append(rb);h.append(el('small','',timeOf(m.created_at)));body.append(h)}
  if(editing===m.id){
    const t=el('textarea','cm-edit');t.value=editDraft;t.maxLength=500;t.rows=Math.min(6,Math.max(2,editDraft.split('\n').length));
    t.oninput=()=>editDraft=t.value;
    t.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveEdit(m)}if(e.key==='Escape'){e.stopPropagation();stopEdit()}};
    body.append(t,el('small','cm-edit-hint','enter to save · esc to cancel'));
  }else{
    if(m.deleted||m.content){
      const t=el('div','cm-t');
      if(m.deleted)t.textContent='message removed';
      else if(cur&&cur.t==='channel'&&cur.c.write_rank>=3&&rank(p.role)>=3)linkify(m.content,t);
      else t.textContent=m.content;
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
  const add=(label,title,fn)=>{const b=el('button','',label);b.title=title;b.onclick=e=>{e.stopPropagation();fn(b)};tools.append(b)};
  if(!myBan)add('☺+','add reaction',()=>quickPick(m,row));
  if(!canPostHere())add('reply','reply',()=>{replyTo=m;renderReply();$('#ch-in').focus()});
  if(mine&&!myBan)add('edit','edit your message',()=>{editing=m.id;editDraft=m.content;renderMsgs()});
  if((mine||(cur.t==='channel'&&myRank()>=3))&&!(mine&&myBan))add('delete','delete',async()=>{
    try{await ChatAPI.remove(m.id);const i=msgs.findIndex(x=>x.id===m.id);if(i>=0)msgs[i]={...msgs[i],deleted:true,content:'',gif_url:null};renderMsgs()}catch(e){toast(e.message,3000)}});
  if(!mine&&prof(m.user_id).role!=='bot')add('report','report this message',async()=>{
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
  closePanel();
  const inp=$('#ch-in'),text=gifUrl?'':inp.value.trim();if((!text&&!gifUrl)||inp.disabled||!cur||cur.t==='friends')return;inp.disabled=true;
  try{const r=await ChatAPI.send(sc(),text,replyTo&&replyTo.id,gifUrl);if(!gifUrl){inp.value='';inp.style.height='auto';bar('.cl-count').textContent=''}
    replyTo=null;renderReply();
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

/* ---------- people on the right, grouped by role ---------- */
function renderMembers(){
  const box=bar('.cl-people');if(!box)return;
  const real=[...people.values()].filter(p=>p.role!=='bot');
  const order=(a,b)=>(online.has(b.id)-online.has(a.id))||a.display_name.localeCompare(b.display_name);
  const item=p=>{const b=el('button','cp'+(online.has(p.id)?'':' off'));b.append(avatarDot(p,26),nameEl(p));const rb=roleBadge(p.role);if(rb)b.append(rb);b.onclick=()=>profilePopup(p.id);return b};
  const sec=(t,list,extra)=>{if(!list.length)return null;const s=el('div','cp-sec'),on=list.filter(p=>online.has(p.id)).length;
    s.append(el('h5','',t+' — '+list.length+(extra===false?'':' · '+on+' online')),...list.slice(0,150).map(item));if(list.length>150)s.append(el('p','cl-none','+ '+(list.length-150)+' more'));return s};
  const groups=ROLE_GROUPS.map(([r,label])=>sec(label,real.filter(p=>p.role===r).sort(order))),bots=[...people.values()].filter(p=>p.role==='bot');
  box.replaceChildren(...groups.filter(Boolean),...(bots.length?[sec('bot',bots,false)]:[]));counts();
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
  if(id===me.id)btn('edit profile',()=>{d.close();openSettings('profile')});
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
