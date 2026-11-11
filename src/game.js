// Omertà game rules. Pure state in, state out. UI lives in App.jsx / screens.jsx.
export const KEY="omerta_save_v2", H=36e5, TICK=2500, CAP=8;
const rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[ri(0,a.length-1)];
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v)};
export const $=n=>{const a=Math.abs(n);return(n<0?"-":"")+"$"+(a>=1e7?(a/1e6).toFixed(1)+"M":a>=1e6?(a/1e6).toFixed(2)+"M":Math.round(a).toLocaleString("en-US"))};

export const BIZ=[
  {id:"laundromat",n:"Sunrise Laundromat",d:"Clean sheets, cleaner books.",cost:180000,inc:9000,heat:1},
  {id:"restaurant",n:"Da Nonna's",d:"Best veal in town. Every table has an ear.",cost:420000,inc:19000,heat:1},
  {id:"nightclub",n:"The Velvet Room",d:"Rope line. No names.",cost:900000,inc:41000,heat:3},
  {id:"warehouse",n:"Pier 14 Warehouse",d:"Crates come in. Crates go out.",cost:1500000,inc:70000,heat:6},
  {id:"casino",n:"Golden Ace Casino",d:"The house always eats.",cost:3200000,inc:150000,heat:5},
  {id:"bank",n:"Fidelity Savings",d:"A small bank with big friends.",cost:6500000,inc:300000,heat:4},
];
export const FX=[
  {id:"EURUSD",n:"EUR/USD",b:1.085,v:.0006,d:4},{id:"GBPUSD",n:"GBP/USD",b:1.27,v:.0008,d:4},
  {id:"USDJPY",n:"USD/JPY",b:151.2,v:.11,d:2},{id:"USDKES",n:"USD/KES",b:129.3,v:.07,d:2},{id:"XAUUSD",n:"Gold",b:2650,v:2.2,d:2},
];
export const STORE=[{n:"Garage",slots:16,cost:0},{n:"Pier locker",slots:36,cost:600000},{n:"Bunker vault",slots:80,cost:2400000},{n:"Mountain vault",slots:160,cost:8000000}];
// k = shelf, s = storage slots, pre = status, g = how much it melts a heart
export const ITEMS=[
  {id:"chip",n:"Casino chip",p:500,s:1,pre:1,k:"Pockets",i:"chip",t:"Opens doors on the strip."},
  {id:"watch",n:"Gold watch",p:3500,s:1,pre:4,g:8,k:"Pockets",i:"watch",t:"Always five minutes early."},
  {id:"suit",n:"Tailored suit",p:6000,s:1,pre:4,g:6,k:"Pockets",i:"suit",t:"Cut by a man who has never needed a tape measure."},
  {id:"cigars",n:"Cuban cigars",p:1200,s:1,pre:2,g:5,k:"Pockets",i:"cigar",t:"A box of twenty. Don't ask."},
  {id:"whiskey",n:"Single malt",p:800,s:1,pre:1,g:4,k:"Cellar",i:"glass",t:"Twenty-one years in the barrel."},
  {id:"pistol",n:"Gold pistol",p:2500,s:1,pre:3,k:"Cellar",i:"pistol",t:"For show. Mostly."},
  {id:"case",n:"Briefcase",p:10000,s:1,pre:3,k:"Cellar",i:"case",t:"Nobody asks what's inside."},
  {id:"rose",n:"Roses",p:300,s:1,pre:0,g:3,k:"For them",i:"rose",t:"A dozen, red, from the good florist."},
  {id:"bag",n:"Designer handbag",p:9000,s:1,pre:3,g:10,k:"For them",i:"bag",t:"Comes in its own dust bag. Has its own dust bag."},
  {id:"necklace",n:"Diamond necklace",p:45000,s:1,pre:8,g:18,k:"For them",i:"ring",t:"You will be thanked for months."},
  {id:"ring",n:"Engagement ring",p:120000,s:1,pre:10,g:0,k:"For them",i:"ring",t:"Save it for the right night."},
  {id:"car",n:"Sports car",p:50000,s:3,pre:10,k:"Wheels",i:"car",t:"Fast, and very easy to spot."},
  {id:"limo",n:"Armored limo",p:250000,s:4,pre:25,k:"Wheels",i:"car",t:"Windows that stop more than sunlight."},
  {id:"penthouse",n:"Penthouse, Upper Hill",p:2200000,s:0,pre:60,est:1,k:"Property",i:"home",t:"Forty floors up. The cops can't see in."},
  {id:"villa",n:"Villa on the coast",p:6500000,s:0,pre:120,est:1,k:"Property",i:"home",t:"Private beach, private dock, private everything."},
  {id:"yacht",n:"Yacht, 40 meters",p:9000000,s:0,pre:180,est:1,k:"Property",i:"boat",t:"Where the real conversations happen."},
];
export const SHELVES=["Pockets","Cellar","For them","Wheels","Property"];
export const MATES=[
  {id:"isa",n:"Isabella",t:"girlfriend",bio:"Sings at the Velvet Room. Knows every secret in the building."},
  {id:"amara",n:"Amara",t:"girlfriend",bio:"Runs a gallery on Kenyatta Avenue. Sells you paintings you don't understand."},
  {id:"marco",n:"Marco",t:"boyfriend",bio:"The tailor's son. Cuts a better suit than your accountant cuts a deal."},
  {id:"dante",n:"Dante",t:"boyfriend",bio:"Left the ring with all his teeth. Funny, calm, scary when he has to be."},
];
export const PARTIES=[
  {id:"dinner",n:"Rooftop dinner",cost:25000,heat:3,res:20,d:"Twelve seats, one long table, no cameras.",s:[
    "The senator's wife stayed until two and asked for the veal recipe. Her husband owes you a favor now.",
    "Somebody's uncle cried over the tiramisu. Three handshakes happened under the table.",
    "Quiet night. The best kind. Everyone left a little more loyal."]},
  {id:"casino",n:"High-roller night",cost:120000,heat:8,res:70,d:"Private tables at the Golden Ace. Bring your own luck.",s:[
    "A shipping heir lost forty grand at roulette and thanked you for the experience.",
    "Fistfight at the craps table. Your people were on the door. Nobody remembers anything.",
    "You won big on black, and didn't smile. That's how they knew you could afford to lose."]},
  {id:"gala",n:"Charity gala",cost:250000,heat:-6,res:100,d:"Tuxedos, string quartet, a nice check for the hospital.",s:[
    "The mayor gave a speech about you. You hadn't paid him that much.",
    "Photographers got your good side. The newspaper called you a philanthropist.",
    "A judge hugged you. A judge! You'll never see that again."]},
  {id:"yacht",n:"Yacht party",cost:500000,heat:15,res:200,d:"Forty meters of deck, a DJ from Berlin, nobody sober by midnight.",s:[
    "Somebody went off the top deck in a tuxedo. Everybody cheered. Coast guard waved, politely.",
    "You did business on the aft deck while the party roared. Not one word was repeated.",
    "Sunrise over the bay and a hundred strangers who'd take a bullet for you. Or at least a call."]},
];
export const DIST=[
  {id:"up",n:"Uptown",s:"Casino row",v:200,r:30,x:8,y:8,w:92,h:72},{id:"down",n:"Downtown",s:"Nightclub strip",v:175,r:40,x:106,y:8,w:96,h:50},
  {id:"dock",n:"Docks",s:"Warehouses",v:150,r:45,x:208,y:8,w:84,h:86},{id:"ital",n:"Little Italy",s:"Old families",v:125,r:35,x:8,y:86,w:70,h:76},
  {id:"mid",n:"Midtown",s:"Banks",v:225,r:60,x:84,y:86,w:118,h:76},{id:"china",n:"Chinatown",s:"Back rooms",v:150,r:40,x:208,y:100,w:84,h:62},
];
export const RIVALS=[
  {n:"Vincenzo Romano",f:"🇮🇹",c:"Italy",w:11200000,l:40},{n:"El Chapo Jr",f:"🇲🇽",c:"Mexico",w:9800000,l:38},
  {n:"Kazimir Volkov",f:"🇷🇺",c:"Russia",w:8700000,l:35},{n:"Tony Two-Fingers",f:"🇺🇸",c:"USA",w:6100000,l:31},
];
const idx=a=>Object.fromEntries(a.map(x=>[x.id,x]));
export const BM=idx(BIZ), IM=idx(ITEMS), FM=idx(FX), DM=idx(DIST), MM=idx(MATES);

