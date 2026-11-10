/* chat page: sign in / sign up, channels in categories, DMs, friends, replies, reactions, edits, roles, the helper bot.
   Talks only to ChatAPI (see chat-api.js). */
(()=>{
const ch=$('#ch'),chb=$('#chbody');
const AV=[['copper',0,1],['gold',15,1.1],['red',335,1.2],['pink',305,1.2],['purple',245,1.1],['blue',200,1.1],['teal',150,1],['green',95,.9],['ash',0,0]];
const COLORS=['#ff7b2e','#ffa31f','#ff4b4b','#ff3fa4','#a35cf6','#6d7bff','#3ecdb2','#7fd36a','#e9e3d3'];
const RANK={bot:0,member:1,og:2,vip:2,mod:3,admin:4,owner:5};
const BOT='00000000-0000-0000-0000-00000000c0b0';
const EMO=['👍','😂','🔥','👀','🎉','💀','😮','🧡'];                       // keep in sync with schema.sql
const RESERVED=['admin','mod','moderator','owner','copper','system','staff','support','everyone','here','helper','bot','copperbot'];
const PX={
  crown:['#...#...#','##..#..##','#########','#########','.#######.'],
  shield:['#######','#######','#######','#######','#######','.#####.','..###..','...#...'],
  gem:['..###..','.#####.','#######','.#####.','..###..','...#...'],
  flame:['...#...','..##...','..###..','.#####.','#######','#######','.#####.']};
const BADGE={owner:['crown','#ffb21e'],admin:['shield','#ff5a4e'],mod:['shield','#3ecdb2'],vip:['gem','#a35cf6'],og:['flame','#ff7b2e']};

let me=null,cats=[],chans=[],people=new Map(),online=new Set(),friends=[],dms=[],cur=null,msgs=[],hasMore=false,seq=0;
let replyTo=null,editing=null,editDraft='',started=false,chErr='',myBan=null,collapsed=new Set(),friendTab='all',pendingRender=false;
let offScope=null,offPres=null,offFriends=null,offDms=null;

/* ---------- small helpers ---------- */
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const rank=r=>RANK[r]==null?1:RANK[r];
const myRank=()=>me?rank(me.role):0;
const prof=id=>people.get(id)||{id,display_name:'someone',username:'?',color:'#8c8279',avatar:'ash',role:'member',bio:''};
const avatar=(key,size=32)=>{const a=AV.find(x=>x[0]===key)||AV[0],i=new Image();i.src=$('#golem').src;i.alt='';i.className='cav';
  i.style.cssText=`width:${size*.75}px;height:${size}px;filter:hue-rotate(${a[1]}deg) saturate(${a[2]})`;return i};
function pxSvg(rows,color,px=2){const w=rows[0].length;return `<svg viewBox="0 0 ${w} ${rows.length}" width="${w*px}" height="${rows.length*px}" shape-rendering="crispEdges" fill="${color}">`+
  rows.map((r,y)=>[...r].map((c,x)=>c==='#'?`<rect x="${x}" y="${y}" width="1" height="1"/>`:'').join('')).join('')+'</svg>'}
function roleBadge(role){
  if(role==='bot'){const s=el('span','rbot','bot');s.title='bot';return s}
  const b=BADGE[role];if(!b)return null;const s=el('span','rb');s.title=role;s.innerHTML=pxSvg(PX[b[0]],b[1]);return s}
const timeOf=iso=>{const d=new Date(iso),n=new Date(),t=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});return d.toDateString()===n.toDateString()?t:d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+t};
const snip=(t,n=80)=>{t=(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1)+'…':t};
const nameEl=(p,cls)=>{const n=el('b',cls||'',p.display_name);n.style.color=p.color;return n};
const dialog=(title,cls='wide')=>{const d=el('dialog',cls);d.append(Object.assign(el('div','dh'),{innerHTML:`<h3></h3><button class="ib" type="button">×</button>`}));
  d.querySelector('h3').textContent=title;d.querySelector('button').onclick=()=>d.close();d.onclose=()=>d.remove();return d};
