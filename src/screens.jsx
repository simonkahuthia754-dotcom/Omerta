import React,{useState,useRef,useEffect} from "react";
import * as G from "./game.js";
import {PassportCard,CardShelf} from "./passport.jsx";
import {Office,Territory} from "./econ.jsx";
import {Ic,Chart,Photo,Skyline,Portrait,Meter,Logo,IMG} from "./ui.jsx";
import {Partner,Profile} from "./people.jsx";
const {$}=G;
const Head=({t,p})=><div className="hd"><h1>{t}</h1>{p&&<p>{p}</p>}</div>;
const Sec=({t,r})=><div className="sec"><h2>{t}</h2>{r&&<span>{r}</span>}</div>;
const Lock=({l})=><span className="lockn"><Ic n="lock"/>Level {l}</span>;

// ---------- Home ----------
export function Home({s,go,chat,send,id}){
  const now=s.t,w=G.worth(s),xp=G.xpBar(s),b=G.board(s,now);
  const ready=Object.keys(s.biz).reduce((a,k)=>a+G.till(s,k,now),0),trib=G.tribute(s,now),day=new Date(now).toDateString()!==s.dl.d;
  const E=s.ev&&G.EM[s.ev.id];
  const reward=50000+Math.round(s.heat)*9000;
  return<>
    <div className="hero"><Skyline/><Photo name="city.jpg" pos="50% 40%"/><div className="hero-in">
      <div className="rank">{G.rank(xp.l)}</div><div className="lv">Level {xp.l}</div>
      <Meter v={xp.cur} max={xp.span}/><small>{Math.round(xp.cur).toLocaleString()} of {Math.round(xp.span).toLocaleString()} to next level</small>
    </div></div>
    <div className="worth"><div className="n">{$(w.total)}</div><div className="l">Net worth{s.leg>0&&` · generation ${s.leg+1}`}</div>
      {s.nw.length>1&&<div className="spark"><Chart pts={s.nw.map(x=>x[1])} h={46} dec={0}/></div>}
      <div className="facts"><div><b>{Math.round(DISTAVG(s))}%</b><small>of the city held</small></div><div><b>{b.find(x=>x.me).r===1?"First":"#"+b.find(x=>x.me).r}</b><small>among all dons</small></div><div><b>{Math.round(s.heat)}%</b><small>police heat</small></div></div>
    </div>
    <Sec t="Ready now"/>
    <div className="panel">
      <div className="kv"><span>Business tills</span><b>{$(ready)}</b></div>
      <div className="kv"><span>Neighborhood tribute</span><b>{$(trib)}</b></div>
      <div className="btns"><button className="btn" onClick={()=>{go({t:"collect",id:"all"});go({t:"tribute"})}}>Collect everything</button>
        <button className={"btn "+(day?"":"ghost")} onClick={()=>go({t:"daily"})}>{day?"Daily gift":"Gift taken"}</button></div>
    </div>
    {E&&<div className="file event"><h3>Something came up</h3><p>{G.evText(s)}</p>
      <div className="btns">{E.ch.map((c,i)=><button key={i} className={"btn "+(i?"ghost":"")} onClick={()=>go({t:"choose",i})}>{c.l}</button>)}</div></div>}
    <Sec t="Richest dons" r="Worldwide"/>
    <div className="ledger">{b.slice(0,8).map(e=>
      <div key={e.n} className={"row"+(e.me?" me":"")}><div className="rk">{e.r}</div><div className="fl">{e.f}</div>
        <div className="who"><b>{e.me?"You":e.n}</b><small>{e.c}, level {e.l}</small></div><div className="amt">{$(e.w)}</div></div>)}</div>
    <div className="file"><div className="stamp">{s.heat>66?"Wanted":s.heat>33?"Watched":"Quiet"}</div><h3>FBI file {id}</h3>
      <dl><dt>Heat</dt><dd>{Math.round(s.heat)}%</dd><dt>Reward</dt><dd>{$(reward)}</dd><dt>Last seen</dt><dd>Docks, pier 14</dd></dl>
      <div className="btns" style={{marginTop:12}}><button className="btn ghost dark" onClick={()=>go({t:"lay"})}>Lay low · {$(G.layCost(s))}</button></div></div>
    <Sec t="Latest" r="Your story"/>
    <div className="feed">{s.log.slice(0,6).map((l,i)=><div key={i} className={"fl2"+(l.a>0?" up":l.a<0?" dn":"")}><span>{l.x}</span>{l.a?<b>{l.a>0?"+":""}{$(l.a)}</b>:null}</div>)}</div>
  </>;
}
const DISTAVG=s=>G.DIST.reduce((a,d)=>a+s.dist[d.id],0)/G.DIST.length;

