/* chat data layer: Supabase (anonymous sign-in, realtime). The chat page only talks to window.ChatAPI,
   so tests can swap in a fake one. Setup steps are in supabase/SETUP.md. */
(()=>{
if(window.ChatAPI)return;
const cfg=window.COPPER_SUPABASE||{};
const configured=!!(cfg.url&&cfg.key&&window.supabase);
const sb=configured?window.supabase.createClient(cfg.url,cfg.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
let uid=null;
const fail=e=>{
  const m=String((e&&e.message)||e||'');
  if(/slow down/i.test(m))throw new Error('slow down a little');
  if(e&&e.code==='23505')throw new Error('that username is taken');
  if(e&&e.code==='23514')throw new Error("that isn't allowed (check the length and characters)");
  if(/anonymous sign-ins are disabled/i.test(m))throw new Error('chat is not switched on yet (the owner needs to enable anonymous sign-ins)');
  if((e&&e.code==='42501')||/row-level security/i.test(m))throw new Error("you can't do that right now (read-only channel, muted or banned)");
  if(/failed to fetch|networkerror/i.test(m))throw new Error("couldn't reach the chat server · check your connection");
  throw new Error(m||'something went wrong');
};
const ok=async p=>{const r=await p;if(r.error)fail(r.error);return r.data};
const PUB='id,username,display_name,color,avatar,bio,role,created_at';
window.ChatAPI={
  configured,
  async start(){
    let {data:{session}}=await sb.auth.getSession();
    if(!session){const r=await sb.auth.signInAnonymously();if(r.error)fail(r.error);session=r.data.session}
    uid=session.user.id;
    return ok(sb.from('profiles').select(PUB).eq('id',uid).maybeSingle());
  },
  createProfile:p=>ok(sb.from('profiles').insert({id:uid,username:p.username,display_name:p.display_name,color:p.color,avatar:p.avatar,bio:p.bio||''}).select(PUB).single()),
  updateProfile:p=>ok(sb.from('profiles').update({display_name:p.display_name,color:p.color,avatar:p.avatar,bio:p.bio||''}).eq('id',uid).select(PUB).single()),
  channels:()=>ok(sb.from('channels').select('id,name,topic,write_role').order('position')),
  members:()=>ok(sb.from('profiles').select(PUB).order('created_at').limit(1000)),
  async messages(cid){const d=await ok(sb.from('messages').select('id,channel_id,user_id,content,deleted,created_at').eq('channel_id',cid).order('created_at',{ascending:false}).limit(80));return d.reverse()},
  send:(cid,content)=>ok(sb.from('messages').insert({channel_id:cid,user_id:uid,content}).select('id,channel_id,user_id,content,deleted,created_at').single()),
  async remove(id){await ok(sb.from('messages').update({deleted:true}).eq('id',id))},
  async report(id,reason){await ok(sb.from('reports').insert({message_id:id,reporter_id:uid,reason:(reason||'').slice(0,200)}))},
  onMessage(cid,cb){
    const c=sb.channel('room-'+cid).on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:'channel_id=eq.'+cid},
      p=>{if(p.new&&p.new.id)cb({type:p.eventType==='INSERT'?'insert':'update',row:p.new})}).subscribe();
    return()=>sb.removeChannel(c);
  },
  presence(me,cb){
    const c=sb.channel('copper-online',{config:{presence:{key:me.id}}});
    c.on('presence',{event:'sync'},()=>cb(Object.keys(c.presenceState()))).subscribe(async s=>{if(s==='SUBSCRIBED')await c.track({at:Date.now()})});
    return()=>sb.removeChannel(c);
  },
  async ban(id,minutes){await ok(sb.rpc('ban_user',{target:id,minutes:minutes||null,why:''}))},
  async unban(id){await ok(sb.rpc('unban_user',{target:id}))},
  async setRole(id,role){await ok(sb.rpc('set_role',{target:id,new_role:role}))},
  async deleteMe(){await ok(sb.rpc('delete_me'));await sb.auth.signOut()}
};
})();