const openDialog=d=>{document.body.append(d);d.showModal();document.activeElement&&document.activeElement.blur()};
const rel=id=>{const f=friends.find(f=>f.requester===id||f.addressee===id);return !f?null:f.status==='accepted'?{s:'friends',f}:f.requester===me.id?{s:'out',f}:{s:'in',f}};
const dmOther=d=>d.user_a===me.id?d.user_b:d.user_a;
const dmUnread=d=>{const mine=d.user_a===me.id?d.a_read_at:d.b_read_at;return !!(d.last_sender&&d.last_sender!==me.id&&d.last_message_at&&(!mine||new Date(d.last_message_at)>new Date(mine)))};
const pendingIn=()=>friends.filter(f=>f.status==='pending'&&f.addressee===me.id);
const canSeeChan=c=>myRank()>=c.read_rank;
const sc=()=>cur.t==='dm'?{dm:cur.d.id}:{channel:cur.c.id};
const bar=(n)=>chb.querySelector(n);

/* ---------- opening and closing ---------- */
$('#open-chat').onclick=openChat;
$('#ch-back').onclick=closeChat;
$('#ch-members').onclick=()=>{chb.classList.remove('show-left');chb.classList.toggle('show-members')};
$('#ch-menu').onclick=()=>{chb.classList.remove('show-members');chb.classList.toggle('show-left')};
addEventListener('keydown',e=>{if(e.key==='Escape'&&ch.classList.contains('on')&&!document.querySelector('dialog[open]')&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))closeChat()});
function unsub(){[offScope,offPres,offFriends,offDms].forEach(f=>f&&f());offScope=offPres=offFriends=offDms=null}
function closeChat(){ch.classList.remove('on');unsub()}   // free the connections while the page is closed
async function openChat(){
  ch.classList.add('on');
  if(!started){started=true;return boot()}
  if(me)resume();
}
async function boot(){
  if(!ChatAPI.configured){chb.replaceChildren(empty("chat isn't switched on yet"));return}
  chb.replaceChildren(empty('connecting…',null,true));
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
  if(first)editProfile(true);
}
async function resume(){ // coming back to the chat page after closing it
  try{await loadAll()}catch(e){return toast(e.message,3000)}
  renderLeft();connect();
  if(cur&&cur.t==='channel')cur.c=chans.find(c=>c.id===cur.c.id)||chans[0];
  go(cur&&cur.t==='dm'?{t:'dm',d:dms.find(d=>d.id===cur.d.id)||cur.d}:cur||{t:'channel',c:chans[0]});
}
async function refreshPeople(){(await ChatAPI.members()).forEach(p=>people.set(p.id,p));if(me&&people.has(me.id))me=people.get(me.id)}
function empty(msg,retry,spin){const d=el('div','mg-empty',msg);if(retry){const b=el('button','mg-btn','try again');b.onclick=retry;d.append(document.createElement('br'),b)}return d}

/* ---------- live connections ---------- */
function connect(){
  unsub();
  online=new Set([BOT]);
  offPres=ChatAPI.presence(me,ids=>{online=new Set([...ids,BOT]);renderMembers();counts()});
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
      el('p','hint',up?'One account per person. You can make your avatar, color and bio after you are in. Keep real names, schools and addresses out of chat.':'Sign in with your username and password.'),
      tabs,f,
      el('p','hint small',up?'Forgot your password later? Without an email, a staff member has to reset it for you.':'No account yet? Use the sign up tab.'));
    un.focus();
  };
  draw();chb.replaceChildren(box);
}

