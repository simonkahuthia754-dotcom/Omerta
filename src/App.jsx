import React,{useReducer,useEffect,useRef,useState} from "react";
import {reduce,load,KEY,$,enMax} from "./game.js";
import {Ic,Logo} from "./ui.jsx";
import {Home,Jobs,Empire,Markets,Life} from "./screens.jsx";
import {Social} from "./social.jsx";
import {Economy} from "./econ.jsx";
import {useWorld} from "./world.js";
import {R,watch,put,add,query,orderByChild,limitToLast,onChildAdded,serverNow} from "./live.js";
import * as C from "./clean.js";

const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const ID={id:C.id((store.get("omerta_id")||"").toUpperCase())||"OM-"+Math.random().toString(36).slice(2,6).toUpperCase(),name:C.name(store.get("omerta_name"))||"DON_V"};
store.set("omerta_id",ID.id);store.set("omerta_name",ID.name);

const TABS=[["home","Home","home"],["jobs","Work","case"],["empire","Empire","map"],["office","Office","suit"],["cities","Cities","boat"],["markets","Markets","trend"],["economy","Economy","star"],["social","Social","cell"],["life","Life","glass"]];
const KEYS=["1","2","3","4","5","6","7","8","9","Clear","0","Delete"];

// Keep the layout inside the visible area when the phone keyboard opens, and restore it when it closes.
function useKeyboard(){
  useEffect(()=>{
    const v=window.visualViewport,r=document.documentElement;let foc=false;
    const f=()=>{const h=v?v.height:window.innerHeight,open=window.innerHeight-h>120||foc;
      r.style.setProperty("--vh",Math.round(h)+"px");r.classList.toggle("kb",open)};
    const inn=e=>e.target&&e.target.matches&&e.target.matches(".composer textarea");
    const fi=e=>{if(inn(e)){foc=true;f();setTimeout(()=>{f();e.target.scrollIntoView({block:"end"})},250)}};
    const fo=e=>{if(inn(e)){foc=false;setTimeout(f,60)}};
    f();document.addEventListener("focusin",fi);document.addEventListener("focusout",fo);
    if(v){v.addEventListener("resize",f);v.addEventListener("scroll",f)}window.addEventListener("resize",f);
    return()=>{document.removeEventListener("focusin",fi);document.removeEventListener("focusout",fo);if(v){v.removeEventListener("resize",f);v.removeEventListener("scroll",f)}window.removeEventListener("resize",f)}
  },[]);
}

function Cover({open,unlock}){
  // Each player sets their own PIN the first time. It is stored on this phone only.
  const saved=store.get("omerta_pin");
  const [pin,setPin]=useState(""),[bad,setBad]=useState(false),[first,setFirst]=useState(""),[msg,setMsg]=useState(""),[ask,setAsk]=useState(0);
  const stage=saved?"enter":first?"confirm":"create";
  const label={enter:"Enter your PIN",create:"Create a four-digit PIN",confirm:"Enter it once more"}[stage];
  const shake=m=>{setBad(true);setMsg(m||"");setPin("");setTimeout(()=>setBad(false),500)};
  const key=k=>{
    if(k==="Clear")return setPin("");if(k==="Delete")return setPin(p=>p.slice(0,-1));if(pin.length>=4)return;
    const n=pin+k;setPin(n);setMsg("");
    if(n.length<4)return;
    setTimeout(()=>{
      if(stage==="create"){setFirst(n);setPin("")}
      else if(stage==="confirm"){if(n===first){store.set("omerta_pin",n);setFirst("");setPin("");unlock()}else{setFirst("");shake("Those didn't match. Start again.")}}
      else if(saved===n){setPin("");setAsk(0);unlock()}
      else shake("Wrong PIN.");
    },180);
  };
  const reset=()=>{if(ask<1)return setAsk(1);try{localStorage.removeItem("omerta_pin");localStorage.removeItem("omerta_save_v3")}catch(e){}location.reload()};
  return(<div className={"cover"+(open?" open":"")} aria-hidden={open}><div className="in">
    <div><h1>Omertà</h1><p>{label}</p><p className="pinmsg" role="status">{msg}</p></div>
    <div className="seal"><Logo size={200}/></div>
    <div className={"dots"+(bad?" bad":"")} aria-label="Passcode">{[0,1,2,3].map(i=><i key={i} className={i<pin.length?"f":""}/>)}</div>
    <div className="pad">{KEYS.map(k=><button key={k} className={k.length>1?"sm":""} onClick={()=>key(k)}>{k}</button>)}</div>
    {saved&&<button className="link forgot" onClick={reset}>{ask?"Tap again to erase this game and start over":"Forgot PIN?"}</button>}
  </div></div>);
}

