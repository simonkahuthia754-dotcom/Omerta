import {EM as EI,LM,ecoIncome,ecoValue,landIncome,takeoverPrice} from "./economy.js";
// Omertà rules. The UI never edits state directly; everything goes through reduce().
export const OMC_BASE=73446,OMC_FEE=.005,OMC_CAP=21e6;
export const KEY="omerta_save_v3", H=36e5, MIN=6e4, TICK=2500, REGEN=3*MIN, XPK=55, XPE=1.9;
let NOW=0; const clock=()=>NOW||Date.now();
const rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[ri(0,a.length-1)];
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(6.2832*v)};
export const $=n=>{const a=Math.abs(n);return(n<0?"-":"")+"$"+(a>=1e18?(a/1e18).toFixed(2)+"Qi":a>=1e15?(a/1e15).toFixed(2)+"Qa":a>=1e12?(a/1e12).toFixed(2)+"T":a>=1e9?(a/1e9).toFixed(2)+"B":a>=1e7?(a/1e6).toFixed(1)+"M":a>=1e6?(a/1e6).toFixed(2)+"M":Math.round(a).toLocaleString("en-US"))};
export const hm=ms=>{const m=Math.ceil(ms/MIN);return m>=60?Math.floor(m/60)+"h "+(m%60)+"m":m+"m"};

