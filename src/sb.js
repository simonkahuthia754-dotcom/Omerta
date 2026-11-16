// Realtime chat on Supabase. It answers the same path-style calls as live.js (watch / put / add) for the chat paths,
// so the screens do not need to know which backend is behind them.
import {createClient} from "@supabase/supabase-js";
import {key} from "./clean.js";

const URL_=import.meta.env.VITE_SUPABASE_URL||"",KEY_=import.meta.env.VITE_SUPABASE_ANON_KEY||"";
export const sbReady=/^https:\/\/[a-z0-9.-]+\.(supabase\.co|workers\.dev)$/.test(URL_)&&KEY_.length>20;
const db=sbReady?createClient(URL_,KEY_,{auth:{persistSession:true,autoRefreshToken:true},realtime:{params:{eventsPerSecond:10}}}):null;

let lastErr="";const errs=new Set();
export const sbError=()=>lastErr;
export const sbOnError=f=>{errs.add(f);return()=>errs.delete(f)};
const bad=m=>{lastErr=m;errs.forEach(f=>f(m))};

// Sign in once, quietly. Every call below waits for it.
export const sbSession=!sbReady?Promise.resolve(null):(async()=>{
  const cur=await db.auth.getSession();
  if(cur.data.session)return cur.data.session;
  const r=await db.auth.signInAnonymously();
  if(r.error){bad("Could not sign in to chat. Turn on anonymous sign-ins in Supabase.");return null}
  return r.data.session;
})().catch(()=>{bad("Could not reach the chat server.");return null});

const ID=/^OM-[A-Z0-9]{4}$/;
let claimed="";
// A player id belongs to the first sign-in that claims it. Rules on the server stop anyone else reading its direct messages.
export async function claim(id,name){
  if(!sbReady||!ID.test(id))return false;
  if(!await sbSession)return false;
  if(claimed===id)return true;
  const r=await db.from("players").upsert({player_id:id,name},{onConflict:"player_id"});
  if(r.error){bad(r.error.code==="42501"?"This player id belongs to another device.":"Could not register your player id.");return false}
  claimed=id;return true;
}

const ms=v=>{const t=Date.parse(v);return Number.isFinite(t)?t:0};
const asChat=r=>({username:r.username,uid:r.uid,flag:r.flag||"",text:r.text,timestamp:ms(r.created_at)});
const asDm=r=>({from:r.from_id,text:r.text,t:ms(r.created_at)});
const asInbox=r=>({name:r.name||"",text:r.text||"",t:ms(r.t),u:r.unread?1:0});

// Handles the one path pattern each screen asks for.
const route=p=>{const s=String(p).split("/");return{root:s[0],a:s[1],b:s[2]}};
export const handles=p=>sbReady&&/^omerta_(chat|dm|inbox|online|typing)(\/|$)/.test(p);

export function sbWatch(p,f){
  const {root,a}=route(p);let dead=false,chan=null,off=null;
  const open=async()=>{
    if(!await sbSession||dead)return;
    if(root==="omerta_chat"){
      const first=await db.from("chat_messages").select("*").order("created_at",{ascending:false}).limit(60);
      if(first.error)bad("Could not load chat.");
      const rows={};(first.data||[]).forEach(r=>{rows[r.id]=asChat(r)});if(!dead)f(rows);
      chan=db.channel("chat-world").on("postgres_changes",{event:"INSERT",schema:"public",table:"chat_messages"},x=>{rows[x.new.id]=asChat(x.new);if(!dead)f({...rows})}).subscribe();
    }else if(root==="omerta_dm"&&a){
      const load=async()=>{const r=await db.from("dm_messages").select("*").eq("pair",a).order("created_at",{ascending:true}).limit(200);
        const o={};(r.data||[]).forEach(x=>{o[x.id]=asDm(x)});if(!dead)f(o)};
      await load();chan=db.channel("dm-"+a).on("postgres_changes",{event:"INSERT",schema:"public",table:"dm_messages",filter:"pair=eq."+a},load).subscribe();
    }else if(root==="omerta_inbox"&&a){
      const load=async()=>{const r=await db.from("inbox").select("*").eq("owner",a).order("t",{ascending:false}).limit(60);
        const o={};(r.data||[]).forEach(x=>{o[x.peer]=asInbox(x)});if(!dead)f(o)};
      await load();chan=db.channel("inbox-"+a).on("postgres_changes",{event:"*",schema:"public",table:"inbox",filter:"owner=eq."+a},load).subscribe();
    }else if(root==="omerta_online"){
      const fn=()=>{if(!dead)f(online())};watchers.add(fn);room();fn();
      off=()=>watchers.delete(fn);
    }else if(root==="omerta_typing"&&a){
      const seen={};
      chan=db.channel("typing-"+a).on("broadcast",{event:"t"},x=>{const m=x.payload||{};if(m.id){if(m.on)seen[m.id]={n:m.n,t:Date.now()};else delete seen[m.id];if(!dead)f({...seen})}}).subscribe();
    }
  };
  open().catch(()=>bad("Chat connection dropped."));
  return()=>{dead=true;if(chan)db.removeChannel(chan);if(off)off()};
}

// One shared presence room: everyone who is in the app tracks themselves here, and the screens read the count.
const watchers=new Set();let lobby=null,tracked=null;
const online=()=>{const o={};if(lobby)Object.values(lobby.presenceState()).flat().forEach(m=>{if(m&&m.id)o[m.id]={n:m.n,t:Date.now()}});return o};
const room=()=>{if(lobby)return lobby;
  lobby=db.channel("room-online",{config:{presence:{key:"p"+Math.random().toString(36).slice(2,8)}}});
  lobby.on("presence",{event:"sync"},()=>watchers.forEach(w=>w())).subscribe(st=>{if(st==="SUBSCRIBED"&&tracked)lobby.track(tracked)});
  return lobby};

export async function sbPut(p,v){
  const {root,a,b}=route(p);
  if(!await sbSession)return;
  if(root==="omerta_typing"&&a&&b){
    const c=db.channel("typing-"+a);
    c.subscribe(st=>{if(st==="SUBSCRIBED")c.send({type:"broadcast",event:"t",payload:{id:b,n:v&&v.n,on:!!v}}).finally(()=>db.removeChannel(c))});return;
  }
  if(root==="omerta_online"&&a){
    if(!v)return;tracked={id:a,n:v.n};const c=room();if(c.state==="joined")c.track(tracked);return;
  }
  if(root==="omerta_inbox"&&a&&b&&v&&key(a)&&key(b)){
    // a is the owner of the row, b is the other player. Only the sender may write the other side, so the server checks b.
    const r=await db.from("inbox").upsert({owner:a,peer:b,name:v.name||"",text:String(v.text||"").slice(0,120),t:new Date().toISOString(),unread:v.u===1},{onConflict:"owner,peer"});
    if(r.error)bad("A message could not be sent.");
  }
}

export async function sbAdd(p,v){
  const {root,a}=route(p);
  if(!await sbSession)return;
  if(root==="omerta_chat"){
    if(!await claim(v.uid,v.username))return;
    const r=await db.from("chat_messages").insert({uid:v.uid,username:v.username,flag:v.flag||"",text:v.text});
    if(r.error)bad(r.error.code==="P0001"?"Slow down a little.":"A message could not be sent.");
  }else if(root==="omerta_dm"&&a){
    if(!await claim(v.from,""))return;
    const r=await db.from("dm_messages").insert({pair:a,from_id:v.from,text:v.text});
    if(r.error)bad(r.error.code==="P0001"?"Slow down a little.":"A message could not be sent.");
  }
}