export default function App(){
  useKeyboard();
  const [open,setOpen]=useState(false),[tab,setTab]=useState("home"),[chat,setChat]=useState([]),[toast,setToast]=useState(null),[net,setNet]=useState(false),[inbox,setInbox]=useState({}),[nm,setNm]=useState(ID.name);
  const [s,go]=useReducer(reduce,null,()=>reduce(load(),{t:"tick",now:Date.now()}));
  const sv=useRef(s);sv.current=s;
  useEffect(()=>{const a=setInterval(()=>go({t:"tick",now:Date.now()}),1000),b=setInterval(()=>store.set(KEY,JSON.stringify(sv.current)),4000);
    const save=()=>store.set(KEY,JSON.stringify(sv.current));window.addEventListener("pagehide",save);document.addEventListener("visibilitychange",save);
    return()=>{clearInterval(a);clearInterval(b);window.removeEventListener("pagehide",save)}},[]);
  useEffect(()=>{
    try{const q=query(R("omerta_chat"),orderByChild("timestamp"),limitToLast(60));
      return onChildAdded(q,x=>{const v=C.chatMsg(x.val()),k=C.key(x.key);if(v&&k)setChat(p=>p.some(m=>m.k===k)?p:[...p.slice(-59),{...v,k}])})}catch(e){}
  },[]);
  useEffect(()=>watch(".info/connected",v=>setNet(!!v)),[]);
  useEffect(()=>watch("omerta_inbox/"+ID.id,v=>setInbox(C.inbox(v))),[]);
  useEffect(()=>{const beat=()=>put("omerta_online/"+ID.id,{n:ID.name,t:serverNow()});beat();const h=setInterval(beat,30000);return()=>clearInterval(h)},[]);
  useEffect(()=>{let on=1;const pull=()=>fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd").then(r=>r.json()).then(j=>{const p=j&&j.bitcoin&&j.bitcoin.usd;if(on&&p)go({t:"omcLive",p,now:Date.now()})}).catch(()=>{});
    pull();const t=setInterval(pull,90000);return()=>{on=0;clearInterval(t)}},[]);
  useEffect(()=>{if(!s.toast)return;setToast(s.toast.x);const t=setTimeout(()=>setToast(null),3800);return()=>clearTimeout(t)},[s.toast&&s.toast.k]);
  const send=({text})=>add("omerta_chat",{username:ID.name,uid:ID.id,flag:"🇰🇪",text:C.text(text,300),timestamp:serverNow()});
  const rename=n=>{n=n.replace(/[^\w ]/g,"").trim().slice(0,16).replace(/ /g,"_");if(n.length<3)return;ID.name=n;store.set("omerta_name",n);setNm(n);put("omerta_online/"+ID.id,{n,t:serverNow()})};
  const W=useWorld(ID.id,s,go);
  const swipe=useRef(null),bar=useRef(null);
  useEffect(()=>{const b=bar.current,a=b&&b.querySelector(".on");if(a)b.scrollTo({left:a.offsetLeft-b.clientWidth/2+a.clientWidth/2,behavior:"smooth"})},[tab]);
  const ts=e=>{const x=e.touches[0];swipe.current=e.target.closest&&e.target.closest(".rail,.chart,textarea,input,.msgs,.composer,.pad")?null:[x.clientX,x.clientY]};
  const te=e=>{const a=swipe.current;swipe.current=null;if(!a)return;const x=e.changedTouches[0],dx=x.clientX-a[0],dy=x.clientY-a[1];
    if(Math.abs(dx)>90&&Math.abs(dy)<45){const i=TABS.findIndex(q=>q[0]===tab),n=i+(dx<0?1:-1);if(TABS[n])setTab(TABS[n][0])}};
  const P={W,s,go,chat,send,net,inbox,rename,id:ID.id,name:nm},scr=useRef(null);
  useEffect(()=>{if(scr.current)scr.current.scrollTop=0},[tab]);
  return(
    <div className="stage">
      <div className={"book"+(open?" open":"")}>
        <div className="bar">
          <div className="mark"><Logo size={32}/>Omertà</div>
          <div className="chips"><span className="chip en" title="Energy"><Ic n="bolt"/>{s.en}/{enMax(s)}</span>
            <span className="chip dirty" title="Dirty cash">{$(s.dirty)}</span><span className="purse" title="Clean cash">{$(s.cash)}</span></div>
        </div>
        <div className="scroll" ref={scr} onTouchStart={ts} onTouchEnd={te}>
          {tab==="home"&&<Home {...P}/>}{tab==="jobs"&&<Jobs {...P}/>}{tab==="empire"&&<Empire {...P} page="biz"/>}{tab==="office"&&<Empire {...P} page="office"/>}{tab==="cities"&&<Empire {...P} page="cities"/>}{tab==="markets"&&<Markets {...P}/>}{tab==="economy"&&<Economy {...P}/>}{tab==="social"&&<Social {...P}/>}{tab==="life"&&<Life {...P}/>}
        </div>
        {toast&&<div className="toast" role="status">{toast}</div>}
        <nav className="tabs" ref={bar}>{TABS.map(([id,l,ic])=>
          <button key={id} className={tab===id?"on":""} onClick={()=>setTab(id)} aria-current={tab===id}><Ic n={ic}/>{l}{id==="social"&&Object.values(inbox).some(x=>x.u)&&<i className="tabdot"/>}</button>)}</nav>
      </div>
      <Cover open={open} unlock={()=>setOpen(true)}/>
    </div>
  );
}