// ---- data ----
export const BIZ_IMG={casino:"casino.jpg"};
export const BIZ=[
  {id:"corner",n:"Corner shop",d:"Lottery tickets, cigarettes, and a back door.",lvl:1,cost:12000,inc:600,heat:.5},
  {id:"pawn",n:"Gold & Pawn",d:"People bring in what they can't keep. You pay what you like.",lvl:3,cost:45000,inc:2200,heat:1},
  {id:"laundromat",n:"Sunrise Laundromat",d:"Clean sheets, cleaner books.",lvl:5,cost:180000,inc:9000,heat:1},
  {id:"restaurant",n:"Da Nonna's",d:"Best veal in town. Every table has an ear.",lvl:9,cost:420000,inc:19000,heat:1},
  {id:"nightclub",n:"The Velvet Room",d:"Rope line. No names.",lvl:14,cost:900000,inc:41000,heat:3},
  {id:"warehouse",n:"Pier 14 Warehouse",d:"Crates come in. Crates go out.",lvl:18,cost:1500000,inc:70000,heat:6},
  {id:"casino",n:"Golden Ace Casino",d:"The house always eats.",lvl:24,cost:3200000,inc:150000,heat:5},
  {id:"hotel",n:"Hotel Meridian",d:"Forty floors of people who'd rather not be found.",lvl:32,cost:9000000,inc:400000,heat:4},
  {id:"bank",n:"Fidelity Savings",d:"A small bank with big friends.",lvl:40,cost:18000000,inc:780000,heat:4},
  {id:"shipping",n:"Meridian Lines",d:"Forty ships. Nobody opens the containers.",lvl:48,cost:45000000,inc:1800000,heat:6},
];
export const FX=[
  {id:"EURUSD",n:"EUR/USD",b:1.085,v:.0006,d:4},{id:"GBPUSD",n:"GBP/USD",b:1.27,v:.0008,d:4},
  {id:"USDJPY",n:"USD/JPY",b:151.2,v:.11,d:2},{id:"USDKES",n:"USD/KES",b:129.3,v:.07,d:2},{id:"XAUUSD",n:"Gold",b:2650,v:2.2,d:2},
];
export const STORE=[{n:"Garage",slots:16,cost:0},{n:"Pier locker",slots:36,cost:600000},{n:"Bunker vault",slots:80,cost:2400000},{n:"Mountain vault",slots:160,cost:8000000}];
export const ITEMS=[
  {id:"chip",n:"Casino chip",p:500,s:1,pre:1,lvl:1,k:"Pockets",i:"chip",t:"Opens doors on the strip."},
  {id:"whiskey",n:"Single malt",p:800,s:1,pre:1,g:4,lvl:1,k:"Cellar",i:"glass",t:"Twenty-one years in the barrel."},
  {id:"rose",n:"Roses",p:300,s:1,pre:0,g:3,lvl:1,k:"For them",i:"rose",t:"A dozen, red, from the good florist."},
  {id:"watch",n:"Gold watch",p:3500,s:1,pre:4,g:8,lvl:3,k:"Pockets",i:"watch",t:"Always five minutes early."},
  {id:"cigars",n:"Cuban cigars",p:1200,s:1,pre:2,g:5,lvl:4,k:"Pockets",i:"cigar",t:"A box of twenty. Don't ask."},
  {id:"suit",n:"Tailored suit",p:6000,s:1,pre:4,g:6,lvl:5,k:"Pockets",i:"suit",t:"Cut by a man who has never needed a tape measure."},
  {id:"blade",n:"Switchblade",p:400,s:1,pre:0,lvl:2,k:"Cellar",i:"dagger",w:1,t:"Quiet, cheap and older than you are."},
  {id:"revolver",n:"Snub revolver",p:1800,s:1,pre:1,lvl:4,k:"Cellar",i:"pistol",w:1,t:"Six rounds and no safety to forget."},
  {id:"pistol",img:"pistol.png",n:"Gold pistol",p:2500,s:1,pre:3,lvl:6,k:"Cellar",i:"pistol",w:1,t:"For show. Mostly."},
  {id:"lupara",n:"Lupara shotgun",p:7000,s:2,pre:3,lvl:9,k:"Cellar",i:"pistol",w:1,t:"Sawn-off, the old way. Family heirloom."},
  {id:"tommy",n:"Tommy gun",p:45000,s:2,pre:12,lvl:18,k:"Cellar",i:"pistol",w:1,t:"Drum magazine. Subtle it is not."},
  {id:"bag",n:"Designer handbag",p:9000,s:1,pre:3,g:10,lvl:8,k:"For them",i:"bag",t:"Comes in its own dust bag. Has its own dust bag."},
  {id:"case",n:"Briefcase",p:10000,s:1,pre:3,lvl:10,k:"Cellar",i:"case",t:"Nobody asks what's inside."},
  {id:"car",img:"car-sport.jpg",n:"Sports car",p:50000,s:3,pre:10,lvl:12,k:"Wheels",i:"car",t:"Fast, and very easy to spot."},
  {id:"necklace",n:"Diamond necklace",p:45000,s:1,pre:8,g:18,lvl:14,k:"For them",i:"ring",t:"You will be thanked for months."},
  {id:"ring",n:"Engagement ring",p:120000,s:1,pre:10,g:0,lvl:16,k:"For them",i:"ring",t:"Save it for the right night."},
  {id:"limo",img:"limo.jpg",n:"Armored limo",p:250000,s:4,pre:25,lvl:22,k:"Wheels",i:"car",t:"Windows that stop more than sunlight."},
  {id:"hyper",img:"car-hyper.jpg",n:"Hypercar",p:1800000,s:5,pre:90,lvl:34,k:"Wheels",i:"car",t:"Two seats, one exhaust note, no chance of staying quiet."},
  {id:"house",img:"house-family.jpg",n:"Family house, Runda",p:800000,s:0,pre:15,est:1,lvl:14,k:"Property",i:"home",t:"A pool, a gate, and neighbours who mind their business."},
  {id:"poolhouse",img:"house-pool.jpg",n:"Pool house, Karen",p:1400000,s:0,pre:30,est:1,lvl:20,k:"Property",i:"home",t:"White walls, a quiet pool, and a gate that closes behind you."},
  {id:"penthouse",img:"penthouse.jpg",n:"Penthouse, Upper Hill",p:2200000,s:0,pre:60,est:1,lvl:28,k:"Property",i:"home",t:"Forty floors up. The cops can't see in."},
  {id:"courtyard",img:"house-courtyard.jpg",n:"Courtyard house, Muthaiga",p:3400000,s:0,pre:80,est:1,lvl:32,k:"Property",i:"home",t:"Glass on every side, and somehow nobody can see in."},
  {id:"terraces",img:"tower-terraces.jpg",n:"Skyline terraces",p:4800000,s:0,pre:100,est:1,lvl:34,k:"Property",i:"home",t:"Six floors of balconies with a pool on the roof."},
  {id:"villa",img:"house-villa.jpg",n:"Villa on the coast",p:6500000,s:0,pre:120,est:1,lvl:36,k:"Property",i:"home",t:"Private beach, private dock, private everything."},
  {id:"palazzo",img:"palazzo.jpg",n:"The Palazzo, whole building",p:15000000,s:0,pre:220,est:1,lvl:48,k:"Property",i:"home",t:"Ten floors of stone and one door that you control."},
  {id:"superyacht",img:"superyacht.jpg",n:"Superyacht, 90 meters",p:40000000,s:0,pre:300,est:1,lvl:56,k:"Property",i:"boat",t:"Four decks, a helipad, and a crew that doesn't talk."},
  {id:"yacht",img:"yacht.jpg",n:"Yacht, 40 meters",p:9000000,s:0,pre:180,est:1,lvl:44,k:"Property",i:"boat",t:"Where the real conversations happen."},
];
export const SHELVES=["Pockets","Cellar","For them","Wheels","Property"];
export const COLL=[
  {id:"ratpack",n:"Rat Pack night",need:["whiskey","cigars","suit","watch"],b:.04,d:"Whiskey, cigars, a suit and a watch."},
  {id:"charm",n:"Charm offensive",need:["rose","bag","necklace"],b:.03,d:"Roses, a handbag and a necklace."},
  {id:"garage",n:"Garage queen",need:["car","limo"],b:.03,d:"A sports car and an armored limo."},
  {id:"money",n:"Old money",need:["penthouse","villa","yacht"],b:.08,d:"A penthouse, a villa and a yacht."},
];
export const MATES=[
  {id:"isa",n:"Isabella",t:"girlfriend",bio:"Sings at the Velvet Room. Knows every secret in the building.",
    ch:"Warm in public, sharp in private. She remembers every name, every debt and every dress she wasn't invited to.",st:"Reads a room in four seconds. Keeps a secret without being asked.",wk:"Trusts slowly and forgives slower. Hates being the last to know."},
  {id:"amara",n:"Amara",t:"girlfriend",bio:"Runs a gallery on Kenyatta Avenue. Sells you paintings you don't understand.",
    ch:"Calm, dry and a little theatrical. Treats the whole city like an exhibition she's curating.",st:"Taste, patience, and a gallery full of people who owe her favors.",wk:"Lets things slide until they can't be fixed. Won't say what she wants."},
  {id:"luca",n:"Luca",t:"boyfriend",bio:"Plays guitar in a bar that doesn't have a name. Everyone knows where it is.",
    ch:"Long hair, slow smile, and the habit of watching the door. Seen more than he lets on and tells none of it.",st:"Makes strangers talk. Calm when things turn ugly.",wk:"Disappears for days. Will not be told what to do."},
  {id:"rafael",n:"Rafael",t:"boyfriend",bio:"Runs the best barbershop on the waterfront. Knows who owes whom.",
    ch:"Clean-cut, warm, always laughing first. Cuts hair for half the city and hears everything.",st:"Everyone trusts him. Remembers every favor.",wk:"Cannot stand an argument. Gives away more than he should."},
  {id:"marco",n:"Marco",t:"boyfriend",bio:"The tailor's son. Cuts a better suit than your accountant cuts a deal.",
    ch:"Easy smile, quick hands. Grew up in a shop where every customer came with a story.",st:"Charm that opens any door. Never forgets a measurement or a face.",wk:"Says yes too fast. Cares about how things look more than he admits."},
  {id:"dante",n:"Dante",t:"boyfriend",bio:"Left the ring with all his teeth. Funny, calm, scary when he has to be.",
    ch:"Quiet, funny and patient. Left the ring with all his teeth and a lot of rules.",st:"Stays calm when everyone else doesn't. Fiercely loyal.",wk:"Old habits. Hard to talk to once he has decided."},
];
export const PARTIES=[
  {id:"dinner",n:"Rooftop dinner",cost:12000,heat:3,res:25,lvl:5,d:"Twelve seats, one long table, no cameras.",s:[
    "The senator's wife stayed until two and asked for the veal recipe. Her husband owes you a favor now.",
    "Somebody's uncle cried over the tiramisu. Three handshakes happened under the table.",
    "Quiet night. The best kind. Everyone left a little more loyal."]},
  {id:"casino",n:"High-roller night",cost:60000,heat:8,res:80,lvl:12,d:"Private tables at the Golden Ace. Bring your own luck.",s:[
    "A shipping heir lost forty grand at roulette and thanked you for the experience.",
    "Fistfight at the craps table. Your people were on the door. Nobody remembers anything.",
    "You won big on black, and didn't smile. That's how they knew you could afford to lose."]},
  {id:"gala",n:"Charity gala",cost:150000,heat:-6,res:140,lvl:20,d:"Tuxedos, string quartet, a nice check for the hospital.",s:[
    "The mayor gave a speech about you. You hadn't paid him that much.",
    "Photographers got your good side. The newspaper called you a philanthropist.",
    "A judge hugged you. A judge! You'll never see that again."]},
  {id:"yacht",n:"Yacht party",cost:400000,heat:15,res:260,lvl:30,need:"yacht",d:"Needs your own yacht. A DJ from Berlin, nobody sober by midnight.",s:[
    "Somebody went off the top deck in a tuxedo. Everybody cheered. Coast guard waved, politely.",
    "You did business on the aft deck while the party roared. Not one word was repeated.",
    "Sunrise over the bay and a hundred strangers who'd take a bullet for you. Or at least a call."]},
];
export const DIST=[
  {id:"ital",n:"Little Italy",s:"Old families",v:25,r:30,lvl:6,x:8,y:86,w:70,h:76},{id:"dock",n:"Docks",s:"Warehouses",v:30,r:40,lvl:10,x:208,y:8,w:84,h:86},
  {id:"china",n:"Chinatown",s:"Back rooms",v:30,r:40,lvl:14,x:208,y:100,w:84,h:62},{id:"down",n:"Downtown",s:"Nightclub strip",v:35,r:50,lvl:18,x:106,y:8,w:96,h:50},
  {id:"up",n:"Uptown",s:"Casino row",v:40,r:60,lvl:24,x:8,y:8,w:92,h:72},{id:"mid",n:"Midtown",s:"Banks",v:45,r:75,lvl:30,x:84,y:86,w:118,h:76},
];
export const RIVALS=[
  {n:"Tony Two-Fingers",f:"🇺🇸",c:"USA",w:1800000,l:12},{n:"Kazimir Volkov",f:"🇷🇺",c:"Russia",w:8700000,l:22},
  {n:"El Chapo Jr",f:"🇲🇽",c:"Mexico",w:9800000,l:28},{n:"Vincenzo Romano",f:"🇮🇹",c:"Italy",w:11200000,l:34},
  {n:"Madame Zhao",f:"🇭🇰",c:"Hong Kong",w:24000000,l:40},{n:"Sir Edmund Pryce",f:"🇬🇧",c:"England",w:60000000,l:46},
  {n:"The Colonel",f:"🇨🇴",c:"Colombia",w:140000000,l:52},
];
// p = pay range (dirty), r = base fail %, h = heat
export const JOBS=[
  {id:"nums",n:"Run numbers for Sal",lvl:1,en:1,xp:4,p:[150,320],r:4,h:.2,ok:"Sal counted it twice and nodded once.",no:"A beat cop stopped you with the slips in your sock."},
  {id:"bakery",n:"Lean on a bakery",lvl:1,en:2,xp:7,p:[300,650],r:8,h:.4,ok:"He paid before you finished your sentence. The bread was a nice touch.",no:"The baker's son had a bat, and friends."},
  {id:"truck",n:"Rob a delivery truck",lvl:2,en:3,xp:11,p:[600,1200],r:12,h:.8,ok:"Forty cartons of cigarettes. Nobody missed them until Tuesday.",no:"The driver radioed in before you got the doors open."},
  {id:"watches",n:"Fence stolen watches",lvl:4,en:3,xp:14,p:[1000,2200],r:12,h:.6,ok:"Eleven watches gone in an afternoon. One was real.",no:"The buyer was wearing a wire."},
  {id:"debt",n:"Collect from a late payer",lvl:6,en:4,xp:19,p:[1800,3600],r:16,h:1,ok:"He'd been hiding it in the freezer. Under the peas.",no:"He wasn't home. His brother was, and he was a cop."},
  {id:"cards",n:"Rig a card game",lvl:8,en:5,xp:26,p:[3000,6500],r:18,h:1,ok:"A dentist and a judge lost the same hand and blamed each other.",no:"Someone noticed the dealer's sleeve. It got loud."},
  {id:"inspector",n:"Bribe a harbor inspector",lvl:10,en:6,xp:34,p:[5500,11000],r:20,h:1.5,ok:"Eight containers cleared without a look. He sent you a fruit basket.",no:"New inspector. He took the envelope and the photograph."},
  {id:"hijack",n:"Hijack a cargo truck",lvl:13,en:7,xp:44,p:[9000,19000],r:24,h:2.5,ok:"Electronics, all of it. Your crew got home before the alarm did.",no:"A roadblock where there shouldn't have been one."},
  {id:"torch",n:"Torch a rival's club",lvl:16,en:8,xp:57,p:[15000,32000],r:28,h:4,ok:"The fire department called it electrical. You called it Thursday.",no:"The night guard was awake. And armed."},
  {id:"jeweler",n:"Break into a jeweler's",lvl:20,en:10,xp:74,p:[26000,58000],r:30,h:4,ok:"Four minutes inside. You left the cheap stuff, out of respect.",no:"Silent alarm. You heard the sirens from the next street."},
  {id:"border",n:"Smuggle across the border",lvl:25,en:12,xp:98,p:[45000,100000],r:32,h:5,ok:"Forty kilos of nothing anyone will ever admit to.",no:"A dog that wouldn't stop looking at your boots."},
  {id:"armored",n:"Hit an armored car",lvl:30,en:14,xp:128,p:[80000,180000],r:35,h:7,ok:"They had a schedule. You had the schedule.",no:"The guard fired first. You didn't expect him to be good."},
  {id:"union",n:"Take over a port union",lvl:36,en:16,xp:165,p:[140000,320000],r:38,h:6,ok:"Three handshakes, one broken wrist, and the dockers voted your way.",no:"The union boss had friends in the ministry."},
  {id:"skim",n:"Skim a casino in Monaco",lvl:44,en:20,xp:215,p:[260000,600000],r:40,h:5,ok:"Chip by chip, so nobody saw the pile. The pit boss tipped his hat.",no:"Their security chief read your face from across the room."},
];
export const HEISTS=[
  {id:"atm",n:"Cash machine run",lvl:8,sol:5,cap:0,cd:30,en:4,p:[40000,90000],r:22,ok:"Three machines in an hour. The bank blamed a software bug.",no:"Somebody left a camera pointed at your car."},
  {id:"jewel",n:"Jeweler's back wall",lvl:15,sol:10,cap:0,cd:35,en:6,p:[120000,260000],r:28,ok:"Went in through the shoe shop next door. Quietly.",no:"The wall was thicker than the plans said."},
  {id:"count",n:"Casino counting room",lvl:24,sol:25,cap:2,cd:40,en:10,p:[600000,1400000],r:34,ok:"Out the service door with a laundry cart. Nobody checks the laundry.",no:"The pit boss had a button under his desk."},
  {id:"courier",n:"Reserve courier convoy",lvl:36,sol:60,cap:6,cd:45,en:16,p:[3000000,7000000],r:40,ok:"Two trucks in, two trucks out. The third truck never knew.",no:"There was a fourth truck. Nobody told you about the fourth truck."},
  {id:"vault",n:"Geneva vault",lvl:45,sol:90,cap:12,cd:45,en:24,p:[10000000,25000000],r:44,ok:"You spent six months planning it and ninety seconds doing it.",no:"They'd changed the locks the week before. Someone talked."},
];
const U=s=>500+level(s)*700;
export const EVENTS=[
  {id:"cop",x:"An officer from the 9th precinct finds you at the diner. He wants a monthly envelope, and he wants to be your friend.",ch:[
    {l:"Pay him",fx:{cash:-4,heat:-12,xp:10},x:"He took it like a tip and left. The heat dropped a little."},
    {l:"Tell him no",fx:{xp:8},alt:{p:.5,fx:{heat:14},x:"He left angry. Two patrol cars have been parked outside since."},x:"He walked out smiling, which was worse."}]},
  {id:"kid",x:"A kid from the docks says he knows who's been talking to the feds. He wants cash and a job.",ch:[
    {l:"Hear him out",fx:{cash:-1,heat:-8,xp:12},x:"He gave you a name. By morning the name had left town."},
    {l:"Send him away",fx:{},alt:{p:.35,fx:{heat:14},x:"He sold it to somebody else. Somebody less friendly."},x:"He shrugged and went home."}]},
  {id:"raid",x:"{d}: Volkov's men are leaning on your shopkeepers. They want the corner by Friday.",need:"turf",ch:[
    {l:"Send the crew",fx:{xp:15},alt:{p:.4,fx:{sol:-2},x:"It got ugly. Two of yours didn't walk away."},x:"Your people got there first. Volkov's guys left before dinner."},
    {l:"Pay them off",fx:{cash:-5,turf:-3},x:"They took the money. The neighborhood noticed you paid."},
    {l:"Let it go",fx:{turf:-10},x:"You gave up a few blocks. The shopkeepers won't forget it."}]},
  {id:"press",x:"A reporter has been asking about the Velvet Room. She's smart and she's patient.",ch:[
    {l:"Pay her to stop",fx:{cash:-6,heat:-6},x:"She took the check and wrote about gardening for a month."},
    {l:"Let her print it",fx:{heat:12,xp:30},x:"It ran on page six. Half the city read it and the other half pretended not to."}]},
  {id:"nun",x:"A nun from St. Anne's turns up at your door with a wallet you lost. There's more cash in it than you remember.",ch:[
    {l:"Say thank you",fx:{cash:1,xp:5},x:"She blessed you and left. You've been unusually polite all day."},
    {l:"Donate to the church",fx:{cash:-1,xp:20,heat:-4},x:"Father Ignatius mentioned you in Sunday's sermon. By first name."}]},
  {id:"cousin",x:"Your cousin Paolo needs a loan. He swears it's for a restaurant, and he swears this time is different.",ch:[
    {l:"Lend him the money",fx:{cash:-6},alt:{p:.5,fx:{cash:13},x:"The restaurant is real. He paid you back with interest, and a free dinner."},x:"Paolo's restaurant closed in March. Paolo has moved to Naples."},
    {l:"Refuse",fx:{xp:4},x:"He'll tell everyone at Christmas. You can live with that."}]},
  {id:"tip",x:"The bartender at the Velvet Room hears about a delivery tonight. Nobody's guarding it.",ch:[
    {l:"Take it",fx:{dirty:6,heat:4,xp:14},alt:{p:.3,fx:{sol:-1},x:"It was guarded. One of yours is in the hospital."},x:"Clean job. You were home before the news came on."},
    {l:"Leave it",fx:{xp:3},x:"You left it for somebody else. Somebody else wasn't so lucky."}]},
  {id:"dinner",x:"The mate asks you to come to a family dinner. Their mother has opinions.",need:"mate",ch:[
    {l:"Go, and bring wine",fx:{cash:-2,aff:8,xp:10},x:"Her mother asked about your intentions. You said the right things."},
    {l:"Cancel",fx:{aff:-8},x:"It's the fourth time. They're keeping count."}]},
  {id:"fence",x:"A fence in Eastleigh offers you a crate of stock at half price. No questions, he says. There are always questions.",ch:[
    {l:"Buy it",fx:{cash:-5},alt:{p:.6,fx:{cash:11},x:"Every watch real. You sold the lot by Friday."},x:"Half of it was fake. The other half was hot."},
    {l:"Pass",fx:{},x:"You went home and slept fine."}]},
];
export const DAILY=[3,4,5,6,8,10,16];
export const STORY={2:"Sal Moretti lets you sit at his table. Keep your mouth shut and your ears open, he says.",5:"You've got a name now, a small one. People on Gaitherer Street step aside when you walk.",
  10:"The cops know your face. A man in a gray suit parks across from the shop every Tuesday.",15:"Sal retires to Sicily and leaves you the keys. Nobody asks if you're ready.",
  20:"Your name's in the papers. Not the front page, but the front of page six.",25:"You've built something that could outlive you. Think about who you'd leave it to.",
  30:"The family sits down at your table now, not the other way around.",40:"Three countries know your name. Two of them wish they didn't.",50:"They call you Godfather. You pretend you hate it."};