// ---------- Jobs ----------
export function Jobs({s,go}){
  const L=G.level(s),now=s.t,mx=G.enMax(s),next=Math.max(0,G.REGEN-(now-s.enT));
  const open=G.JOBS.filter(j=>j.lvl<=L),locked=G.JOBS.filter(j=>j.lvl>L).slice(0,2);
  const [ap,setAp]=useState("quiet");
  return<>
    <Head t="The work" p="Everything you do on the street costs energy. It comes back on its own."/>
    <div className="panel">
      <div className="kv"><span><Ic n="bolt"/> Energy</span><b>{s.en} / {mx}</b></div><Meter v={s.en} max={mx} c="var(--brass-hi)"/>
      <small className="dim">{s.en<mx?`Next point in ${G.hm(next)}`:"Full. Go use it."}</small>
    </div>
    {G.jailed(s)&&<div className="file jail"><div className="stamp">Locked up</div><h3>You're in a cell</h3><p>Out in {G.hm(s.jail-now)}. Or a lawyer can fix it now.</p>
      <button className="btn red" onClick={()=>go({t:"bail"})}>Pay bail · {$(G.bailCost(s))}</button></div>}
    <Sec t="Jobs" r="Pays dirty cash"/>
    <div className="list">{open.slice().reverse().map(j=>{const st=G.stars(s,j.id),f=G.jobFail(s,j);return(
      <div className="job" key={j.id}><div className="who"><b>{j.n}</b>
        <small>{$(Math.round(j.p[0]*(1+.12*st)))}–{$(Math.round(j.p[1]*(1+.12*st)))} · {Math.round(f)}% risk · {j.en} energy</small>
        <div className="stars" aria-label={st+" of 3 stars"}>{[0,1,2].map(i=><Ic key={i} n="star" className={"i "+(i<st?"on":"")}/>)}<small>{s.jobs[j.id]||0} done</small></div></div>
        <button className="btn" disabled={s.en<j.en||G.jailed(s)} onClick={()=>go({t:"job",id:j.id})}>Do it</button></div>)})}
      {locked.map(j=><div className="job lk" key={j.id}><div className="who"><b>{j.n}</b><small><Lock l={j.lvl}/></small></div></div>)}</div>
    <Sec t="Heists" r="Crew and a plan"/>
    <div className="seg" style={{margin:"0 20px 10px"}}>{[["quiet","Quiet"],["loud","Loud"],["inside","Inside man"]].map(([k,l])=><button key={k} className={ap===k?"on":""} onClick={()=>setAp(k)}>{l}</button>)}</div>
    <div className="list">{G.HEISTS.map(h=>{const cd=(s.hcd[h.id]||0)-now,lk=L<h.lvl,f=G.heistFail(s,h,ap);return(
      <div className={"job"+(lk?" lk":"")} key={h.id}><div className="who"><b>{h.n}</b>
        <small>{lk?<Lock l={h.lvl}/>:<>{$(h.p[0])}–{$(h.p[1])} · {Math.round(f)}% risk · needs {h.sol} soldiers{h.cap?`, ${h.cap} capos`:""}</>}</small>
        {!lk&&cd>0&&<small className="dim">Cooling off: {G.hm(cd)}</small>}</div>
        {!lk&&<button className="btn" disabled={cd>0} onClick={()=>go({t:"heist",id:h.id,ap})}>{ap==="inside"?"Pay "+$(G.heistCost(h)):"Go"}</button>}</div>)})}</div>
    <Sec t="Rivals" r={`Your crew: ${G.power(s)} power`}/>
    <div className="list">{G.RIVALS.map((r,i)=><div className="job" key={r.n}><div className="who"><b>{r.f} {r.n}</b><small>{r.c} · level {r.l} · {Math.round(G.rivalOdds(s,r)*100)}% to win · 5 energy</small></div>
      <button className="btn ghost" onClick={()=>go({t:"attack",i})}>Hit them</button></div>)}</div>
  </>;
}

