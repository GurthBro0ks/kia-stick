# KIA-Stick Public Steward Workflow Platform Bundle 3 Implementation

Phase: `KIA-Stick-public-steward-workflow-platform-bundle-3-topic-argument-plans-and-evidence-checklists`

Authorization: `AUTHORIZE_KIA_PUBLIC_STEWARD_WORKFLOW_PLATFORM_BUNDLE_3_IMPLEMENTATION`

Status: local implementation code/build/repository validation `PASS`; in-app browser automation
`WARN_UNAVAILABLE`; operator manual QA, closeout, accepted-state refresh, and push remain pending
and separately gated. The phase is not claimed complete while those gates remain open.

## Implemented scope

1. `lib/publicStewardArgumentPlan.ts` builds a verified-current, topic-grounded argument plan for
   every one of the 10 existing `PublicStewardWorkflowTopicId` values. It reuses the shared
   registry, matcher result, CBA answer, grievance outline, and citation verification path.
2. Grievance outlines and steward packets carry parallel structured evidence requests with
   `document`, `requestFrom`, `whyItMatters`, and `citationIds` fields while retaining the legacy
   cited checklist shape for backward compatibility.
3. Steward packets expose a stable eight-step sequence with local completion tracking. Completion
   state participates in Saved replacement identity but not citation/source freshness identity.
4. Escalation guidance is limited to the existing verified Article 15 anchors and explicitly says
   that KIA Stick does not provide a verified contact directory.
5. Eligible outlines and packets can use the browser's native print flow. Print eligibility is
   re-evaluated at action time and uses the same fail-closed citation checks as text/Markdown
   export. No PDF package or other dependency was added.

## Saved compatibility

- Added the `public_steward_argument_plan` Saved type with deterministic namespaced identity,
  validation, dedupe/replacement, reopen, text export, and Markdown export support.
- Legacy grievance outlines are normalized with structured evidence requests derived from their
  cited checklist items.
- Legacy steward packets are normalized with structured evidence and the stable sequence, with
  every migrated step initially incomplete.

## Boundaries preserved

- No routing expression or supported-topic registry change.
- No new source, source fetch/sync, private data, public contact directory, file upload/import,
  OCR, embeddings, vector database, or external AI.
- No `package.json`, `package-lock.json`, `.kia-public-data`, accepted-state contract, service,
  system, network, Discord, Caddy, DNS, cron, timer, or tmux change.
- `CLOSEOUT.md` remains untouched. The accepted pushed Bundle 2 capability and its distinct
  repository-recording/latest-closeout identity remain unchanged.

## Proof and remaining gate

Durable proof:
`/home/mint/kia-stick-local-proofs/proof_kia_stick_public_steward_workflow_platform_bundle_3_implementation_20260731T164035Z`

The operator must manually exercise all 10 topics, Saved reopen, completion persistence, exports,
native print, and narrow-layout behavior before issuing `OPERATOR_QA_PASS for <proof dir>`. A later
closeout authorization is still required after that pass; this implementation phase does not push.