export const ACH=[
  {id:"job1",n:"First blood",d:"Finish a job.",f:s=>s.jobsDone>=1,rw:{cash:2000,xp:20}},
  {id:"job100",n:"Regular",d:"Finish 100 jobs.",f:s=>s.jobsDone>=100,rw:{cash:20000,xp:200}},
  {id:"job1000",n:"Lifer",d:"Finish 1,000 jobs.",f:s=>s.jobsDone>=1000,rw:{cash:400000,xp:2000}},
  {id:"biz1",n:"Honest work",d:"Own a business.",f:s=>Object.keys(s.biz).length>=1,rw:{cash:5000,xp:30}},
  {id:"biz6",n:"Empire in miniature",d:"Own six businesses.",f:s=>Object.keys(s.biz).length>=6,rw:{cash:250000,xp:400}},
  {id:"nw1",n:"Millionaire",d:"Reach $1M net worth.",f:s=>worth(s).total>=1e6,rw:{cash:25000,xp:300}},
  {id:"nw10",n:"Ten million",d:"Reach $10M net worth.",f:s=>worth(s).total>=1e7,rw:{cash:250000,xp:1200}},
  {id:"nw100",n:"Hundred million",d:"Reach $100M net worth.",f:s=>worth(s).total>=1e8,rw:{cash:2500000,xp:4000}},
  {id:"coll",n:"Taste",d:"Complete a collection.",f:s=>collections(s).done.length>=1,rw:{cash:20000,xp:200}},
  {id:"wed",n:"Till death",d:"Get married.",f:s=>s.mate&&s.mate.married,rw:{cash:100000,xp:500}},
  {id:"party10",n:"Social calendar",d:"Throw 10 parties.",f:s=>s.parties>=10,rw:{cash:40000,xp:400}},
  {id:"turf3",n:"Landlord",d:"Hold three districts at 50% or more.",f:s=>DIST.filter(d=>s.dist[d.id]>=50).length>=3,rw:{cash:150000,xp:500}},
  {id:"win25",n:"Scrapper",d:"Win 25 fights against rivals.",f:s=>s.wins>=25,rw:{cash:80000,xp:600}},
  {id:"streak7",n:"Creature of habit",d:"Collect your daily gift seven days in a row.",f:s=>s.dl.st>=7,rw:{cash:30000,xp:300}},
  {id:"raid",n:"Front page",d:"Survive a police raid.",f:s=>s.raids>=1,rw:{cash:5000,xp:100}},
  {id:"trade",n:"Sharp",d:"Close a trade for $100,000 profit.",f:s=>s.best>=1e5,rw:{cash:50000,xp:500}},
  {id:"coin1",n:"Early adopter",d:"Buy some Omerta Coin.",f:s=>s.omc.bought>0,rw:{cash:10000,xp:100}},
  {id:"lv10",n:"Made",d:"Reach level 10.",f:s=>level(s)>=10,rw:{cash:20000,xp:0}},
  {id:"lv25",n:"Boss",d:"Reach level 25.",f:s=>level(s)>=25,rw:{cash:500000,xp:0}},
  {id:"lv50",n:"Godfather",d:"Reach level 50.",f:s=>level(s)>=50,rw:{cash:20000000,xp:0}},
  {id:"heir",n:"Dynasty",d:"Hand the family to an heir.",f:s=>s.leg>=1,rw:{cash:100000,xp:500}},
];
// Badge art is one-to-one with an achievement: a design is never reused. Achievements with no art yet show a plain star until a new design is added here.
export const BADGE={job1:"skull",job100:"fire",job1000:"onyx",win25:"guns",nw1:"money",nw10:"sapphire",nw100:"amethyst",lv50:"king",lv25:"fedora",wed:"ruby",party10:"rose",coll:"ice",trade:"bolt",lv10:"bronze",biz6:"silver",heir:"gold",raid:"skullhat",turf3:"copper"};
export const badgeOf=id=>BADGE[id]?"badge-"+BADGE[id]+".jpg":null;
// Omerta Coin follows the real Bitcoin price when the phone is online. Offline, it wanders around the last real price.
const omcStep=o=>{const a=o.anchor||OMC_BASE;let r=gauss()*.0004+(a-o.p)/a*.002;if(Math.random()<.0015)r+=(Math.random()<.5?-1:1)*rnd(.02,.06);o.p=Math.max(a*.3,o.p*(1+r));o.h.push(o.p);if(o.h.length>90)o.h.shift()};
export const newOmc=()=>{const o={q:0,cost:0,p:OMC_BASE,anchor:OMC_BASE,h:[],live:0,lt:0,bought:0};for(let i=0;i<90;i++)omcStep(o);return o};
export const omcQty=q=>q>=100?q.toFixed(2):q>=1?q.toFixed(4):q.toFixed(6);
const idx=a=>Object.fromEntries(a.map(x=>[x.id,x]));
export const BM=idx(BIZ), IM=idx(ITEMS), FM=idx(FX), DM=idx(DIST), MM=idx(MATES), JM=idx(JOBS), HM=idx(HEISTS), EM=idx(EVENTS);

