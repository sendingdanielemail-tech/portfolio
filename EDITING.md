# Editing dhennessy.xyz yourself

Everything on the live site is in this folder. Change a file, run one command, it's live. The password gate stays on through every deploy.

## The 3-step loop

1. **Open the folder in VS Code**: drag `site/` onto the VS Code icon, or in VS Code use File → Open Folder → `Desktop/Projects/Portfolio/site`.
2. **Edit and preview**: open any page, right-click in the editor → **Show Preview** (Live Preview extension, installed). Or click the **Go Live**-style preview button at the bottom-right. The preview updates as you type. The preview never asks for the password; the gate only runs on Cloudflare.
3. **Deploy**: in VS Code, **Terminal → Run Task → Deploy to dhennessy.xyz**, type a short note about what you changed, hit Enter. Or in any terminal:
   ```
   cd ~/Desktop/Projects/Portfolio/site && ./deploy.sh "Tightened grocery intro"
   ```
   It saves to git, pushes to GitHub, and publishes to Cloudflare. ~30 seconds. Hard-refresh the live page if you still see old copy.

## Which file is which page

| Live URL | File |
|---|---|
| dhennessy.xyz | `index.html` (home: headline + 6 project cards) |
| dhennessy.xyz/about | `about.html` (bio, experience timeline, how I work) |
| dhennessy.xyz/work/adas | `work/adas.html` |
| dhennessy.xyz/work/inspections | `work/inspections.html` |
| dhennessy.xyz/work/roll-aways | `work/roll-aways.html` |
| dhennessy.xyz/work/grocery | `work/grocery.html` |
| dhennessy.xyz/work/vibe-coding | `work/vibe-coding.html` |
| dhennessy.xyz/work/five-smart-friends | `work/five-smart-friends.html` |

Each page is one self-contained file. Copy starts after the `<body>` tag, roughly the bottom third of the file. Use **Cmd+F** to jump to a phrase you want to change.

## What's safe to edit

Change the words **between** tags. Leave the tags and their `class="..."` alone.

| You'll see | What it is | Edit the text between the tags? |
|---|---|---|
| `<h1>…</h1>` | Page title | Yes |
| `<p class="lede">…</p>` | Intro paragraph under the title | Yes |
| `<div class="section-label">…</div>` | Small red label (Situation, Action, Testing, Results) | Yes |
| `<h2>…</h2>` / `<h3>…</h3>` | Section headlines | Yes |
| `<p>…</p>` | Body paragraphs | Yes |
| `class="pull-quote"` (a `<blockquote>` or `<div>`) | Pull quote | Yes |
| `<span class="pq-attribution">…</span>` | Who said the quote | Yes |
| `<div class="number-lg">…</div>` | Big stat number | Yes |
| `<div class="stat-label">…</div>` | Small red label under a stat | Yes |
| `<div class="img-label">…</div>` | Image caption | Yes |
| `<title>…</title>` and `<meta … content="…">` near the top | Browser tab title and link preview text | Yes, keep it short |

Also safe: `alt="…"` text on images.

## What to leave alone

- Anything inside `<style>…</style>` (top of each file). That's the design system.
- Anything inside `<script>…</script>`.
- `class="…"`, `id="…"`, `href="…"`, `src="…"` attributes.
- The `functions/` folder. That's the password gate.
- `assets/` filenames. Pages reference them by exact name.

## Handy HTML inside copy

| Want | Type |
|---|---|
| New paragraph | Wrap it: `<p>Your text.</p>` |
| Emphasis | `<strong>bold</strong>` or `<em>italic</em>` |
| Link | `<a href="https://…">link text</a>` |
| Line break inside a paragraph | `<br>` |
| Em dash | `&mdash;` or just paste — |
| Curly apostrophe | `&rsquo;` or just paste ’ |

If a page suddenly looks broken in preview, you probably deleted a closing tag like `</p>` or `</div>`. Cmd+Z until it looks right again.

## Adding a new image

1. Drop the file into the matching folder under `assets/` (e.g. `assets/grocery/`).
2. Copy an existing `<img …>` line on that page and change the `src` filename and `alt` text.
3. Keep file names lowercase with hyphens, no spaces.

## The password gate

- The gate is `functions/_middleware.js`. It deploys with the site every time. You never need to touch it.
- The password itself is **not in any file here**. It lives in Cloudflare → Workers & Pages → portfolio → Settings → Variables and secrets → `SITE_PASSWORD`. Your note with the password is `../***portfolio-pw.rtf`.
- To change the password: edit `SITE_PASSWORD` in Cloudflare and save. No deploy needed. Everyone gets logged out and needs the new one.
- To take the gate off: delete `functions/_middleware.js` and deploy. (Or ask Claude.)
- If the password is ever missing from Cloudflare, the site shows "Site locked" instead of opening to the public.

## If something goes wrong

- **Deploy says GitHub push failed**: the site still published. Ask Claude to refresh the GitHub token.
- **Deploy says Cloudflare publish failed**: run `wrangler login` in a terminal, then re-run the deploy.
- **Want to undo the last deploy**: `git revert HEAD --no-edit && ./deploy.sh "Undo"` in the `site/` folder, or ask Claude.
- **Want to see what changed**: `git log --oneline` in the `site/` folder.
