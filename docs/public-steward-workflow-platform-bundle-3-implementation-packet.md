# KIA-Stick Public Steward Workflow Platform Bundle 3 — Implementation Packet

Status: `PLAN ONLY`. This packet does not implement Bundle 3. It is written so a future
implementation prompt (GPT/Codex per the mission's MODEL ROUTING) can execute without repeating
this discovery phase. Nothing here authorizes running the implementation now.

## Exact phase name (for the future implementation prompt)

`KIA-Stick-public-steward-workflow-platform-bundle-3-topic-argument-plans-and-evidence-checklists`

## Mission (for the future implementation prompt)

Implement the five features selected in
`docs/public-steward-workflow-platform-bundle-3-decision.md`: per-topic argument plans,
structured evidence/document-request checklists, packet sequencing/completion tracking,
escalation-guidance strengthening within existing sources, and print-friendly export polish —
for all 10 currently supported `PublicStewardWorkflowTopic`s, with zero new sources, zero
private data, and zero change to accepted-state identity until a separate closeout phase.

## Included features (exact scope)

See `docs/public-steward-workflow-platform-bundle-3-decision.md`, "Included features," items 1-5.
Do not add, substitute, or expand scope beyond those five without a new planning cycle.

## Excluded features (exact scope)

See `docs/public-steward-workflow-platform-bundle-3-decision.md`, "Excluded features," verbatim.
In particular: no contact-directory data, no new supported topic, no reusable-template feature,
no private-data/file-transfer capability of any kind.

## Source boundary

- Read-only reuse of the existing `.kia-public-data/apwu-usps-cba-2024-2027.{json,pdf}` cache
  via the existing `lib/cbaSource.ts`/`lib/cbaSourceServer.ts` accessors.
- No new source file, no fetch, no sync. `scripts/public-source-sync.mjs` must not run during
  implementation.
- Every new citation-bearing field must resolve through the existing
  `verifyPublicCitation`/CBA-equivalent re-derivation (`lib/publicCitationIntegrity.ts`,
  `lib/cbaCitationIntegrity.ts`) and must render as `verified_current` or not render at all.

## Accepted-state boundary

- Do not touch `data/current-accepted-pushed-state.json`.
- Do not touch `lib/acceptedState.ts`'s consumption contract.
- `LOCAL_RUNTIME_PHASE` in `app/health/route.ts` and the phase-string literals in
  `scripts/operator-qa-smoke.mjs`/`scripts/synthetic-governance-report.mjs`/
  `scripts/design-contract-check.mjs` are updated only as part of that implementation's own
  closeout, following the exact same hand-maintained-literal pattern already in use — this
  packet does not change that mechanism, only flags it as a known limitation (audit §13).
- `feature_list.json` top-level `phase`/`release_readiness` block is not touched by this
  packet; a new dictionary entry is added following the existing per-phase-key convention (see
  any `public_steward_workflow_platform_bundle_2*` key for the shape to copy).

## Data model changes

- `lib/publicStewardWorkflowRegistry.ts`: no change to `PublicStewardWorkflowTopicId` or the
  10-topic list. Each `PublicStewardWorkflowTopic`'s existing `citationSpecs` are reused
  as-is by the new argument-plan builder; do not add new `citationSpecs` unless a topic
  genuinely lacks enough anchors for a distinct argument step (verify against
  `docs/public-source-sufficiency-matrix-v2.md` first).
- New type, modeled directly on `lib/publicArgumentPlan.ts`'s `PublicArgumentPlan`/
  `CitedArgumentPlanItem`/`PublicArgumentPlanEligibility`, but keyed by
  `PublicStewardWorkflowTopicId` instead of a single hardcoded intent — e.g.
  `PublicStewardArgumentPlan` in a new `lib/publicStewardArgumentPlan.ts`, with its own
  `PUBLIC_STEWARD_ARGUMENT_PLAN_SAVED_TYPE` constant and `savedRecordId` namespace entry in
  `lib/savedAnswers.ts:96-104`.
- `lib/publicGrievanceOutline.ts`: change `evidenceToRequest: CitedGrievanceOutlineItem[]` to a
  new `EvidenceRequestItem[]` shape (`{document, requestFrom, whyItMatters, citationIds}`) —
  or, if minimizing blast radius is preferred, add a new parallel field rather than changing
  the existing one, and update `tests/publicGrievanceOutline.test.ts` accordingly either way.
- `lib/publicStewardPacket.ts`: same shape change for `evidenceChecklist`; add
  `sequencedSteps: {stepId, label, completed}[]` (or equivalent) to `PublicStewardPacket`; a
  packet loaded via `migrateSavedAnswers` (`lib/savedAnswers.ts:526+`) without this field must
  default to all-incomplete, not fail to load.
- `lib/publicArgumentPlan.ts`: unchanged in place (the Weingarten pilot stays exactly as-is);
  the new per-topic builder is a sibling, not a replacement, since Weingarten is not one of the
  10 `PublicStewardWorkflowTopicId`s.

## Routing changes

None. `detectPublicStewardWorkflowTopic`/`publicStewardWorkflowMatch`
(`lib/publicStewardWorkflowRegistry.ts:709-744`) are unchanged. The new argument-plan/checklist
builders are triggered from an already-routed topic, not from new routing patterns. Do not add
new `positive`/`negative` regex patterns as part of this packet.

## UI changes

- `components/KiaStickApp.tsx`: add an argument-plan view mirroring the existing Weingarten
  plan render path (`publicArgumentPlanToText`-equivalent rendering,
  `components/KiaStickApp.tsx:3187+` export-eligibility-gated pattern) for each of the 10
  topics; add checklist row rendering for the new evidence-request shape; add step-completion
  toggle controls to the packet workspace view; add a print view/button next to the existing
  "Copy ... as plain text" / "Download ... as Markdown" controls
  (`components/KiaStickApp.tsx:3287-3293`, `:3473-3477`).
- Follow `DESIGN.md` verbatim: no file pickers, no new forbidden affordances; keep labels short
  enough for mobile chips; keep the `verified-current export ready`/`export blocked` badge
  pattern for the new print path; use PASS/WARN/FAIL only for proof/validation artifacts, not
  for UI copy.
- Settings/`/health`/`/version` are updated only for phase-string/topic-count consistency at
  closeout time, per the existing hand-maintained pattern — no new Settings sub-panel is
  required by this packet.

## Saved changes

- New `savedType` value(s) for the per-topic argument plan (namespaced per
  `savedRecordId`, `lib/savedAnswers.ts:96-104`), following the exact pattern used for
  `PUBLIC_ARGUMENT_PLAN_SAVED_TYPE`/`PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE`/
  `PUBLIC_STEWARD_PACKET_SAVED_TYPE`.
- Extend `migrateSavedAnswers` (`lib/savedAnswers.ts:526+`) with a structural-shape guard for
  the new type(s), mirroring `isPublicArgumentPlanLike`/similar predicates
  (`lib/savedAnswers.ts:439-505`).
- Extend `SaveAnswerStatus` handling (`created`/`replaced`/`duplicate`,
  `lib/savedAnswers.ts:84`) coverage to the new type(s) — no new status value needed.
- Existing packets/outlines Saved before this change must still load and render correctly
  (dedicated regression test required — see below).

## Export changes

- Plain-text and Markdown export for the new argument-plan type, mirroring
  `publicGrievanceOutlineToMarkdown`/`publicStewardPacketToMarkdown`.
- Print view for outlines and packets, gated by the same export-eligibility check
  (`publicGrievanceOutlineExportEligibility` or its packet equivalent) evaluated at
  render/print time, not cached from build time.
- No PDF generation library, no new dependency — use the browser's native print (`window.print`
  with a print stylesheet), consistent with "no new package" constraints.

