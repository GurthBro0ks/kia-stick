#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

feature_phase="$(node -e "const fs=require('fs'); const f=JSON.parse(fs.readFileSync('feature_list.json','utf8')); process.stdout.write(f.phase || 'KIA-Stick update');")"
default_commit_message="Record ${feature_phase}"

npm run scan:fake
npm run scan:privacy

git add \
  .env.example \
  .gitignore \
  AGENTS.md \
  README.md \
  app \
  components \
  content/fake-docs \
  data/fake-corpus.json \
  eslint.config.mjs \
  feature_list.json \
  init.sh \
  lib \
  next-env.d.ts \
  next.config.ts \
  package-lock.json \
  package.json \
  public \
  scripts \
  tests \
  tsconfig.json \
  vitest.config.ts \
  claude-progress.md

if git diff --cached --quiet; then
  echo "No staged safe changes to commit."
else
  git commit -m "${KIA_COMMIT_MESSAGE:-$default_commit_message}"
fi

if [[ "${KIA_ALLOW_PUSH:-0}" == "1" ]]; then
  git push
else
  echo "Push skipped. Set KIA_ALLOW_PUSH=1 only after explicit approval."
fi
