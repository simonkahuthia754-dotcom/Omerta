import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// OMERTÀ — a mafia empire idle game
// v3: multiplayer wire + trade board (real shared persistence),
// realistic vehicle tiers, bodyguards, harder jail, hacking
// minigame, forex desk, market sparklines, world travel by
// bike/ship/plane, fictional dons, secret societies & SWAT raids.
// ============================================================

// AdMob only works inside a compiled native Android app (via a Capacitor/AdMob
// plugin or similar) — it cannot serve ads inside this browser-based artifact.
// These are stored here so they're ready to paste into your native project's
// ad-manager config once you wrap this build with Capacitor/PWABuilder/Appilix.
const ADMOB_CONFIG = {
  publisherId: "pub-1268492465575554",
  appId: "ca-app-pub-1268492465575554~2328637637",
  bannerMain: "ca-app-pub-1268492465575554/1015555967",
  interstitial: "ca-app-pub-1268492465575554/1864090437",
  nativeAdvanced: "ca-app-pub-1268492465575554/8402362448",
  openMain: "ca-app-pub-1268492465575554/8239439862",
  rewarded: "ca-app-pub-1268492465575554/5317868254",
};

// AdMobManager — talks to the real Capacitor AdMob plugin WITHOUT a static
// import. Capacitor registers every installed native plugin on
// window.Capacitor.Plugins at runtime, so this looks it up dynamically:
// no import means the web build can never fail to compile even if the
// plugin isn't installed yet, and every method is wrapped so a failed ad
// (no fill, offline, plugin missing, anything) can never crash the game —
// worst case it just silently doesn't show an ad. Install the plugin with
// `npm install @capacitor-community/admob` and `npx cap sync android` and
// this activates itself automatically, no code changes needed.
class AdMobManager {
  constructor() {
    this.plugin = null;
    this.available = false;
    this.initialized = false;
  }
  _getPlugin() {
    try {
      return (typeof window !== "undefined" && window.Capacitor?.Plugins?.AdMob) || null;
    } catch (e) {
      return null;
    }
  }
  async init() {
    if (this.initialized) return;
    this.initialized = true;
    this.plugin = this._getPlugin();
    if (!this.plugin) { this.available = false; return; }
    try {
      await this.plugin.initialize({ requestTrackingAuthorization: true });
      this.available = true;
    } catch (e) {
      console.warn("[AdMob] init failed, ads disabled for this session:", e?.message);
      this.available = false;
    }
  }
  async showInterstitial() {
    if (!this.available || !this.plugin) return;
    try {
      await this.plugin.prepareInterstitial({ adId: ADMOB_CONFIG.interstitial });
      await this.plugin.showInterstitial();
    } catch (e) {
      console.warn("[AdMob] interstitial failed silently:", e?.message);
    }
  }
  async showRewardedAd() {
    if (!this.available || !this.plugin) return false;
    try {
      await this.plugin.prepareRewardVideoAd({ adId: ADMOB_CONFIG.rewarded });
      const result = await this.plugin.showRewardVideoAd();
      return !!result?.rewardItemAmount;
    } catch (e) {
      console.warn("[AdMob] rewarded ad failed silently:", e?.message);
      return false;
    }
  }
  async showBanner() {
    if (!this.available || !this.plugin) return;
    try {
      await this.plugin.showBanner({ adId: ADMOB_CONFIG.bannerMain, position: "BOTTOM_CENTER", adSize: "BANNER" });
    } catch (e) {
      console.warn("[AdMob] banner failed silently:", e?.message);
    }
  }
}
const adManager = new AdMobManager();

// Fullscreen — hides the Android status bar via the Capacitor StatusBar
// plugin, same safe runtime-lookup pattern as AdMob above (no static
// import, so it's a total no-op until you install the plugin, never a
// build risk). Install with: npm install @capacitor/status-bar
async function goFullscreen() {
  try {
    const StatusBar = typeof window !== "undefined" && window.Capacitor?.Plugins?.StatusBar;
    if (StatusBar) {
      await StatusBar.hide();
      if (window.Capacitor?.Plugins?.StatusBar?.setOverlaysWebView) {
        await StatusBar.setOverlaysWebView({ overlay: true });
      }
    }
  } catch (e) {
    console.warn("[fullscreen] StatusBar plugin not available yet:", e?.message);
  }
}

// Ad-reward cash brackets, keyed to player LEVEL (not wealth) — levels 1-5
// span $50 up to $1M as requested, then each higher bracket scales further
// so a max-level player watching an ad still gets something meaningful.
const AD_CASH_BRACKETS = [
  { maxLevel: 1, min: 50, max: 5000 },
  { maxLevel: 2, min: 500, max: 40000 },
  { maxLevel: 3, min: 5000, max: 200000 },
  { maxLevel: 4, min: 20000, max: 550000 },
  { maxLevel: 5, min: 80000, max: 1000000 },
  { maxLevel: 10, min: 500000, max: 5000000 },
  { maxLevel: 20, min: 3000000, max: 25000000 },
  { maxLevel: 40, min: 20000000, max: 150000000 },
];
function adCashReward(level) {
  const bracket = AD_CASH_BRACKETS.find((b) => level <= b.maxLevel) || AD_CASH_BRACKETS[AD_CASH_BRACKETS.length - 1];
  return Math.round(bracket.min + Math.random() * (bracket.max - bracket.min));
}
// Real cooldown between ad watches — not a "no cooldown" gimmick. Each ad
// reward type has its own independent cooldown so it's never just one button
// to spam.
const AD_COOLDOWN_SECONDS = 90;

// ============================================================
// STORAGE — Firebase, Supabase, or localStorage, one line to switch
// ============================================================
// The original artifact ran inside Claude.ai, which provides a real
// cross-device storage API for free (that's how the global wire, trade
// board, and leaderboard worked). Outside Claude.ai that needs a real
// backend. This adapter supports all three — change STORAGE_PROVIDER
// below to switch. Firebase and Supabase are added as real dependencies
// in package.json so the build never fails to compile even before you've
// filled in real project keys; until you do, every provider transparently
// falls back to localStorage at RUNTIME (not build time), so the app
// always works — multiplayer just stays device-local until configured.
//
// To go live: create a free Firebase or Supabase project, paste your real
// keys into FIREBASE_CONFIG or SUPABASE_CONFIG below, and set
// STORAGE_PROVIDER to "firebase" or "supabase".
const STORAGE_PROVIDER = "localStorage"; // "firebase" | "supabase" | "localStorage"

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  databaseURL: "https://your-app-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
};
const SUPABASE_CONFIG = {
  url: "https://your-project.supabase.co",
  anonKey: "your-anon-key",
};

class StorageAdapter {
  constructor(provider) {
    this.provider = provider;
    this.ready = this._init();
  }

  async _init() {
    try {
      if (this.provider === "firebase") {
        const { initializeApp } = await import("firebase/app");
        const { getDatabase, ref, get, set, remove } = await import("firebase/database");
        this.app = initializeApp(FIREBASE_CONFIG);
        this.db = getDatabase(this.app);
        this._fb = { ref, get, set, remove };
      } else if (this.provider === "supabase") {
        const { createClient } = await import("@supabase/supabase-js");
        this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      }
    } catch (e) {
      console.warn(`[storage] ${this.provider} unavailable, using localStorage:`, e?.message);
      this.provider = "localStorage";
    }
  }

  async get(key, shared) {
    await this.ready;
    try {
      if (this.provider === "firebase") {
        const snap = await this._fb.get(this._fb.ref(this.db, `${shared ? "shared" : "player"}/${key}`));
        return snap.exists() ? { key, value: snap.val(), shared: !!shared } : null;
      }
      if (this.provider === "supabase") {
        const { data, error } = await this.supabase.from("storage").select("value").eq("key", `${shared ? "shared" : "player"}:${key}`).single();
        if (error || !data) return null;
        return { key, value: data.value, shared: !!shared };
      }
    } catch (e) { console.warn(`[storage] get(${key}) failed, falling back:`, e?.message); }
    const raw = localStorage.getItem("omerta_" + key);
    return raw ? { key, value: raw, shared: !!shared } : null;
  }

  async set(key, value, shared) {
    await this.ready;
    try {
      if (this.provider === "firebase") {
        await this._fb.set(this._fb.ref(this.db, `${shared ? "shared" : "player"}/${key}`), value);
        return { key, value, shared: !!shared };
      }
      if (this.provider === "supabase") {
        const { error } = await this.supabase.from("storage").upsert({ key: `${shared ? "shared" : "player"}:${key}`, value });
        if (error) throw error;
        return { key, value, shared: !!shared };
      }
    } catch (e) { console.warn(`[storage] set(${key}) failed, falling back:`, e?.message); }
    localStorage.setItem("omerta_" + key, value);
    return { key, value, shared: !!shared };
  }

  async delete(key, shared) {
    await this.ready;
    try {
      if (this.provider === "firebase") {
        await this._fb.remove(this._fb.ref(this.db, `${shared ? "shared" : "player"}/${key}`));
        return { key, deleted: true, shared: !!shared };
      }
      if (this.provider === "supabase") {
        await this.supabase.from("storage").delete().eq("key", `${shared ? "shared" : "player"}:${key}`);
        return { key, deleted: true, shared: !!shared };
      }
    } catch (e) { console.warn(`[storage] delete(${key}) failed, falling back:`, e?.message); }
    localStorage.removeItem("omerta_" + key);
    return { key, deleted: true, shared: !!shared };
  }

