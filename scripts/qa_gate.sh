#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PHASE="${PHASE:-KIA-Stick-v0.1-mobile-ui-manual-qa-fix}"
PROOF_DIR="${PROOF_DIR:-/tmp/proof_kia_stick_v01_ui_fix_$(date -u +%Y%m%dT%H%M%SZ)}"
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
run_step 08_fake_banner_grep grep -R "FAKE SAMPLE DOCUMENT" content/fake-docs data/fake-corpus.json

git status --short --branch >"$PROOF_DIR/git_status_after.log" 2>&1 || true
git diff --stat >"$PROOF_DIR/git_diff_stat.log" 2>&1 || true
git ls-files >"$PROOF_DIR/git_ls_files.log" 2>&1 || true
git ls-files --cached --others --exclude-standard | sort >"$PROOF_DIR/files_after.log"

cat >"$PROOF_DIR/RESULT.md" <<RESULT
# KIA Stick v0.1 Manual QA UI Fix Result

- Phase: $PHASE
- Target machine: USER_LAPTOP_ONLY
- Target repo: $ROOT
- Provider: local-fake-deterministic
- Proof directory: $PROOF_DIR
- QA status: PASS
- Commands: generate corpus, lint, typecheck, test, build, fake-doc scan, privacy scan, fake banner grep
- Cloud/API keys required: no
- Secrets printed: no
- Push performed: no
- Real DB boundary: /media/mint/SHARED/APWU intentionally untouched

## Manual QA Checklist

- Chat view opens on mobile-sized viewport.
- Bottom nav shows Chat, Sources, Saved, Upload, Settings.
- Mode, Scope, and Detail selectors are visible.
- Annual leave prompt returns controlling citations and version footer.
- Steward request prompt separates MOU/joint interpretation from controlling sources.
- Step 1 evidence prompt shows evidence checklist and no-answer behavior when controlling language is absent.
- Attendance/sleeping bathroom prompt separates persuasive authority, evidence, and notes.
- One-click lunch prompt disables best guess for unverified source.
- Saved answer persists in local storage.
- Upload intake queues fake review item only and does not persist files server-side.
- /health returns version payload.
- /version displays app/corpus/index/prompt/provider versions.
RESULT

echo "$PROOF_DIR"
