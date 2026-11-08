/* chat page: channels, messages, profiles, roles, who's online. Talks only to ChatAPI (see chat-api.js). */
(()=>{
const ch=$('#ch'),chb=$('#chbody');
const AV=[['copper',0,1],['gold',15,1.1],['red',335,1.2],['pink',305,1.2],['purple',245,1.1],['blue',200,1.1],['teal',150,1],['green',95,.9],['ash',0,0]];
const COLORS=['#ff7b2e','#ffa31f','#ff4b4b','#ff3fa4','#a35cf6','#6d7bff','#3ecdb2','#7fd36a','#e9e3d3'];
const RANK={member:1,mod:2,admin:3};
const CROWN=['#...#...#','##..#..##','#########','#########','.#######.'],SHIELD=['#######','#######','#######','#######','#######','.#####.','..###..','...#...'];
let me=null,chans=[],cur=null,msgs=[],people=new Map(),online=new Set(),started=false,offMsg=null,offPres=null,chErr='';

const avatar=(key,size=32)=>{const a=AV.find(x=>x[0]===key)||AV[0],i=new Image();i.src=$('#golem').src;i.alt='';i.className='cav';
  i.style.cssText=`width:${size*.75}px;height:${size}px;filter:hue-rotate(${a[1]}deg) saturate(${a[2]})`;return i};
function pxSvg(rows,color,px=2){const w=rows[0].length;return `<svg viewBox="0 0 ${w} ${rows.length}" width="${w*px}" height="${rows.length*px}" shape-rendering="crispEdges" fill="${color}">`+
  rows.map((r,y)=>[...r].map((c,x)=>c==='#'?`<rect x="${x}" y="${y}" width="1" height="1"/>`:'').join('')).join('')+'</svg>'}
function roleBadge(role){if(role!=='admin'&&role!=='mod')return null;const s=document.createElement('span');s.className='rb';s.title=role;
  s.innerHTML=role==='admin'?pxSvg(CROWN,'#ffa31f'):pxSvg(SHIELD,'#3ecdb2');return s}
const timeOf=iso=>{const d=new Date(iso),n=new Date();return d.toDateString()===n.toDateString()?d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})};
const prof=id=>people.get(id)||{display_name:'someone',username:'?',color:'#8c8279',avatar:'ash',role:'member'};
const canMod=()=>me&&RANK[me.role]>=2;
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};

/* ---------- opening and closing ---------- */
$('#open-chat').onclick=openChat;
$('#ch-back').onclick=closeChat;
$('#ch-members').onclick=()=>chb.classList.toggle('show-members');
addEventListener('keydown',e=>{if(e.key==='Escape'&&ch.classList.contains('on')&&!document.querySelector('dialog[open]')&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName))closeChat()});
function closeChat(){ch.classList.remove('on');if(offMsg){offMsg();offMsg=null}if(offPres){offPres();offPres=null}} // free the connections while the page is closed
async function openChat(){
  ch.classList.add('on');
  if(!started){started=true;return boot()}
  if(me&&cur){subscribe();selectChannel(cur)}
}
async function boot(){
  if(!ChatAPI.configured){chb.replaceChildren(empty("chat isn't switched on yet"));return}
  chb.replaceChildren(empty('connecting…',null,true));
  try{me=await ChatAPI.start()}catch(e){started=false;return chb.replaceChildren(empty(e.message,boot))}
  if(!me)return showSetup();
  enter();
}
async function enter(){
  try{[chans,]=await Promise.all([ChatAPI.channels(),refreshPeople()])}catch(e){started=false;return chb.replaceChildren(empty(e.message,boot))}
  layout();selectChannel(chans.find(c=>c.name==='general')||chans[0]);subscribe();
}
async function refreshPeople(){(await ChatAPI.members()).forEach(p=>people.set(p.id,p));if(me&&people.has(me.id))me=people.get(me.id)}
function subscribe(){if(offPres)offPres();offPres=ChatAPI.presence(me,ids=>{online=new Set(ids);renderMembers();counts()})}

