import React,{useState,useEffect,useRef} from "react";
import * as G from "./game.js";
import {Ic} from "./ui.jsx";
import {watch,put,add,pairKey,clip,ago,staffOf,seats,serverNow,configured,lastError,onError} from "./live.js";
import * as C from "./clean.js";

const PAPERS={
  normal:{key:"normal",name:"The Daily Ledger",tag:"Everything fit to print",min:3,cls:"np"},
  underground:{key:"underground",name:"The Whisper",tag:"What they won't print downtown",min:8,cls:"ug"}};
const Sec=({t,r})=><div className="sec"><h2>{t}</h2>{r&&<span>{r}</span>}</div>;
const sorted=o=>Object.entries(o||{}).map(([k,v])=>({k,...v})).sort((a,b)=>(a.t||0)-(b.t||0));

export function Social(P){
  const [seg,setSeg]=useState("msg");
  const unread=Object.values(P.inbox||{}).filter(x=>x.u).length;
  return(<>
    <div className="seg" role="tablist">{[["msg","Messages"],["normal","Ledger"],["underground","Whisper"]].map(([k,l])=>
      <button key={k} role="tab" aria-selected={seg===k} className={seg===k?"on":""} onClick={()=>setSeg(k)}>{l}{k==="msg"&&unread>0&&<i className="dot">{unread}</i>}</button>)}</div>
    {seg==="msg"?<Messages {...P}/>:<Paper key={seg} p={PAPERS[seg]} {...P}/>}
  </>);
}

function Messages({s,chat,send,id,name,net,inbox,rename}){
  const [err,setErr]=useState(lastError());useEffect(()=>onError(setErr),[]);
  const [ch,setCh]=useState("world"),[peer,setPeer]=useState(null),[on,setOn]=useState(0),[ed,setEd]=useState(null);
  useEffect(()=>watch("omerta_online",v=>setOn(C.online(v).length)),[]);
  return(<>
    <div className="status"><span className={"pulse"+(net&&configured?" up":"")}/>{!configured?"Chat is not set up yet. The game owner needs to connect a database.":net?`Live · ${Math.max(1,on)} online`:"Offline · messages send when you reconnect"}</div>{err&&<div className="status err" role="alert">{err}</div>}
    <div className="whoami">{ed===null?<><span>You appear as <b>{name}</b></span><button onClick={()=>setEd(name)}>Change</button></>:
      <><input value={ed} maxLength={16} autoFocus onChange={e=>setEd(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){rename(ed);setEd(null)}}} aria-label="Display name"/><button onClick={()=>{rename(ed);setEd(null)}}>Save</button></>}</div>
    <div className="chips2">{[["world","World"],["dm","Direct"]].map(([k,l])=><button key={k} className={ch===k?"on":""} onClick={()=>{setCh(k);setPeer(null)}}>{l}</button>)}</div>
    {ch==="world"?<World chat={chat} send={send} id={id} name={name}/>:peer?<Thread peer={peer} back={()=>setPeer(null)} id={id} name={name} inbox={inbox}/>:<Inbox inbox={inbox} id={id} open={setPeer}/>}
  </>);
}

// Plain keyboard input only: emoji and GIFs come from the phone's own keyboard.
function Composer({onSend,ph,scope,id,name}){
  const [v,setV]=useState(""),box=useRef(null),last=useRef(0),told=useRef(0);
  const fit=()=>{const e=box.current;if(e){e.style.height="auto";e.style.height=Math.min(e.scrollHeight,96)+"px"}};
  useEffect(fit,[v]);
  const tell=on=>{if(!scope)return;const n=serverNow();if(on&&n-told.current<2000)return;told.current=on?n:0;put(`omerta_typing/${scope}/${id}`,on?{n:name,t:n}:null)};
  useEffect(()=>()=>tell(false),[]);
  const send=()=>{const text=clip(v,300);if(!text||serverNow()-last.current<900)return;last.current=serverNow();tell(false);onSend({text});setV("")};
  return(<div className="composer"><div className="pill">
    <textarea ref={box} rows={1} value={v} maxLength={300} placeholder={ph} enterKeyHint="send" aria-label="Message" autoComplete="off" autoCorrect="on"
      onChange={e=>{const x=e.target.value.replace(/\n/g," ");setV(x);tell(!!x.trim())}} onBlur={()=>tell(false)}
      onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}}}/>
    <button className="sendb" onClick={send} disabled={!v.trim()} aria-label="Send"><Ic n="send"/></button>
  </div></div>);
}