## Required tests

- New unit/fixture tests mirroring `tests/publicArgumentPlan.test.ts` for each of the 10
  topics' argument plans (eligibility, citation resolution, fail-closed on missing anchor).
- Extend `tests/publicGrievanceOutline.test.ts` and `tests/publicStewardPacketWorkspace.test.ts`
  for the new evidence-request/checklist shape.
- New sequencing/completion tests for `PublicStewardPacket`, including a migration test proving
  pre-Bundle-3 Saved packets still load with steps defaulted to incomplete.
- Extend `tests/savedRecordIdentity.test.ts` for the new `savedType`(s) — identity, dedupe,
  reopen.
- Extend `tests/publicStewardRoutingCollision.test.ts` only if a new topic-vs-topic collision
  surface is introduced by argument-plan intent detection (it should not be, since routing is
  unchanged — verify this explicitly as a regression assertion).
- Print/export-eligibility regression test proving a stale/unverified outline cannot be printed.

## Browser / manual QA

- For each of the 10 topics: generate outline → argument plan → evidence checklist → mark
  packet steps complete → export plain text/Markdown/print → Save → reopen from Saved → confirm
  identical content and citations.
- Confirm mobile/narrow layout for the new checklist rows, step-completion toggles, and print
  button (no text overlap, touch targets adequate, per `DESIGN.md` "Accessibility And Mobile").
- Confirm a citation drift (simulate by checking `verifyPublicCitation` fail states in tests,
  not by editing the real cache) blocks argument-plan/checklist export exactly as it blocks
  outline export today.

## Rollback

Standard repo convention: no `git reset --hard`; revert via a new commit or targeted restore if
the implementation must be undone; re-run full validation after rollback; no accepted-state
identity is touched until closeout, so rollback before closeout only affects local, unpushed
commits.

## Proof expectations

Follow the existing bundle proof pattern (see any `proof_kia_stick_public_steward_workflow_platform_bundle_2*`
directory under `/home/mint/kia-stick-local-proofs/` for the shape): git before/after, focused
and full test runs, lint/typecheck/build, design/release/governance checks, fake/privacy scans,
package/lockfile/source-cache immutability, operator smoke, browser QA evidence, and a manual
QA checklist left `PENDING_OPERATOR_REVIEW` until a human explicitly passes it.

## Package immutability expectations

No change to `package.json`/`package-lock.json`. The print feature must use only
`window.print()`/CSS — no PDF library, no new dependency.

## Source-cache immutability expectations

No change to any file under `.kia-public-data/`. `source-cache-hashes-before.txt` must equal
`source-cache-hashes-after.txt` at every stage, including the future implementation phase.

## Commit strategy

One feature-scoped implementation commit (or a small, clearly-ordered sequence: data model →
builders → UI → tests → docs), followed by a separate closeout commit touching only
`CLOSEOUT.md`/`claude-progress.md`/`feature_list.json`, matching the repo's established
two-commit-family convention (implementation commits vs. closeout commits) visible throughout
`git log`.

## No-push gate

The future implementation phase must stop before push and report validation PASS/WARN/FAIL with
an explicit "pushed: no" until a separate, explicit closeout-and-push authorization is given —
identical to every prior bundle in this repository's history.

## Operator-QA gate

A human operator must explicitly pass manual QA (`OPERATOR_QA_PASS for <proof dir>`) before any
closeout/push authorization is considered, per the existing repo convention. This packet does
not pre-authorize that pass.

## Closeout/push gate

Closeout is a separate, later, explicitly-authorized phase. This packet does not request or
perform closeout or push, and neither may the future implementation phase without a fresh,
explicit authorization naming the exact commit(s) to close out.