/* ---------- profile form (used for sign-up and editing) ---------- */
function profileForm(init,creating,done){
  const f=el('form','pf');const v={...init};
  const field=(label,node)=>{const w=el('label','pf-row');w.append(el('span','',label),node);return w};
  const un=el('input');un.placeholder='letters, numbers, _ (3-20)';un.value=v.username||'';un.maxLength=20;un.disabled=!creating;un.autocomplete='off';
  const dn=el('input');dn.placeholder='what people see (1-24)';dn.value=v.display_name||'';dn.maxLength=24;
  const bio=el('textarea');bio.placeholder='a line about you (optional)';bio.value=v.bio||'';bio.maxLength=140;bio.rows=2;
  const sw=el('div','swatches');COLORS.forEach(c=>{const b=el('button','sw');b.type='button';b.style.background=c;b.onclick=()=>{v.color=c;draw()};sw.append(b)});
  const av=el('div','swatches');AV.forEach(a=>{const b=el('button','sw av');b.type='button';b.append(avatar(a[0],26));b.onclick=()=>{v.avatar=a[0];draw()};av.append(b)});
  const prev=el('div','pf-prev'),err=el('p','pf-err'),go=el('button','mg-btn pri',creating?'enter chat':'save');go.type='submit';
  v.color=v.color||COLORS[0];v.avatar=v.avatar||'copper';
  function draw(){sw.querySelectorAll('.sw').forEach((b,i)=>b.classList.toggle('on',COLORS[i]===v.color));av.querySelectorAll('.sw').forEach((b,i)=>b.classList.toggle('on',AV[i][0]===v.avatar));
    prev.replaceChildren(avatar(v.avatar,40),Object.assign(el('b','',dn.value||'your name'),{style:`color:${v.color}`}),Object.assign(el('small','','@'+(un.value||'username'))))}
  un.oninput=dn.oninput=draw;draw();
  f.append(field('username',un),field('display name',dn),field('name color',sw),field('avatar',av),field('bio',bio),prev,err,go);
  if(!creating){const del=el('button','pf-del','delete my chat data');del.type='button';
    del.onclick=async()=>{if(!confirm('Delete your chat profile and all your messages? This cannot be undone.'))return;
      try{await ChatAPI.deleteMe();me=null;started=false;people.clear();location.reload()}catch(e){err.textContent=e.message}};f.append(del)}
  f.onsubmit=async e=>{e.preventDefault();err.textContent='';
    const p={username:un.value.trim().toLowerCase(),display_name:dn.value.trim(),color:v.color,avatar:v.avatar,bio:bio.value.trim()};
    if(creating&&!/^[a-z0-9_]{3,20}$/.test(p.username))return err.textContent='username: 3-20 letters, numbers or _';
    if(!p.display_name)return err.textContent='pick a display name';
    go.disabled=true;try{done(creating?await ChatAPI.createProfile(p):await ChatAPI.updateProfile(p))}catch(x){err.textContent=x.message}finally{go.disabled=false}};
  return f;
}
function showSetup(){
  const box=el('div','setup');box.append(el('h2','','join the chat'),
    el('p','hint','Pick a name and a look. No email, no password. Be kind, and keep real names, schools and addresses out of it. Mods can remove messages and ban people.'),
    profileForm({},true,async p=>{me=p;people.set(p.id,p);enter()}));
  chb.replaceChildren(box);
}
function editProfile(){
  const d=el('dialog','wide');d.append(Object.assign(el('div','dh'),{innerHTML:'<h3>your profile</h3><button class="ib" type="button">×</button>'}));
  d.querySelector('button').onclick=()=>d.close();
  d.append(profileForm(me,false,p=>{me=p;people.set(p.id,p);d.close();renderMe();renderMembers();renderMsgs()}));
  d.onclose=()=>d.remove();document.body.append(d);d.showModal();document.activeElement&&document.activeElement.blur();
}

