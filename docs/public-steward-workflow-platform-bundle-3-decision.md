# KIA-Stick Public Steward Workflow Platform Bundle 3 — Decision

Phase: `KIA-Stick-public-steward-workflow-platform-bundle-3-planning-and-secure-knowledge-boundary`

Status: `PLAN ONLY`. This document is the single, definitive scope statement for Bundle 3. It
does not implement anything; it exists so a later implementation prompt does not need to
re-derive scope from the audit and candidate matrix.

## Selected Bundle 3 name

**"Topic-Grounded Argument & Evidence Preparation."**

## Included features

1. **Per-topic step-by-step argument plans.** Generalize the existing, tested
   `lib/publicArgumentPlan.ts` pattern (`CitedArgumentPlanItem`, `argumentSteps`,
   eligibility gate, `verified_current`-only citations) from its current single hardcoded
   Weingarten intent to all 10 `PublicStewardWorkflowTopic`s
   (`lib/publicStewardWorkflowRegistry.ts`). Each supported topic gets a sequenced,
   citation-anchored argument plan reusing that topic's already-verified `citationSpecs` — no
   new source, no new citation.
2. **Structured evidence/document-request checklist.** Upgrade `evidenceToRequest`
   (`lib/publicGrievanceOutline.ts`) and `evidenceChecklist`
   (`lib/publicStewardPacket.ts`) from flat prose `CitedGrievanceOutlineItem[]` to a
   `{document, requestFrom, whyItMatters, citationIds}` shape, still citation-anchored, still
   fail-closed identically to today.
3. **Packet sequencing and completion tracking.** Add an ordered step list and local
   completion flags to `PublicStewardPacket`, referencing public template step ids only —
   never case facts. Extend `migrateSavedAnswers` so packets Saved before this change default
   to "no steps completed" rather than failing to load.
4. **Escalation-guidance strengthening within existing sources only.** Reinforce
   `escalationReadiness` on outlines and packets using the shared Article 15 procedure already
   anchored for every topic, and make the "a verified national/official contact-directory
   source is not included" fail-closed label (today Weingarten-pilot-only text,
   `lib/publicArgumentPlan.ts:221`) consistent across all 10 topics. No contact information is
   added.
5. **Print-friendly export polish.** Add a print view/stylesheet for outlines and packets that
   re-checks `publicGrievanceOutlineExportEligibility` (or its packet equivalent) at
   render/print time, alongside the existing plain-text/Markdown export paths.

## Excluded features (explicitly, with reason)

- **Public contact-directory architecture.** No allowlisted source cache exists for any agency
  contact directory; this phase is forbidden from fetching or synchronizing new public sources
  and from adding URLs from memory. Stays `research_only`. See
  `docs/public-source-sufficiency-matrix-v2.md`, Part C.
- **Promotion of any `research_only` topic to `supported`** (`seniority_assignment_administration`,
  `hours_work_scheduling`, `craft_jurisdiction`, `training_qualification`). Already determined
  in `docs/public-steward-workflow-source-matrix.md` to require craft/category/local-fact
  detail a case-neutral builder cannot supply. Unchanged by this phase.
- **`grievance_procedure_timeliness` as a standalone builder.** Deliberately rejected — would
  require private dates/case facts. Unchanged by this phase.
- **Reusable public-only workflow templates.** Source-sufficient and low-privacy-risk, but
  deliberately deferred past Bundle 3 to keep this bundle bounded to the two sharpest audited
  gaps (no per-topic argument plan, no packet sequencing) and to avoid pre-building UX that the
  future user-owned-workflow gate
  (`docs/user-owned-knowledge-base-secure-file-transfer-gate-plan.md`, §15) should own
  end-to-end. Strong Bundle 4 candidate.
- **Any private-data capability, secure file transfer, upload endpoint, file picker,
  `FileReader`, authentication, or external AI.** Out of scope for this entire phase per the
  mission's SAFETY RULES and BLOCKED STATES TO PRESERVE; see the secure-knowledge-boundary plan
  for the full future-gated design.

## Why this bundle is coherent, not a random collection

All five included features:

- extend an already-existing, already-tested pattern (`publicArgumentPlan.ts`'s cited-step
  shape; `publicGrievanceOutline.ts`/`publicStewardPacket.ts`'s cited-item shape) rather than
  introduce a new one;
- consume only citations the registry already resolves — zero new source research, zero new
  source class, zero network access;
- carry zero private-data risk — every new field references public template/step ids or public
  citations, never case facts, names, dates, or personnel data;
- reuse the existing `verified_current` fail-closed citation-integrity mechanism unmodified;
- reuse the existing Saved/export/migration mechanisms unmodified in kind (extended in shape,
  not replaced);
- are independently testable using the same fixture/regression patterns already proven in
  `tests/publicArgumentPlan.test.ts`, `tests/publicGrievanceOutline.test.ts`,
  `tests/publicStewardPacketWorkspace.test.ts`, and `tests/savedRecordIdentity.test.ts`.

## Boundedness

Five features, all extending existing types/patterns, all citation-reuse-only, all with an
existing test template to mirror — sized for one implementation, repair, operator-QA, and
closeout cycle, consistent with how Bundle 1 (5 topics) and Bundle 2 (+5 topics, packet
workspace) were each scoped as one cycle.

## Public-source research required

None for the selected bundle. Research is required only for the explicitly excluded
contact-directory candidate, and that research is out of scope for this phase (see
`docs/public-source-sufficiency-matrix-v2.md`, Part C).

## Private-data implementation status

Not approved. Unchanged by this phase. See
`docs/user-owned-knowledge-base-secure-file-transfer-gate-plan.md` for the full future-gated
architecture and the required approval sequence before any private-data pilot may begin.

## Blocked states preserved

`queue-015-v07-first-real-doc-gate-request` remains blocked. `KIA-Stick-v0.9.12C` remains
blocked. Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR` and parked. Real upload/import
remains blocked. External AI remains disabled. Product/package version remains `0.7.0`.
