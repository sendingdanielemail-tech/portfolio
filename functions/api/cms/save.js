// POST /api/cms/save — the editor's write endpoint. Two actions:
//   { path: "/work/adas", changes: { "adas-012": "<inner html>", ... } }  → edits copy blocks
//   { action: "set-visibility", public: true|false }                       → commits public.json
// Requires a valid editor cookie (dh_edit) and the GITHUB_TOKEN secret.
// The site-wide gate (_middleware.js) has already run before this.

import { isEditor, json } from "../../_lib/auth.js";

const DEFAULT_REPO = "sendingdanielemail-tech/portfolio";
const COMMITTER = { name: "Daniel Hennessy", email: "sendingdanielemail@gmail.com" };
const PAGES = new Set([
  "index.html", "about.html", "404.html",
  "work/adas.html", "work/inspections.html", "work/roll-aways.html",
  "work/grocery.html", "work/vibe-coding.html", "work/five-smart-friends.html",
]);
// Inline tags an edited block may contain. Everything else is stripped (text kept).
const ALLOWED_TAGS = new Set(["a", "strong", "em", "b", "i", "br", "span", "u", "code", "sup", "sub", "small", "mark", "abbr"]);
const MAX_BLOCKS = 200;

// ---- GitHub Contents API ----------------------------------------------------

function github(env) {
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || "main";
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json",
    "User-Agent": "dhennessy-xyz-editor", "X-GitHub-Api-Version": "2022-11-28",
  };
  const url = (file) => `https://api.github.com/repos/${repo}/contents/${file}`;
  return {
    // → { sha, text } | null when the file doesn't exist; throws on other errors.
    async read(file) {
      const r = await fetch(`${url(file)}?ref=${branch}`, { headers });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`GitHub read failed (${r.status}).`);
      const meta = await r.json();
      return { sha: meta.sha, text: b64decode(meta.content) };
    },
    // → short commit sha; throws on failure.
    async write(file, text, message, sha) {
      const r = await fetch(url(file), {
        method: "PUT", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ message, content: b64encode(text), branch, committer: COMMITTER, ...(sha ? { sha } : {}) }),
      });
      if (!r.ok) {
        const detail = (await r.text().catch(() => "")).slice(0, 200);
        throw new Error(`GitHub write failed (${r.status}). ${detail}`);
      }
      const data = await r.json();
      return { commit: (data.commit?.sha || "").slice(0, 7), url: data.commit?.html_url };
    },
  };
}

const b64decode = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, "")), (ch) => ch.charCodeAt(0)));
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// ---- copy editing -----------------------------------------------------------

function pathToFile(p) {
  let f = String(p || "").split("?")[0].replace(/^\/+/, "");
  if (f === "" || f.endsWith("/")) f += "index.html";
  if (!f.endsWith(".html")) f += ".html";
  return PAGES.has(f) ? f : null;
}

// Allowlist sanitizer: keep inline formatting tags only, with a safe href on <a>;
// strip every other tag (keeping its text), comments, and all other attributes.
function sanitize(html) {
  let h = String(html);
  h = h.replace(/<!--[\s\S]*?-->/g, "");
  h = h.replace(/<\s*(script|style|iframe|object|embed|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  h = h.replace(/<div\b[^>]*>/gi, "<br>").replace(/<\/div\s*>/gi, "");   // contenteditable div wrappers → line breaks
  h = h.replace(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi, (whole, close, tag, attrs) => {
    tag = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (close) return `</${tag}>`;
    if (tag === "br") return "<br>";
    if (tag !== "a") return `<${tag}>`;
    const m = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const href = (m && (m[1] ?? m[2] ?? m[3]) || "").trim();
    const safe = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href) && !/[\s"'<>]/.test(href);
    return safe ? `<a href="${href}">` : "<a>";
  });
  h = h.replace(/(<br>\s*)+$/i, "");                                        // trailing breaks
  return h.trim();
}

// Replace the inner HTML of the element carrying data-cms="id" in the page source.
// Tag-nesting aware, whitespace-preserving. Returns null if the block isn't found.
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
      const lead = old.match(/^\s*/)[0], trail = old.match(/\s*$/)[0];
      return src.slice(0, start) + lead + inner + trail + src.slice(c.index);
    }
  }
  return null;
}

async function saveCopy(gh, body) {
  const file = pathToFile(body.path);
  if (!file) return json({ ok: false, error: `Unknown page: ${body.path}` }, 400);
  const changes = body.changes && typeof body.changes === "object" ? body.changes : {};
  const ids = Object.keys(changes).filter((k) => /^[a-z0-9-]+$/i.test(k) && typeof changes[k] === "string");
  if (!ids.length) return json({ ok: false, error: "Nothing to save." }, 400);
  if (ids.length > MAX_BLOCKS) return json({ ok: false, error: `Too many blocks in one save (${ids.length}).` }, 413);

  const current = await gh.read(file);
  if (!current) return json({ ok: false, error: `${file} is missing from the repo.` }, 502);

  let src = current.text;
  const missing = [];
  for (const id of ids) {
    const out = replaceBlock(src, id, sanitize(changes[id]));
    if (out === null) missing.push(id); else src = out;
  }
  if (missing.length) {
    return json({ ok: false, error: `Could not find block(s) in source: ${missing.join(", ")}. Reload the page and try again.` }, 409);
  }
  if (src === current.text) return json({ ok: true, commit: "none", note: "No effective change." });

  const label = file.replace(/\.html$/, "").replace(/^work\//, "").replace(/^index$/, "home");
  const message = `Edit copy on ${label} (${ids.length} block${ids.length === 1 ? "" : "s"}) via site editor`;
  return json({ ok: true, ...(await gh.write(file, src, message, current.sha)) });
}

async function setVisibility(gh, body) {
  const makePublic = body.public === true;
  const current = await gh.read("public.json");          // null if absent → first-time create
  const message = makePublic ? "Open site to everyone (public.json)" : "Lock site behind password (public.json)";
  const { commit } = await gh.write("public.json", `{ "public": ${makePublic} }\n`, message, current?.sha);
  return json({ ok: true, public: makePublic, commit });
}

// ---- handler ----------------------------------------------------------------

export async function onRequestPost({ request, env }) {
  if (!env.EDIT_PASSWORD) return json({ ok: false, error: "Editor not configured (EDIT_PASSWORD missing)." }, 503);
  if (!(await isEditor(request, env))) return json({ ok: false, error: "Editor session expired. Visit /edit to sign in again." }, 401);
  if (!env.GITHUB_TOKEN) return json({ ok: false, error: "GITHUB_TOKEN secret is not set in Cloudflare." }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Bad JSON." }, 400); }
  if (!body || typeof body !== "object") return json({ ok: false, error: "Bad JSON." }, 400);

  const gh = github(env);
  try {
    return body.action === "set-visibility" ? await setVisibility(gh, body) : await saveCopy(gh, body);
  } catch (err) {
    return json({ ok: false, error: err.message || "Unexpected error." }, 502);
  }
}

// Any non-POST method lands here (onRequestPost takes precedence for POST).
export const onRequest = () => json({ ok: false, error: "POST only." }, 405);
