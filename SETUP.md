# Making chat, newspapers, shared stock and cities live

The game runs without a database, but then messages, newspapers, shared stock and the world map only work on one phone ("solo mode"). To share them between players:

1. In the Firebase console create a project, add a **Realtime Database**, and add a **Web app**.
2. Copy the web app's `apiKey`, `databaseURL`, `projectId` into `src/firebase-config.js` (or set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID` when building).
3. In **Realtime Database > Rules**, paste the contents of `database.rules.json` and publish.
4. Rebuild the app. The Social tab says "Live" when it connects; it says why when it does not.

Known limit: anyone can write to the database, so the rules only check shape and size. Real protection against cheating needs Firebase Authentication (anonymous sign-in) and rules that tie each write to the signed-in player.