// ---- derived values ----
const need=l=>Math.round(XPK*Math.pow(l-1,XPE));
export const level=s=>{let l=1;while(l<99&&s.res>=need(l+1))l++;return l};
export const xpBar=s=>{const l=level(s),a=need(l),b=need(l+1);return{l,cur:s.res-a,span:b-a,pct:Math.min(100,(s.res-a)/(b-a)*100)}};
// Passport cards, plainest to richest. The player moves up one every couple of ranks.
export const CARDS=[{id:"silver",n:"Violet Silver",min:1},{id:"frost",n:"Frost Pact",min:8},{id:"emerald",n:"Emerald Gold",min:16},{id:"crimson",n:"Crimson Velvet",min:27},{id:"obsidian",n:"Obsidian Crown",min:42}];
export const cardAt=l=>CARDS.filter(c=>c.min<=l).pop().id;
export const RANKS=[[1,"Errand boy"],[4,"Associate"],[8,"Soldier"],[12,"Enforcer"],[16,"Capo"],[21,"Consigliere"],[27,"Underboss"],[34,"Boss"],[42,"Don"],[50,"Godfather"]];
export const CORP=[[1,"Runner"],[6,"Associate"],[12,"Manager"],[20,"Director"],[30,"Vice President"],[42,"CEO"],[60,"Chairman"],[80,"Chairman of the Board"]];
export const corpTitle=l=>CORP.filter(r=>l>=r[0]).pop()[1];
export const workers=s=>({sol:s.crew.sol,cap:s.crew.cap,mgr:Object.values(s.biz).filter(b=>b.m).length,desk:(s.off||0)*4});
export const hourly=s=>Object.keys(s.biz).reduce((a,k)=>a+BM[k].inc*s.biz[k].l,0)*bonus(s)+tributeRate(s)+(ecoIncome(s)+landIncome(s))*bonus(s);
export const rank=l=>RANKS.filter(r=>l>=r[0]).pop()[1];
export const cardOf=s=>{const l=level(s),c=CARDS.find(x=>x.id===s.pc);return c&&c.min<=l?c.id:cardAt(l)};

