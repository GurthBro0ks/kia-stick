# User-Owned Knowledge Base and Secure File-Transfer Gate Plan

Phase: `KIA-Stick-public-steward-workflow-platform-bundle-3-planning-and-secure-knowledge-boundary`

Status: `PLAN ONLY`. Nothing in this document is implemented, wired, enabled, or approved by writing it.

Baseline: `origin/main` verified at `004c8fa1a4e95713da6351a8ac7f46e129e977fb`.

## Purpose

This plan is the architecture for a future phase where each user can securely hand material to their own private knowledge base, build reusable workflows and argument/interview plans from it, and keep citations/provenance anchored — while KIA Stick today, and through the entirety of Bundle 3, remains public-only, single-workspace, and private-data-free.

It generalizes the existing single-document real-doc pilot gate series — `docs/v0.6-future-implementation-gate-draft.md`, `docs/v0.6-real-doc-safety-checklist.md`, `docs/v0.6-local-redaction-policy-plan.md`, `docs/v0.6-operator-approval-packet.md`, `docs/v0.6-real-doc-pilot-plan.md`, `docs/v0.2-document-vault-redaction-plan.md` — into a multi-user, multi-file architecture. It does not replace those documents; the one-gate/one-document discipline they define is the floor this plan builds on, not a ceiling it removes. Existing code already anticipates a private storage boundary: `lib/redactionMetadataModel.ts` hard-blocks the fragments `/media/mint/SHARED/APWU`, `kia-stick-private-vault`, `data/real-documents`, `data/quarantine`, `data/redacted-approved`, `uploads/`, `exports/`, `backups/`, `vector-store/`, and `DB/` from ever appearing in fake metadata. This plan treats `kia-stick-private-vault` (present on disk today, outside Git, untouched by this phase) as the anticipated private-storage root for any future implementation, not as something to read, list, or index now.

## Non-Negotiable Principles

```text
Private data is default-deny.
A user owns and controls their private workspace.
Public and private source lanes remain visibly separate.
No private content is sent to an external model without a later explicit gate.
No secret or private content enters Git, proof output, logs, screenshots, or notifications.
Deletion must be real, testable, and documented.
```

Every section below is written to preserve these six sentences without exception.

## Bucketing Legend