  async list(prefix) {
    await this.ready;
    try {
      if (this.provider === "supabase") {
        const { data, error } = await this.supabase.from("storage").select("key").like("key", `shared:${prefix || ""}%`);
        if (error) throw error;
        return { keys: data.map((r) => r.key.replace("shared:", "")) };
      }
      // Firebase Realtime Database doesn't have a native prefix-query here without
      // extra indexing rules, so it also falls through to localStorage bookkeeping.
    } catch (e) { console.warn(`[storage] list() failed, falling back:`, e?.message); }
    const keys = Object.keys(localStorage).filter((k) => k.startsWith("omerta_" + (prefix || "")));
    return { keys: keys.map((k) => k.replace("omerta_", "")) };
  }
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = new StorageAdapter(STORAGE_PROVIDER);
}

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Bebas+Neue&family=Inter:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;600;700&display=swap');
`;

// ---------- identity ----------
// Stable per-device identity — resolved synchronously from localStorage so
// it's the same every single session (this is what fixes progress and
// identity resetting every time the app is closed). Random generation only
// happens once, the very first time the app ever runs on this device.
const PLAYER_NAMES = ["Nunzio", "Vittoria", "Cassian", "Marchetti", "Delgado", "Kaine", "Rosalind", "Torino"];
function generateRandomName() {
  return PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)] + " " + Math.floor(Math.random() * 90 + 10);
}
function resolvePlayerIdentity() {
  try {
    let id = localStorage.getItem("omerta_player_id");
    let name = localStorage.getItem("omerta_player_name");
    if (!id) { id = "p_" + Math.random().toString(36).slice(2, 8); localStorage.setItem("omerta_player_id", id); }
    if (!name) { name = generateRandomName(); localStorage.setItem("omerta_player_name", name); }
    return { id, name };
  } catch (e) {
    return { id: "p_" + Math.random().toString(36).slice(2, 8), name: generateRandomName() };
  }
}
const { id: PLAYER_ID, name: DEFAULT_PLAYER_NAME } = resolvePlayerIdentity();

// ---------- story ----------
const STORY_BEATS = [
  { level: 1, title: "The Arrival", text: "The bus door hisses open on a wet Newark corner. Nobody here knows your name — exactly how you want it. Five hundred dollars, a duffel bag, and a city that eats the careless." },
  { level: 2, title: "First Steps", text: "You learn the corners fast: which shopkeepers pay quietly, which ones need convincing, and which ones already have someone else's name on their protection. It's a small world, and you're smaller in it. For now." },
  { level: 3, title: "First Blood", text: "Word travels fast after the pier job. A man in a good coat buys you a coffee and doesn't introduce himself. 'The Commission notices earners,' he says. 'Try not to get noticed by anyone else.'" },
  { level: 4, title: "A Name Worth Using", text: "People stop asking who sent you. They just do what you ask. It happens quietly, the way real power always does — nobody announces it, you just notice one day that the room got a little more careful." },
  { level: 5, title: "The Cartel Reaches Out", text: "A number with no name texts you a location and a time. Reyes doesn't do meetings in public. If you're going, go alone — and go clean." },
  { level: 6, title: "Two Masters", text: "The Commission wants tribute. Reyes wants product moved. Both are watching how you split your loyalty — and both remember exactly how you split it." },
  { level: 7, title: "The Ghost in the Wires", text: "A kid who calls himself Cipher slides into your DMs. 'I can make your paper trail disappear — for a price. I can also make it appear, if you cross me.'" },
  { level: 8, title: "Eyes From Washington", text: "Your fixer finds a business card taped under your car mirror. Federal Task Force, no name, just a number. Someone downtown has started a file with your face in it." },
  { level: 9, title: "The First Real Money", text: "You stop counting in hundreds and start counting in thousands without thinking about it. The math has changed. So has what people expect from you." },
  { level: 10, title: "Blue Lights", text: "A SWAT van idles two blocks from your last front for six hours straight. They didn't move in. This time." },
  { level: 11, title: "Competition", text: "Someone else is running the same play you are, three blocks over, and doing it well. The city isn't big enough to ignore that forever." },
  { level: 12, title: "A Seat At The Table", text: "The old men of the Commission finally send for you directly. A seat opens at their table tonight — or a folding chair at the end of it, depending on how the conversation goes." },
  { level: 14, title: "Crossing Borders", text: "Your operation stops fitting in one city. Newark was the beginning, not the ceiling — and every new territory brings its own rules, its own rivals, its own version of you to compete with." },
  { level: 15, title: "The Order", text: "An invitation with no return address, sealed in black wax. The Order doesn't recruit — it selects. Someone above the Commission has been watching longer than you knew." },
  { level: 17, title: "The Cost of Scale", text: "Running a real empire means real casualties — of money, of people, of the version of yourself that stepped off that bus. Nobody warns you which one goes first." },
  { level: 20, title: "Palermo Calls", text: "The name that started all of this finally sends for you. Where the Cosa Nostra began, and where every real don eventually has to answer for what they built." },
  { level: 24, title: "Old Ghosts", text: "Someone from Newark recognizes you at a table where nobody's supposed to recognize anybody. The past doesn't care how far you've come." },
  { level: 28, title: "The Long Game", text: "You stop reacting to threats and start setting them in motion three moves ahead. That's the difference between running from something and running it." },
  { level: 34, title: "A Reckoning", text: "Every empire this size makes enemies faster than it makes friends. The Commission, the Cartel, the Feds, the Order — someone's patience is finally running out, and you don't yet know whose." },
  { level: 40, title: "What's Left to Want", text: "There's a version of this life where you have everything and the only question left is what any of it was actually for. You're close enough now to ask it seriously." },
];

// ---------- dons (fictional, original characters) ----------
const DONS = [
  { id: "torrino", name: "Don Torrino", icon: "🎩", org: "The Commission", desc: "Old-school New York boss. Believes tribute is respect made liquid." },
  { id: "reyes", name: "Esteban Reyes", icon: "🐍", org: "Reyes Cartel", desc: "Runs supply from three countries. Never raises his voice, never needs to." },
  { id: "cipher", name: "Cipher", icon: "💻", org: "The Wire", desc: "Nobody's seen his face. Everybody's seen his work." },
  { id: "graves", name: "Agent Graves", icon: "🦅", org: "Federal Task Force", desc: "Been building the same case for six years. Patient, methodical, close." },
  { id: "sable", name: "Madame Sable", icon: "🂡", org: "The Order", desc: "A society older than any family here. Membership isn't applied for." },
  { id: "castellan", name: "The Castellan", icon: "🗝️", org: "Global Holding Council", desc: "Represents money so old it doesn't have a face anymore. Speaks in numbers." },
  { id: "vesper", name: "Vesper Cho", icon: "🌐", org: "Continental Syndicate", desc: "Runs six ports on three continents from a phone she never puts down." },
];

// ---------- crimes ----------
// Crimes are tiered to WEALTH_CLASSES (Broke=0 ... Untouchable=6). A millionaire
// has no business pickpocketing $40 — the job list below scales with what you're
// actually worth, same as the unlock logic that filters it at render time.
const CRIMES = [
  { id: "pickpocket", name: "Pickpocket the docks", tier: 0, energy: 5, heat: 2, minCash: 15, maxCash: 45, xp: 8, risk: 0.05, level: 1 },
  { id: "shakedown", name: "Shake down a shopkeeper", tier: 0, energy: 10, heat: 5, minCash: 40, maxCash: 110, xp: 16, risk: 0.10, level: 1 },
  { id: "smuggle", name: "Run contraband off the pier", tier: 1, energy: 18, heat: 9, minCash: 300, maxCash: 700, xp: 60, risk: 0.15, level: 2 },
  { id: "heist", name: "Knock over a jewelry courier", tier: 1, energy: 30, heat: 16, minCash: 800, maxCash: 1800, xp: 110, risk: 0.22, level: 4 },
  { id: "cartel_run", name: "Run product for Reyes", tier: 2, energy: 26, heat: 20, minCash: 3000, maxCash: 7000, xp: 260, risk: 0.20, level: 6 },
  { id: "hack_job", name: "Hit a bank's back-end (Cipher's job)", tier: 2, energy: 22, heat: 14, minCash: 5000, maxCash: 11000, xp: 320, risk: 0.18, level: 7 },
  { id: "hit", name: "Take a contract hit", tier: 3, energy: 45, heat: 28, minCash: 18000, maxCash: 40000, xp: 700, risk: 0.30, level: 9 },
  { id: "vault_job", name: "Crack a private vault", tier: 3, energy: 55, heat: 35, minCash: 45000, maxCash: 95000, xp: 850, risk: 0.28, level: 11 },
  { id: "cartel_border", name: "Run the Reyes border corridor", tier: 4, energy: 60, heat: 40, minCash: 180000, maxCash: 400000, xp: 1800, risk: 0.32, level: 14 },
  { id: "casino_hit", name: "Hit a rival's casino count room", tier: 4, energy: 65, heat: 45, minCash: 300000, maxCash: 650000, xp: 2100, risk: 0.30, level: 16 },
  { id: "bank_raid", name: "Coordinate a major bank raid", tier: 5, energy: 80, heat: 55, minCash: 2200000, maxCash: 5000000, xp: 6000, risk: 0.34, level: 22 },
  { id: "offshore_raid", name: "Seize an offshore holding company", tier: 5, energy: 85, heat: 60, minCash: 3500000, maxCash: 8000000, xp: 7500, risk: 0.36, level: 26 },
  { id: "hostile_takeover", name: "Hostile takeover of a rival empire", tier: 6, energy: 100, heat: 70, minCash: 25000000, maxCash: 55000000, xp: 20000, risk: 0.38, level: 34 },
  { id: "topple_cartel", name: "Move on a cartel's entire territory", tier: 6, energy: 100, heat: 75, minCash: 35000000, maxCash: 70000000, xp: 24000, risk: 0.40, level: 38 },
];

// ---------- realistic asset pricing ----------
const ASSET_CATEGORIES = [
  {
    id: "fronts", label: "Street Fronts", color: "#7fae6b", level: 1,
    items: [
      { id: "laundromat", name: "Corner Laundromat", cost: 800, income: 2, icon: "🧺" },
      { id: "bar", name: "The Quiet Glass", cost: 2600, income: 7, icon: "🥃" },
      { id: "restaurant", name: "Vico's Trattoria", cost: 7200, income: 19, icon: "🍝" },
      { id: "casino", name: "Backroom Card House", cost: 21000, income: 58, icon: "🎲" },
    ],
  },
  {
    id: "bikes", label: "Motorcycles", color: "#c9973f", level: 2,
    items: [
      { id: "scooter", name: "Beat-up Courier Scooter", cost: 900, income: 3, icon: "🛵" },
      { id: "sport_bike", name: "Used Sport Bike", cost: 3200, income: 9, icon: "🏍️" },
      { id: "harley", name: "Chromed Cruiser", cost: 8500, income: 22, icon: "🏍️" },
      { id: "ducati", name: "Ducati Superleggera", cost: 45000, income: 95, icon: "🏍️" },
    ],
  },
  {
    id: "cars", label: "Vehicle Fleet", color: "#c9973f", level: 3,
    items: [
      { id: "beater", name: "Beater Sedan", cost: 3000, income: 8, icon: "🚗" },
      { id: "pickup", name: "Work Pickup Truck", cost: 8000, income: 18, icon: "🛻" },
      { id: "sedan_new", name: "Late-Model Sedan", cost: 22000, income: 45, icon: "🚙" },
      { id: "muscle", name: "Restored Muscle Car", cost: 55000, income: 110, icon: "🚘" },
      { id: "luxury_sedan", name: "German Luxury Sedan", cost: 95000, income: 190, icon: "🚗" },
      { id: "supercar", name: "Italian Supercar", cost: 280000, income: 560, icon: "🏎️" },
      { id: "hypercar", name: "Limited-Run Hypercar", cost: 1200000, income: 2400, icon: "🏎️" },
    ],
  },
  {
    id: "transport", label: "Air & Sea", color: "#7fa8c9", level: 6,
    items: [
      { id: "speedboat", name: "Smuggler's Speedboat", cost: 40000, income: 85, icon: "🚤" },
      { id: "cargo_ship", name: "Pier 9 Cargo Ship", cost: 180000, income: 410, icon: "🚢" },
      { id: "helicopter", name: "Charter Helicopter", cost: 650000, income: 1350, icon: "🚁" },
      { id: "jet", name: "Private Jet", cost: 3200000, income: 6800, icon: "✈️" },
      { id: "yacht", name: "Superyacht", cost: 8500000, income: 17500, icon: "🛥️" },
    ],
  },
  {
    id: "agriculture", label: "Agriculture", color: "#8a9c5b", level: 5,
    items: [
      { id: "farms", name: "Upstate Farmland", cost: 45000, income: 120, icon: "🌾" },
      { id: "vineyard", name: "Sicilian Vineyard", cost: 95000, income: 240, icon: "🍇" },
    ],
  },
  {
    id: "media", label: "Media & Airwaves", color: "#c14b3f", level: 8,
    items: [
      { id: "radio", name: "Pirate Radio Station", cost: 70000, income: 175, icon: "📻" },
      { id: "tv", name: "Local TV Network", cost: 260000, income: 610, icon: "📺" },
    ],
  },
  {
    id: "realestate", label: "Real Estate & Mansions", color: "#d4af37", level: 10,
    items: [
      { id: "bank_front", name: "Silent Partner Holdings", cost: 175000, income: 470, icon: "🏛️" },
      { id: "suburban_mansion", name: "Suburban Mansion", cost: 420000, income: 900, icon: "🏡" },
      { id: "skyscraper", name: "Downtown Skyscraper", cost: 900000, income: 2100, icon: "🏙️" },
      { id: "hillside_mansion", name: "Hillside Estate", cost: 2600000, income: 5400, icon: "🏰" },
      { id: "beachfront_villa", name: "Beachfront Villa", cost: 5200000, income: 10800, icon: "🏖️" },
      { id: "island", name: "Private Island", cost: 12000000, income: 24000, icon: "🏝️" },
    ],
  },
  {
    id: "office", label: "Crew Headquarters", color: "#9a9a9a", level: 4,
    items: [
      { id: "safehouse_office", name: "Back-Room Office", cost: 6000, income: 14, icon: "🗄️" },
      { id: "warehouse_office", name: "Warehouse HQ", cost: 26000, income: 58, icon: "🏭" },
      { id: "tower_office", name: "Corporate Front Floor", cost: 140000, income: 320, icon: "🏢" },
    ],
  },
  {
    id: "luxury_biz", label: "Luxury Trade Business", color: "#f2f0ed", level: 9,
    items: [
      { id: "watch_dealer", name: "Vintage Watch Dealership", cost: 60000, income: 90, icon: "⌚" },
      { id: "auction_house", name: "Private Auction House", cost: 220000, income: 350, icon: "🔨" },
      { id: "gallery", name: "Discreet Art Gallery", cost: 500000, income: 780, icon: "🖼️" },
      { id: "jewel_exchange", name: "Jewel Exchange Counter", cost: 900000, income: 1600, icon: "💎" },
    ],
  },
  {
    id: "sports", label: "Sports Empire", color: "#4f9ec9", level: 7,
    items: [
      { id: "boxing_gym", name: "Underground Boxing Gym", cost: 35000, income: 85, icon: "🥊" },
      { id: "minor_team", name: "Minor League Franchise", cost: 260000, income: 620, icon: "⚾" },
      { id: "pro_stake", name: "Pro Franchise Stake", cost: 3800000, income: 8200, icon: "🏟️" },
      { id: "global_sports", name: "Global Sports Holding", cost: 22000000, income: 46000, icon: "🏆" },
    ],
  },
  {
    id: "tech", label: "Technology", color: "#7dd3c0", level: 11,
    items: [
      { id: "startup_stake", name: "Startup Seed Stake", cost: 150000, income: 340, icon: "💡" },
      { id: "data_center", name: "Server Farm", cost: 950000, income: 2050, icon: "🖥️" },
      { id: "ai_lab", name: "Private AI Research Lab", cost: 6500000, income: 13500, icon: "🤖" },
      { id: "tech_conglomerate", name: "Tech Conglomerate Shares", cost: 30000000, income: 62000, icon: "🌐" },
    ],
  },
  {
    id: "mining", label: "Mining & Resources", color: "#c98f4f", level: 13,
    items: [
      { id: "gold_claim", name: "Backcountry Gold Claim", cost: 400000, income: 900, icon: "⛏️" },
      { id: "diamond_mine", name: "Diamond Mine Concession", cost: 3200000, income: 6800, icon: "💠" },
      { id: "rare_earth", name: "Rare Earth Mineral Rights", cost: 15000000, income: 31000, icon: "🪨" },
    ],
  },
  {
    id: "warfare", label: "Private Defense", color: "#c94f4f", level: 17,
    items: [
      { id: "private_security", name: "Private Security Contractor", cost: 500000, income: 1100, icon: "🛡️" },
      { id: "arms_license", name: "Arms Import License", cost: 4500000, income: 9500, icon: "📦" },
      { id: "defense_plant", name: "Defense Manufacturing Plant", cost: 40000000, income: 82000, icon: "🏭" },
    ],
  },
];

// Personal Collection — one-off prestige purchases, NOT businesses. No passive
// income; each piece is bought once and adds respect plus a small permanent
// arrest-risk cut (having "clean" money and standing helps you disappear
// into polite society). Kept separate from the luxury trade business above.
const PERSONAL_ITEMS = [
  { id: "grail_watch", name: "Grail Watch (single piece)", cost: 180000, respect: 40, icon: "⌚" },
  { id: "masterpiece", name: "Old Master Painting", cost: 900000, respect: 160, icon: "🖼️" },
  { id: "crown_jewels", name: "Estate Jewelry Set", cost: 1500000, respect: 260, icon: "💍" },
  { id: "wine_cellar", name: "Private Wine Cellar", cost: 320000, respect: 70, icon: "🍷" },
  { id: "classic_yacht", name: "Restored Classic Yacht", cost: 4200000, respect: 500, icon: "⛵" },
  { id: "private_zoo", name: "Exotic Menagerie", cost: 7000000, respect: 700, icon: "🦁" },
];
const BUSINESSES = ASSET_CATEGORIES.flatMap((c) => c.items.map((i) => ({ ...i, cat: c.id })));

// ---------- market ----------
const SHARES = [
  { id: "vantablack", name: "Vantablack Logistics", sector: "Shipping", icon: "📦", price: 42, vol: 0.18, div: 0.006 },
  { id: "orizon", name: "Orizon Air Holdings", sector: "Aviation", icon: "🛩️", price: 118, vol: 0.24, div: 0.004 },
  { id: "redline", name: "Redline Motors Co.", sector: "Automotive", icon: "🏎️", price: 30, vol: 0.15, div: 0.005 },
  { id: "coastal", name: "Coastal Union Bank", sector: "Banking", icon: "🏦", price: 205, vol: 0.10, div: 0.012 },
  { id: "goldpeak", name: "Goldpeak Distillers", sector: "Spirits", icon: "🥃", price: 64, vol: 0.13, div: 0.010 },
  { id: "silverline", name: "Silverline Casinos", sector: "Gaming", icon: "🎰", price: 91, vol: 0.22, div: 0.007 },
  { id: "meridian", name: "Meridian Real Estate Trust", sector: "Property", icon: "🏢", price: 340, vol: 0.09, div: 0.014 },
  { id: "azurewave", name: "Azurewave Telecom", sector: "Telecom", icon: "📡", price: 76, vol: 0.11, div: 0.011 },
  { id: "ferro", name: "Ferro Steelworks", sector: "Industrial", icon: "⚙️", price: 55, vol: 0.14, div: 0.009 },
  { id: "lumen", name: "Lumen Media Group", sector: "Media", icon: "🎬", price: 128, vol: 0.19, div: 0.006 },
  { id: "obsidian", name: "Obsidian Security Corp", sector: "Private Security", icon: "🛡️", price: 210, vol: 0.16, div: 0.008 },
];
const FOREX = [
  { id: "eur", name: "EUR / USD", icon: "🇪🇺", price: 1.08, vol: 0.03 },
  { id: "gbp", name: "GBP / USD", icon: "🇬🇧", price: 1.27, vol: 0.035 },
  { id: "chf", name: "CHF / USD", icon: "🇨🇭", price: 1.11, vol: 0.02 },
  { id: "pesos", name: "MXN / USD (Reyes rate)", icon: "🇲🇽", price: 0.058, vol: 0.06 },
];

// ---------- hideouts, crew, bodyguards ----------
const HIDEOUTS = [
  { id: "motel", name: "Motel Room", cost: 0, icon: "🛏️", heatDecay: 1, respectBonus: 0 },
  { id: "apartment", name: "Rented Apartment", cost: 3000, icon: "🏢", heatDecay: 2, respectBonus: 5 },
  { id: "townhouse", name: "Fenced Townhouse", cost: 18000, icon: "🏘️", heatDecay: 3, respectBonus: 15 },
  { id: "compound", name: "Guarded Compound", cost: 80000, icon: "🏰", heatDecay: 5, respectBonus: 40 },
  { id: "penthouse", name: "Skyline Penthouse", cost: 400000, icon: "🌆", heatDecay: 8, respectBonus: 100 },
  { id: "fortress", name: "Palermo Hill Fortress", cost: 2500000, icon: "🏯", heatDecay: 14, respectBonus: 260 },
];
const CREW_ROLES = [
  { id: "muscle", name: "Muscle", icon: "🥊", cost: 2000, wage: 1, effect: "reduces crime risk" },
  { id: "wheelman", name: "Wheelman", icon: "🔧", cost: 5000, wage: 2, effect: "faster jobs" },
  { id: "accountant", name: "Accountant", icon: "🧮", cost: 12000, wage: 3, effect: "boosts passive income" },
  { id: "fixer", name: "Fixer", icon: "🕶️", cost: 30000, wage: 6, effect: "cuts heat gain" },
  { id: "hacker", name: "In-house Hacker", cost: 55000, wage: 9, effect: "boosts hacking payouts", icon: "💻" },
];
const BODYGUARDS = [
  { id: "guard1", name: "Ex-Cop Bodyguard", icon: "🕴️", cost: 15000, wage: 5, arrestCut: 0.15, dmgCut: 0.15, level: 1 },
  { id: "guard2", name: "Former Marine", icon: "🪖", cost: 45000, wage: 11, arrestCut: 0.28, dmgCut: 0.30, level: 1 },
  { id: "guard3", name: "Ex-Cartel Sicario", icon: "🔫", cost: 120000, wage: 24, arrestCut: 0.42, dmgCut: 0.48, level: 1 },
];

// Executive staff — unlock once you're running a real operation, not just a
// street crew. Each is single-hire (max 1) and does something crew can't.
const EXECUTIVE_STAFF = [
  { id: "secretary", name: "Personal Secretary", icon: "💼", cost: 40000, wage: 8, level: 8, effect: "cooldownCut", amount: 0.3, desc: "Cuts secret-meeting and bounty cooldowns by 30%." },
  { id: "assistant", name: "Personal Assistant", icon: "🗂️", cost: 90000, wage: 14, level: 10, effect: "autoCollect", amount: 1, desc: "Auto-deposits half of every crime payout straight to the vault." },
  { id: "manager", name: "Operations Manager", icon: "📋", cost: 220000, wage: 26, level: 13, effect: "incomeBoost", amount: 0.20, desc: "Runs your fronts properly — +20% passive income, permanently." },
  { id: "chiefofstaff", name: "Chief of Staff", icon: "🎖️", cost: 600000, wage: 60, level: 18, effect: "heatDecayBoost", amount: 0.5, desc: "Coordinates the whole operation — +50% heat decay everywhere." },
];

// ---------- world map ----------
const CITIES = [
  { id: "newark", name: "Newark", country: "USA", cost: 0, desc: "Home turf. Quiet, for now.", mode: "bike" },
  { id: "chicago", name: "Chicago", country: "USA", cost: 5000, desc: "Old money, older grudges.", mode: "car" },
  { id: "miami", name: "Miami", country: "USA", cost: 25000, desc: "Warm nights, cold cash.", mode: "car" },
  { id: "vegas", name: "Las Vegas", country: "USA", cost: 90000, desc: "Everything's for sale.", mode: "car" },
  { id: "mexicocity", name: "Mexico City", country: "Mexico", cost: 150000, desc: "Reyes' home ground.", mode: "plane" },
  { id: "bogota", name: "Bogotá", country: "Colombia", cost: 300000, desc: "The source, if you can survive it.", mode: "plane" },
  { id: "london", name: "London", country: "UK", cost: 500000, desc: "Old empires launder well here.", mode: "plane" },
  { id: "marseille", name: "Marseille", country: "France", cost: 650000, desc: "The old smuggling capital.", mode: "ship" },
  { id: "dubai", name: "Dubai", country: "UAE", cost: 1200000, desc: "No questions asked, for a price.", mode: "plane" },
  { id: "palermo", name: "Palermo", country: "Sicily", cost: 3000000, desc: "Where the name began.", mode: "ship" },
  { id: "hongkong", name: "Hong Kong", country: "China", cost: 5500000, desc: "Money moves fastest where nobody asks questions.", mode: "plane" },
  { id: "tokyo", name: "Tokyo", country: "Japan", cost: 8000000, desc: "Precision, discretion, and a very different kind of family.", mode: "plane" },
  { id: "moscow", name: "Moscow", country: "Russia", cost: 12000000, desc: "The cold makes everyone honest, eventually.", mode: "plane" },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", cost: 16000000, desc: "Where the mining money really goes.", mode: "plane" },
  { id: "rio", name: "Rio de Janeiro", country: "Brazil", cost: 20000000, desc: "Beautiful, dangerous, and never quiet.", mode: "ship" },
  { id: "zurich", name: "Zurich", country: "Switzerland", cost: 35000000, desc: "The vaults here don't have your name on them. Yet.", mode: "plane" },
];
const TRAVEL_MODES = { bike: { icon: "🏍️", label: "ride in" }, car: { icon: "🚗", label: "drive in" }, plane: { icon: "✈️", label: "fly in" }, ship: { icon: "🚢", label: "sail in" } };

// ---------- ranks / wealth ----------
// Curve is steep on purpose — the game is meant to span months of real play,
// not one sitting. Level = 1 + floor(xp / 9000).
const RANKS = [
  { xp: 0, title: "Nobody" }, { xp: 4200, title: "Street Contact" }, { xp: 12600, title: "Made Runner" },
  { xp: 30000, title: "Soldier" }, { xp: 66000, title: "Caporegime" }, { xp: 135000, title: "Consigliere" },
  { xp: 270000, title: "Underboss" }, { xp: 540000, title: "Don" }, { xp: 1050000, title: "Regional Don" },
  { xp: 2100000, title: "Commission Seat" }, { xp: 4200000, title: "Order Initiate" }, { xp: 9000000, title: "Ghost of Palermo" },
];
const WEALTH_CLASSES = [
  { min: 0, label: "Broke" }, { min: 10000, label: "Hustler" }, { min: 50000, label: "Earner" },
  { min: 200000, label: "Made Man" }, { min: 1000000, label: "Boss" }, { min: 10000000, label: "Magnate" },
  { min: 50000000, label: "Untouchable" },
];

// ---------- factions ----------
const FACTIONS = [
  { id: "commission", name: "The Commission", icon: "♠️", color: "#e5233f", desc: "Old-guard families that run this city's rules." },
  { id: "cartel", name: "Reyes Cartel", icon: "🐍", color: "#2f6b3f", desc: "Cross-border supply. Efficient, and unforgiving." },
  { id: "feds", name: "Federal Task Force", icon: "🦅", color: "#5c7a99", desc: "Building a file on you. Suspicion, not trust." },
  { id: "order", name: "The Order", icon: "🂡", color: "#8a5fc9", desc: "A secret society above the street-level game entirely." },
  { id: "wire", name: "The Wire (hackers)", icon: "💻", color: "#4fb8c9", desc: "Cipher's network. Information is their currency." },
];

// ---------- secret meetings ----------
const MEETING_TEMPLATES = [
  { don: "torrino", title: "Tribute is Expected", text: "\"Every earner pays respect to the table. It's how the peace holds.\" A number is named — pay it, or explain yourself.",
    choices: [
      { label: "Pay tribute", effects: { cashPct: -0.12, rep: { commission: 12 }, xp: 20 }, result: "The old men nod. Your name is spoken well of tonight." },
      { label: "Refuse, politely", effects: { rep: { commission: -15 }, respect: 10 }, result: "Bold. Word will spread either way — as respect or as a warning." },
    ] },
  { don: "reyes", title: "A Standing Offer", text: "\"We move product through your fronts, you take a cut, everybody eats.\" It's steady money — and steady exposure.",
    choices: [
      { label: "Take the deal", effects: { cash: 900, rep: { cartel: 15, feds: 8 }, heat: 10 }, result: "Cash lands quiet. So does the risk." },
      { label: "Pass for now", effects: { rep: { cartel: -8 }, xp: 15 }, result: "They don't push. Cartels are patient — that's what makes them dangerous." },
    ] },
  { don: "graves", title: "A Federal Feeler", text: "\"We can make your problems disappear. We just need names.\" It's a bad idea dressed as a good one.",
    choices: [
      { label: "Hang up", effects: { rep: { feds: -10 }, respect: 8 }, result: "You don't deal with rats, even the badge kind." },
      { label: "Hear them out", effects: { rep: { feds: 10 }, heatPct: -0.3 }, result: "Nothing signed, nothing said — but they know your voice now." },
    ] },
  { don: "cipher", title: "The Wire Wants In", text: "\"I can scrub your name from three databases tonight. Or add it to a few, if we're not friends.\"",
    choices: [
      { label: "Hire Cipher's crew", effects: { cashPct: -0.08, rep: { wire: 20 }, heatPct: -0.4 }, result: "Your digital footprint just got a lot quieter." },
      { label: "Handle it yourself", effects: { rep: { wire: -12 } }, result: "Cipher doesn't take rejection personally. Probably." },
    ] },
  { don: "sable", title: "An Invitation", text: "\"The Order doesn't ask twice.\" Madame Sable doesn't raise her voice. She doesn't need to.",
    choices: [
      { label: "Accept the invitation", effects: { rep: { order: 25 }, xp: 80, respect: 40 }, result: "You're in a room that officially doesn't exist. Remember that." },
      { label: "Decline, carefully", effects: { rep: { order: -10 } }, result: "'As you wish,' she says. It doesn't sound like a real choice." },
    ] },
  { don: "torrino", title: "A Territory Dispute", text: "\"Two of your crews are working the same corner as the Genovese cousins. Someone needs to back off — and it isn't going to be them.\"",
    choices: [
      { label: "Pull your crew back", effects: { respect: -10, xp: 25 }, result: "Cheaper than a war. Not everyone agrees it was the right call." },
      { label: "Hold the corner", effects: { rep: { commission: -6 }, heat: 8, respect: 20 }, result: "Word gets around fast. So does the shooting, almost." },
    ] },
  { don: "reyes", title: "A Loyalty Test", text: "\"Someone in your crew has been talking to people they shouldn't. I have a name. What you do with it is your business — but do something.\"",
    choices: [
      { label: "Handle it quietly", effects: { rep: { cartel: 18 }, heat: 12, xp: 40 }, result: "Reyes doesn't ask what happened. That's the point." },
      { label: "Investigate first", effects: { rep: { cartel: -5 }, xp: 15 }, result: "Careful is smart. Reyes finds it slow." },
    ] },
  { don: "graves", title: "A Subpoena, Sort Of", text: "\"We can make this go away, or we can make it very public. Your call, but the clock's already running.\"",
    choices: [
      { label: "Lawyer up", effects: { cashPct: -0.06, rep: { feds: -8 }, heatPct: -0.2 }, result: "Expensive, but it buys real breathing room." },
      { label: "Call their bluff", effects: { rep: { feds: 6 }, heat: 15 }, result: "They back off. This time. They're keeping score." },
    ] },
  { don: "cipher", title: "A Data Leak", text: "\"Someone's selling information about your operation on a forum I monitor. I can bury it, or you can find out who's selling.\"",
    choices: [
      { label: "Pay Cipher to bury it", effects: { cashPct: -0.05, rep: { wire: 15 } }, result: "Gone within the hour. Cipher doesn't explain how." },
      { label: "Find the leak yourself", effects: { respect: 15, heat: 10 }, result: "You find them. Word spreads that you did." },
    ] },
  { don: "sable", title: "A Favor Owed", text: "\"The Order remembers everything, including debts. It's time to collect on one you didn't know you had.\"",
    choices: [
      { label: "Honor the debt", effects: { cashPct: -0.1, rep: { order: 20 }, xp: 50 }, result: "Paid in full. The Order does not forget favors returned, either." },
      { label: "Question it", effects: { rep: { order: -15 } }, result: "Questioning the Order is itself an answer, in their eyes." },
    ] },
];

// picks a meeting that isn't one of the last few shown, so the same lines
// don't repeat back-to-back — genuine variety instead of a small loop.
function pickMeeting(recentTitles) {
  const pool = MEETING_TEMPLATES.filter((m) => !recentTitles.includes(m.title));
  const from = pool.length > 0 ? pool : MEETING_TEMPLATES;
  return from[Math.floor(Math.random() * from.length)];
}

// ---------- flavor chat pool ----------
const FLAVOR_MESSAGES = [
  { contactId: "vico", cond: (s) => s.cashOnHand > 3000 && s.vaultCash < s.cashOnHand * 0.3, text: "Move money into the vault. Cash sitting around is cash that gets seized." },
  { contactId: "graves", cond: (s) => s.heat > 55, text: "We know it's you. It's just a matter of paperwork now." },
  { contactId: "reyes", cond: (s) => s.rep.cartel > 25, text: "Reyes speaks well of you. That's rare, and it's not nothing." },
  { contactId: "torrino", cond: (s) => s.rep.commission < -10, text: "The table remembers who didn't show respect. Watch yourself." },
  { contactId: "sal", cond: (s) => s.heat > 70, text: "Heat's climbing fast. Lay low or pay the badges — your call, but pick one." },
  { contactId: "cipher", cond: (s) => s.rep.wire > 20, text: "Cleared two more flags on your file. You're welcome." },
  { contactId: "sal", cond: () => true, text: "Quiet night out there. Too quiet, maybe." },
  { contactId: "torrino", cond: () => true, text: "The table is watching how you carry yourself. Carry it well." },
];
const CONTACTS = [
  { id: "vico", name: "Vico — Accountant", icon: "🧮" },
  { id: "sal", name: "Sal — Fixer", icon: "🕶️" },
  { id: "torrino", name: "Don Torrino", icon: "🎩" },
  { id: "reyes", name: "Esteban Reyes", icon: "🐍" },
  { id: "graves", name: "Agent Graves", icon: "🦅" },
  { id: "ruiz", name: "Detective Ruiz", icon: "🕵️" },
  { id: "cipher", name: "Cipher", icon: "💻" },
  { id: "sable", name: "Madame Sable", icon: "🂡" },
];

const HACK_TARGETS = [
  { id: "atm_net", name: "ATM Network Skim", diff: 1, reward: 800, intel: 5 },
  { id: "shell_bank", name: "Shell Bank Ledger", diff: 2, reward: 3500, intel: 12 },
  { id: "pd_records", name: "Police Records DB", diff: 3, reward: 0, intel: 30, heatCut: 25 },
  { id: "fed_wiretap", name: "Federal Wiretap Feed", diff: 4, reward: 9000, intel: 60 },
  { id: "swiss_vault", name: "Swiss Vault Backend", diff: 5, reward: 28000, intel: 100 },
  { id: "exchange_core", name: "Stock Exchange Core Systems", diff: 6, reward: 120000, intel: 180 },
  { id: "sovereign_fund", name: "Sovereign Wealth Fund Ledger", diff: 7, reward: 600000, intel: 320 },
];

// Purely cosmetic terminal flavor lines for the fictional hacking mini-game —
// vague and non-actionable on purpose, styled after a Termux-like console.
const HACK_FLAVOR = [
  "resolving target node...", "handshake accepted", "rotating relay chain...",
  "session token intercepted", "credentials queued for replay", "firewall signature logged",
  "tunneling through relay 3...", "spoofing origin fingerprint", "buffer synced",
  "packet trace masked", "keystore located", "decrypting local cache...",
  "watchdog process paused", "ledger index mapped", "root shell pending...",
];

// ---------- bounty board ----------
const BOUNTY_POOL = [
  { name: "Locate a missing courier", reward: 3000, xp: 100, energy: 15, icon: "🕵️" },
  { name: "Recover stolen product", reward: 8000, xp: 220, energy: 25, icon: "📦" },
  { name: "Silence a loose-lipped associate", reward: 15000, xp: 400, energy: 35, icon: "🤐" },
  { name: "Flip a rival's lieutenant", reward: 30000, xp: 700, energy: 40, icon: "🔄" },
  { name: "Track down a Fed informant", reward: 55000, xp: 1100, energy: 45, icon: "🎯" },
  { name: "Dismantle a rival's entire crew", reward: 180000, xp: 2600, energy: 60, icon: "💥" },
];

// ---------- schools / training ----------
const SCHOOLS = [
  { id: "streetwise", name: "Streetwise Academy", icon: "🎓", desc: "Permanently trims arrest risk on every job.", cost: 8000, effect: "riskCut", amount: 0.02, cap: 6 },
  { id: "finance", name: "Underground Finance Course", icon: "📊", desc: "Permanently boosts all passive income.", cost: 15000, effect: "incomeBoost", amount: 0.04, cap: 6 },
  { id: "combat", name: "Private Combat Instructor", icon: "🥋", desc: "Permanently reduces damage taken in beatings.", cost: 20000, effect: "dmgCut", amount: 0.04, cap: 6 },
  { id: "tradecraft", name: "Tradecraft Seminar (Cipher-taught)", icon: "🕶️", desc: "Permanently boosts hacking payouts.", cost: 30000, effect: "hackBoost", amount: 0.05, cap: 6 },
];

// ---------- avatars ----------
const AVATARS = ["🕴️", "🥷", "🧔", "👩‍🦰", "🧑‍🦱", "👨‍🦳", "🧕", "👳", "🦹", "🕵️‍♀️"];

const DETECTIVES = [
  { threshold: 30, name: "Detective Ruiz", text: "A woman in a rumpled coat has been photographing your fronts. She hasn't approached — yet." },
  { threshold: 60, name: "Detective Ruiz", text: "Ruiz filed a warrant request. It got denied. This time." },
  { threshold: 85, name: "Detective Ruiz", text: "Ruiz is outside your hideout right now. Move, or pay someone to make her transfer precincts." },
];

function rankFor(xp) { let cur = RANKS[0]; for (const r of RANKS) if (xp >= r.xp) cur = r; return { cur, next: RANKS[RANKS.indexOf(cur) + 1] }; }
function wealthFor(cash) { let cur = WEALTH_CLASSES[0]; for (const w of WEALTH_CLASSES) if (cash >= w.min) cur = w; return { cur, next: WEALTH_CLASSES[WEALTH_CLASSES.indexOf(cur) + 1] }; }
function wealthTierIndex(cash) { let idx = 0; WEALTH_CLASSES.forEach((w, i) => { if (cash >= w.min) idx = i; }); return idx; }
function fmt(n) {
  n = Math.floor(n);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
// Growth is capped past a purchase count so late-game prices stay finite and
// readable instead of compounding into unusable numbers after hundreds of buys.
function growPrice(base, n, rate, capN) { return Math.round(base * Math.pow(rate, Math.min(n, capN))); }

// ---------- ui atoms ----------
function Ledger({ label, value, sub, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 2px", borderBottom: "1px dotted #4a3d2f" }}>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a9a9a" }}>{label}</div>
        {sub && <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#767676", fontStyle: "italic", marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 19, color: accent || "#f2f0ed" }}>{value}</div>
    </div>
  );
}
function SealButton({ onClick, disabled, children, size = 64 }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: size, height: size, borderRadius: "50%",
      background: disabled ? "radial-gradient(circle at 35% 30%, #4a3428, #2a1c15)" : "radial-gradient(circle at 35% 30%, #a4372f, #6b1712 60%, #3d0c09)",
      border: "2px solid " + (disabled ? "#5c4a3a" : "#d4af37"), color: "#f2f0ed", fontFamily: "'Cinzel', serif", fontWeight: 700,
      fontSize: size < 50 ? 11 : 13, cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: disabled ? "none" : "0 0 14px rgba(212,175,55,0.35), inset 0 0 10px rgba(0,0,0,0.5)",
      transition: "transform 0.12s ease", flexShrink: 0,
    }}
    onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.93)"; }}
    onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}>
      {children}
    </button>
  );
}
function StampBar({ pct, color }) {
  return (
    <div style={{ height: 6, background: "#211711", borderRadius: 3, overflow: "hidden", border: "1px solid #333333" }}>
      <div style={{ height: "100%", width: `${clamp(pct, 0, 100)}%`, background: color, transition: "width 0.4s ease" }} />
    </div>
  );
}
function SectionTitle({ children, tag }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 10px" }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.14em", color: "#d4af37", textTransform: "uppercase" }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #4a3d2f, transparent)" }} />
      {tag && <div style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontSize: 12, color: "#767676" }}>{tag}</div>}
    </div>
  );
}
// Per-item card identity — each item gets its own consistent 2-color
// gradient (deterministic from its id, so it never changes between
// renders) instead of one flat color per whole category. Adapted from a
// card-generator concept where every item has its own designed palette;
// this achieves the same "each item looks distinct" effect without
// needing actual downloaded/generated image files.
const CARD_PALETTES = [
  ["#7a1620", "#1a0508"], ["#0d3b3b", "#031111"], ["#3a2a6b", "#0d0819"],
  ["#8a5a12", "#1a0f00"], ["#1c5c3a", "#04140a"], ["#5c1c4a", "#140419"],
  ["#1a3a6b", "#050d19"], ["#6b3a1a", "#190d05"], ["#2a5c5c", "#0a1414"],
  ["#6b1a3a", "#19050d"], ["#3a6b1a", "#0d1905"], ["#1a1a6b", "#05051a"],
];
function cardPalette(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return CARD_PALETTES[h % CARD_PALETTES.length];
}

function AssetTile({ id, icon, name, sub, price, owned, accent, onBuy, disabled, locked }) {
  const [c1, c2] = cardPalette(id || name);
  return (
    <div style={{
      display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden",
      border: `1px solid ${accent}66`, position: "relative", opacity: locked ? 0.4 : 1,
      background: `linear-gradient(150deg, ${c1} 0%, ${c2} 65%, #000 100%)`,
      boxShadow: "0 3px 10px rgba(0,0,0,0.5)",
    }}>
      {owned > 0 && <div style={{ position: "absolute", top: 8, right: 8, background: accent, color: "#050505", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, borderRadius: 10, padding: "1px 7px", zIndex: 2 }}>×{owned}</div>}
      <div style={{ position: "absolute", top: 8, left: 8, width: 6, height: 6, borderRadius: "50%", background: accent, opacity: 0.8 }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 82, position: "relative" }}>
        <div style={{ position: "absolute", width: 68, height: 68, borderRadius: "50%", background: `radial-gradient(circle, ${accent}44, transparent 70%)`, filter: "blur(2px)" }} />
        <div style={{ fontSize: 38, filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.7))" }}>{icon}</div>
      </div>
      <div style={{ padding: "8px 10px 10px", background: "rgba(0,0,0,0.55)", borderTop: `1px solid ${accent}44` }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: "#f2f0ed", lineHeight: 1.25 }}>{name}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#8f8f8f", marginTop: 3, marginBottom: 8 }}>{sub}</div>
        <button onClick={onBuy} disabled={disabled || locked} style={{
          width: "100%", padding: "6px 0", background: disabled || locked ? "#1a1a1a" : accent,
          color: disabled || locked ? "#767676" : "#050505", border: "none", borderRadius: 6,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11, cursor: disabled || locked ? "not-allowed" : "pointer",
        }}>{locked ? "LOCKED" : `$${fmt(price)}`}</button>
      </div>
    </div>
  );
}
function Modal({ children, width = 340 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,3,2,0.82)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: width, background: "#0a0a0a", border: "1px solid #d4af3766", borderRadius: 10, padding: 22, boxShadow: "0 0 40px rgba(0,0,0,0.6)", maxHeight: "85vh", overflowY: "auto" }}>{children}</div>
    </div>
  );
}
function Sparkline({ data, color, width = 100, height = 30 }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

// Full trading chart — grid lines, filled area under the curve, high/low
// labels. Used in the dedicated chart view for a selected company.
function TradingChart({ data, color, width = 320, height = 140 }) {
  if (!data || data.length < 2) return <div style={{ height }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pad = 8;
  const pts = data.map((v, i) => [pad + (i / (data.length - 1)) * (width - pad * 2), pad + (height - pad * 2) - ((v - min) / range) * (height - pad * 2)]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad} x2={width - pad} y1={pad + f * (height - pad * 2)} y2={pad + f * (height - pad * 2)} stroke="#262626" strokeWidth="1" />)}
      <polygon points={area} fill={`${color}22`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" />
      <text x={pad} y={pad + 10} fill="#8f8f8f" fontSize="9" fontFamily="'JetBrains Mono', monospace">{max.toFixed(2)}</text>
      <text x={pad} y={height - pad - 2} fill="#8f8f8f" fontSize="9" fontFamily="'JetBrains Mono', monospace">{min.toFixed(2)}</text>
    </svg>
  );
}

