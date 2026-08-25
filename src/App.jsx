import React, { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// OMERTÀ — a mafia empire idle game
// v4: Enhanced UI with item cards, user authentication,
// and robust AdMob integration with fallback support
// ============================================================

// AdMob IDs - These will fail gracefully in web, work in native builds
const ADMOB_CONFIG = {
  publisherId: "pub-1268492465575554",
  appId: "ca-app-pub-1268492465575554~2328637637",
  bannerMain: "ca-app-pub-1268492465575554/1015555967",
  interstitial: "ca-app-pub-1268492465575554/1864090437",
  nativeAdvanced: "ca-app-pub-1268492465575554/8402362448",
  openMain: "ca-app-pub-1268492465575554/8239439862",
  rewarded: "ca-app-pub-1268492465575554/5317868254",
};

// AdMob Helper - Graceful fallback for web/native
class AdMobManager {
  constructor() {
    this.available = false;
    this.initAdMob();
  }

  initAdMob() {
    try {
      if (window.admob) {
        this.available = true;
        console.log("AdMob initialized successfully");
      }
    } catch (e) {
      console.warn("AdMob not available (expected in web builds):", e.message);
      this.available = false;
    }
  }

  async showBanner() {
    if (!this.available) return;
    try {
      await window.admob.banner.show({
        adUnitId: ADMOB_CONFIG.bannerMain,
      });
    } catch (e) {
      console.warn("Failed to show banner:", e.message);
    }
  }

  async showInterstitial() {
    if (!this.available) return;
    try {
      await window.admob.interstitial.load({
        adUnitId: ADMOB_CONFIG.interstitial,
      });
      await window.admob.interstitial.show();
    } catch (e) {
      console.warn("Failed to show interstitial:", e.message);
    }
  }

  async showRewardedAd() {
    if (!this.available) return false;
    try {
      await window.admob.rewardedInterstitial.load({
        adUnitId: ADMOB_CONFIG.rewarded,
      });
      const result = await window.admob.rewardedInterstitial.show();
      return result.rewardReceived || false;
    } catch (e) {
      console.warn("Failed to show rewarded ad:", e.message);
      return false;
    }
  }
}

const adManager = new AdMobManager();

// ============================================================
// STORAGE ADAPTER — FIREBASE OR SUPABASE
// ============================================================
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
        const keys = data.map((row) => row.key.replace("shared:", ""));
        return { keys };
      }
    } catch (e) {
      console.warn(`Failed to list keys:`, e);
    }
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("omerta_" + (prefix || ""))
    );
    return { keys: keys.map((k) => k.replace("omerta_", "")) };
  }
}

const storageAdapter = new StorageAdapter(
  process.env.REACT_APP_STORAGE_PROVIDER || "firebase"
);

