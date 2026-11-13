let now=()=>Date.now();export const setClock=f=>{now=f};
// Everything that comes out of the shared database is untrusted. Anyone can write to it, so nothing is used until it has been rebuilt here
// from known keys, with known types and sane limits. Outgoing text goes through the same text cleaner.
const ID=/^OM-[A-Z0-9]{4}$/,KEY=/^[-_A-Za-z0-9]{1,48}$/,NAME=/^[A-Za-z0-9_]{3,16}$/,FLAG=/^[\u{1F1E6}-\u{1F1FF}]{2}$/u;
// control characters, zero-width and bidi-override characters (used to disguise or reverse text), and the Unicode "tag" block
const BAD=/[\u0000-\u0008\u000B-\u001F\u007F-\u009F­؜᠎​-‏‪-‮⁠-⁯﻿￹-￼]|[\u{E0000}-\u{E007F}]/gu;
export const text=(v,max=300)=>typeof v!=="string"?"":v.normalize("NFC").replace(BAD,"").replace(/\s+/g," ").trim().slice(0,max);
export const id=v=>typeof v==="string"&&ID.test(v)?v:"";
export const key=v=>typeof v==="string"&&KEY.test(v)&&v!=="__proto__"&&v!=="constructor"&&v!=="prototype"?v:"";
export const name=v=>typeof v==="string"&&NAME.test(v)?v:"";
export const flag=v=>typeof v==="string"&&FLAG.test(v)?v:"";
// Timestamps must be real and not from the future, so nobody can pin a post to the top of every list.
export const stamp=v=>typeof v==="number"&&isFinite(v)&&v>1.6e12&&v<=now()+3e5?Math.round(v):0;
const rows=(o,n=120)=>o&&typeof o==="object"&&!Array.isArray(o)?Object.entries(o).filter(([k])=>key(k)).slice(-n):[];
export const chatMsg=(v)=>{if(!v||typeof v!=="object")return null;const t=text(v.text,300),u=name(v.username),ts=stamp(v.timestamp);if(!t||!u||!ts)return null;return{username:u,uid:id(v.uid),flag:flag(v.flag),text:t,timestamp:ts}};
export const dmMsg=(v)=>{if(!v||typeof v!=="object")return null;const t=text(v.text,300),f=id(v.from),ts=stamp(v.t);if(!t||!f||!ts)return null;return{from:f,text:t,t:ts}};
export const inboxRow=(v)=>{if(!v||typeof v!=="object")return null;const ts=stamp(v.t);if(!ts)return null;return{name:name(v.name),text:text(v.text,120),t:ts,u:v.u===1?1:0}};
export const dmList=o=>rows(o).map(([k,v])=>{const m=dmMsg(v);return m&&{k,...m}}).filter(Boolean);
export const inbox=o=>Object.fromEntries(rows(o,60).filter(([k])=>id(k)).map(([k,v])=>[k,inboxRow(v)]).filter(x=>x[1]));
export const online=o=>rows(o,400).filter(([k,v])=>id(k)&&v&&stamp(v.t)>now()-9e4&&name(v.n)).map(([k,v])=>({id:k,n:v.n}));
export const typing=(o,me)=>rows(o,40).filter(([k,v])=>id(k)&&k!==me&&v&&stamp(v.t)>now()-5e3&&name(v.n)).map(([k,v])=>v.n);
export const post=(v)=>{if(!v||typeof v!=="object")return null;const t=text(v.title,80),b=text(v.body,700),u=id(v.uid),n=name(v.name),ts=stamp(v.t);if(t.length<4||b.length<20||!u||!n||!ts)return null;return{uid:u,name:n,title:t,body:b,t:ts}};
export const paper=(d)=>{d=d&&typeof d==="object"?d:{};
  const apps=Object.fromEntries(rows(d.apps,60).filter(([k])=>id(k)).map(([k,v])=>{const n=name(v&&v.name),p=text(v&&v.pitch,140),ts=stamp(v&&v.t);return[k,n&&p&&ts?{name:n,pitch:p,t:ts}:null]}).filter(x=>x[1]));
  // a vote counts only from a well-formed player id, for an applicant who exists, and only as exactly 1
  const votes={};rows(d.votes,60).forEach(([c,vs])=>{if(!apps[c])return;votes[c]={};rows(vs,400).forEach(([voter,x])=>{if(id(voter)&&voter!==c&&x===1)votes[c][voter]=1})});
  const posts=Object.fromEntries(rows(d.posts,60).map(([k,v])=>[k,post(v)]).filter(x=>x[1]));
  const likes={};rows(d.likes,60).forEach(([p,vs])=>{if(!posts[p])return;likes[p]={};rows(vs,400).forEach(([voter,x])=>{if(id(voter)&&x===1)likes[p][voter]=1})});
  return{apps,votes,posts,likes}};