/* ---------- your profile + account ---------- */
function editProfile(welcome){
  const d=dialog(welcome?'welcome! make it yours':'your profile');
  const v={color:me.color,avatar:me.avatar};
  const f=el('form','pf');
  const row=(label,node)=>{const w=el('label','pf-row');w.append(el('span','',label),node);return w};
  const dn=el('input');dn.value=me.display_name;dn.maxLength=24;dn.placeholder='what people see (1-24)';
  const bio=el('textarea');bio.value=me.bio||'';bio.maxLength=140;bio.rows=2;bio.placeholder='a line about you (optional)';
  const sw=el('div','swatches');COLORS.forEach(c=>{const b=el('button','sw');b.type='button';b.style.background=c;b.onclick=()=>{v.color=c;draw()};sw.append(b)});
  const av=el('div','swatches');AV.forEach(a=>{const b=el('button','sw av');b.type='button';b.append(avatar(a[0],26));b.onclick=()=>{v.avatar=a[0];draw()};av.append(b)});
  const prev=el('div','pf-prev'),err=el('p','pf-err'),go=el('button','mg-btn pri','save');go.type='submit';
  function draw(){sw.querySelectorAll('.sw').forEach((b,i)=>b.classList.toggle('on',COLORS[i]===v.color));av.querySelectorAll('.sw').forEach((b,i)=>b.classList.toggle('on',AV[i][0]===v.avatar));
    prev.replaceChildren(avatar(v.avatar,40),Object.assign(el('b','',dn.value||'your name'),{style:`color:${v.color}`}),el('small','','@'+me.username))}
  dn.oninput=draw;draw();
  f.append(row('display name',dn),row('name color',sw),row('avatar',av),row('bio',bio),prev,err,go);
  f.onsubmit=async e=>{e.preventDefault();err.textContent='';const name=dn.value.trim();if(!name)return err.textContent='pick a display name';
    go.disabled=true;try{me=await ChatAPI.updateProfile({display_name:name,color:v.color,avatar:v.avatar,bio:bio.value.trim()});people.set(me.id,me);d.close();renderLeft();renderMembers();renderMsgs()}
    catch(x){err.textContent=x.message}finally{go.disabled=false}};
  d.append(f);
  if(!welcome){
    const acc=el('div','acct');acc.append(el('h4','','account'));
    const em=el('input');em.type='email';em.placeholder='recovery email (optional)';em.autocomplete='email';
    ChatAPI.myRecoveryEmail().then(e=>em.value=e).catch(()=>{});
    const saveEm=el('button','mg-btn','save email');saveEm.type='button';saveEm.onclick=async()=>{try{await ChatAPI.setRecoveryEmail(em.value.trim());toast('email saved')}catch(x){toast(x.message,3000)}};
    const r1=el('div','acct-row');r1.append(em,saveEm);
    const op=el('input');op.type='password';op.placeholder='current password';op.autocomplete='current-password';
    const np=el('input');np.type='password';np.placeholder='new password (8+)';np.autocomplete='new-password';
    const chg=el('button','mg-btn','change password');chg.type='button';chg.onclick=async()=>{
      if(np.value.length<8)return toast('new password: at least 8 characters',2500);
      try{await ChatAPI.changePassword(op.value,np.value);op.value=np.value='';toast('password changed')}catch(x){toast(x.message,3000)}};
    const r2=el('div','acct-row');r2.append(op,np,chg);
    const out=el('button','mg-btn','sign out');out.type='button';out.onclick=signOut;
    const del=el('button','pf-del','delete my account and chat data');del.type='button';
    del.onclick=async()=>{if(!confirm('Delete your account, messages, friends and DMs? This cannot be undone.'))return;
      try{await ChatAPI.deleteMe();location.reload()}catch(x){toast(x.message,3500)}};
    acc.append(r1,r2,out,del);d.append(acc);
  }
  openDialog(d);
}
async function signOut(){
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());unsub();
  try{await ChatAPI.signOut()}catch{}
  me=null;people.clear();friends=[];dms=[];cur=null;msgs=[];started=true;showAuth();$('#ch-counts').textContent='';
}