export const eq=(o,p)=>o.st+o.st*o.lev*o.dir*(p-o.e)/o.e;
export const used=s=>Object.entries(s.inv).reduce((a,[k,q])=>a+IM[k].s*q,0);
export const cap=s=>STORE[s.store].slots;
export const prestige=s=>Object.entries(s.inv).reduce((a,[k,q])=>a+IM[k].pre*q,0)+Object.keys(s.est).reduce((a,k)=>a+IM[k].pre,0);
export const level=s=>1+Math.floor(s.res/100);
export const bonus=s=>1+(s.mate?s.mate.aff/1000+(s.mate.married?.05:0):0)+Math.min(s.friends,15)*.01;
export const power=s=>s.crew.sol+s.crew.cap*8;
export const odds=(s,d)=>{const n=DM[d].r+s.dist[d]/2,p=power(s);return Math.min(.9,Math.max(.1,p/(p+n)))};
export const heatReward=s=>50000+Math.round(s.heat)*9000;
export const till=(s,id,now)=>{const b=s.biz[id];return b?Math.floor(BM[id].inc*b.l*Math.min((now-b.s)/H,CAP)*bonus(s)):0};
export const tributeRate=s=>DIST.reduce((a,d)=>a+s.dist[d.id]*d.v,0);
export const tribute=(s,now)=>Math.floor(tributeRate(s)*Math.min((now-s.ts)/H,CAP));
export const worth=s=>{
  const b=Object.entries(s.biz).reduce((a,[k,v])=>a+BM[k].cost*v.l,0);
  const it=Object.entries(s.inv).reduce((a,[k,q])=>a+IM[k].p*q,0)+Object.keys(s.est).reduce((a,k)=>a+IM[k].p,0);
  const tr=s.pos.reduce((a,o)=>a+Math.max(0,eq(o,s.fx.p[o.pair])),0);
  return{cash:s.cash,biz:b,stash:it,trades:tr,total:s.cash+b+it+tr};
};
export const board=(s,now)=>{
  const hrs=(now-s.t0)/H,me={n:"You",me:1,f:"🇰🇪",c:"Kenya",w:worth(s).total,l:level(s)};
  return[...RIVALS.map(r=>({...r,w:Math.round(r.w*(1+.01*hrs))})),me].sort((a,b)=>b.w-a.w).map((x,i)=>({...x,r:i+1}));
};
export const mateLine=m=>{
  const n=MM[m.id].n,a=m.aff;
  if(a>=90)return`${n} says: "I'd follow you anywhere. Just not into the trunk."`;
  if(a>=70)return`${n} says: "You looked tired at dinner. I fixed it. Don't thank me."`;
  if(a>=45)return`${n} says: "I like this version of you. Keep him around."`;
  if(a>=20)return`${n} says: "You're always on the phone. I'm right here."`;
  return`${n} says: "I'm not going to ask twice."`;
};

