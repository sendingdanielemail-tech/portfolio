// POST /api/cms/save  — commits edited copy blocks to GitHub.
// Body: { path: "/work/adas", changes: { "adas-012": "<new inner html>", ... } }
// Requires: valid editor cookie (dh_edit), plus env GITHUB_TOKEN.
// The site-wide password gate (_middleware.js) runs before this too.

const EDIT_COOKIE = "dh_edit";
const DEFAULT_REPO = "sendingdanielemail-tech/portfolio";
const PAGES = new Set([
  "index.html", "about.html",
  "work/adas.html", "work/inspections.html", "work/roll-aways.html",
  "work/grocery.html", "work/vibe-coding.html", "work/five-smart-friends.html",
]);

async function sign(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function getCookie(request, name) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function pathToFile(p) {
  let f = String(p || "").split("?")[0].replace(/^\/+/, "");
  if (f === "" || f.endsWith("/")) f += "index.html";
  if (!f.endsWith(".html")) f += ".html";
  return PAGES.has(f) ? f : null;
}

// Keep inline formatting only; drop anything that could execute or restructure the page.
function sanitize(html) {
  let h = String(html);
  h = h.replace(/<\s*(script|style|iframe|object|embed)[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  h = h.replace(/<div[^>]*>/gi, "<br>").replace(/<\/div>/gi, "");      // contenteditable div wrappers → line breaks
  h = h.replace(/<\/?(p|h[1-6]|section|article|ul|ol|li|table|tr|td|th|blockquote)\b[^>]*>/gi, "");
  h = h.replace(/\s(on\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");       // on* handlers
  h = h.replace(/\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi, "");
  h = h.replace(/\s(style|class|id|contenteditable|spellcheck|data-cms-changed)\s*=\s*("[^"]*"|'[^']*')/gi, "");
  h = h.replace(/(<br>\s*)+$/i, "");                                       // trailing breaks
  return h.trim();
}

// Replace the inner HTML of the element carrying data-cms="id" inside the page source.
function replaceBlock(src, id, inner) {
  const open = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\sdata-cms="${id}"[^>]*>`, "i");
  const m = open.exec(src);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  const start = m.index + m[0].length;
  const re = new RegExp(`<(\\/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = start;
  let depth = 1, c;
  while ((c = re.exec(src))) {
    depth += c[1] ? -1 : 1;
    if (depth === 0) {
      const old = src.slice(start, c.index);
      const lead = (old.match(/^\s*/) || [""])[0], trail = (old.match(/\s*$/) || [""])[0];
      return src.slice(0, start) + lead + inner + trail + src.slice(c.index);
    }
  }
  return null;
}

const b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, "")), (ch) => ch.charCodeAt(0)));
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function onRequestPost({ request, env }) {
  const editPw = env.EDIT_PASSWORD;
  if (!editPw) return json({ ok: false, error: "Editor not configured (EDIT_PASSWORD missing)." }, 503);
  const secret = env.COOKIE_SECRET || env.SITE_PASSWORD || editPw;
  if (getCookie(request, EDIT_COOKIE) !== (await sign(secret, "editor-v1:" + editPw))) {
    return json({ ok: false, error: "Editor session expired. Visit /edit to sign in again." }, 401);
  }
  if (!env.GITHUB_TOKEN) return json({ ok: false, error: "GITHUB_TOKEN secret is not set in Cloudflare." }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Bad JSON." }, 400); }
  const file = pathToFile(body.path);
  if (!file) return json({ ok: false, error: `Unknown page: ${body.path}` }, 400);
  const changes = body.changes && typeof body.changes === "object" ? body.changes : {};
  const ids = Object.keys(changes).filter((k) => /^[a-z0-9-]+$/i.test(k));
  if (!ids.length) return json({ ok: false, error: "Nothing to save." }, 400);

  const repo = env.GITHUB_REPO || DEFAULT_REPO, branch = env.GITHUB_BRANCH || "main";
  const api = `https://api.github.com/repos/${repo}/contents/${file}`;
  const gh = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json",
    "User-Agent": "dhennessy-xyz-editor", "X-GitHub-Api-Version": "2022-11-28",
  };

  const get = await fetch(`${api}?ref=${branch}`, { headers: gh });
  if (!get.ok) return json({ ok: false, error: `GitHub read failed (${get.status}).` }, 502);
  const meta = await get.json();
  let src = b64decode(meta.content);
  const original = src;

  const missing = [];
  for (const id of ids) {
    const out = replaceBlock(src, id, sanitize(changes[id]));
    if (out === null) missing.push(id); else src = out;
  }
  if (missing.length) return json({ ok: false, error: `Could not find block(s) in source: ${missing.join(", ")}. Reload the page and try again.` }, 409);
  if (src === original) return json({ ok: true, commit: "none", note: "No effective change." });

  const label = file.replace(/\.html$/, "").replace(/^work\//, "") || "home";
  const put = await fetch(api, {
    method: "PUT", headers: { ...gh, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `Edit copy on ${label} (${ids.length} block${ids.length === 1 ? "" : "s"}) via site editor`,
      content: b64encode(src), sha: meta.sha, branch,
      committer: { name: "Daniel Hennessy", email: "sendingdanielemail@gmail.com" },
    }),
  });
  if (!put.ok) {
    const t = await put.text().catch(() => "");
    return json({ ok: false, error: `GitHub write failed (${put.status}). ${t.slice(0, 200)}` }, 502);
  }
  const data = await put.json();
  return json({ ok: true, commit: (data.commit && data.commit.sha || "").slice(0, 7), url: data.commit && data.commit.html_url });
}

// Any non-POST method lands here (onRequestPost takes precedence for POST).
export const onRequest = () => json({ ok: false, error: "POST only." }, 405);
