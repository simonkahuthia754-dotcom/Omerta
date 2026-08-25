import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// OMERTÀ — a mafia empire idle game
// v3: multiplayer wire + trade board (real shared persistence),
// realistic vehicle tiers, bodyguards, harder jail, hacking
// minigame, forex desk, market sparklines, world travel by
// bike/ship/plane, fictional dons, secret societies & SWAT raids.
// ============================================================

// AdMob IDs - Configure these in your native Android/iOS project
// These are Google AdMob IDs for the Capacitor/native wrapper
const ADMOB_CONFIG = {
  publisherId: "pub-1268492465575554",
  appId: "ca-app-pub-1268492465575554~2328637637",
  bannerMain: "ca-app-pub-1268492465575554/1015555967",
  interstitial: "ca-app-pub-1268492465575554/1864090437",
  nativeAdvanced: "ca-app-pub-1268492465575554/8402362448",
  openMain: "ca-app-pub-1268492465575554/8239439862",
  rewarded: "ca-app-pub-1268492465575554/5317868254",
};

// ============================================================
// STORAGE ADAPTER — FIREBASE OR SUPABASE
// ============================================================
// This adapter provides unified access to either Firebase or Supabase
// for real multiplayer persistence (global chat, trade board, leaderboard)

class StorageAdapter {
  constructor(provider = "firebase") {
    this.provider = provider;
    this.initProvider();
  }

  initProvider() {
    if (this.provider === "firebase") {
      this.initFirebase();
    } else if (this.provider === "supabase") {
      this.initSupabase();
    }
  }

  initFirebase() {
    // Firebase Realtime Database
    // Install: npm install firebase
    // Configure in your Firebase console
    try {
      const { initializeApp } = require("firebase/app");
      const { getDatabase, ref, get, set, remove, onValue } = require("firebase/database");
      
      const firebaseConfig = {
        apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "YOUR_API_KEY",
        authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "your-app.firebaseapp.com",
        databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://your-app.firebaseio.com",
        projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "your-project-id",
        storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "your-app.appspot.com",
        messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_ID || "your-messaging-id",
        appId: process.env.REACT_APP_FIREBASE_APP_ID || "your-app-id",
      };

      this.app = initializeApp(firebaseConfig);
      this.db = getDatabase(this.app);
      this.firebaseRefs = { ref, get, set, remove, onValue };
    } catch (e) {
      console.warn("Firebase not configured, falling back to localStorage:", e);
      this.fallbackToLocalStorage();
    }
  }

  initSupabase() {
    // Supabase (PostgreSQL)
    // Install: npm install @supabase/supabase-js
    try {
      const { createClient } = require("@supabase/supabase-js");
      
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://your-project.supabase.co";
      const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "your-anon-key";

      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.warn("Supabase not configured, falling back to localStorage:", e);
      this.fallbackToLocalStorage();
    }
  }

  fallbackToLocalStorage() {
    // Fallback to per-device localStorage
    this.provider = "localStorage";
  }

  async get(key, shared) {
    try {
      if (this.provider === "firebase" && this.db) {
        const snapshot = await this.firebaseRefs.get(
          this.firebaseRefs.ref(this.db, shared ? `shared/${key}` : `player/${key}`)
        );
        if (snapshot.exists()) {
          return { key, value: snapshot.val(), shared: !!shared };
        }
        return null;
      } else if (this.provider === "supabase" && this.supabase) {
        const { data, error } = await this.supabase
          .from("storage")
          .select("value")
          .eq("key", `${shared ? "shared" : "player"}:${key}`)
          .single();
        if (error) return null;
        return { key, value: data.value, shared: !!shared };
      }
    } catch (e) {
      console.warn(`Failed to get ${key}:`, e);
    }
    // Fallback to localStorage
    const raw = localStorage.getItem("omerta_" + key);
    return raw ? { key, value: raw, shared: !!shared } : null;
  }

