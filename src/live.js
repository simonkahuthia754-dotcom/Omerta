import {initializeApp} from "firebase/app";
import {initializeAuth,indexedDBLocalPersistence,browserLocalPersistence,signInAnonymously} from "firebase/auth";
import {getDatabase,ref,push,set,onValue,onChildAdded,query,orderByChild,limitToLast,runTransaction} from "firebase/database";

import {firebaseConfig as cfg,configured} from "./firebase-config.js";
export {configured};
let lastErr="";const errs=new Set();export const lastError=()=>lastErr||sbError();export const onError=f=>{errs.add(f);const u=sbOnError(f);return()=>{errs.delete(f);u()}};
const fail=e=>{const c=e&&e.code;lastErr=c==="PERMISSION_DENIED"?"The database refused that. Its rules need to be published.":/auth/.test(c||"")?"Could not sign in to the shared world. Turn on Anonymous sign-in in Firebase.":c==="slow"?"Slow down a little.":"A message could not be sent.";errs.forEach(f=>f(lastErr));};
const app=initializeApp(cfg);
export const rtdb=getDatabase(app);
const auth=configured?initializeAuth(app,{persistence:[indexedDBLocalPersistence,browserLocalPersistence]}):null;
export const ready=configured?signInAnonymously(auth).then(()=>1,e=>{fail(e);return 0}):Promise.resolve(1);
const uid=()=>(auth&&auth.currentUser&&auth.currentUser.uid)||"";
const own=(p,v)=>v&&typeof v==="object"&&/^omerta_(rank|online)\//.test(p)?{...v,u:uid()}:v;
import {limiter} from "./guard.js";
import {sbReady,sbSession,sbWatch,sbPut,sbAdd,handles,sbError,sbOnError} from "./sb.js";
export const chatReady=sbReady||configured;
export {sbReady};
const LIM={omerta_chat:limiter(5,8000),omerta_dm:limiter(5,8000),omerta_news:limiter(12,20000),omerta_credit:limiter(20,20000)},LIMP=limiter(40,10000);
export {ref,onChildAdded,query,orderByChild,limitToLast};
import {key,setClock} from "./clean.js";
export const R=p=>{const s=String(p).split("/");if(!(p===".info/connected"||p===".info/serverTimeOffset"||s.every(x=>key(x))))throw new Error("bad path");return ref(rtdb,p)};
export const watch=(p,f)=>{
  if(sbReady&&p===".info/connected"&&!configured){let d=0;sbSession.then(x=>{if(!d)f(!!x)});return()=>{d=1}}
  if(handles(p))return sbWatch(p,f);
 let off=()=>{},dead=false;try{R(p)}catch(e){return()=>{}}
  ready.then(()=>{if(dead)return;try{off=onValue(R(p),x=>f(x.val()),()=>f(null))}catch(e){f(null)}});return()=>{dead=true;off()}};
export const put=(p,v)=>{if(handles(p)){if(!LIMP())return fail({code:"slow"}),Promise.resolve();return sbPut(p,v)}
  try{const r=R(p);if(!LIMP())return fail({code:"slow"}),Promise.resolve();return ready.then(()=>set(r,own(p,v))).catch(fail)}catch(e){return Promise.resolve()}};
export const add=(p,v)=>{if(handles(p)){const l=LIM[String(p).split("/")[0]];if(l&&!l())return fail({code:"slow"}),Promise.resolve();return sbAdd(p,v)}
  try{const r=R(p),l=LIM[String(p).split("/")[0]];if(l&&!l())return fail({code:"slow"}),Promise.resolve();return ready.then(()=>push(r,v)).catch(fail)}catch(e){return Promise.resolve()}};
// Clocks on phones drift, so timestamps use the database server's time.
let off=0;export const serverNow=()=>Date.now()+off;setClock(serverNow);
try{onValue(R(".info/serverTimeOffset"),x=>{off=+x.val()||0})}catch(e){}
export const pairKey=(a,b)=>[a,b].sort().join("_");
export {text as clip} from "./clean.js";
export const ago=t=>{const m=Math.max(0,Math.round((serverNow()-t)/6e4));return m<1?"now":m<60?m+"m":m<1440?Math.round(m/60)+"h":Math.round(m/1440)+"d"};
export const staffOf=(apps,votes)=>Object.entries(apps||{}).map(([id,a])=>({id,...a,v:Object.keys((votes||{})[id]||{}).length}))
  .sort((a,b)=>b.v-a.v||a.t-b.t);
export const seats=list=>list.filter(c=>c.v>0).slice(0,5);

export const tx=(p,fn)=>{try{const r0=R(p);return ready.then(()=>runTransaction(r0,fn)).then(r=>({ok:r.committed,v:r.snapshot.val()})).catch(e=>{fail(e);return{ok:false,v:null,err:1}})}catch(e){return Promise.resolve({ok:false,v:null,err:1})}};

export const watchTop=(p,n,f)=>{let off=()=>{},dead=false;try{R(p)}catch(e){return()=>{}}
  ready.then(()=>{if(dead)return;try{off=onValue(query(R(p),orderByChild("w"),limitToLast(n)),x=>f(x.val()),()=>f(null))}catch(e){f(null)}});return()=>{dead=true;off()}};
