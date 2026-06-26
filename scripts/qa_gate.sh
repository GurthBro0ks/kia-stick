#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

feature_phase() {
  node -e "const fs=require('fs'); const f=JSON.parse(fs.readFileSync('feature_list.json','utf8')); process.stdout.write(f.phase || 'KIA-Stick-unknown-phase');"
}

proof_slug() {
  node -e "const value=process.argv[1] || 'KIA-Stick-unknown-phase'; process.stdout.write(value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));" "$1"
}

PHASE="${PHASE:-$(feature_phase)}"
PROOF_DIR="${PROOF_DIR:-/tmp/proof_$(proof_slug "$PHASE")_$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$PROOF_DIR"

run_step() {
  local name="$1"
  shift
  {
    echo "$ $*"
    "$@"
  } >"$PROOF_DIR/${name}.log" 2>&1
}

git status --short --branch >"$PROOF_DIR/git_status_before.log" 2>&1 || true
git ls-files --cached --others --exclude-standard | sort >"$PROOF_DIR/files_before.log"

run_step 01_generate_corpus npm run generate:corpus
run_step 02_lint npm run lint
run_step 03_typecheck npm run typecheck
run_step 04_test npm run test
run_step 05_build npm run build
run_step 06_fake_doc_scan npm run scan:fake
run_step 07_privacy_scan npm run scan:privacy
run_step 08_release_check npm run release:check
run_step 09_fake_banner_grep grep -R "FAKE SAMPLE DOCUMENT" content/fake-docs data/fake-corpus.json

git status --short --branch >"$PROOF_DIR/git_status_after.log" 2>&1 || true
git diff --stat >"$PROOF_DIR/git_diff_stat.log" 2>&1 || true
git ls-files >"$PROOF_DIR/git_ls_files.log" 2>&1 || true
git ls-files --cached --others --exclude-standard | sort >"$PROOF_DIR/files_after.log"

cat >"$PROOF_DIR/RESULT.md" <<RESULT
# KIA Stick QA Result

- Phase: $PHASE
- Target machine: USER_LAPTOP_ONLY
- Target repo: $ROOT
- Provider: local-fake-deterministic
- Proof directory: $PROOF_DIR
- QA status: PASS
- Commands: generate corpus, lint, typecheck, test, build, fake-doc scan, privacy scan, release readiness check, fake banner grep
- Cloud/API keys required: no
- Secrets printed: no
- Push performed: no
- Real DB boundary: real-doc source mount intentionally untouched

## Manual QA Checklist

- Review Chat, Sources, Saved, Upload, Import, Vault, Settings, /version, and /health.
- Confirm fake-only language is clear and does not imply real document intake.
- Confirm Upload remains fake metadata only and opens no file chooser.
- Confirm Import says no real import path exists.
- Confirm Vault blocks real docs, OCR, source text, uploads, and indexing.
- Confirm mobile bottom nav remains readable with Chat, Sources, Saved, Upload, Vault, Import, and Settings.
- Confirm proof index/review docs remain accurate when proof metadata changes.
- Confirm real-doc gate planning is docs/tests/checklists only.
- Confirm queue-015 remains blocked.
RESULT

echo "$PROOF_DIR"
