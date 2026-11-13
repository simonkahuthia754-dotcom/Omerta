// Put your own Firebase project here (Firebase console > Project settings > Your apps > Web app).
// Or set VITE_FIREBASE_API_KEY, VITE_FIREBASE_DATABASE_URL, VITE_FIREBASE_PROJECT_ID when building.
// Until the apiKey is real, chat, messages and newspapers show "not set up" instead of pretending to work.
const e=(import.meta&&import.meta.env)||{};
export const firebaseConfig={
  apiKey:e.VITE_FIREBASE_API_KEY||"PASTE_YOUR_API_KEY",
  authDomain:(e.VITE_FIREBASE_PROJECT_ID||"your-project")+".firebaseapp.com",
  databaseURL:e.VITE_FIREBASE_DATABASE_URL||"https://your-project-default-rtdb.firebaseio.com",
  projectId:e.VITE_FIREBASE_PROJECT_ID||"your-project",
  appId:e.VITE_FIREBASE_APP_ID||"",
};
export const configured=!/PASTE_|your-project/.test(firebaseConfig.apiKey+firebaseConfig.databaseURL);