  async set(key, value, shared) {
    try {
      if (this.provider === "firebase" && this.db) {
        await this.firebaseRefs.set(
          this.firebaseRefs.ref(this.db, shared ? `shared/${key}` : `player/${key}`),
          value
        );
        return { key, value, shared: !!shared };
      } else if (this.provider === "supabase" && this.supabase) {
        const prefixedKey = `${shared ? "shared" : "player"}:${key}`;
        const { error } = await this.supabase
          .from("storage")
          .upsert({ key: prefixedKey, value, created_at: new Date() });
        if (error) throw error;
        return { key, value, shared: !!shared };
      }
    } catch (e) {
      console.warn(`Failed to set ${key}:`, e);
    }
    // Fallback to localStorage
    localStorage.setItem("omerta_" + key, value);
    return { key, value, shared: !!shared };
  }

  async delete(key, shared) {
    try {
      if (this.provider === "firebase" && this.db) {
        await this.firebaseRefs.remove(
          this.firebaseRefs.ref(this.db, shared ? `shared/${key}` : `player/${key}`)
        );
        return { key, deleted: true, shared: !!shared };
      } else if (this.provider === "supabase" && this.supabase) {
        const prefixedKey = `${shared ? "shared" : "player"}:${key}`;
        await this.supabase.from("storage").delete().eq("key", prefixedKey);
        return { key, deleted: true, shared: !!shared };
      }
    } catch (e) {
      console.warn(`Failed to delete ${key}:`, e);
    }
    // Fallback to localStorage
    localStorage.removeItem("omerta_" + key);
    return { key, deleted: true, shared: !!shared };
  }

  async list(prefix) {
    try {
      if (this.provider === "firebase" && this.db) {
        const snapshot = await this.firebaseRefs.get(
          this.firebaseRefs.ref(this.db, "shared")
        );
        if (snapshot.exists()) {
          const keys = Object.keys(snapshot.val()).filter((k) =>
            k.startsWith(prefix || "")
          );
          return { keys };
        }
        return { keys: [] };
      } else if (this.provider === "supabase" && this.supabase) {
        const { data, error } = await this.supabase
          .from("storage")
          .select("key")
          .like("key", `shared:${prefix || ""}%`);
        if (error) throw error;
        const keys = data.map((row) =>
          row.key.replace("shared:", "")
        );
        return { keys };
      }
    } catch (e) {
      console.warn(`Failed to list keys:`, e);
    }
    // Fallback to localStorage
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("omerta_" + (prefix || ""))
    );
    return { keys: keys.map((k) => k.replace("omerta_", "")) };
  }
}

// Initialize storage adapter
// Set to "firebase" or "supabase" in your environment
const storageAdapter = new StorageAdapter(
  process.env.REACT_APP_STORAGE_PROVIDER || "firebase"
);

