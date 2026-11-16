# Realtime chat on Supabase

Chat, direct messages, the inbox, who is online and typing indicators run on Supabase Realtime. The tables and security rules are in `supabase/schema.sql` (already applied to the project). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (GitHub: Settings > Secrets and variables > Actions > Variables). In Supabase turn on **Authentication > Sign In / Providers > Allow anonymous sign-ins**. Without it the Social tab says it could not sign in.

## Cloudflare gateway (optional, recommended)

`cloudflare/worker.js` sits in front of Supabase: it only lets the auth, REST and realtime paths through, only from the app's origin, caps request size, rate-limits per address and adds security headers. To use it add two GitHub secrets, `CLOUDFLARE_API_TOKEN` (Workers edit permission) and `CLOUDFLARE_ACCOUNT_ID`; the workflow deploys it on the next push to `cloudflare/`. Then set the repository variable `VITE_SUPABASE_URL` to the Worker address (`https://omerta-gateway.<you>.workers.dev`) so the app talks to the gateway. Until then the app talks to Supabase directly, which the database rules already protect.

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
