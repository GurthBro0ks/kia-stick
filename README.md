# KIA Stick v0.4

Laptop-only fake-doc PWA for testing citation-first governance, source hierarchy, and hardened fake-vault review workflow scaffolding.

## Version Identity

KIA Stick separates milestone semver from build identity:

- `productVersion` changes slowly at planned milestone phases, for example `0.4.0`.
- `displayVersion` changes per build as `productVersion-channel.buildDate+gitSha`, for example `0.4.0-dev.20260620+c33c049`.
- `corpusVersion`, `indexVersion`, and `promptVersion` stay separate from the app build version.

`/health`, `/version`, the app header, settings, answer footer, and saved answer metadata expose the current `displayVersion`.

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
