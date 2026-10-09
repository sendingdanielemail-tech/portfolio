// Shared auth helpers for the password gate (_middleware.js) and the editor
// API (api/cms/save.js). One place for cookie names, secret derivation and
// token signing so the two can never drift apart.

export const SITE_COOKIE = "dh_gate";
export const EDIT_COOKIE = "dh_edit";
export const SITE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const EDIT_COOKIE_MAX_AGE = 60 * 60 * 12;      // 12 hours

export async function sign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getCookie(request, name) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

// The signing secret: COOKIE_SECRET, else the site password, else a fixed
// local-dev value (only reachable on localhost with no password configured).
export const cookieSecret = (env) => env.COOKIE_SECRET || env.SITE_PASSWORD || "local-dev";

export const siteToken = (env) => sign(cookieSecret(env), "authorized-v1");
export const editorToken = (env) => sign(cookieSecret(env), "editor-v1:" + env.EDIT_PASSWORD);

export async function isEditor(request, env) {
  return !!env.EDIT_PASSWORD && getCookie(request, EDIT_COOKIE) === (await editorToken(env));
}

export const setCookie = (name, value, maxAge) =>
  `${name}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
