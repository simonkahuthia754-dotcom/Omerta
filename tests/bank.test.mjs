const store={};globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}};
const g=await import("../src/game.js");
let bad=0;const ok=(c,m)=>{if(!c)bad++;console.log(c?"ok  ":"FAIL",m)};process.on("exit",()=>{if(bad)process.exitCode=1});
const T0=Date.UTC(2026,0,1,6);let s=g.fresh(T0);const R=(a,now=T0)=>{s=g.reduce(s,{...a,now})};
s.cash=100000;s.dirty=5000;R({t:"tick"});
ok(s.bk===0&&Array.isArray(s.bi),"fresh has bank fields");
R({t:"deposit",amt:40000});ok(s.cash===60000&&s.bk===40000,"deposit 40k");
R({t:"deposit",amt:9e9});ok(s.cash===0&&s.bk===100000,"deposit caps at cash");
R({t:"deposit"});ok(s.bk===100000,"empty deposit refused");
R({t:"withdraw",amt:30000});ok(s.cash===30000&&s.bk===70000,"withdraw 30k");
R({t:"withdraw",amt:9e9});ok(s.cash===100000&&s.bk===0,"withdraw caps at vault");
R({t:"withdraw"});ok(s.cash===100000,"empty withdraw refused");
s.dirty=0;R({t:"deposit",amt:100000});const d0=s.dirty;
R({t:"tick"},T0+36e5);ok(Math.abs(s.bk-100000*(1+g.BANK_RATE))<1,"interest one hour "+s.bk);
// raids cannot touch the vault
s.heat=95;const bk=s.bk;R({t:"tick"},T0+36e5+1000);ok(s.bk>=bk,"raid leaves vault alone");
// worth includes bank
ok(g.worth(s).bank>=100000&&g.worth(s).total>=g.worth(s).bank,"worth counts bank");
// invest
s.bk=500000;s.t=T0;let n=T0+1000;
R({t:"invest",id:"bond",amt:500},n);ok(s.bi.length===0,"below minimum refused");
R({t:"invest",id:"bond",amt:100000},n);ok(s.bi.length===1&&s.bk===400000,"bond placed");
const x=s.bi[0];R({t:"investCollect",id:"bond",t0:x.t},n+1000);ok(s.bi.length===1,"early collect refused");
R({t:"investCollect",id:"bond",t0:x.t},n+36e5+1);ok(s.bi.length===0&&Math.round(s.bk)===400000+103000,"bond paid 3% "+s.bk);
// risky plan loses/wins both possible
let w=0,l=0;for(let i=0;i<300;i++){s.bk=100000;s.bi=[];R({t:"invest",id:"offshore",amt:100000},n);const y=s.bi[0];R({t:"investCollect",id:"offshore",t0:y.t},n+25*36e5);if(s.bk>100000)w++;else l++}
ok(w>200&&l>5,"offshore mostly wins sometimes loses "+w+"/"+l);
s.bk=1e7;s.bi=[];for(let i=0;i<10;i++)R({t:"invest",id:"fund",amt:20000},n+i);ok(s.bi.length===8,"max 8 investments");
// old save migration
const old=g.fresh(T0);delete old.bk;delete old.bi;store[g.KEY]=JSON.stringify(old);const m=g.load();ok(m.bk===0&&Array.isArray(m.bi),"old save migrates");
ok(["corner","laundromat","restaurant","warehouse"].every(k=>g.BIZ_IMG[k]),"business photos mapped (pawn shop photo removed on purpose)");
ok(new Set(Object.values(g.BIZ_IMG).concat(g.BANK_IMG)).size===Object.values(g.BIZ_IMG).length+1,"no photo used twice");
