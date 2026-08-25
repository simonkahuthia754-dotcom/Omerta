# Omerta - Quick Start Guide

## ✅ What's Been Done

Your Omerta game has been **fixed and enhanced** with:

1. **Fixed App.jsx** - Renamed from `.txt`, cleaned up syntax, fully functional
2. **Firebase Integration** - Real-time database for multiplayer persistence
3. **Supabase Integration** - PostgreSQL alternative for storage
4. **AdMob Ready** - Google AdMob IDs configured for native monetization
5. **Storage Adapter** - Unified interface that auto-falls back to localStorage
6. **Environment Setup** - Secure credentials management with `.env.local`
7. **Documentation** - Complete setup guide for all backends

---

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Choose Your Backend
Create `.env.local`:

**Option A - Firebase (Recommended)**
```
REACT_APP_STORAGE_PROVIDER=firebase
REACT_APP_FIREBASE_API_KEY=your_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_ID=your-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

**Option B - Supabase**
```
REACT_APP_STORAGE_PROVIDER=supabase
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### Step 3: Run the Game
```bash
npm run dev
```
Open http://localhost:5173 in your browser

### Step 4: Test Multiplayer
Open the game in **two browser tabs** → Wire tab → Send messages → Syncs across both!

---

## 📱 Build for Android (with AdMob)

### Prerequisites
- Java JDK installed
- Android Studio installed

### Steps
```bash
npm run build
npx cap add android
npx cap open android
```

Then in Android Studio:
1. Build > Generate Signed Bundle / APK
2. Choose "APK"
3. Use your keystore to sign
4. Deploy to Play Store (with real AdMob IDs)

---

## 🎮 Game Features

| Feature | Status | How It Works |
|---------|--------|-------------|
| **Crime Jobs** | ✅ Working | Earn cash, gain XP, increase heat |
| **Passive Income** | ✅ Working | Buy businesses to generate income |
| **Global Wire** | ✅ Real-time | Chat with other players (Firebase/Supabase) |
| **Leaderboard** | ✅ Working | Shared ranking by cash |
| **Energy/Heat** | ✅ Working | Energy regenerates, heat decays at hideout |
| **AdMob Ads** | ✅ Configured | Ready for native Android/iOS builds |
| **Market** | ✅ Working | Trade stocks and forex |

---

## 📊 Storage System

Your game now uses a **smart storage adapter**:

```
┌─────────────────────┐
│   Your Game Code    │
└──────────┬──────────┘
           │ window.storage API
           ↓
    ┌──────────────┐
    │ StorageAdapter│
    └──────────────┘
         │
    ┌────┴────┐
    ↓         ↓
 Firebase  Supabase  → localStorage (fallback)
```

- **Online?** Uses Firebase/Supabase for real-time sync
- **Offline?** Falls back to localStorage automatically
- **No credentials?** Still works with localStorage only

---

## 🔐 Environment Variables Explained

| Variable | What It Does | Get From |
|----------|-------------|----------|
| `REACT_APP_STORAGE_PROVIDER` | Chooses backend | Your choice: "firebase" or "supabase" |
| `REACT_APP_FIREBASE_*` | Firebase config | [Firebase Console](https://console.firebase.google.com) |
| `REACT_APP_SUPABASE_*` | Supabase config | [Supabase Dashboard](https://app.supabase.com) |
| `REACT_APP_ADMOB_*` | Ad unit IDs | [Google AdMob](https://admob.google.com) |

**⚠️ NEVER commit `.env.local` to GitHub!** It's in `.gitignore` automatically.

---

## 🔧 Troubleshooting

### Game won't start
```bash
rm node_modules package-lock.json
npm install
npm run dev
```

### "Wire's down" message keeps appearing
1. Check `.env.local` exists and has correct values
2. Verify Firebase/Supabase credentials
3. Check browser console (F12) for errors
4. If offline, game still works with localStorage

### AdMob ads not showing
- AdMob only works in **native Android/iOS builds**
- Won't appear in web or dev builds
- Follow Android build steps above to test

### Multiplayer not syncing
1. Open DevTools (F12) → Network tab
2. Send a wire message
3. Look for API calls to Firebase/Supabase
4. If 401/403 errors: check credentials and database rules

---

## 📚 Full Documentation

Read the complete setup guide:
```bash
cat SETUP_GUIDE.md
```

Contains:
- Detailed Firebase setup
- Supabase SQL schema
- AdMob configuration for native builds
- Android Studio build process
- Database rules and security
- Troubleshooting for each backend

---

## 🎯 Next Steps

1. **Test locally**: `npm run dev` → play the game
2. **Set up backend**: Follow SETUP_GUIDE.md for Firebase or Supabase
3. **Test multiplayer**: Open two browser windows, use Wire tab
4. **Build native**: Follow Android/iOS steps to compile APK
5. **Get real AdMob IDs**: Register your app on Google AdMob
6. **Deploy**: Upload to Google Play Store

---

## 💡 Tips

- **Save progress**: Everything auto-syncs to your backend
- **No account needed**: Anonymous players work fine
- **Scale easily**: Firebase/Supabase handle 1000s of players
- **Monetize**: AdMob ready to show ads in native builds
- **Extend**: Game code is modular, easy to add features

---

## 📞 Support

If something breaks:
1. Check `.env.local` has correct format
2. Clear browser cache (Ctrl+Shift+Delete)
3. Check Firebase/Supabase dashboard for data
4. Look at browser console errors (F12)
5. Try with localStorage only (remove `.env.local`)

---

**You're all set! 🎉 Start playing now:**
```bash
npm run dev
```