if (typeof window !== "undefined") {
  window.storage = storageAdapter;
}

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=JetBrains+Mono:wght@400;600;700&display=swap');
`;

// Game data
const PLAYER_ID = "p_" + Math.random().toString(36).slice(2, 8);
const PLAYER_NAMES = ["Nunzio", "Vittoria", "Cassian", "Marchetti", "Delgado", "Kaine", "Rosalind", "Torino"];
const PLAYER_NAME = PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)] + " " + Math.floor(Math.random() * 90 + 10);

// Asset categories with image URLs (emoji fallback)
const ASSET_CATEGORIES = [
  {
    id: "fronts", label: "Street Fronts", color: "#7fae6b", level: 1,
    items: [
      { id: "laundromat", name: "Corner Laundromat", cost: 800, income: 2, icon: "🧺", image: "🧺" },
      { id: "bar", name: "The Quiet Glass", cost: 2600, income: 7, icon: "🥃", image: "🥃" },
      { id: "restaurant", name: "Vico's Trattoria", cost: 7200, income: 19, icon: "🍝", image: "🍝" },
      { id: "casino", name: "Backroom Card House", cost: 21000, income: 58, icon: "🎲", image: "🎲" },
    ],
  },
  {
    id: "bikes", label: "Motorcycles", color: "#c9973f", level: 2,
    items: [
      { id: "scooter", name: "Beat-up Courier Scooter", cost: 900, income: 3, icon: "🛵", image: "🛵" },
      { id: "sport_bike", name: "Used Sport Bike", cost: 3200, income: 9, icon: "🏍️", image: "🏍️" },
      { id: "harley", name: "Chromed Cruiser", cost: 8500, income: 22, icon: "🏍️", image: "🏍️" },
      { id: "ducati", name: "Ducati Superleggera", cost: 45000, income: 95, icon: "🏍️", image: "🏍️" },
    ],
  },
];

const BUSINESSES = ASSET_CATEGORIES.flatMap((c) => c.items.map((i) => ({ ...i, cat: c.id })));

const CRIMES = [
  { id: "pickpocket", name: "Pickpocket the docks", tier: 0, energy: 5, heat: 2, minCash: 15, maxCash: 45, xp: 8, risk: 0.05, level: 1 },
  { id: "shakedown", name: "Shake down a shopkeeper", tier: 0, energy: 10, heat: 5, minCash: 40, maxCash: 110, xp: 16, risk: 0.10, level: 1 },
  { id: "smuggle", name: "Run contraband off the pier", tier: 1, energy: 18, heat: 9, minCash: 300, maxCash: 700, xp: 60, risk: 0.15, level: 2 },
  { id: "heist", name: "Knock over a jewelry courier", tier: 1, energy: 30, heat: 16, minCash: 800, maxCash: 1800, xp: 110, risk: 0.22, level: 4 },
];

const HIDEOUTS = [
  { id: "motel", name: "Motel Room", cost: 0, icon: "🛏️", heatDecay: 1, respectBonus: 0 },
  { id: "apartment", name: "Rented Apartment", cost: 3000, icon: "🏢", heatDecay: 2, respectBonus: 5 },
  { id: "townhouse", name: "Fenced Townhouse", cost: 18000, icon: "🏘️", heatDecay: 3, respectBonus: 15 },
];

const TABS = [
  { id: "empire", label: "Empire", icon: "🏛" },
  { id: "crime", label: "Crime", icon: "🗡" },
  { id: "assets", label: "Assets", icon: "💼" },
  { id: "wire", label: "Wire", icon: "💬" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

// ============================================================
// UI COMPONENTS
// ============================================================
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

function SectionTitle({ children, tag }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "22px 0 10px" }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.14em", color: "#d4af37", textTransform: "uppercase" }}>{children}</div>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #4a3d2f, transparent)" }} />
      {tag && <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 12, color: "#6b6152" }}>{tag}</div>}
    </div>
  );
}

// Enhanced ItemCard with image
function ItemCard({ icon, name, sub, price, owned, accent, onBuy, disabled, locked }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", borderRadius: 12, overflow: "hidden",
      border: `2px solid ${accent}`, position: "relative", opacity: locked ? 0.4 : 1,
      background: `linear-gradient(150deg, ${accent}33 0%, #150f0a 55%, #0a0705 100%)`,
      boxShadow: `0 0 12px ${accent}44`
    }}>
      {owned > 0 && <div style={{ position: "absolute", top: 8, right: 8, background: accent, color: "#0e0a07", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11, borderRadius: 4, padding: "4px 8px" }}>×{owned}</div>}
      
      {/* Image/Icon Display */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 90, position: "relative", background: `${accent}11` }}>
        <div style={{ position: "absolute", width: 70, height: 70, borderRadius: "50%", background: `radial-gradient(circle, ${accent}55, transparent 70%)`, filter: "blur(3px)" }} />
        <div style={{ fontSize: 48, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.8))" }}>{icon}</div>
      </div>
      
      {/* Info Section */}
      <div style={{ padding: "12px 12px 14px", background: "rgba(10,7,5,0.8)", borderTop: `1px solid ${accent}33` }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: "#e8dcc8", lineHeight: 1.3, fontWeight: 600 }}>{name}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#8a8078", marginTop: 4, marginBottom: 10 }}>{sub}</div>
        <button onClick={onBuy} disabled={disabled || locked} style={{
          width: "100%", padding: "8px 0", background: disabled || locked ? "#241a13" : accent,
          color: disabled || locked ? "#6b6152" : "#0e0a07", border: "none", borderRadius: 6,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, cursor: disabled || locked ? "not-allowed" : "pointer",
        }}>{locked ? "LOCKED" : `$${fmt(price)}`}</button>
      </div>
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

