// The shared world: finite stock of goods and who owns each place. Shared through the database when it is set up;
// otherwise it runs in solo mode on this phone, with the same rules.
import {useState,useEffect} from "react";
import {watch,put,add,tx,serverNow,configured} from "./live.js";
import * as C from "./clean.js";
import {EM,LM,shelf,RESTOCK,takeoverPrice} from "./economy.js";

const LS="omerta_solo_world";
const readLocal=()=>{try{const w=JSON.parse(localStorage.getItem(LS));if(w&&w.stock&&w.land)return w}catch(e){}return{stock:{},land:{}}};
const writeLocal=w=>{try{localStorage.setItem(LS,JSON.stringify(w))}catch(e){}ping.forEach(f=>f())};
const ping=new Set();

// Rebuild remote data from known ids and types only.
const cleanStock=v=>{const o={};if(v&&typeof v==="object")Object.keys(v).forEach(k=>{if(!EM[k])return;const r=v[k];if(r&&Number.isFinite(r.n)&&r.n>=0&&r.n<=1300)o[k]={n:Math.floor(r.n),t:Number.isFinite(r.t)?r.t:0}});return o};
const cleanLand=v=>{const o={};if(v&&typeof v==="object")Object.keys(v).forEach(k=>{if(!LM[k])return;const r=v[k],i=C.id(r&&r.o);if(!i)return;
  o[k]={o:i,nm:C.text(r.nm,16)||i,p:Number.isFinite(r.p)&&r.p>0&&r.p<1e19?r.p:LM[k].p,pw:Number.isFinite(r.pw)&&r.pw>=0&&r.pw<1e7?Math.floor(r.pw):0}});return o};

export function useWorld(me,s,go){
  const [stock,setStock]=useState({}),[land,setLand]=useState({}),[,bump]=useState(0);
  useEffect(()=>{
    if(!configured){const f=()=>{const w=readLocal();setStock(cleanStock(w.stock));setLand(cleanLand(w.land));bump(x=>x+1)};ping.add(f);f();return()=>ping.delete(f)}
    const a=watch("omerta_stock",v=>setStock(cleanStock(v))),b=watch("omerta_land",v=>setLand(cleanLand(v)));return()=>{a();b()}
  },[]);
  // Places that someone else now holds are removed from this player's list.
  useEffect(()=>{if(!s)return;Object.keys(s.land||{}).forEach(k=>{const r=land[k];if(r&&r.o!==me&&Object.keys(land).length)go({t:"landLost",id:k,by:r.nm})})},[land,me]);
  // Money from places that were bought off this player arrives as credits.
  useEffect(()=>{if(!configured)return;const seen=new Set();return watch("omerta_credit/"+me,v=>{if(!v||typeof v!=="object")return;Object.keys(v).forEach(k=>{if(seen.has(k)||!C.key(k))return;seen.add(k);const r=v[k];
    if(r&&Number.isFinite(r.a)&&r.a>0&&r.a<1e19&&LM[r.id]){go({t:"credit",a:r.a,id:r.id});put(`omerta_credit/${me}/${k}`,null)}})})},[me]);
  return{stock,land,solo:!configured};
}

export async function claimStock(it){
  const now=serverNow();
  if(!configured){const w=readLocal(),sh=shelf(it,w.stock[it.id],now);if(!sh.left)return{ok:false};const n=sh.left-1;w.stock[it.id]={n,t:n>0?0:now+RESTOCK};writeLocal(w);return{ok:true,left:n}}
  const r=await tx("omerta_stock/"+it.id,cur=>{const sh=shelf(it,cur,now);if(!sh.left)return;const n=sh.left-1;return{n,t:n>0?((cur&&cur.t)||0):now+RESTOCK}});
  return{ok:r.ok,err:r.err}}

// how: "buy" (empty place), "buyout" (pay three times the last price), "win" (taken by force)
export async function claimLand(P,me,how,expect){
  const now=serverNow();let prev=null;
  const make=(cur,p)=>({o:me.id,nm:me.name,p,pw:me.pw,t:now});
  if(!configured){const w=readLocal(),cur=w.land[P.id];
    if(how==="buy"&&cur)return{ok:false};if(how!=="buy"&&(!cur||cur.o===me.id))return{ok:false};
    w.land[P.id]=make(cur,how==="buyout"?takeoverPrice(cur.p):how==="win"?cur.p:P.p);writeLocal(w);return{ok:true}}
  const r=await tx("omerta_land/"+P.id,cur=>{prev=cur;
    if(how==="buy")return cur&&cur.o?undefined:make(cur,P.p);
    if(!cur||!cur.o||cur.o===me.id)return;
    if(how==="buyout")return cur.p===expect?make(cur,takeoverPrice(cur.p)):undefined;
    return make(cur,cur.p)});
  if(r.ok&&how==="buyout"&&prev&&C.id(prev.o))add("omerta_credit/"+prev.o,{a:takeoverPrice(prev.p),id:P.id,t:now});
  return{ok:r.ok,err:r.err}}
