// Cloudflare Worker in front of Supabase: only the three API areas the game uses get through, only from the app,
// with a body size cap, per-address rate limiting and security headers on every reply.
const AREAS = ["/auth/v1/", "/rest/v1/", "/realtime/v1/"];
const METHODS = new Set(["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
const PASS = ["apikey", "authorization", "content-type", "prefer", "accept", "accept-profile", "content-profile", "range", "x-client-info", "x-supabase-api-version", "sec-websocket-key", "sec-websocket-version", "sec-websocket-protocol", "upgrade", "connection"];
const MAX_BODY = 16 * 1024;

const origins = env => new Set((env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean));
const hardening = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-site",
  "Cache-Control": "no-store",
};
const reply = (status, body, extra = {}) =>
  new Response(body, { status, headers: { ...hardening, "Content-Type": "text/plain", ...extra } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get("Origin");
    const ok = origins(env);
    const allowed = origin && ok.has(origin);
    const cors = allowed ? {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": PASS.join(", "),
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    } : { "Vary": "Origin" };

    if (!METHODS.has(req.method)) return reply(405, "method not allowed", cors);
    if (!AREAS.some(a => url.pathname.startsWith(a))) return reply(404, "not found", cors);
    if (origin && !allowed) return reply(403, "origin not allowed", cors);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { ...hardening, ...cors } });

    const len = Number(req.headers.get("Content-Length") || 0);
    if (len > MAX_BODY) return reply(413, "too large", cors);

    // Rate limit per client address (binding is declared in wrangler.toml).
    if (env.LIMITER) {
      const ip = req.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return reply(429, "slow down", { ...cors, "Retry-After": "10" });
    }

    const target = new URL(url.pathname + url.search, env.SUPABASE_URL);
    const headers = new Headers();
    for (const h of PASS) { const v = req.headers.get(h); if (v) headers.set(h, v); }
    const init = { method: req.method, headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body, redirect: "manual" };

    let up;
    try { up = await fetch(target, init); }
    catch { return reply(502, "upstream unavailable", cors); }

    if (up.status === 101) return up; // websocket upgrade for realtime
    const out = new Headers(up.headers);
    ["set-cookie", "server", "x-powered-by"].forEach(h => out.delete(h));
    Object.entries({ ...hardening, ...cors }).forEach(([k, v]) => out.set(k, v));
    return new Response(up.body, { status: up.status, headers: out });
  },
};
