import React,{useState,useRef} from "react";
import * as G from "./game.js";
import {Ic,Portrait,Meter,IMG} from "./ui.jsx";

const $=G.$;
const Sec=({t,r})=><div className="sec"><h2>{t}</h2>{r&&<span>{r}</span>}</div>;

// One line that opens and closes when tapped.
function Fold({label,children}){
  const [on,setOn]=useState(false);
  return(<div className={"fold"+(on?" on":"")}><button onClick={()=>setOn(!on)} aria-expanded={on}><span>{label}</span><i aria-hidden="true">{on?"–":"+"}</i></button>{on&&<p>{children}</p>}</div>);
}
const Traits=({x})=><div className="traits"><Fold label="Character">{x.ch}</Fold><Fold label="Strength">{x.st}</Fold><Fold label="Weakness">{x.wk}</Fold></div>;

export function Partner({s,go,L}){
  const m=s.mate,M=m&&G.MM[m.id],[tab,setTab]=useState("girlfriend"),[sw,setSw]=useState(false),[tab2,setTab2]=useState(M?M.t:"girlfriend");
  const type=tab,pool=G.MATES.filter(x=>x.t===type);
  return(<>
    <Sec t="Partner" r={m?(m.married?"Married":"Together"):"Single"}/>
    {!m&&<div className="seg sm" role="tablist">{[["girlfriend","Girlfriends"],["boyfriend","Boyfriends"]].map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} className={tab===k?"on":""} onClick={()=>setTab(k)}>{l}</button>)}</div>}
    {!m&&<>
      {L<6&&<p className="empty">Someone will notice you at level 6.</p>}
      
      <div className="people">{pool.map(x=><div className="pcard2" key={x.id}><div className="mrow"><Portrait id={x.id} size={76}/><div className="who"><b className="big">{x.n}</b><small>{x.bio}</small></div></div>
        <Traits x={x}/><div className="btns"><button className="btn" disabled={L<6} onClick={()=>go({t:"pickMate",id:x.id})}>Ask out</button></div></div>)}</div></>}
    {m&&<div className="panel"><div className="mrow"><Portrait id={m.id} size={84}/><div className="who"><b className="big">{M.n}</b><small>{M.t}</small><Meter v={m.aff} c="var(--blood-hi)"/><small className="dim">{G.mateLine(m)}</small></div></div>
      <Traits x={M}/>
      <div className="btns"><button className="btn" onClick={()=>go({t:"date",k:"dinner"})}>Dinner · {$(4000)}</button><button className="btn" onClick={()=>go({t:"date",k:"trip"})}>Weekend away · {$(60000)}</button>
        {!m.married&&<button className="btn ghost" onClick={()=>go({t:"propose"})}>Propose</button>}</div>
      <small className="dim">Gifts from the shelf below show up here once you own them.</small>
      <div className="btns">{G.ITEMS.filter(i=>i.g&&s.inv[i.id]).map(i=><button key={i.id} className="btn ghost" onClick={()=>go({t:"gift",id:i.id})}>Give {i.n.toLowerCase()} ×{s.inv[i.id]}</button>)}</div>
      {!m.married&&<div className="swap"><button className="link" onClick={()=>setSw(!sw)} aria-expanded={sw}>{sw?"Keep ":"Switch "}{sw?M.n:"partner"}</button>
        {sw&&<><div className="seg sm" role="tablist">{[["girlfriend","Girlfriends"],["boyfriend","Boyfriends"]].map(([k,l])=><button key={k} role="tab" aria-selected={tab2===k} className={tab2===k?"on":""} onClick={()=>setTab2(k)}>{l}</button>)}</div><div className="people tight">{G.MATES.filter(x=>x.t===tab2&&x.id!==m.id).map(x=><div className="pcard2" key={x.id}><div className="mrow"><Portrait id={x.id} size={64}/><div className="who"><b>{x.n}</b><small>{x.bio}</small></div></div>
          <Traits x={x}/><div className="btns"><button className="btn ghost" disabled={s.cash<5000} onClick={()=>{go({t:"swapMate",id:x.id});setSw(false)}}>Move on with {x.n} · {$(5000)}</button></div></div>)}</div></>}</div>}
      {m.married&&<small className="dim">Married. There's no switching now.</small>}</div>}
  </>);
}