- `PLAN NOW` — architecture, docs, tests-of-the-plan-contract. Safe in this phase and in Bundle 3.
- `IMPLEMENT PUBLIC-ONLY NEXT` — a Bundle-3-or-later increment that touches no private data and needs no new gate (e.g. UI scaffolding that stays disabled/labeled, workflow/template structures that operate only on public packet output).
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE` — requires the full future approval sequence below, one bounded capability at a time, following the existing one-gate/one-document discipline generalized to one-gate/one-user-pilot.
- `NEVER ALLOW` — explicitly out of scope for KIA Stick regardless of future approval.

## Architecture Areas

### 1. Per-user isolation

- `PLAN NOW`: workspace identity model — every private record (future) is scoped to an opaque `userWorkspaceId`; no record type may omit it; no query path may span workspaces.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual multi-tenant storage, row/partition isolation, per-workspace encryption key.
- Design note: reuse the existing type-namespaced identity pattern already proven in `lib/savedAnswers.ts` (Saved records are namespaced by type today) — the future private-record identity should be namespaced by `(userWorkspaceId, recordType)`, not by type alone.

### 2. Authentication and authorization boundaries

- `PLAN NOW`: document that authentication is a hard prerequisite gate before any private endpoint exists — no private route may ship "temporarily open."
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual auth provider/session model, authorization checks on every private read/write.
- `NEVER ALLOW`: shared/anonymous access to any private workspace; client-side-only authorization (must be enforced server-side once a server-side private path exists).

### 3. Encrypted transport

- `PLAN NOW`: require TLS for any future private endpoint; no private payload may ever traverse plaintext HTTP, including on localhost-only dev builds that could be exposed.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual transport implementation.

### 4. Encryption at rest

- `PLAN NOW`: require at-rest encryption for any private file/content store; plaintext-on-disk private content is a `FAIL`.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual encryption implementation and storage engine choice.

### 5. Key ownership and rotation

- `PLAN NOW`: document that key ownership defaults to the user's workspace, not a shared application key; rotation must be possible without data loss and without a support-staff plaintext window.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: key management service, rotation schedule, break-glass procedure.
- `NEVER ALLOW`: a master key that decrypts all workspaces with no audit trail.

### 6. Upload quarantine

- `PLAN NOW`: generalize the existing quarantine-destination gate (`docs/v0.6-real-doc-safety-checklist.md`, "Quarantine destination" row) from one ignored private directory to a per-workspace quarantine area that is never Git-tracked and never proof-visible beyond safe labels.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual upload endpoint and quarantine storage.
- `NEVER ALLOW` (unchanged from `AGENTS.md`/`DESIGN.md` today): file pickers, drag-and-drop zones, `FileReader`, path readers, or upload handlers in this phase or Bundle 3.

### 7. Malware / content safety scanning

- `PLAN NOW`: require a scan gate between quarantine and any further processing; unscanned content may never reach redaction, indexing, or workflow use.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual scanner integration, scan-failure handling (quarantined content is deleted or held, never silently promoted).

### 8. Content-type and file-size restrictions

- `PLAN NOW`: require an explicit allowlist of accepted content types and a hard size ceiling defined before any upload path exists; default is deny for anything not on the allowlist.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: enforcement in the upload/quarantine path.

### 9. Metadata minimization

- `PLAN NOW`: extend the existing `FakeRedactionMetadata` category model (`lib/redactionMetadataModel.ts`) as the template for a future real-metadata model — same category/severity/eligibility shape, applied to genuine content. Only the minimum metadata needed for workflow function (type, redaction status, retention state, provenance anchor) may be retained; free-text notes about content are private-only, never in proof.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual metadata schema and storage.

### 10. Local versus server-side processing

- `PLAN NOW`: default to local (on-device) processing wherever feasible for redaction detection and content parsing, to minimize the private-data surface a server ever holds; document any step that must be server-side and why.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual processing placement decisions.

### 11. Source provenance

- `PLAN NOW`: every private record must carry a provenance anchor (who/what/when it was added, in safe-label form) using the same anchor concept already implemented for public sources (`cba-citation-anchor.v1` in `lib/publicCitationIntegrity.ts` / `lib/cbaCitationIntegrity.ts`) — generalized to a private-provenance-anchor type that never itself contains private content, only an opaque reference to it.
- `IMPLEMENT PUBLIC-ONLY NEXT`: strengthen and document the public provenance-anchor pattern now (this is shared groundwork and is part of Bundle 3 candidate work — see the candidate matrix).

### 12. Citation anchoring

- `PLAN NOW`: any future user-authored argument/interview plan that cites private material must anchor to the private record's opaque ID and never inline private text into a public-shareable artifact (export, template, or proof) without an explicit, separate user action.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual private-citation rendering.

### 13. Duplicate detection

- `PLAN NOW`: reuse the existing Saved dedupe-key concept (already implemented for public Saved records) as the template; a future private-record dedupe key must be scoped per-workspace and content-hash-based, never cross-workspace.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual implementation.

### 14. Versioning

- `PLAN NOW`: private records are append-versioned, never destructively overwritten, so redaction/audit history survives; document the version-identity shape now.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual storage.

### 15. User-created reusable workflows

- `IMPLEMENT PUBLIC-ONLY NEXT`: safe to build in public-only form — a reusable workflow is just a saved packet/argument-plan structure (topic selection + step sequence + citation set), which is exactly what the existing public packet workspace (`lib/publicStewardPacket.ts`) and Saved (`lib/savedAnswers.ts`) already model. The candidate matrix (`docs/public-steward-workflow-platform-bundle-3-candidate-matrix.md`, candidate 9) reviewed this and deliberately deferred it past Bundle 3 to keep Bundle 3 bounded around the two sharpest audited gaps (no per-topic argument plan, no packet sequencing) and to avoid pre-building UX that this future gate should own end-to-end. It is a strong Bundle 4 candidate, not a Bundle 3 deliverable.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: allowing a reusable workflow to also reference private records.

### 16. User-created argument and interview plans

- `IMPLEMENT PUBLIC-ONLY NEXT`: same reasoning as #15 — public-citation-only argument/interview plans are a Bundle 3 candidate (they extend the existing `lib/publicArgumentPlan.ts`). Private-fact-aware plans are gated.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: plans that incorporate private uploaded facts.

### 17. Retention

- `PLAN NOW`: default retention is deletion, exactly as the existing redaction policy plan already states for pilot artifacts (`docs/v0.6-local-redaction-policy-plan.md`, "Deletion and Retention Rules"); any non-default retention requires the user to name a period, and the system must enforce an expiry, not just document one.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual retention enforcement job.

### 18. Deletion

- `PLAN NOW`: deletion must be real (data actually removed from primary and backup stores on a bounded schedule), testable (a proof step can confirm a deleted record is unreadable), and documented (what "deleted" means for backups-in-flight).
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual deletion pipeline and deletion-proof tooling.
- `NEVER ALLOW`: a "soft delete" presented to the user as real deletion while content remains recoverable outside a documented, time-boxed backup window.

### 19. Export

- `PLAN NOW`: private export must remain user-initiated, workspace-scoped, and never silently bundle another user's data; reuse the existing plain-text/Markdown export pattern (`components/KiaStickApp.tsx` export path, currently public-only) as the template for a future private export, with an explicit "this export may contain private content" label the public export never needs.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual private export path.

### 20. Backup

- `PLAN NOW`: any backup of private data must be encrypted at rest with the same key-ownership model as primary storage (#5); backups are in scope for retention/deletion, not exempt from it.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual backup implementation.

### 21. Restore

- `PLAN NOW`: restore must be workspace-scoped and require the same authorization as the original data; a restore path must never become a way to read another workspace's backup.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual restore implementation.

### 22. Audit logging

- `PLAN NOW`: reuse the append-only, label/count/boolean-only audit shape already defined in `docs/v0.6-future-implementation-gate-draft.md` ("Audit" gate type) as the template for private-workspace audit logs — gate decisions, access events, and deletions logged as safe labels, never as private content.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual audit log storage and review tooling.

### 23. Private-data redaction

- `PLAN NOW`: reuse `docs/v0.6-local-redaction-policy-plan.md` in full — categories, PASS/WARN/FAIL handling, reviewer roles, escalation rules — as the redaction policy for the future knowledge base; this plan does not redefine it, it inherits it.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual redaction detection/review tooling operating on real content.

### 24. Model-access boundaries

- `PLAN NOW`: document that any model access to private content requires a separate, explicit, later-approved gate; the current provider is `local-fake-deterministic` (`lib/version.ts`, `DESIGN.md`) and no future gate may broaden that silently.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: any model call that touches private content, even a local model.
- `NEVER ALLOW`: silent default-on model access to private content; a model boundary must be opt-in per record, not per workspace.

### 25. External-AI restrictions

- `NEVER ALLOW` (unchanged): external AI API calls of any kind remain disabled for this entire phase and Bundle 3, matching `AGENTS.md`'s existing "no external AI" boundary and the mission's explicit block.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: even after a future gate, external AI access to private content requires its own separate, explicit approval beyond the general model-access gate in #24 — two gates, not one.

### 26. Support/admin access

- `PLAN NOW`: document that support/admin access to a user's private workspace, if it ever exists, must be logged, time-boxed, and user-visible; no silent admin read path.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual admin tooling.
- `NEVER ALLOW`: undisclosed admin access to private content.

### 27. Incident response

- `PLAN NOW`: document that a private-data incident response plan (detection, containment, user notification, key rotation) must exist and pass review before any private data is accepted, not be written after the fact.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual incident-response runbook exercised against a real (bounded, proof-safe) drill.

### 28. Secret handling

- `PLAN NOW`: no secret (API key, encryption key, session token) may ever appear in Git, proof output, logs, screenshots, or notifications — identical to the existing repository-wide rule already enforced by `scripts/privacy-scan.mjs` and this mission's SAFETY RULES; this phase extends that rule to future private-data secrets, it does not relax it.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual secret storage (vault/KMS), scoped per-environment, never committed.

### 29. Cross-user data leakage prevention

- `PLAN NOW`: every future query, cache, log line, and proof artifact must be reviewed for workspace-scoping before merge; this is the single most important review gate for the entire future phase, given #1.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual isolation testing (e.g., a proof step that asserts workspace B cannot read workspace A's record).

### 30. Public versus private source separation

- `PLAN NOW`: the public CBA source lane (`lib/publicSource.ts`, `lib/publicSourceServer.ts`, `.kia-public-data/`) and any future private-knowledge-base lane must remain visibly separate in UI, data model, and export — a user must always be able to tell which citations are public/verified-current and which are their own private material. This separation is enforced today implicitly (there is no private lane yet); the future model must keep them as two distinct, never-merged citation namespaces.
- `IMPLEMENT PUBLIC-ONLY NEXT`: strengthening public source-provenance visibility (candidate matrix item) is good groundwork and ships in Bundle 3.

### 31. Rollback

- `PLAN NOW`: reuse the existing rollback pattern from `docs/v0.6-future-implementation-gate-draft.md` — no `git reset --hard`; use a revert commit or targeted restore, with validation re-run after rollback — generalized to any future private-data implementation commit.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: exercising rollback against a real implementation.

### 32. Proof-safe testing

- `PLAN NOW`: reuse the existing GitHub-safe proof rules verbatim (`docs/v0.6-real-doc-safety-checklist.md`, "GitHub-Safe Proof Checklist") for any future private-data proof; no raw content, snippets, private paths, identifiers, hashes-of-sensitive-material, exports, or private notes may ever appear in proof, logs, or this repository.
- `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE`: actual proof tooling for private-data gates.

## What This Plan Does Not Authorize

Consistent with the mission's SAFETY RULES, this plan authorizes none of the following, now or as a side effect of writing this document:

authentication; upload endpoints; file pickers; `FileReader`; path readers; object storage; databases; encryption; OCR; embeddings; vector databases; private search; private LLM access; user accounts; sharing; public deployment; contact synchronization.

## Future Private-Data Approval Sequence

No private-data implementation may begin until every step below has independently passed, in order, each with its own separate operator approval:

```text
threat model PASS
authentication/authorization design PASS
encryption/key design PASS
retention/deletion design PASS
backup/restore design PASS
logging/proof-safety design PASS
one bounded private-data pilot approved
operator QA PASS
closeout PASS
```

This sequence sits above, and does not replace, the existing one-gate/one-document pilot discipline in `docs/v0.6-future-implementation-gate-draft.md`. The "one bounded private-data pilot approved" step in this sequence is where that existing gate series is invoked for the first concrete pilot.

## Relationship to Bundle 3

Bundle 3 (see `docs/public-steward-workflow-platform-bundle-3-implementation-packet.md`) implements only the single `IMPLEMENT PUBLIC-ONLY NEXT` item above that fits this cycle: public-only, per-topic argument/interview-plan depth (#16), generalizing `lib/publicArgumentPlan.ts` from a single hardcoded Weingarten pilot to the 10 supported `PublicStewardWorkflowTopic`s. Provenance/citation-anchor discipline (#11, #30) is preserved as an invariant across every Bundle 3 feature, not shipped as a separate deliverable. Reusable workflow templates (#15) are explicitly deferred past Bundle 3 (see §15 above). No item marked `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE` or `NEVER ALLOW` is touched by Bundle 3.

## Required Tests And Checks

This phase must be covered by docs/tests proving:

- This plan states `PLAN ONLY` and lists the six non-negotiable principles verbatim.
- Every architecture area above is present and correctly bucketed (`PLAN NOW` / `IMPLEMENT PUBLIC-ONLY NEXT` / `IMPLEMENT ONLY AFTER SENSITIVE-DATA GATE` / `NEVER ALLOW`).
- The future private-data approval sequence is present in order.
- The plan references, and does not duplicate or contradict, the existing `docs/v0.6-*` real-doc gate series.
- The plan does not add file input, file picker, path reader, OCR, upload handling, vector store, real indexing, authentication, or object storage.
- The plan contains no raw private source path (the mention of `kia-stick-private-vault` is a directory-name reference only, matching the existing forbidden-fragment list in `lib/redactionMetadataModel.ts`, not an access to its contents).
- Runtime surfaces still have no browser file input after this phase.
- No private-data implementation path is added by this phase.

## Current Phase Result

This document is planning-only. It does not change `data/current-accepted-pushed-state.json`, does not implement any private-data capability, and does not authorize implementation. Private-data implementation, secure file transfer, and the user-owned knowledge base all remain blocked until the future approval sequence above passes in full.