// Offices: nine levels, one picture per three levels. Reaching a new picture replaces the old one for good.
export const OFFICE_NAMES=["Hot desk in a loft","Your own desk and a lock","Corner of the loft","Open-plan floor","Open-plan with a glass room","Glass boardroom","Atrium headquarters","Atrium with a balcony","The whole atrium","Executive suite","Suite with a private lounge","Suite with a boardroom","Penthouse office","Penthouse with a private bar","The skyline is yours"];
export const OFFICE_MAX=15;
export const OFFICE_TIERS=["Co-working loft","Open-plan floor","Atrium headquarters","Executive suite","Penthouse office"];
export const officeTier=l=>l>0?Math.ceil(l/3):0;
export const officeCost=l=>Math.round(40000*Math.pow(3.4,l));      // cost to go from level l to l+1
export const officeLvl=l=>4+l*3;                                  // player level needed for it
export const enMax=s=>Math.min(60,12+Math.floor(level(s)*.9)+(s.off||0));
export const jailed=s=>s.jail>clock();
export const eq=(o,p)=>o.st+o.st*o.lev*o.dir*(p-o.e)/o.e;
export const used=s=>Object.entries(s.inv).reduce((a,[k,q])=>a+IM[k].s*q,0);
export const cap=s=>STORE[s.store].slots;
export const prestige=s=>Object.entries(s.inv).reduce((a,[k,q])=>a+IM[k].pre*q,0)+Object.keys(s.est).reduce((a,k)=>a+IM[k].pre,0);
export const collections=s=>{const has=k=>s.inv[k]>0||s.est[k],done=COLL.filter(c=>c.need.every(has));return{done,b:done.reduce((a,c)=>a+c.b,0)}};
export const bonus=s=>1+(s.mate?s.mate.aff/1000+(s.mate.married?.05:0):0)+Math.min(s.friends,15)*.01+collections(s).b+s.leg*.25+(s.off||0)*.025;
export const power=s=>s.crew.sol+s.crew.cap*8;
export const stars=(s,id)=>{const n=s.jobs[id]||0;return n>=80?3:n>=30?2:n>=10?1:0};
export const jobFail=(s,J)=>Math.max(3,J.r-power(s)*.12-stars(s,J.id)*2);
export const heistFail=(s,H,ap)=>Math.max(5,H.r+{quiet:-8,loud:12,inside:-16}[ap]-Math.min(10,power(s)/H.sol*3));
export const heistCost=H=>Math.round((H.p[0]+H.p[1])/2*.12);
export const till=(s,id,now)=>{const b=s.biz[id];return b?Math.floor(BM[id].inc*b.l*Math.min((now-b.s)/H,b.m?24:8)*bonus(s)):0};
export const tributeRate=s=>DIST.reduce((a,d)=>a+s.dist[d.id]*d.v,0)*bonus(s);
export const tribute=(s,now)=>Math.floor(tributeRate(s)*Math.min((now-s.ts)/H,12));
export const washRate=s=>Object.entries(s.biz).reduce((a,[k,b])=>a+BM[k].inc*b.l*.9,0);
export const washRoom=(s,now)=>{const r=washRate(s);return Math.min((s.wc||0)+r*(now-s.wt)/H,r*12)};
export const dirtyLimit=s=>20000+washRate(s)*14;
export const odds=(s,d)=>{const n=DM[d].r+s.dist[d]/2,p=power(s);return Math.min(.9,Math.max(.1,p/(p+n)))};
export const rivalPower=r=>r.l*5;
export const rivalOdds=(s,r)=>{const p=power(s),q=rivalPower(r);return Math.min(.9,Math.max(.08,p/(p+q)))};
export const crewCost=(s,k)=>k==="cap"?Math.round(60000*(1+s.crew.cap*.35)):Math.round(3000*(1+s.crew.sol*.08));
export const pushCost=s=>6000+level(s)*900;
export const bailCost=s=>1500+level(s)*900;
export const layCost=s=>3000+level(s)*1500;
export const bizUpCost=(id,l)=>Math.round(BM[id].cost*.6*Math.pow(l,1.8));
export const worth=s=>{
  const b=Object.entries(s.biz).reduce((a,[k,v])=>a+BM[k].cost*v.l,0);
  const it=Object.entries(s.inv).reduce((a,[k,q])=>a+IM[k].p*q,0)+Object.keys(s.est).reduce((a,k)=>a+IM[k].p,0);
  const tr=s.pos.reduce((a,o)=>a+Math.max(0,eq(o,s.fx.p[o.pair])),0),coin=s.omc.q*s.omc.p;
  const eco=ecoValue(s)+Object.keys(s.land||{}).reduce((a,k)=>a+(LM[k]?(s.land[k].p||LM[k].p):0),0);
  return{cash:s.cash,dirty:Math.round(s.dirty*.5),biz:b,stash:it,trades:tr,coin,eco,total:s.cash+Math.round(s.dirty*.5)+b+it+tr+coin+eco};
};
export const board=(s,now)=>{
  const hrs=(now-s.t0)/H,me={n:"You",me:1,f:"🇰🇪",c:"Kenya",w:worth(s).total,l:level(s)};
  return[...RIVALS.map(r=>({...r,w:Math.max(5e5,Math.round(r.w*(1+.01*hrs)-(s.rv[r.n]||0)))})),me].sort((a,b)=>b.w-a.w).map((x,i)=>({...x,r:i+1}));
};
export const mateLine=m=>{
  const n=MM[m.id].n,a=m.aff;
  if(a>=90)return`${n}: "I'd follow you anywhere. Just not into the trunk."`;
  if(a>=70)return`${n}: "You looked tired at dinner. I fixed it. Don't thank me."`;
  if(a>=45)return`${n}: "I like this version of you. Keep him around."`;
  if(a>=20)return`${n}: "You're always on the phone. I'm right here."`;
  return`${n}: "I'm not going to ask twice."`;
};
export const evText=(s)=>s.ev?EM[s.ev.id].x.replace("{d}",s.ev.d||""):"";

// ---- state ----
const say=(s,x,a)=>{s.log.unshift({t:clock(),x,a});s.log.length=Math.min(s.log.length,60);s.toast={k:Math.random(),x}};
const walk=(s,f)=>{const dr=s.fx.dr[f.id]*.94+gauss()*f.v*.3,p=Math.max(f.b*.5,s.fx.p[f.id]+(f.b-s.fx.p[f.id])*.004+dr+f.v*gauss()*.8);return[p,dr]};
export const fresh=(now=Date.now(),keep={})=>{
  const fx={p:{},dr:{},h:{}};
  FX.forEach(f=>{fx.p[f.id]=f.b;fx.dr[f.id]=0;fx.h[f.id]=[];for(let i=0;i<90;i++){const[p,dr]=walk({fx},f);fx.p[f.id]=p;fx.dr[f.id]=dr;fx.h[f.id].push(p)}});
  const leg=keep.leg||0;
  const s={v:3,t:now,t0:now,fxT:now,ts:now,cash:20000+leg*60000,dirty:0,res:0,lv:1,en:12,enT:now,heat:5,friends:0,parties:0,store:0,leg,
    biz:{},inv:{},est:{},crew:{sol:3,cap:0},dist:Object.fromEntries(DIST.map(d=>[d.id,0])),mate:null,last:null,pos:[],trades:[],nw:[],pid:1,
    omc:newOmc(),pc:null,jobs:{},jobsDone:0,jail:0,hcd:{},off:0,eco:{},land:{},frac:0,ev:null,evT:now+15*MIN,dl:keep.dl||{d:"",st:0},ach:keep.ach||{},wins:0,raids:0,best:0,wc:0,wt:now,rv:{},
    log:[{t:now,x:leg?"The keys are yours now. Your father left a lot of enemies and a little money.":"Sal's old keys are yours now. Don't lose them."}],fx};
  return s;
};
export const load=()=>{try{const j=JSON.parse(localStorage.getItem(KEY));if(j&&j.v===3){if(!j.omc)j.omc=newOmc();if(!j.eco)j.eco={};if(!j.land)j.land={};if(!j.off)j.off=0;if(!j.frac)j.frac=0;return j}}catch(e){}return fresh()};