// Profile picture: stays on this phone. Players can pick one of the supplied images or a photo from their own gallery.
export const AVATARS=[];
const AKEY="omerta_avatar";
const store={get:()=>{try{return localStorage.getItem(AKEY)}catch(e){return null}},set:v=>{try{v?localStorage.setItem(AKEY,v):localStorage.removeItem(AKEY)}catch(e){}}};
export const avatarSrc=v=>typeof v==="string"&&((v.startsWith("data:image/jpeg;base64,")&&v.length<160000)?v:AVATARS.includes(v)?IMG(v):null);
const fromFile=f=>new Promise((res,rej)=>{if(!f||!/^image\//.test(f.type)||f.size>12e6)return rej(new Error("That file isn't a usable picture."));
  const url=URL.createObjectURL(f),im=new Image();im.onload=()=>{const n=256,c=document.createElement("canvas");c.width=c.height=n;const x=c.getContext("2d"),k=Math.min(im.width,im.height);
    x.drawImage(im,(im.width-k)/2,(im.height-k)/2,k,k,0,0,n,n);URL.revokeObjectURL(url);res(c.toDataURL("image/jpeg",.86))};im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error("That file isn't a usable picture."))};im.src=url});

export function Profile({s,go,name,id}){
  const L=G.level(s),P=G.profile(s),C=G.classOf(L),N=G.nextClass(L),w=G.worth(s).total,now=s.t;
  const [av,setAv]=useState(()=>avatarSrc(store.get())),[ed,setEd]=useState(false),[err,setErr]=useState(""),file=useRef(null);
  const pick=async e=>{const f=e.target.files&&e.target.files[0];e.target.value="";setErr("");if(!f)return;try{const d=await fromFile(f);store.set(d);setAv(avatarSrc(d));setEd(false)}catch(x){setErr(x.message)}};
  const choose=n=>{store.set(n);setAv(avatarSrc(n));setEd(false)};
  const heat=s.heat>66?"Wanted":s.heat>33?"Watched":"Quiet";
  return(<>
    <Sec t="Profile" r={C.n}/>
    <div className="profile">
      <div className="ph"><button className="avatar" onClick={()=>setEd(!ed)} aria-label="Change profile picture">{av?<img src={av} alt="" draggable="false"/>:<img src={IMG("logo.png")} alt="" draggable="false"/>}<i><Ic n="user"/></i></button>
        <div className="who"><b className="big">{name}</b><small>{G.rank(L)} · level {L}</small><span className="ctag" style={{"--c":C.c}}>{C.n}</span></div></div>
      {ed&&<div className="pick"><div className="btns"><label className="btn avatar-pick">Choose from gallery<input type="file" accept="image/*" hidden onChange={pick}/></label>{av&&<button className="btn ghost" onClick={()=>{store.set(null);setAv(null);setEd(false)}}>Remove</button>}</div>
        {AVATARS.length>0&&<div className="avgrid">{AVATARS.map(a=><button key={a} onClick={()=>choose(a)} aria-label="Use this picture"><img src={IMG(a)} alt="" loading="lazy"/></button>)}</div>}
        {err&&<small className="err">{err}</small>}</div>}
      <p className="cdesc">{C.d}{N&&<> Next: <b>{N.n}</b> at level {N.min}.</>}</p>
      <dl className="stats"><div><dt>Net worth</dt><dd>{$(w)}</dd></div><div><dt>Kills</dt><dd>{P.kills}</dd></div><div><dt>Status</dt><dd>{heat}</dd></div><div><dt>Potential</dt><dd>{P.potential}</dd></div></dl>
      <div className="bars">{Object.entries(P.stat).map(([k,v])=><div key={k}><span>{k}</span><Meter v={v} c={P.strong.includes(k)?"var(--brass)":P.weak.includes(k)?"var(--blood-hi)":"var(--smoke)"}/></div>)}</div>
      <div className="sw"><div><small>Strengths</small><b>{P.strong.join(", ")}</b></div><div><small>Weaknesses</small><b>{P.weak.join(", ")}</b></div></div>
      <Fold label={`Holdings · ${P.holdings.biz} businesses, ${P.holdings.homes.length} properties, ${P.holdings.rides.length} vehicles`}>
        {[P.holdings.biz?`${P.holdings.biz} business${P.holdings.biz>1?"es":""}`:null,...P.holdings.homes.map(i=>i.n),...P.holdings.rides.map(i=>i.n),P.holdings.omc>0?`${G.omcQty(P.holdings.omc)} Omerta Coin`:null].filter(Boolean).join(" · ")||"Nothing yet."}</Fold>
      <Fold label={`Weapons · ${P.weapons.length}`}>{P.weapons.length?P.weapons.map(i=>`${i.n}${s.inv[i.id]>1?" ×"+s.inv[i.id]:""}`).join(" · "):"Unarmed. Check the Cellar shelf below."}</Fold>
    </div>
  </>);
}
