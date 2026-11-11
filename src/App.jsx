import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getDatabase, ref, push, onChildAdded, query, orderByChild, limitToLast } from "firebase/database";

const firebaseConfig = { apiKey:"AIzaSyDUMMY", authDomain:"tycoon-empire-world.firebaseapp.com", databaseURL:"https://tycoon-empire-world-default-rtdb.firebaseio.com", projectId:"tycoon-empire-world", storageBucket:"tycoon-empire-world.appspot.com", messagingSenderId:"123456789", appId:"1:123456789:web:omerta" };
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const rtdb = getDatabase(fbApp);
try{ enableIndexedDbPersistence(db); }catch(e){}
const ID = { id:localStorage.getItem("omerta_id")||"OM-"+Math.random().toString(36).slice(2,6).toUpperCase(), name:localStorage.getItem("omerta_name")||"DON_V" };
localStorage.setItem("omerta_id",ID.id); localStorage.setItem("omerta_name",ID.name);

const D = {
  dagger:"M12 2l2.2 7.2L12 15l-2.2-5.8zM7 15h10M12 15v7M10 22h4",
  vault:"M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM12 5v3M12 16v3",
  items:"M7 4h10a1 1 0 011 1v14a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1zM12 8.5l2 3.5-2 3.5-2-3.5z",
  map:"M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  pass:"M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zM12 8a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8.5 17h7",
  chip:"M12 4a8 8 0 100 16 8 8 0 000-16zM12 9a3 3 0 100 6 3 3 0 000-6zM12 4v2M12 18v2M4 12h2M18 12h2",
  pistol:"M3 8h14l3 3v2h-6l-1 5h-3l.8-5H6l-1 3H3z",
  case:"M4 8h16v11H4zM9 8V6h6v2M4 13h16M11 13v2h2v-2",
  watch:"M9 3h6l1 4H8zM9 21h6l1-4H8zM12 7a5 5 0 100 10 5 5 0 000-10zM12 10v2l1.5 1",
  glass:"M6 4h12l-1.5 15a1 1 0 01-1 1h-7a1 1 0 01-1-1zM6.8 11h10.4",
  car:"M3 15v-3l2-4h14l2 4v3zM3 15h18M7 18.2a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2zM17 18.2a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z",
};
const Ic = ({n,...p}) => <svg className="i" viewBox="0 0 24 24" aria-hidden="true" {...p}><path d={D[n]}/></svg>;
const money = (v,d=2) => "$"+(v/1e6).toFixed(d)+"M";

const BOARD = [
  {r:1,n:ID.name,f:"🇰🇪",c:"Kenya",w:12450000,l:42,me:true},
  {r:2,n:"Vincenzo Romano",f:"🇮🇹",c:"Italy",w:11200000,l:40},
  {r:3,n:"El Chapo Jr",f:"🇲🇽",c:"Mexico",w:9800000,l:38},
  {r:4,n:"Kazimir Volkov",f:"🇷🇺",c:"Russia",w:8700000,l:35},
];
const ITEMS = [
  {n:"Casino chip",i:"chip",p:500,t:"Opens doors on the strip"},
  {n:"Gold pistol",i:"pistol",p:2500,t:"For ceremonial use"},
  {n:"Briefcase",i:"case",p:10000,t:"Nobody asks what's inside"},
  {n:"Gold watch",i:"watch",p:3500,t:"Always five minutes early"},
  {n:"Whiskey",i:"glass",p:800,t:"Aged twenty-one years"},
  {n:"Sports car",i:"car",p:50000,t:"Fast, and easy to spot"},
];
const DIST = [
  {n:"Uptown",s:"Casino",c:45,x:8,y:8,w:92,h:72},
  {n:"Downtown",s:"Nightclub",c:62,x:106,y:8,w:96,h:50},
  {n:"Docks",s:"Warehouse",c:80,x:208,y:8,w:84,h:86},
  {n:"Little Italy",s:"Family home",c:55,x:8,y:86,w:70,h:76},
  {n:"Midtown",s:"Bank",c:20,x:84,y:86,w:118,h:76},
  {n:"Chinatown",s:"Back rooms",c:30,x:208,y:100,w:84,h:62},
];
const TABS = [["vault","Vault","vault"],["items","Items","items"],["map","Map","map"],["profile","Passport","pass"]];
const KEYS = ["1","2","3","4","5","6","7","8","9","Clear","0","Delete"];

