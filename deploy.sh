#!/bin/bash
# One-command deploy for dhennessy.xyz
#
#   ./deploy.sh "what I changed"
#
# 1. Commits every change in this folder to git
# 2. Pushes to GitHub (keeps the repo in sync with the live site)
# 3. Publishes straight to Cloudflare Pages (production, main branch)
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

echo "→ Pushing to GitHub..."
if ! git push -q origin main; then
  echo "⚠  GitHub push failed (usually an expired token)."
  echo "   The site will still be published below, but GitHub is now behind."
  echo "   Ask Claude to fix the GitHub token before the next deploy."
fi

echo "→ Publishing to Cloudflare Pages..."
if wrangler pages deploy . --project-name="$PROJECT" --branch=main --commit-dirty=true; then
  echo
  echo "✓ Live at https://dhennessy.xyz  (hard-refresh if you see the old copy)"
else
  echo "✗ Cloudflare publish failed. The change is saved in git; re-run ./deploy.sh to retry."
  exit 1
fi