// ---------- Empire ----------
export function Empire({s,go,W,id,name}){
  const L=G.level(s),now=s.t,[pg,setPg]=useState("biz"),[sel,setSel]=useState("ital"),d=G.DM[sel],room=G.washRoom(s,now);
  const owned=G.BIZ.filter(b=>s.biz[b.id]),rest=G.BIZ.filter(b=>!s.biz[b.id]);
  return<>
    <div className="band"><Skyline h={130}/><Photo name="city.jpg" pos="50% 78%"/><div className="hd"><h1>The empire</h1></div></div>
    <div className="seg" style={{margin:"0 20px 14px"}}>{[["biz","Business"],["office","Office"],["cities","Cities"]].map(([k,l])=><button key={k} className={pg===k?"on":""} onClick={()=>setPg(k)}>{l}</button>)}</div>
    {pg==="biz"&&<>
    <div className="panel"><div className="kv"><span>Dirty cash</span><b>{$(s.dirty)}</b></div>
      <div className="kv"><span>Can wash through businesses</span><b>{$(room)}</b></div>
      {s.dirty>G.dirtyLimit(s)&&<small className="warn">That's more than you can hide. The police are starting to notice.</small>}
      <div className="btns"><button className="btn" disabled={s.dirty<=0||room<1} onClick={()=>go({t:"launder",k:"fronts"})}>Wash through businesses · 85%</button>
        <button className="btn ghost" disabled={s.dirty<=0} onClick={()=>go({t:"launder",k:"street"})}>Street wash · 55%</button></div></div>
    <Sec t="Businesses" r={$(Object.keys(s.biz).reduce((a,k)=>a+G.BM[k].inc*s.biz[k].l*G.bonus(s),0))+" / hour"}/>
    <div className="list">{owned.map(B=>{const b=s.biz[B.id],t=G.till(s,B.id,now),uc=G.bizUpCost(B.id,b.l);return(
      <div className="biz" key={B.id}>{G.BIZ_IMG[B.id]&&<img className="bthumb" src={IMG(G.BIZ_IMG[B.id])} alt="" loading="lazy" draggable="false"/>}<div className="who"><b>{B.n}</b><small>Level {b.l} · {$(Math.round(B.inc*b.l*G.bonus(s)))}/hr{b.m?" · manager":""}</small></div>
        <div className="btns tight"><button className="btn" disabled={t<1} onClick={()=>go({t:"collect",id:B.id})}>{$(t)}</button>
          <button className="btn ghost" disabled={b.l>=12} onClick={()=>go({t:"upBiz",id:B.id})}>Upgrade {$(uc)}</button>
          {!b.m&&<button className="btn ghost" onClick={()=>go({t:"mgr",id:B.id})}>Manager {$(B.cost*2)}</button>}</div></div>)})}
      {rest.map(B=><div className={"biz"+(L<B.lvl?" lk":"")} key={B.id}>{G.BIZ_IMG[B.id]&&<img className="bthumb" src={IMG(G.BIZ_IMG[B.id])} alt="" loading="lazy" draggable="false"/>}<div className="who"><b>{B.n}</b><small>{B.d}</small>{L<B.lvl?<small><Lock l={B.lvl}/></small>:<small>{$(B.inc)}/hr base</small>}</div>
        {L>=B.lvl&&<button className="btn" onClick={()=>go({t:"buyBiz",id:B.id})}>Buy {$(B.cost)}</button>}</div>)}</div>
    </>}
    {pg==="office"&&<Office s={s} go={go}/>}
    {pg==="cities"&&<>
    <Sec t="The city" r={`Tribute ${$(G.tributeRate(s))}/hr`}/>
    <div className="city"><svg viewBox="0 0 300 170" role="img" aria-label="District map">{G.DIST.map(x=>{const lk=L<x.lvl;return(
      <g key={x.id} className={"dist"+(x.id===sel?" on":"")+(lk?" lk":"")} onClick={()=>setSel(x.id)}>
        <rect x={x.x} y={x.y} width={x.w} height={x.h} rx="3" fill="#c9a24d" fillOpacity={lk?.02:.06+s.dist[x.id]/100*.5}/>
        <text x={x.x+9} y={x.y+20}>{x.n}</text><text x={x.x+9} y={x.y+x.h-10} style={{fontSize:16}}>{lk?"L"+x.lvl:Math.floor(s.dist[x.id])+"%"}</text></g>)})}</svg></div>
    <div className="panel"><div className="kv"><span>{d.n} · {d.s}</span><b>{Math.floor(s.dist[sel])}%</b></div><Meter v={s.dist[sel]}/>
      <small className="dim">{L<d.lvl?`Unlocks at level ${d.lvl}.`:`${Math.round(G.odds(s,sel)*100)}% chance to win a push. Rivals take back a little every hour.`}</small>
      <div className="btns"><button className="btn" disabled={L<d.lvl} onClick={()=>go({t:"push",id:sel})}>Push · {$(G.pushCost(s))} · 3 energy</button></div></div>
    <Sec t="Your crew" r={`${G.power(s)} power`}/>
    <div className="panel"><div className="kv"><span>Soldiers</span><b>{s.crew.sol}</b></div><div className="kv"><span>Capos (worth eight soldiers)</span><b>{s.crew.cap}</b></div>
      <div className="btns"><button className="btn" onClick={()=>go({t:"recruit",k:"sol"})}>Hire soldier · {$(G.crewCost(s,"sol"))}</button><button className="btn ghost" onClick={()=>go({t:"recruit",k:"cap"})}>Promote capo · {$(G.crewCost(s,"cap"))}</button></div></div>
      <Territory s={s} go={go} W={W} id={id} name={name}/>
    </>}
  </>;
}

// ---------- Markets ----------
const STAKES=[1000,5000,25000,100000,500000],LEVS=[2,5,10,25,50];
export function Markets({s,go}){
  const [p,setP]=useState("EURUSD"),[st,setSt]=useState(5000),[lv,setLv]=useState(5),[sl,setSl]=useState(.5),[tp,setTp]=useState(0);
  const q=p==="OMC"?"EURUSD":p,f=G.FM[q],h=s.fx.h[q],px=s.fx.p[q],chg=(px-h[0])/h[0]*100,mine=s.pos.filter(o=>o.pair===q);
  return<>
    <Head t="The markets" p="Prices keep moving while you're away. Leverage makes small moves big."/>
    <div className="seg scrollx"><button className={p==="OMC"?"on":""} onClick={()=>setP("OMC")}>Omerta Coin</button>{G.FX.map(x=><button key={x.id} className={p===x.id?"on":""} onClick={()=>setP(x.id)}>{x.n}</button>)}</div>
    {p==="OMC"?<Coin s={s} go={go}/>:<>
    <div className="quote"><div className="px">{px.toFixed(f.d)}</div><div className={"chg "+(chg>=0?"up":"dn")}>{chg>=0?"+":""}{chg.toFixed(2)}%</div></div>
    <div className="chartbox"><Chart pts={h} color={chg>=0?"#7fbf8e":"#d4666e"} h={150} lines={mine.map(o=>({y:o.e,c:o.dir>0?"#7fbf8e":"#d4666e"}))}/></div>
    <div className="panel"><div className="kv"><span>Stake</span><b>{$(st)}</b></div>
      <div className="seg">{STAKES.map(x=><button key={x} className={st===x?"on":""} onClick={()=>setSt(x)}>{x>=1000?x/1000+"k":x}</button>)}</div>
      <div className="kv" style={{marginTop:12}}><span>Leverage</span><b>{lv}x</b></div>
      <div className="seg">{LEVS.map(x=><button key={x} className={lv===x?"on":""} onClick={()=>setLv(x)}>{x}x</button>)}</div>
      <div className="kv" style={{marginTop:12}}><span>Stop loss</span><b>{sl?"at -"+sl*100+"%":"none"}</b></div>
      <div className="seg">{[[0,"None"],[.25,"25%"],[.5,"50%"],[.8,"80%"]].map(([x,l])=><button key={x} className={sl===x?"on":""} onClick={()=>setSl(x)}>{l}</button>)}</div>
      <div className="kv" style={{marginTop:12}}><span>Take profit</span><b>{tp?"at +"+tp*100+"%":"none"}</b></div>
      <div className="seg">{[[0,"None"],[.5,"50%"],[1,"100%"],[2,"200%"]].map(([x,l])=><button key={x} className={tp===x?"on":""} onClick={()=>setTp(x)}>{l}</button>)}</div>
      <div className="btns"><button className="btn up" onClick={()=>go({t:"open",pair:p,dir:1,st,lev:lv,sl,tp})}>Buy</button><button className="btn red" onClick={()=>go({t:"open",pair:p,dir:-1,st,lev:lv,sl,tp})}>Sell</button></div>
      <small className="dim">A 0.2% broker fee is taken on opening. At {lv}x, a {(100/lv).toFixed(1)}% move against you wipes the stake out.</small></div>
    <Sec t="Open trades" r={s.pos.length+" of 6"}/>
    <div className="list">{s.pos.length===0&&<div className="empty">Nothing open. Pick a pair, set a stake, and take a position.</div>}
      {s.pos.map(o=>{const v=G.eq(o,s.fx.p[o.pair]),pl=v-o.st;return(<div className="job" key={o.id}><div className="who"><b>{o.dir>0?"Buy":"Sell"} {G.FM[o.pair].n} · {o.lev}x</b><small>Stake {$(o.st)} · entry {o.e.toFixed(G.FM[o.pair].d)}{o.sl?` · stop -${o.sl*100}%`:""}{o.tp?` · target +${o.tp*100}%`:""}</small></div>
        <div className="pl"><b className={pl>=0?"up":"dn"}>{pl>=0?"+":""}{$(pl)}</b><button className="btn ghost" onClick={()=>go({t:"close",id:o.id})}>Close</button></div></div>)})}</div>
    {s.trades.length>0&&<><Sec t="Closed"/><div className="feed">{s.trades.slice(0,6).map((t,i)=><div key={i} className={"fl2 "+(t.pnl>=0?"up":"dn")}><span>{G.FM[t.pair].n}</span><b>{t.pnl>=0?"+":""}{$(t.pnl)}</b></div>)}</div></>}
  </>}
  </>;
}

function Coin({s,go}){
  const o=s.omc,[amt,setAmt]=useState(5000),chg=(o.p-o.h[0])/o.h[0]*100,val=o.q*o.p,pl=o.cost>0?val-o.cost:0,live=o.live&&s.t-o.lt<5*6e4;
  return<>
    <div className="quote"><div className="px">{$(o.p)}</div><div className={"chg "+(chg>=0?"up":"dn")}>{chg>=0?"+":""}{chg.toFixed(2)}%</div><span className={"chip "+(live?"live":"")}>{live?"Live Bitcoin price":"Simulated"}</span></div>
    <div className="chartbox"><Chart pts={o.h} color={chg>=0?"#7fbf8e":"#d4666e"} h={150} lines={o.q>0&&o.cost>0?[{y:o.cost/o.q,c:"#e6c77a"}]:[]}/></div>
    <div className="panel"><div className="kv"><span>You hold</span><b>{G.omcQty(o.q)} OMC</b></div><div className="kv"><span>Worth</span><b>{$(val)}</b></div>
      {o.q>0&&<div className="kv"><span>Profit or loss</span><b className={pl>=0?"up":"dn"}>{pl>=0?"+":""}{$(pl)}</b></div>}
      <div className="kv" style={{marginTop:10}}><span>Amount to buy</span><b>{$(amt)}</b></div>
      <div className="seg">{[1000,5000,25000,100000,500000].map(x=><button key={x} className={amt===x?"on":""} onClick={()=>setAmt(x)}>{x/1000}k</button>)}</div>
      <div className="btns"><button className="btn up" onClick={()=>go({t:"buyOmc",amt})}>Buy</button>{[.25,.5,1].map(f=><button key={f} className="btn red" disabled={o.q<=0} onClick={()=>go({t:"sellOmc",frac:f})}>Sell {f*100}%</button>)}</div>
      <small className="dim">The exchange keeps 0.5% on every buy and sell. Coins sit in your wallet, not in your storage, and nobody can seize them.</small></div>
    <Sec t="About Omerta Coin"/>
    <div className="panel"><p className="dim" style={{fontSize:14,lineHeight:1.55,marginTop:0}}>Omerta Coin copies Bitcoin. There will only ever be {(G.OMC_CAP/1e6).toFixed(0)} million of them, the supply is cut in half about every four years (next around April 2028), and the price is Bitcoin's real price. When your phone is online it reads the live price. Offline, it wanders near the last price it saw.</p></div>
  </>;
}

// ---------- Life ----------
export function Life({s,go,id,name}){
  const L=G.level(s),u=G.used(s),cp=G.cap(s),nx=G.STORE[s.store+1],col=G.collections(s),m=s.mate,M=m&&G.MM[m.id];
  const [open,setOpen]=useState(null);
  return<>
    <Profile s={s} go={go} name={name} id={id}/>
    <Sec t="Passport" r={G.CARDS.find(c=>c.id===G.cardOf(s)).n}/>
    <div className="pwrap"><PassportCard s={s} name={name} id={id}/></div>
    <CardShelf s={s} go={go}/>
    <Partner s={s} go={go} L={L}/>
    <Sec t="Parties"/>
    <div className="list">{G.PARTIES.map(P=>{const lk=L<P.lvl;return<div className={"job"+(lk?" lk":"")} key={P.id}><div className="who"><b>{P.n}</b><small>{lk?<Lock l={P.lvl}/>:P.d}</small>{!lk&&<small className="dim">{$(P.cost)} · +{P.res} respect</small>}</div>
      {!lk&&<button className="btn" onClick={()=>go({t:"party",id:P.id})}>Throw</button>}</div>})}
      {s.last&&<div className="file small"><h3>{s.last.n}</h3><p>{s.last.x}</p></div>}</div>
    <Sec t="Storage" r={`${u} of ${cp} slots · ${G.STORE[s.store].n}`}/>
    <div className="panel"><Meter v={u} max={cp}/>{nx&&<div className="btns"><button className="btn ghost" onClick={()=>go({t:"upStore"})}>Move to {nx.n} · {$(nx.cost)} · {nx.slots} slots</button></div>}</div>
    <Sec t="Collections" r={`+${Math.round(col.b*100)}% to all income`}/>
    <div className="list">{G.COLL.map(c=>{const n=c.need.filter(k=>s.inv[k]>0||s.est[k]).length,dn=n===c.need.length;return<div className="job" key={c.id}><div className="who"><b>{c.n}{dn&&" ✓"}</b><small>{c.d}</small><Meter v={n} max={c.need.length}/></div><b className="amt">+{c.b*100}%</b></div>})}</div>
    {G.SHELVES.map(sh=><div key={sh}><Sec t={sh}/><div className="shelf">{G.ITEMS.filter(i=>i.k===sh).sort((a,b)=>a.p-b.p).map(it=>{const have=it.est?!!s.est[it.id]:(s.inv[it.id]||0),lk=L<it.lvl;return(
      <div className={"card"+(lk?" lk":"")+(it.img?" wide":"")} key={it.id}>{it.img?<img className={"cardimg"+(/\.png$/.test(it.img)?" cut":"")} src={IMG(it.img)} alt="" loading="lazy" draggable="false"/>:<Ic n={it.i}/>}<b>{it.n}</b><div className="p">{$(it.p)}</div><small>{lk?<Lock l={it.lvl}/>:have?`Owned${it.est?"":": "+have}`:it.t}</small>
        {!lk&&<div className="btns tight"><button className="buy" disabled={s.cash<it.p||(it.est&&have)} onClick={()=>go({t:"buy",id:it.id})}>{it.est&&have?"Owned":s.cash<it.p?"Can't afford":"Buy"}</button>
          {have?<button className="sell" onClick={()=>go({t:"sell",id:it.id})}>Sell</button>:null}</div>}</div>)})}</div></div>)}
    <Sec t="Achievements" r={`${Object.keys(s.ach).length} of ${G.ACH.length}`}/>
    <div className="badges">{G.ACH.map(a=>{const d=!!s.ach[a.id],art=G.badgeOf(a.id);return(
      <div className={"badge"+(d?" got":"")} key={a.id} aria-label={`${a.n}${d?", earned":", locked"}. ${a.d}`}>
        <div className={"art"+(art?"":" plain")}>{art?<img src={IMG(art)} alt="" draggable="false" loading="lazy"/>:<span className="starm"><Ic n="star"/></span>}{!d&&<span className="lkm"><Ic n="lock"/></span>}</div>
        <b>{a.n}</b><small>{a.d}</small>{a.rw.cash>0&&<em>{d?"Earned":$(a.rw.cash)}</em>}</div>)})}</div>
    <Sec t="Legacy"/>
    <div className="panel"><p className="dim" style={{fontSize:14,lineHeight:1.5}}>At level 25 you can hand everything to your heir. You start over with a little cash, and every business pays 25% more for good. Achievements stay.</p>
      <div className="btns"><button className="btn red" disabled={L<25} onClick={()=>{if(confirm("Hand the family to your heir? You'll start over at level 1."))go({t:"retire"})}}>{L<25?`Unlocks at level 25`:"Pass it down"}</button></div></div>
  </>;
}