/* ---------- layout ---------- */
function layout(){
  const left=el('aside','cl-left'),main=el('div','cl-main'),right=el('aside','cl-right');
  const scroll=el('div','cl-scroll');left.append(scroll,el('div','cl-me'));
  const chat=el('div','cl-chat'),head=el('div','cl-head'),list=el('div','cmsgs'),rep=el('div','cl-reply'),notice=el('div','cl-notice'),bar=el('div','cl-bar'),inp=el('textarea');
  inp.rows=1;inp.maxLength=500;inp.id='ch-in';const count=el('small','cl-count','');bar.append(inp,count);
  chat.append(head,list,rep,notice,bar);
  main.append(chat,el('div','cl-friends'));
  right.append(el('div','cl-people'));
  chb.replaceChildren(left,main,right);chb.classList.remove('show-members','show-left');
  inp.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}if(e.key==='Escape'&&replyTo){replyTo=null;renderReply()}};
  inp.oninput=()=>{count.textContent=inp.value.length>400?inp.value.length+'/500':'';inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,120)+'px'};
  list.addEventListener('click',e=>{ // tap a message to show its tools on touch screens
    if(!matchMedia('(hover:none)').matches)return;const row=e.target.closest('.cm');if(!row||e.target.closest('button,a,textarea'))return;
    const was=row.classList.contains('open');list.querySelectorAll('.cm.open').forEach(x=>x.classList.remove('open'));if(!was)row.classList.add('open')});
  renderLeft();
}
function renderLeft(){
  const s=bar('.cl-scroll'),m=bar('.cl-me');if(!s||!me)return;
  const keep=s.scrollTop,pend=pendingIn().length;
  const fb=el('button','chn fr'+(cur&&cur.t==='friends'?' on':''),'friends');fb.prepend(el('i','','☺'));if(pend)fb.append(Object.assign(el('em','pill',String(pend))));
  fb.onclick=()=>go({t:'friends'});
  const parts=[fb];
  const sorted=[...dms].sort((a,b)=>(b.last_message_at||'').localeCompare(a.last_message_at||''));
  parts.push(el('div','cl-cat static','direct messages'));
  if(!sorted.length)parts.push(el('p','cl-none','no dms yet. add a friend, then message them'));
  sorted.forEach(d=>{const p=prof(dmOther(d)),b=el('button','chn dm'+(cur&&cur.t==='dm'&&cur.d.id===d.id?' on':'')+(dmUnread(d)?' unread':''));
    b.append(avatar(p.avatar,20),el('span','nm',p.display_name));const rb=roleBadge(p.role);if(rb)b.append(rb);if(dmUnread(d))b.append(el('em','dot'));
    b.onclick=()=>go({t:'dm',d});parts.push(b)});
  cats.forEach(c=>{
    const list=chans.filter(k=>k.category_id===c.id&&canSeeChan(k));if(!list.length)return;
    const h=el('button','cl-cat'+(collapsed.has(c.id)?' shut':''),c.name);h.onclick=()=>{collapsed.has(c.id)?collapsed.delete(c.id):collapsed.add(c.id);renderLeft()};parts.push(h);
    if(!collapsed.has(c.id))list.forEach(k=>{const b=el('button','chn'+(cur&&cur.t==='channel'&&cur.c.id===k.id?' on':''),k.name);b.prepend(el('i','','#'));
      const tag=k.write_rank>=99?'bot':k.read_rank>=3?'staff':k.read_rank===2?'vip':k.write_rank>=3?'read-only':'';if(tag)b.append(el('em','tag',tag));
      b.onclick=()=>go({t:'channel',c:k});parts.push(b)});
  });
  s.replaceChildren(...parts);s.scrollTop=keep;
  const info=el('div','cl-meinfo'),line=el('div','cl-line');line.append(nameEl(me));const rb=roleBadge(me.role);if(rb)line.append(rb);
  info.append(line,el('small','','@'+me.username));const gear=el('button','ib','⚙');gear.title='your profile and account';gear.onclick=()=>editProfile();
  m.replaceChildren(avatar(me.avatar,34),info,gear);
}
function counts(){const n=[...online].filter(id=>people.has(id)&&prof(id).role!=='bot').length,t=[...people.values()].filter(p=>p.role!=='bot').length;$('#ch-counts').textContent=`${n} online · ${t} member${t===1?'':'s'}`}

