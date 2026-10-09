# Editing dhennessy.xyz yourself

The site is its own editor. Sign in to edit mode, click any text on any page, type, Save. No apps, no code.

## The loop

1. Go to **dhennessy.xyz/edit** and enter the **editor password** (it's in `***portfolio-pw.rtf`, the line marked "Editor"). This is a different password from the one visitors use.
2. Browse to any page. A black **Editing** bar sits at the bottom. Hover shows a dashed red outline around every editable block; click into one and type.
3. Click **Save** (or press Cmd+S). The bar says "Saved (commit …)". Cloudflare rebuilds the site from that commit in about a minute. Hard-refresh (Cmd+Shift+R) to see it live.
4. **Exit editor** when you're done. Edit mode also times out after 12 hours.

Unsaved changes show a red bar on their left edge and are counted in the toolbar. **Discard** puts everything back. Leaving the page with unsaved changes asks you to confirm.

## What you can edit

Every headline, paragraph, label, stat, caption, quote, card title and footer line on all 8 pages (401 blocks). Inline formatting survives: links, bold, italic. **Enter** inserts a line break inside the block. Paste comes in as plain text.

Things edit mode does not do (yet): add or remove whole sections, change images, change layout or colors. For those, ask Claude. Image files still live in `assets/` if you want to swap one by hand.

Tip: on the home page the card titles sit inside links. In edit mode, clicking a card edits it instead of opening it; use the top nav to move between pages.

## Opening the site to everyone (job-hunt windows)

The editing bar has a **Site: private / Site: PUBLIC** button.

1. Sign in at dhennessy.xyz/edit.
2. Click **Site: private**. It asks you to click again to confirm. Click it again.
3. About a minute later, anyone with the link can view the site with no password. The button turns green and reads **Site: PUBLIC**.
4. To close the window, click **Site: PUBLIC** twice. A minute later, visitors need the password again.

While the site is public, every page carries a "do not index" instruction for search engines, so a short open window doesn't leave Google copies behind. If you ever want it discoverable by search, ask Claude to lift that.

Edit mode itself always needs the editor password, public or not. If you flip the site back to private while in edit mode, the next page may ask for the visitor password; enter it and your editing session carries on.

Under the hood the button commits a one-line file, `public.json`, to GitHub. If the editor is ever unavailable, that file can be changed by hand and pushed: `{ "public": true }` opens, `{ "public": false }` locks.

## Where things live

| Live URL | File |
|---|---|
| dhennessy.xyz | `index.html` |
| dhennessy.xyz/about | `about.html` |
| dhennessy.xyz/work/adas | `work/adas.html` |
| dhennessy.xyz/work/inspections | `work/inspections.html` |
| dhennessy.xyz/work/roll-aways | `work/roll-aways.html` |
| dhennessy.xyz/work/grocery | `work/grocery.html` |
| dhennessy.xyz/work/vibe-coding | `work/vibe-coding.html` |
| dhennessy.xyz/work/five-smart-friends | `work/five-smart-friends.html` |

Every save is a git commit on GitHub (`sendingdanielemail-tech/portfolio`), so there's a full history and any edit can be undone.

## The two passwords

| | Where it's checked | Where it's stored | What it unlocks |
|---|---|---|---|
| **Site password** | every page | Cloudflare secret `SITE_PASSWORD` | viewing the site (share this one) |
| **Editor password** | dhennessy.xyz/edit | Cloudflare secret `EDIT_PASSWORD` | edit mode (never share) |

Both live in Cloudflare → Workers & Pages → **portfolio** → Settings → **Variables and secrets**. Change one there, save, done; no deploy needed. The editor also needs a `GITHUB_TOKEN` secret there so it can commit.

If the site password is ever missing from Cloudflare, the site shows "Site locked" rather than opening to the public.

## For bigger changes (or if you'd rather use a code editor)

The folder `~/Desktop/Projects/Portfolio/site` is the whole site. Edit any file in VS Code (Live Preview extension is installed for as-you-type preview), then run:

```
cd ~/Desktop/Projects/Portfolio/site && ./deploy.sh "what I changed"
```

or in VS Code: Terminal → Run Task → **Deploy to dhennessy.xyz**. It commits, pushes to GitHub, and Cloudflare rebuilds.

Leave alone: anything in `<style>` or `<script>`, `class=` / `data-cms=` attributes, the `functions/` folder (password gate + editor backend), `cms.js` (the editor), and `public.json` unless you mean to change visibility.

## If something goes wrong

- **"Editor not configured"** at /edit: the `EDIT_PASSWORD` secret isn't set in Cloudflare.
- **Save fails with "GITHUB_TOKEN"**: that secret is missing or expired in Cloudflare. Make a new fine-grained token at github.com → Settings → Developer settings → Fine-grained tokens (repo: portfolio, Contents: Read and write) and paste it into the secret.
- **Save fails with "Could not find block"**: the page changed underneath you. Reload and redo the edit.
- **Change isn't live after 2 minutes**: Cloudflare → Workers & Pages → portfolio → Deployments shows the build status.
- **Undo an edit**: ask Claude, or in the site folder run `git revert HEAD --no-edit && ./deploy.sh "Undo"`.