export default function App(){
  const [open,setOpen]=useState(false), [pin,setPin]=useState(""), [tab,setTab]=useState("vault");
  const [cash,setCash]=useState(5240000), [own,setOwn]=useState({}), [sel,setSel]=useState("Docks");
  const [chat,setChat]=useState([]), [msg,setMsg]=useState("");
  const end=useRef(null);
  useEffect(()=>{
    try{
      const q=query(ref(rtdb,"omerta_chat"),orderByChild("timestamp"),limitToLast(50));
      return onChildAdded(q,s=>{const v=s.val(); if(v) setChat(p=>[...p.slice(-49),v]);});
    }catch(e){}
  },[]);
  useEffect(()=>{ if(end.current) end.current.scrollTop=end.current.scrollHeight; },[chat,tab]);
  const key=k=>{
    if(k==="Clear") return setPin("");
    if(k==="Delete") return setPin(p=>p.slice(0,-1));
    if(pin.length>=4) return;
    const n=pin+k; setPin(n);
    if(n.length===4) setTimeout(()=>{setOpen(true); setPin("");},220);
  };
  const send=()=>{
    if(!msg.trim()) return;
    push(ref(rtdb,"omerta_chat"),{username:ID.name,flag:"🇰🇪",text:msg.trim(),timestamp:Date.now()});
    setMsg("");
  };
  const buy=it=>{ setCash(c=>c-it.p); setOwn(o=>({...o,[it.n]:(o[it.n]||0)+1})); };
  const me=BOARD[0], d=DIST.find(x=>x.n===sel);
  const held=Math.round(DIST.reduce((a,x)=>a+x.c,0)/DIST.length);

  return (
    <div className="stage">
      <div className={"book"+(open?" open":"")}>
        <div className="bar">
          <div className="mark"><Ic n="dagger"/>Omertà</div>
          <div className="purse" aria-label="Cash on hand">{money(cash)}</div>
        </div>
        <div className="scroll">
          {tab==="vault"&&<>
            <div className="hd"><h1>The vault</h1><p>Everything the family owns, written down where only you can read it.</p></div>
            <div className="worth">
              <div className="n">{money(me.w)}</div><div className="l">Net worth</div>
              <div className="facts"><div><b>{held}%</b><small>of the city held</small></div><div><b>First</b><small>among all dons</small></div></div>
            </div>
            <div className="sec"><h2>Richest dons</h2><span>Worldwide</span></div>
            <div className="ledger">{BOARD.map(e=>
              <div key={e.r} className={"row"+(e.me?" me":"")}>
                <div className="rk">{e.r}</div><div className="fl">{e.f}</div>
                <div className="who"><b>{e.n}</b><small>{e.c}, level {e.l}</small></div>
                <div className="amt">{money(e.w,1)}</div>
              </div>)}
            </div>
            <div className="file">
              <div className="stamp">Wanted</div>
              <h3>FBI file {ID.id}</h3>
              <dl><dt>Name</dt><dd>{ID.name}</dd><dt>Reward</dt><dd>$500,000</dd><dt>Last seen</dt><dd>Docks, pier 14</dd></dl>
            </div>
            <div className="sec"><h2>World wire</h2><span>Live</span></div>
            <div className="wire">
              <div className="msgs" ref={end}>{chat.length===0?<em>Quiet tonight. Say something.</em>:chat.map((c,i)=><div key={i}><b>{c.flag} {c.username}</b> {c.text}</div>)}</div>
              <div className="say"><input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Message the world" aria-label="Message"/><button onClick={send}>Send</button></div>
            </div>
          </>}

          {tab==="items"&&<>
            <div className="band">
              <svg viewBox="0 0 400 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                <defs><pattern id="fan" width="40" height="20" patternUnits="userSpaceOnUse"><path d="M0 20a20 20 0 0140 0M10 20a10 10 0 0120 0" fill="none" stroke="#c9a24d" strokeOpacity=".22"/></pattern>
                <linearGradient id="fd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#06110d" stopOpacity="0"/><stop offset="1" stopColor="#06110d"/></linearGradient></defs>
                <rect width="400" height="130" fill="url(#fan)"/><rect width="400" height="130" fill="url(#fd)"/>
              </svg>
              <div className="hd"><h1>The shelf</h1></div>
            </div>
            <div className="shelf">{ITEMS.map(it=>{const ok=cash>=it.p; return(
              <div className="card" key={it.n}>
                <Ic n={it.i}/><b>{it.n}</b><div className="p">${it.p.toLocaleString()}</div>
                <small>{own[it.n]?`Owned: ${own[it.n]}`:it.t}</small>
                <button className="buy" disabled={!ok} onClick={()=>buy(it)}>{ok?"Buy":"Can't afford"}</button>
              </div>);})}
            </div>
          </>}

          {tab==="map"&&<>
            <div className="hd"><h1>The city</h1><p>Six districts. Tap one to see who runs it.</p></div>
            <div className="city"><svg viewBox="0 0 300 170" role="img" aria-label="District map">
              {DIST.map(x=>
                <g key={x.n} className={"dist"+(x.n===sel?" on":"")} onClick={()=>setSel(x.n)}>
                  <rect x={x.x} y={x.y} width={x.w} height={x.h} rx="3" fill="#c9a24d" fillOpacity={.08+x.c/100*.5}/>
                  <text x={x.x+9} y={x.y+20}>{x.n}</text>
                  <text x={x.x+9} y={x.y+x.h-10} style={{fontSize:16}}>{x.c}%</text>
                </g>)}
            </svg></div>
            <div className="sec"><h2>{d.n}</h2><span>{d.s}</span></div>
            {DIST.map(x=>
              <button key={x.n} className={"turf"+(x.n===sel?" on":"")} onClick={()=>setSel(x.n)}>
                <div className="who"><b>{x.n}</b><small>{x.s}</small><div className="meter"><i style={{width:x.c+"%"}}/></div></div>
                <div className="pct">{x.c}%</div>
              </button>)}
          </>}

          {tab==="profile"&&<div className="pass">
            <header>Omertà passport<span>Dagger edition</span></header>
            <div className="body">
              <div className="photo"><Ic n="dagger"/></div>
              <div><h2>{ID.name}</h2>
                <dl><dt>Rank</dt><dd>Don</dd><dt>Level</dt><dd>{me.l}</dd><dt>Number</dt><dd>{ID.id}</dd><dt>Origin</dt><dd>Kenya</dd></dl>
              </div>
            </div>
            <div className="mrz">P&lt;OMERTA&lt;&lt;{ID.name.replace(/[^A-Z0-9]/gi,"<").toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;<br/>{ID.id.replace("-","")}&lt;&lt;&lt;&lt;KEN&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
          </div>}
        </div>
        <nav className="tabs">{TABS.map(([id,l,ic])=>
          <button key={id} className={tab===id?"on":""} onClick={()=>setTab(id)} aria-current={tab===id}><Ic n={ic}/>{l}</button>)}
        </nav>
      </div>

      <div className={"cover"+(open?" open":"")} aria-hidden={open}>
        <div className="in">
          <div><h1>Omertà</h1><p>Dagger edition</p></div>
          <div className="seal"><Ic n="dagger"/></div>
          <div className="dots" aria-label="Passcode">{[0,1,2,3].map(i=><i key={i} className={i<pin.length?"f":""}/>)}</div>
          <div className="pad">{KEYS.map(k=><button key={k} className={k.length>1?"sm":""} onClick={()=>key(k)}>{k}</button>)}</div>
        </div>
      </div>
    </div>
  );
}