// ============================================================
// AUTH PASSWORD SYSTEM
// ============================================================
function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("omerta_password");
    setSavedPassword(saved || "");
  }, []);

  const handleLogin = () => {
    if (!savedPassword) {
      // First time - set password
      if (password.length < 4) {
        alert("Password must be at least 4 characters");
        return;
      }
      localStorage.setItem("omerta_password", password);
      onLogin();
    } else {
      // Check password
      if (password === savedPassword) {
        onLogin();
      } else {
        alert("Wrong password");
        setPassword("");
      }
    }
  };

  return (
    <div style={{
      height: "100vh", background: "#0e0a07", color: "#e8dcc8", fontFamily: "'Cinzel', serif",
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 20
    }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🎩</div>
      <h1 style={{ fontSize: 32, margin: 0, color: "#d4af37" }}>OMERTÀ</h1>
      <p style={{ color: "#8a8078", textAlign: "center", maxWidth: 300 }}>
        {savedPassword ? "Welcome back. Enter your password to access your empire." : "Set a password to protect your progress."}
      </p>
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleLogin()}
        placeholder={savedPassword ? "Enter password..." : "Create password (4+ chars)..."}
        style={{
          width: "100%", maxWidth: 300, padding: "12px", background: "#1a1410", color: "#e8dcc8",
          border: "2px solid #d4af37", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14
        }}
      />
      
      <button onClick={handleLogin} style={{
        padding: "12px 32px", background: "#d4af37", color: "#0e0a07", border: "none", borderRadius: 8,
        fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, cursor: "pointer"
      }}>
        {savedPassword ? "LOGIN" : "SET PASSWORD"}
      </button>
      
      <p style={{ fontSize: 11, color: "#6b6152", textAlign: "center", marginTop: 20 }}>
        🔒 Your password is stored locally on your device
      </p>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function Omerta() {
  const [authenticated, setAuthenticated] = useState(false);
  const [cash, setCash] = useState(500);
  const [energy, setEnergy] = useState(100);
  const [heat, setHeat] = useState(0);
  const [xp, setXp] = useState(0);
  const [owned, setOwned] = useState({});
  const [hideout, setHideout] = useState("motel");
  const [tab, setTab] = useState("empire");
  const [log, setLog] = useState([{ id: 0, text: "You step off the bus in Newark with $500 and a name nobody recognizes yet.", tone: "neutral" }]);
  const [globalChat, setGlobalChat] = useState([]);
  const [chatDraft, setChatDraft] = useState("");
  const logId = useRef(1);

  const pushLog = useCallback((text, tone = "neutral") => {
    logId.current += 1;
    setLog((L) => [{ id: logId.current, text, tone }, ...L].slice(0, 40));
  }, []);

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

  function buyBusiness(b, cat) {
    const n = owned[b.id] || 0;
    const price = Math.round(b.cost * Math.pow(1.15, n));
    if (cash < price) { 
      pushLog(`Can't cover ${b.name} yet — need $${fmt(price)}.`, "warn"); 
      return; 
    }
    setCash((c) => c - price); 
    setOwned((o) => ({ ...o, [b.id]: n + 1 }));
    pushLog(`Acquired ${b.name} #${n + 1}. Passive income up.`, "good");
  }

  const hideoutData = HIDEOUTS.find((h) => h.id === hideout);

  useEffect(() => {
    const t = setInterval(() => {
      setEnergy((e) => clamp(e + 2, 0, 100));
      setHeat((h) => clamp(h - (hideoutData?.heatDecay || 1), 0, 100));
      // Try to show ad periodically
      if (Math.random() < 0.1) {
        adManager.showBanner().catch(() => {});
      }
    }, 2000);
    return () => clearInterval(t);
  }, [hideoutData]);

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

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
            <p style={{ marginTop: 0 }}>{hideoutData?.name}</p>
            
            <SectionTitle>Passive Income</SectionTitle>
            <p>Business owned: {Object.values(owned).reduce((a, b) => a + b, 0)} properties</p>
          </div>
        )}

        {/* Crime Tab */}
        {tab === "crime" && (
          <div>
            <SectionTitle>Available Crimes</SectionTitle>
            {CRIMES.map((crime) => (
              <div key={crime.id} style={{ marginBottom: 12, padding: 10, background: "#1a1410", borderRadius: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{crime.name}</div>
                    <div style={{ fontSize: 12, color: "#8a8078", marginTop: 4 }}>
                      Energy: {crime.energy} | Heat: +{crime.heat}
                    </div>
                  </div>
                  <SealButton onClick={() => doCrime(crime)} size={48}>GO</SealButton>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assets Tab with Image Cards */}
        {tab === "assets" && (
          <div>
            {ASSET_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <SectionTitle>{cat.label}</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
                  {cat.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      icon={item.image}
                      name={item.name}
                      sub={`+$${item.income}/sec`}
                      price={Math.round(item.cost * Math.pow(1.15, owned[item.id] || 0))}
                      owned={owned[item.id] || 0}
                      accent={cat.color}
                      onBuy={() => buyBusiness(item, cat)}
                      disabled={cash < Math.round(item.cost * Math.pow(1.15, owned[item.id] || 0))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Wire Tab */}
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

        {/* Settings Tab */}
        {tab === "settings" && (
          <div>
            <SectionTitle>Settings</SectionTitle>
            <div style={{ padding: 12, background: "#1a1410", borderRadius: 8 }}>
              <p><strong>Storage:</strong> {window.storage?.provider || "localStorage"}</p>
              <p><strong>Player:</strong> {PLAYER_NAME}</p>
              <p><strong>AdMob:</strong> {adManager.available ? "✅ Initialized" : "⚠️ Web build (works in native)"}</p>
              <hr style={{ borderColor: "#4a3d2f" }} />
              <button onClick={() => {
                localStorage.clear();
                window.location.reload();
              }} style={{
                padding: "10px 20px", background: "#c81e3a", color: "#e8dcc8", border: "none", borderRadius: 6,
                fontFamily: "'Cinzel', serif", fontWeight: 700, cursor: "pointer"
              }}>Reset Game</button>
            </div>
          </div>
        )}

        {/* Activity Log */}
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
