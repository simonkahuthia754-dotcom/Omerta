import React,{useReducer,useEffect,useRef,useState} from "react";
import {initializeApp} from "firebase/app";
import {getFirestore,enableIndexedDbPersistence} from "firebase/firestore";
import {getDatabase,ref,push,onChildAdded,query,orderByChild,limitToLast} from "firebase/database";
import {reduce,load,KEY,$,enMax} from "./game.js";
import {Ic,Logo} from "./ui.jsx";
import {Home,Jobs,Empire,Markets,Life} from "./screens.jsx";

const firebaseConfig={apiKey:"AIzaSyDUMMY",authDomain:"tycoon-empire-world.firebaseapp.com",databaseURL:"https://tycoon-empire-world-default-rtdb.firebaseio.com",projectId:"tycoon-empire-world",storageBucket:"tycoon-empire-world.appspot.com",messagingSenderId:"123456789",appId:"1:123456789:web:omerta"};
const fbApp=initializeApp(firebaseConfig);
const db=getFirestore(fbApp);
const rtdb=getDatabase(fbApp);
try{enableIndexedDbPersistence(db)}catch(e){}

const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const ID={id:store.get("omerta_id")||"OM-"+Math.random().toString(36).slice(2,6).toUpperCase(),name:store.get("omerta_name")||"DON_V"};
store.set("omerta_id",ID.id);store.set("omerta_name",ID.name);

const TABS=[["home","Home","home"],["jobs","Work","case"],["empire","Empire","map"],["markets","Markets","trend"],["life","Life","glass"]];
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
  const [open,setOpen]=useState(false),[tab,setTab]=useState("home"),[chat,setChat]=useState([]),[toast,setToast]=useState(null);
  const [s,go]=useReducer(reduce,null,()=>reduce(load(),{t:"tick",now:Date.now()}));
  const sv=useRef(s);sv.current=s;
  useEffect(()=>{const a=setInterval(()=>go({t:"tick",now:Date.now()}),1000),b=setInterval(()=>store.set(KEY,JSON.stringify(sv.current)),4000);
    const save=()=>store.set(KEY,JSON.stringify(sv.current));window.addEventListener("pagehide",save);document.addEventListener("visibilitychange",save);
    return()=>{clearInterval(a);clearInterval(b);window.removeEventListener("pagehide",save)}},[]);
  useEffect(()=>{
    try{const q=query(ref(rtdb,"omerta_chat"),orderByChild("timestamp"),limitToLast(50));
      return onChildAdded(q,x=>{const v=x.val();if(v)setChat(p=>[...p.slice(-49),v])})}catch(e){}
  },[]);
  useEffect(()=>{let on=1;const pull=()=>fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd").then(r=>r.json()).then(j=>{const p=j&&j.bitcoin&&j.bitcoin.usd;if(on&&p)go({t:"omcLive",p,now:Date.now()})}).catch(()=>{});
    pull();const t=setInterval(pull,90000);return()=>{on=0;clearInterval(t)}},[]);
  useEffect(()=>{if(!s.toast)return;setToast(s.toast.x);const t=setTimeout(()=>setToast(null),3800);return()=>clearTimeout(t)},[s.toast&&s.toast.k]);
  const send=text=>{try{push(ref(rtdb,"omerta_chat"),{username:ID.name,flag:"🇰🇪",text,timestamp:Date.now()})}catch(e){setChat(p=>[...p,{username:ID.name,flag:"🇰🇪",text}])}};
  const P={s,go,chat,send,id:ID.id,name:ID.name},scr=useRef(null);
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
          {tab==="home"&&<Home {...P}/>}{tab==="jobs"&&<Jobs {...P}/>}{tab==="empire"&&<Empire {...P}/>}{tab==="markets"&&<Markets {...P}/>}{tab==="life"&&<Life {...P}/>}
        </div>
        {toast&&<div className="toast" role="status">{toast}</div>}
        <nav className="tabs">{TABS.map(([id,l,ic])=>
          <button key={id} className={tab===id?"on":""} onClick={()=>setTab(id)} aria-current={tab===id}><Ic n={ic}/>{l}</button>)}</nav>
      </div>
      <Cover open={open} unlock={()=>setOpen(true)}/>
    </div>
  );
}
