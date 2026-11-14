import React,{useState,useRef,useEffect} from "react";
import * as G from "./game.js";
import {IMG} from "./ui.jsx";
const Sec=({t,r})=><div className="sec"><h2>{t}</h2>{r&&<span>{r}</span>}</div>;
import {SECTORS,KINDS,ITEMS_E,EM,SM,LAND,LTIERS,TIERS,shelf,landRate,takeoverPrice,ART,OFFICE_ART,ecoIncome,landIncome} from "./economy.js";
import {claimStock,claimLand} from "./world.js";
import {serverNow} from "./live.js";
const $=G.$;

// A row that scrolls sideways with a finger, or with the arrows.
function Rail({children,cls=""}){
  const r=useRef(null),by=d=>r.current&&r.current.scrollBy({left:d*r.current.clientWidth*.8,behavior:"smooth"});
  return(<div className="railwrap"><button className="rarrow l" onClick={()=>by(-1)} aria-label="Scroll left">‹</button>
    <div className={"rail "+cls} ref={r}>{children}</div><button className="rarrow r" onClick={()=>by(1)} aria-label="Scroll right">›</button></div>);
}
const Art=({id,label})=>ART.has(id)?<img className="eart" src={IMG("eco-"+id+".jpg")} alt="" loading="lazy" draggable="false"/>:<div className="eart ph" aria-hidden="true"><span>{(label||"?").slice(0,2)}</span></div>;
const left=ms=>G.hm(ms);

function Goods({s,go,W}){
  const L=G.level(s),[sec,setSec]=useState("tr"),[kind,setKind]=useState(""),[busy,setBusy]=useState(""),[,tk]=useState(0);
  useEffect(()=>{const h=setInterval(()=>tk(x=>x+1),1000);return()=>clearInterval(h)},[]);
  const S=SM[sec],kinds=KINDS.filter(k=>k.sec===sec),now=serverNow();
  const pick=id=>{setSec(id);setKind("")};
  const buy=async it=>{if(busy)return;if(s.cash<it.p)return go({t:"ecoBuy",id:it.id});setBusy(it.id);
    const r=await claimStock(it);setBusy("");if(r.ok)go({t:"ecoBuy",id:it.id});else go({t:"note",x:r.err?"Couldn't reach the supplier. Try again.":"Someone else just took the last one."})};
  const own=Object.entries(s.eco||{}).reduce((a,[k,q])=>a+q,0);
  return(<>
    <div className="panel"><div className="kv"><span>Goods and holdings</span><b>{own}</b></div><div className="kv"><span>Pays you</span><b>{$(Math.round((ecoIncome(s)+landIncome(s))*G.bonus(s)/6))} / 10 min</b></div>
      <small className="dim">Stock is shared by every player. Each batch is limited, the better the goods the smaller the batch, and a sold-out batch is back after 3 hours.</small></div>
    <Rail cls="chips">{SECTORS.map(x=><button key={x.id} className={"rchip"+(x.id===sec?" on":"")+(L<x.lvl?" lk":"")} onClick={()=>pick(x.id)}>{x.n}{L<x.lvl&&<i>L{x.lvl}</i>}</button>)}</Rail>
    <div className="klist">{kinds.map(k=>{const open=k.id===kind,n=ITEMS_E.filter(i=>i.kind===k.id).reduce((a,i)=>a+((s.eco||{})[i.id]||0),0);return(
      <div className="kitem open" key={k.id}>
        <div className="krow"><span>{k.n}</span><small>{n?`${n} owned`:`${k.names.length} tiers`}</small></div>
        <Rail cls="cards">{ITEMS_E.filter(i=>i.kind===k.id).map(it=>{const sh=shelf(it,W.stock[it.id],now),lk=L<it.lvl,q=(s.eco||{})[it.id]||0;return(
          <div className={"ecard"+(lk?" lk":"")+(sh.left===0?" out":"")} key={it.id}><Art id={it.id} label={it.n}/>
            <span className={"tier t"+it.t}>{TIERS[it.t]}</span><b>{it.n}</b>
            <div className="kv"><span>Price</span><b>{$(it.p)}</b></div><div className="kv"><span>Pays</span><b>{$(Math.round(it.y/6))}/10 min</b></div>
            <small className="stk">{lk?`Unlocks at level ${it.lvl}`:sh.left>0?`${sh.left.toLocaleString("en-US")} of ${it.batch.toLocaleString("en-US")} left`:`Sold out. Next batch in ${left(sh.out)}`}</small>
            {q>0&&<small className="own">You own {q}</small>}
            <button className="btn" disabled={lk||sh.left===0||busy===it.id||s.cash<it.p} onClick={()=>buy(it)}>{sh.left===0?"Sold out":s.cash<it.p?"Not enough cash":"Buy"}</button></div>)})}</Rail>
      </div>)})}</div>
  </>);
}

