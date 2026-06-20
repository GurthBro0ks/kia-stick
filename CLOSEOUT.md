# KIA Stick Closeout

## v0.3 Build Identity Version System

- Phase: `KIA-Stick-v0.3-build-identity-version-system`
- Scope: product milestone semver plus per-build date/Git identity.
- Proof directory: `/tmp/proof_kia_stick_v03_build_identity_20260620T110445Z`
- Runtime display version format verified: `0.3.0-dev.20260620+<gitSha>`
- Runtime Git SHA source: current `git rev-parse --short HEAD` at request time, with `unknown` fallback.
- Manual QA: PASS for local `/health` and `/version` checks on `127.0.0.1:3005`.
- Provider: `local-fake-deterministic`
- Cloud/API required: no
- Secrets printed: no
- Push performed: no
- Real document boundary: `/media/mint/SHARED/APWU` untouched
- Private vault inspected: no

## v0.3 Build Identity Coverage

- Added `productVersion`, `channel`, `buildDate`, `gitSha`, and `displayVersion`.
- Kept `corpusVersion`, `indexVersion`, `promptVersion`, and `provider` separate from app build identity.
- `displayVersion` follows `productVersion-channel.buildDate+gitSha`, for example `0.3.0-dev.20260620+c33c049`.
- `buildDate` uses UTC `YYYYMMDD`.
- `gitSha` uses `git rev-parse --short HEAD` when available and falls back to `unknown`.
- `/health` exposes every version field at top level and inside `version`.
- `/version` shows `displayVersion` prominently and lists full metadata.
- App header, settings, answer footer, and saved answer metadata use `displayVersion`.
- Tests verify display-version format plus `/health` and `/version` fields.

## v0.3 Build Identity Known Warnings

- `next build` still prints Next's flat-ESLint plugin detection warning; lint, typecheck, test, build, and QA pass.
- `npm run test` prints the existing Vite CJS API deprecation notice.

## Next Safe Phase

Recommended next phase: `KIA-Stick-v0.3-build-identity-closeout-review` or `KIA-Stick-v0.4-fake-vault-workflow-hardening`.

Future phases remain fake-doc/fake-metadata-only unless separately authorized. No real-document reads, copies, scans, OCR, ingestion, summarization, transforms, indexing, uploads, or commits are approved by this version-system phase.

---

## v0.3 Implementation State

- Phase: `KIA-Stick-v0.3-private-vault-ui-scaffold`
- Scope: private-vault governance UI scaffold using fake metadata only.
- Proof directory: `/tmp/proof_kia_stick_v03_vault_ui_20260620T102553Z`
- Manual QA: PASS by local browser/CDP run on `127.0.0.1:3005`.
- Provider: `local-fake-deterministic`
- Cloud/API required: no
- Secrets printed: no
- Push performed: no
- Real document boundary: `/media/mint/SHARED/APWU` untouched
- Private vault inspected: no

## v0.3 Implemented Coverage

- Added fake metadata fixtures for every vault lane: `official_public`, `official_member_only`, `local_official`, `steward_only`, `redacted_examples`, `restricted_sensitive`, and `quarantine`.
- Added Vault tab with surfaces for Vault, Quarantine, Redaction Review, Metadata Review, Index Eligibility, and Audit Log.
- Added lifecycle state machine display for `selected -> quarantine -> hash/provenance -> redaction detection -> admin review -> approved redacted copy -> metadata -> index decision -> audit`.
- Added local mock actions that advance fake gate state or mark an item not indexable. These actions update browser local state only.
- Added warnings that quarantine/review does not mean indexable.
- Added visible private-path and GitHub-safe boundary notices.
- Added guard and tests for fake metadata only and no real file access.
- Existing Chat, Sources, Saved, Upload, Settings, `/health`, and `/version` behavior remains in place.

## v0.3 Known Warnings

- `next build` still prints Next's flat-ESLint plugin detection warning; lint, typecheck, test, build, and QA are expected to pass.
- `npm run test` prints the existing Vite CJS API deprecation notice.

## Next Safe Phase

Recommended next phase: `KIA-Stick-v0.3-manual-review-closeout` after operator UI QA, or `KIA-Stick-v0.4-fake-vault-workflow-hardening` if more fake-only workflow tests are needed.

Future phases remain fake-metadata-only unless separately authorized. No real-document reads, copies, scans, OCR, ingestion, summarization, transforms, indexing, or commits are approved by this scaffold.

