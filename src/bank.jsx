import React,{useState,useEffect} from "react";
import * as G from "./game.js";
import {IMG} from "./ui.jsx";
import {serverNow} from "./live.js";
const $=G.$;
const Sec=({t,r})=><div className="sec"><h2>{t}</h2>{r&&<span>{r}</span>}</div>;
const num=v=>{const n=Math.floor(Number(String(v).replace(/[^0-9]/g,"")));return Number.isFinite(n)?n:0};
const pct=r=>Math.round(r*100)+"%";

// The bank: clean cash goes in, stays safe from raids, earns slow interest, and can be invested for a fixed term.
export function Bank({s,go,name}){
  const [v,setV]=useState(""),[,tk]=useState(0);
  useEffect(()=>{const h=setInterval(()=>tk(x=>x+1),1000);return()=>clearInterval(h)},[]);
  const now=serverNow(),vault=Math.floor(s.bk||0),inv=s.bi||[],invested=inv.reduce((a,x)=>a+x.a,0),amt=num(v);
  const quick=(from,f)=>setV(String(Math.floor(from*f)));
  const Tile=({k,v,sub})=><div className="otile"><small>{k}</small><b>{v}</b>{sub&&<em>{sub}</em>}</div>;
  return(<div className="ofc">
    <div className="ofhero bankhero">
      <img src={IMG(G.BANK_IMG)} alt="" draggable="false"/><div className="ofshade"/>
      <div className="oftitle"><small>Ferrante Savings</small><h1>The vault</h1><span>{name}'s account · safe from raids</span></div>
    </div>
    <div className="ofgrid">
      <Tile k="Cash on hand" v={$(s.cash)} sub="Raids can take this"/>
      <Tile k="In the vault" v={$(vault)} sub={`Earns ${(G.BANK_RATE*100).toFixed(1)}% an hour`}/>
      <Tile k="Invested" v={$(invested)} sub={`${inv.length} running`}/>
      <Tile k="Dirty cash" v={$(s.dirty)} sub="Wash it first"/>
    </div>
    <div className="panel">
      <label className="amtl" htmlFor="bkamt">Amount</label>
      <input id="bkamt" className="amt" inputMode="numeric" autoComplete="off" placeholder="0" value={v?amt.toLocaleString("en-US"):""} onChange={e=>setV(e.target.value)}/>
      <div className="qk">{[.25,.5,.75,1].map(f=><button key={f} className="rchip" onClick={()=>quick(Math.max(s.cash,vault),f)} aria-label={`${f*100} percent`}>{f===1?"All":f*100+"%"}</button>)}</div>
      <small className="dim">Quick buttons use whichever is bigger, cash or vault.</small>
      <div className="btns"><button className="btn" disabled={s.cash<1||amt<1} onClick={()=>{go({t:"deposit",amt});setV("")}}>Deposit {amt>0?$(Math.min(amt,Math.floor(s.cash))):""}</button>
        <button className="btn ghost" disabled={vault<1||amt<1} onClick={()=>{go({t:"withdraw",amt});setV("")}}>Withdraw {amt>0?$(Math.min(amt,vault)):""}</button></div>
      <small className="dim">Only clean cash goes in. Wash dirty money on the Empire tab first.</small>
    </div>
    <Sec t="Invest" r={`${$(vault)} available`}/>
    <div className="klist">{G.PLANS.map(P=>{const ok=amt>=P.min&&amt<=vault;return(
      <div className="kitem plan" key={P.id}>
        <div className="prow"><div><b>{P.n}</b><small>{P.d}</small></div><div className="pret"><b>+{pct(P.r)}</b><small>{P.h>=24?P.h/24+" day"+(P.h>=48?"s":""):P.h+" hour"+(P.h>1?"s":"")}</small></div></div>
        <div className="pmeta"><small>From {$(P.min)}</small><small>{P.risk?`${pct(P.risk)} chance of losing ${pct(P.loss)}`:"No risk"}</small></div>
        <button className="btn" disabled={!ok} onClick={()=>{go({t:"invest",id:P.id,amt});setV("")}}>{amt<P.min?`Enter at least ${$(P.min)}`:amt>vault?"More than the vault holds":"Invest "+$(amt)}</button>
      </div>)})}</div>
    <Sec t="Running" r={inv.length?`${inv.length} of 8`:""}/>
    {inv.length?<div className="klist">{[...inv].sort((a,b)=>a.e-b.e).map(x=>{const P=G.PM[x.id],done=now>=x.e;return(
      <div className="kitem plan" key={x.id+x.t}>
        <div className="prow"><div><b>{P.n}</b><small>{$(x.a)} in</small></div><div className="pret"><b>{done?"Ready":G.hm(x.e-now)}</b><small>{done?"Collect it":"to go"}</small></div></div>
        <button className="btn" disabled={!done} onClick={()=>go({t:"investCollect",id:x.id,t0:x.t})}>{done?"Collect":"Not ready"}</button></div>)})}</div>
      :<p className="empty">Nothing invested. Put money in the vault, then pick a plan above.</p>}
  </div>);
}
