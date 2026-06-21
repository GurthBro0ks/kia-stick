# KIA Stick v0.4

Laptop-only fake-doc PWA for testing citation-first governance, source hierarchy, and hardened fake-vault review workflow scaffolding.

## Version Identity

KIA Stick separates milestone semver from build identity:

- `productVersion` changes slowly at planned milestone phases, for example `0.4.0`.
- `displayVersion` changes per build as `productVersion-channel.buildDate+gitSha`, for example `0.4.0-dev.20260620+c33c049`.
- `corpusVersion`, `indexVersion`, and `promptVersion` stay separate from the app build version.

`/health`, `/version`, the app header, settings, answer footer, and saved answer metadata expose the current `displayVersion`.

## v0.6.5 Local-Only Redaction Policy Plan

Phase: `KIA-Stick-v0.6.5-local-redaction-policy-plan`.

`docs/v0.6-local-redaction-policy-plan.md` plans the local-only redaction review policy for any future one-document real-doc pilot. It defines redaction categories (member identifiers, employee IDs, contact info, case facts, medical, discipline, settlement, witnesses, screenshots/images, management/officer names, dates, locations, installation data, grievance IDs, signatures, account/session/device data, and metadata), PASS/WARN/FAIL handling, reviewer roles, escalation rules, default-deny and not-indexable behavior, deletion/retention rules, and GitHub-safe proof rules.

This policy plan alone does **not** authorize real detection, real redaction, or implementation. Any later prompt must separately name exactly one gate and exactly one document, still pass `docs/v0.6-real-doc-safety-checklist.md`, and present a completed, signed packet from `docs/v0.6-operator-approval-packet.md`.

This is **PLAN ONLY**. It does not add file pickers, path readers, file reads, copying, OCR, text extraction, summarization, transforms, detection over real content, real redaction, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, pushes, or real-document access.

`queue-008-operator-approval-packet` is accepted after the pushed v0.6.4 baseline `8ae4dd0` was verified; `queue-009-local-redaction-policy-plan` is `needs_review` for operator review.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.6.4 Operator Approval Packet

Phase: `KIA-Stick-v0.6.4-operator-approval-packet`.

`docs/v0.6-operator-approval-packet.md` is a copy-ready operator approval packet template for any future one-document real-doc pilot. It requires the operator to fill in the exact phase, one-document scope, allowed actions, blocked actions, rollback, deletion/retention, GitHub-safe proof, and a signed/dated operator signature block. It includes a PASS/WARN/FAIL approval gate checklist, do-not-proceed blockers before any content touch, GitHub-safe proof rules, and a copy-ready template.

A completed and signed packet, by itself, does **not** authorize implementation. Any later implementation prompt must separately name exactly one gate and exactly one document, and must still pass `docs/v0.6-real-doc-safety-checklist.md`.

This is **PLAN ONLY**. It does not add file pickers, path readers, file reads, copying, OCR, text extraction, summarization, transforms, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, pushes, or real-document access.

`queue-007-fake-only-pilot-simulator` is accepted after the pushed v0.6.3 baseline `bc8c9df` was verified; `queue-008-operator-approval-packet` is `needs_review` for operator review.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.6.3 Fake-Only Pilot Simulator

Phase: `KIA-Stick-v0.6.3-fake-only-pilot-simulator`.

`lib/fakePilotSimulatorModel.ts` implements a synthetic-only simulator for the future one-document pilot gate flow. It covers operator approval, source scope, non-recursive confirmation, quarantine label, provenance label, redaction review, metadata review, index eligibility, audit, rollback, and retention/deletion decisions using only synthetic IDs, labels, counts, booleans, and PASS/WARN/FAIL results.

Simulator proof export includes GitHub-safe guard fields proving no private paths, filenames, snippets, OCR text, hash values, identifiers, exports, vector data, private notes, upload handlers, file inputs, real-document access, or real pilot implementation are included.

This is **FAKE ONLY**. It does not add file pickers, path readers, file reads, copying, OCR, text extraction, summarization, transforms, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, pushes, or real-document access.