// Shows who else is typing right now.
function Typing({scope,id}){
  const [who,setWho]=useState([]),[,tick]=useState(0);
  useEffect(()=>watch("omerta_typing/"+scope,v=>setWho(C.typing(v,id))),[scope,id]);
  useEffect(()=>{const h=setInterval(()=>tick(x=>x+1),1500);return()=>clearInterval(h)},[]);
  const w=who.slice(0,3);
  return(<div className="typing" aria-live="polite">{w.length>0&&<><span className="tdots"><i/><i/><i/></span>{w.join(", ")}{who.length>3?` and ${who.length-3} more`:""} {w.length+(who.length>3?1:0)>1?"are":"is"} typing</>}</div>);
}

function Bubble({m,me,showName}){
  return(<div className={"bub"+(me?" me":"")}>{showName&&!me&&<b className="nm">{m.flag} {m.username}</b>}<span>{m.text}</span><small>{ago(m.timestamp||m.t)}</small></div>);
}

function World({chat,send,id,name}){
  const end=useRef(null);
  useEffect(()=>{if(end.current)end.current.scrollTop=end.current.scrollHeight},[chat.length]);
  return(<div className="wire big"><div className="msgs" ref={end}>{chat.length===0?<em>Quiet tonight. Say something.</em>:chat.map((c,i)=><Bubble key={c.k||i} m={c} me={c.uid===id} showName/>)}</div>
    <Typing scope="world" id={id}/><Composer onSend={send} ph="Message the world" scope="world" id={id} name={name}/></div>);
}

function Inbox({inbox,id,open}){
  const [to,setTo]=useState(""),list=sorted(inbox).reverse();
  const start=()=>{const t=to.trim().toUpperCase();if(/^OM-[A-Z0-9]{4}$/.test(t)&&t!==id){open({id:t,name:t});setTo("")}};
  return(<>
    <div className="panel"><p className="dim" style={{fontSize:13,lineHeight:1.5,margin:"0 0 10px"}}>Your ID is <b className="idtag">{id}</b>. Give it to someone and they can message you. Their ID is on their passport.</p>
      <div className="say bare"><input value={to} onChange={e=>setTo(e.target.value)} onKeyDown={e=>e.key==="Enter"&&start()} placeholder="Their ID, like OM-4F2K" aria-label="Player ID" maxLength={7}/><button onClick={start}>Open</button></div></div>
    <div className="list">{list.length===0?<p className="empty">No conversations yet. Messages you send and receive show up here.</p>:list.map(c=>
      <button key={c.k} className="job dmrow" onClick={()=>open({id:c.k,name:c.name||c.k})}><div className="who"><b>{c.name||c.k}{c.u?<i className="dot">new</i>:null}</b><small>{c.text}</small></div><small className="dim">{ago(c.t)}</small></button>)}</div></>);
}