// Real candlestick chart. Only closing prices are stored per tick, so each
// candle's open is the previous close (standard for a continuous feed) and
// high/low are derived with a small realistic wick — same technique real
// lightweight charting libs use when only close data is available.
function CandlestickChart({ data, width = 320, height = 140, upColor = "#5fbf6f", downColor = "#e5233f" }) {
  if (!data || data.length < 3) return <div style={{ height }} />;
  const recent = data.slice(-24);
  const candles = recent.map((close, i) => {
    const open = i === 0 ? close : recent[i - 1];
    const wick = Math.abs(close - open) * 0.6 + Math.max(close, open) * 0.002;
    return { open, close, high: Math.max(open, close) + wick, low: Math.max(0.0001, Math.min(open, close) - wick) };
  });
  const allVals = candles.flatMap((c) => [c.high, c.low]);
  const min = Math.min(...allVals), max = Math.max(...allVals);
  const range = max - min || 1;
  const pad = 10;
  const chartH = height - pad * 2;
  const slotW = (width - pad * 2) / candles.length;
  const y = (v) => pad + chartH - ((v - min) / range) * chartH;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={pad} x2={width - pad} y1={pad + f * chartH} y2={pad + f * chartH} stroke="#262626" strokeWidth="1" />)}
      {candles.map((c, i) => {
        const up = c.close >= c.open;
        const col = up ? upColor : downColor;
        const cx = pad + i * slotW + slotW / 2;
        const bodyTop = y(Math.max(c.open, c.close));
        const bodyBottom = y(Math.min(c.open, c.close));
        const bodyH = Math.max(1.5, bodyBottom - bodyTop);
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={col} strokeWidth="1" />
            <rect x={cx - slotW * 0.32} y={bodyTop} width={slotW * 0.64} height={bodyH} fill={col} />
          </g>
        );
      })}
      <text x={pad} y={pad + 9} fill="#8f8f8f" fontSize="9" fontFamily="'JetBrains Mono', monospace">{max.toFixed(2)}</text>
      <text x={pad} y={height - pad + 2} fill="#8f8f8f" fontSize="9" fontFamily="'JetBrains Mono', monospace">{min.toFixed(2)}</text>
    </svg>
  );
}