/* ---------- layout ---------- */
function layout(){
  const left=el('aside','cl-left'),main=el('div','cl-main'),right=el('aside','cl-right');
  left.append(el('div','cl-title','channels'),el('div','cl-list'),el('div','cl-me'));
  const head=el('div','cl-head'),list=el('div','cmsgs'),bar=el('div','cl-bar'),inp=el('textarea');inp.rows=1;inp.maxLength=500;inp.id='ch-in';
  const count=el('small','cl-count','');bar.append(inp,count);main.append(head,list,bar);
  right.append(el('div','cl-people'));
  chb.replaceChildren(left,main,right);chb.classList.remove('show-members');
  inp.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}};
  inp.oninput=()=>{count.textContent=inp.value.length>400?inp.value.length+'/500':'';inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,120)+'px'};
  renderChannels();renderMe();
}
function renderChannels(){
  const l=chb.querySelector('.cl-list');l.replaceChildren(...chans.map(c=>{const b=el('button','chn'+(cur&&cur.id===c.id?' on':''),c.name);b.prepend(el('i','','#'));
    if(RANK[c.write_role]>1)b.append(el('em','','mods'));b.onclick=()=>selectChannel(c);return b}));
}
function renderMe(){
  const m=chb.querySelector('.cl-me');if(!m)return;const info=el('div','cl-meinfo');const nm=el('b','',me.display_name);nm.style.color=me.color;
  info.append(nm,el('small','','@'+me.username));const b=el('button','ib','⚙');b.title='edit your profile';b.onclick=editProfile;
  m.replaceChildren(avatar(me.avatar,34),info,b);const rb=roleBadge(me.role);if(rb)info.firstChild.after(rb);
}
function counts(){const n=online.size,t=people.size;$('#ch-counts').textContent=`${n} online · ${t} member${t===1?'':'s'}`}

/* ---------- messages ---------- */
async function selectChannel(c){
  cur=c;renderChannels();if(offMsg){offMsg();offMsg=null}
  const head=chb.querySelector('.cl-head');head.replaceChildren(Object.assign(el('b','','# '+c.name)),el('span','',c.topic||''));
  const inp=$('#ch-in'),can=RANK[me.role]>=RANK[c.write_role];inp.disabled=!can;inp.placeholder=can?'message #'+c.name:'only '+c.write_role+'s can post here';
  msgs=[];renderMsgs();
  try{msgs=await ChatAPI.messages(c.id);if(cur!==c)return}catch(e){chErr=e.message}
  const unknown=msgs.some(m=>!people.has(m.user_id));if(unknown)await refreshPeople().catch(()=>{});
  renderMsgs(true);
  offMsg=ChatAPI.onMessage(c.id,async ev=>{
    if(cur!==c)return;const r=ev.row;
    if(!people.has(r.user_id))await refreshPeople().catch(()=>{});
    const i=msgs.findIndex(m=>m.id===r.id);if(i>=0)msgs[i]=r;else msgs.push(r);
    const box=chb.querySelector('.cmsgs'),near=box.scrollHeight-box.scrollTop-box.clientHeight<120;renderMsgs(near);
  });
}
function renderMsgs(stick){
  const box=chb.querySelector('.cmsgs');if(!box)return;const keep=box.scrollTop;
  if(!msgs.length){box.replaceChildren(el('p','cm-empty',chErr||(cur?'no messages yet in #'+cur.name+'. say something.':'')));chErr='';return}
  box.replaceChildren(...msgs.map((m,i)=>msgEl(m,msgs[i-1])));
  box.scrollTop=stick?box.scrollHeight:keep;
}
function msgEl(m,prev){
  const p=prof(m.user_id),same=prev&&prev.user_id===m.user_id&&!prev.deleted&&!m.deleted&&new Date(m.created_at)-new Date(prev.created_at)<3e5;
  const row=el('div','cm'+(same?' same':'')+(m.deleted?' gone':''));
  if(!same){const a=avatar(p.avatar,30);a.onclick=()=>profilePopup(m.user_id);row.append(a)}
  const body=el('div','cm-body');
  if(!same){const h=el('div','cm-h'),n=el('b','cm-name',p.display_name);n.style.color=p.color;n.onclick=()=>profilePopup(m.user_id);h.append(n);const rb=roleBadge(p.role);if(rb)h.append(rb);h.append(el('small','',timeOf(m.created_at)));body.append(h)}
  body.append(el('div','cm-t',m.deleted?'message removed':m.content));
  row.append(body);
  if(!m.deleted){const tools=el('div','cm-tools');
    if(m.user_id!==me.id){const r=el('button','','report');r.onclick=async()=>{const why=prompt('Report this message? Say why (optional):');if(why===null)return;try{await ChatAPI.report(m.id,why);toast('reported · thanks')}catch(e){toast(e.message,3000)}};tools.append(r)}
    if(m.user_id===me.id||canMod()){const d=el('button','','delete');d.onclick=async()=>{try{await ChatAPI.remove(m.id);const i=msgs.findIndex(x=>x.id===m.id);if(i>=0)msgs[i]={...msgs[i],deleted:true};renderMsgs()}catch(e){toast(e.message,3000)}};tools.append(d)}
    if(tools.childNodes.length)row.append(tools)}
  return row;
}
async function send(){
  const inp=$('#ch-in'),text=inp.value.trim();if(!text||inp.disabled||!cur)return;inp.disabled=true;
  try{const r=await ChatAPI.send(cur.id,text);inp.value='';inp.style.height='auto';if(r&&!msgs.some(m=>m.id===r.id)){msgs.push(r);renderMsgs(true)}if(typeof badge==='function')badge('hello')}
  catch(e){toast(e.message,3000)}finally{inp.disabled=false;inp.focus()}
}

