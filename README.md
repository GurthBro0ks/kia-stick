# KIA Stick v0.7

Laptop-only fake-doc PWA for testing citation-first governance, source hierarchy, and hardened fake-vault review workflow scaffolding.

## Version Identity

KIA Stick separates milestone semver from build identity:

- `productVersion` changes slowly at planned milestone phases, for example `0.7.0`.
- `displayVersion` changes per build as `productVersion-channel.buildDate+gitSha`, for example `0.7.0-dev.20260621+40d8c29`.
- `corpusVersion`, `indexVersion`, and `promptVersion` stay separate from the app build version.

`/health`, `/version`, the app header, settings, answer footer, and saved answer metadata expose the current `displayVersion`.

## v0.9.6 to v0.9.10 Synthetic Governance Hardening Bundle

Phase: `KIA-Stick-v0.9.6-to-v0.9.10-synthetic-governance-hardening-bundle`.

Current project phase: `KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint`.

This local bundle hardens the synthetic governance lane after the accepted v0.9.1-to-v0.9.5 proof durability closeout. It adds `docs/v0.9.6-synthetic-governance-reality-audit.md`, `docs/v0.9.7-synthetic-approval-negative-fixtures.md`, `docs/v0.9.8-synthetic-governance-report-hardening.md`, `docs/v0.9.9-stop-on-warn-fail-closeout-guard.md`, and `docs/v0.9.10-synthetic-governance-hardening-checkpoint.md` with focused tests.

Latest accepted pushed phase before this bundle was `KIA-Stick-v0.9.1-to-v0.9.5-release-state-consolidation-proof-durability-closeout-and-push`; accepted pushed commit was `3a6e28bb07f6c06883e4abda8f9e30c95f9549d0`. Operator QA PASS and closeout validation PASS are recorded for the v0.9.6-to-v0.9.10 bundle. Accepted closeout push commit is `bb585ae3417084c5a57d1c572565fa4350247967`; closeout/push proof is recorded in `/tmp/proof_kia_stick_v0_9_6_to_v0_9_10_synthetic_governance_hardening_closeout_push_20260627T131000Z`. `queue-015-v07-first-real-doc-gate-request` remains blocked. `queue-041` through `queue-050` remain accepted. `queue-051` through `queue-055` are accepted after closeout validation and operator QA PASS. Product version remains `0.7.0`; prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

Post-closeout snapshot/mobile proof is accepted with operator QA PASS in `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_10_post_closeout_snapshot_mobile_20260627T140516Z`. That proof verified a clean accepted repo state at `441de89`, automated validation PASS, browser/mobile proof PASS, queue-015 still blocked, product/package version `0.7.0`, unchanged prompt version, and no runtime real-doc/file-picker/FileReader/OCR/indexing/vector capability. Screenshots were captured for Chat, Sources, Saved, Upload, Import, Vault, Settings, `/version`, desktop sanity, cited Chat answer, Saved metadata detail, and no-answer unsavable state. The proof phase changed no repo files and did not commit or push.

This is **synthetic-only docs/tests/tooling/state work**. It does not add runtime UI work, runtime capability, product version changes, prompt version changes, real-doc approval, real-doc implementation, file pickers, directory pickers, drag/drop import zones, browser File objects, FileReader, path readers, uploads, OCR, real redaction, text extraction over real documents, summarization, embeddings, indexing, vector stores, private-source inspection, services, secrets, Discord, skills, global config, or system changes. Push is authorized only by the separate closeout gate after validation PASS and operator QA PASS.

## v0.9.1 to v0.9.5 Release-State Consolidation and Proof Durability Bundle

Phase: `KIA-Stick-v0.9.1-to-v0.9.5-release-state-consolidation-and-proof-durability-bundle`.

Current project phase: `KIA-Stick-v0.9.5-next-work-decision-checkpoint`.