const TABS = [
  { id: "empire", label: "Empire", icon: "🏛" },
  { id: "profile", label: "Profile", icon: "🪪" },
  { id: "crime", label: "Crime", icon: "🗡" },
  { id: "bounties", label: "Bounties", icon: "🎯" },
  { id: "assets", label: "Assets", icon: "💼" },
  { id: "collection", label: "Collection", icon: "💎" },
  { id: "bank", label: "Bank", icon: "🏦" },
  { id: "vault", label: "Vault", icon: "🔐" },
  { id: "hideout", label: "Hideout", icon: "🏚" },
  { id: "crew", label: "Crew", icon: "🤝" },
  { id: "training", label: "Schools", icon: "🎓" },
  { id: "hacking", label: "Hacking", icon: "💻" },
  { id: "factions", label: "Factions", icon: "♠️" },
  { id: "market", label: "Market", icon: "📈" },
  { id: "wire", label: "Wire", icon: "💬" },
  { id: "trade", label: "Trade Board", icon: "🤝💰" },
  { id: "world", label: "World", icon: "🌍" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

// Optional local password lock — protects your progress if someone else
// picks up your phone. Purely local (localStorage), nothing sent anywhere.
// First run sets a password; every run after that asks for it.
function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState(undefined); // undefined = still checking
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "forgot" | "reset"
  const [recoveryInput, setRecoveryInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const RECOVERY_QUESTION = "What city did your empire start in? (hint: it's the first city in the game)";

  useEffect(() => {
    setSavedPassword(localStorage.getItem("omerta_password") || "");
    setRecoveryAnswer(localStorage.getItem("omerta_recovery_answer") || "");
  }, []);

  function handleLogin() {
    if (!savedPassword) {
      if (password.length < 4) { alert("Password must be at least 4 characters"); return; }
      localStorage.setItem("omerta_password", password);
      onLogin();
    } else if (password === savedPassword) {
      onLogin();
    } else {
      alert("Wrong password");
      setPassword("");
    }
  }

  function handleRecoveryCheck() {
    if (recoveryInput.trim().toLowerCase() === "newark") { setMode("reset"); }
    else alert("That's not it — think back to your very first city.");
  }

  function handleReset() {
    if (newPassword.length < 4) { alert("Password must be at least 4 characters"); return; }
    localStorage.setItem("omerta_password", newPassword);
    setSavedPassword(newPassword);
    setMode("login");
    setPassword("");
    alert("Password reset. Log in with your new password.");
  }

  if (savedPassword === undefined) return null; // avoid a flash before localStorage check resolves

  if (mode === "forgot") {
    return (
      <div style={{ height: "100vh", background: "#050505", color: "#f2f0ed", fontFamily: "'Cinzel', serif", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 20 }}>
        <div style={{ fontSize: 36 }}>🔑</div>
        <p style={{ color: "#8f8f8f", textAlign: "center", maxWidth: 300, fontFamily: "'Inter', sans-serif", fontSize: 14 }}>{RECOVERY_QUESTION}</p>
        <input value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRecoveryCheck()} placeholder="Your answer..." style={{ width: "100%", maxWidth: 280, padding: "12px", background: "#1a1410", color: "#f2f0ed", border: "1px solid #d4af37", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }} />
        <button onClick={handleRecoveryCheck} style={{ padding: "12px 32px", background: "#d4af37", color: "#050505", border: "none", borderRadius: 8, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>CHECK ANSWER</button>
        <button onClick={() => setMode("login")} style={{ background: "none", border: "none", color: "#767676", fontSize: 12, cursor: "pointer" }}>Back to login</button>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div style={{ height: "100vh", background: "#050505", color: "#f2f0ed", fontFamily: "'Cinzel', serif", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 20 }}>
        <div style={{ fontSize: 36 }}>🔓</div>
        <p style={{ color: "#8f8f8f", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>Set a new password</p>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleReset()} placeholder="New password (4+ chars)..." style={{ width: "100%", maxWidth: 280, padding: "12px", background: "#1a1410", color: "#f2f0ed", border: "1px solid #d4af37", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }} />
        <button onClick={handleReset} style={{ padding: "12px 32px", background: "#d4af37", color: "#050505", border: "none", borderRadius: 8, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>SET NEW PASSWORD</button>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", background: "#050505", color: "#f2f0ed", fontFamily: "'Cinzel', serif", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 18, padding: 20 }}>
      <div style={{ fontSize: 44 }}>🎩</div>
      <h1 style={{ fontSize: 30, margin: 0, color: "#d4af37", letterSpacing: "0.05em" }}>OMERTÀ</h1>
      <p style={{ color: "#8f8f8f", textAlign: "center", maxWidth: 300, fontFamily: "'Inter', sans-serif", fontSize: 15 }}>
        {savedPassword ? "Welcome back. Enter your password to access your empire." : "Set a password to protect your progress on this device."}
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        placeholder={savedPassword ? "Enter password..." : "Create password (4+ chars)..."}
        style={{ width: "100%", maxWidth: 280, padding: "12px", background: "#1a1410", color: "#f2f0ed", border: "1px solid #d4af37", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 14 }}
      />
      <button onClick={handleLogin} style={{ padding: "12px 32px", background: "#d4af37", color: "#050505", border: "none", borderRadius: 8, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        {savedPassword ? "LOGIN" : "SET PASSWORD"}
      </button>
      {savedPassword && <button onClick={() => setMode("forgot")} style={{ background: "none", border: "none", color: "#8f8f8f", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Forgot password?</button>}
      <p style={{ fontSize: 11, color: "#767676", textAlign: "center" }}>🔒 Stored only on this device — never sent anywhere.</p>
    </div>
  );
}

export default function Omerta() {
  const [authenticated, setAuthenticated] = useState(false);
  if (!authenticated) return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  return <OmertaGame />;
}

function OmertaGame() {
  const [playerName, setPlayerNameState] = useState(DEFAULT_PLAYER_NAME);
  function updatePlayerName(name) {
    const trimmed = name.trim().slice(0, 24);
    if (!trimmed) return;
    localStorage.setItem("omerta_player_name", trimmed);
    setPlayerNameState(trimmed);
  }
  const [cash, setCash] = useState(500);
  const [vaultCash, setVaultCash] = useState(0);
  const [vaultCap, setVaultCap] = useState(10000);
  const [bankCash, setBankCash] = useState(0);
  const [detectiveHeat, setDetectiveHeat] = useState(0);
  const [bountyCooldown, setBountyCooldown] = useState(20);
  const [activeBounty, setActiveBounty] = useState(null);
  const [bountiesDone, setBountiesDone] = useState(0);
  const [training, setTraining] = useState({});
  const [avatar, setAvatar] = useState("🕴️");
  const [staff, setStaff] = useState({});
  const [personalItems, setPersonalItems] = useState({});
  const [meetingStreak, setMeetingStreak] = useState(0);
  const [chartCompany, setChartCompany] = useState(null);
  const [showPettyJobs, setShowPettyJobs] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [swipeHint, setSwipeHint] = useState(true);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [adCooldowns, setAdCooldowns] = useState({ cash: 0, energy: 0, gear: 0 });
  const [armorCharges, setArmorCharges] = useState(0); // reduces beating damage for next N jobs
  const [weaponCharges, setWeaponCharges] = useState(0); // reduces arrest chance for next N jobs
  const tabBarRef = useRef(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [respect, setRespect] = useState(0);
  const [health, setHealth] = useState(100);
  const [energy, setEnergy] = useState(100);
  const [heat, setHeat] = useState(0);
  const [xp, setXp] = useState(0);
  const [kills, setKills] = useState(0);
  const [intel, setIntel] = useState(0);
  const [owned, setOwned] = useState({});
  const [hideout, setHideout] = useState("motel");
  const [crew, setCrew] = useState({});
  const [guards, setGuards] = useState({});
  const [portfolio, setPortfolio] = useState({});
  const [fxHoldings, setFxHoldings] = useState({});
  const [shares, setShares] = useState(SHARES.map((s) => ({ ...s, history: [s.price] })));
  const [fx, setFx] = useState(FOREX.map((s) => ({ ...s, history: [s.price] })));
  const [unlockedCities, setUnlockedCities] = useState(["newark"]);
  const [currentCity, setCurrentCity] = useState("newark");
  const [rep, setRep] = useState({ commission: 0, cartel: 0, feds: 0, order: 0, wire: 0 });
  const [jailTicks, setJailTicks] = useState(0);
  const [priorArrests, setPriorArrests] = useState(0);
  const [meetingCooldown, setMeetingCooldown] = useState(14);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [meetingResult, setMeetingResult] = useState(null);
  const [swatWarning, setSwatWarning] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ id: 0, contactId: "sal", text: "You're in. Newark's yours to work — for now. Don't get greedy on day one." }]);
  const [globalChat, setGlobalChat] = useState([]);
  const [tradeBoard, setTradeBoard] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const [tradeDraft, setTradeDraft] = useState({ item: "", price: "" });
  const [hackTarget, setHackTarget] = useState(null);
  const [hackLines, setHackLines] = useState([]);
  const [hackPulse, setHackPulse] = useState(0);
  const [tab, setTab] = useState("empire");
  const [log, setLog] = useState([{ id: 0, text: "You step off the bus in Newark with $500 and a name nobody recognizes yet.", tone: "neutral" }]);
  const [busy, setBusy] = useState(null);
  const [seenLevels, setSeenLevels] = useState([1]);
  const [activeStory, setActiveStory] = useState(STORY_BEATS[0]);
  const logId = useRef(1);
  const chatId = useRef(1);
  const pollRef = useRef(null);

  // ============================================================
  // SAVE / LOAD — fixes progress and identity resetting on exit
  // ============================================================
  // Uses the same window.storage adapter as everything else (Firebase,
  // Supabase, or localStorage depending on STORAGE_PROVIDER above), stored
  // under a key scoped to this device's stable PLAYER_ID — not the shared
  // multiplayer keys. Loads once on mount before the auto-save effect is
  // allowed to run, so a fresh install never overwrites a real save with
  // defaults; saves are debounced so it doesn't write on every tick.
  const SAVE_VERSION = 2;
  const [saveLoaded, setSaveLoaded] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await window.storage.get("save_" + PLAYER_ID, false);
        if (res && res.value && !cancelled) {
          const s = JSON.parse(res.value);
          if (s && s.v === SAVE_VERSION) {
            setCash(s.cash ?? 500);
            setVaultCash(s.vaultCash ?? 0);
            setVaultCap(s.vaultCap ?? 10000);
            setBankCash(s.bankCash ?? 0);
            setDetectiveHeat(s.detectiveHeat ?? 0);
            setBountiesDone(s.bountiesDone ?? 0);
            setTraining(s.training ?? {});
            setAvatar(s.avatar ?? "🕴️");
            setStaff(s.staff ?? {});
            setPersonalItems(s.personalItems ?? {});
            setMeetingStreak(s.meetingStreak ?? 0);
            setRespect(s.respect ?? 0);
            setHealth(s.health ?? 100);
            setEnergy(s.energy ?? 100);
            setHeat(s.heat ?? 0);
            setXp(s.xp ?? 0);
            setKills(s.kills ?? 0);
            setIntel(s.intel ?? 0);
            setOwned(s.owned ?? {});
            setHideout(s.hideout ?? "motel");
            setCrew(s.crew ?? {});
            setGuards(s.guards ?? {});
            setPortfolio(s.portfolio ?? {});
            setFxHoldings(s.fxHoldings ?? {});
            setUnlockedCities(s.unlockedCities ?? ["newark"]);
            setCurrentCity(s.currentCity ?? "newark");
            setRep(s.rep ?? { commission: 0, cartel: 0, feds: 0, order: 0, wire: 0 });
            setJailTicks(s.jailTicks ?? 0);
            setPriorArrests(s.priorArrests ?? 0);
            setArmorCharges(s.armorCharges ?? 0);
            setWeaponCharges(s.weaponCharges ?? 0);
            setSeenLevels(s.seenLevels ?? [1]);
            if (s.seenLevels && s.seenLevels.length > 0) setActiveStory(null); // returning player: skip replaying the intro
            if (s.log && s.log.length) setLog(s.log);
          }
        }
      } catch (e) {
        console.warn("[save] load failed, starting fresh:", e?.message);
      }
      if (!cancelled) setSaveLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!saveLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const snapshot = {
        v: SAVE_VERSION, cash, vaultCash, vaultCap, bankCash, detectiveHeat, bountiesDone, training, avatar,
        staff, personalItems, meetingStreak, respect, health, energy, heat, xp, kills, intel, owned, hideout,
        crew, guards, portfolio, fxHoldings, unlockedCities, currentCity, rep, jailTicks, priorArrests, seenLevels,
        armorCharges, weaponCharges,
        log: log.slice(0, 10),
      };
      window.storage.set("save_" + PLAYER_ID, JSON.stringify(snapshot), false)
        .catch((e) => console.warn("[save] write failed:", e?.message));
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveLoaded, cash, vaultCash, vaultCap, bankCash, detectiveHeat, bountiesDone, training, avatar, staff,
      personalItems, meetingStreak, respect, health, energy, heat, xp, kills, intel, owned, hideout, crew,
      guards, portfolio, fxHoldings, unlockedCities, currentCity, rep, jailTicks, priorArrests, seenLevels, armorCharges, weaponCharges]);

  const pushLog = useCallback((text, tone = "neutral") => {
    logId.current += 1;
    setLog((L) => [{ id: logId.current, text, tone }, ...L].slice(0, 40));
  }, []);

  useEffect(() => { adManager.init(); goFullscreen(); }, []);
  const pushChat = useCallback((contactId, text) => {
    chatId.current += 1;
    setChatMessages((M) => [...M, { id: chatId.current, contactId, text }].slice(-30));
  }, []);

  // ---- real multiplayer: shared storage for global chat, trade board, leaderboard ----
  const [leaderboard, setLeaderboard] = useState([]);
  const syncShared = useCallback(async () => {
    try {
      const chatRes = await window.storage.get("global_chat", true);
      if (chatRes && chatRes.value) setGlobalChat(JSON.parse(chatRes.value).slice(-40));
    } catch (e) { /* key not created yet */ }
    try {
      const tradeRes = await window.storage.get("trade_board", true);
      if (tradeRes && tradeRes.value) setTradeBoard(JSON.parse(tradeRes.value).slice(-30));
    } catch (e) { /* key not created yet */ }
    try {
      const lbRes = await window.storage.get("leaderboard", true);
      if (lbRes && lbRes.value) setLeaderboard(JSON.parse(lbRes.value));
    } catch (e) { /* key not created yet */ }
  }, []);
  useEffect(() => {
    syncShared();
    pollRef.current = setInterval(syncShared, 4000);
    return () => clearInterval(pollRef.current);
  }, [syncShared]);

  async function sendGlobalChat() {
    if (!chatDraft.trim()) return;
    const msg = { id: Date.now(), from: playerName, text: chatDraft.trim() };
    try {
      const cur = await window.storage.get("global_chat", true).catch(() => null);
      const arr = cur && cur.value ? JSON.parse(cur.value) : [];
      const next = [...arr, msg].slice(-60);
      await window.storage.set("global_chat", JSON.stringify(next), true);
      setGlobalChat(next.slice(-40));
    } catch (e) { pushLog("Wire's down — message didn't send.", "warn"); }
    setChatDraft("");
  }
  async function postTradeOffer() {
    if (!tradeDraft.item.trim() || !tradeDraft.price) return;
    const offer = { id: Date.now(), from: playerName, item: tradeDraft.item.trim(), price: Number(tradeDraft.price) };
    try {
      const cur = await window.storage.get("trade_board", true).catch(() => null);
      const arr = cur && cur.value ? JSON.parse(cur.value) : [];
      const next = [...arr, offer].slice(-40);
      await window.storage.set("trade_board", JSON.stringify(next), true);
      setTradeBoard(next.slice(-30));
      pushLog(`Listed "${offer.item}" on the trade board for $${fmt(offer.price)}.`, "good");
    } catch (e) { pushLog("Trade board unreachable right now.", "warn"); }
    setTradeDraft({ item: "", price: "" });
  }
  function buyTradeOffer(offer) {
    if (cash < offer.price) { pushLog(`Can't cover ${offer.item} — need $${fmt(offer.price)}.`, "warn"); return; }
    setCash((c) => c - offer.price);
    pushLog(`Bought "${offer.item}" from ${offer.from} for $${fmt(offer.price)}.`, "good");
  }

  const hideoutData = HIDEOUTS.find((h) => h.id === hideout);
  const schoolRiskCut = Math.min(0.5, (training.streetwise || 0) * 0.02);
  const schoolIncomeBoost = (training.finance || 0) * 0.04;
  const schoolDmgCut = Math.min(0.5, (training.combat || 0) * 0.04);
  const schoolHackBoost = (training.tradecraft || 0) * 0.05;
  const accountantBonus = 1 + (crew.accountant ? 0.25 * crew.accountant : 0) + schoolIncomeBoost + (staff.manager ? 0.20 : 0);
  const fixerCut = crew.fixer ? Math.min(0.6, 0.15 * crew.fixer) : 0;
  const muscleCut = Math.min(0.7, (crew.muscle ? 0.1 * crew.muscle : 0) + schoolRiskCut);
  const hackerBonus = 1 + (crew.hacker ? 0.3 * crew.hacker : 0) + schoolHackBoost;
  const guardArrestCut = Object.entries(guards).reduce((s, [id, n]) => { const g = BODYGUARDS.find((x) => x.id === id); return s + (g ? g.arrestCut * n : 0); }, 0);
  const guardDmgCut = Math.min(0.75, Object.entries(guards).reduce((s, [id, n]) => { const g = BODYGUARDS.find((x) => x.id === id); return s + (g ? g.dmgCut * n : 0); }, 0) + schoolDmgCut);
  const hasSecretary = !!staff.secretary;
  const hasAssistant = !!staff.assistant;
  const hasManager = !!staff.manager;
  const hasChief = !!staff.chiefofstaff;
  const level = 1 + Math.floor(xp / 9000);
  const { cur: rank, next: nextRank } = rankFor(xp);

  const { cur: wealth } = wealthFor(cash);
  const wealthTier = wealthTierIndex(cash);
  const passiveIncome = Object.entries(owned).reduce((sum, [id, n]) => { const b = BUSINESSES.find((x) => x.id === id); return sum + (b ? b.income * n : 0); }, 0) * accountantBonus;
  const assetCount = Object.values(owned).reduce((a, b) => a + b, 0);
  const totalCrew = Object.values(crew).reduce((a, b) => a + b, 0) + Object.values(guards).reduce((a, b) => a + b, 0);
  const portfolioValue = Object.entries(portfolio).reduce((sum, [id, n]) => { const s = shares.find((x) => x.id === id); return sum + (s ? s.price * n : 0); }, 0);
  const fxValue = Object.entries(fxHoldings).reduce((sum, [id, n]) => { const s = fx.find((x) => x.id === id); return sum + (s ? s.price * n : 0); }, 0);
  const businessesValue = Object.entries(owned).reduce((sum, [id, n]) => { const b = BUSINESSES.find((x) => x.id === id); return sum + (b ? b.cost * n : 0); }, 0);
  const personalItemsValue = Object.keys(personalItems).reduce((sum, id) => { const item = PERSONAL_ITEMS.find((x) => x.id === id); return sum + (item ? item.cost : 0); }, 0);
  // Net worth counts everything: cash on hand, bank + vault (protected but
  // still yours), share and forex holdings, every business you own (at cost
  // basis), and the personal collection. This is what the leaderboard ranks by.
  const netWorth = cash + bankCash + vaultCash + portfolioValue + fxValue + businessesValue + personalItemsValue;

  // post this player's standing to the shared leaderboard every ~20s.
  // netWorth (computed above) covers everything — cash, bank, vault, shares,
  // forex, every business, the personal collection — so "richest" actually
  // means richest, not just whoever's holding the most spare cash.
  const lbTickRef = useRef({});
  lbTickRef.current = { netWorth, level, rank };
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const cur = await window.storage.get("leaderboard", true).catch(() => null);
        const arr = cur && cur.value ? JSON.parse(cur.value) : [];
        const filtered = arr.filter((e) => e.id !== PLAYER_ID);
        const { netWorth: nw, level: lv, rank: rk } = lbTickRef.current;
        filtered.push({ id: PLAYER_ID, name: playerName, cash: nw, level: lv, title: rk.title });
        filtered.sort((a, b) => b.cash - a.cash);
        const next = filtered.slice(0, 20);
        await window.storage.set("leaderboard", JSON.stringify(next), true);
        setLeaderboard(next);
      } catch (e) { /* offline, skip this beat */ }
    }, 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const unseen = STORY_BEATS.filter((b) => b.level <= level && !seenLevels.includes(b.level));
    if (unseen.length > 0 && !activeStory) setActiveStory(unseen[unseen.length - 1]);
  }, [level, seenLevels, activeStory]);

  const lastDetectiveTier = useRef(-1);
  useEffect(() => {
    const tier = DETECTIVES.filter((d) => detectiveHeat >= d.threshold).length - 1;
    if (tier >= 0 && tier !== lastDetectiveTier.current) {
      lastDetectiveTier.current = tier;
      pushChat("ruiz", DETECTIVES[tier].text);
    }
  }, [detectiveHeat, pushChat]);

  // Everything the tick needs to read lives in a ref, updated every render.
  // The interval itself is created exactly once — it no longer tears down
  // and rebuilds every 2s as state changes, which is what caused things to
  // bog down after a long session with lots of purchases.
  const tickState = useRef({});
  tickState.current = { owned, crew, guards, staff, accountantBonus, hideoutData, jailTicks, cash, vaultCash, bankCash, rep, heat, assetCount, detectiveHeat, portfolio, fixerCut: 0 };

  useEffect(() => {
    const t = setInterval(() => {
      const s = tickState.current;
      if (s.jailTicks > 0) { setJailTicks((j) => Math.max(0, j - 1)); setHealth((h) => clamp(h + 1, 0, 100)); return; }
      const wages = Object.entries(s.crew).reduce((sum, [id, n]) => { const r = CREW_ROLES.find((x) => x.id === id); return sum + (r ? r.wage * n : 0); }, 0)
        + Object.entries(s.guards).reduce((sum, [id, n]) => { const g = BODYGUARDS.find((x) => x.id === id); return sum + (g ? g.wage * n : 0); }, 0)
        + Object.entries(s.staff).reduce((sum, [id, n]) => { const r = EXECUTIVE_STAFF.find((x) => x.id === id); return sum + (r ? r.wage * n : 0); }, 0);
      const passive = Object.entries(s.owned).reduce((sum, [id, n]) => { const b = BUSINESSES.find((x) => x.id === id); return sum + (b ? b.income * n : 0); }, 0) * s.accountantBonus;
      const dividends = Object.entries(s.portfolio).reduce((sum, [id, n]) => { const sh = SHARES.find((x) => x.id === id); return sum + (sh ? sh.price * sh.div * n : 0); }, 0);
      if (passive > 0 || wages > 0 || dividends > 0) setCash((c) => Math.max(0, c + passive + dividends - wages));
      setBankCash((b) => b > 0 ? b * 1.00012 : b);
      setEnergy((e) => clamp(e + 2, 0, 100));
      const heatDecayMult = s.staff.chiefofstaff ? 1.5 : 1;
      setHeat((h) => clamp(h - (s.hideoutData?.heatDecay || 1) * heatDecayMult, 0, 100));
      setHealth((h) => clamp(h + 1, 0, 100));
      setShares((S) => S.map((sh) => { const np = Math.max(1, sh.price * (1 + (Math.random() - 0.5) * sh.vol * 0.3)); return { ...sh, price: np, history: [...sh.history, np].slice(-20) }; }));
      setFx((S) => S.map((sh) => { const np = Math.max(0.001, sh.price * (1 + (Math.random() - 0.5) * sh.vol * 0.2)); return { ...sh, price: np, history: [...sh.history, np].slice(-20) }; }));
      setMeetingCooldown((c) => Math.max(0, c - 1));
      const newDetectiveHeat = clamp(s.detectiveHeat + (s.heat > 45 ? 0.6 : -0.3), 0, 100);
      setDetectiveHeat(newDetectiveHeat);
      if (newDetectiveHeat >= 100 && s.jailTicks <= 0) {
        const seized = Math.round(s.cash * 0.6);
        setCash((c) => Math.max(0, c - seized));
        setJailTicks(40);
        setDetectiveHeat(0);
        setHeat(0);
        pushLog(`SWAT hit your operation. $${fmt(seized)} seized, door came off the hinges. Hard time this round.`, "bad");
        pushChat("ruiz", "Told you I don't give up. See you in court.");
      }
      setBountyCooldown((c) => Math.max(0, c - 1));
      setAdCooldowns((c) => ({ cash: Math.max(0, c.cash - 2), energy: Math.max(0, c.energy - 2), gear: Math.max(0, c.gear - 2) }));
      if (s.heat > 80 && Math.random() < 0.06) setSwatWarning(true);
      if (Math.random() < 0.35) {
        const pool = FLAVOR_MESSAGES.filter((m) => m.cond({ cashOnHand: s.cash, vaultCash: s.vaultCash, rep: s.rep, heat: s.heat, assetCount: s.assetCount }));
        if (pool.length) { const pick = pool[Math.floor(Math.random() * pool.length)]; pushChat(pick.contactId, pick.text); }
      }
    }, 2000);
    return () => clearInterval(t);
  }, [pushChat]);

  function dismissStory() {
    const upTo = activeStory.level;
    setSeenLevels((s) => Array.from(new Set([...s, ...STORY_BEATS.filter((b) => b.level <= upTo).map((b) => b.level)])));
    setActiveStory(null);
  }

  function doCrime(crime) {
    if (busy || jailTicks > 0) return;
    if (energy < crime.energy) { pushLog(`Too tired for "${crime.name}". Rest up.`, "warn"); return; }
    if (level < crime.level) { pushLog(`"${crime.name}" needs more standing first.`, "warn"); return; }
    setBusy(crime.id);
    setTimeout(() => {
      setEnergy((e) => e - crime.energy);
      const effectiveRisk = crime.risk * (1 - muscleCut);
      const caught = Math.random() < effectiveRisk;
      if (caught) {
        const weaponCut = weaponCharges > 0 ? 0.2 : 0;
        if (weaponCharges > 0) setWeaponCharges((w) => w - 1);
        const baseArrest = heat > 80 ? 0.5 : heat > 50 ? 0.28 : 0.12;
        const arrestChance = Math.max(0.02, baseArrest - guardArrestCut - weaponCut);
        if (Math.random() < arrestChance) {
          const seized = Math.round(cash * 0.4);
          setCash((c) => c - seized);
          // Repeat-offender multiplier is capped so sentences get worse but never
          // spiral into unplayable hour-long lockups — hard ceiling at 90 ticks (3 min).
          const cappedPriorArrests = Math.min(priorArrests, 6);
          const rawTerm = Math.round((6 + crime.level * 2.5) * (1 + cappedPriorArrests * 0.35));
          const term = Math.min(rawTerm, 90);
          setJailTicks(term);
          setPriorArrests((p) => p + 1);
          setHeat(0);
          pushLog(`Cuffed on "${crime.name}." $${fmt(seized)} seized. ${priorArrests > 0 ? "Repeat offender — " : ""}${term * 2}s in county.`, "bad");
          pushChat("graves", "Told you we were watching. See you at arraignment.");
        } else {
          const armorCut = armorCharges > 0 ? 0.4 : 0;
          if (armorCharges > 0) setArmorCharges((a) => a - 1);
          const dmg = Math.round((8 + Math.random() * 15) * (1 - guardDmgCut - armorCut));
          setHealth((h) => clamp(h - dmg, 0, 100));
          setHeat((h) => clamp(h + crime.heat * 1.6 * (1 - fixerCut), 0, 100));
          pushLog(`"${crime.name}" went sideways — you took a beating (-${dmg} health).${armorCharges > 0 ? " Armor absorbed some of it." : ""}`, "bad");
        }
      } else {
        const payout = Math.round(crime.minCash + Math.random() * (crime.maxCash - crime.minCash));
        if (hasAssistant) {
          const toVault = Math.round(payout * 0.5);
          setCash((c) => c + payout - toVault);
          setVaultCash((v) => Math.min(vaultCap, v + toVault));
        } else {
          setCash((c) => c + payout);
        }
        setXp((x) => x + crime.xp);
        setHeat((h) => clamp(h + crime.heat * (1 - fixerCut), 0, 100));
        setRespect((r) => r + Math.round(crime.xp / 4));
        if (crime.id === "hit") setKills((k) => k + 1);
        if (crime.id === "cartel_run" || crime.id === "cartel_border") setRep((r) => ({ ...r, cartel: r.cartel + 4 }));
        if (crime.id === "hack_job") setRep((r) => ({ ...r, wire: r.wire + 4 }));
        pushLog(`"${crime.name}" paid out $${fmt(payout)}.${hasAssistant ? " Your assistant banked half automatically." : ""}`, "good");
      }
      setBusy(null);
    }, 650);
  }

  function payBail() {
    const cost = jailTicks * 260;
    if (cash < cost) { pushLog(`Can't cover bail — need $${fmt(cost)}.`, "warn"); return; }
    setCash((c) => c - cost); setJailTicks(0);
    pushLog(`Posted bail for $${fmt(cost)}. Walk out slow, eyes down.`, "good");
  }
  function buyBusiness(b, cat) {
    if (level < cat.level) { pushLog(`${cat.label} needs LVL ${cat.level} standing.`, "warn"); return; }
    const n = owned[b.id] || 0;
    const price = growPrice(b.cost, n, 1.15, 45);
    if (cash < price) { pushLog(`Can't cover ${b.name} yet — need $${fmt(price)}.`, "warn"); return; }
    setCash((c) => c - price); setOwned((o) => ({ ...o, [b.id]: n + 1 }));
    pushLog(`Acquired ${b.name} #${n + 1}. Passive income up.`, "good");
  }
  function upgradeHideout(h) {
    if (h.id === hideout) return;
    const idx = HIDEOUTS.findIndex((x) => x.id === h.id), curIdx = HIDEOUTS.findIndex((x) => x.id === hideout);
    if (idx < curIdx) { setHideout(h.id); return; }
    if (cash < h.cost) { pushLog(`Need $${fmt(h.cost)} to move into ${h.name}.`, "warn"); return; }
    setCash((c) => c - h.cost); setHideout(h.id); setRespect((r) => r + h.respectBonus);
    pushLog(`Moved into ${h.name}. Heat cools faster now.`, "good");
  }
  function hireCrew(role) {
    const n = crew[role.id] || 0;
    const cost = growPrice(role.cost, n, 1.3, 25);
    if (cash < cost) { pushLog(`Can't afford another ${role.name} ($${fmt(cost)}).`, "warn"); return; }
    setCash((c) => c - cost); setCrew((c) => ({ ...c, [role.id]: n + 1 }));
    pushLog(`Brought a ${role.name} into the crew.`, "good");
  }
  function hireGuard(g) {
    const n = guards[g.id] || 0;
    const cost = growPrice(g.cost, n, 1.35, 20);
    if (cash < cost) { pushLog(`Can't afford another ${g.name} ($${fmt(cost)}).`, "warn"); return; }
    setCash((c) => c - cost); setGuards((c) => ({ ...c, [g.id]: n + 1 }));
    pushLog(`${g.name} is on payroll now — watching your back.`, "good");
  }
  function hireStaff(role) {
    if (staff[role.id]) { pushLog(`${role.name} is already on staff — only one needed.`, "warn"); return; }
    if (level < role.level) { pushLog(`${role.name} won't work for anyone under LVL ${role.level}.`, "warn"); return; }
    if (cash < role.cost) { pushLog(`${role.name} costs $${fmt(role.cost)}.`, "warn"); return; }
    setCash((c) => c - role.cost); setStaff((s) => ({ ...s, [role.id]: 1 }));
    pushLog(`${role.name} joins your operation. ${role.desc}`, "good");
  }
  function buyPersonalItem(item) {
    if (personalItems[item.id]) { pushLog(`Already own the ${item.name}.`, "warn"); return; }
    if (cash < item.cost) { pushLog(`${item.name} costs $${fmt(item.cost)}.`, "warn"); return; }
    setCash((c) => c - item.cost); setPersonalItems((p) => ({ ...p, [item.id]: true })); setRespect((r) => r + item.respect);
    pushLog(`Acquired the ${item.name} for the collection. Pure prestige — no income, all statement.`, "good");
  }
  function buyShare(s) { if (cash < s.price) { pushLog(`Not enough cash for ${s.name}.`, "warn"); return; } setCash((c) => c - Math.round(s.price)); setPortfolio((p) => ({ ...p, [s.id]: (p[s.id] || 0) + 1 })); }
  function sellShare(s) { const n = portfolio[s.id] || 0; if (n <= 0) return; setCash((c) => c + Math.round(s.price)); setPortfolio((p) => ({ ...p, [s.id]: n - 1 })); }
  function buyFx(s) { const cost = Math.round(1000 * s.price); if (cash < cost) { pushLog(`Not enough cash to buy ${s.name}.`, "warn"); return; } setCash((c) => c - cost); setFxHoldings((p) => ({ ...p, [s.id]: (p[s.id] || 0) + 1000 })); }
  function sellFx(s) { const n = fxHoldings[s.id] || 0; if (n < 1000) return; setCash((c) => c + Math.round(1000 * s.price)); setFxHoldings((p) => ({ ...p, [s.id]: n - 1000 })); }
  function depositVault(amt) { const room = vaultCap - vaultCash; const a = Math.min(amt, cash, room); if (a <= 0) return; setCash((c) => c - a); setVaultCash((v) => v + a); pushLog(`Stashed $${fmt(a)} in the vault.`, "good"); }
  function withdrawVault(amt) { const a = Math.min(amt, vaultCash); if (a <= 0) return; setVaultCash((v) => v - a); setCash((c) => c + a); }
  function upgradeVault() {
    // flat, gentle scaling — vault capacity shouldn't be the expensive part of the game
    const cost = Math.round(vaultCap * 0.35);
    if (cash < cost) { pushLog(`Vault upgrade needs $${fmt(cost)}.`, "warn"); return; }
    setCash((c) => c - cost); setVaultCap((v) => Math.round(v * 1.4));
    pushLog(`Vault capacity expanded.`, "good");
  }
  function bankDeposit(amt) { const a = Math.min(amt, cash); if (a <= 0) return; setCash((c) => c - a); setBankCash((b) => b + a); pushLog(`Deposited $${fmt(a)} into the bank — earning interest, but seizable if the Feds move first.`, "good"); }
  function bankWithdraw(amt) { const a = Math.min(amt, bankCash); if (a <= 0) return; setBankCash((b) => b - a); setCash((c) => c + a); }
  function bribeDetective() {
    const cost = Math.round(detectiveHeat * 40);
    if (detectiveHeat < 10) return;
    if (cash < cost) { pushLog(`Can't afford to make Ruiz look elsewhere ($${fmt(cost)}).`, "warn"); return; }
    setCash((c) => c - cost); setDetectiveHeat(0);
    pushLog(`Paid $${fmt(cost)} to get Detective Ruiz reassigned. For now.`, "good");
  }
  function rollBounty() {
    if (bountyCooldown > 0 || activeBounty) return;
    const pick = BOUNTY_POOL[Math.floor(Math.random() * BOUNTY_POOL.length)];
    setActiveBounty(pick);
  }
  function completeBounty() {
    if (!activeBounty) return;
    if (energy < activeBounty.energy) { pushLog(`Too tired for this bounty.`, "warn"); return; }
    setEnergy((e) => e - activeBounty.energy);
    setCash((c) => c + activeBounty.reward);
    setXp((x) => x + activeBounty.xp);
    setBountiesDone((b) => b + 1);
    pushLog(`Bounty complete: "${activeBounty.name}" — $${fmt(activeBounty.reward)}.`, "good");
    setActiveBounty(null);
    setBountyCooldown(Math.round((25 + Math.floor(Math.random() * 20)) * (hasSecretary ? 0.7 : 1)));
  }
  function trainSkill(s) {
    const n = training[s.id] || 0;
    if (n >= s.cap) { pushLog(`${s.name} is fully mastered.`, "warn"); return; }
    const cost = Math.round(s.cost * Math.pow(1.6, n));
    if (cash < cost) { pushLog(`${s.name} costs $${fmt(cost)}.`, "warn"); return; }
    setCash((c) => c - cost); setTraining((t) => ({ ...t, [s.id]: n + 1 }));
    pushLog(`Completed a level of ${s.name}.`, "good");
  }
  function travelTo(city) {
    if (unlockedCities.includes(city.id)) { setCurrentCity(city.id); return; }
    if (cash < city.cost) { pushLog(`Need $${fmt(city.cost)} to open territory in ${city.name}.`, "warn"); return; }
    setCash((c) => c - city.cost); setUnlockedCities((u) => [...u, city.id]); setCurrentCity(city.id);
    pushLog(`Claimed new territory: ${city.name}, ${city.country}. You ${TRAVEL_MODES[city.mode].label}.`, "good");
  }
  function bribeHeat() { const cost = Math.round(heat * 12); if (heat < 5) return; if (cash < cost) { pushLog(`Can't afford to grease the badges ($${fmt(cost)} needed).`, "warn"); return; } setCash((c) => c - cost); setHeat(0); pushLog(`Paid $${fmt(cost)} to make your heat problem disappear.`, "good"); }
  function scrollTabs(dir) { if (tabBarRef.current) tabBarRef.current.scrollBy({ left: dir * 160 }); }
  const touchStartX = useRef(null);
  function onContentTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function onContentTouchEnd(e) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;
    const idx = TABS.findIndex((t) => t.id === tab);
    if (dx < 0 && idx < TABS.length - 1) setTab(TABS[idx + 1].id); // swipe left -> next tab
    else if (dx > 0 && idx > 0) setTab(TABS[idx - 1].id); // swipe right -> previous tab
    setSwipeHint(false);
  }
  const DON_FACTION = { torrino: "commission", reyes: "cartel", graves: "feds", cipher: "wire", sable: "order" };
  const recentMeetings = useRef([]);
  function openMeeting() {
    if (meetingCooldown > 0) return;
    const picked = pickMeeting(recentMeetings.current);
    recentMeetings.current = [picked.title, ...recentMeetings.current].slice(0, 4);
    setActiveMeeting(picked);
  }
  function resolveMeeting(choice) {
    const e = choice.effects;
    if (e.cash) setCash((c) => c + e.cash);
    if (e.cashPct) setCash((c) => Math.max(0, c + c * e.cashPct));
    if (e.heat) setHeat((h) => clamp(h + e.heat, 0, 100));
    if (e.heatPct) setHeat((h) => clamp(h + h * e.heatPct, 0, 100));
    if (e.xp) setXp((x) => x + e.xp);
    if (e.respect) setRespect((r) => r + e.respect);
    if (e.rep) setRep((r) => { const nr = { ...r }; Object.entries(e.rep).forEach(([k, v]) => { nr[k] = clamp((nr[k] || 0) + v, -100, 100); }); return nr; });
    let resultText = choice.result;
    setMeetingStreak((st) => {
      const next = st + 1;
      if (next > 0 && next % 3 === 0) { setXp((x) => x + 60); resultText += " Showing up consistently is starting to pay off — bonus standing."; }
      return next;
    });
    pushLog(resultText, "neutral");
    pushChat(activeMeeting.don, resultText);
    setMeetingResult(resultText);
    setTimeout(() => { setActiveMeeting(null); setMeetingResult(null); setMeetingCooldown(Math.round((20 + Math.floor(Math.random() * 15)) * (hasSecretary ? 0.7 : 1))); }, 1600);
  }
  function declineMeeting() {
    const faction = DON_FACTION[activeMeeting.don];
    setRep((r) => ({ ...r, [faction]: clamp((r[faction] || 0) - 25, -100, 100) }));
    setRespect((r) => Math.max(0, r - 15));
    setMeetingStreak(0);
    const don = DONS.find((d) => d.id === activeMeeting.don);
    const text = `You don't show. ${don?.name} doesn't forget who skips a sit-down.`;
    pushLog(text, "bad");
    pushChat(activeMeeting.don, "We had a meeting. You weren't there. That's a message, and I heard it.");
    setMeetingResult(text);
    setTimeout(() => { setActiveMeeting(null); setMeetingResult(null); setMeetingCooldown(Math.round((20 + Math.floor(Math.random() * 15)) * (hasSecretary ? 0.7 : 1))); }, 1600);
  }
  function startHack(target) {
    if (jailTicks > 0) return;
    setHackTarget(target); setHackPulse(0);
    setHackLines([`root@wire:~$ connect --target ${target.id}`, `[wire] session opened, difficulty ${target.diff}`]);
  }
  function hackTap() {
    if (!hackTarget) return;
    const win = Math.random() < 0.5 + hackTarget.diff * -0.03;
    const nextPulse = hackPulse + 1;
    const flavor = HACK_FLAVOR[Math.floor(Math.random() * HACK_FLAVOR.length)];
    setHackLines((L) => [...L, `[${nextPulse}/${hackTarget.diff + 2}] ${flavor} ... ${win || nextPulse < hackTarget.diff + 2 ? "OK" : "TRACED"}`]);
    setHackPulse(nextPulse);
    if (nextPulse >= hackTarget.diff + 2) {
      if (win) {
        const payout = Math.round(hackTarget.reward * hackerBonus);
        if (payout) setCash((c) => c + payout);
        setIntel((i) => i + hackTarget.intel);
        if (hackTarget.heatCut) setHeat((h) => clamp(h - hackTarget.heatCut, 0, 100));
        setRep((r) => ({ ...r, wire: clamp(r.wire + 6, -100, 100) }));
        setHackLines((L) => [...L, `[wire] access granted — extraction complete`]);
        pushLog(`Cracked "${hackTarget.name}" — ${payout ? `$${fmt(payout)}, ` : ""}+${hackTarget.intel} intel.`, "good");
      } else {
        setHeat((h) => clamp(h + 15, 0, 100));
        setHackLines((L) => [...L, `[wire] connection traced — disconnecting`]);
        pushLog(`"${hackTarget.name}" tripped a trace. Heat spiked.`, "bad");
      }
      setTimeout(() => { setHackTarget(null); setHackPulse(0); setHackLines([]); }, 1400);
    }
  }

  const toneColor = { good: "#7fae6b", bad: "#c14b3f", warn: "#d4af37", neutral: "#8f8f8f" };

  if (!saveLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", color: "#8f8f8f", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Cinzel', serif", fontSize: 14, letterSpacing: "0.1em" }}>
        RESTORING YOUR EMPIRE...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050505", backgroundImage: "radial-gradient(ellipse at top, #0a0a0a 0%, #050505 60%)", color: "#f2f0ed", fontFamily: "'Inter', sans-serif", paddingBottom: 84 }}>
      <style>{FONT_IMPORT}{`* { box-sizing: border-box; } ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #4a3d2f; border-radius: 3px; } button { font-family: inherit; } input { font-family: inherit; } @keyframes blink { 50% { opacity: 0; } }`}</style>

      {activeStory && (
        <Modal width={380}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: "0.2em", color: "#d4af37", textTransform: "uppercase" }}>Chapter</div>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 30, color: "#e5233f", margin: "4px 0 12px" }}>{activeStory.title}</div>
          <div style={{ fontSize: 16, lineHeight: 1.65, color: "#e8e6e3", fontStyle: "italic" }}>{activeStory.text}</div>
          <button onClick={dismissStory} style={{ marginTop: 18, width: "100%", padding: "11px 0", background: "#e5233f", color: "#f2f0ed", border: "none", borderRadius: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>CONTINUE</button>
        </Modal>
      )}

      {swatWarning && (
        <Modal width={320}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>🚨</div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26, color: "#c14b3f", margin: "8px 0" }}>SWAT STAGING NEARBY</div>
            <div style={{ fontSize: 14, color: "#e8e6e3", marginBottom: 16 }}>Heat's too high — a tactical unit is watching your territory. Cool off or grease someone, fast.</div>
            <button onClick={() => setSwatWarning(false)} style={{ width: "100%", padding: "11px 0", background: "#e5233f", color: "#f2f0ed", border: "none", borderRadius: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>UNDERSTOOD</button>
          </div>
        </Modal>
      )}

      {activeMeeting && (() => {
        const don = DONS.find((d) => d.id === activeMeeting.don);
        return (
          <Modal width={360}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>{don?.icon}</span>
              <div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "#d4af37" }}>{don?.name} · {don?.org}</div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, color: "#f2f0ed" }}>{activeMeeting.title}</div>
              </div>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: "#e8e6e3", marginBottom: 16 }}>{activeMeeting.text}</div>
            {meetingResult ? (
              <div style={{ fontSize: 14, color: "#d4af37", fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>{meetingResult}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activeMeeting.choices.map((c, i) => (
                  <button key={i} onClick={() => resolveMeeting(c)} style={{ padding: "10px 12px", background: "rgba(212,175,55,0.08)", border: "1px solid #d4af3755", borderRadius: 6, color: "#f2f0ed", textAlign: "left", cursor: "pointer", fontFamily: "'Cinzel', serif", fontSize: 12.5 }}>{c.label}</button>
                ))}
                <button onClick={declineMeeting} style={{ padding: "10px 12px", background: "transparent", border: "1px solid #c14b3f55", borderRadius: 6, color: "#c14b3f", textAlign: "left", cursor: "pointer", fontFamily: "'Cinzel', serif", fontSize: 12.5 }}>Don't show up (skip the meeting entirely)</button>
              </div>
            )}
          </Modal>
        );
      })()}

      {hackTarget && (
        <Modal width={360}>
          <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #262626" }}>
            <div style={{ background: "#1a1a1a", padding: "7px 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#c14b3f" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#d4af37" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#7fae6b" }} />
              <div style={{ marginLeft: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#8f8f8f" }}>wire@omerta — {hackTarget.name}</div>
            </div>
            <div style={{ background: "#0a0a0a", padding: 12, minHeight: 190, maxHeight: 240, overflowY: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: "#4fe08a", lineHeight: 1.7 }}>
              {hackLines.map((l, i) => <div key={i}>{l}</div>)}
              <div><span style={{ opacity: 0.7 }}>root@wire:~$</span> <span style={{ animation: "blink 1s steps(1) infinite" }}>▍</span></div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "#767676", margin: "10px 0", fontStyle: "italic", textAlign: "center" }}>Fictional terminal mini-game — flavor output only, no real exploit techniques.</div>
          <button onClick={hackTap} style={{ width: "100%", padding: "13px 0", background: "#4fb8c9", color: "#050505", border: "none", borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>▶ RUN NEXT STAGE ({hackPulse}/{hackTarget.diff + 2})</button>
          <button onClick={() => { setHackTarget(null); setHackPulse(0); setHackLines([]); }} style={{ width: "100%", marginTop: 8, padding: "9px 0", background: "transparent", color: "#767676", border: "1px solid #262626", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Disconnect</button>
        </Modal>
      )}

      {jailTicks > 0 && (
        <Modal width={320}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40 }}>⛓️</div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, color: "#c14b3f", margin: "8px 0" }}>COUNTY LOCKUP</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#9a9a9a", marginBottom: 6 }}>{jailTicks * 2}s remaining</div>
            {priorArrests > 1 && <div style={{ fontSize: 11, color: "#c14b3f", marginBottom: 10, fontStyle: "italic" }}>Repeat offender — sentences stack harder now.</div>}
            <button onClick={payBail} style={{ width: "100%", padding: "11px 0", background: "#e5233f", color: "#f2f0ed", border: "none", borderRadius: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>POST BAIL — ${fmt(jailTicks * 260)}</button>
            <div style={{ fontSize: 12, color: "#767676", marginTop: 10, fontStyle: "italic" }}>Or wait it out. Your fronts keep running without you.</div>
          </div>
        </Modal>
      )}

      {/* compact top bar — small, always visible, doesn't push tab content down */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #262626", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: "#0a0a0a", border: "1px solid #d4af3755", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{avatar}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: 15, color: "#e5233f", letterSpacing: "0.04em" }}>OMERTÀ</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#767676", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>LVL {level} · {rank.title} · {CITIES.find((c) => c.id === currentCity)?.name}</div>
        </div>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, color: "#7fae6b" }}>${fmt(cash)}</div>
        <button onClick={() => setLedgerOpen((o) => !o)} style={{ background: "none", border: "1px solid #333333", borderRadius: 6, color: "#9a9a9a", width: 30, height: 30, cursor: "pointer", fontSize: 13 }}>{ledgerOpen ? "▲" : "▾"}</button>
      </div>

      {ledgerOpen && (
        <div style={{ padding: "0 18px 14px", borderBottom: "1px solid #262626" }}>
          <StampBar pct={nextRank ? ((xp - rank.xp) / (nextRank.xp - rank.xp)) * 100 : 100} color="#d4af37" />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#666666", margin: "6px 0 10px" }}>{fmt(xp - rank.xp)} / {nextRank ? fmt(nextRank.xp - rank.xp) : "MAX"} XP to {nextRank?.title || "the top"} · Playing as {playerName}</div>
          <div style={{ background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 4, padding: "4px 12px" }}>
            <Ledger label="Cash on hand" value={`$${fmt(cash)}`} sub={wealth.label} accent="#7fae6b" />
            <Ledger label="Bank + Vault" value={`$${fmt(bankCash + vaultCash)}`} sub="protected from seizure" accent="#d4af37" />
            <Ledger label="Intel" value={fmt(intel)} accent="#4fb8c9" />
            <Ledger label="Respect" value={fmt(respect)} accent="#d4af37" />
            <Ledger label="Health" value={`${Math.round(health)}/100`} accent={health < 30 ? "#c14b3f" : "#f2f0ed"} />
            <Ledger label="Energy" value={`${Math.round(energy)}/100`} accent="#7fa8c9" />
            <Ledger label="Heat" value={`${Math.round(heat)}%`} sub={heat > 60 ? "getting dangerous" : "manageable"} accent={heat > 60 ? "#c14b3f" : "#8f8f8f"} />
            <Ledger label="Detective interest" value={`${Math.round(detectiveHeat)}%`} sub={detectiveHeat > 60 ? "Ruiz is close" : "off her radar"} accent={detectiveHeat > 60 ? "#c14b3f" : "#8f8f8f"} />
            <Ledger label="Bodies" value={kills} accent="#c14b3f" />
            <Ledger label="Passive / min" value={`$${fmt(passiveIncome * 30)}`} sub={`${assetCount} assets · ${totalCrew} crew`} accent="#7fae6b" />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {heat > 40 && <button onClick={bribeHeat} style={{ flex: 1, minWidth: 100, padding: "10px 0", background: "transparent", border: "1px solid #d4af37", color: "#d4af37", borderRadius: 4, fontFamily: "'Cinzel', serif", fontSize: 11, cursor: "pointer" }}>GREASE — ${fmt(Math.round(heat * 12))}</button>}
            {detectiveHeat > 25 && <button onClick={bribeDetective} style={{ flex: 1, minWidth: 100, padding: "10px 0", background: "transparent", border: "1px solid #c14b3f", color: "#c14b3f", borderRadius: 4, fontFamily: "'Cinzel', serif", fontSize: 11, cursor: "pointer" }}>REASSIGN RUIZ — ${fmt(Math.round(detectiveHeat * 40))}</button>}
            <button onClick={openMeeting} disabled={meetingCooldown > 0} style={{ flex: 1, minWidth: 100, padding: "10px 0", background: meetingCooldown > 0 ? "transparent" : "rgba(212,175,55,0.15)", border: `1px solid ${meetingCooldown > 0 ? "#333333" : "#d4af37"}`, color: meetingCooldown > 0 ? "#666666" : "#d4af37", borderRadius: 4, fontFamily: "'Cinzel', serif", fontSize: 11, cursor: meetingCooldown > 0 ? "not-allowed" : "pointer" }}>{meetingCooldown > 0 ? `MEETING IN ${meetingCooldown * 2}s` : "SECRET MEETING ●"}</button>
          </div>
        </div>
      )}

      <div style={{ padding: "0 18px", touchAction: "pan-y" }} onTouchStart={onContentTouchStart} onTouchEnd={onContentTouchEnd}>
        {swipeHint && (
          <div style={{ textAlign: "center", fontSize: 10.5, color: "#666666", fontStyle: "italic", padding: "4px 0 10px" }}>‹ swipe between tabs ›</div>
        )}
        {tab === "empire" && (
          <>
            <SectionTitle>Dispatch</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {log.slice(0, 8).map((l) => <div key={l.id} style={{ fontSize: 14, lineHeight: 1.4, color: toneColor[l.tone], paddingLeft: 12, borderLeft: `2px solid ${toneColor[l.tone]}55` }}>{l.text}</div>)}
            </div>
          </>
        )}

        {tab === "profile" && (
          <>
            <SectionTitle>Dossier Photo</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 10 }}>
              <div style={{ width: 72, height: 72, borderRadius: 10, background: "linear-gradient(160deg, #d4af3733, #0a0a0a)", border: "2px solid #d4af37", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38 }}>{avatar}</div>
              <div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 24, color: "#f2f0ed" }}>{playerName}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#d4af37" }}>{rank.title} · LVL {level}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#8f8f8f" }}>{wealth.label} · {CITIES.find((c) => c.id === currentCity)?.name}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setAvatar(a)} style={{ width: 40, height: 40, borderRadius: 8, fontSize: 19, background: avatar === a ? "rgba(212,175,55,0.25)" : "#0a0a0a", border: `1px solid ${avatar === a ? "#d4af37" : "#262626"}`, cursor: "pointer" }}>{a}</button>
              ))}
            </div>

            <SectionTitle>Record</SectionTitle>
            <div style={{ background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 4, padding: "4px 12px" }}>
              <Ledger label="Net worth" value={`$${fmt(netWorth)}`} sub="cash + bank + vault + shares + forex + businesses + collection" accent="#7fae6b" />
              <Ledger label="Total XP" value={fmt(xp)} accent="#d4af37" />
              <Ledger label="Bodies" value={kills} accent="#c14b3f" />
              <Ledger label="Bounties completed" value={bountiesDone} accent="#d4af37" />
              <Ledger label="Prior arrests" value={priorArrests} accent="#c14b3f" />
              <Ledger label="Crew on payroll" value={totalCrew} accent="#7fae6b" />
              <Ledger label="Assets owned" value={assetCount} accent="#7fae6b" />
            </div>

            <SectionTitle tag={STORAGE_PROVIDER === "localStorage" ? "device-only for now" : "live · shared"}>Global Richest</SectionTitle>
            {STORAGE_PROVIDER === "localStorage" && (
              <div style={{ fontSize: 12, color: "#8f8f8f", fontStyle: "italic", marginBottom: 10, padding: "8px 10px", background: "rgba(212,175,55,0.06)", border: "1px solid #d4af3733", borderRadius: 6 }}>
                This board only shows you right now — real cross-device rankings need a Firebase or Supabase project connected (see STORAGE_PROVIDER near the top of the code).
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {leaderboard.length === 0 && <div style={{ fontSize: 13, color: "#767676", fontStyle: "italic" }}>No standings reported yet. Yours posts automatically as you play.</div>}
              {leaderboard.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: p.id === PLAYER_ID ? "rgba(212,175,55,0.12)" : "rgba(20,14,10,0.5)", border: `1px solid ${p.id === PLAYER_ID ? "#d4af37" : "#262626"}`, borderRadius: 6 }}>
                  <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, color: "#767676", width: 22 }}>#{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13 }}>{p.name}{p.id === PLAYER_ID && " (you)"}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#8f8f8f" }}>LVL {p.level} · {p.title}</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#7fae6b" }}>${fmt(p.cash)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "crime" && (() => {
          const petty = CRIMES.filter((c) => c.tier < wealthTier - 1);
          const relevant = CRIMES.filter((c) => c.tier >= wealthTier - 1 && c.tier <= wealthTier + 1);
          return (
            <>
              <SectionTitle tag={`energy ${Math.round(energy)}/100 · ${wealth.label}`}>Jobs on the Street</SectionTitle>
              {petty.length > 0 && (
                <div style={{ fontSize: 12, color: "#767676", fontStyle: "italic", marginBottom: 10 }}>
                  {petty.length} petty job{petty.length > 1 ? "s" : ""} hidden — beneath a {wealth.label.toLowerCase()}. {showPettyJobs ? <button onClick={() => setShowPettyJobs(false)} style={{ background: "none", border: "none", color: "#d4af37", cursor: "pointer", textDecoration: "underline", fontSize: 12 }}>hide again</button> : <button onClick={() => setShowPettyJobs(true)} style={{ background: "none", border: "none", color: "#d4af37", cursor: "pointer", textDecoration: "underline", fontSize: 12 }}>show anyway</button>}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(showPettyJobs ? CRIMES : relevant).map((c) => {
                  const levelLocked = level < c.level;
                  const tierLocked = c.tier > wealthTier + 1;
                  const locked = levelLocked || tierLocked;
                  const tooSmall = c.tier < wealthTier - 1;
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 4, opacity: locked ? 0.45 : tooSmall ? 0.6 : 1 }}>
                      <SealButton onClick={() => doCrime(c)} disabled={locked || busy === c.id || energy < c.energy || jailTicks > 0} size={48}>{busy === c.id ? "···" : "GO"}</SealButton>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>{c.name}</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#8f8f8f", marginTop: 3 }}>
                          {tierLocked ? `needs ${WEALTH_CLASSES[Math.min(c.tier - 1, WEALTH_CLASSES.length - 1)]?.label || "more"} standing` : levelLocked ? `requires LVL ${c.level}` : `${c.energy} energy · $${fmt(c.minCash)}-${fmt(c.maxCash)} · risk ${Math.round(c.risk * (1 - muscleCut) * 100)}% · if caught, arrest odds ${Math.round(Math.max(0.02, (heat > 80 ? 0.5 : heat > 50 ? 0.28 : 0.12) - guardArrestCut) * 100)}%`}
                          {tooSmall && !locked && " · small change now, but still on the table"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {tab === "bounties" && (
          <>
            <SectionTitle tag={`${bountiesDone} completed`}>Bounty Board</SectionTitle>
            {activeBounty ? (
              <div style={{ padding: 16, background: "rgba(15,15,15,0.7)", border: "1px solid #d4af3766", borderRadius: 10, textAlign: "center" }}>
                <div style={{ fontSize: 30 }}>{activeBounty.icon}</div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, color: "#d4af37", margin: "6px 0" }}>{activeBounty.name}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#8f8f8f", marginBottom: 14 }}>${fmt(activeBounty.reward)} · {activeBounty.energy} energy · +{activeBounty.xp} xp</div>
                <button onClick={completeBounty} disabled={energy < activeBounty.energy} style={{ width: "100%", padding: "11px 0", background: energy < activeBounty.energy ? "#1a1a1a" : "#d4af37", color: "#050505", border: "none", borderRadius: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>TAKE THE BOUNTY</button>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontSize: 13, color: "#767676", fontStyle: "italic", marginBottom: 12 }}>{bountyCooldown > 0 ? `A new contract surfaces in ${bountyCooldown * 2}s.` : "A contract just came in."}</div>
                <button onClick={rollBounty} disabled={bountyCooldown > 0} style={{ padding: "10px 20px", background: bountyCooldown > 0 ? "transparent" : "rgba(212,175,55,0.15)", border: `1px solid ${bountyCooldown > 0 ? "#333333" : "#d4af37"}`, color: bountyCooldown > 0 ? "#666666" : "#d4af37", borderRadius: 6, fontFamily: "'Cinzel', serif", fontSize: 12, cursor: bountyCooldown > 0 ? "not-allowed" : "pointer" }}>CHECK THE BOARD</button>
              </div>
            )}
          </>
        )}

        {tab === "assets" && ASSET_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            <SectionTitle tag={level < cat.level ? `needs LVL ${cat.level}` : undefined}>{cat.label}</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {cat.items.map((b) => { const n = owned[b.id] || 0; const price = growPrice(b.cost, n, 1.15, 45); return <AssetTile key={b.id} id={b.id} icon={b.icon} name={b.name} sub={`+$${b.income}/tick`} price={price} owned={n} accent={cat.color} disabled={cash < price} locked={level < cat.level} onBuy={() => buyBusiness(b, cat)} />; })}
            </div>
          </div>
        ))}

        {tab === "collection" && (
          <>
            <SectionTitle>Personal Collection</SectionTitle>
            <div style={{ fontSize: 13, color: "#767676", fontStyle: "italic", marginBottom: 12 }}>These are yours to keep, not businesses — no income, one-time purchase, pure statement of who you've become. Separate from the Luxury Trade Business, which is a real income-generating front.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {PERSONAL_ITEMS.map((item) => {
                const owned_ = !!personalItems[item.id];
                return <AssetTile key={item.id} id={item.id} icon={item.icon} name={item.name} sub={owned_ ? "in your collection" : `+${item.respect} respect`} price={item.cost} owned={owned_ ? 1 : 0} accent="#f2f0ed" disabled={owned_ || cash < item.cost} onBuy={() => buyPersonalItem(item)} />;
              })}
            </div>
          </>
        )}

        {tab === "bank" && (
          <>
            <SectionTitle tag="0.6%/tick interest">First Reserve Bank</SectionTitle>
            <div style={{ fontSize: 14, color: "#8f8f8f", lineHeight: 1.6, marginBottom: 14 }}>
              The bank pays real interest, unlike the vault — but it's a licensed account with your name on it. If the Feds ever get a warrant, this is the first place they look. The vault is slower to grow but nobody can subpoena it.
            </div>
            <div style={{ padding: 14, background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, color: "#d4af37" }}>${fmt(bankCash)}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#767676" }}>growing quietly, tick by tick</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => bankDeposit(Math.round(cash * 0.5))} style={{ flex: 1, padding: "12px 0", background: "#d4af37", color: "#050505", border: "none", borderRadius: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>DEPOSIT HALF</button>
              <button onClick={() => bankWithdraw(bankCash)} style={{ flex: 1, padding: "12px 0", background: "transparent", color: "#d4af37", border: "1px solid #d4af37", borderRadius: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>WITHDRAW ALL</button>
            </div>
          </>
        )}

        {tab === "vault" && (
          <>
            <SectionTitle tag={`${fmt(vaultCash)} / ${fmt(vaultCap)}`}>The Secret Vault</SectionTitle>
            <div style={{ fontSize: 14, color: "#8f8f8f", lineHeight: 1.6, marginBottom: 14 }}>Cash on hand is what the Feds can seize if you're arrested. Anything in the vault stays yours.</div>
            <StampBar pct={(vaultCash / vaultCap) * 100} color="#d4af37" />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => depositVault(Math.round(cash * 0.5))} style={{ flex: 1, padding: "12px 0", background: "#7fae6b", color: "#050505", border: "none", borderRadius: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>DEPOSIT HALF</button>
              <button onClick={() => withdrawVault(vaultCash)} style={{ flex: 1, padding: "12px 0", background: "transparent", color: "#d4af37", border: "1px solid #d4af37", borderRadius: 6, fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>WITHDRAW ALL</button>
            </div>
            <button onClick={upgradeVault} style={{ marginTop: 10, width: "100%", padding: "11px 0", background: "rgba(212,175,55,0.1)", border: "1px solid #d4af3755", color: "#d4af37", borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>EXPAND CAPACITY — ${fmt(Math.round(vaultCap * 1.6))}</button>
          </>
        )}

        {tab === "hideout" && (
          <>
            <SectionTitle tag={`heat decay ${hideoutData?.heatDecay}/tick`}>Where You Lay Low</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {HIDEOUTS.map((h) => {
                const idx = HIDEOUTS.findIndex((x) => x.id === h.id), curIdx = HIDEOUTS.findIndex((x) => x.id === hideout), active = h.id === hideout, ownedAlready = idx <= curIdx;
                return (
                  <button key={h.id} onClick={() => upgradeHideout(h)} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: 12, background: active ? "rgba(212,175,55,0.12)" : "rgba(15,15,15,0.7)", border: `1px solid ${active ? "#d4af37" : "#262626"}`, borderRadius: 6, cursor: "pointer", color: "#f2f0ed" }}>
                    <div style={{ fontSize: 26 }}>{h.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>{h.name}{active && " — CURRENT"}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#8f8f8f", marginTop: 2 }}>heat decay +{h.heatDecay}/tick · respect +{h.respectBonus}</div>
                    </div>
                    {!ownedAlready && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#d4af37" }}>${fmt(h.cost)}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === "crew" && (
          <>
            <SectionTitle>Your Crew</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {CREW_ROLES.map((r) => { const n = crew[r.id] || 0; const cost = Math.round(r.cost * Math.pow(1.3, n)); return <AssetTile key={r.id} id={r.id} icon={r.icon} name={r.name} sub={r.effect} price={cost} owned={n} accent="#c9973f" disabled={cash < cost} onBuy={() => hireCrew(r)} />; })}
            </div>
            <SectionTitle>Bodyguards</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {BODYGUARDS.map((g) => { const n = guards[g.id] || 0; const cost = growPrice(g.cost, n, 1.35, 20); return <AssetTile key={g.id} id={g.id} icon={g.icon} name={g.name} sub={`-${Math.round(g.arrestCut * 100)}% arrest risk`} price={cost} owned={n} accent="#c14b3f" disabled={cash < cost} onBuy={() => hireGuard(g)} />; })}
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: "#767676", fontStyle: "italic" }}>Crew and guards draw wages every tick but cut your risk, damage, heat, and jail odds.</div>

            <SectionTitle tag="unlocks with rank">Executive Staff</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {EXECUTIVE_STAFF.map((r) => {
                const owned_ = !!staff[r.id];
                const locked = level < r.level;
                return <AssetTile key={r.id} id={r.id} icon={r.icon} name={r.name} sub={locked ? `needs LVL ${r.level}` : r.desc} price={r.cost} owned={owned_ ? 1 : 0} accent="#4fb8c9" disabled={owned_ || cash < r.cost} locked={locked} onBuy={() => hireStaff(r)} />;
              })}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "#767676", fontStyle: "italic" }}>Executive staff are one-of-a-kind hires — each does something no amount of crew can replace.</div>
          </>
        )}

        {tab === "training" && (
          <>
            <SectionTitle>Schools &amp; Mentors</SectionTitle>
            <div style={{ fontSize: 13, color: "#767676", fontStyle: "italic", marginBottom: 12 }}>Permanent upgrades — unlike crew, these never leave and never draw a wage.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SCHOOLS.map((s) => {
                const n = training[s.id] || 0;
                const maxed = n >= s.cap;
                const cost = Math.round(s.cost * Math.pow(1.6, n));
                return (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 6 }}>
                    <div style={{ fontSize: 24 }}>{s.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13 }}>{s.name} <span style={{ color: "#d4af37" }}>{n}/{s.cap}</span></div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#8f8f8f" }}>{s.desc}</div>
                    </div>
                    <button onClick={() => trainSkill(s)} disabled={maxed || cash < cost} style={{ padding: "8px 12px", background: maxed ? "#1a1410" : cash < cost ? "#1a1a1a" : "#d4af37", color: maxed ? "#666666" : cash < cost ? "#767676" : "#050505", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 11, cursor: maxed || cash < cost ? "not-allowed" : "pointer" }}>{maxed ? "MAXED" : `$${fmt(cost)}`}</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "hacking" && (
          <>
            <SectionTitle tag={`intel ${fmt(intel)}`}>The Wire — Hacking Jobs</SectionTitle>
            <div style={{ fontSize: 13, color: "#767676", fontStyle: "italic", marginBottom: 12 }}>A rhythm mini-game, nothing more — no real techniques here, just Cipher's fictional network.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {HACK_TARGETS.map((t) => (
                <button key={t.id} onClick={() => startHack(t)} disabled={jailTicks > 0} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: 12, background: "rgba(15,15,15,0.7)", border: "1px solid #4fb8c944", borderRadius: 6, cursor: "pointer", color: "#f2f0ed" }}>
                  <div style={{ fontSize: 22 }}>💻</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#8f8f8f" }}>difficulty {t.diff} · {t.reward ? `$${fmt(t.reward)} · ` : ""}+{t.intel} intel{t.heatCut ? ` · -${t.heatCut} heat` : ""}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "factions" && (
          <>
            <SectionTitle>Standing With the Powers That Be</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FACTIONS.map((f) => { const v = rep[f.id] || 0; return (
                <div key={f.id} style={{ padding: 12, background: "rgba(15,15,15,0.7)", border: `1px solid ${f.color}44`, borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{f.icon}</span>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>{f.name}</div>
                    <div style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: f.color }}>{v > 0 ? "+" : ""}{v}</div>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#8f8f8f", fontStyle: "italic", margin: "6px 0 8px" }}>{f.desc}</div>
                  <StampBar pct={((v + 100) / 200) * 100} color={f.color} />
                </div>
              ); })}
            </div>
          </>
        )}

        {tab === "market" && (
          <>
            <SectionTitle tag={`portfolio $${fmt(portfolioValue)}`}>The Exchange — Companies</SectionTitle>
            {(() => {
              const selected = shares.find((s) => s.id === chartCompany) || shares[0];
              return (
                <div style={{ background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{selected.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13 }}>{selected.name}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#767676" }}>{selected.sector} · div {(selected.div * 100).toFixed(2)}%/tick</div>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, color: "#7fae6b" }}>${selected.price.toFixed(2)}</div>
                  </div>
                  <TradingChart data={selected.history} color="#7fae6b" width={300} height={130} />
                </div>
              );
            })()}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {shares.map((s) => { const n = portfolio[s.id] || 0; const selected = (chartCompany || shares[0].id) === s.id; return (
                <div key={s.id} onClick={() => setChartCompany(s.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: selected ? "rgba(212,175,55,0.1)" : "rgba(20,14,10,0.5)", border: `1px solid ${selected ? "#d4af37" : "#262626"}`, borderRadius: 6, cursor: "pointer" }}>
                  <div style={{ fontSize: 18 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12.5 }}>{s.name} {n > 0 && <span style={{ color: "#d4af37" }}>· {n}</span>}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, color: "#767676" }}>{s.sector}</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#7fae6b" }}>${s.price.toFixed(2)}</div>
                  <button onClick={(e) => { e.stopPropagation(); buyShare(s); }} disabled={cash < s.price} style={{ padding: "6px 8px", background: cash < s.price ? "#1a1a1a" : "#7fae6b", color: "#050505", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>BUY</button>
                  <button onClick={(e) => { e.stopPropagation(); sellShare(s); }} disabled={n <= 0} style={{ padding: "6px 8px", background: n <= 0 ? "#1a1a1a" : "#c14b3f", color: n <= 0 ? "#767676" : "#f2f0ed", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>SELL</button>
                </div>
              ); })}
            </div>
            <div style={{ fontSize: 12, color: "#767676", fontStyle: "italic", marginTop: 8 }}>Dividends pay automatically into cash on hand every tick, based on shares held — no need to sell.</div>

            <SectionTitle>Foreign Exchange Desk</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {fx.map((s) => { const n = fxHoldings[s.id] || 0; return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 4 }}>
                  <div style={{ fontSize: 20 }}>{s.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13 }}>{s.name} {n > 0 && <span style={{ color: "#d4af37" }}>· {fmt(n)} held</span>}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#7fa8c9" }}>{s.price.toFixed(4)}</div>
                  </div>
                  <Sparkline data={s.history} color="#7fa8c9" />
                  <button onClick={() => buyFx(s)} disabled={cash < 1000 * s.price} style={{ padding: "6px 9px", background: "#7fa8c9", color: "#050505", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>BUY 1K</button>
                  <button onClick={() => sellFx(s)} disabled={n < 1000} style={{ padding: "6px 9px", background: n < 1000 ? "#1a1a1a" : "#c14b3f", color: n < 1000 ? "#767676" : "#f2f0ed", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 10, cursor: "pointer" }}>SELL 1K</button>
                </div>
              ); })}
            </div>
          </>
        )}

        {tab === "wire" && (
          <>
            <SectionTitle>Family Wire (private)</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}>
              {chatMessages.map((m) => { const c = CONTACTS.find((x) => x.id === m.contactId); return (
                <div key={m.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{c?.icon}</div>
                  <div style={{ background: "rgba(15,15,15,0.75)", border: "1px solid #262626", borderRadius: "3px 10px 10px 10px", padding: "8px 12px", maxWidth: "80%" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#767676", marginBottom: 2 }}>{c?.name}</div>
                    <div style={{ fontSize: 14, color: "#f2f0ed", lineHeight: 1.4 }}>{m.text}</div>
                  </div>
                </div>
              ); })}
            </div>

            <SectionTitle tag={STORAGE_PROVIDER === "localStorage" ? "device-only for now" : "live · shared with other players"}>Global Wire</SectionTitle>
            {STORAGE_PROVIDER === "localStorage" && <div style={{ fontSize: 11.5, color: "#8f8f8f", fontStyle: "italic", marginBottom: 8 }}>Only your own messages show until a real backend is connected.</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto", paddingRight: 4, marginBottom: 10 }}>
              {globalChat.length === 0 && <div style={{ fontSize: 13, color: "#767676", fontStyle: "italic" }}>No chatter yet — be the first voice on the wire.</div>}
              {globalChat.map((m) => (
                <div key={m.id} style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                  <span style={{ color: m.from === playerName ? "#d4af37" : "#7fa8c9", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{m.from}: </span>
                  <span style={{ color: "#f2f0ed" }}>{m.text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendGlobalChat()} placeholder="Say something on the wire..." style={{ flex: 1, padding: "9px 10px", background: "#0a0a0a", border: "1px solid #262626", borderRadius: 6, color: "#f2f0ed", fontSize: 13 }} />
              <button onClick={sendGlobalChat} style={{ padding: "9px 14px", background: "#d4af37", color: "#050505", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>SEND</button>
            </div>
          </>
        )}

        {tab === "trade" && (
          <>
            <SectionTitle tag={STORAGE_PROVIDER === "localStorage" ? "device-only for now" : "live · shared marketplace"}>Player Trade Board</SectionTitle>
            {STORAGE_PROVIDER === "localStorage" && <div style={{ fontSize: 11.5, color: "#8f8f8f", fontStyle: "italic", marginBottom: 8 }}>Only your own listings show until a real backend is connected.</div>}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input value={tradeDraft.item} onChange={(e) => setTradeDraft((d) => ({ ...d, item: e.target.value }))} placeholder="Item / info to sell" style={{ flex: 2, padding: "9px 10px", background: "#0a0a0a", border: "1px solid #262626", borderRadius: 6, color: "#f2f0ed", fontSize: 13 }} />
              <input value={tradeDraft.price} onChange={(e) => setTradeDraft((d) => ({ ...d, price: e.target.value.replace(/\D/g, "") }))} placeholder="Price" style={{ width: 90, padding: "9px 10px", background: "#0a0a0a", border: "1px solid #262626", borderRadius: 6, color: "#f2f0ed", fontSize: 13 }} />
              <button onClick={postTradeOffer} style={{ padding: "9px 14px", background: "#7fae6b", color: "#050505", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>LIST</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {tradeBoard.length === 0 && <div style={{ fontSize: 13, color: "#767676", fontStyle: "italic" }}>Board's empty. List something for other players to buy.</div>}
              {[...tradeBoard].reverse().map((o) => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 6 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13 }}>{o.item}</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#767676" }}>listed by {o.from}</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#d4af37" }}>${fmt(o.price)}</div>
                  {o.from !== playerName && <button onClick={() => buyTradeOffer(o)} disabled={cash < o.price} style={{ padding: "6px 10px", background: cash < o.price ? "#1a1a1a" : "#d4af37", color: "#050505", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>BUY</button>}
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "world" && (
          <>
            <SectionTitle>World Map — Territory</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CITIES.map((c) => {
                const owned_ = unlockedCities.includes(c.id), active = currentCity === c.id, mode = TRAVEL_MODES[c.mode];
                return (
                  <button key={c.id} onClick={() => travelTo(c)} style={{ textAlign: "left", padding: 12, background: active ? "rgba(200,30,58,0.12)" : "rgba(15,15,15,0.7)", border: `1px solid ${active ? "#e5233f" : "#262626"}`, borderRadius: 6, cursor: "pointer", color: "#f2f0ed" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 14 }}>{mode.icon} {c.name}{active && " — HERE"}</span>
                      {!owned_ && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#d4af37" }}>${fmt(c.cost)}</span>}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#767676", marginTop: 2 }}>{c.country} · {mode.label} by {c.mode}</div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontStyle: "italic", fontSize: 13, color: "#8f8f8f", marginTop: 3 }}>{c.desc}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {tab === "settings" && (() => {
          return (
          <>
            <SectionTitle>Settings</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ padding: 12, background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 6 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, marginBottom: 4 }}>Petty jobs visibility</div>
                <div style={{ fontSize: 12, color: "#8f8f8f", marginBottom: 8 }}>Show crimes below your wealth tier in the Crime tab by default.</div>
                <button onClick={() => setShowPettyJobs((v) => !v)} style={{ padding: "8px 14px", background: showPettyJobs ? "#d4af37" : "transparent", color: showPettyJobs ? "#050505" : "#d4af37", border: "1px solid #d4af37", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{showPettyJobs ? "SHOWING ALL JOBS" : "HIDING PETTY JOBS"}</button>
              </div>

              <div style={{ padding: 12, background: "rgba(15,15,15,0.7)", border: "1px solid #262626", borderRadius: 6 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, marginBottom: 4 }}>Player identity</div>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>ID: {PLAYER_ID} — this is your permanent trade-board and leaderboard identity.</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input defaultValue={playerName} onKeyDown={(e) => { if (e.key === "Enter") updatePlayerName(e.currentTarget.value); }} id="nameInput" placeholder="Type your own name..." style={{ flex: 1, padding: "9px 10px", background: "#0a0a0a", border: "1px solid #262626", borderRadius: 6, color: "#f2f0ed", fontSize: 13 }} />
                  <button onClick={() => updatePlayerName(document.getElementById("nameInput").value)} style={{ padding: "9px 14px", background: "#d4af37", color: "#050505", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>SAVE</button>
                </div>
                <button onClick={() => updatePlayerName(generateRandomName())} style={{ padding: "8px 14px", background: "transparent", color: "#8f8f8f", border: "1px solid #262626", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>🎲 Generate a name for me instead</button>
              </div>

              <div style={{ padding: 12, background: "rgba(15,15,15,0.7)", border: "1px solid #d4af3755", borderRadius: 6 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, marginBottom: 8, color: "#d4af37" }}>📺 Ad Rewards</div>
                <div style={{ fontSize: 11.5, color: "#8f8f8f", marginBottom: 10 }}>Each reward has its own {AD_COOLDOWN_SECONDS}s cooldown — not spammable, but never blocked for long.</div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#e8e6e3", marginBottom: 4 }}>💰 Cash bonus — scales with your level (LVL {level} right now)</div>
                  <button onClick={async () => {
                    const rewarded = await adManager.showRewardedAd();
                    if (rewarded) { const amt = adCashReward(level); setCash((c) => c + amt); setAdCooldowns((c) => ({ ...c, cash: AD_COOLDOWN_SECONDS })); pushLog(`Watched an ad — banked $${fmt(amt)}.`, "good"); }
                    else pushLog(adManager.available ? "Ad didn't finish — no reward this time." : "Ads aren't active yet (needs the native AdMob plugin installed).", "warn");
                  }} disabled={adCooldowns.cash > 0} style={{ width: "100%", padding: "10px 0", background: adCooldowns.cash > 0 ? "#1a1a1a" : "#d4af37", color: adCooldowns.cash > 0 ? "#666" : "#050505", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: adCooldowns.cash > 0 ? "not-allowed" : "pointer" }}>{adCooldowns.cash > 0 ? `Next in ${adCooldowns.cash}s` : "WATCH FOR CASH"}</button>
                </div>

                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: "#e8e6e3", marginBottom: 4 }}>⚡ Full energy refill</div>
                  <button onClick={async () => {
                    const rewarded = await adManager.showRewardedAd();
                    if (rewarded) { setEnergy(100); setAdCooldowns((c) => ({ ...c, energy: AD_COOLDOWN_SECONDS })); pushLog("Watched an ad — energy fully restored.", "good"); }
                    else pushLog(adManager.available ? "Ad didn't finish — no reward this time." : "Ads aren't active yet.", "warn");
                  }} disabled={adCooldowns.energy > 0 || energy >= 100} style={{ width: "100%", padding: "10px 0", background: (adCooldowns.energy > 0 || energy >= 100) ? "#1a1a1a" : "#7fa8c9", color: (adCooldowns.energy > 0 || energy >= 100) ? "#666" : "#050505", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: (adCooldowns.energy > 0 || energy >= 100) ? "not-allowed" : "pointer" }}>{energy >= 100 ? "Energy already full" : adCooldowns.energy > 0 ? `Next in ${adCooldowns.energy}s` : "WATCH FOR ENERGY"}</button>
                </div>

                <div>
                  <div style={{ fontSize: 12, color: "#e8e6e3", marginBottom: 4 }}>🛡️ Armor + 🔫 Weapon — 3 uses each (armor cuts beating damage, weapon cuts arrest odds on your next jobs)</div>
                  <div style={{ fontSize: 10.5, color: "#666", marginBottom: 4 }}>Currently holding: 🛡️ ×{armorCharges} · 🔫 ×{weaponCharges}</div>
                  <button onClick={async () => {
                    const rewarded = await adManager.showRewardedAd();
                    if (rewarded) { setArmorCharges((a) => a + 3); setWeaponCharges((w) => w + 3); setAdCooldowns((c) => ({ ...c, gear: AD_COOLDOWN_SECONDS })); pushLog("Watched an ad — picked up armor and a weapon (3 uses each).", "good"); }
                    else pushLog(adManager.available ? "Ad didn't finish — no reward this time." : "Ads aren't active yet.", "warn");
                  }} disabled={adCooldowns.gear > 0} style={{ width: "100%", padding: "10px 0", background: adCooldowns.gear > 0 ? "#1a1a1a" : "#c14b3f", color: adCooldowns.gear > 0 ? "#666" : "#f2f0ed", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: adCooldowns.gear > 0 ? "not-allowed" : "pointer" }}>{adCooldowns.gear > 0 ? `Next in ${adCooldowns.gear}s` : "WATCH FOR GEAR"}</button>
                </div>
              </div>

              <div style={{ padding: 12, background: "rgba(15,15,15,0.7)", border: "1px solid #c14b3f55", borderRadius: 6 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, marginBottom: 4, color: "#c14b3f" }}>Reset run</div>
                <div style={{ fontSize: 12, color: "#8f8f8f", marginBottom: 8 }}>Wipes your saved progress on this device and starts over in Newark. Your player ID and name stay the same. Shared wire/trade/leaderboard data is not affected.</div>
                {resetConfirm ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={async () => { await window.storage.delete("save_" + PLAYER_ID, false).catch(() => {}); window.location.reload(); }} style={{ flex: 1, padding: "9px 0", background: "#c14b3f", color: "#f2f0ed", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>CONFIRM RESET</button>
                    <button onClick={() => setResetConfirm(false)} style={{ flex: 1, padding: "9px 0", background: "transparent", color: "#8f8f8f", border: "1px solid #262626", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setResetConfirm(true)} style={{ padding: "9px 14px", background: "transparent", color: "#c14b3f", border: "1px solid #c14b3f", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>RESET RUN</button>
                )}
              </div>
            </div>
          </>
          );
        })()}
      </div>

      <div style={{ display: "flex", alignItems: "center", position: "fixed", bottom: 0, left: 0, right: 0, background: "#0a0a0a", borderTop: "1px solid #262626" }}>
        <button onClick={() => scrollTabs(-1)} style={{ flexShrink: 0, width: 26, alignSelf: "stretch", background: "none", border: "none", color: "#767676", cursor: "pointer", fontSize: 13 }}>‹</button>
        <div ref={tabBarRef} style={{ display: "flex", overflowX: "auto", padding: "8px 2px", flex: 1, WebkitOverflowScrolling: "touch" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: "1 0 auto", minWidth: 52, background: "none", border: "none", cursor: "pointer", color: tab === t.id ? "#d4af37" : "#666666", padding: "6px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8.5, letterSpacing: "0.02em" }}>{t.label}</span>
            </button>
          ))}
        </div>
        <button onClick={() => scrollTabs(1)} style={{ flexShrink: 0, width: 26, alignSelf: "stretch", background: "none", border: "none", color: "#767676", cursor: "pointer", fontSize: 13 }}>›</button>
      </div>
    </div>
  );
}