// Global storage interface
if (typeof window !== "undefined") {
  window.storage = storageAdapter;
}

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=JetBrains+Mono:wght@400;600;700&display=swap');
`;

// ---------- identity ----------
const PLAYER_ID = "p_" + Math.random().toString(36).slice(2, 8);
const PLAYER_NAMES = ["Nunzio", "Vittoria", "Cassian", "Marchetti", "Delgado", "Kaine", "Rosalind", "Torino"];
const PLAYER_NAME = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)] + " " + Math.floor(Math.random() * 90 + 10);

// ---------- story ----------
const STORY_BEATS = [
  { level: 1, title: "The Arrival", text: "The bus door hisses open on a wet Newark corner. Nobody here knows your name — exactly how you want it. Five hundred dollars, a duffel bag, and a city to make your name in." },
  { level: 3, title: "First Blood", text: "Word travels fast after the pier job. A man in a good coat buys you a coffee and doesn't introduce himself. 'The Commission notices earners,' he says. 'The table wants to know your name.'" },
  { level: 5, title: "The Cartel Reaches Out", text: "A number with no name texts you a location and a time. Reyes doesn't do meetings in public. If you're going, go alone — and go clean." },
  { level: 7, title: "The Ghost in the Wires", text: "A kid who calls himself Cipher slides into your DMs. 'I can make your paper trail disappear — for a price. I can also make it appear, if we're not friends.'" },
  { level: 8, title: "Eyes From Washington", text: "Your fixer finds a business card taped under your car mirror. Federal Task Force, no name, just a number. Someone downtown has started a file with your picture on it." },
  { level: 10, title: "Blue Lights", text: "A SWAT van idles two blocks from your last front for six hours straight. They didn't move in. This time." },
  { level: 12, title: "A Seat At The Table", text: "The old men of the Commission finally send for you directly. A seat opens at their table tonight — or a folding chair at the end of it, depending on what you say." },
  { level: 15, title: "The Order", text: "An invitation with no return address, sealed in black wax. The Order doesn't recruit — it selects. Someone above the Commission has been watching longer than you've been alive." },
  { level: 20, title: "Palermo Calls", text: "The name that started all of this finally sends for you. Where the Cosa Nostra began, and where every real don eventually has to answer for what they built." },
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
];

const BUSINESSES = ASSET_CATEGORIES.flatMap((c) => c.items.map((i) => ({ ...i, cat: c.id })));

// Market data
const SHARES = [
  { id: "vantablack", name: "Vantablack Logistics", sector: "Shipping", icon: "📦", price: 42, vol: 0.18, div: 0.006 },
  { id: "orizon", name: "Orizon Air Holdings", sector: "Aviation", icon: "🛩️", price: 118, vol: 0.24, div: 0.004 },
  { id: "redline", name: "Redline Motors Co.", sector: "Automotive", icon: "🏎️", price: 30, vol: 0.15, div: 0.005 },
];

const FOREX = [
  { id: "eur", name: "EUR / USD", icon: "🇪🇺", price: 1.08, vol: 0.03 },
  { id: "gbp", name: "GBP / USD", icon: "🇬🇧", price: 1.27, vol: 0.035 },
];

// Hideouts
const HIDEOUTS = [
  { id: "motel", name: "Motel Room", cost: 0, icon: "🛏️", heatDecay: 1, respectBonus: 0 },
  { id: "apartment", name: "Rented Apartment", cost: 3000, icon: "🏢", heatDecay: 2, respectBonus: 5 },
  { id: "townhouse", name: "Fenced Townhouse", cost: 18000, icon: "🏘️", heatDecay: 3, respectBonus: 15 },
];

const CREW_ROLES = [
  { id: "muscle", name: "Muscle", icon: "🥊", cost: 2000, wage: 1, effect: "reduces crime risk" },
  { id: "wheelman", name: "Wheelman", icon: "🔧", cost: 5000, wage: 2, effect: "faster jobs" },
  { id: "accountant", name: "Accountant", icon: "🧮", cost: 12000, wage: 3, effect: "boosts passive income" },
];

const SCHOOLS = [
  { id: "streetwise", name: "Streetwise Academy", icon: "🎓", desc: "Trim arrest risk.", cost: 8000, effect: "riskCut", amount: 0.02, cap: 6 },
  { id: "finance", name: "Underground Finance", icon: "📊", desc: "Boost income.", cost: 15000, effect: "incomeBoost", amount: 0.04, cap: 6 },
];

const TABS = [
  { id: "empire", label: "Empire", icon: "🏛" },
  { id: "profile", label: "Profile", icon: "🪪" },
  { id: "crime", label: "Crime", icon: "🗡" },
  { id: "assets", label: "Assets", icon: "💼" },
  { id: "market", label: "Market", icon: "📈" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

// ---------- ui atoms ----------
function Ledger({ label, value, sub, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 2px", borderBottom: "1px dotted #4a3d2f" }}>
      <div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9c8b6f" }}>{label}</div>
        {sub && <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, color: "#6b6152", fontStyle: "italic", marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 19, color: accent || "#e8dcc8" }}>{value}</div>
    </div>
  );
}

function SealButton({ onClick, disabled, children, size = 64 }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: size, height: size, borderRadius: "50%",
      background: disabled ? "radial-gradient(circle at 35% 30%, #4a3428, #2a1c15)" : "radial-gradient(circle at 35% 30%, #a4372f, #6b1712 60%, #3d0c09)",
      border: "2px solid " + (disabled ? "#5c4a3a" : "#d4af37"), color: "#e8dcc8", fontFamily: "'Cinzel', serif", fontWeight: 700,
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
    <div style={{ height: 6, background: "#211711", borderRadius: 3, overflow: "hidden", border: "1px solid #3a2c20" }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: color, transition: "width 0.4s ease" }} />
    </div>
  );
}

function SectionTitle({ children, tag }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 10px" }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.14em", color: "#d4af37", textTransform: "uppercase" }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #4a3d2f, transparent)" }} />
      {tag && <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 12, color: "#6b6152" }}>{tag}</div>}
    </div>
  );
}

function fmt(n) {
  n = Math.floor(n);
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, "") + "M";
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

export default function Omerta() {
  const [cash, setCash] = useState(500);
  const [energy, setEnergy] = useState(100);
  const [heat, setHeat] = useState(0);
  const [xp, setXp] = useState(0);
  const [owned, setOwned] = useState({});
  const [hideout, setHideout] = useState("motel");
  const [crew, setCrew] = useState({});
  const [shares, setShares] = useState(SHARES.map((s) => ({ ...s, history: [s.price] })));
  const [tab, setTab] = useState("empire");
  const [log, setLog] = useState([{ id: 0, text: "You step off the bus in Newark with $500 and a name nobody recognizes yet.", tone: "neutral" }]);
  const [globalChat, setGlobalChat] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const logId = useRef(1);

  const pushLog = useCallback((text, tone = "neutral") => {
    logId.current += 1;
    setLog((L) => [{ id: logId.current, text, tone }, ...L].slice(0, 40));
  }, []);

  // Load shared data on mount
  const syncShared = useCallback(async () => {
    try {
      const chatRes = await window.storage.get("global_chat", true);
      if (chatRes && chatRes.value) setGlobalChat(JSON.parse(chatRes.value).slice(-40));
    } catch (e) { /* key not created yet */ }
  }, []);

  useEffect(() => {
    syncShared();
    const interval = setInterval(syncShared, 4000);
    return () => clearInterval(interval);
  }, [syncShared]);

  async function sendGlobalChat() {
    if (!chatDraft.trim()) return;
    const msg = { id: Date.now(), from: PLAYER_NAME, text: chatDraft.trim() };
    try {
      const cur = await window.storage.get("global_chat", true).catch(() => null);
      const arr = cur && cur.value ? JSON.parse(cur.value) : [];
      const next = [...arr, msg].slice(-60);
      await window.storage.set("global_chat", JSON.stringify(next), true);
      setGlobalChat(next.slice(-40));
    } catch (e) { 
      pushLog("Wire's down — message didn't send.", "warn"); 
    }
    setChatDraft("");
  }

  function doCrime(crime) {
    if (energy < crime.energy) { 
      pushLog(`Too tired for "${crime.name}". Rest up.`, "warn"); 
      return; 
    }
    setEnergy((e) => e - crime.energy);
    const payout = Math.round(crime.minCash + Math.random() * (crime.maxCash - crime.minCash));
    setCash((c) => c + payout);
    setXp((x) => x + crime.xp);
    setHeat((h) => clamp(h + crime.heat, 0, 100));
    pushLog(`"${crime.name}" paid out $${fmt(payout)}.`, "good");
  }

  const hideoutData = HIDEOUTS.find((h) => h.id === hideout);

  useEffect(() => {
    const t = setInterval(() => {
      setEnergy((e) => clamp(e + 2, 0, 100));
      setHeat((h) => clamp(h - (hideoutData?.heatDecay || 1), 0, 100));
      setShares((S) => S.map((sh) => { 
        const np = Math.max(1, sh.price * (1 + (Math.random() - 0.5) * sh.vol * 0.3)); 
        return { ...sh, price: np, history: [...sh.history, np].slice(-20) }; 
      }));
    }, 2000);
    return () => clearInterval(t);
  }, [hideoutData]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0e0a07", color: "#e8dcc8", fontFamily: "'Cormorant Garamond', serif",
      overflow: "hidden", display: "flex", flexDirection: "column"
    }}>
      <style>{`
        body { margin: 0; padding: 0; background: #0e0a07; }
        ${FONT_IMPORT}
      `}</style>

      <div style={{ flex: 1, overflow: "auto", padding: "20px 16px 100px" }}>
        {/* Empire Tab */}
        {tab === "empire" && (
          <div>
            <h1 style={{ fontSize: 28, margin: "0 0 20px", fontWeight: 700, color: "#d4af37" }}>OMERTÀ</h1>
            <Ledger label="Cash" value={`$${fmt(cash)}`} accent="#2f6b3f" />
            <Ledger label="Heat" value={heat.toFixed(0)} accent="#c81e3a" />
            <Ledger label="Energy" value={energy.toFixed(0)} accent="#4fb8c9" />
            <Ledger label="XP" value={xp} accent="#d4af37" />
            
            <SectionTitle>Hideout</SectionTitle>
            <p>{hideoutData?.name} (Heat -1 per tick)</p>
            
            <SectionTitle>Passive Income</SectionTitle>
            <p>Business owned: {Object.values(owned).reduce((a, b) => a + b, 0)} properties</p>
          </div>
        )}

        {/* Crime Tab */}
        {tab === "crime" && (
          <div>
            <SectionTitle>Available Crimes</SectionTitle>
            {CRIMES.slice(0, 5).map((crime) => (
              <div key={crime.id} style={{ marginBottom: 12, padding: 10, background: "#1a1410", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{crime.name}</div>
                    <div style={{ fontSize: 12, color: "#8a8078", marginTop: 4 }}>
                      Energy: {crime.energy} | Heat: +{crime.heat} | Payout: ${fmt(crime.minCash)}-${fmt(crime.maxCash)}
                    </div>
                  </div>
                  <SealButton onClick={() => doCrime(crime)} size={48}>
                    GO
                  </SealButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Wire (Chat) Tab */}
        {tab === "wire" && (
          <div>
            <SectionTitle>Global Wire</SectionTitle>
            <div style={{ height: 300, background: "#1a1410", borderRadius: 8, padding: 10, overflowY: "auto", marginBottom: 12 }}>
              {globalChat.map((msg) => (
                <div key={msg.id} style={{ marginBottom: 8, fontSize: 12 }}>
                  <strong style={{ color: "#d4af37" }}>{msg.from}:</strong> {msg.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Send message..."
                style={{
                  flex: 1, padding: "10px", background: "#1a1410", color: "#e8dcc8", border: "1px solid #4a3d2f",
                  borderRadius: 6, fontFamily: "'JetBrains Mono', monospace"
                }}
                onKeyPress={(e) => e.key === "Enter" && sendGlobalChat()}
              />
              <SealButton onClick={sendGlobalChat} size={44}>📤</SealButton>
            </div>
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div>
            <SectionTitle>Settings</SectionTitle>
            <div style={{ padding: 12, background: "#1a1410", borderRadius: 8 }}>
              <p>Storage Provider: {window.storage?.provider || "localStorage"}</p>
              <p>AdMob App ID: {ADMOB_CONFIG.appId}</p>
              <p style={{ fontSize: 12, color: "#8a8078", marginTop: 12 }}>
                AdMob ads will work in native Android/iOS builds through Capacitor. 
                Configure your Google AdMob account and add the plugin to the native wrapper.
              </p>
            </div>
          </div>
        )}

        {/* Log */}
        <SectionTitle>Activity Log</SectionTitle>
        <div style={{ fontSize: 12, color: "#8a8078" }}>
          {log.slice(0, 10).map((entry) => (
            <div key={entry.id} style={{ marginBottom: 6, color: entry.tone === "good" ? "#2f6b3f" : entry.tone === "bad" ? "#c81e3a" : "#e8dcc8" }}>
              {entry.text}
            </div>
          ))}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(to top, #0e0a07, rgba(14,10,7,0.8))",
        display: "flex", justifyContent: "space-around", padding: "12px 0 20px",
        borderTop: "1px solid #2a2018"
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: "none", border: "none", color: tab === t.id ? "#d4af37" : "#6b6152",
              fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: tab === t.id ? 700 : 400,
              cursor: "pointer", textAlign: "center", flex: 1
            }}
          >
            <div style={{ fontSize: 18 }}>{t.icon}</div>
            <div>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
