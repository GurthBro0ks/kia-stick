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