This local bundle consolidates the accepted v0.9.0 pushed state and hardens proof durability after the original v0.8.6-to-v0.9.0 bundle proof directory was missing at closeout time. It adds `docs/v0.9.1-accepted-state-reality-audit.md`, `docs/v0.9.2-proof-durability-contract.md`, `docs/v0.9.3-release-state-consistency-check.md`, `docs/v0.9.4-persistent-proof-pointer-update.md`, and `docs/v0.9.5-next-work-decision-checkpoint.md` with focused tests.

Latest accepted pushed phase before this closeout was `KIA-Stick-v0.8.6-to-v0.9.0-fake-runtime-ux-bundle-plus-vault-fix-closeout-and-push`; accepted closeout push commit was `8044eaf6756c5e8303483d44017a29cf9514ed44`. `queue-015-v07-first-real-doc-gate-request` remains blocked. `queue-041` through `queue-045` remain accepted. `queue-046` through `queue-050` are accepted after operator QA PASS and closeout validation for the v0.9.1-to-v0.9.5 bundle. Product version remains `0.7.0`; prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

This is **docs/tests/tooling/state work with a local proof pointer update only**. It does not add runtime feature work, approve implementation for real documents, name or touch a real document, accept arbitrary path input, read user-provided packet files, scan private folders, add file pickers, directory pickers, drag/drop import zones, browser File objects, FileReader, path readers, uploads, OCR, real redaction, text extraction over real documents, summarization, embeddings, indexing, vector stores, private-source inspection, services, secrets, Discord, skills, global config, or system changes. No push is approved by this bundle.

## v0.8.6 to v0.9.0 Fake Runtime UX Polish Bundle

Phase: `KIA-Stick-v0.9.0-fake-runtime-ux-checkpoint`.

This local bundle audits and polishes fake-only runtime UX for Chat, Sources, Saved, Upload, Import, Vault, Settings, `/health`, and `/version`. It adds `docs/v0.8.6-runtime-ux-reality-audit.md`, `docs/v0.8.7-chat-saved-no-answer-polish.md`, `docs/v0.8.8-sources-upload-import-vault-polish.md`, `docs/v0.8.9-mobile-narrow-operator-qa-polish.md`, and `docs/v0.9.0-fake-runtime-ux-checkpoint.md` with focused tests.

Closeout validation is PASS and operator QA PASS is recorded after the Vault client exception fix. `queue-015-v07-first-real-doc-gate-request` remains blocked. `queue-041` through `queue-045` are accepted after closeout validation, push, and `HEAD`/`origin/main` equality proof. The original bundle proof directory was missing at closeout time, so replacement proof is generated in `/tmp/proof_kia_stick_v0_8_6_to_v0_9_0_fake_runtime_ux_bundle_plus_vault_fix_closeout_push_20260627T103128Z`. Product version remains `0.7.0`; prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

This is **fake-only runtime UX/docs/tests/tooling/state work only**. It does not approve implementation for real documents, name or touch a real document, accept arbitrary path input, read user-provided packet files, scan private folders, add file pickers, directory pickers, drag/drop import zones, path readers, uploads, OCR, real redaction, text extraction over real documents, summarization, embeddings, indexing, vector stores, private-source inspection, services, secrets, Discord, skills, global config, or system changes. Push was authorized only by the separate closeout gate after validation PASS and operator QA PASS.

## v0.8.1 to v0.8.5 Backlog Reconciliation Bundle

Phase: `KIA-Stick-v0.8.5-next-large-work-checkpoint`.

This local bundle reconciles stale v0.7 queue placeholders, hardens `npm run queue:next`, documents the large-bundle operator workflow, and records next large-work options. It adds `docs/v0.8.1-queue-reality-audit.md`, `docs/v0.8.2-v07-v08-backlog-reconciliation.md`, `docs/v0.8.3-queue-next-contract-hardening.md`, `docs/v0.8.4-large-bundle-operator-workflow.md`, and `docs/v0.8.5-next-large-work-checkpoint.md` with focused tests.

