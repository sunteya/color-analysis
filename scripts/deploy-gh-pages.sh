#!/usr/bin/env bash
set -e

# Determine repo name from origin and compute base
repo=$(basename -s .git "$(git remote get-url origin 2>/dev/null || echo '')")
if [[ -z "$repo" ]]; then
  echo "Cannot determine repository name from 'origin'." >&2
  exit 1
fi

if [[ "$repo" == *.github.io ]]; then
  base="/"
else
  base="/$repo/"
fi

echo "Building with base: $base"
pnpm exec vite build --base "$base"

cp dist/index.html dist/404.html
touch dist/.nojekyll

# Publish from dist without switching branches
remote_url=$(git remote get-url origin 2>/dev/null || echo '')
if [[ -z "$remote_url" ]]; then
  echo "Cannot determine remote 'origin' URL." >&2
  exit 1
fi

( \
  cd dist && \
  rm -rf .git && \
  git init && \
  git add -A && \
  git -c user.name="deploy" -c user.email="deploy@local" commit -m "deploy: $(date -u +'%Y-%m-%dT%H:%M:%SZ')" && \
  git branch -M gh-pages && \
  git remote add origin "$remote_url" && \
  git push -f origin gh-pages \
)