const say=(s,x,a)=>{s.log.unshift({t:Date.now(),x,a});s.log.length=Math.min(s.log.length,40);s.toast={k:Math.random(),x}};
const walk=(s,f)=>{const dr=s.fx.dr[f.id]*.94+gauss()*f.v*.3,p=Math.max(f.b*.5,s.fx.p[f.id]+(f.b-s.fx.p[f.id])*.004+dr+f.v*gauss()*.8);return[p,dr]};
export const fresh=(now=Date.now())=>{
  const fx={p:{},dr:{},h:{}};
  FX.forEach(f=>{fx.p[f.id]=f.b;fx.dr[f.id]=0;fx.h[f.id]=[];for(let i=0;i<90;i++){const[p,dr]=walk({fx},f);fx.p[f.id]=p;fx.dr[f.id]=dr;fx.h[f.id].push(p)}});
  return{v:2,t:now,t0:now,fxT:now,ts:now,cash:5240000,res:4100,heat:22,friends:3,parties:0,store:0,
    biz:{laundromat:{l:3,s:now},nightclub:{l:2,s:now},warehouse:{l:1,s:now}},
    inv:{chip:3,whiskey:2,watch:1,case:1,car:1,suit:1},est:{},crew:{sol:12,cap:2},
    dist:{up:45,down:62,dock:80,ital:55,mid:20,china:30},mate:null,last:null,pos:[],trades:[],nw:[],pid:1,
    log:[{t:now,x:"The old man's keys are yours now. Don't lose them."}],fx};
};
export const load=()=>{try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.v===2)return j}catch(e){}return fresh()};