Validation passed with proof at `/tmp/proof_kia_stick_v063_fake_pilot_sim_20260621T163640Z` and phase-runner self-test proof at `/tmp/proof_kia_stick_v0_6_3_fake_pilot_simulator_self_test_20260621T163950Z`. `queue-007-fake-only-pilot-simulator` is `needs_review` for operator review.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.6.2 Real-Doc Safety Review Checklist

Phase: `KIA-Stick-v0.6.2-safety-review-checklist`.

`docs/v0.6-real-doc-safety-checklist.md` defines the operator review checklist required before any later real-doc pilot can touch content. It covers operator approval, source scope, single-document limit, non-recursive rule, quarantine destination, hash/provenance handling, redaction review, metadata review, index eligibility, audit, rollback, deletion/retention, stop conditions, PASS/WARN/FAIL gates, and GitHub-safe proof exclusions.

This is **PLAN ONLY**. It does not add file pickers, path readers, file reads, copying, OCR, text extraction, summarization, transforms, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, pushes, or real-document access.

Validation passed with proof at `/tmp/proof_kia_stick_v062_safety_checklist_20260621T161513Z` and phase-runner self-test proof at `/tmp/proof_kia_stick_v0_6_2_safety_checklist_self_test_20260621T161902Z`. `queue-006-safety-review-checklist` is `needs_review` for operator review.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.6.1 Post-Plan Safety Closeout

Phase: `KIA-Stick-v0.6.1-post-plan-safety-closeout`.

This docs/test/state closeout accepts the pushed v0.6.0 real-doc pilot plan at `5454e3d` after confirming the plan is still **PLAN ONLY** and does not approve real-document implementation. The pushed v0.6.1 closeout state is recorded at `7b2d5b4`.

`docs/phase-backlog.json` now advances the next safe work into planning and simulator tasks only: safety review checklist, fake-only pilot simulator, operator approval packet, local-only redaction policy plan, and future implementation gate draft.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`. No file pickers, path readers, file reads, copying, OCR, text extraction, summarization, transforms, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, pushes, or real-document access are approved by this closeout.

## v0.6.0 Real-Doc Pilot Plan

Phase: `KIA-Stick-v0.6.0-real-doc-pilot-plan-only`.

`docs/v0.6-real-doc-pilot-plan.md` defines the safest future single-document pilot workflow with explicit operator approval gates, stop conditions, quarantine copy rules, hashing/provenance handling, redaction review, metadata review, index eligibility, audit, rollback, retention, and GitHub-safe proof rules.

This is **PLAN ONLY**. It does not add file pickers, path readers, file reads, copying, OCR, text extraction, summarization, transforms, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, pushes, or real-document access.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`. A future real-doc implementation prompt must separately decide whether any product milestone bump is warranted.

## v0.5.10 Docs Release Pack

Phase: `KIA-Stick-v0.5.10-docs-release-pack`.

`docs/RELEASE_v0.5.md` is the GitHub-safe fake-only release pack for the current KIA Stick state. It covers the operator guide, safe real-document boundaries, queue workflow, proof workflow, closeout workflow, validation commands, explicit non-approvals, and the v0.5.1 through v0.5.10 changelog.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.5.9 Citation QA Fixtures

Phase: `KIA-Stick-v0.5.9-citation-qa-fixtures`.

`tests/fixtures/citationQaFixtures.ts` and `tests/citationQa.test.ts` add fake-only citation QA coverage for authority hierarchy order, no-answer citation integrity, conflict notes, duplicate citation dedupe, and source grouping.

The answer governor now orders fake citation candidates by the documented hierarchy before rendering citations: local, state/area, national, manuals/handbooks, arbitration/settlements, steward notes/evidence, and unknown. Duplicate fake documents and citations are collapsed by stable id. Unverified fake material can still appear in related sections for follow-up context, but it is not promoted into citable proof.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.5.8 Fake Redaction Metadata Depth

