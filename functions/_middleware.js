// Password gate for the whole site, running on Cloudflare Pages Functions.
// The password is checked SERVER-SIDE against the SITE_PASSWORD environment
// variable (a Cloudflare secret) — it never appears in the page source.
// A signed cookie keeps visitors logged in so they only enter it once.
// If SITE_PASSWORD is missing the gate fails CLOSED (503) except on localhost.

const COOKIE_NAME = "dh_gate";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
// Editor mode: a second password (EDIT_PASSWORD) unlocks in-page copy editing.
// Sign in at /edit, sign out at /edit?exit=1. When the editor cookie is valid,
// every HTML page gets /cms.js injected, which turns data-cms blocks editable.
// Visibility: /public.json {"public":true} opens the site to everyone (toolbar toggle).
const EDIT_COOKIE = "dh_edit";
const EDIT_MAX_AGE = 60 * 60 * 12; // 12 hours
const CONTACT_EMAIL = "sendingdanielemail@gmail.com";

// --- helpers ---------------------------------------------------------------

async function sign(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) {
      return decodeURIComponent(part.slice(i + 1).trim());
    }
  }
  return null;
}

// Only allow same-site relative paths as a post-login redirect target.
function safeNext(value) {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !/["'<>\s]/.test(value)) {
    return value;
  }
  return "/";
}

function escapeAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// --- main ------------------------------------------------------------------

