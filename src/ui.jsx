import React,{useState} from "react";

const D={
  dagger:"M12 2l2.2 7.2L12 15l-2.2-5.8zM7 15h10M12 15v7M10 22h4",
  home:"M4 11l8-7 8 7v9H4zM10 20v-6h4v6",
  case:"M4 8h16v11H4zM9 8V6h6v2M4 13h16M11 13v2h2v-2",
  map:"M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  trend:"M3 17l5-6 4 3 8-9M14 5h6v6",
  glass:"M6 4h12l-1.5 15a1 1 0 01-1 1h-7a1 1 0 01-1-1zM6.8 11h10.4",
  chip:"M12 4a8 8 0 100 16 8 8 0 000-16zM12 9a3 3 0 100 6 3 3 0 000-6zM12 4v2M12 18v2M4 12h2M18 12h2",
  pistol:"M3 8h14l3 3v2h-6l-1 5h-3l.8-5H6l-1 3H3z",
  watch:"M9 3h6l1 4H8zM9 21h6l1-4H8zM12 7a5 5 0 100 10 5 5 0 000-10zM12 10v2l1.5 1",
  car:"M3 15v-3l2-4h14l2 4v3zM3 15h18M7 18.2a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2zM17 18.2a1.6 1.6 0 100-3.2 1.6 1.6 0 000 3.2z",
  suit:"M8 3l4 3 4-3 3 3-2 4v11H7V10L5 6zM12 6v14",
  cigar:"M3 15l14-6 3 1.5-14 6zM17 9l1.5-2M20 10.5l1.5-2",
  rose:"M12 4c3 0 5 2 5 4.5S15 13 12 13 7 11 7 8.5 9 4 12 4zM12 13v8M12 17c-2 0-3-1-4-2M12 18c2 0 3-1 4-2",
  bag:"M5 9h14l-1 11H6zM9 9V7a3 3 0 016 0v2",
  ring:"M9 5l3 3 3-3-1.5-2h-3zM12 8a6 6 0 100 12 6 6 0 000-12z",
  boat:"M3 15h18l-3 5H6zM12 4v10M12 4l6 8h-6",
  bolt:"M13 2L5 14h6l-1 8 8-12h-6z",
  flame:"M12 3c1 3 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  cash:"M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v10M9.5 9.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4",
  cell:"M5 3h14v18H5zM9 3v18M13 3v18M17 3v18",
  lock:"M6 11h12v9H6zM8 11V8a4 4 0 018 0v3",
  star:"M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  user:"M12 4a4 4 0 100 8 4 4 0 000-8zM4 21a8 8 0 0116 0",
};
export const Ic=({n,...p})=><svg className="i" viewBox="0 0 24 24" aria-hidden="true" {...p}><path d={D[n]||D.star}/></svg>;

// Line chart. pts = numbers, lines = [{y, c}] horizontal markers.
export function Chart({pts,color="#e6c77a",h=120,lines=[],fill=true,dec=2}){
  if(!pts||pts.length<2)return<div style={{height:h}}/>;
  const W=300,lo=Math.min(...pts,...lines.map(l=>l.y)),hi=Math.max(...pts,...lines.map(l=>l.y)),sp=(hi-lo)||1,pad=6;
  const X=i=>i/(pts.length-1)*W,Y=v=>pad+(1-(v-lo)/sp)*(h-pad*2);
  const d=pts.map((v,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(v).toFixed(1)).join("");
  return(<svg className="chart" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{height:h}} role="img" aria-label="Price chart">
    {[.25,.5,.75].map(t=><line key={t} x1="0" x2={W} y1={h*t} y2={h*t} stroke="rgba(255,255,255,.06)"/>)}
    {fill&&<path d={d+`L${W} ${h}L0 ${h}Z`} fill={color} opacity=".1"/>}
    {lines.map((l,i)=><line key={i} x1="0" x2={W} y1={Y(l.y)} y2={Y(l.y)} stroke={l.c} strokeDasharray="4 4" strokeWidth="1"/>)}
    <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/>
  </svg>);
}

// Optional real photo. Drop a file in public/img and it shows over the drawn art.
export const IMG=n=>(typeof window!=="undefined"&&window.OMERTA_IMG&&window.OMERTA_IMG[n])||"img/"+n;
export const Photo=({name,pos="center"})=><img className="photo-fill" src={IMG(name)} style={{objectPosition:pos}} alt="" onError={e=>e.currentTarget.remove()}/>;
export function Logo({size=28}){const [bad,setBad]=useState(false);return bad?<Ic n="dagger" style={{width:size,height:size}}/>:<img className="logo" src={IMG("logo.png")} width={size} height={size} alt="Omertà" onError={()=>setBad(true)}/>}

// Seeded skyline so it looks the same every time
export function Skyline({h=150,moon=true}){
  let r=7;const rnd=()=>(r=(r*9301+49297)%233280)/233280;
  const bs=[];let x=-6;while(x<310){const w=14+rnd()*26,ht=30+rnd()*(h*.62);bs.push({x,w,ht});x+=w+rnd()*3}
  return(<svg className="sky" viewBox={`0 0 300 ${h}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0d2a20"/><stop offset="1" stopColor="#1a3a2b"/></linearGradient></defs>
    <rect width="300" height={h} fill="url(#sk)"/>
    {moon&&<circle cx="238" cy="34" r="14" fill="#e6c77a" opacity=".9"/>}
    {bs.map((b,i)=><g key={i}><rect x={b.x} y={h-b.ht} width={b.w} height={b.ht} fill={i%3?"#07130e":"#0a1a13"}/>
      {Array.from({length:Math.floor(b.ht/9)*Math.floor(b.w/7)}).map((_,k)=>{const cols=Math.floor(b.w/7);const cx=b.x+3+(k%cols)*7,cy=h-b.ht+4+Math.floor(k/cols)*9;return rnd()>.72?<rect key={k} x={cx} y={cy} width="3" height="4" fill="#e6c77a" opacity=".7"/>:null})}
    </g>)}
  </svg>);
}

const HUE={isa:"#8c1c24",amara:"#7d6330",marco:"#2d4a6b",dante:"#3d4d3a"};
export const Portrait=({id,size=64})=>{const [bad,setBad]=useState(false);return bad?(<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="portrait">
  <defs><radialGradient id={"pg"+id} cx=".5" cy=".3"><stop offset="0" stopColor={HUE[id]||"#444"}/><stop offset="1" stopColor="#0b1d16"/></radialGradient></defs>
  <circle cx="32" cy="32" r="31" fill={`url(#pg${id})`} stroke="#c9a24d" strokeWidth="1.2"/>
  <circle cx="32" cy="25" r="9" fill="#ebe3d0" opacity=".85"/><path d="M13 58c2-14 10-19 19-19s17 5 19 19z" fill="#ebe3d0" opacity=".85"/>
</svg>):<img className="portrait mate" src={IMG("mate-"+id+".jpg")} width={size} height={size} alt="" draggable="false" onError={()=>setBad(true)}/>};

export const Meter=({v,max=100,c})=><div className="meter"><i style={{width:Math.max(0,Math.min(100,v/max*100))+"%",background:c}}/></div>;