Local validation is PASS and operator QA PASS is recorded. `queue-011-v07-pause-stabilize`, `queue-012-v07-product-version-bump-plan`, `queue-013-v07-fake-only-ux-polish`, and `queue-014-v07-real-doc-gate-preparation` are reconciled as accepted historical work from repo-owned evidence. `queue-015-v07-first-real-doc-gate-request` remains blocked. `queue-036` through `queue-040` are `accepted` after closeout validation and operator QA PASS; the closeout push verified `HEAD` equals `origin/main` at `cbf84827b4fa067b2e7ba68983f05a237e746e5b`. `npm run queue:next` now skips accepted, blocked, and parked items, so it selects the next actionable item instead of the first non-accepted item.

This is **fake/synthetic docs/tests/tooling/state work only**. It does not approve implementation, name or touch a real document, add runtime capability, change product version, change prompt version, accept arbitrary path input, read user-provided packet files, scan directories, add file pickers, directory pickers, drag/drop import zones, path readers, uploads, OCR, real redaction, text extraction, summarization, embeddings, indexing, vector stores, private-source inspection, services, secrets, Discord, skills, global config, or system changes. Product version remains `0.7.0`; prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`. The bundle itself did not approve push; the separate closeout gate did after validation PASS and operator QA PASS.

## v0.8.0 Synthetic Governance Checkpoint Plan

Phase: `KIA-Stick-v0.8.0-synthetic-governance-checkpoint-plan`.

This checkpoint bundles the synthetic governance lane from v0.7.16 through v0.8.0 for one operator review. It adds the v0.7.17 synthetic packet fixture matrix, v0.7.18 `npm run governance:report` helper, v0.7.19 bundled operator QA pack, and v0.8.0 checkpoint plan.

This is **synthetic-only docs/tests/tooling/state work**. It does not approve implementation, name or touch a real document, add runtime capability, change product version, change prompt version, accept arbitrary path input, read user-provided packet files, scan directories, add file pickers, directory pickers, drag/drop import zones, path readers, uploads, OCR, real redaction, text extraction, summarization, embeddings, indexing, vector stores, private-source inspection, services, secrets, Discord, skills, global config, or system changes.

Final validation is PASS, operator bundle QA PASS is recorded, and `queue-031-v0716-synthetic-packet-safety-drift-guard` through `queue-035-v080-synthetic-governance-checkpoint-plan` are accepted after closeout/push review. `queue-030-v0715-synthetic-packet-report-runner` remains accepted. `queue-015-v07-first-real-doc-gate-request` remains blocked. Product version remains `0.7.0`; prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`. No real-doc implementation is approved.

## v0.7.16 Synthetic Packet Safety Drift Guard

Phase: `KIA-Stick-v0.7.16-synthetic-packet-safety-drift-guard`.

`docs/v0.7.16-synthetic-packet-safety-drift-guard.md` documents the synthetic-only safety drift guard for the accepted v0.7.14 validator and v0.7.15 report runner. `scripts/synthetic-packet-safety-guard.mjs` is exposed through `npm run packet:guard` and reads only a fixed allowlist of repo-owned files.

This is **docs/tests/tooling work only**. It does not approve implementation, name or touch a real document, add runtime capability, change product version, change prompt version, accept path arguments, read user-provided files, check filesystem existence for packet fields, scan directories, add file pickers, directory pickers, drag/drop import zones, path readers, uploads, OCR, real redaction, text extraction, summarization, embeddings, indexing, vector stores, private-source inspection, services, secrets, Discord, skills, global config, or system changes.

