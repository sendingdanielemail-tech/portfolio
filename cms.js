/* dhennessy.xyz — in-page copy editor.
   Injected by functions/_middleware.js ONLY when the editor cookie is present.
   Every element with a data-cms id becomes editable. Save sends changed blocks
   to /api/cms/save, which commits them to GitHub; Cloudflare rebuilds in ~1 min. */
(() => {
  if (window.__dhCms) return; window.__dhCms = true;

  const SEL = "[data-cms]";
  const originals = new Map();
  const changed = new Map();
  let saving = false;

  // ---- styles ------------------------------------------------------------
  const css = `
    body { padding-bottom: 84px !important; }
    [data-cms] { outline: 1px dashed rgba(230,51,18,0); outline-offset: 4px; transition: outline-color .12s; cursor: text; }
    [data-cms]:hover { outline-color: rgba(230,51,18,.45); }
    [data-cms]:focus { outline: 2px solid #e63312; outline-offset: 4px; }
    [data-cms][data-cms-changed] { box-shadow: inset 4px 0 0 #e63312; padding-left: 10px; }
    #dh-cms-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 99999;
      background: #0a0a0a; color: #f5f5f0; font: 13px/1.4 Inter, Helvetica, Arial, sans-serif;
      display: flex; align-items: center; gap: 16px; padding: 12px clamp(16px, 4vw, 40px);
      border-top: 2px solid #e63312; box-shadow: 0 -4px 24px rgba(0,0,0,.25);
      padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
    #dh-cms-bar .lab { font-weight: 900; letter-spacing: .08em; text-transform: uppercase; font-size: 11px; color: #e63312; white-space: nowrap; }
    #dh-cms-bar .lab span { color: #f5f5f0; }
    #dh-cms-bar .status { flex: 1; color: #aaa; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #dh-cms-bar .status.ok { color: #7ee2a8; } #dh-cms-bar .status.err { color: #ff8a73; }
    #dh-cms-bar button { font: inherit; font-weight: 700; border: 1px solid #444; background: transparent; color: #f5f5f0;
      padding: 8px 14px; cursor: pointer; border-radius: 0; white-space: nowrap; }
    #dh-cms-bar button:hover { border-color: #f5f5f0; }
    #dh-cms-bar button.save { background: #e63312; border-color: #e63312; }
    #dh-cms-bar button.save:hover { background: #f5f5f0; color: #0a0a0a; border-color: #f5f5f0; }
    #dh-cms-bar button:disabled { opacity: .4; cursor: default; }
    #dh-cms-bar button.vis.public { border-color: #7ee2a8; color: #7ee2a8; }
    #dh-cms-bar button.vis.confirm { border-color: #ffb36b; color: #ffb36b; }
    @media (max-width: 640px) { #dh-cms-bar .hint { display: none; } }
  `;
  const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  // ---- toolbar -----------------------------------------------------------
  const bar = document.createElement("div"); bar.id = "dh-cms-bar";
  bar.innerHTML = `
    <div class="lab">Editing <span>${location.hostname}</span></div>
    <div class="status"><span class="hint">Click any text to edit. </span><span class="n">No changes</span></div>
    <button type="button" class="vis" title="Who can see the site">Site: …</button>
    <button type="button" class="discard" disabled>Discard</button>
    <button type="button" class="save" disabled>Save</button>
    <button type="button" class="exit">Exit editor</button>`;
  document.body.appendChild(bar);
  const $ = (s) => bar.querySelector(s);
  const statusEl = $(".status"), saveBtn = $(".save"), discardBtn = $(".discard");

  function setStatus(msg, cls) { statusEl.className = "status " + (cls || ""); statusEl.textContent = msg; }
  function resetStatus() { statusEl.className = "status"; statusEl.innerHTML = '<span class="hint">Click any text to edit. </span><span class="n"></span>'; refresh(); }

  // POST to the editor API; resolves with the JSON body, rejects with a readable message.
  async function api(payload) {
    const r = await fetch("/api/cms/save", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || !data.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }

  // Two-click confirmation: arm(btn) puts a button into a 5s "click again" state;
  // callers check isArmed(btn) on the next click.
  function arm(btn, label) {
    const restore = btn.textContent;
    btn.classList.add("confirm"); btn.textContent = label;
    btn._disarm = setTimeout(() => { btn.classList.remove("confirm"); btn.textContent = restore; }, 5000);
  }
  function isArmed(btn) {
    if (!btn.classList.contains("confirm")) return false;
    clearTimeout(btn._disarm); btn.classList.remove("confirm"); return true;
  }

  // ---- make blocks editable ---------------------------------------------
  const norm = (h) => h.replace(/\s+/g, " ").trim();
  document.querySelectorAll(SEL).forEach((el) => {
    originals.set(el.dataset.cms, el.innerHTML);
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
    el.addEventListener("input", () => {
      const id = el.dataset.cms;
      if (norm(el.innerHTML) !== norm(originals.get(id))) { changed.set(id, el); el.setAttribute("data-cms-changed", ""); }
      else { changed.delete(id); el.removeAttribute("data-cms-changed"); }
      refresh();
    });
    el.addEventListener("keydown", (e) => {
      // execCommand is deprecated but remains the only cross-browser way to insert into a
      // contenteditable while keeping the browser's undo stack intact.
      if (e.key === "Enter") { e.preventDefault(); document.execCommand("insertLineBreak"); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    });
    el.addEventListener("paste", (e) => {
      e.preventDefault();
      document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
    });
  });

  // Don't follow links while clicking into text that lives inside one (project cards).
  document.addEventListener("click", (e) => {
    const block = e.target.closest(SEL);
    if (block && (e.target.closest("a") || block.closest("a"))) { e.preventDefault(); block.focus(); }
  }, true);

  window.addEventListener("beforeunload", (e) => { if (changed.size) { e.preventDefault(); e.returnValue = ""; } });

  // ---- actions -----------------------------------------------------------
  discardBtn.addEventListener("click", () => {
    changed.forEach((el, id) => { el.innerHTML = originals.get(id); el.removeAttribute("data-cms-changed"); });
    changed.clear(); resetStatus();
  });
  const exitBtn = $(".exit");
  exitBtn.addEventListener("click", () => {
    if (changed.size && !isArmed(exitBtn)) { arm(exitBtn, "Leave without saving?"); return; }
    changed.clear(); location.href = "/edit?exit=1";
  });
  saveBtn.addEventListener("click", save);

  // ---- visibility switch ---------------------------------------------------
  const visBtn = $(".vis");
  let isPublic = null;
  function paintVis() {
    visBtn.classList.remove("confirm");
    visBtn.classList.toggle("public", isPublic === true);
    visBtn.textContent = isPublic === null ? "Site: ?" : (isPublic ? "Site: PUBLIC" : "Site: private");
    visBtn.title = isPublic ? "Anyone with the link can view. Click to lock it behind the password."
                            : "Visitors need the password. Click to open the site to everyone.";
  }
  fetch("/public.json", { cache: "no-store" }).then((r) => r.json())
    .then((c) => { isPublic = c.public === true; }).catch(() => {}).finally(paintVis);
  visBtn.addEventListener("click", async () => {
    if (isPublic === null) return;
    if (!isArmed(visBtn)) { arm(visBtn, isPublic ? "Lock site? click again" : "Open to everyone? click again"); return; }
    const target = !isPublic;
    visBtn.disabled = true; visBtn.textContent = "Switching…";
    try {
      const data = await api({ action: "set-visibility", public: target });
      isPublic = target;
      setStatus(target
        ? `Site is opening to everyone (commit ${data.commit}). Live in about a minute. Search engines are told not to index it.`
        : `Site is locking behind the password (commit ${data.commit}). Live in about a minute.`, "ok");
    } catch (err) { setStatus(`Couldn't switch visibility: ${err.message}`, "err"); }
    finally { visBtn.disabled = false; paintVis(); }
  });

  async function save() {
    if (!changed.size || saving) return;
    saving = true; refresh(); setStatus("Saving to GitHub…");
    const changes = {};
    changed.forEach((el, id) => { changes[id] = el.innerHTML; });
    try {
      const data = await api({ path: location.pathname, changes });
      changed.forEach((el, id) => { originals.set(id, el.innerHTML); el.removeAttribute("data-cms-changed"); });
      changed.clear();
      setStatus(`Saved (commit ${data.commit}). Cloudflare is rebuilding — live in about a minute. Keep editing or exit.`, "ok");
    } catch (err) {
      setStatus(`Save failed: ${err.message}`, "err");
    } finally { saving = false; refresh(); }
  }

  refresh();
})();
