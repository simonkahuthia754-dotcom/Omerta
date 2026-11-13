// Everything that talks to the shared database lives here, so the screens never touch Firebase directly.
import {initializeApp} from "firebase/app";
import {getDatabase,ref,push,set,onValue,onChildAdded,query,orderByChild,limitToLast} from "firebase/database";

const cfg={apiKey:"AIzaSyDUMMY",authDomain:"tycoon-empire-world.firebaseapp.com",databaseURL:"https://tycoon-empire-world-default-rtdb.firebaseio.com",projectId:"tycoon-empire-world",storageBucket:"tycoon-empire-world.appspot.com",messagingSenderId:"123456789",appId:"1:123456789:web:omerta"};
export const rtdb=getDatabase(initializeApp(cfg));
export {ref,onChildAdded,query,orderByChild,limitToLast};
import {key,setClock} from "./clean.js";
// Paths are built from player ids and keys, so every segment is checked before it reaches the database.
export const R=p=>{const s=String(p).split("/");if(!(p===".info/connected"||p===".info/serverTimeOffset"||s.every(x=>key(x))))throw new Error("bad path");return ref(rtdb,p)};
export const watch=(p,f)=>{try{return onValue(R(p),x=>f(x.val()),()=>f(null))}catch(e){return()=>{}}};
export const put=(p,v)=>{try{return set(R(p),v)}catch(e){return Promise.resolve()}};
export const add=(p,v)=>{try{return push(R(p),v)}catch(e){return Promise.resolve()}};
// Clocks on phones drift, so timestamps use the database server's time.
let off=0;export const serverNow=()=>Date.now()+off;setClock(serverNow);
try{onValue(R(".info/serverTimeOffset"),x=>{off=+x.val()||0})}catch(e){}
export const pairKey=(a,b)=>[a,b].sort().join("_");
export {text as clip} from "./clean.js";
export const ago=t=>{const m=Math.max(0,Math.round((serverNow()-t)/6e4));return m<1?"now":m<60?m+"m":m<1440?Math.round(m/60)+"h":Math.round(m/1440)+"d"};
// Who may write for a paper: the five candidates with the most votes (at least one), earliest application breaking ties.
export const staffOf=(apps,votes)=>Object.entries(apps||{}).map(([id,a])=>({id,...a,v:Object.keys((votes||{})[id]||{}).length}))
  .sort((a,b)=>b.v-a.v||a.t-b.t);
export const seats=list=>list.filter(c=>c.v>0).slice(0,5);