function Thread({peer,back,id,name,inbox}){
  const [msgs,setMsgs]=useState([]),end=useRef(null),pk=pairKey(id,peer.id);
  useEffect(()=>watch("omerta_dm/"+pk,v=>setMsgs(C.dmList(v).sort((a,b)=>a.t-b.t))),[pk]);
  useEffect(()=>{const e=inbox&&inbox[peer.id];if(e&&e.u)put(`omerta_inbox/${id}/${peer.id}`,{...e,u:0})},[inbox,peer.id,id]);
  useEffect(()=>{if(end.current)end.current.scrollTop=end.current.scrollHeight},[msgs.length]);
  const nm=(inbox&&inbox[peer.id]&&inbox[peer.id].name)||peer.name;
  const go=({text})=>{const t=serverNow();add("omerta_dm/"+pk,{from:id,text,t});put(`omerta_inbox/${peer.id}/${id}`,{name,text:text.slice(0,120),t,u:1});put(`omerta_inbox/${id}/${peer.id}`,{name:nm,text:text.slice(0,120),t,u:0})};
  return(<div className="wire big"><div className="thead"><button onClick={back} aria-label="Back to conversations">‹ Back</button><b>{nm}</b><small>{peer.id}</small></div>
    <div className="msgs" ref={end}>{msgs.length===0?<em>Nothing here yet. Say hello.</em>:msgs.map(c=><Bubble key={c.k} m={c} me={c.from===id}/>)}</div>
    <Typing scope={pk} id={id}/><Composer onSend={go} ph="Write a message" scope={pk} id={id} name={name}/></div>);
}

// Filler so a paper is never blank: stories drawn from the player's own game, clearly marked as wire copy.
const wire=(s,k)=>{const o=[];
  if(k==="normal"){(s.log||[]).slice(0,3).forEach(l=>o.push({h:"City desk",b:l.x}));o.push({h:"Markets",b:`Omerta Coin changed hands near ${G.$(s.omc.p)} today.`})}
  else{o.push({h:"Overheard",b:s.heat>66?"Unmarked cars outside the docks again. Somebody's name is on a list.":s.heat>33?"Fewer lights on at the pier than usual.":"Quiet week. Which is its own kind of news."});o.push({h:"Overheard",b:"A stranger at the Velvet Room asked for nobody by name."})}
  return o};