function closePos(s,o,why){
  const v=Math.max(0,eq(o,s.fx.p[o.pair])),pl=v-o.st;
  s.pos=s.pos.filter(x=>x.id!==o.id);s.cash+=v;s.trades.unshift({pair:o.pair,pnl:pl,t:clock()});s.trades.length=Math.min(s.trades.length,15);
  if(pl>s.best)s.best=pl;if(pl>0)s.res+=Math.min(60,Math.round(Math.log10(pl+1)*4));
  say(s,`${why} ${FM[o.pair].n}: ${pl>=0?"made":"lost"} ${$(Math.abs(pl))}.`,pl);
}
function fxStep(s){
  FX.forEach(f=>{const[p,dr]=walk(s,f),h=s.fx.h[f.id];s.fx.p[f.id]=p;s.fx.dr[f.id]=dr;h.push(p);if(h.length>90)h.shift()});
  omcStep(s.omc);
  [...s.pos].forEach(o=>{const v=eq(o,s.fx.p[o.pair]);
    if(v<=0)closePos(s,o,"Wiped out on");
    else if(o.sl&&v<=o.st*(1-o.sl))closePos(s,o,"Stop loss hit on");
    else if(o.tp&&v>=o.st*(1+o.tp))closePos(s,o,"Took profit on")});
}
function spawn(s,now){
  const ok=EVENTS.filter(e=>(e.need!=="turf"||DIST.some(d=>s.dist[d.id]>=5))&&(e.need!=="mate"||s.mate));
  const e=pick(ok),owned=DIST.filter(d=>s.dist[d.id]>=5);
  s.ev={id:e.id,d:owned.length?pick(owned).n:"",di:owned.length?pick(owned).id:""};
  if(e.need==="turf"){const d=pick(owned);s.ev.d=d.n;s.ev.di=d.id}
  s.toast={k:Math.random(),x:"Something came up. Look on the Home screen."};
}
function tick(s,now){
  const dt=Math.max(0,now-s.t)/H;s.t=now;
  {const tot=(ecoIncome(s)+landIncome(s))*Math.min(dt,12)*bonus(s)+(s.frac||0),w=Math.floor(tot);if(w>0)s.cash+=w;s.frac=tot-w}
  s.heat=Math.max(0,s.heat-dt*3);
  const mx=enMax(s);
  if(s.en<mx){const n=Math.floor((now-s.enT)/REGEN);if(n>0){s.en=Math.min(mx,s.en+n);s.enT+=n*REGEN}if(s.en>=mx)s.enT=now}else s.enT=now;
  if(s.mate){s.mate.aff=Math.max(0,s.mate.aff-dt*.6);if(s.mate.aff<=0){say(s,`${MM[s.mate.id].n} left a note on the pillow. It was short.`);s.mate=null}}
  DIST.forEach(d=>{const p=s.dist[d.id];if(p>0)s.dist[d.id]=Math.max(0,p-dt*(d.r/(power(s)+12))*.9)});
  if(s.dirty>dirtyLimit(s))s.heat=Math.min(100,s.heat+dt*6);
  let n=Math.min(90,Math.floor((now-s.fxT)/TICK));if(n>0){s.fxT+=n*TICK;while(n--)fxStep(s)}
  if(s.heat>=90){const f=Math.round(s.cash*.06),z=Math.round(s.dirty*.4);s.cash-=f;s.dirty-=z;s.heat=50;s.raids++;say(s,`Cops kicked in the door before dawn. Fined ${$(f)} and they took ${$(z)} in cash. Heat is back down to 50.`,-f-z)}
  if(!s.ev&&now>=s.evT&&level(s)>=2){spawn(s,now);s.evT=now+ri(30,90)*MIN}
  const L=level(s);
  while(s.lv<L){s.lv++;s.en=mx;s.cash+=500*s.lv;say(s,STORY[s.lv]||`Level ${s.lv}. ${pick(["Another door opens.","The table gets a little smaller and a little richer.","They're starting to say your name like it means something."])}`,500*s.lv);
    if(cardAt(s.lv)!==cardAt(s.lv-1)){s.pc=null;say(s,`New passport issued: ${CARDS.find(c=>c.id===cardAt(s.lv)).n}. Check the Life screen.`)}}
  ACH.forEach(a=>{if(!s.ach[a.id]&&a.f(s)){s.ach[a.id]=now;s.cash+=a.rw.cash;s.res+=a.rw.xp;say(s,`Achievement: ${a.n}. ${a.rw.cash?"+"+$(a.rw.cash)+".":""}`,a.rw.cash)}});
  const l=s.nw[s.nw.length-1];if(!l||now-l[0]>15*MIN){s.nw.push([now,worth(s).total]);if(s.nw.length>150)s.nw.shift()}
}
const FX_OK=(s,e)=>{if(e.cash<0&&s.cash<-e.cash*U(s))return false;return true};
function apply(s,fx){
  const u=U(s);
  if(fx.cash)s.cash+=Math.round(fx.cash*u);if(fx.dirty)s.dirty+=Math.round(fx.dirty*u);
  if(fx.heat)s.heat=Math.max(0,Math.min(100,s.heat+fx.heat));if(fx.xp)s.res+=fx.xp;
  if(fx.sol)s.crew.sol=Math.max(0,s.crew.sol+fx.sol);if(fx.friends)s.friends+=fx.friends;
  if(fx.aff&&s.mate)s.mate.aff=Math.max(0,Math.min(100,s.mate.aff+fx.aff));
  if(fx.turf&&s.ev&&s.ev.di)s.dist[s.ev.di]=Math.max(0,s.dist[s.ev.di]+fx.turf);
}

