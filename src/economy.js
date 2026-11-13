// Economy catalogue. Pure data and maths, no UI. Add art later as public/img/eco-<id>.jpg (id as shown in the item list).
export const TIERS=["Standard","Select","Prestige","Elite","Legendary"];
const MULT=[1,7,45,320,2400];                       // price multiplier per tier
const BATCH=[1300,600,200,60,12];                    // units in each shared batch: the better the goods, the fewer exist
export const RESTOCK=3*3600*1000;                    // a sold-out batch comes back after 3 hours
const RATE=[.0010,.0013,.0016,.0019,.0023];          // hourly income as a share of price: rarer pays more
// [kind, price multiplier, five names from Standard to Legendary]
const S=(id,n,b,lvl,g)=>({id,n,b,lvl,g});
export const SECTORS=[
S("tr","Transport",40000,3,[
 ["Bikes",.15,"Commuter bike|Cafe racer|Cruiser motorcycle|Superbike|Hand-built superbike"],
 ["Cars",1,"Used hatchback|Family sedan|Sports coupe|Supercar|Hypercar"],
 ["Taxis",.6,"One yellow cab|Fleet of five|Airport rank|City radio network|City-wide licence"],
 ["Limousines",2,"Stretch sedan|Stretch SUV|Presidential limousine|Armoured limousine|Gold-trim limousine"],
 ["Pickups",.8,"Farm pickup|Crew-cab pickup|Off-road pickup|Armoured pickup|Desert-rally pickup"],
 ["Buses",2.5,"Minibus|City bus|Coach|Double-decker line|Luxury touring fleet"],
 ["Lorries",3,"Box lorry|Tipper|Long-haul rig|Refrigerated convoy|Continental haulage fleet"],
 ["Trains",20,"Freight wagon|Commuter line|Night sleeper|Bullet train|Private rail empire"],
 ["Boats",4,"Fishing boat|Speedboat|Cabin cruiser|Sport yacht|Motor yacht"],
 ["Canoes",.03,"Plastic canoe|Cedar canoe|Racing kayak|Carbon racing canoe|Royal regatta canoe"],
 ["Ships",60,"Coastal ferry|Cargo ship|Container ship|Cruise liner|Supertanker"],
 ["Helicopters",25,"Two-seater|Tour helicopter|Executive helicopter|Armoured helicopter|Heavy-lift helicopter"],
 ["Planes",80,"Crop duster|Turboprop|Regional jet|Airliner|Wide-body airliner"],
 ["Jets",300,"Light jet|Midsize jet|Private jet|Long-range jet|Flying penthouse"]]),
S("st","Science & Tech",60000,6,[
 ["Pharmacies",1,"Corner pharmacy|Chain of five|Hospital supplier|Regional distributor|Patent house"],
 ["Labs",4,"Teaching lab|Testing lab|Research lab|Genome lab|Frontier institute"],
 ["Phones",.6,"Repair stall|Phone shop|Assembly line|Handset brand|Global handset maker"],
 ["Laptops",.8,"Refurb shop|Reseller|Assembly plant|Laptop brand|Flagship laptop empire"],
 ["Chips",12,"Chip testing|Packaging plant|Small foundry|Mid-size fab|Leading-edge fab"],
 ["Car inventions",6,"Brake patent|Battery pack design|Self-driving module|Solid-state battery|Flying-car platform"],
 ["Ship inventions",8,"Hull coating|Efficient engine|Autonomous navigation|Hydrofoil design|Nuclear cargo drive"],
 ["Robotics",10,"Warehouse arm|Delivery robot|Factory line|Humanoid worker|Thinking robot"],
 ["Rockets",40,"Sounding rocket|Small launcher|Reusable booster|Heavy launcher|Crewed super-heavy"],
 ["Software",1.5,"App studio|Cloud service|Security firm|Search engine|Operating system"]]),
S("sp","Space",5e6,28,[
 ["Satellites",1,"Weather satellite|Comms satellite|Spy satellite|Constellation|Global network"],
 ["Stations",8,"Orbital lab|Cargo depot|Hotel station|Research city|Ring habitat"],
 ["Moon",12,"Moon claim|Lunar base|Helium-3 mine|Moon town|Lunar capital"],
 ["Mars",30,"Rover contract|Mars outpost|Dome colony|Mars city|Mars republic"],
 ["Asteroids",20,"Survey rights|Iron rock|Platinum rock|Rare-earth belt|Whole belt licence"]]),
S("mi","Mining & Energy",200000,10,[
 ["Mines",1,"Quarry|Coal pit|Copper mine|Gold mine|Diamond mine"],
 ["Oil",3,"Roadside well|Field of wells|Refinery|Offshore rig|Pipeline empire"],
 ["Gas",2.5,"Gas station|Gas field|Liquefaction plant|Export terminal|Continental pipeline"],
 ["Power",2,"Diesel plant|Wind farm|Solar park|Hydro dam|Nuclear plant"],
 ["Rare metals",6,"Tin lease|Nickel lease|Lithium brine|Cobalt belt|Rare-earth monopoly"]]),
S("re","Real estate",150000,8,[
 ["Housing",1,"Rental flat|Terraced block|Gated estate|Luxury towers|New district"],
 ["Offices",3,"Office floor|Office block|Business park|Skyscraper|Landmark tower"],
 ["Retail",2,"Kiosk row|Strip mall|Shopping centre|Flagship avenue|Mega mall"],
 ["Hotels",4,"Guesthouse|Boutique hotel|Resort|Grand hotel|Palace hotel"],
 ["Land",.8,"Empty plot|Farm edge|Coastal strip|Prime development|Private island"]]),
S("ag","Agriculture",30000,4,[
 ["Crops",1,"Maize field|Wheat farm|Coffee estate|Vineyard|Saffron fields"],
 ["Livestock",1.5,"Chicken coop|Dairy herd|Cattle ranch|Racehorse stud|Wagyu estate"],
 ["Fishing",1.2,"Net boat|Trawler|Tuna fleet|Fish-farm coast|Caviar farm"],
 ["Equipment",.8,"Tractor|Harvester|Irrigation network|Drone fleet|Seed-lab monopoly"],
 ["Food brands",2,"Market stall|Packing house|Regional brand|National brand|World food label"]]),
S("hf","Helping foundations",80000,5,[
 ["Clinics",1,"Village clinic|Field hospital|Children's hospital|Medical college|Global health fund"],
 ["Schools",.8,"Reading room|Primary school|Academy|University wing|Scholarship empire"],
 ["Relief",1.2,"Food drive|Water wells|Disaster team|Refugee shelter|Relief airline"],
 ["Arts & culture",1.5,"Gallery nook|Theatre|Museum wing|Opera house|National museum"],
 ["Faith & charity",.7,"Chapel fund|Soup kitchen|Cathedral trust|Pilgrim network|Papal-scale endowment"]]),
S("mil","Military",500000,18,[
 ["Weapons",1,"Pistol lots|Rifle contract|Armoured trucks|Artillery line|Missile line"],
 ["Security",.8,"Night guards|Escort firm|Private army|Contractor empire|Shadow ministry"],
 ["Vehicles",4,"Armoured jeeps|Tanks|Gunships|Fighter wing|Stealth wing"],
 ["Navy",12,"Patrol boats|Frigates|Destroyers|Carrier group|Submarine fleet"],
 ["Intel",3,"Informants|Wiretap firm|Surveillance net|Cyber unit|Global listening post"]]),
S("me","Media & entertainment",50000,7,[
 ["Radio",.6,"Pirate radio|Local station|Network|Satellite radio|Global radio"],
 ["Film",3,"Short film|B-movie studio|Studio lot|Blockbuster studio|Hollywood major"],
 ["Music",1.5,"Pressing plant|Label|Stadium tour|Streaming service|Music empire"],
 ["Casinos",5,"Card room|Local casino|Resort casino|Strip casino|Monte Carlo house"],
 ["Sports",2.5,"Boxing gym|Local club|League team|Champions club|Olympic franchise"]]),
S("fi","Finance",300000,12,[
 ["Banks",2,"Pawn shop|Savings bank|Commercial bank|Merchant bank|Central-bank partner"],
 ["Insurance",1.5,"Policy desk|Insurance agency|Underwriter|Reinsurer|Lloyd's-scale syndicate"],
 ["Funds",3,"Betting pool|Small fund|Hedge fund|Sovereign partner|Master fund"],
 ["Exchanges",8,"Broker seat|Local exchange|Regional exchange|Global exchange|Commodity monopoly"]]),
S("fa","Food & hospitality",25000,2,[
 ["Restaurants",1,"Street stall|Trattoria|Fine dining|Michelin star|Restaurant empire"],
 ["Bars & clubs",1.4,"Back-street bar|Cocktail lounge|Nightclub|Superclub|Club circuit"],
 ["Bakeries",.5,"Corner bakery|Bakery chain|Patisserie|Luxury patisserie|Royal baker"],
 ["Drinks",2,"Home distillery|Craft brewery|Winery|Whisky house|Champagne house"]]),
S("lx","Fashion & luxury",40000,9,[
 ["Tailors",.8,"Alterations|Tailor shop|Savile-row cutter|Couture house|Royal tailor"],
 ["Jewellery",3,"Pawn jewellery|Jeweller|Gem dealer|High jewellery|Crown jeweller"],
 ["Watches",2.5,"Watch repair|Watch dealer|Swiss maker|Collector maison|Grand complication house"],
 ["Perfume",1.2,"Market perfume|Boutique scents|Perfume brand|Luxury fragrance|Heritage perfumer"]])
];
const MORE={
 tr:[["Scooters",.08,"Kick scooter fleet|Moped|Maxi scooter|Electric scooter chain|Collector scooters"],["Vans",1.2,"Panel van|Delivery van|Camper van|Armoured van|Mobile office"],["Trams",18,"Old tram|City tram|Light rail|Metro line|Underground network"],["Cable cars",15,"Hill lift|Ski lift|Gondola line|Mountain network|Alpine empire"],["Ferries",14,"River ferry|Car ferry|Fast ferry|Island ferry line|Channel operator"],["Submarines",120,"Research sub|Tourist sub|Cargo sub|Deep-sea sub|Silent luxury sub"],["Hovercraft",9,"Swamp craft|Rescue hovercraft|Cross-channel craft|Military hovercraft|Luxury hovercraft"],["Airships",70,"Advert blimp|Sightseeing airship|Cargo airship|Cruise airship|Sky hotel"]],
 st:[["Drones",1.8,"Toy drones|Camera drones|Delivery drones|Swarm fleet|Autonomous air force"],["Biotech",14,"Test kitchen|Vaccine line|Gene therapy|Lab-grown organs|Longevity clinic"],["AI",25,"Chatbot shop|Data centre|Model lab|Reasoning lab|General intelligence lab"],["Telecom",9,"Phone masts|Regional carrier|National carrier|Undersea cable|Satellite carrier"],["Energy tech",12,"Solar panels|Battery plant|Fuel cells|Fusion pilot|Fusion grid"],["Gaming",3,"Arcade|Indie studio|Console game|Franchise|Platform holder"],["Medical devices",6,"Wheelchair maker|Scanner maker|Implant maker|Surgical robots|Artificial heart"]],
 sp:[["Rockets",15,"Hobby rockets|Sounding launcher|Orbital launcher|Heavy booster|Starship fleet"],["Telescopes",6,"Backyard scope|Observatory|Space telescope|Deep-field array|Planet-hunter"],["Space tourism",10,"Balloon ride|Suborbital hop|Orbital trip|Lunar flyby|Moon hotel"],["Launch pads",18,"Test pad|Coastal pad|Spaceport|Equatorial port|Floating port"]],
 mi:[["Wind & sun",1.5,"Rooftop panels|Wind turbine|Solar farm|Offshore wind|Desert solar array"],["Water",1,"Borehole|Treatment plant|Desalination|Reservoir|Continental aqueduct"],["Fuel stations",2,"Roadside pump|Station chain|Highway stops|National brand|Fuel empire"],["Gold & silver",5,"Panning rights|Small seam|Deep mine|Mountain vein|Motherlode"],["Gems",8,"Rough stones|Cutting shop|Ruby mine|Emerald mine|Blue diamond mine"]],
 re:[["Warehouses",1.5,"Storage unit|Warehouse|Cold storage|Logistics park|Port depot"],["Car parks",.9,"Back lot|Multi-storey|Airport parking|City garages|Parking empire"],["Farms & ranches",1.2,"Smallholding|Ranch|Wine estate|Vast estate|Royal estate"],["Stadiums",10,"Training ground|Small arena|City stadium|National stadium|World-cup bowl"],["Airports",30,"Airstrip|Regional airport|Hub airport|Mega hub|Aerotropolis"]],
 ag:[["Greenhouses",1,"Tomato tunnels|Flower house|Glass farm|Vertical farm|Orchid dynasty"],["Tea & coffee",1.5,"Smallholding|Cooperative|Estate|Single-origin estate|Legendary reserve"],["Timber",2,"Woodlot|Sawmill|Forest lease|Hardwood forest|Ancient forest"],["Cattle trade",3,"Market pitch|Auction yard|Export herd|Breeding line|Champion bloodline"],["Seeds & fertilizer",2,"Agro shop|Fertilizer plant|Seed bank|Gene-edited seed|World seed vault"]],
 hf:[["Orphanages",.8,"Small home|Boarding house|Children's village|Campus|Network of homes"],["Hospitals",3,"Dispensary|Cottage hospital|General hospital|Teaching hospital|Medical city"],["Research funds",2.5,"Small grant|Prize fund|Institute|Nobel-scale fund|Cure foundation"],["Wildlife",1,"Sanctuary pen|Reserve|National park|Marine park|Continental reserve"]],
 mil:[["Aircraft",15,"Trainer wing|Transport wing|Fighter wing|Bomber wing|Stealth fleet"],["Armour",5,"Plated cars|Light armour|Main battle tanks|Heavy armour|Rolling fortress"],["Bases",10,"Outpost|Barracks|Fortified base|Airbase|Hidden island base"],["Defence systems",12,"Radar post|Anti-air battery|Missile shield|Coastal shield|National dome"],["Training",2,"Shooting range|Boot camp|Academy|Elite school|Special-forces school"]],
 me:[["Newspapers",1.2,"Local sheet|Daily paper|Tabloid|National paper|Global press"],["TV",4,"Cable channel|Regional channel|National network|Sports network|Global network"],["Theatres",2,"Cinema|Playhouse|Opera house|Concert hall|Royal theatre"],["Publishing",1.5,"Print shop|Paperbacks|Publishing house|Big publisher|Literary empire"],["Streaming",6,"Video site|Streaming app|Original studio|Global platform|World stage"]],
 fi:[["Currency",15,"Exchange booth|Money changer|Currency desk|Reserve trader|Private mint"],["Pensions",4,"Burial society|Provident fund|Pension fund|Mega pension|Sovereign fund"],["Lending",2,"Loan desk|Microfinance|Mortgage lender|Corporate lender|Lender of last resort"],["Crypto",3,"Mining rig|Mining farm|Exchange|Stablecoin issuer|Reserve coin"]],
 fa:[["Hotels & lodges",3,"Lodge|Inn|Boutique hotel|Five-star hotel|Palace hotel"],["Cafes",.6,"Kiosk|Cafe|Roastery|Chain|World brand"],["Catering",1.2,"Wedding caterer|Event caterer|Airline catering|Stadium catering|State banquets"],["Supermarkets",4,"Corner mart|Supermarket|Hypermarket|National chain|Global chain"],["Fast food",2,"Burger van|Food court|Drive-in|Franchise|World franchise"]],
 lx:[["Cars & coachbuilders",6,"Custom shop|Restorations|Coachbuilder|Bespoke maker|Hand-built legend"],["Art",5,"Prints|Gallery|Auction house|Old masters|Museum collection"],["Yachts",20,"Day boat|Charter yacht|Mega yacht|Giga yacht|Floating palace"],["Cigars & spirits",2,"Tobacconist|Cigar lounge|Rare rum|Vintage cognac|Private cellar"],["Wedding & events",1.5,"Planner|Venue|Destination weddings|Royal events|Celebrity events"]]
};
Object.keys(MORE).forEach(k=>{const s=SECTORS.find(x=>x.id===k);MORE[k].forEach(g=>{if(!s.g.some(h=>h[0]===g[0]))s.g.push(g)})});
export const KINDS=[];SECTORS.forEach(s=>s.g.forEach((g,i)=>{const sl=s.id+"_"+i;KINDS.push({sec:s.id,id:sl,n:g[0],k:g[1],names:g[2].split("|")})}));
export const ITEMS_E=[];SECTORS.forEach(s=>KINDS.filter(k=>k.sec===s.id).forEach(k=>k.names.forEach((n,t)=>{
  const p=Math.round(s.b*k.k*MULT[t]/100)*100||100;
  ITEMS_E.push({id:k.id+"_"+t,sec:s.id,kind:k.id,kn:k.n,n,t,p,batch:BATCH[t],lvl:s.lvl+t*5,y:p*RATE[t]})})));
