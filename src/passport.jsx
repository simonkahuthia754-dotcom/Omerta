import React from "react";
import * as G from "./game.js";
import {IMG} from "./ui.jsx";

// Where each live value goes on each card. x/y are pixels on the original 1920x1280 artwork
// (y is the vertical centre of the text), fs is the font size at that scale, w is the room available.
// al: l = starts at x, c = centred on x.
const F={
  silver:[
    {k:"rank",x:905,y:686,fs:48,w:300,c:"#f1eeff"},{k:"level",x:905,y:762,fs:48,w:120,c:"#f1eeff"},{k:"prestige",x:905,y:844,fs:48,w:120,c:"#f1eeff"},
    {k:"lvb",x:362,y:1110,fs:40,w:110,al:"c",c:"#f2f0f8",sh:1},{k:"pb",x:1612,y:1116,fs:52,w:78,al:"c",c:"#2a2a36",dk:1},
    {k:"foot",x:950,y:1148,fs:30,w:680,al:"c",c:"#1d1b2a",up:1,ls:.06,dk:1},
  ],
  frost:[
    {k:"rank",x:968,y:503,fs:56,w:290,al:"c",c:"#f3f7fd",ice:1},{k:"level",x:925,y:655,fs:70,w:120,c:"#f1f5fb",ice:1},{k:"prestige",x:925,y:805,fs:70,w:120,c:"#f1f5fb",ice:1},
    {k:"status",x:925,y:955,fs:68,w:380,c:"#f6f8fd",ice:1,up:1},{k:"idh",x:1408,y:1057,fs:22,w:170,c:"#e8f1ff",up:1,ls:.04},{k:"rankw",x:944,y:1106,fs:24,w:145,al:"c",c:"#dfe9f7",up:1,ls:.06},
  ],
  emerald:[
    {k:"rank",x:805,y:642,fs:80,w:420,c:"gold",wt:700},{k:"level",x:816,y:736,fs:84,w:120,c:"gold",wt:700},{k:"prestige",x:815,y:825,fs:84,w:120,c:"gold",wt:700},
    {k:"id",x:427,y:1023,fs:42,w:225,c:"#f1e2b0",wt:600},{k:"seasf",x:870,y:1030,fs:36,w:170,c:"#f1e2b0",wt:600,up:1},{k:"lvs",x:1548,y:206,fs:32,w:60,al:"c",c:"#f4e6b8",wt:600},
    {k:"xp",x:388,y:1077,fs:26,w:190,c:"#f1e2b0",wt:600},
  ],
  crimson:[
    {k:"name",x:360,y:565,fs:40,w:245,c:"#f3dba0",up:1,wt:600},{k:"rank",x:360,y:636,fs:42,w:195,c:"#f3dba0",wt:600},{k:"level",x:360,y:708,fs:42,w:50,c:"#f3dba0",wt:600},
    {k:"prestige",x:397,y:779,fs:42,w:50,c:"#f3dba0",wt:600},{k:"fam",x:1266,y:600,fs:40,w:380,c:"#f3dba0",up:1,wt:600},{k:"seas",x:1246,y:676,fs:42,w:44,c:"#f3dba0",wt:600},
    {k:"resp",x:1245,y:751,fs:42,w:90,c:"#f3dba0",wt:600},{k:"wins",x:1245,y:825,fs:42,w:85,c:"#f3dba0",wt:600},{k:"id",x:423,y:1026,fs:40,w:230,c:"#f3dba0",wt:600},
    {k:"seasf",x:557,y:1177,fs:34,w:190,c:"#e7cf8e",wt:600,up:1},
  ],
  obsidian:[
    {k:"rank",x:1238,y:430,fs:88,w:385,c:"gold",wt:700,up:1},{k:"level",x:1191,y:526,fs:64,w:95,c:"#fff",wt:600},{k:"prestige",x:1232,y:609,fs:64,w:95,c:"#fff",wt:600},
    {k:"id",x:1131,y:800,fs:48,w:265,c:"#f1d68a",wt:600,up:1},{k:"title",x:1030,y:874,fs:40,w:260,c:"#f1d68a",wt:600},
    {k:"mono",x:480,y:605,fs:118,w:170,al:"c",c:"gold",serif:1},{k:"year",x:1466,y:1136,fs:34,w:90,c:"#fff",wt:600},
  ],
};

const compact=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(Math.round(n));
export function values(s,name,id){
  const L=G.level(s),rk=G.rank(L),xp=G.xpBar(s),pr=G.prestige(s),gen=s.leg+1;
  const ini=(name||"OM").split(/[_\s-]+/).filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase()||"OM";
  return{rank:rk,level:String(L),prestige:String(pr),lvb:"LV."+L,pb:"P"+pr,lvs:String(L),id,idh:"#"+id,name:(name||"").toUpperCase(),fam:(name||"")+" family",
    seas:String(gen).padStart(2,"0"),seasf:"SEASON "+gen,resp:compact(s.res),wins:String(s.wins),year:String(new Date(s.t0).getFullYear()),
    title:"The "+rk,status:L<12?"Made man":"Feared",rankw:rk,mono:ini,
    xp:"XP "+Math.round(xp.cur).toLocaleString("en-US")+"/"+Math.round(xp.span).toLocaleString("en-US"),
    foot:`ID: ${id} · Generation ${gen} · Elite mafia division`,_pct:xp.pct};
}

export function PassportCard({s,name,id,card}){
  const cid=card||G.cardOf(s),v=values(s,name,id),C=G.CARDS.find(c=>c.id===cid);
  const label=`${C.n} passport. ${v.rank}, level ${v.level}, prestige ${v.prestige}.`;
  return(<div className="pcard" role="img" aria-label={label}>
    <img src={IMG("card-"+cid+".jpg")} alt="" draggable="false"/>
    {F[cid].map(f=>{
      const t=v[f.k]||"",fs=f.fs*Math.min(1,f.w/(Math.max(1,t.length)*f.fs*(f.up?.66:.56)));
      const st={left:f.x/19.2+"%",top:f.y/12.8+"%",fontSize:fs/19.2+"cqw",fontWeight:f.wt||600,letterSpacing:(f.ls||0)+"em"};
      if(f.c!=="gold")st.color=f.c;
      return<span key={f.k} className={"pt"+(f.al==="c"?" c":"")+(f.c==="gold"?" gold":"")+(f.sh?" sh":"")+(f.ice?" ice":"")+(f.serif?" serif":"")+(f.dk?" dk":"")+(f.up?" up":"")} style={st}>{t}</span>;
    })}
    {cid==="emerald"&&<div className="xpbar" style={{left:"20.1%",top:"85.8%",width:"13.4%",height:"1.1%"}}><i style={{width:v._pct+"%"}}/></div>}
  </div>);
}

export function CardShelf({s,go}){
  const L=G.level(s),cur=G.cardOf(s);
  return(<div className="cardshelf">{G.CARDS.map(c=>{const ok=L>=c.min;return(
    <button key={c.id} className={"cth"+(c.id===cur?" on":"")+(ok?"":" lk")} disabled={!ok} onClick={()=>go({t:"card",id:c.id})} aria-label={`${c.n}${ok?"":", unlocks at level "+c.min}`}>
      <img src={IMG("card-"+c.id+".jpg")} alt="" draggable="false"/><b>{c.n}</b><small>{ok?(c.id===cur?"In use":"Unlocked"):"Level "+c.min}</small></button>)})}</div>);
}
