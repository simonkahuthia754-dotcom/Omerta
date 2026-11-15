# Making chat, newspapers, shared stock and cities live

The game runs without a database, but then messages, newspapers, shared stock and the world map only work on one phone ("solo mode"). To share them between players:

1. In the Firebase console create a project, add a **Realtime Database**, and add a **Web app**.
2. Copy the web app's `apiKey`, `databaseURL`, `projectId` into `src/firebase-config.js` (or set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID` when building).
3. In **Realtime Database > Rules**, paste the contents of `database.rules.json` and publish.
4. Rebuild the app. The Social tab says "Live" when it connects; it says why when it does not.

## Turn on sign-in (required)

The database rules now require a signed-in user. In the Firebase console open **Authentication > Sign-in method** and enable **Anonymous**. Players are signed in silently, nothing to type. Without it the app says "Could not sign in to the shared world".

## What is protected, and what is not

- **Database rules** check shape, size, types and time on every write, reject unknown fields, only let a player's own sign-in change their rank and presence rows, stop stock being refilled early, stop land price going down, and allow a compensation credit only for a real takeover.
- **App** sanitises everything read from the database, rate-limits sending, hashes the PIN with a salt, and locks the PIN pad after repeated wrong tries. Saves are rebuilt on load, so an edited save cannot crash it or smuggle in unknown items.
- **Build** sets a content security policy, turns off Android backups, WebView debugging and cleartext traffic.
- **Not possible without a server:** the game itself runs on the phone, so a determined player who edits their own phone can still give themselves money there. The rules cap what can be posted to the shared world, but a posted net worth cannot be proven. A real fix is moving the money maths into Firebase Cloud Functions.
- Direct-message paths can be read by anyone signed in who knows both player ids. For fully private messages the ids would need to be tied to sign-in ids.
- For extra abuse protection turn on **App Check** with Play Integrity in the Firebase console.
- There is no SQL in this app, so SQL injection does not apply. Text from other players is only ever shown as plain text, never as HTML.