export function reduce(st,a){
  NOW=a.now||0;const s=structuredClone(st),now=clock(),no=x=>{s.toast={k:Math.random(),x};return s},broke=()=>no("You're short on clean cash for that."),cell=()=>jailed(s)?no(`You're locked up for another ${hm(s.jail-now)}. Pay bail or wait it out.`):null;
  const spend=n=>{const full=s.en>=enMax(s);s.en-=n;if(full)s.enT=now};
  switch(a.t){
  case"tick":tick(s,a.now);return s;
  case"collect":{
    let tot=0,heat=0;
    (a.id==="all"?Object.keys(s.biz):[a.id]).forEach(id=>{const b=s.biz[id];if(!b)return;const h=Math.min((now-b.s)/H,b.m?24:8);tot+=till(s,id,now);heat+=BM[id].heat*b.l*h*.15;b.s=now});
    if(tot<=0)return no("Nothing in the tills yet. Give them time.");
    s.cash+=tot;s.heat=Math.min(100,s.heat+heat);s.res+=1+Math.min(6,Math.floor(Math.log10(tot+1)));
    say(s,`Collected ${$(tot)} from ${a.id==="all"?"every till":BM[a.id].n}.`,tot);return s}
  case"buyBiz":{const B=BM[a.id];if(s.biz[a.id])return s;if(level(s)<B.lvl)return no(`Not yet. You need to be level ${B.lvl}.`);if(s.cash<B.cost)return broke();
    s.cash-=B.cost;s.biz[a.id]={l:1,s:now};s.res+=10+B.lvl*2;say(s,`You bought ${B.n}. The old owner shook your hand and didn't look back.`,-B.cost);return s}
  case"upBiz":{const b=s.biz[a.id],c=bizUpCost(a.id,b.l);if(b.l>=12)return no("It can't get any bigger.");if(s.cash<c)return broke();
    s.cash-=c;b.l++;s.res+=8+b.l*2;say(s,`${BM[a.id].n} got a renovation. Level ${b.l}.`,-c);return s}
  case"mgr":{const b=s.biz[a.id],c=BM[a.id].cost*2;if(b.m)return s;if(s.cash<c)return broke();
    s.cash-=c;b.m=1;s.res+=30;say(s,`You hired a manager for ${BM[a.id].n}. The till now holds a full day.`,-c);return s}
  case"buy":{const it=IM[a.id];
    if(level(s)<it.lvl)return no(`Not yet. You need to be level ${it.lvl}.`);
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
  case"pickMate":{if(level(s)<6)return no("Not yet. You need to be level 6.");const m=MM[a.id];if(!m)return s;s.mate={id:m.id,aff:40,married:false,since:now};say(s,`You asked ${m.n} to dinner. ${m.n} said yes before you finished the sentence.`);return s}
  case"swapMate":{const m=s.mate,n=MM[a.id];if(!m||!n||n.id===m.id)return s;if(m.married)return no("You're married. That's a different kind of conversation.");
    if(s.cash<5000)return no("Moving out costs $5,000.");s.cash-=5000;const old=MM[m.id];s.mate={id:n.id,aff:30,married:false,since:now};say(s,`You told ${old.n} it wasn't working. ${n.n} heard about it before you got home.`,-5000);return s}
  case"date":{const m=s.mate;if(!m)return s;const D=a.k==="trip"?{c:60000,g:16,x:`A weekend in Mombasa. ${MM[m.id].n} didn't check a phone once.`}:{c:4000,g:6,x:`Dinner for two. ${MM[m.id].n} ordered the most expensive thing and meant it.`};
    if(s.cash<D.c)return broke();s.cash-=D.c;m.aff=Math.min(100,m.aff+D.g);s.res+=5;say(s,D.x,-D.c);return s}
  case"gift":{const m=s.mate,it=IM[a.id];if(!m||!s.inv[a.id])return s;
    if(--s.inv[a.id]<=0)delete s.inv[a.id];m.aff=Math.min(100,m.aff+it.g);say(s,`You gave ${MM[m.id].n} the ${it.n.toLowerCase()}. ${MM[m.id].n} looked at it for a long time, then at you.`);return s}
  case"propose":{const m=s.mate;if(!m||m.married)return s;if(m.aff<80)return no("Not yet. Give it time.");if(!s.inv.ring)return no("You can't ask without a ring.");
    if(--s.inv.ring<=0)delete s.inv.ring;m.married=true;m.aff=100;s.res+=300;say(s,`${MM[m.id].n} said yes. The whole family cried, even the ones who don't cry.`);return s}
  case"party":{const P=PARTIES.find(x=>x.id===a.id);if(level(s)<P.lvl)return no(`Not yet. You need to be level ${P.lvl}.`);if(P.need&&!s.est[P.need])return no("You need your own yacht for that one.");if(s.cash<P.cost)return broke();
    s.cash-=P.cost;s.heat=Math.max(0,Math.min(100,s.heat+P.heat));s.parties++;
    const r=Math.round(P.res*(1+prestige(s)/500));s.res+=r;
    let x=pick(P.s),tip=0;
    if(Math.random()<.4)s.friends++;
    if(Math.random()<.25){tip=Math.round(P.cost*rnd(.2,.6));s.cash+=tip;x+=` A guest slipped you a tip worth ${$(tip)}.`}
    if(Math.random()<.15){s.heat=Math.min(100,s.heat+10);x+=" A patrol car idled outside for an hour."}
    if(s.mate){s.mate.aff=Math.min(100,s.mate.aff+5);x+=` ${MM[s.mate.id].n} worked the room.`}
    s.last={n:P.n,x,r};say(s,`${P.n}: ${$(P.cost)} spent, +${r} respect.`,-P.cost+tip);return s}
  case"recruit":{const c=crewCost(s,a.k),nm=a.k==="cap"?"capo":"soldier";if(s.cash<c)return broke();
    s.cash-=c;s.crew[a.k]++;say(s,`A new ${nm} kissed your ring and started Monday.`,-c);return s}
  case"job":{const J=JM[a.id],e=cell();if(e)return e;if(level(s)<J.lvl)return no(`Not yet. You need to be level ${J.lvl}.`);
    if(s.en<J.en)return no("Out of energy. A point comes back every three minutes.");
    spend(J.en);const st=stars(s,J.id);
    if(Math.random()*100<jobFail(s,J)){s.jail=now+(6+level(s)*1.2)*MIN;s.heat=Math.min(100,s.heat+J.h*3);say(s,`${J.no} You're in a cell for ${hm(s.jail-now)}.`);return s}
    const pay=Math.round(ri(J.p[0],J.p[1])*(1+.12*st)*bonus(s));s.dirty+=pay;s.res+=J.xp;s.heat=Math.min(100,s.heat+J.h);s.jobs[J.id]=(s.jobs[J.id]||0)+1;s.jobsDone++;
    const ns=stars(s,J.id);say(s,`${J.ok} +${$(pay)} dirty.${ns>st?` You've mastered it (${ns} star${ns>1?"s":""}).`:""}`,pay);return s}
  case"bail":{const c=bailCost(s);if(!jailed(s))return s;if(s.cash<c)return broke();s.cash-=c;s.jail=0;say(s,`A lawyer got you out for ${$(c)}. He didn't ask questions.`,-c);return s}
  case"launder":{if(s.dirty<=0)return no("No dirty cash to clean.");
    if(a.k==="street"){const amt=Math.min(s.dirty,a.amt||s.dirty),out=Math.round(amt*.55);s.dirty-=amt;s.cash+=out;say(s,`Street wash: ${$(amt)} dirty became ${$(out)}. A guy named Gus took the rest.`,out);return s}
    const room=washRoom(s,now);if(room<1)return no("Your businesses can't take any more right now. Wait, or use the street.");
    const amt=Math.min(s.dirty,room,a.amt||s.dirty),out=Math.round(amt*.85);s.dirty-=amt;s.cash+=out;s.wc=room-amt;s.wt=now;
    say(s,`Ran ${$(amt)} through the businesses and got ${$(out)} back.`,out);return s}
  case"push":{const D=DM[a.id],e=cell();if(e)return e;if(level(s)<D.lvl)return no(`Not yet. You need to be level ${D.lvl}.`);
    const c=pushCost(s);if(s.en<3)return no("Out of energy. A point comes back every three minutes.");if(s.cash<c)return broke();if(s.dist[a.id]>=100)return no("You own every corner already.");
    const p=odds(s,a.id);s.cash-=c;spend(3);
    if(Math.random()<p){const g=ri(6,12);s.dist[a.id]=Math.min(100,s.dist[a.id]+g);s.res+=20+D.lvl;say(s,`${D.n}: your crew leaned on the right shopkeepers. +${g}% of the neighborhood.`,-c)}
    else{const l=Math.min(s.crew.sol,ri(1,3));s.crew.sol-=l;s.heat=Math.min(100,s.heat+8);s.dist[a.id]=Math.max(0,s.dist[a.id]-3);say(s,`${D.n}: it went wrong. ${l} soldier${l===1?"":"s"} didn't come back. Heat is up.`,-c)}
    return s}
  case"tribute":{const x=tribute(s,now);if(x<=0)return no("No tribute yet. The streets pay slowly.");s.dirty+=x;s.ts=now;say(s,`The neighborhoods paid up: ${$(x)} in dirty cash.`,x);return s}
  case"attack":{const R=RIVALS[a.i],e=cell();if(e)return e;if(s.en<5)return no("Out of energy. A point comes back every three minutes.");if(s.crew.sol<3)return no("You need at least three soldiers.");
    spend(5);
    if(Math.random()<rivalOdds(s,R)){const take=Math.round(R.w*.0012);s.dirty+=take;s.res+=R.l*2;s.wins++;s.rv[R.n]=(s.rv[R.n]||0)+take*40;s.heat=Math.min(100,s.heat+4);
      say(s,`Your crew hit ${R.n}'s people in ${R.c}. They came back with ${$(take)} and a few new scars.`,take)}
    else{const l=Math.min(s.crew.sol,ri(1,4));s.crew.sol-=l;s.heat=Math.min(100,s.heat+4);say(s,`${R.n}'s men were waiting. You lost ${l} soldier${l===1?"":"s"}.`)}
    return s}
  case"note":return no(String(a.x||"").slice(0,120));
  case"officeUp":{const l=s.off||0;if(l>=OFFICE_MAX)return s;if(level(s)<officeLvl(l))return no(`The landlord wants to see level ${officeLvl(l)} first.`);const c=officeCost(l);if(s.cash<c)return broke();
    s.cash-=c;s.off=l+1;say(s,officeTier(l+1)!==officeTier(l)?`You moved out of the old place for good. New address: ${OFFICE_TIERS[officeTier(l+1)-1]}.`:`${OFFICE_NAMES[l]}. Your people stand a little straighter in it.`,-c);return s}
  case"ecoBuy":{const I=EI[a.id];if(!I)return s;if(level(s)<I.lvl)return no(`That's a level ${I.lvl} kind of purchase.`);if(s.cash<I.p)return broke();s.cash-=I.p;s.eco[I.id]=(s.eco[I.id]||0)+1;say(s,`Bought: ${I.n} (${I.kn}). It pays about ${$(Math.round(I.y))} an hour.`,-I.p);return s}
  case"landBuy":{const P=LM[a.id];if(!P)return s;const c=a.how==="win"?0:Math.max(0,Math.round(a.price||0));if(c>s.cash)return broke();s.cash-=c;s.land[P.id]={p:a.how==="buyout"?c:(a.price||P.p),since:now};say(s,a.how==="win"?`${P.n} fell to your crew. It's yours.`:`${P.n} is yours now.`,-c);return s}
  case"landFight":{const P=LM[a.id];if(!P)return s;if(s.en<12)return no("Taking a place takes 12 energy.");spend(12);if(!a.win){const l=Math.min(s.crew.sol,Math.max(1,Math.ceil(s.crew.sol*.2)));s.crew.sol-=l;say(s,`Your crew tried to take ${P.n} and lost ${l} soldiers.`);}return s}
  case"landLost":{const P=LM[a.id];if(P&&s.land[P.id]){delete s.land[P.id];say(s,`${P.n} was taken from you${a.by?" by "+String(a.by).slice(0,16):""}.`)}return s}
  case"credit":{const m=Math.max(0,Math.min(1e18,+a.a||0));if(m>0){s.cash+=Math.round(m);say(s,`Paid for ${(LM[a.id]||{n:"your old property"}).n}: ${$(Math.round(m))}.`,Math.round(m))}return s}
  case"heist":{const Z=HM[a.id],e=cell();if(e)return e;if(level(s)<Z.lvl)return no(`Not yet. You need to be level ${Z.lvl}.`);
    if((s.hcd[a.id]||0)>now)return no(`Too soon. The place is watching. Try again in ${hm(s.hcd[a.id]-now)}.`);
    if(s.crew.sol<Z.sol||s.crew.cap<Z.cap)return no(`You need ${Z.sol} soldiers${Z.cap?` and ${Z.cap} capos`:""} for this one.`);
    if(s.en<Z.en)return no("Out of energy. A point comes back every three minutes.");
    if(a.ap==="inside"){if(s.friends<4)return no("An inside man needs friends in high places. Throw a few parties first.");if(s.cash<heistCost(Z))return broke();s.cash-=heistCost(Z)}
    spend(Z.en);s.hcd[a.id]=now+Z.cd*MIN;
    if(Math.random()*100<heistFail(s,Z,a.ap)){const l=Math.min(s.crew.sol,ri(1,Math.ceil(Z.sol/3)));s.crew.sol-=l;s.jail=now+(10+level(s)*1.5)*MIN;s.heat=Math.min(100,s.heat+25);say(s,`${Z.no} You lost ${l} men and spent ${hm(s.jail-now)} in a cell.`);return s}
    const pay=Math.round(ri(Z.p[0],Z.p[1])*{quiet:.8,loud:1.4,inside:1}[a.ap]*bonus(s));s.dirty+=pay;s.res+=Z.lvl*4;s.heat=Math.min(100,s.heat+{quiet:4,loud:16,inside:3}[a.ap]);
    say(s,`${Z.ok} +${$(pay)} dirty.`,pay);return s}
  case"choose":{if(!s.ev)return s;const E=EM[s.ev.id],c=E.ch[a.i];if(!c)return s;
    if(c.fx.cash<0&&s.cash<-c.fx.cash*U(s))return broke();
    let fx=c.fx,x=c.x;if(c.alt&&Math.random()<c.alt.p){apply(s,c.fx);fx=c.alt.fx;x=c.alt.x}else apply(s,fx);
    if(fx!==c.fx)apply(s,fx);s.ev=null;s.evT=now+ri(30,90)*MIN;say(s,x);return s}
  case"daily":{const day=new Date(now).toDateString();if(s.dl.d===day)return no("You already took today's gift. Come back tomorrow.");
    const y=new Date(now-864e5).toDateString(),st=s.dl.d===y?s.dl.st+1:1,i=(st-1)%7,v=Math.round(U(s)*DAILY[i]*(1+Math.floor((st-1)/7)*.25));
    s.dl={d:day,st};s.cash+=v;s.res+=10*(i+1);if(i===6)s.en=enMax(s);say(s,`Day ${st} gift: ${$(v)}${i===6?", and a full night's sleep (energy refilled)":""}.`,v);return s}
  case"lay":{const c=layCost(s);if(s.cash<c)return broke();s.cash-=c;s.heat=Math.max(0,s.heat-15);say(s,"You lay low for a few days. A lawyer was paid, and a file went missing.",-c);return s}
  case"open":{if(s.pos.length>=6)return no("Six open trades is plenty. Close one.");if(a.st<1000)return no("The minimum stake is $1,000.");const fee=Math.round(a.st*.002);if(s.cash<a.st+fee)return broke();
    s.cash-=a.st+fee;s.pos.push({id:s.pid++,pair:a.pair,dir:a.dir,st:a.st,lev:a.lev,sl:a.sl||0,tp:a.tp||0,e:s.fx.p[a.pair],t:now});
    say(s,`${a.dir>0?"Bought":"Sold"} ${FM[a.pair].n} with ${$(a.st)} at ${a.lev}x. Broker fee ${$(fee)}.`);return s}
  case"close":{const o=s.pos.find(o=>o.id===a.id);if(o)closePos(s,o,"Closed");return s}
  case"buyOmc":{const o=s.omc;if(a.amt<100)return no("The smallest buy is $100.");if(s.cash<a.amt)return broke();
    const q=a.amt*(1-OMC_FEE)/o.p;s.cash-=a.amt;o.q+=q;o.cost+=a.amt;o.bought=1;say(s,`Bought ${omcQty(q)} Omerta Coin at ${$(o.p)}. The exchange kept ${$(a.amt*OMC_FEE)}.`,-a.amt);return s}
  case"sellOmc":{const o=s.omc,f=a.frac||1;if(o.q<=0)return no("You don't hold any Omerta Coin.");
    const q=o.q*f,net=q*o.p*(1-OMC_FEE),pl=net-o.cost*f;o.cost-=o.cost*f;o.q-=q;if(o.q<1e-9){o.q=0;o.cost=0}
    s.cash+=net;if(pl>0)s.res+=Math.min(60,Math.round(Math.log10(pl+1)*4));say(s,`Sold ${omcQty(q)} Omerta Coin for ${$(net)}: ${pl>=0?"a gain":"a loss"} of ${$(Math.abs(pl))}.`,pl);return s}
  case"omcLive":{if(!(a.p>1000))return s;const o=s.omc;o.anchor=a.p;o.p=a.p;o.live=1;o.lt=now;o.h.push(a.p);if(o.h.length>90)o.h.shift();return s}
  case"card":{const c=CARDS.find(x=>x.id===a.id);if(!c||c.min>level(s))return no("That passport isn't unlocked yet.");s.pc=c.id===cardAt(level(s))?null:c.id;return s}
  case"retire":{if(level(s)<25)return no("You're not ready. Reach level 25 first.");
    const n=fresh(now,{leg:s.leg+1,ach:s.ach,dl:s.dl});n.log.unshift({t:now,x:`Generation ${s.leg+2} begins. Every business now pays ${25}% more, for good.`});n.toast={k:Math.random(),x:n.log[0].x};NOW=0;return n}
  }
  return s;
}

// Classes: where a player stands in the city. Each tier is named for an animal the street already uses for people like you.
export const CLASSES=[
  {min:1,id:"fox",n:"Fox",d:"Small, quick, and nobody remembers your face.",c:"#d98b4a"},
  {min:6,id:"scorpion",n:"Scorpion",d:"People have learned not to step on you.",c:"#c9a24d"},
  {min:12,id:"wolf",n:"Wolf",d:"You run with a crew and eat first.",c:"#9fb2c4"},
  {min:20,id:"shark",n:"Shark",d:"Always moving, always counting, always hungry.",c:"#5fa8c9"},
  {min:30,id:"bear",n:"Bear",d:"Nobody argues with you in your own territory.",c:"#a9784a"},
  {min:42,id:"tiger",n:"Tiger",d:"Rarely seen. Never ignored.",c:"#e08a2e"},
  {min:60,id:"dragon",n:"Dragon",d:"A legend that cities tell each other about.",c:"#e5543c"},
];
export const classOf=l=>CLASSES.filter(c=>c.min<=l).pop();
export const nextClass=l=>CLASSES.find(c=>c.min>l)||null;
// Six measures out of 100 drive the strengths and weaknesses on the profile.
export const profile=s=>{
  const w=worth(s).total,L=level(s),m=s.mate,days=Math.max(1,(s.t-s.t0)/864e5);
  const weapons=ITEMS.filter(i=>i.w&&s.inv[i.id]>0);
  const stat={
    Wealth:Math.min(100,Math.max(0,Math.log10(Math.max(1,w))*100/9)),
    Muscle:Math.min(100,s.wins*2+weapons.length*6+(s.crew?(s.crew.sol||0)*1.5:0)),
    Business:Math.min(100,Object.keys(s.biz).length*11),
    Society:Math.min(100,(m?m.aff*.5:0)+Math.min(s.parties,10)*3+Math.min(s.friends,15)*1.3),
    Markets:Math.min(100,Math.log10(Math.max(1,s.best))*20),
    Cover:Math.max(0,100-s.heat)};
  const rank=Object.entries(stat).sort((a,b)=>b[1]-a[1]);
  const pace=L/days;
  return{stat,strong:rank.slice(0,2).map(x=>x[0]),weak:rank.slice(-2).reverse().map(x=>x[0]),weapons,
    potential:pace>=5?"Meteoric":pace>=2.5?"High":pace>=1?"Steady":"Slow burn",kills:s.wins,
    holdings:{biz:Object.keys(s.biz).length,homes:ITEMS.filter(i=>i.est&&s.est[i.id]),rides:ITEMS.filter(i=>i.k==="Wheels"&&s.inv[i.id]>0),omc:s.omc.q}};
};
