# Security

Report problems privately to the repository owner instead of opening a public issue.

Layers in place: row-level security on every Supabase table, anonymous sign-in with player ids tied to the device that claimed them, server-side rate limits, length and format checks in the database, a Cloudflare Worker gateway with an origin allow-list, body cap and rate limit, a content security policy in the app, salted PIN hashing with lockout, validated saves, and CI checks for dependencies, committed secrets and code analysis.

Never commit a Supabase `service_role` or `sb_secret_` key. The publishable key in the app is meant to be public; the database rules are what protect the data.
