# KIA Stick v0.4

Laptop-only fake-doc PWA for testing citation-first governance, source hierarchy, and hardened fake-vault review workflow scaffolding.

## Version Identity

KIA Stick separates milestone semver from build identity:

- `productVersion` changes slowly at planned milestone phases, for example `0.4.0`.
- `displayVersion` changes per build as `productVersion-channel.buildDate+gitSha`, for example `0.4.0-dev.20260620+c33c049`.
- `corpusVersion`, `indexVersion`, and `promptVersion` stay separate from the app build version.

`/health`, `/version`, the app header, settings, answer footer, and saved answer metadata expose the current `displayVersion`.

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