function fxStep(s){
  FX.forEach(f=>{const[p,dr]=walk(s,f),h=s.fx.h[f.id];s.fx.p[f.id]=p;s.fx.dr[f.id]=dr;h.push(p);if(h.length>90)h.shift()});
  s.pos=s.pos.filter(o=>{
    if(eq(o,s.fx.p[o.pair])>0)return true;
    s.trades.unshift({pair:o.pair,pnl:-o.st,t:Date.now()});s.trades.length=Math.min(s.trades.length,12);
    say(s,`${FM[o.pair].n} went against you and the position was wiped out. ${$(o.st)} gone.`,-o.st);return false;
  });
}
function tick(s,now){
  const dt=Math.max(0,now-s.t)/H;s.t=now;
  s.heat=Math.max(0,s.heat-dt*3);
  if(s.mate){s.mate.aff=Math.max(0,s.mate.aff-dt*.6);if(s.mate.aff<=0){say(s,`${MM[s.mate.id].n} left a note on the pillow. It was short.`);s.mate=null}}
  let n=Math.min(90,Math.floor((now-s.fxT)/TICK));if(n>0){s.fxT+=n*TICK;while(n--)fxStep(s)}
  if(s.heat>=90){const f=Math.round(s.cash*.06);s.cash-=f;s.heat=55;say(s,`Cops kicked in the door before dawn. Fine paid: ${$(f)}. Heat is back down to 55.`,-f)}
  const l=s.nw[s.nw.length-1];if(!l||now-l[0]>15000){s.nw.push([now,worth(s).total]);if(s.nw.length>120)s.nw.shift()}
}