/* ---------- going somewhere (channel, DM or friends page) ---------- */
async function go(t){
  const my=++seq;cur=t;chb.classList.remove('show-left','show-members');
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
  if(cur.t==='dm'){const p=prof(dmOther(cur.d));const n=nameEl(p);n.onclick=()=>profilePopup(p.id);head.replaceChildren(avatar(p.avatar,26),n,el('span','','@'+p.username+(p.role==='bot'?' · answers every message':'')))}
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
      if(r.reply_to){const q=byId(r.reply_to);n.reply=q?{id:q.id,user_id:q.user_id,content:q.content,deleted:q.deleted}:await ChatAPI.message(r.reply_to).catch(()=>null)}
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
  if(!same){const a=avatar(p.avatar,30);a.onclick=()=>profilePopup(m.user_id);row.append(a)}
  const body=el('div','cm-body');
  if(m.reply_to){
    const q=m.reply||byId(m.reply_to),rp=q?prof(q.user_id):null,r=el('div','cm-reply');
    r.append(el('i','','↳'));
    if(q){r.append(nameEl(rp,'rn'),el('span','rt',q.deleted?'message removed':snip(q.content)))}else r.append(el('span','rt','original message not available'));
    r.onclick=()=>{const t=bar(`.cm[data-id="${m.reply_to}"]`);if(t){t.scrollIntoView({block:'center'});t.classList.add('flash');setTimeout(()=>t.classList.remove('flash'),1200)}else toast('that message is further up. load older messages',2500)};
    body.append(r);
  }
  if(!same){const h=el('div','cm-h'),n=nameEl(p,'cm-name');n.onclick=()=>profilePopup(m.user_id);h.append(n);const rb=roleBadge(p.role);if(rb)h.append(rb);h.append(el('small','',timeOf(m.created_at)));body.append(h)}
  if(editing===m.id){
    const t=el('textarea','cm-edit');t.value=editDraft;t.maxLength=500;t.rows=Math.min(6,Math.max(2,editDraft.split('\n').length));
    t.oninput=()=>editDraft=t.value;
    t.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveEdit(m)}if(e.key==='Escape'){e.stopPropagation();stopEdit()}};
    const hint=el('small','cm-edit-hint','enter to save · esc to cancel');body.append(t,hint);
  }else{
    const t=el('div','cm-t');
    if(m.deleted)t.textContent='message removed';
    else if(cur&&cur.t==='channel'&&cur.c.write_rank>=3&&rank(p.role)>=3)linkify(m.content,t);
    else t.textContent=m.content;
    if(m.edited_at&&!m.deleted)t.append(Object.assign(el('small','edited',' (edited)'),{title:'edited '+timeOf(m.edited_at)}));
    body.append(t);
  }
  if(!m.deleted&&m.reactions&&m.reactions.length){
    const g=new Map();m.reactions.forEach(x=>{if(!g.has(x.emoji))g.set(x.emoji,[]);g.get(x.emoji).push(x.user_id)});
    const rr=el('div','cm-rx');
    EMO.filter(e=>g.has(e)).forEach(e=>{const users=g.get(e),b=el('button','rx'+(users.includes(me.id)?' mine':''));b.append(el('span','',e),el('b','',String(users.length)));
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
  if(!myBan)add('☺+','add reaction',()=>picker(m,row));
  if(!canPostHere())add('reply','reply',()=>{replyTo=m;renderReply();$('#ch-in').focus()});
  if(mine&&!myBan)add('edit','edit your message',()=>{editing=m.id;editDraft=m.content;renderMsgs()});
  if((mine||(cur.t==='channel'&&myRank()>=3))&&!(mine&&myBan))add('delete','delete',async()=>{
    try{await ChatAPI.remove(m.id);const i=msgs.findIndex(x=>x.id===m.id);if(i>=0)msgs[i]={...msgs[i],deleted:true,content:''};renderMsgs()}catch(e){toast(e.message,3000)}});
  if(!mine&&prof(m.user_id).role!=='bot')add('report','report this message',async()=>{
    const why=prompt('Report this message? Say why (optional):');if(why===null)return;
    try{await ChatAPI.report(m.id,why);toast('reported · thanks')}catch(e){toast(e.message,3000)}});
  return tools;
}
function picker(m,row){
  document.querySelectorAll('.cm-pick').forEach(x=>x.remove());
  const pk=el('div','cm-pick');EMO.forEach(e=>{const b=el('button','',e);b.onclick=ev=>{ev.stopPropagation();pk.remove();react(m,e)};pk.append(b)});
  row.append(pk);const off=ev=>{if(!pk.contains(ev.target)){pk.remove();document.removeEventListener('click',off,true)}};setTimeout(()=>document.addEventListener('click',off,true),0);
}
async function react(m,emoji){
  const i=m.reactions.findIndex(x=>x.user_id===me.id&&x.emoji===emoji);   // show it right away, the server confirms through realtime
  m.reactions=i>=0?m.reactions.filter((_,k)=>k!==i):[...m.reactions,{user_id:me.id,emoji}];renderMsgs();
  try{await ChatAPI.react(m.id,emoji)}catch(e){m.reactions=i>=0?[...m.reactions,{user_id:me.id,emoji}]:m.reactions.filter(x=>!(x.user_id===me.id&&x.emoji===emoji));renderMsgs();toast(e.message,3000)}
}
function stopEdit(){editing=null;editDraft='';renderMsgs()}
async function saveEdit(m){
  const text=editDraft.trim();if(!text)return toast('a message cannot be empty. delete it instead',2500);
  if(text===m.content)return stopEdit();
  try{await ChatAPI.edit(m.id,text);const i=msgs.findIndex(x=>x.id===m.id);if(i>=0)msgs[i]={...msgs[i],content:text,edited_at:new Date().toISOString()};stopEdit()}
  catch(e){toast(e.message,3000)}
}
function renderReply(){
  const r=bar('.cl-reply');if(!r)return;
  if(!replyTo){r.style.display='none';r.replaceChildren();return}
  const p=prof(replyTo.user_id),x=el('button','ib','×');x.title='cancel reply';x.onclick=()=>{replyTo=null;renderReply()};
  r.style.display='flex';r.replaceChildren(el('span','','replying to '),nameEl(p),el('span','rt',snip(replyTo.content,60)),x);
}
async function send(){
  const inp=$('#ch-in'),text=inp.value.trim();if(!text||inp.disabled||!cur||cur.t==='friends')return;inp.disabled=true;
  try{const r=await ChatAPI.send(sc(),text,replyTo&&replyTo.id);inp.value='';inp.style.height='auto';bar('.cl-count').textContent='';
    replyTo=null;renderReply();
    if(r&&!msgs.some(m=>m.id===r.id)){msgs.push(r);renderMsgs(true)}
    if(typeof badge==='function')badge('hello')}
  catch(e){toast(e.message,3000)}finally{updateComposer();if(!inp.disabled)inp.focus()}
}

/* ---------- people on the right ---------- */
function renderMembers(){
  const box=bar('.cl-people');if(!box)return;
  const all=[...people.values()].sort((a,b)=>rank(b.role)-rank(a.role)||a.display_name.localeCompare(b.display_name));
  const on=all.filter(p=>online.has(p.id)),off=all.filter(p=>!online.has(p.id));
  const sec=(t,list)=>{const s=el('div','cp-sec');s.append(el('h5','',t+' — '+list.length),...list.map(p=>{
    const b=el('button','cp'+(online.has(p.id)?'':' off'));b.append(avatar(p.avatar,24),nameEl(p));
    const rb=roleBadge(p.role);if(rb)b.append(rb);b.onclick=()=>profilePopup(p.id);return b}));return s};
  box.replaceChildren(sec('online',on),sec('offline',off.slice(0,100)));counts();
}

/* ---------- friends page ---------- */
function renderFriends(){
  const box=bar('.cl-friends');if(!box||!cur||cur.t!=='friends')return;
  const mine=friends.filter(f=>f.status==='accepted').map(f=>prof(f.requester===me.id?f.addressee:f.requester));
  const inc=friends.filter(f=>f.status==='pending'&&f.addressee===me.id),out=friends.filter(f=>f.status==='pending'&&f.requester===me.id);
  const tabs=el('div','seg');
  [['all','all friends ('+mine.length+')'],['online','online'],['pending','requests'+(inc.length?' ('+inc.length+')':'')],['add','add friend']].forEach(([k,t])=>{
    const b=el('button',k===friendTab?'on':'',t);b.onclick=()=>{friendTab=k;renderFriends()};tabs.append(b)});
  const list=el('div','fr-list');
  const person=(p,btns)=>{const r=el('div','fr-row');r.append(avatar(p.avatar,30));const w=el('div','fr-who');w.append(nameEl(p),el('small','','@'+p.username+(online.has(p.id)?' · online':'')));
    w.onclick=()=>profilePopup(p.id);r.append(w);const a=el('div','fr-act');btns.forEach(([t,fn,cls])=>{const b=el('button','mg-btn '+(cls||''),t);b.onclick=fn;a.append(b)});r.append(a);return r};
  const guard=fn=>async()=>{try{await fn()}catch(e){toast(e.message,3000)}};
  if(friendTab==='all'||friendTab==='online'){
    const l=(friendTab==='online'?mine.filter(p=>online.has(p.id)):mine);
    if(!l.length)list.append(el('p','cm-empty',friendTab==='online'?'none of your friends are online right now':'no friends yet. use "add friend" and type their username'));
    l.forEach(p=>list.append(person(p,[['message',guard(()=>openDmWith(p.id))],['remove',guard(async()=>{if(!confirm('Remove '+p.display_name+' from your friends?'))return;await ChatAPI.friendRemove(p.id);friends=await ChatAPI.friendships();renderFriends();renderLeft()}),'warn']])));
  }else if(friendTab==='pending'){
    if(!inc.length&&!out.length)list.append(el('p','cm-empty','no pending requests'));
    if(inc.length)list.append(el('h5','fr-h','incoming — '+inc.length));
    inc.forEach(f=>list.append(person(prof(f.requester),[['accept',guard(async()=>{await ChatAPI.friendRespond(f.id,true);friends=await ChatAPI.friendships();renderFriends();renderLeft();toast('you are now friends')}),'pri'],['decline',guard(async()=>{await ChatAPI.friendRespond(f.id,false);friends=await ChatAPI.friendships();renderFriends();renderLeft()})]])));
    if(out.length)list.append(el('h5','fr-h','sent — '+out.length));
    out.forEach(f=>list.append(person(prof(f.addressee),[['cancel',guard(async()=>{await ChatAPI.friendRemove(f.addressee);friends=await ChatAPI.friendships();renderFriends();renderLeft()})]])));
  }else{
    const f=el('form','pf fr-add');const i=el('input');i.placeholder='their username';i.maxLength=20;i.autocomplete='off';i.autocapitalize='off';
    const err=el('p','pf-err'),go=el('button','mg-btn pri','send friend request');go.type='submit';
    f.append(el('p','hint','Type the exact username (the part after @). They get a request and can accept or decline.'),i,err,go);
    f.onsubmit=async e=>{e.preventDefault();err.textContent='';const u=i.value.trim().toLowerCase().replace(/^@/,'');if(!u)return;go.disabled=true;
      try{const r=await ChatAPI.friendRequest(u);i.value='';friends=await ChatAPI.friendships();renderLeft();toast(r==='accepted'?'you are now friends':'request sent to @'+u)}
      catch(x){err.textContent=x.message}finally{go.disabled=false}};
    list.append(f);
  }
  box.replaceChildren(Object.assign(el('div','cl-head'),{}),tabs,list);
  box.firstChild.append(el('b','','friends'),el('span','','requests, adding people and starting dms'));
}
async function openDmWith(id){
  const did=await ChatAPI.openDm(id);
  if(!dms.some(d=>d.id===did))dms=await ChatAPI.dms();
  go({t:'dm',d:dms.find(d=>d.id===did)});
}

/* ---------- someone's profile ---------- */
function profilePopup(id){
  const p=prof(id),d=dialog('profile');
  const top=el('div','pp-top'),who=el('div','pp-who');who.append(nameEl(p));const rb=roleBadge(p.role);if(rb)who.append(rb);
  who.append(el('small','','@'+p.username+' · '+p.role),el('small','',online.has(id)?'online now':'offline'));top.append(avatar(p.avatar,56),who);
  d.append(top,el('p','pp-bio',p.bio||'no bio yet'),el('p','hint','joined '+new Date(p.created_at).toLocaleDateString()));
  const act=el('div','pp-act');
  const run=(fn,msg)=>async()=>{try{await fn();if(msg)toast(msg);d.close()}catch(e){toast(e.message,3000)}};
  const btn=(t,fn,cls)=>{const b=el('button','mg-btn '+(cls||''),t);b.onclick=fn;act.append(b);return b};
  if(id===me.id)btn('edit profile',()=>{d.close();editProfile()});
  else{
    if(p.role==='bot')btn('message',run(()=>openDmWith(id)),'pri');
    else{const r=rel(id);
      if(!r)btn('add friend',run(async()=>{const x=await ChatAPI.friendRequest(p.username);friends=await ChatAPI.friendships();renderLeft();toast(x==='accepted'?'you are now friends':'request sent')}),'pri');
      else if(r.s==='out')btn('cancel request',run(async()=>{await ChatAPI.friendRemove(id);friends=await ChatAPI.friendships();renderLeft()}));
      else if(r.s==='in'){btn('accept request',run(async()=>{await ChatAPI.friendRespond(r.f.id,true);friends=await ChatAPI.friendships();renderLeft()}),'pri');btn('decline',run(async()=>{await ChatAPI.friendRespond(r.f.id,false);friends=await ChatAPI.friendships();renderLeft()}))}
      else{btn('message',run(()=>openDmWith(id)),'pri');btn('remove friend',run(async()=>{await ChatAPI.friendRemove(id);friends=await ChatAPI.friendships();renderLeft();if(cur&&cur.t==='dm')updateComposer()}),'warn')}
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