Phase: `KIA-Stick-v0.5.8-fake-redaction-metadata-depth`.

`lib/redactionMetadataModel.ts` defines shared fake-only redaction metadata for Import Wizard and Vault rows. Each synthetic finding has category, severity, reviewer note, confidence, reason, safe example label, and index eligibility impact.

Deterministic fake review outcomes are `approve_redaction`, `needs_more_redaction`, `reject_sensitive`, and `metadata_incomplete`. These outcomes are fixture guidance only: fake redaction metadata is not real redaction, not approval, and not indexing.

Import and Vault proof exports now include fake redaction metadata labels and guard fields proving no private paths, snippets, OCR text, real identifiers, or file content are included. Unsafe fake metadata is blocked or sanitized before export.

## v0.5.7 Closeout Helper Hardening

Phase: `KIA-Stick-v0.5.7-closeout-helper-hardening`.

`npm run closeout:review` reads the latest `/tmp/proof_kia_stick_*` proof, current git HEAD/origin state, worktree status, and local task queue state. It prints `PASS`, `WARN`, or `FAIL` with a concrete next action.

`npm run closeout:summary` prints compact final-response fields for operator copy/paste. The helper warns on missing proof, non-PASS proof results, WARN/FAIL text in `RESULT.md`, dirty worktrees, local commits not yet pushed, and queue items that are not `ready_to_push` or `accepted`.

Closeout summaries redact or flag private paths, file input markup, secrets-looking values, `/media/mint/SHARED/APWU`, and private-vault mentions. The helper never pushes and never edits queue status; it only prints a suggested `npm run queue:set` command when queue state needs operator action.

## v0.5.6 Local Task Queue

Phase: `KIA-Stick-v0.5.6-local-task-queue`.

`docs/phase-backlog.json` is a local fake-only phase backlog for grouping future work. It stores safe fields only: id, phase, title, status, model, risk, summary, next action, timestamps, and sanitized history.

`npm run queue:list` prints the backlog. `npm run queue:next` prints the first non-accepted item plus a compact Codex-ready summary. `npm run queue:set -- --id ID --status STATUS` updates status and history after rejecting private paths and secrets-looking values. Queue tooling never pushes.

## v0.5.5 Proof Index and Acceptance Helper

Phase: `KIA-Stick-v0.5.5-proof-index-and-acceptance-helper`.

`npm run proof:list` lists recent `/tmp/proof_kia_stick_*` proof directories with phase, result, timestamp, commit, pushed state, flags, and path.

`npm run proof:latest` prints the latest redacted `RESULT.md`, prints `push_command.txt` when present, and includes an acceptance helper that checks `RESULT=PASS`, clean/ahead git state, and WARN/FAIL text before printing the next action.

Proof summaries redact or flag private paths, file input markup, secrets-looking values, `/media/mint/SHARED/APWU`, and private-vault mentions. The helper never pushes; it only prints review guidance.

## v0.5.4 Local Phase Runner

Phase: `KIA-Stick-v0.5.4-local-phase-runner-proof-pack`.

`npm run phase:run -- --phase PHASE_NAME` creates `/tmp/proof_kia_stick_<sanitized_phase>_<UTC>`, logs git state and validation commands, writes `RESULT.md`, and prints the proof directory. It runs `release:check`, lint, typecheck, test, build, fake/privacy scans, QA, JSON parses, private tracked-path checks, no-file-input grep, and the APWU boundary grep.

Use `npm run phase:run -- --phase PHASE_NAME --commit` only after reviewing the phase scope. The runner commits safe task files only when validation passes and changes exist. It never pushes. When a local commit exists after PASS, it writes `push_command.txt` containing only the manual `git push` command.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.5.3 Release Readiness Automation

Phase: `KIA-Stick-v0.5.3-release-readiness-and-version-coherence-automation`.

`npm run release:check` verifies version coherence across `package.json`, `lib/version.ts`, `feature_list.json`, README, and CLOSEOUT. It fails on unallowlisted drift with a human-readable expected/actual diff.