export function reduce(st,a){
  const s=structuredClone(st),now=Date.now(),no=x=>{s.toast={k:Math.random(),x};return s},broke=()=>no("You're short on cash for that.");
  switch(a.t){
  case"tick":tick(s,a.now);return s;
  case"collect":{
    let tot=0,heat=0;
    (a.id==="all"?Object.keys(s.biz):[a.id]).forEach(id=>{const b=s.biz[id];if(!b)return;const h=Math.min((now-b.s)/H,CAP);tot+=till(s,id,now);heat+=BM[id].heat*b.l*h*.2;b.s=now});
    if(tot<=0)return no("Nothing in the tills yet. Give them time.");
    s.cash+=tot;s.heat=Math.min(100,s.heat+heat);s.res+=Math.round(tot/20000);
    say(s,`Collected ${$(tot)} from ${a.id==="all"?"every till":BM[a.id].n}.`,tot);return s}
  case"buyBiz":{const B=BM[a.id];if(s.biz[a.id])return s;if(s.cash<B.cost)return broke();
    s.cash-=B.cost;s.biz[a.id]={l:1,s:now};s.res+=40;say(s,`You bought ${B.n}. The old owner shook your hand and didn't look back.`,-B.cost);return s}
  case"upBiz":{const B=BM[a.id],b=s.biz[a.id],c=Math.round(B.cost*.5*b.l);if(b.l>=10)return no("It can't get any bigger.");if(s.cash<c)return broke();
    s.cash-=c;b.l++;s.res+=15;say(s,`${B.n} got a renovation. Level ${b.l}.`,-c);return s}
  case"buy":{const it=IM[a.id];
    if(it.est&&s.est[it.id])return no("That one's already yours.");
    if(!it.est&&used(s)+it.s>cap(s))return no("No room. Upgrade your storage or sell something.");
    if(s.cash<it.p)return broke();
    s.cash-=it.p;if(it.est)s.est[it.id]=1;else s.inv[it.id]=(s.inv[it.id]||0)+1;
    s.res+=Math.round(it.pre);say(s,`Bought: ${it.n}.`,-it.p);return s}
  case"sell":{const it=IM[a.id],v=Math.round(it.p*.7);
    if(it.est){if(!s.est[it.id])return s;delete s.est[it.id]}else{if(!s.inv[it.id])return s;if(--s.inv[it.id]<=0)delete s.inv[it.id]}
    s.cash+=v;say(s,`Sold ${it.n} for ${$(v)}. A fence takes his cut.`,v);return s}
  case"upStore":{const nx=STORE[s.store+1];if(!nx)return no("That's the biggest vault there is.");if(s.cash<nx.cost)return broke();
    s.cash-=nx.cost;s.store++;say(s,`Moved everything into the ${nx.n}. Room for ${nx.slots}.`,-nx.cost);return s}
  case"pickMate":{const m=MM[a.id];s.mate={id:m.id,aff:40,married:false,since:now};say(s,`You asked ${m.n} to dinner. ${m.n} said yes before you finished the sentence.`);return s}
  case"date":{const m=s.mate;if(!m)return s;const D=a.k==="trip"?{c:60000,g:16,x:`A weekend in Mombasa. ${MM[m.id].n} didn't check a phone once.`}:{c:4000,g:6,x:`Dinner for two. ${MM[m.id].n} ordered the most expensive thing and meant it.`};
    if(s.cash<D.c)return broke();s.cash-=D.c;m.aff=Math.min(100,m.aff+D.g);s.res+=5;say(s,D.x,-D.c);return s}
  case"gift":{const m=s.mate,it=IM[a.id];if(!m||!s.inv[a.id])return s;
    if(--s.inv[a.id]<=0)delete s.inv[a.id];m.aff=Math.min(100,m.aff+it.g);say(s,`You gave ${MM[m.id].n} the ${it.n.toLowerCase()}. ${MM[m.id].n} looked at it for a long time, then at you.`);return s}
  case"propose":{const m=s.mate;if(!m||m.married)return s;if(m.aff<80)return no("Not yet. Give it time.");if(!s.inv.ring)return no("You can't ask without a ring.");
    if(--s.inv.ring<=0)delete s.inv.ring;m.married=true;m.aff=100;s.res+=300;say(s,`${MM[m.id].n} said yes. The whole family cried, even the ones who don't cry.`);return s}
  case"party":{const P=PARTIES.find(x=>x.id===a.id);if(s.cash<P.cost)return broke();
    s.cash-=P.cost;s.heat=Math.max(0,Math.min(100,s.heat+P.heat));s.parties++;
    const r=Math.round(P.res*(1+prestige(s)/500));s.res+=r;
    let x=pick(P.s),tip=0;
    if(Math.random()<.4)s.friends++;
    if(Math.random()<.25){tip=Math.round(P.cost*rnd(.2,.6));s.cash+=tip;x+=` A guest slipped you a tip worth ${$(tip)}.`}
    if(Math.random()<.15){s.heat=Math.min(100,s.heat+10);x+=" A patrol car idled outside for an hour."}
    if(s.mate){s.mate.aff=Math.min(100,s.mate.aff+5);x+=` ${MM[s.mate.id].n} worked the room.`}
    s.last={n:P.n,x,r};say(s,`${P.n}: ${$(P.cost)} spent, +${r} respect.`,-P.cost+tip);return s}
  case"recruit":{const C=a.k==="cap"?{c:150000,n:"capo"}:{c:20000,n:"soldier"};if(s.cash<C.c)return broke();
    s.cash-=C.c;s.crew[a.k]++;say(s,`A new ${C.n} kissed your ring and started Monday.`,-C.c);return s}
  case"push":{const D=DM[a.id];if(s.cash<40000)return broke();if(s.dist[a.id]>=100)return no("You own every corner already.");
    const p=odds(s,a.id);s.cash-=40000;
    if(Math.random()<p){const g=ri(6,12);s.dist[a.id]=Math.min(100,s.dist[a.id]+g);s.res+=30;say(s,`${D.n}: your crew leaned on the right shopkeepers. +${g}% of the neighborhood.`,-40000)}
    else{const l=Math.min(s.crew.sol,ri(1,3));s.crew.sol-=l;s.heat=Math.min(100,s.heat+8);s.dist[a.id]=Math.max(0,s.dist[a.id]-3);say(s,`${D.n}: it went wrong. ${l} soldier${l===1?"":"s"} didn't come back. Heat is up.`,-40000)}
    return s}
  case"tribute":{const x=tribute(s,now);if(x<=0)return no("No tribute yet. The streets pay slowly.");s.cash+=x;s.ts=now;say(s,`The neighborhoods paid up: ${$(x)}.`,x);return s}
  case"lay":{if(s.cash<30000)return broke();s.cash-=30000;s.heat=Math.max(0,s.heat-15);say(s,"You lay low for a few days. A lawyer was paid, and a file went missing.",-30000);return s}
  case"open":{if(s.pos.length>=6)return no("Six open trades is plenty. Close one.");if(s.cash<a.st)return broke();
    s.cash-=a.st;s.pos.push({id:s.pid++,pair:a.pair,dir:a.dir,st:a.st,lev:a.lev,e:s.fx.p[a.pair],t:now});
    say(s,`${a.dir>0?"Bought":"Sold"} ${FM[a.pair].n} with ${$(a.st)} at ${a.lev}x.`);return s}
  case"close":{const i=s.pos.findIndex(o=>o.id===a.id);if(i<0)return s;const o=s.pos[i],v=Math.max(0,eq(o,s.fx.p[o.pair])),pl=v-o.st;
    s.pos.splice(i,1);s.cash+=v;s.trades.unshift({pair:o.pair,pnl:pl,t:now});s.trades.length=Math.min(s.trades.length,12);
    if(pl>0)s.res+=Math.round(pl/50000);say(s,`Closed ${FM[o.pair].n}: ${pl>=0?"made":"lost"} ${$(Math.abs(pl))}.`,pl);return s}
  }
  return s;
}