export async function onRequest(context) {
  const { request, env, next } = context;
  const password = env.SITE_PASSWORD;
  const url = new URL(request.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  // No password configured: stay OPEN only for local development
  // (wrangler pages dev / localhost). Everywhere else, fail CLOSED so a
  // preview deployment or a lost secret can never expose the site.
  if (!password && !isLocal) {
    return new Response(
      "Site locked: SITE_PASSWORD is not configured for this environment.",
      { status: 503, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
    );
  }

  const secret = env.COOKIE_SECRET || password || "local-dev";
  const validToken = password ? await sign(secret, "authorized-v1") : null;

  // Visibility switch: /public.json in the repo ({"public": true|false}), flipped
  // from the editor toolbar. Only honored where SITE_PASSWORD is configured, so a
  // preview deployment (no secrets) can never be opened by it.
  let isPublic = false;
  if (password && env.ASSETS) {
    try {
      const cfg = await (await env.ASSETS.fetch(new URL("/public.json", request.url))).json();
      isPublic = cfg && cfg.public === true;
    } catch (e) { isPublic = false; }
  }
  const siteAuthed = !password || isPublic || getCookie(request, COOKIE_NAME) === validToken;

  if (!siteAuthed) {
    // Handle a login submission.
    if (request.method === "POST" && url.pathname !== "/api/cms/save") {
      const form = await request.formData();
      const submitted = form.get("password");
      const target = safeNext(form.get("next"));
      if (typeof submitted === "string" && submitted === password) {
        const headers = new Headers({ Location: target, "Cache-Control": "no-store" });
        headers.append(
          "Set-Cookie",
          `${COOKIE_NAME}=${validToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`
        );
        return new Response(null, { status: 302, headers });
      }
      return htmlResponse(loginPage({ error: true, next: target }), 401);
    }
    // Any other request from an unauthenticated visitor → show the gate.
    return htmlResponse(loginPage({ error: false, next: safeNext(url.pathname + url.search) }), 401);
  }

  // ---- editor mode (site-authenticated visitors only) ----------------------
  const editPw = env.EDIT_PASSWORD;
  const editToken = editPw ? await sign(secret, "editor-v1:" + editPw) : null;
  const editing = !!editPw && getCookie(request, EDIT_COOKIE) === editToken;

  if (url.pathname === "/edit") {
    if (!editPw) return new Response("Editor not configured (EDIT_PASSWORD secret missing).", { status: 404, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
    if (url.searchParams.get("exit") === "1") {
      const headers = new Headers({ Location: "/", "Cache-Control": "no-store" });
      headers.append("Set-Cookie", `${EDIT_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
      return new Response(null, { status: 302, headers });
    }
    if (editing) return Response.redirect(new URL(safeNext(url.searchParams.get("next") || "/"), url).toString(), 302);
    if (request.method === "POST") {
      const form = await request.formData();
      const target = safeNext(form.get("next"));
      if (form.get("password") === editPw) {
        const headers = new Headers({ Location: target, "Cache-Control": "no-store" });
        headers.append("Set-Cookie", `${EDIT_COOKIE}=${editToken}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${EDIT_MAX_AGE}`);
        return new Response(null, { status: 302, headers });
      }
      return htmlResponse(editLoginPage({ error: true, next: target }), 401);
    }
    return htmlResponse(editLoginPage({ error: false, next: safeNext(url.searchParams.get("next") || "/") }), 200);
  }

  let response = await next();
  if (isPublic && !editing) {
    // Open window: serve, but keep search engines from indexing/caching it.
    const h = new Headers(response.headers);
    h.set("X-Robots-Tag", "noindex, nofollow");
    response = new Response(response.body, { status: response.status, headers: h });
  }
  if (!editing) return response;

  // Editing: inject the editor script into HTML pages and make sure nothing caches.
  const ct = response.headers.get("Content-Type") || "";
  if (!ct.includes("text/html")) return response;
  const out = new HTMLRewriter()
    .on("body", { element(el) { el.append('<script src="/cms.js" defer></script>', { html: true }); } })
    .transform(response);
  const headers = new Headers(out.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(out.body, { status: out.status, headers });
}

function htmlResponse(body, status) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// --- the login screen ------------------------------------------------------

function loginPage({ error, next }) {
  const nextAttr = escapeAttr(next);
  const mailto =
    `mailto:${CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent("Portfolio access request")}` +
    `&body=${encodeURIComponent("Hi Daniel,\n\nI'd like access to your portfolio. A bit about me / how we know each other:\n\n")}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Daniel Hennessy — Portfolio</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --black: #0a0a0a;
    --white: #f5f5f0;
    --red: #e63312;
    --gray: #888;
    --dark-gray: #555;
  }
  html, body { height: 100%; }
  body {
    font-family: 'Inter', Helvetica, Arial, sans-serif;
    background: var(--white);
    color: var(--black);
    -webkit-font-smoothing: antialiased;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  /* Faint Brockmann column guides in the background */
  .guides {
    position: fixed; inset: 0;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: clamp(16px, 2vw, 24px);
    padding: 0 clamp(24px, 5vw, 80px);
    pointer-events: none; z-index: 0;
  }
  .guides span { border-left: 1px solid rgba(0,0,0,0.05); }
  .guides span:last-child { border-right: 1px solid rgba(0,0,0,0.05); }

  .card {
    position: relative; z-index: 1;
    width: 100%; max-width: 420px;
  }
  .label {
    font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--red); margin-bottom: 20px;
  }
  h1 {
    font-size: clamp(28px, 6vw, 40px); font-weight: 900;
    line-height: 1.05; letter-spacing: -0.02em; margin-bottom: 12px;
  }
  p.lede { font-size: 15px; line-height: 1.5; color: var(--dark-gray); margin-bottom: 28px; }
  form { display: flex; flex-direction: column; gap: 12px; }
  label.field { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--gray); }
  input[type="password"] {
    font-family: inherit; font-size: 16px; color: var(--black);
    padding: 14px 16px; border: 1px solid rgba(0,0,0,0.18); border-radius: 0;
    background: #fff; width: 100%;
  }
  input[type="password"]:focus { outline: 2px solid var(--red); outline-offset: 1px; border-color: var(--red); }
  button.enter {
    font-family: inherit; font-size: 15px; font-weight: 700;
    padding: 14px 16px; border: none; border-radius: 0;
    background: var(--black); color: var(--white); cursor: pointer;
    letter-spacing: 0.02em; transition: background 0.15s ease;
  }
  button.enter:hover { background: var(--red); }
  .error { font-size: 13px; color: var(--red); font-weight: 700; min-height: 18px; }
  .divider { height: 1px; background: rgba(0,0,0,0.08); margin: 28px 0 20px; }
  .request { font-size: 14px; color: var(--dark-gray); line-height: 1.5; }
  .request a {
    display: inline-block; margin-top: 10px; color: var(--black);
    font-weight: 700; text-decoration: none; border-bottom: 2px solid var(--red);
    padding-bottom: 2px;
  }
  .request a:hover { color: var(--red); }
  footer { margin-top: 40px; font-size: 12px; color: var(--gray); }
</style>
</head>
<body>
  <div class="guides"><span></span><span></span><span></span><span></span><span></span><span></span></div>
  <main class="card">
    <div class="label">Daniel Hennessy — Portfolio</div>
    <h1>This portfolio is private.</h1>
    <p class="lede">Enter the password to view the work, or request access below.</p>
    <form method="POST" action="">
      <input type="hidden" name="next" value="${nextAttr}">
      <label class="field" for="pw">Password</label>
      <input type="password" id="pw" name="password" autocomplete="current-password" autofocus required>
      <div class="error">${error ? "Incorrect password. Try again." : ""}</div>
      <button class="enter" type="submit">Enter</button>
    </form>
    <div class="divider"></div>
    <div class="request">
      Don't have the password?
      <br>
      <a href="${mailto}">Email me to request access →</a>
    </div>
    <footer>© Daniel Hennessy</footer>
  </main>
</body>
</html>`;
}


// --- the editor sign-in screen ---------------------------------------------

function editLoginPage({ error, next }) {
  // Reuse the gate page markup, swap the copy and form.
  return loginPage({ error: false, next })
    .replace("<h1>This portfolio is private.</h1>", "<h1>Edit mode.</h1>")
    .replace('<p class="lede">Enter the password to view the work, or request access below.</p>',
             '<p class="lede">Enter the editor password. Every block of text on the site becomes editable; Save commits straight to GitHub.</p>')
    .replace('<form method="POST" action="">', '<form method="POST" action="/edit">')
    .replace('<label class="field" for="pw">Password</label>', '<label class="field" for="pw">Editor password</label>')
    .replace('<div class="error"></div>', `<div class="error">${error ? "Incorrect editor password." : ""}</div>`)
    .replace('<button class="enter" type="submit">Enter</button>', '<button class="enter" type="submit">Start editing</button>')
    .replace(/<div class="divider"><\/div>[\s\S]*?<\/div>\n    <footer>/, '<div class="divider"></div>\n    <div class="request">Just here to view? <a href="/">Go to the site →</a></div>\n    <footer>')
    .replace("<title>Daniel Hennessy — Portfolio</title>", "<title>Edit — Daniel Hennessy</title>");
}
