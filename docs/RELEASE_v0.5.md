# KIA Stick v0.5 Fake-Only Release Pack

Phase: `KIA-Stick-v0.5.10-docs-release-pack`

KIA Stick v0.5 is a laptop-only, fake-doc and fake-metadata release track for citation-first answer governance, fake import/vault workflows, release-readiness automation, local proof packs, queue workflow, closeout review, redaction metadata fixtures, and citation QA. It is built for operator review and GitHub-safe publication without touching real APWU, USPS, member, local, steward, case, private-vault, upload, account, or session data.

Product version remains `0.4.0`. Build identity remains `productVersion-channel.buildDate+gitSha`, exposed through `/health`, `/version`, app header, settings, answer footers, and saved-answer metadata. Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## Current Fake-Only Features

- Deterministic local answer governor using the fake corpus under `content/fake-docs/`.
- Citation-first answer packets with source hierarchy, conflicts, evidence checklist, missing facts, follow-ups, and build metadata.
- Source hierarchy groups: local, state/area, national, manuals/handbooks, arbitration/settlements, steward notes/evidence, and unknown.
- True threaded fake chat with contextual follow-up handling and saved-answer dedupe.
- Fake Import Wizard scaffold with explicit blocked transitions and sanitized proof export.
- Fake Vault governance workflow with lifecycle states, blocked reasons, audit export, guide mode, and no real file handling.
- Fake redaction metadata model shared by Import Wizard and Vault rows.
- Citation QA fixtures for authority ordering, no-answer handling, conflict notes, source grouping, and duplicate citation dedupe.
- Release-readiness, proof, queue, phase-runner, and closeout helper scripts.

## Safe Boundaries

This release remains fake-doc/fake-metadata only. It does not read, list, copy, scan, OCR, ingest, summarize, transform, upload, index, open, import, select, or commit any real APWU, USPS, member, local, steward, case, private-vault, account, or session material.

The private real-document boundary remains out of scope: `/media/mint/SHARED/APWU` is not read, copied, indexed, or scanned by this repo. `~/kia-stick-private-vault` is not inspected.

## What Is Not Approved

This release does not approve:

- Real import code.
- Browser file pickers.
- Path readers.
- File reads, copies, uploads, OCR, text extraction, summarization, transforms, embeddings, or indexing.
- Real vector stores.
- Private-vault inspection.
- Cloud or external API calls.
- Secrets, tokens, cookies, auth headers, device IDs, account identifiers, or private-data commits.
- NUC, SSH, Discord, Caddy, DNS, cron, systemd, tmux, service changes, force push, reset hard, or git clean.
- Auto-push from scripts.

## Operator Quick Checklist

Start or inspect locally:

```bash
cd ~/kia-stick
npm install
npm run dev
```

Open `http://127.0.0.1:3000` for local browser review.

Run local QA:

```bash
cd ~/kia-stick
npm run qa
```

Review latest proof and closeout state:

```bash
cd ~/kia-stick
npm run proof:latest
npm run closeout:review
npm run closeout:summary
npm run queue:next
git status --short --branch
git log -3 --oneline --decorate
```

Manual push, only after operator approval and a clean expected state:

```bash
cd ~/kia-stick
git push origin main
```

## Validation Commands

The v0.5.10 docs release pack is expected to pass:

```bash
git status --short
test "$(git rev-parse --short origin/main)" = "c6bd17f"
npm run release:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run scan:fake
npm run scan:privacy
npm run qa
npm run phase:run -- --phase KIA-Stick-v0.5.10-docs-release-self-test
npm run proof:latest
npm run queue:next
npm run closeout:review
npm run closeout:summary
git ls-files 'DB/**' 'data/real-documents/**' 'exports/**' 'backups/**' 'vector-store/**'
grep -R "<input[^>]*type=[\"']file" app components lib tests scripts 2>/dev/null || true
grep -R "/media/mint/SHARED/APWU" docs README.md AGENTS.md CLOSEOUT.md claude-progress.md feature_list.json app components lib tests scripts 2>/dev/null || true
```

Known non-failing warnings:

- `npm run test` may print the Vite CJS API deprecation notice.
- `npm run build` may print the Next flat ESLint plugin warning.
- `closeout:review` may warn before manual push when a validated local commit is ahead of `origin/main`, or while the current queue item is still `needs_review`.

## Queue Workflow

- `npm run queue:list` prints the local fake-only backlog.
- `npm run queue:next` prints the first non-accepted queue item and a compact Codex-ready summary.
- `npm run queue:set -- --id ID --status STATUS --note NOTE` updates queue state and sanitized history.
- Queue tooling rejects private paths and secrets-looking text.
- Queue tooling never pushes.

Current v0.5.10 queue outcome:

- Record v0.5.9 pushed state at `c6bd17f`.
- `queue-003-citation-qa-fixtures` is accepted after pushed-state verification.
- `queue-004-docs-release-pack` is marked `needs_review` only after validation passes.
- `queue-005-real-doc-pilot-plan-only` remains planned and does not approve real-document work.

## Proof Workflow

- `npm run qa` writes a local proof directory with command logs and `RESULT.md`.
- `npm run phase:run -- --phase PHASE_NAME` writes a full proof pack under `/tmp/proof_kia_stick_<phase>_<UTC>`.
- `npm run proof:list` lists recent proof directories.
- `npm run proof:latest` prints the latest redacted proof result and acceptance helper.
- Proof tooling redacts or flags private paths, file input markup, secrets-looking values, private-vault mentions, and APWU boundary references.
- Proof tooling never pushes.

## Closeout Workflow

- `npm run closeout:review` checks latest proof result, current HEAD/origin state, worktree status, and queue state.
- `npm run closeout:summary` prints compact final-response fields for operator copy/paste.
- Closeout tooling is read-only against queue state; it prints suggested `queue:set` commands instead of mutating status.
- Closeout tooling never pushes.

## v0.5 Changelog

- v0.5.1: Added the fake Import Wizard UI scaffold with fake steps, fake proof export, blocked reasons, and no file picker.
- v0.5.2: Hardened fake wizard state transitions, blocked high-risk jumps, and expanded proof guard flags.
- v0.5.3: Added release-readiness and version-coherence automation, including intentional productVersion hold documentation.
- v0.5.4: Added local phase runner proof packs with validation logs, `RESULT.md`, optional safe local commit, and manual push command generation.
- v0.5.5: Added proof index and latest-proof acceptance helper.
- v0.5.6: Added local task queue with sanitized status history and no-push invariant.
- v0.5.7: Added closeout helper review and summary commands.
- v0.5.8: Added shared fake redaction metadata depth for Import Wizard and Vault proof exports.
- v0.5.9: Added fake citation QA fixtures and deterministic citation ordering/dedupe checks.
- v0.5.10: Added this docs release pack for operator guide, safe boundaries, queue workflow, proof workflow, closeout workflow, validation commands, and release notes.

## Release Decision

This release pack is GitHub-safe when validation passes and the operator approves the final local commit for manual push. Future real-document work requires a separate written phase that explicitly preserves the no-read, no-copy, no-OCR, no-indexing, no-upload, no-private-vault-inspection boundary until the operator authorizes otherwise.