Local validation is PASS for this phase and the bundle-level operator QA PASS is recorded. `queue-031-v0716-synthetic-packet-safety-drift-guard` is accepted as part of the v0.7.16-to-v0.8.0 synthetic governance bundle closeout. `queue-030-v0715-synthetic-packet-report-runner` remains accepted. `queue-015-v07-first-real-doc-gate-request` remains blocked. Product version remains `0.7.0`; prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`. No real-doc implementation is approved.

## v0.7.15 Synthetic Packet Report Runner

Phase: `KIA-Stick-v0.7.15-synthetic-packet-report-runner`.

`docs/v0.7.15-synthetic-packet-report-runner.md` documents the synthetic-only report runner for the accepted v0.7.14 synthetic approval-packet validator. `scripts/synthetic-packet-report.mjs` is exposed through `npm run packet:report` and runs only built-in synthetic PASS/WARN/FAIL fixtures.

This is **docs/tests/tooling work only**. It does not approve implementation, name or touch a real document, add runtime capability, change product version, change prompt version, accept path arguments, read user-provided packet files, check filesystem existence for packet fields, scan directories, add file pickers, directory pickers, drag/drop import zones, path readers, uploads, OCR, real redaction, text extraction, summarization, embeddings, indexing, vector stores, private-source inspection, services, secrets, Discord, skills, global config, or system changes.

Operator QA PASS is recorded and this phase is accepted after closeout validation and push. `queue-030-v0715-synthetic-packet-report-runner` is `accepted`. `queue-029-v0714-synthetic-approval-packet-validator` remains accepted. `queue-015-v07-first-real-doc-gate-request` remains blocked. Product version remains `0.7.0`; prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.7.14 Synthetic Approval-Packet Validator

Phase: `KIA-Stick-v0.7.14-synthetic-approval-packet-validator`.

`docs/v0.7.14-synthetic-approval-packet-validator.md` documents the synthetic-only approval-packet validator. `lib/syntheticApprovalPacketValidator.ts` validates in-memory fake packet objects and returns `PASS`, `WARN`, or `FAIL` for future one-document / one-gate review packet completeness.

This is **docs/tests/tooling work only**. It does not approve implementation, name or touch a real document, add runtime capability, change product version, change prompt version, accept path arguments, check filesystem existence, scan directories, add file pickers, directory pickers, drag/drop import zones, path readers, file reads, uploads, OCR, real redaction, text extraction, summarization, embeddings, indexing, vector stores, private-source inspection, services, secrets, Discord, skills, global config, or system changes.

Operator QA PASS is recorded and this phase is accepted after push. `queue-029-v0714-synthetic-approval-packet-validator` is `accepted`. `queue-015-v07-first-real-doc-gate-request` remains blocked. Product version remains `0.7.0`; prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.7.13 Planning-Only Real-Doc Gate Rehearsal

Phase: `KIA-Stick-v0.7.13-planning-only-real-doc-gate-rehearsal`.

`docs/v0.7.13-planning-only-real-doc-gate-rehearsal.md` rehearses the future operator gate shape with fake/synthetic placeholders only. It records a synthetic rehearsal packet, the exactly-one-document / exactly-one-gate future rule, future approval packet checklist, stop-on-WARN/FAIL checklist, redaction/privacy placeholders, proof-safe output rules, PASS/WARN/FAIL examples, and closeout gates required before any future real-doc implementation.

This is **planning-only docs/tests/state work**. It does not approve implementation, name or touch a real document, add runtime capability, change product version, change prompt version, add file pickers, directory pickers, drag/drop import zones, path readers, file reads, uploads, OCR, real redaction, text extraction, summarization, embeddings, indexing, vector stores, private-source inspection, services, secrets, Discord, skills, global config, or system changes.

Validation tooling now distinguishes the current project/docs phase from the last runtime metadata phase so operator smoke can pass without changing `/health` for this no-runtime-change rehearsal.

Operator QA PASS is recorded and this phase is accepted after push. `queue-028-v0713-planning-only-real-doc-gate-rehearsal` is `accepted`. `queue-015-v07-first-real-doc-gate-request` remains blocked. Product version remains `0.7.0`; prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.7.12 Operator QA Closeout And Push

Phase: `KIA-Stick-v0.7.12-operator-qa-closeout-and-push`.

This closeout records operator QA PASS for the local v0.7.11 persistent proof-index work and v0.7.12 fake-only polish/gate-planning work. The accepted pre-closeout local commits are `b4b3b0f7c8788bacb974f41b2ae039ea32e86498` for v0.7.11 and `b2ff99d42acd7e740edeb17ed64a20ff5fc7beae` for v0.7.12.

`queue-025-v0711-persistent-proof-index-review-guide`, `queue-026-v0712-fake-only-polish-and-real-doc-gate-planning`, and `queue-027-v0712-operator-qa-closeout-and-push` are accepted after operator QA PASS and closeout validation. `queue-015-v07-first-real-doc-gate-request` remains blocked.

This is **closeout/state/test work only**. It does not add real-doc capability, file pickers, directory pickers, path readers, uploads, OCR, redaction, embeddings, indexing, vector stores, private-vault inspection, services, secrets, Discord, skills, global config, or system changes.

## v0.7.12 Fake-Only Polish And Real-Doc Gate Planning

Phase: `KIA-Stick-v0.7.12-fake-only-polish-and-real-doc-gate-planning`.

`docs/v0.7.12-fake-only-polish-and-real-doc-gate-planning.md` documents the fake-only copy audit, PASS/WARN/FAIL operator QA labels, mobile/narrow screenshot checklist, local proof inspection checklist, and planning-only future real-doc gate requirements.

Runtime copy was tightened to say no cloud/API keys are required, Upload/Import have no real path, Vault blocks any real-doc gate, and Settings is not an approval surface. `/health` phase metadata now points at v0.7.12, and `scripts/qa_gate.sh` emits the matching manual QA checklist in generated proof results.

This is **fake-only UI copy, docs, tests, and checklist work**. It does not change product version, prompt version, runtime capability, file affordances, real uploads, OCR, embeddings, indexing, vector stores, private-vault inspection, services, skills, global agent config, secrets, Discord, or real-document access. `queue-015-v07-first-real-doc-gate-request` remains blocked.

## v0.7.11 Persistent Proof Index and Review Guide

Phase: `KIA-Stick-v0.7.11-persistent-proof-index-and-review-guide`.

`docs/v0.7.11-persistent-proof-index-review-guide.md` documents the persistent proof review flow for `/home/mint/kia-stick-local-proofs`, including `/home/mint/Desktop/kia-stick-proofs/LATEST_KIA_PROOF.txt`, latest-proof review, screenshot QA, and why `/tmp` proof alone is not enough for final operator acceptance.

`scripts/local-proof-index.mjs` adds the local-only `npm run proof:index` helper. It lists KIA proof directories newest-first, reports the newest proof and newest review-ready proof, checks whether `RESULT.md` and `OPEN_THIS_FOLDER.txt` exist, counts screenshots under `screenshots/`, and marks missing `RESULT.md` as `WARN_MISSING_RESULT`.

This is **fake-proof metadata docs/tests/tooling work only**. It does not change runtime UX, product version, prompt version, file affordances, real upload behavior, OCR, embeddings, indexing, vector stores, private-vault inspection, services, skills, global agent config, or real-document capability. `queue-015-v07-first-real-doc-gate-request` remains blocked.

## v0.7.10b Persistent Smoke Evidence Closeout

Phase: `KIA-Stick-v0.7.10b-closeout-project-state-update`.

`docs/v0.7.10b-persistent-smoke-evidence-closeout.md` records the accepted persistent operator smoke evidence for the existing fake-only v0.7.9 smoke pack. The accepted proof is `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_7_10b_operator_smoke_evidence_20260626T090618Z`, and `/home/mint/Desktop/kia-stick-proofs/LATEST_KIA_PROOF.txt` points to that proof folder.

Operator QA is accepted as `PASS` for this persistent proof. The closeout records 8 accepted screenshots, `FILE_INPUT_COUNT=0`, `FILE_CHOOSER_EVENTS=0`, local/static smoke PASS, `productVersion` `0.7.0`, and `promptVersion` `prompt.fake-docs.v0.5-import-wizard-hardening`.

This is **docs/tests/state closeout work only**. It does not change runtime UX, product version, prompt version, file affordances, real upload behavior, OCR, embeddings, indexing, vector stores, private-vault inspection, skills, global agent config, or real-document capability. `queue-015-v07-first-real-doc-gate-request` remains blocked.

## v0.7.9 Fake-Only Operator QA Smoke Pack

Phase: `KIA-Stick-v0.7.9-fake-only-operator-qa-smoke-pack`.

`docs/v0.7.9-operator-qa-smoke-pack.md` adds a repeatable fake-only operator QA checklist for Chat, Sources, Saved, Upload, Import, Vault, Settings, `/health`, `/version`, and mobile/narrow review. `scripts/operator-qa-smoke.mjs` adds a no-new-dependency local smoke helper exposed as `npm run operator:smoke`.

The pushed task commit `936ae5a` is accepted by the v0.7.9 acceptance closeout. `productVersion` stays `0.7.0`, `promptVersion` stays `prompt.fake-docs.v0.5-import-wizard-hardening`, `queue-023-v079-operator-qa-smoke-pack` is accepted, and `queue-015-v07-first-real-doc-gate-request` remains blocked.

This is **fake-only docs/tests/tooling work**. It does not change runtime UX, add file pickers, directory pickers, drag/drop import zones, path readers, uploads, OCR, real redaction, embeddings, indexing, vector stores, private-vault inspection, services, skills, global agent config, or real-document access.

## v0.7.8 v0.7 Release-State Closeout

Phase: `KIA-Stick-v0.7.8-v0.7-release-state-closeout`.

`docs/RELEASE_v0.7-closeout.md` consolidates accepted pushed v0.7.2 through v0.7.7 state: product identity `0.7.0` at `179f883`, fake-only UX triage at `38bff5f`, Chat/Saved/Upload stabilization at `5a3758d`, Sources/Vault/Import scan-density polish at `303f12b`, `DESIGN.md` fake-only UX contract at `4e7ab62`, and `design:check` drift guard at `b086f85`.

`productVersion` stays `0.7.0`, `promptVersion` stays `prompt.fake-docs.v0.5-import-wizard-hardening`, and `queue-015-v07-first-real-doc-gate-request` remains blocked.

Recommended next choice: pause and accept v0.7 state, or continue fake-only polish. Real-doc gate preparation may proceed as planning only, but this closeout does not approve implementation.

This is **KIA-only docs/tests/state closeout work**. It does not change runtime UX, add file pickers, path readers, file reads, uploads, OCR, real redaction, embeddings, indexing, vector stores, private-vault inspection, service changes, global agent config, skills, or real-document access.

## v0.7.7 Design Contract Drift Guard

Phase: `KIA-Stick-v0.7.7-design-contract-drift-guard`.

This phase adds deterministic `npm run design:check` tooling for the repo-owned `DESIGN.md` fake-only UX contract. The guard fails if future work drifts from the DESIGN.md fake-only boundary, AGENTS.md routing, product/prompt version identity, required Chat/Sources/Saved/Upload/Import/Vault/Settings/`/health`/`/version` coverage, proof-safe output rules, accessibility/mobile/no-answer state coverage, repo-local skill-dir limits, or the blocked `queue-015-v07-first-real-doc-gate-request` state.

`productVersion` stays `0.7.0`, `promptVersion` stays `prompt.fake-docs.v0.5-import-wizard-hardening`, and `queue-015-v07-first-real-doc-gate-request` remains blocked.

This is **fake-only docs/tests/tooling work**. It does not change runtime UX, add file pickers, path readers, file reads, uploads, OCR, real redaction, embeddings, indexing, vector stores, private-vault inspection, service changes, global agent config, skills, or real-document access.

## v0.7.6 DESIGN.md Fake-Only UX Contract

Phase: `KIA-Stick-v0.7.6-design-md-fake-only-ux-contract`.

This phase adds repo-owned `DESIGN.md` project knowledge for KIA Stick's fake-only UX/design contract. The contract formalizes the accepted v0.7.5 direction: restrained operational interface, citation-first hierarchy, dense but readable Chat/Sources/Saved/Upload/Import/Vault/Settings surfaces, proof-safe screenshot/output expectations, consistent safety-label language, and version identity rules for `/health`, `/version`, saved metadata, productVersion, displayVersion, promptVersion, and provider.

`productVersion` stays `0.7.0`, `promptVersion` stays `prompt.fake-docs.v0.5-import-wizard-hardening`, and `queue-015-v07-first-real-doc-gate-request` remains blocked.

This is **fake-only docs/tests/state work**. `DESIGN.md` is not a source of approval for real-doc work. It does not add file pickers, path readers, file reads, uploads, OCR, real redaction, embeddings, indexing, vector stores, private-vault inspection, service changes, or real-document access.

## v0.7.5 Sources/Vault/Import Scan-Density Polish

Phase: `KIA-Stick-v0.7.5-sources-vault-import-scan-density-polish`.

This phase implements the deferred fake-only polish from the v0.7.3 plan. Sources now exposes a denser traceability summary, fake source IDs, hierarchy ranks, citable/context-only labels, and current build/prompt identity. Vault now surfaces redaction review, metadata review, fake eligibility, not-indexable, blocked, quarantine, row-level redaction, index gate, and audit-export safety labels without opening technical details. Import aligns blocked-action labels and fake proof/export safety copy with Upload and Vault language.

`productVersion` stays `0.7.0`, `promptVersion` stays `prompt.fake-docs.v0.5-import-wizard-hardening`, and `queue-015-v07-first-real-doc-gate-request` remains blocked.

This is **fake-only UX/test polish**. It does not add file pickers, path readers, file reads, uploads, OCR, real redaction, embeddings, indexing, vector stores, private-vault inspection, service changes, or real-document access.

## v0.7.4 Chat/Saved/Upload Stabilization

Phase: `KIA-Stick-v0.7.4-chat-saved-upload-stabilization`.

This phase implements the fake-only Chat/Saved/Upload stabilization chunk recommended by the v0.7.3 plan. Chat save feedback now distinguishes new saves, metadata refreshes, duplicates, and no-answer blocks. Saved answers expose clearer empty/detail states with `productVersion`, `promptVersion`, build, and provider metadata. Upload remains button-only and queues synthetic names, sizes, and timestamps only.

`/health` now reports the current v0.7.4 phase instead of the stale v0.5.2 implementation phase. `productVersion` stays `0.7.0`, `promptVersion` stays `prompt.fake-docs.v0.5-import-wizard-hardening`, and `queue-015-v07-first-real-doc-gate-request` remains blocked.

This is **fake-only runtime/test hardening**. It does not add file pickers, path readers, file reads, uploads, OCR, real redaction, embeddings, indexing, vector stores, private-vault inspection, service changes, or real-document access.

## v0.7.3 Fake-Only UX Stabilization Plan

Phase: `KIA-Stick-v0.7.3-fake-only-ux-triage-and-stabilization-plan`.

`docs/v0.7.3-fake-only-ux-stabilization-plan.md` records the fake-only UX and stability triage after the accepted v0.7.2 product-version bump. It inventories Chat, Sources, Saved, Upload, Import, Vault, Settings, `/health`, and `/version`; ranks the highest-value stabilization opportunities; and recommends `KIA-Stick-v0.7.4-chat-saved-upload-stabilization` as the next implementation chunk.

This is a **docs/tests/state planning phase only**. It keeps `productVersion` at `0.7.0`, keeps `promptVersion` at `prompt.fake-docs.v0.5-import-wizard-hardening`, and does not add file pickers, path readers, file reads, uploads, OCR, real redaction, embeddings, indexing, vector stores, private-vault inspection, service changes, or real-document access.

`queue-015-v07-first-real-doc-gate-request` remains blocked. `queue-017-v073-fake-only-ux-triage` records this phase as ready for the task prompt's auto-push gate, and `queue-018-v074-chat-saved-upload-stabilization` records the next practical fake-only stabilization item.

## v0.7.2 Product-Version Bump to 0.7.0

Phase: `KIA-Stick-v0.7.2-product-version-bump-implementation-to-0.7.0`.

This phase implements the separately approved runtime/product identity bump to exactly `0.7.0`. It updates the shared runtime version contract, package metadata, release readiness state, and version-contract tests while keeping `promptVersion` at `prompt.fake-docs.v0.5-import-wizard-hardening`.

This is an **identity/release-coherence bump only**. It does not add file pickers, path readers, file reads, copying, OCR, real redaction, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, or real-document access.

`docs/v0.7.1-product-version-bump-plan.md` remains the traceable decision basis for selecting `0.7.0`; `docs/RELEASE_v0.7.md` records the GitHub-safe release note for the bump.

Current product version is `0.7.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.7.1 Product-Version Bump Plan