Current product version remains `0.4.0`; current prompt version is `prompt.fake-docs.v0.5-import-wizard-hardening`. The intentional hold is documented in `feature_list.json`: `productVersion` stays `0.4.0` during v0.5.x fake import wizard and release-readiness phases until a planned product milestone explicitly approves a bump.

`npm run qa` now runs the release check after fake/privacy scans, and its default phase/proof directory comes from `feature_list.json`. `scripts/git_auto_sync.sh` derives its default local commit message from the same phase while keeping push disabled unless `KIA_ALLOW_PUSH=1`.

## Run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Validate

```bash
npm run qa
```

This MVP uses only fictional source documents under `content/fake-docs/`. Every fake source starts with:

`FAKE SAMPLE DOCUMENT — NOT REAL CONTRACT LANGUAGE — FOR KIA STICK TESTING ONLY`

`/media/mint/SHARED/APWU` is treated as real-document storage and is intentionally not read, copied, indexed, or scanned by this repo.

## v0.5.2 Fake Wizard State Machine Hardening

The fake Import Wizard state machine now has an explicit allowed-transition map and deterministic blocked reasons for high-risk jumps, including select-to-index, quarantine-to-index, detection-to-approval, redaction-to-index, and metadata-to-index/audit skips.

Fake audit and proof exports remain synthetic metadata only. Export guard flags state that private paths, file content, browser File objects, OCR text, snippets, uploads, vector-store data, and private notes are excluded. Proof JSON includes build identity, fake state flags, fake record metadata, sanitized fake audit events, and guard flags only.

Regression tests cover the full happy path, audit order, blocked jumps, real-file payload guards, tainted-audit proof sanitization, no file input, and Upload fake-button rendering.

## v0.5.1 Fake Import Wizard UI Scaffold

The `Import` tab implements the accepted v0.5 plan as a fake metadata scaffold only. It walks through:

- Start / safety.
- Source placeholder.
- Scope confirmation.
- Copy-to-quarantine confirmation.
- Provenance / hash receipt.
- Redaction detection preview.
- Admin redaction review.
- Metadata review.
- Index eligibility.
- Audit summary.

The scaffold uses fake IDs, counts, hashes, provenance, redaction categories, and proof IDs only. It has no real import code, no file picker, no path reader, no file reads, no copying, no OCR, no upload handling, no real indexing, and no private-vault inspection. Upload remains a fake metadata queue driven by buttons, not a browser file input.

The visible stop signs are: selecting a path is not import, quarantine is not indexable, redaction is not approval, and approval is not indexing.

## v0.5 Import Wizard Design Plan

`docs/v0.5-import-wizard-design-plan.md` defines a future real-document import wizard as a planning-only workflow. It does not add file pickers, path readers, copying, OCR, text extraction, indexing, uploads, or private-vault inspection.

The planned wizard separates every consent gate:

- Start / safety warning.
- Source path placeholder.
- Single-file or explicitly scoped batch confirmation.
- Copy-to-quarantine confirmation.
- Provenance and hash receipt.
- Redaction detection preview.
- Admin redaction review.
- Metadata review.
- Index eligibility decision.
- Audit summary.

The core UI rules remain: selecting a path is not import, quarantine is not indexable, redaction is not approval, and approval is not indexing.

## v0.4 Fake Vault Hardening

The Vault tab uses fake metadata fixtures only. It adds local mock surfaces for:

- Vault lane overview.
- Quarantine.
- Redaction Review.
- Metadata Review.
- Index Eligibility.
- Audit Log.

The scaffold models `selected -> quarantine -> hash/provenance -> redaction review -> metadata review -> index eligibility -> audit` without reading file bytes, inspecting private paths, OCR, uploads, real ingestion, or real indexing.

Explicit fake workflow states are:

- `not_indexable`
- `quarantine_only`
- `redaction_required`
- `metadata_required`
- `review_rejected`
- `eligible_fake_only`

