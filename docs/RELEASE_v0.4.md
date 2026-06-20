# KIA Stick v0.4 Release Notes

KIA Stick v0.4 is a laptop-only, fake-doc MVP for testing citation-first chat, source hierarchy, and private-vault governance concepts without touching real APWU, USPS, member, local, steward, or case documents.

## Release Identity

- Product version: `0.4.0`
- Release track: fake-only local MVP
- Provider: `local-fake-deterministic`
- Build identity: exposed through `displayVersion` as `productVersion-channel.buildDate+gitSha`
- Current accepted implementation baseline: `ac6f418`
- Current closeout baseline: `4d96e83`

## Highlights

- True multi-turn threaded chat with chronological user and KIA Stick messages.
- Composer starts empty, uses `Send`, clears after send, blocks blank sends, and preserves prior turns.
- Contextual fake follow-ups resolve against prior thread context for evidence, verbal denial, supervisor wording, and next steps.
- Per-answer Save controls preserve saved-answer dedupe and duplicate feedback.
- Full packet details and citations stay collapsed by default per assistant message.
- Sources remain grouped by Local, State/Area, National, Manuals/Handbooks, Arbitration/Settlements, Steward Notes/Evidence, and Unknown.
- Fake Vault workflow surfaces remain mock metadata only: quarantine, redaction review, metadata review, index eligibility, and audit export.
- `/health`, `/version`, app header, settings, answer footer, and saved-answer metadata expose build identity.

## v0.4.1 Polish

- Cleaner chat spacing and turn labels for easier scanning of prior turns.
- Clearer `New fake chat`, `Send`, and `Save to Saved` controls.
- Save feedback now distinguishes fake-thread saves and unchanged duplicate saves.
- Settings includes an “About this fake MVP” panel explaining local deterministic fake-doc mode.
- Mobile composer spacing remains separated from the bottom navigation.

## Validation

Release validation should pass:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run qa`
- `npm run scan:fake`
- `npm run scan:privacy`
- Manifest JSON parse
- Forbidden tracked-path check for private folders
- Local `/health` and `/version` smoke checks

Known non-failing warnings:

- Vitest may print the Vite CJS API deprecation notice.
- Next build may print the flat-ESLint plugin warning.

## Safety Boundary

This release is fake-doc/fake-metadata only. It does not read, list, copy, scan, OCR, ingest, summarize, transform, upload, index, or commit real APWU, USPS, member, local, steward, case, private-vault, or account/session data.

The following remain out of scope unless separately authorized in a future phase:

- `/media/mint/SHARED/APWU`
- `~/kia-stick-private-vault`
- Real-document ingestion
- Real indexing or vector stores
- Cloud/API calls
- Pushes, service changes, cron/systemd/tmux, Caddy, DNS, Discord, SSH, or NUC work

## Next Safe Phase

Recommended next phase: `KIA-Stick-v0.4.1-release-review`.

That phase should remain fake-doc/fake-metadata-only and focus on release review, screenshots, docs, and GitHub-safe publication checks.
