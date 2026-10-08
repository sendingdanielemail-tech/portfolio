#!/bin/bash
# One-command deploy for dhennessy.xyz
#
#   ./deploy.sh "what I changed"
#
# 1. Commits every change in this folder to git
# 2. Pushes to GitHub — Cloudflare Pages is connected to the repo and
#    rebuilds the live site from it automatically (~1 minute)
# 3. Only if the push fails: publishes directly with wrangler as a fallback
#
# The password gate ships with every deploy because it lives in
# functions/_middleware.js. The password itself is a Cloudflare secret and
# is never touched by this script.

set -u
cd "$(dirname "$0")"

MSG="${1:-Update site copy}"
PROJECT="portfolio"

echo "→ Checking for changes..."
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "  Nothing changed since the last deploy. Nothing to do."
  exit 0
fi

echo "→ Saving changes to git: \"$MSG\""
git add -A
git commit -q -m "$MSG" || { echo "✗ Commit failed."; exit 1; }

echo "→ Pushing to GitHub (this is the deploy)..."
if git push -q origin main; then
  echo
  echo "✓ Pushed. Cloudflare is rebuilding dhennessy.xyz from GitHub now."
  echo "  Give it about a minute, then hard-refresh the page (Cmd+Shift+R)."
  exit 0
fi

echo "⚠  GitHub push failed (usually an expired token). Trying a direct publish instead..."
if wrangler pages deploy . --project-name="$PROJECT" --branch=main --commit-dirty=true; then
  echo
  echo "✓ Live at https://dhennessy.xyz via direct publish."
  echo "⚠  GitHub is now BEHIND the live site. Ask Claude to fix the GitHub token,"
  echo "   then run ./deploy.sh again so the two match."
else
  echo "✗ Both GitHub push and direct publish failed. Your change is saved in git."
  echo "  Ask Claude to fix the GitHub token (or run: wrangler login) and retry."
  exit 1
fi
