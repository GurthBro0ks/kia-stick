# KIA-Stick Public Steward Workflow Platform Bundle 3 — Candidate Matrix

Phase: `KIA-Stick-public-steward-workflow-platform-bundle-3-planning-and-secure-knowledge-boundary`

Status: `PLAN ONLY`. Ranks public-only Bundle 3 candidates against the current architecture
audited in `docs/public-steward-workflow-platform-bundle-3-current-state-audit.md`. Selects one
coherent bundle; does not implement anything.

## Ranking criteria

Each candidate is scored `high`/`medium`/`low` on: steward usefulness, public-source
sufficiency (using only what already exists locally — see
`docs/public-source-sufficiency-matrix-v2.md`), implementation risk, privacy risk, architecture
fit (does it extend an existing type/pattern or invent a new one), testability, mobile
usability, dependency risk (new packages/services), and amount of new source research required.

## Candidate Matrix

| # | Candidate | Steward usefulness | Source sufficiency | Implementation risk | Privacy risk | Architecture fit | Testability | Mobile usability | Dependency risk | New source research needed | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Per-topic step-by-step argument plans (generalize `lib/publicArgumentPlan.ts` pattern to all 10 `PublicStewardWorkflowTopic`s) | high | high (reuses each topic's already-verified `citationSpecs`) | medium (new type + builder + Saved/export wiring, but mirrors an existing, tested pattern) | none (public CBA text + case-neutral facts-to-confirm only) | high (extends existing `CitedArgumentPlanItem`/`argumentSteps` shape; registry-driven instead of hardcoded intent) | high (mirror `tests/publicArgumentPlan.test.ts` per topic + collision tests) | high (same rendering pattern as outlines) | none | none | **selected** |
| 2 | Structured evidence/document-request checklist (upgrade `evidenceToRequest`/`evidenceChecklist` from prose items to `{document, requestFrom, whyItMatters, citationIds}` records) | high | high (citations already exist; only the item shape changes) | low-medium (data-model change + rendering; no new source) | none | high (extends `CitedGrievanceOutlineItem`-style items already in the outline/packet types) | high (structural fixture tests, easy to assert field presence) | high (short checklist rows suit narrow layouts) | none | none | **selected** |
| 3 | Packet sequencing and completion tracking (ordered steps + local completion flags on `PublicStewardPacket`) | high | n/a (metadata layer, not source-dependent) | medium (new fields on a Saved/migrated type; must extend `migrateSavedAnswers`) | none (step-completion flags reference public template step ids only, never case text) | high (audit found `PublicStewardPacket` has no `sequence`/`progress` field today — a real, named gap) | high (assert monotonic step ids, migration of packets without the new field) | high (checklist UI is inherently mobile-friendly) | none | none | **selected** |
| 4 | Escalation-guidance strengthening within existing sources (explicit "no verified contact-directory source yet" fail-closed label reused consistently across all 10 topics, richer Article 15 procedural framing in `escalationReadiness`) | medium-high | high (Article 15 is already an allowlisted shared source for every topic) | low | none | high (extends `escalationReadiness`, already present on both outline and packet types) | high | high | none | none | **selected** |
| 5 | Print-friendly export polish (print stylesheet / print view for outlines and packets, alongside existing plain-text/Markdown export) | medium | n/a | low | none | medium (additive rendering only; reuses existing export-eligibility gate) | medium (can assert print CSS class presence / print-eligible markup) | high | none | none | **selected (stretch item)** |
| 6 | Investigative-interview preparation as a distinct new mode | medium | medium (only meaningfully distinct for `discipline_just_cause` and `steward_grievance_handling`, which already involve interviews/investigations) | medium | none | medium (overlaps candidate 1; would fragment into a second parallel builder if not folded into it) | medium | high | none | none | folded into candidate 1 (topic-scoped argument steps already cover interview-adjacent topics) |
| 7 | Multi-topic issue decomposition | low-medium (packet workspace + `overlapConflictNotes` already does this) | high | low | none | high | n/a — already implemented | n/a | none | none | not selected — already shipped in Bundle 2 |
| 8 | Public contact-directory architecture using verified official sources (NLRB regional offices, EEOC, DOL/OSHA whistleblower contacts) | high (closes the exact gap `publicArgumentPlan.ts:221` names in its own output) | **insufficient today** — no contact-directory source cache exists in `.kia-public-data/`; `PUBLIC_SOURCE_CONTROLLING_FOR_USPS` pattern would need a new, separately-vetted source class | high | low-medium (public agency contact info, but still a new external-source trust boundary) | n/a (would need new source ingestion, not existing pattern) | n/a | n/a | none for the app itself, but requires a public-source-sync phase this planning task is forbidden from performing | **yes — full new source research and vetting** | **not selected — research-only, deferred**; see `docs/public-source-sufficiency-matrix-v2.md` |
| 9 | Reusable templates created from public-only workflow results (save a packet's topic/step structure, without private content, as a starting point for a future packet) | medium | high | medium-high (new Saved subtype, dedupe/identity design, UI) | low if scoped to structure-only, but adjacent to the private-workspace direction the mission reserves for Goal 4 | medium (new pattern, not an extension of an existing one) | medium | medium | none | none | **not selected this bundle** — deferred to keep Bundle 3 bounded and to avoid pre-building UX that the future user-owned-workflow feature (Goal 4) should own end-to-end |
| 10 | Promote a `research_only` topic (e.g. `hours_work_scheduling`) to `supported` | medium | **insufficient** — `docs/public-steward-workflow-source-matrix.md` explicitly rejected these as needing craft/category-specific facts a case-neutral builder cannot supply | high | medium (higher chance of drifting into fact-specific/private territory) | n/a | n/a | n/a | none | full source re-review per candidate | **not selected — stays research-only, fail-closed** |
| 11 | Citation-backed "why this step matters" rationale as a standalone feature | low-medium | high | low | none | overlaps candidates 1 and 2 | n/a | n/a | none | none | folded into candidates 1 and 2 (`whyItMatters` field, argument-step citations) rather than built standalone |
| 12 | Source-sufficiency / unsupported-topic warnings | low (already implemented: `unsupportedCandidateId` in `publicStewardWorkflowMatch`, Sources tab visibility) | high | n/a | none | n/a | n/a | n/a | none | none | not selected — already shipped |

## Selected Bundle 3

Candidates 1, 2, 3, 4, and 5 form one coherent bundle: **"Topic-Grounded Argument & Evidence
Preparation."** All five extend existing verified-citation, fail-closed, Saved/export
infrastructure; none require a new source class, a new package, or private data. See
`docs/public-steward-workflow-platform-bundle-3-decision.md` for the selection rationale and
`docs/public-steward-workflow-platform-bundle-3-implementation-packet.md` for the actionable
packet.

## Explicitly deferred, not abandoned

- Candidate 8 (contact-directory) is fail-closed by design until a future, separately-approved
  public-source-sync phase vets and allowlists a new source class.
- Candidate 9 (reusable templates) is deferred to the future user-owned-workflow gate described
  in `docs/user-owned-knowledge-base-secure-file-transfer-gate-plan.md`, where "reusable
  workflows created from work completed in the app" is an explicit target capability once
  private-data gates are separately approved.
- Candidate 10 (new supported topics) remains blocked on source-sufficiency exactly as recorded
  in the existing `docs/public-steward-workflow-source-matrix.md`; nothing in this phase changes
  that determination.
