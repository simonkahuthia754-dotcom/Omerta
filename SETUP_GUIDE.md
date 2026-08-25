# Omerta Configuration Guide

## Setup Instructions

### 1. Firebase Configuration (Recommended for Real-time Database)

#### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project named "omerta-game"
3. Enable Realtime Database (NOT Firestore)
4. Set database rules to public (for testing):

```json
{
  "rules": {
    "shared": {
      ".read": true,
      ".write": true
    },
    "player": {
      ".read": "auth != null",
      ".write": "auth.uid === $uid"
    }
  }
}
```

#### Add Environment Variables
Create `.env.local`:
```
REACT_APP_STORAGE_PROVIDER=firebase
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your-app.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
REACT_APP_FIREBASE_MESSAGING_ID=your-messaging-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

---

### 2. Supabase Configuration (PostgreSQL Alternative)

#### Create Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Create a new project
3. Create a table in SQL Editor:

```sql
CREATE TABLE storage (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access" ON storage
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON storage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON storage
  FOR UPDATE USING (true);
```

#### Add Environment Variables
Create `.env.local`:
```
REACT_APP_STORAGE_PROVIDER=supabase
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

---

### 3. Google AdMob Setup

#### Get AdMob IDs
1. Go to [Google AdMob Console](https://admob.google.com)
2. Create an app in AdMob
3. Create ad units (Banner, Interstitial, Rewarded)
4. Copy your **App ID** and **Ad Unit IDs**

#### Configure for Native Build
The AdMob IDs in `App.jsx` are already configured:
```javascript
const ADMOB_CONFIG = {
  publisherId: "pub-1268492465575554",
  appId: "ca-app-pub-1268492465575554~2328637637",
  bannerMain: "ca-app-pub-1268492465575554/1015555967",
  interstitial: "ca-app-pub-1268492465575554/1864090437",
  rewarded: "ca-app-pub-1268492465575554/5317868254",
};
```

#### Install AdMob Plugin in Capacitor
```bash
npm install @capacitor-community/admob
npx cap sync
```

#### Add to Capacitor Config (capacitor.config.json)
```json
{
  "plugins": {
    "Admob": {
      "appId": "ca-app-pub-1268492465575554~2328637637"
    }
  }
}
```

#### Use AdMob in Android (MainActivity.java)
```java
import com.capacitor.community.admob.AdMob;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    this.init(savedInstanceState, new ArrayList<Class<?>>() {{
      add(AdMob.class);
    }});
  }
}
```

---

## Running the Game

### Development
```bash
npm install
npm run dev
```
Visit http://localhost:5173

### Build Web
```bash
npm run build
npm run preview
```

### Build Android
```bash
npm run build
npx cap add android
npx cap open android
```
Then build in Android Studio.

---

## Features

✅ **Multiplayer Wire** - Real-time global chat via Firebase/Supabase  
✅ **Trade Board** - Buy/sell items across players  
✅ **Leaderboard** - Shared ranking by cash/level  
✅ **AdMob Integration** - Ready for monetization in native builds  
✅ **Fallback Storage** - Uses localStorage if backend unavailable  
✅ **Crime System** - Progressive jobs with energy/heat mechanics  
✅ **Passive Income** - Businesses generate money over time  

---

## Troubleshooting

### "Wire's down — message didn't send"
- Check Firebase/Supabase credentials in `.env.local`
- Verify database rules allow read/write
- Check browser console for errors

### AdMob ads not showing
- AdMob only works in native Android/iOS builds
- Verify App ID in `capacitor.config.json`
- Ads won't appear in web or Capacitor dev builds

### Storage not syncing
- Set `REACT_APP_STORAGE_PROVIDER` to correct value
- Check network tab in dev tools
- Verify CORS settings if using external API

---

## Environment Variables Summary

| Variable | Purpose | Required |
|----------|---------|----------|
| `REACT_APP_STORAGE_PROVIDER` | "firebase" or "supabase" | Yes |
| `REACT_APP_FIREBASE_*` | Firebase config | If using Firebase |
| `REACT_APP_SUPABASE_*` | Supabase config | If using Supabase |

---

## Next Steps

1. **Choose your backend**: Firebase (easy) or Supabase (more control)
2. **Set up credentials**: Add to `.env.local`
3. **Test multiplayer**: Open game in two browsers
4. **Build native**: Follow Android setup to compile APK
5. **Deploy AdMob**: Get real app IDs from Google