export function Territory({s,go,W,id,name}){
  const L=G.level(s),[tier,setTier]=useState(-1),[busy,setBusy]=useState("");
  const me={id,name,pw:G.power(s)};
  const act=async(P,how,t)=>{if(busy)return;const rec=W.land[P.id];setBusy(P.id);
    if(how==="win"){if(s.en<12){setBusy("");return go({t:"landFight",id:P.id,win:false})}
      const they=(rec?rec.pw:0)+t*15+10,odds=(me.pw+1)/((me.pw+1)+they*1.2);
      if(Math.random()>=odds){go({t:"landFight",id:P.id,win:false});setBusy("");return}
      const r=await claimLand(P,me,"win");setBusy("");if(r.ok){go({t:"landFight",id:P.id,win:true});go({t:"landBuy",id:P.id,how:"win",price:rec?rec.p:P.p})}else go({t:"note",x:"Somebody beat you to it."});return}
    const price=how==="buy"?P.p:takeoverPrice(rec.p);if(s.cash<price){setBusy("");return go({t:"landBuy",id:P.id,how,price})}
    const r=await claimLand(P,me,how,rec&&rec.p);setBusy("");if(r.ok)go({t:"landBuy",id:P.id,how,price});else go({t:"note",x:r.err?"Couldn't reach the land office. Try again.":"It changed hands while you were deciding."})};
  return(<>
    <Sec t="Territory" r={W.solo?"Solo mode":"Shared"}/>
    {W.solo&&<p className="empty">The shared world isn't connected yet, so ownership runs on this phone only.</p>}
    <div className="panel"><div className="kv"><span>Places you hold</span><b>{Object.keys(s.land||{}).length}</b></div><div className="kv"><span>Pays you</span><b>{$(Math.round(landIncome(s)*G.bonus(s)))} / hour</b></div>
      <small className="dim">One map for everyone. If a player holds the whole capital, you can't have it for free: pay three times what they paid, or take it with your crew.</small></div>
    <div className="klist">{LTIERS.map((T,i)=>{const open=i===tier,held=LAND.filter(p=>p.t===i&&s.land&&s.land[p.id]).length;return(
      <div className="kitem open" key={T[0]}>
        <div className="krow"><span>{T[0]}</span><small>{L<T[2]?`Level ${T[2]}`:held?`${held} held`:`${LAND.filter(p=>p.t===i).length} places`}</small></div>
        <Rail cls="cards">{LAND.filter(p=>p.t===i).map(P=>{const rec=W.land[P.id],mine=s.land&&s.land[P.id],lk=L<T[2],price=rec?takeoverPrice(rec.p):P.p;
          const they=(rec?rec.pw:0)+i*15+10,odds=Math.round((me.pw+1)/((me.pw+1)+they*1.2)*100);return(
          <div className={"ecard land"+(lk?" lk":"")} key={P.id}><div className="eart ph land" aria-hidden="true"><span>{P.n.slice(0,2)}</span></div>
            <b>{P.n}</b><small className="stk">{mine?"Yours":rec?`Held by ${rec.nm}`:"Unclaimed"}</small>
            <div className="kv"><span>{rec&&!mine?"Buyout":"Price"}</span><b>{$(price)}</b></div><div className="kv"><span>Pays</span><b>{$(Math.round(landRate({p:mine?mine.p:rec?rec.p:P.p})))}/hr</b></div>
            {lk?<small className="stk">Unlocks at level {T[2]}</small>:mine?<small className="own">You hold this</small>:rec?
              <div className="btns tight"><button className="btn" disabled={busy===P.id||s.cash<price} onClick={()=>act(P,"buyout",i)}>Buy out</button><button className="btn ghost" disabled={busy===P.id} onClick={()=>act(P,"win",i)}>Take it · {odds}%</button></div>
              :<button className="btn" disabled={busy===P.id||s.cash<price} onClick={()=>act(P,"buy",i)}>{s.cash<price?"Not enough cash":"Buy"}</button>}</div>)})}</Rail>
      </div>)})}</div>
  </>);
}

export function Economy(P){
  return(<>
    <Sec t="Economy" r={P.W.solo?"Solo mode":"Shared"}/>
    {P.W.solo&&<p className="empty">The shared world isn't connected yet, so stock runs on this phone only.</p>}
    <Goods {...P}/>
  </>);
}

// Your office: a full-width page with your title, standing, staff and recent log.
export function Office({s,go,W,id,name}){
  const l=s.off||0,tier=G.officeTier(l),L=G.level(s),next=l<G.OFFICE_MAX,c=G.officeCost(l),need=G.officeLvl(l),w=G.worth(s).total,wk=G.workers(s),R=(W&&W.rank)||{pos:1,of:1,list:[]};
  const staff=wk.sol+wk.cap+wk.mgr+wk.desk;
  const Tile=({k,v,sub,live})=><div className="otile"><small>{k}{live&&<i className="livedot" aria-label="live"/>}</small><b>{v}</b>{sub&&<em>{sub}</em>}</div>;
  return(<div className="ofc">
    <div className="ofhero">
      {OFFICE_ART.has(Math.max(tier,1))?<img className={tier?"":"unrent"} src={IMG("office-"+Math.max(tier,1)+".jpg")} alt="" draggable="false"/>:<div className={"ofph t"+Math.max(tier,1)} aria-hidden="true"/>}
      <div className="ofshade"/>
      <div className="oftitle"><small>{G.corpTitle(L)}</small><h1>{name}</h1><span>{l?G.OFFICE_NAMES[l-1]:"Run it from the back of a bar"} · level {l} of {G.OFFICE_MAX}</span></div>
    </div>
    <div className="ofgrid">
      <Tile k="Net worth" v={$(w)}/>
      <Tile k="World rank" v={W&&W.solo?"#1":"#"+R.pos.toLocaleString("en-US")} sub={W&&W.solo?"Just you so far":`of ${R.of.toLocaleString("en-US")}${R.top?"+":""} players`} live={W&&!W.solo}/>
      <Tile k="Workers" v={staff.toLocaleString("en-US")} sub={`${wk.sol} soldiers · ${wk.cap} capos`}/>
      <Tile k="Earning" v={$(Math.round(G.hourly(s)))+"/hr"} sub={`${Object.keys(s.biz).length} businesses`}/>
    </div>
    <div className="panel">
      <div className="kv"><span>Soldiers</span><b>{wk.sol}</b></div><div className="kv"><span>Capos</span><b>{wk.cap}</b></div>
      <div className="kv"><span>Business managers</span><b>{wk.mgr}</b></div><div className="kv"><span>Office staff</span><b>{wk.desk}</b></div>
      <div className="kv"><span>Rank in the family</span><b>{G.rank(L)}</b></div>
      <div className="kv"><span>Heat</span><b>{Math.round(s.heat)}%</b></div>
    </div>
    <div className="panel">
      <div className="odots" aria-label={`Office level ${l} of ${G.OFFICE_MAX}`}>{Array.from({length:G.OFFICE_MAX},(_,i)=><i key={i} className={(i<l?"f":"")+(i%3===2?" end":"")}/>)}</div>
      <small className="dim">Each level adds one energy point, four desk staff and 2.5% to everything you earn. One picture covers three levels; the next picture replaces it.</small>
      {next?<div className="btns"><button className="btn" disabled={L<need||s.cash<c} onClick={()=>go({t:"officeUp"})}>{l?"Upgrade":"Rent"} · {$(c)}</button></div>:<small className="dim">Top floor. There's nowhere higher to go.</small>}
      {next&&L<need&&<small className="dim">Needs level {need}.</small>}
      {next&&<small className="dim">Next: {G.OFFICE_NAMES[l]}{l>0&&G.officeTier(l+1)!==tier?". A new picture, and the old room is gone for good.":"."}</small>}
    </div>
    <Sec t="Top of the world" r={W&&W.solo?"Solo mode":"Live"}/>
    <div className="panel board">{R.list.length?R.list.map((x,i)=><div className={"kv"+(x.id===id?" me":"")} key={x.id}><span>{i+1}. {x.n}</span><b>{$(x.w)}</b></div>):<small className="dim">Nobody yet.</small>}</div>
    <Sec t="Office log" r={`${s.log.length} entries`}/>
    <div className="panel logs">{s.log.slice(0,10).map((e,i)=><div className="lg" key={i}><small>{G.ago?G.ago(e.t):new Date(e.t).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small><span>{e.x}</span></div>)}</div>
  </div>);
}
