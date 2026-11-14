// Everything that talks to the shared database lives here, so the screens never touch Firebase directly.
import {initializeApp} from "firebase/app";
import {getDatabase,ref,push,set,onValue,onChildAdded,query,orderByChild,limitToLast,runTransaction} from "firebase/database";

import {firebaseConfig as cfg,configured} from "./firebase-config.js";
export {configured};
let lastErr="";const errs=new Set();export const lastError=()=>lastErr;export const onError=f=>{errs.add(f);return()=>errs.delete(f)};
const fail=e=>{lastErr=(e&&e.code)==="PERMISSION_DENIED"?"The database refused that message. Its rules need to be published.":"A message could not be sent.";errs.forEach(f=>f(lastErr));};
export const rtdb=getDatabase(initializeApp(cfg));
export {ref,onChildAdded,query,orderByChild,limitToLast};
import {key,setClock} from "./clean.js";
// Paths are built from player ids and keys, so every segment is checked before it reaches the database.
export const R=p=>{const s=String(p).split("/");if(!(p===".info/connected"||p===".info/serverTimeOffset"||s.every(x=>key(x))))throw new Error("bad path");return ref(rtdb,p)};
export const watch=(p,f)=>{try{return onValue(R(p),x=>f(x.val()),()=>f(null))}catch(e){return()=>{}}};
export const put=(p,v)=>{try{return set(R(p),v).catch(fail)}catch(e){return Promise.resolve()}};
export const add=(p,v)=>{try{const r=push(R(p),v);r.catch(fail);return r}catch(e){return Promise.resolve()}};
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

export const tx=(p,fn)=>{try{return runTransaction(R(p),fn).then(r=>({ok:r.committed,v:r.snapshot.val()})).catch(e=>{fail(e);return{ok:false,v:null,err:1}})}catch(e){return Promise.resolve({ok:false,v:null,err:1})}};

export const watchTop=(p,n,f)=>{try{return onValue(query(R(p),orderByChild("w"),limitToLast(n)),x=>f(x.val()),()=>f(null))}catch(e){return()=>{}}};