Phase: `KIA-Stick-v0.7.1-product-version-bump-plan`.

`docs/v0.7.1-product-version-bump-plan.md` documents how a later runtime/productVersion bump should choose between `0.5.0`, `0.6.0`, and `0.7.0`. It recommends `0.7.0` only as a future, separately approved identity catch-up target when the later phase is a pure product-version bump with no new runtime capability and no real-doc implementation.

This is **PLAN ONLY**. It does not change `productVersion`, `promptVersion`, `package.json` version, `/health`, `/version`, saved-answer metadata, file pickers, path readers, file reads, copying, OCR, real redaction, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, or real-document access.

`queue-012-v07-product-version-bump-plan` records this selected planning phase as ready for the task prompt's auto-push gate after validation; other v0.7 options remain unapproved future choices.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.6.7 Backlog Closeout and v0.7 Decision Checkpoint

Phase: `KIA-Stick-v0.6.7-backlog-closeout-v0.7-decision-checkpoint`.

`docs/v0.7-decision-checkpoint.md` closes out the seeded v0.6.x planning backlog and presents a v0.7 operator decision checkpoint. It summarizes the current safe state (fake app, proof tooling, queue tooling, the five v0.6 planning artifacts, and no real-doc implementation), lists the v0.7 choices (pause/stabilize, product-version bump plan, fake-only UX polish, real-doc gate preparation, and first real-doc gate request), and states the hard requirements for any real-doc path.

