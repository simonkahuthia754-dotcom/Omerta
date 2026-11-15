const store={};globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}};
const g=await import("../src/game.js"),G=await import("../src/guard.js");
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?"ok  ":"FAIL",m)};process.on("exit",()=>{if(bad)process.exitCode=1});
// PIN
const h=await G.makePin("4821");ok(h.startsWith("v2$")&&!h.includes("4821"),"PIN is stored hashed");
ok(await G.checkPin("4821",h)&&!(await G.checkPin("4822",h)),"hash verifies right and wrong");
ok((await G.makePin("4821"))!==h,"salted, same PIN hashes differently");
ok(await G.checkPin("1234","1234")&&G.legacy("1234"),"legacy PIN still works for upgrade");
ok(!(await G.checkPin("12","v2$zz$zz"))&&!(await G.checkPin("1234","v2$00$00")),"garbage rejected");
for(let i=0;i<4;i++)G.wrong(1000);ok(G.lockLeft(1000)===0,"4 wrong tries no lock");G.wrong(1000);ok(G.lockLeft(1000)===3e4,"5th wrong try locks 30s");
G.wrong(40000);ok(G.lockLeft(40000)===6e4,"next lock doubles");G.right();ok(G.lockLeft(2000)===0,"right PIN clears lock");
const L=G.limiter(3,1000);ok(L(0)&&L(1)&&L(2)&&!L(3)&&L(1500),"rate limiter blocks the 4th in a window");
// save sanitising
store[g.KEY]=JSON.stringify({v:3,cash:"lots",dirty:-5,lv:-3,heat:9999,biz:{fake:{l:5},corner:{l:"x"},pawn:{l:3}},inv:{nine:2,nope:1},eco:{zzz:4},bk:null,bi:[{id:"bond",a:-1,t:1,e:2}],log:[1,{x:"ok"}]});
const l=g.load();ok(typeof l.cash==="number"&&Number.isFinite(l.cash)&&l.dirty===0&&l.lv===1&&l.heat===100,"bad numbers repaired");
ok(Object.keys(l.biz).join()==="pawn"&&Object.keys(l.inv).join()==="nine"&&!Object.keys(l.eco).length&&!l.bi.length&&l.log.length===1,"unknown ids and junk rows dropped");
store[g.KEY]='{"v":3,"__proto__":{"polluted":1},"constructor":{"prototype":{"p2":1}}}';g.load();ok(({}).polluted===undefined&&({}).p2===undefined,"prototype pollution blocked");
store[g.KEY]="not json{";ok(g.load().v===3,"corrupt save starts fresh");
// reducer guards
const T0=Date.UTC(2026,0,1,6);let s=g.fresh(T0);const R=a=>{s=g.reduce(s,{...a,now:T0})};
const c0=s.cash;for(const id of ["constructor","__proto__","toString","a/b","x".repeat(60),42])R({t:"buy",id});ok(s.cash===c0,"inherited or malformed ids ignored");
R({t:"deposit",amt:-500});R({t:"deposit",amt:NaN});R({t:"deposit",amt:Infinity});ok(s.bk===0&&s.cash===c0,"negative / NaN / Infinity amounts ignored");
R({t:"launder",amt:"1e9"});ok(s.cash===c0,"string amounts ignored");
const r=g.reduce(s,null);ok(r===s,"null action ignored");