---

## v0.2 Accepted State

- Phase: `KIA-Stick-v0.2-plan-closeout`
- Accepted scope: document-vault/redaction governance plan only.
- Accepted plan commit: `d496fd5`
- Accepted plan proof directory: `/tmp/proof_kia_stick_v02_doc_vault_plan_20260619T235153Z`
- Closeout proof directory: `/tmp/proof_kia_stick_v02_plan_closeout_20260620T024646Z`
- Manual QA: not applicable, planning-only.
- Provider: `local-fake-deterministic`
- Cloud/API required: no
- Secrets printed: no
- Push performed: no
- Real document boundary: `/media/mint/SHARED/APWU` untouched

## v0.2 Accepted Planning Coverage

- Planning-only status and explicit no-ingestion boundary.
- Document lanes: `official_public`, `official_member_only`, `local_official`, `steward_only`, `redacted_examples`, `restricted_sensitive`, and `quarantine`.
- Future gated lifecycle from operator selection through quarantine, provenance, redaction detection, admin review, approved redacted copy, authority metadata, index eligibility, and audit log.
- Redaction fields for member identifiers, contact details, employee IDs, medical, discipline, settlement, witness, screenshot, management/officer, date, installation, and case-ID data.
- Metadata model for authority, source status, sensitivity, redaction status, review state, index eligibility, hashes, reviewer, and audit reference.
- Index rules allowing only reviewed official docs, approved redacted examples, and reviewed steward notes while excluding quarantine, raw uploads, unreviewed sensitive docs, medical docs, screenshots, OCR dumps, and private exports.
- Ignored private layout for `DB/`, `data/real-documents/`, `data/quarantine/`, `data/redacted-approved/`, `exports/`, `backups/`, and `vector-store/`.
- Future UI surfaces for Vault, Quarantine, Redaction Review, Metadata Review, Index Eligibility, and Audit Log.
- GitHub-safe proof and commit rules.
- Acceptance checklist for any future real-document phase.

## v0.2 Known Warnings

- `next build` still prints Next's flat-ESLint plugin detection warning; lint, typecheck, test, build, and QA pass.
- `npm audit` advisories from the existing Next dependency tree remain outside this planning-only phase.
- No private-vault contents were inspected, and no real-document path was accessed.

## Next Safe Phase

Recommended next phase: `KIA-Stick-v0.3-private-vault-ui-scaffold-plan`.

That phase should remain fake-doc-safe unless separately authorized. It may plan or scaffold UI state for Vault, Quarantine, Redaction Review, Metadata Review, Index Eligibility, and Audit Log using fake metadata only. It must not read, copy, index, scan, OCR, ingest, summarize, transform, or commit real documents.

---

# KIA Stick v0.1 Closeout

## Accepted State

- Phase: `KIA-Stick-v0.1-closeout-project-state`
- Accepted scope: laptop-only fake-doc PWA MVP.
- Accepted implementation commit: `1d9b05c`
- Accepted proof directory: `/tmp/proof_kia_stick_v01_ui_fix_20260618T165630Z`
- Manual QA: PASS
- Provider: `local-fake-deterministic`
- Cloud/API required: no
- Secrets printed: no
- Push performed: no
- Real document boundary: `/media/mint/SHARED/APWU` untouched

## Accepted Features

- Fake corpus only.
- Authority/source hierarchy.
- Deterministic answer governor with no-answer path.
- Citations and visible version footer.
- Mobile PWA shell with fixed bottom navigation.
- Saved answers in browser storage.
- Upload quarantine UI that stores metadata only.
- `/health` JSON route and readable `/version` route.
- Fake-doc, privacy, and forbidden tracked-path scans.

## Known Warnings

- `npm audit` reports dependency advisories in the current Next dependency tree; no breaking forced upgrade was applied.
- `next build` prints Next's flat-ESLint plugin detection warning; `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` pass.
- Ignored local storage such as `DB/`, `.next/`, `node_modules/`, and `tsconfig.tsbuildinfo` is not committed.

## Next Safe Phase

Recommended next phase: `KIA-Stick-v0.2-document-vault-redaction-plan`.

This phase must be planning-only. It must not read, copy, index, scan, ingest, summarize, or transform real documents yet. The plan should define quarantine, redaction, provenance, review gates, and GitHub-safe proof handling before any real-document workflow is attempted.