function Paper({p,s,id,name}){
  const [d,setD]=useState(null),[tab,setTab]=useState("latest"),[t,setT]=useState(""),[b,setB]=useState(""),[pitch,setPitch]=useState(""),last=useRef(0),[err,setErr]=useState("");
  useEffect(()=>watch("omerta_news/"+p.key,v=>setD(C.paper(v))),[p.key]);
  const L=G.level(s),apps=(d&&d.apps)||{},votes=(d&&d.votes)||{},posts=(d&&d.posts)||{},likes=(d&&d.likes)||{};
  const all=staffOf(apps,votes),crew=seats(all),staff=crew.some(c=>c.id===id),chief=crew[0]&&crew[0].id,mine=apps[id],ok=L>=p.min;
  const arts=sorted(posts).reverse().slice(0,30),base="omerta_news/"+p.key+"/";
  const myVote=Object.keys(votes).find(c=>votes[c]&&votes[c][id]);
  const publish=()=>{const h=clip(t,80),x=clip(b,700);setErr("");if(h.length<4||x.length<20)return setErr("Give it a headline and at least a couple of sentences.");
    if(serverNow()-last.current<12e4)return setErr("One story every two minutes. Make this one count.");last.current=serverNow();
    add(base+"posts",{uid:id,name,title:h,body:x,t:serverNow()});setT("");setB("")};
  const vote=c=>{Object.keys(votes).forEach(o=>{if(votes[o]&&votes[o][id]&&o!==c)put(`${base}votes/${o}/${id}`,null)});put(`${base}votes/${c}/${id}`,myVote===c?null:1)};
  const apply=()=>{const x=clip(pitch,140);if(x.length<8)return setErr("Tell people why they should vote for you.");setErr("");put(`${base}apps/${id}`,{name,pitch:x,t:serverNow()});setPitch("")};
  const like=k=>put(`${base}likes/${k}/${id}`,likes[k]&&likes[k][id]?null:1);
  const filler=arts.length<3?wire(s,p.key):[];
  return(<div className={"paper "+p.cls}>
    <header className="mast"><h2>{p.name}</h2><p>{p.tag}</p><div className="rule"><span>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</span><span>{crew.length?`${crew.length} on staff`:"Hiring"}</span></div></header>
    <div className="seg sm">{[["latest","Latest"],["staff","Newsroom"]].map(([k,l])=><button key={k} className={tab===k?"on":""} onClick={()=>setTab(k)}>{l}</button>)}</div>
    {tab==="latest"?<>
      {staff&&<div className="panel compose"><b>Write for {p.name}</b><input value={t} maxLength={80} onChange={e=>setT(e.target.value)} placeholder="Headline" aria-label="Headline"/>
        <textarea value={b} maxLength={700} rows={4} onChange={e=>setB(e.target.value)} placeholder="The story" aria-label="Story"/>{err&&<small className="err">{err}</small>}
        <div className="btns"><button className="btn" onClick={publish}>Publish</button></div></div>}
      {arts.map(a=><article className="art" key={a.k}><h3>{a.title}</h3><p>{a.body}</p>
        <footer><span>By {a.name}{a.uid===chief?", editor":""} · {ago(a.t)}</span><button className={"lk"+(likes[a.k]&&likes[a.k][id]?" on":"")} onClick={()=>like(a.k)} aria-label="Like this story"><Ic n="star"/>{Object.keys(likes[a.k]||{}).length||""}</button></footer></article>)}
      {filler.map((w,i)=><article className="art wirec" key={i}><small>{w.h} · wire copy</small><p>{w.b}</p></article>)}
      {arts.length===0&&<p className="empty">No reporters have filed yet. Apply in the Newsroom tab and get voted onto the staff.</p>}
    </>:<>
      <Sec t="Staff" r="Top 5 by votes"/>
      <div className="list">{crew.length===0?<p className="empty">No staff yet. Applicants need at least one vote.</p>:crew.map((c,i)=>
        <div className="job" key={c.id}><div className="who"><b>{c.name}{i===0&&<i className="dot gold">Editor</i>}{c.id===id&&<i className="dot">You</i>}</b><small>{c.pitch}</small></div><b className="vc">{c.v}</b>{c.id!==id&&<button className={"vote"+(myVote===c.id?" on":"")} onClick={()=>vote(c.id)}>{myVote===c.id?"Voted":"Vote"}</button>}</div>)}</div>
      <Sec t="Applicants" r="One vote each"/>
      <div className="list">{all.filter(c=>!crew.includes(c)).map(c=>
        <div className="job" key={c.id}><div className="who"><b>{c.name}{c.id===id&&<i className="dot">You</i>}</b><small>{c.pitch}</small></div><b className="vc">{c.v}</b>
          {c.id!==id&&<button className={"vote"+(myVote===c.id?" on":"")} onClick={()=>vote(c.id)}>{myVote===c.id?"Voted":"Vote"}</button>}</div>)}
        {all.length===0&&<p className="empty">Nobody has applied yet.</p>}</div>
      <div className="panel">{mine?<><b>Your application</b><p className="dim" style={{margin:"6px 0 10px",fontSize:14}}>{mine.pitch}</p><div className="btns"><button className="btn ghost" onClick={()=>put(`${base}apps/${id}`,null)}>Withdraw</button></div></>
        :ok?<><b>Want to write here?</b><p className="dim" style={{margin:"6px 0 10px",fontSize:13}}>Pitch yourself in a line. Other players vote, and the five most-backed become staff.</p>
          <div className="say bare"><input value={pitch} maxLength={140} onChange={e=>setPitch(e.target.value)} placeholder="Why should they pick you?" aria-label="Pitch"/><button onClick={apply}>Apply</button></div>{err&&<small className="err">{err}</small>}</>
        :<p className="dim" style={{margin:0,fontSize:14}}>Reach level {p.min} to apply as a writer.</p>}</div>
    </>}
  </div>);
}