/* ---------- people ---------- */
function renderMembers(){
  const box=chb.querySelector('.cl-people');if(!box)return;
  const all=[...people.values()].sort((a,b)=>RANK[b.role]-RANK[a.role]||a.display_name.localeCompare(b.display_name));
  const on=all.filter(p=>online.has(p.id)),off=all.filter(p=>!online.has(p.id));
  const sec=(t,list)=>{const s=el('div','cp-sec');s.append(el('h5','',t+' — '+list.length),...list.map(p=>{
    const b=el('button','cp'+(online.has(p.id)?'':' off'));const n=el('b','',p.display_name);n.style.color=p.color;b.append(avatar(p.avatar,24),n);
    const rb=roleBadge(p.role);if(rb)b.append(rb);b.onclick=()=>profilePopup(p.id);return b}));return s};
  box.replaceChildren(sec('online',on),sec('offline',off.slice(0,100)));counts();
}
function profilePopup(id){
  const p=prof(id);const d=el('dialog');d.className='wide';
  const top=el('div','pp-top');const nm=el('b','',p.display_name);nm.style.color=p.color;const who=el('div','pp-who');who.append(nm);const rb=roleBadge(p.role);if(rb)who.append(rb);
  who.append(el('small','','@'+p.username+' · '+p.role),el('small','',online.has(id)?'online now':'offline'));
  top.append(avatar(p.avatar,56),who);
  d.append(Object.assign(el('div','dh'),{innerHTML:'<h3>profile</h3><button class="ib" type="button">×</button>'}),top,el('p','pp-bio',p.bio||'no bio yet'),el('p','hint','joined '+new Date(p.created_at).toLocaleDateString()));
  d.querySelector('button').onclick=()=>d.close();
  const act=el('div','pp-act');
  if(id===me.id){const b=el('button','mg-btn','edit profile');b.onclick=()=>{d.close();editProfile()};act.append(b)}
  else if(canMod()&&RANK[p.role]<RANK[me.role]){
    const run=(fn,msg)=>async()=>{try{await fn();toast(msg);d.close()}catch(e){toast(e.message,3000)}};
    [['timeout 10 min',()=>ChatAPI.ban(id,10),'timed out for 10 minutes'],['timeout 1 hour',()=>ChatAPI.ban(id,60),'timed out for 1 hour'],['ban',()=>ChatAPI.ban(id,null),'banned'],['unban',()=>ChatAPI.unban(id),'unbanned']]
      .forEach(([t,fn,msg])=>{const b=el('button','mg-btn',t);b.onclick=run(fn,msg);act.append(b)});
    if(me.role==='admin'){const sel=el('select');['member','mod','admin'].forEach(r=>{const o=el('option','',r);o.value=r;if(r===p.role)o.selected=true;sel.append(o)});
      const b=el('button','mg-btn','set role');b.onclick=run(async()=>{await ChatAPI.setRole(id,sel.value);await refreshPeople();renderMembers();renderMsgs()},'role changed');act.append(sel,b)}
  }
  d.append(act);d.onclose=()=>d.remove();document.body.append(d);d.showModal();document.activeElement&&document.activeElement.blur();
}
})();
