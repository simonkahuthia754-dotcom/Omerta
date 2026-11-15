// Defensive helpers: salted PIN hashing, brute-force lockout, and a sliding-window rate limiter.
const LS="omerta_pinlock";
const rd=()=>{try{return JSON.parse(localStorage.getItem(LS))||{}}catch(e){return{}}};
const wr=v=>{try{localStorage.setItem(LS,JSON.stringify(v))}catch(e){}};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
const unhex=h=>new Uint8Array((h.match(/../g)||[]).map(x=>parseInt(x,16)));
const sub=()=>typeof crypto!=="undefined"&&crypto.subtle&&crypto.getRandomValues?crypto.subtle:null;
const derive=async(pin,salt)=>{const k=await sub().importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveBits"]);
  return new Uint8Array(await sub().deriveBits({name:"PBKDF2",hash:"SHA-256",salt,iterations:150000},k,256))};
const same=(a,b)=>{if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a[i]^b[i];return d===0};
export const legacy=s=>typeof s==="string"&&/^\d{4}$/.test(s);
export async function makePin(pin){if(!sub())return pin;const salt=crypto.getRandomValues(new Uint8Array(16));return"v2$"+hex(salt)+"$"+hex(await derive(pin,salt))}
export async function checkPin(pin,stored){
  if(typeof stored!=="string"||!/^\d{4}$/.test(pin))return false;
  if(legacy(stored))return pin===stored;
  const p=stored.split("$");if(p.length!==3||p[0]!=="v2"||!sub())return false;
  try{return same(await derive(pin,unhex(p[1])),unhex(p[2]))}catch(e){return false}}
// Five wrong tries lock the PIN pad for 30 seconds, then the wait doubles each time, up to an hour.
export const lockLeft=(now=Date.now())=>Math.max(0,(+rd().until||0)-now);
export const wrong=(now=Date.now())=>{const n=(+rd().n||0)+1;wr({n,until:n>=5?now+Math.min(36e5,3e4*Math.pow(2,n-5)):0})};
export const right=()=>wr({n:0,until:0});
// limiter(5,8000): at most 5 events in any 8 seconds.
export const limiter=(max,win)=>{let t=[];return(now=Date.now())=>{t=t.filter(x=>now-x<win);if(t.length>=max)return false;t.push(now);return true}};
