/* chat data layer: Supabase (username + password accounts, realtime). The chat page only talks to window.ChatAPI,
   so tests can swap in a fake one. Setup steps are in supabase/SETUP.md.
   Accounts: Supabase wants an email to log in, so we sign people up with a hidden address <username>@<emailDomain>.
   No mail is ever sent to it. The optional real email is kept separately for password recovery. */
(()=>{
if(window.ChatAPI)return;
const cfg=window.COPPER_SUPABASE||{};
const DOMAIN=(cfg.emailDomain||'members.copper-chat.app').toLowerCase();   // must match 'email_domain' in the bot_config table
const configured=!!(cfg.url&&cfg.key&&window.supabase);
const sb=configured?window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
const synth=u=>String(u||'').trim().toLowerCase()+'@'+DOMAIN;
let uid=null;

const fail=e=>{
  const m=String((e&&e.message)||e||'');
  if(/slow down/i.test(m))throw new Error('slow down a little');
  if(/invalid login credentials/i.test(m))throw new Error('wrong username or password');
  if(/already registered|already been registered|user_already_exists/i.test(m))throw new Error('that username is taken');
  if(/database error saving new user/i.test(m))throw new Error("that username can't be used (3-20 letters, numbers or _, and not a reserved word)");
  if(/password should be at least|weak.?password|password is known/i.test(m))throw new Error('pick a stronger password (8+ characters)');
  if(/rate limit|too many requests|over_request_rate_limit/i.test(m))throw new Error('too many tries right now, wait a minute and try again');
  if(/signups? (are )?(not allowed|disabled)/i.test(m))throw new Error('sign-ups are switched off');
  if(/anonymous sign-ins are disabled/i.test(m))throw new Error('chat is not switched on yet');
  if(e&&e.code==='23505'&&/reports/i.test(m))throw new Error('you already reported that message');
  if(e&&e.code==='23505')throw new Error('that already exists');
  if(e&&e.code==='23514')throw new Error("that isn't allowed (check the length and characters)");
  if((e&&e.code==='42501')||/row-level security|permission denied/i.test(m))throw new Error("you can't do that right now (read-only channel, timed out or banned)");
  if(/failed to fetch|networkerror|load failed/i.test(m))throw new Error("couldn't reach the chat server · check your connection");
  throw new Error(m||'something went wrong');
};
const ok=async p=>{const r=await p;if(r.error)fail(r.error);return r.data};
const PUB='id,username,display_name,color,avatar,avatar_url,banner_url,pronouns,bio,role,created_at';
const MSG='id,channel_id,dm_id,user_id,content,gif_url,reply_to,deleted,edited_at,created_at,reactions(user_id,emoji),reply:messages!reply_to(id,user_id,content,deleted,gif_url)';
const col=s=>s.dm?'dm_id':'channel_id',val=s=>s.dm||s.channel;
const clean=r=>{ // reactions come back as a list of {user_id,emoji} (only the active ones)
  r.reactions=r.reactions||[];return r};

window.ChatAPI={
  configured,
  /* ----- accounts ----- */
  async start(){ // -> profile of the signed-in person, or null (show the sign-in page)
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return null;
    uid=session.user.id;
    const p=await ok(sb.from('profiles').select(PUB).eq('id',uid).maybeSingle());
    if(!p){await sb.auth.signOut();uid=null;return null}   // leftover session from an account that no longer exists
    return p;
  },
  async signUp({username,password,email}){
    const u=String(username||'').trim().toLowerCase();
    const r=await sb.auth.signUp({email:synth(u),password,options:{data:{username:u,recovery_email:(email||'').trim()}}});
    if(r.error)fail(r.error);
    if(!r.data.session)throw new Error('chat sign-ups are not ready yet (the owner must turn off "Confirm email" in Supabase)');
    return this.start();
  },
  async signIn({username,password}){
    const r=await sb.auth.signInWithPassword({email:synth(username),password});
    if(r.error)fail(r.error);
    return this.start();
  },
  async signOut(){await sb.auth.signOut();uid=null},
  async changePassword(oldPw,newPw){
    const me=await ok(sb.from('profiles').select('username').eq('id',uid).single());
    const r=await sb.auth.signInWithPassword({email:synth(me.username),password:oldPw});
    if(r.error)throw new Error('your current password is wrong');
    const u=await sb.auth.updateUser({password:newPw});if(u.error)fail(u.error);
  },
  async myRecoveryEmail(){const d=await ok(sb.from('profiles_private').select('recovery_email').eq('id',uid).maybeSingle());return d&&d.recovery_email||''},
  async setRecoveryEmail(e){await ok(sb.rpc('set_recovery_email',{e:e||''}))},
  async myBan(){const d=await ok(sb.from('bans').select('until,reason').eq('user_id',uid).maybeSingle());
    return d&&(!d.until||new Date(d.until)>new Date())?d:null},
  async deleteMe(){
    for(const b of ['avatars','banners']){ // remove uploaded images first (best effort), then the account
      try{const l=await sb.storage.from(b).list(uid);if(l.data&&l.data.length)await sb.storage.from(b).remove(l.data.map(f=>uid+'/'+f.name))}catch{}}
    await ok(sb.rpc('delete_me'));await sb.auth.signOut();uid=null},
  updateProfile:p=>ok(sb.from('profiles').update({display_name:p.display_name,pronouns:p.pronouns||'',color:p.color,avatar:p.avatar,bio:p.bio||'',avatar_url:p.avatar_url||null,banner_url:p.banner_url||null}).eq('id',uid).select(PUB).single()),
  async uploadImage(bucket,blob){ // bucket: 'avatars' | 'banners'. Files live in a folder named after you.
    const ext=blob.type==='image/webp'?'webp':blob.type==='image/png'?'png':'jpg',path=uid+'/'+Date.now()+'.'+ext;
    const r=await sb.storage.from(bucket).upload(path,blob,{contentType:blob.type,cacheControl:'31536000'});
    if(r.error)fail(r.error);
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },
  async removeImage(url){const m=/\/storage\/v1\/object\/public\/(avatars|banners)\/(.+)$/.exec(url||'');if(m)await sb.storage.from(m[1]).remove([decodeURIComponent(m[2])])},

  /* ----- structure + people ----- */
  categories:()=>ok(sb.from('categories').select('id,name,position').order('position')),
  channels:()=>ok(sb.from('channels').select('id,category_id,name,topic,position,read_rank,write_rank').order('position')),
  members:()=>ok(sb.from('profiles').select(PUB).order('created_at').limit(1000)),

  /* ----- messages (scope is {channel:id} or {dm:id}) ----- */
  async messages(scope,before){
    let q=sb.from('messages').select(MSG).eq(col(scope),val(scope)).eq('reactions.active',true);
    if(before)q=q.lt('created_at',before);
    const d=await ok(q.order('created_at',{ascending:false}).limit(60));
    return d.reverse().map(clean);
  },
  async message(id){const d=await ok(sb.from('messages').select(MSG).eq('id',id).eq('reactions.active',true).maybeSingle());return d&&clean(d)},
  async send(scope,content,replyTo,gifUrl){
    const row={user_id:uid,content,[col(scope)]:val(scope)};if(replyTo)row.reply_to=replyTo;if(gifUrl)row.gif_url=gifUrl;
    const d=await ok(sb.from('messages').insert(row).select('id').single());
    return this.message(d.id);
  },
  async edit(id,content){await ok(sb.from('messages').update({content}).eq('id',id))},
  async remove(id){await ok(sb.from('messages').update({deleted:true}).eq('id',id))},
  async report(id,reason){await ok(sb.from('reports').insert({message_id:id,reporter_id:uid,reason:(reason||'').slice(0,200)}))},
  async react(id,emoji){await ok(sb.rpc('toggle_reaction',{mid:id,emo:emoji}))},
  onScope(scope,cb){ // live messages and reactions of one channel or DM
    const f=col(scope)+'=eq.'+val(scope),key=(scope.dm?'dm-':'room-')+val(scope);
    const c=sb.channel(key)
      .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:f},p=>{if(p.new&&p.new.id)cb({type:'message',row:p.new})})
      .on('postgres_changes',{event:'*',schema:'public',table:'reactions',filter:f},p=>{if(p.new&&p.new.message_id)cb({type:'reaction',row:p.new})})
      .subscribe();
    return()=>sb.removeChannel(c);
  },
  presence(me,cb){
    const c=sb.channel('copper-online',{config:{presence:{key:me.id}}});
    c.on('presence',{event:'sync'},()=>cb(Object.keys(c.presenceState()))).subscribe(async s=>{if(s==='SUBSCRIBED')await c.track({at:Date.now()})});
    return()=>sb.removeChannel(c);
  },

  /* ----- friends + DMs ----- */
  friendships:()=>ok(sb.from('friendships').select('id,requester,addressee,status,created_at').order('created_at',{ascending:false})),
  friendRequest:username=>ok(sb.rpc('friend_request',{uname:username})),
  async friendRespond(id,accept){await ok(sb.rpc('friend_respond',{req:id,accept}))},
  async friendRemove(other){await ok(sb.rpc('friend_remove',{other}))},
  onFriends(cb){const c=sb.channel('my-friends').on('postgres_changes',{event:'*',schema:'public',table:'friendships'},p=>cb(p)).subscribe();return()=>sb.removeChannel(c)},
  dms:()=>ok(sb.from('dms').select('id,user_a,user_b,last_message_at,last_sender,a_read_at,b_read_at')),
  openDm:other=>ok(sb.rpc('open_dm',{other})),
  async markDmRead(id){await ok(sb.rpc('mark_dm_read',{did:id}))},
  onDms(cb){const c=sb.channel('my-dms').on('postgres_changes',{event:'*',schema:'public',table:'dms'},p=>{if(p.new&&p.new.id)cb(p.new)}).subscribe();return()=>sb.removeChannel(c)},

  /* ----- GIFs (Klipy). The key comes from config.local.js as klipyKey ----- */
  gifsOn:!!cfg.klipyKey,
  async gifs(q,page){
    if(!cfg.klipyKey)throw new Error('gifs are not switched on yet (add klipyKey to config.local.js)');
    const qs=new URLSearchParams({page:page||1,per_page:24,rating:cfg.klipyRating||'pg',customer_id:uid||'anon'});if(q)qs.set('q',q);
    let r;try{r=await fetch('https://api.klipy.com/api/v1/'+encodeURIComponent(cfg.klipyKey)+'/gifs/'+(q?'search':'trending')+'?'+qs)}catch{throw new Error("couldn't reach the gif service")}
    if(r.status===401||r.status===403)throw new Error('the gif key was rejected');
    if(r.status===429)throw new Error('too many gif searches, wait a bit');
    if(!r.ok)throw new Error('gif search failed ('+r.status+')');
    const j=await r.json(),page_=j&&j.data;if(!j||!j.result||!page_)throw new Error('gif search failed');
    const pick=(f,order)=>{for(const k of order){const g=f&&f[k]&&f[k].gif;if(g&&/^https:\/\//.test(g.url||''))return g}return null};
    const items=(page_.data||[]).filter(g=>g&&g.type!=='ad'&&g.file).map(g=>{const pv=pick(g.file,['sm','xs','md','hd']),big=pick(g.file,['md','sm','hd','xs']);
      return pv&&big?{slug:g.slug,title:g.title||'gif',preview:pv.url,url:big.url,w:big.width||pv.width||0,h:big.height||pv.height||0}:null}).filter(Boolean);
    return{items,hasNext:!!page_.has_next};
  },

  /* ----- moderation ----- */
  async ban(id,minutes){await ok(sb.rpc('ban_user',{target:id,minutes:minutes||null,why:''}))},
  async unban(id){await ok(sb.rpc('unban_user',{target:id}))},
  async setRole(id,role){await ok(sb.rpc('set_role',{target:id,new_role:role}))}
};
})();
