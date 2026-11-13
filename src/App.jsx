import React,{useReducer,useEffect,useRef,useState} from "react";
import {reduce,load,KEY,$,enMax} from "./game.js";
import {Ic,Logo} from "./ui.jsx";
import {Home,Jobs,Empire,Markets,Life} from "./screens.jsx";
import {Social} from "./social.jsx";
import {R,watch,put,add,query,orderByChild,limitToLast,onChildAdded} from "./live.js";

const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const ID={id:(store.get("omerta_id")||"OM-"+Math.random().toString(36).slice(2,6)).toUpperCase(),name:store.get("omerta_name")||"DON_V"};
store.set("omerta_id",ID.id);store.set("omerta_name",ID.name);

const TABS=[["home","Home","home"],["jobs","Work","case"],["empire","Empire","map"],["markets","Markets","trend"],["social","Social","cell"],["life","Life","glass"]];
const KEYS=["1","2","3","4","5","6","7","8","9","Clear","0","Delete"];

function Cover({open,unlock}){
  const [pin,setPin]=useState(""),[bad,setBad]=useState(false),saved=store.get("omerta_pin");
  const key=k=>{
    if(k==="Clear")return setPin("");if(k==="Delete")return setPin(p=>p.slice(0,-1));if(pin.length>=4)return;
    const n=pin+k;setPin(n);
    if(n.length<4)return;
    setTimeout(()=>{
      if(!saved){store.set("omerta_pin",n);setPin("");unlock()}
      else if(saved===n){setPin("");unlock()}
      else{setBad(true);setPin("");setTimeout(()=>setBad(false),500)}
    },180);
  };
  return(<div className={"cover"+(open?" open":"")} aria-hidden={open}><div className="in">
    <div><h1>Omertà</h1><p>{saved?"Enter your PIN":"Choose a four-digit PIN"}</p></div>
    <div className="seal"><Logo size={200}/></div>
    <div className={"dots"+(bad?" bad":"")} aria-label="Passcode">{[0,1,2,3].map(i=><i key={i} className={i<pin.length?"f":""}/>)}</div>
    <div className="pad">{KEYS.map(k=><button key={k} className={k.length>1?"sm":""} onClick={()=>key(k)}>{k}</button>)}</div>
  </div></div>);
}

export default function App(){
  const [open,setOpen]=useState(false),[tab,setTab]=useState("home"),[chat,setChat]=useState([]),[toast,setToast]=useState(null),[net,setNet]=useState(false),[inbox,setInbox]=useState({}),[nm,setNm]=useState(ID.name);
  const [s,go]=useReducer(reduce,null,()=>reduce(load(),{t:"tick",now:Date.now()}));
  const sv=useRef(s);sv.current=s;
  useEffect(()=>{const a=setInterval(()=>go({t:"tick",now:Date.now()}),1000),b=setInterval(()=>store.set(KEY,JSON.stringify(sv.current)),4000);
    const save=()=>store.set(KEY,JSON.stringify(sv.current));window.addEventListener("pagehide",save);document.addEventListener("visibilitychange",save);
    return()=>{clearInterval(a);clearInterval(b);window.removeEventListener("pagehide",save)}},[]);
  useEffect(()=>{
    try{const q=query(R("omerta_chat"),orderByChild("timestamp"),limitToLast(60));
      return onChildAdded(q,x=>{const v=x.val();if(v)setChat(p=>p.some(m=>m.k===x.key)?p:[...p.slice(-59),{...v,k:x.key}])})}catch(e){}
  },[]);
  useEffect(()=>watch(".info/connected",v=>setNet(!!v)),[]);
  useEffect(()=>watch("omerta_inbox/"+ID.id,v=>setInbox(v||{})),[]);
  useEffect(()=>{const beat=()=>put("omerta_online/"+ID.id,{n:ID.name,t:Date.now()});beat();const h=setInterval(beat,30000);return()=>clearInterval(h)},[]);
  useEffect(()=>{let on=1;const pull=()=>fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd").then(r=>r.json()).then(j=>{const p=j&&j.bitcoin&&j.bitcoin.usd;if(on&&p)go({t:"omcLive",p,now:Date.now()})}).catch(()=>{});
    pull();const t=setInterval(pull,90000);return()=>{on=0;clearInterval(t)}},[]);
  useEffect(()=>{if(!s.toast)return;setToast(s.toast.x);const t=setTimeout(()=>setToast(null),3800);return()=>clearTimeout(t)},[s.toast&&s.toast.k]);
  const send=text=>add("omerta_chat",{username:ID.name,uid:ID.id,flag:"🇰🇪",text,timestamp:Date.now()});
  const rename=n=>{n=n.replace(/[^\w ]/g,"").trim().slice(0,16).replace(/ /g,"_");if(n.length<3)return;ID.name=n;store.set("omerta_name",n);setNm(n);put("omerta_online/"+ID.id,{n,t:Date.now()})};
  const P={s,go,chat,send,net,inbox,rename,id:ID.id,name:nm},scr=useRef(null);
  useEffect(()=>{if(scr.current)scr.current.scrollTop=0},[tab]);
  return(
    <div className="stage">
      <div className={"book"+(open?" open":"")}>
        <div className="bar">
          <div className="mark"><Logo size={32}/>Omertà</div>
          <div className="chips"><span className="chip en" title="Energy"><Ic n="bolt"/>{s.en}/{enMax(s)}</span>
            <span className="chip dirty" title="Dirty cash">{$(s.dirty)}</span><span className="purse" title="Clean cash">{$(s.cash)}</span></div>
        </div>
        <div className="scroll" ref={scr}>
          {tab==="home"&&<Home {...P}/>}{tab==="jobs"&&<Jobs {...P}/>}{tab==="empire"&&<Empire {...P}/>}{tab==="markets"&&<Markets {...P}/>}{tab==="social"&&<Social {...P}/>}{tab==="life"&&<Life {...P}/>}
        </div>
        {toast&&<div className="toast" role="status">{toast}</div>}
        <nav className="tabs">{TABS.map(([id,l,ic])=>
          <button key={id} className={tab===id?"on":""} onClick={()=>setTab(id)} aria-current={tab===id}><Ic n={ic}/>{l}{id==="social"&&Object.values(inbox).some(x=>x.u)&&<i className="tabdot"/>}</button>)}</nav>
      </div>
      <Cover open={open} unlock={()=>setOpen(true)}/>
    </div>
  );
}