Any real-doc path remains **blocked** until a future, separately approved prompt provides a completed/signed approval packet, a `PASS` safety checklist, a redaction policy result, conformance to the future gate draft, exactly one gate, exactly one document, and fresh operator approval. `docs/phase-backlog.json` is refreshed with planned v0.7 options; `queue-015-v07-first-real-doc-gate-request` is seeded as `blocked`.

This is **PLAN ONLY**. It does not add file pickers, path readers, file reads, copying, OCR, real redaction, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, pushes beyond this docs/test/state commit, or real-document access.

`queue-010-future-implementation-gate-draft` is accepted after the pushed v0.6.6 baseline `6bbd6ce` was verified, completing the v0.6.x planning backlog.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

## v0.6.6 Future Implementation Gate Draft

Phase: `KIA-Stick-v0.6.6-future-implementation-gate-draft`.

`docs/v0.6-future-implementation-gate-draft.md` drafts how any later one-document real-doc pilot prompt must be shaped. It enforces a one-gate/one-document rule, defines required future-prompt fields (exact gate, exact one-document scope, allowed action, blocked actions, approval packet reference, safety checklist result, redaction policy result, rollback, deletion/retention, proof-safe output, and stop conditions), defines gate types (source selection, quarantine copy, provenance/hash, redaction detection, redaction review, metadata review, index eligibility, audit, rollback, deletion), and lists do-not-proceed blockers.

This draft is non-executable and does **not** authorize implementation. A later prompt must be separately approved, name exactly one gate and exactly one document, reference a completed/signed packet from `docs/v0.6-operator-approval-packet.md`, record a `PASS` for `docs/v0.6-real-doc-safety-checklist.md`, and follow `docs/v0.6-local-redaction-policy-plan.md`.

This is **PLAN ONLY**. It does not add file pickers, path readers, file reads, copying, OCR, text extraction, summarization, transforms, detection over real content, real redaction, embeddings, indexing, vector stores, upload handlers, private-vault inspection, service changes, pushes, or real-document access.

`queue-009-local-redaction-policy-plan` is accepted after the pushed v0.6.5 baseline `5aa46b8` was verified; `queue-010-future-implementation-gate-draft` is `needs_review` for operator review.

Current product version remains `0.4.0`; current prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`.

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