export const EM=Object.fromEntries(ITEMS_E.map(i=>[i.id,i]));
export const SM=Object.fromEntries(SECTORS.map(s=>[s.id,s]));
export const ecoIncome=s=>Object.entries(s.eco||{}).reduce((a,[k,q])=>a+(EM[k]?EM[k].y*q:0),0);
export const ecoValue=s=>Object.entries(s.eco||{}).reduce((a,[k,q])=>a+(EM[k]?EM[k].p*q:0),0);
// What is on the shelf right now, given the shared record for an item ({n, t} or nothing).
export const shelf=(it,rec,now)=>{if(!rec||typeof rec.n!=="number")return{left:it.batch,out:0};if(rec.n>0)return{left:Math.min(rec.n,it.batch),out:0};
  return now>=rec.t?{left:it.batch,out:0}:{left:0,out:rec.t-now}};

// Cities and territory. One shared map: whoever holds a place holds it for everyone.
export const LTIERS=[["Local area",3e5,8],["Town",6e6,15],["City",1e8,22],["Big city",2e9,30],["Capital city",5e10,38],["Country",1.5e12,46],["Countries",4e13,54],["Continent",1e15,62],["World",5e16,75]];
const L=(t,names)=>names.split("|").map((n,i)=>{const[nm,m]=n.split("*");return{id:"l"+t+"_"+i,t,n:nm,p:Math.round(LTIERS[t][1]*(+m||1)/1000)*1000}});
export const LAND=[
 ...L(0,"Harbor Row*1|Old Quarter*1.3|Market Street*.8|Rail Yards*.6|Lakeside*1.5|Hillcrest*1.8"),
 ...L(1,"Ashford*1|Port Elmar*1.4|Stonebridge*.8|Red Creek*.6|Marlow*1.2"),
 ...L(2,"Naples*1|Marseille*1.2|Osaka*1.6|Cape Town*1.1|Lagos*1.3|Mombasa*.7"),
 ...L(3,"New York*2|Tokyo*1.8|São Paulo*1|Mumbai*1.1|Shanghai*1.6|Mexico City*.9|Cairo*.8"),
 ...L(4,"Washington D.C.*2|London*1.8|Paris*1.6|Rome*1.2|Beijing*1.9|Nairobi*.7|Brasília*.8|Canberra*.6"),
 ...L(5,"United States*2.4|China*2|Japan*1.2|United Kingdom*1.1|Italy*.9|France*1|Brazil*.9|Kenya*.4"),
 ...L(6,"Western Europe*2|North American bloc*2.4|Gulf States*1.4|East Africa*.5|Southeast Asia*1.3|Nordic Union*.8|Caribbean*.4"),
 ...L(7,"North America*2|Europe*1.8|Asia*2.5|South America*1|Africa*1.1|Oceania*.5|Antarctica*.15"),
 ...L(8,"The World*1")];
export const LM=Object.fromEntries(LAND.map(l=>[l.id,l]));
export const landRate=l=>l.p*.0006;                 // hourly income from holding a place
export const takeoverPrice=p=>p*3;                  // buying someone out costs three times the last price
export const landIncome=s=>Object.keys(s.land||{}).reduce((a,k)=>a+(LM[k]?landRate({p:(s.land[k].p)||LM[k].p}):0),0);
// Ids that have art in public/img: eco-<id>.jpg for goods, office-1..3.jpg for offices. Add ids here as pictures arrive.
export const ART=new Set([]);
export const OFFICE_ART=new Set([]);