Quarantine, redaction review, and metadata review are not index approval. Invalid gate transitions are blocked with visible reasons. The Audit Log can export JSON or Markdown containing fake metadata, audit events, and build identity only.

## v0.4 Manual QA UX Fixes

- Saved answers upsert by stable same-chat identity instead of creating duplicate cards.
- Duplicate unchanged saves show `Already saved. No new data.`
- Changed details or metadata replace the existing same-chat save.
- Chat citations are collapsed by default behind `Show citations (n)`.
- Settings keeps bottom navigation usable on mobile.
- Vault opens with plain-English guide mode; expert workflow details are behind `Show technical details`.

## v0.4 Conversational UX Rework

- Chat now opens with a user bubble and KIA Stick assistant bubble instead of a search-form-first layout.
- First answer view is compact: short answer, confidence/authority summary, and what to do next.
- Authority stack, conflicts, evidence checklist, missing facts, follow-ups, and citations stay collapsed behind `Show full packet` and `Show citations (n)`.
- Prompt shortcuts live behind `Prompt shortcuts` so they are optional.
- Sources are grouped by hierarchy: Local, State/Area, National, Manuals/Handbooks, Arbitration/Settlements, Steward Notes/Evidence, and Unknown.
- Saved-answer migration dedupes old localStorage entries and ignores timestamp/build identity for unchanged same-chat saves.
- `/version` includes a `Back to KIA Stick` link while preserving full build metadata.

## v0.4 Chat UX Dedupe Fix 2

- Saved-answer identity canonicalizes question, mode, scope, short answer, intent, and citation locators while ignoring timestamp, build/display version, Git SHA, and ordering noise.
- Legacy saved-answer migration collapses build/timestamp-only duplicates and keeps the newest safe metadata.
- Same unchanged saves keep saved count stable and show `Already saved. No new data.`
- Same-chat detail or metadata changes replace the existing saved card instead of creating a duplicate.
- The chat composer is message-first; response options and prompt shortcuts are collapsed secondary controls.
- Full packet sections are collapse-first: authority stack, conflicts, evidence checklist, missing facts, and follow-ups each stay behind a disclosure.
- `public/manifest.webmanifest` is valid JSON for browser manifest parsing.

## v0.4 Chat Layout Blocker Fix

- Chat layout is structured as messages, fixed composer, then fixed bottom nav.
- The message area is its own scroll pane and ends above the composer so response cards and expanded packets do not sit under fixed controls.
- The composer is fixed above the bottom nav, capped in height, and scrolls internally if secondary controls are opened.
- Bottom nav remains fixed and visually separate from the composer.
- The duplicate app manifest route was removed; `public/manifest.webmanifest` is the only manifest source.
- Saved-answer dedupe behavior from `541742e` remains covered.

## v0.4 True Threaded Chat

- Chat state now uses explicit `ConversationThread`, `UserMessage`, and `AssistantMessage` records with stable IDs.
- Submitted turns append chronologically instead of replacing the previous answer.
- The composer starts empty, says `Message KIA Stick...`, clears after send, and uses `Send`.
- Blank send is blocked, Enter sends, Shift+Enter inserts a newline, and double-send is blocked during generation.
- Recent fake-thread history is passed to the deterministic answer governor for follow-up context.
- Supported fake follow-ups include evidence, verbal denial, supervisor wording, and next steps.
- Unresolved follow-ups ask a clarifying question instead of inventing context.
- Current fake-thread persistence is separate from Saved Answers.
- Each assistant response owns its own Save, packet expansion, and citation expansion state.

## v0.4.1 Fake Chat Polish

- Message spacing and turn labels make prior fake-thread turns easier to scan.
- Chat controls read as `New fake chat`, `Send`, and `Save to Saved`.
- Save feedback distinguishes fake-thread saves from unchanged duplicate saves.
- Settings includes an “About this fake MVP” panel for local deterministic fake-doc mode.
- Product version remains `0.4.0`; build identity continues to change through `displayVersion`.
- GitHub-safe release notes live in `docs/RELEASE_v0.4.md`.
