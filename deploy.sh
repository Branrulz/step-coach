#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (served at https://branrulz.github.io/step-coach/).
set -euo pipefail
cd "$(dirname "$0")"
npm run build
touch dist/.nojekyll
remote=$(git remote get-url origin)
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C .. config user.name)" -c user.email="$(git -C .. config user.email)" \
  commit -q -m "Deploy $(git -C .. rev-parse --short HEAD)"
git push -q -f "$remote" gh-pages
rm -rf .git
echo "Deployed to https://branrulz.github.io/step-coach/"
