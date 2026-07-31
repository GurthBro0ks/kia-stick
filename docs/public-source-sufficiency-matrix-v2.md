# Public Steward Workflow Bundle 3 Source-Sufficiency Matrix (v2)

Phase: `KIA-Stick-public-steward-workflow-platform-bundle-3-planning-and-secure-knowledge-boundary`

Result: `PASS` for planning; no source fetch, sync, refresh, replacement, regeneration, or mutation was performed to produce this matrix.

This is a v2 refresh of `docs/public-steward-workflow-source-matrix.md` (the Bundle 2 matrix, retained unmodified as the historical record for the ten supported topics). This document does not re-derive topic sufficiency — the Bundle 2 result stands — it extends the same allowlisted-source discipline to Bundle 3 candidate features, which by design consume the *same already-verified* citations rather than requiring new source coverage.

Source boundary (unchanged): exact-allowlisted, read-only cache for `apwu-usps-cba-2024-2027`, present under `.kia-public-data/`. PDF SHA-256 `64195ca9def180ddab5bd2322e1aff85ca589534c2c1daa85b1752474b8b7a7c`. No fetch, sync, refresh, or replacement is authorized or performed in this phase.

## Part A — Existing Ten Supported Topics (carried forward, unchanged)

| Topic ID | Articles | Bundle 2 result | v2 status |
| --- | --- | --- | --- |
| `annual_leave` | 10, 15 | `supported` | unchanged, `PASS` |
| `overtime` | 8, 15 | `supported` | unchanged, `PASS` |
| `holiday_scheduling` | 11, 15 | `supported` | unchanged, `PASS` |
| `safety_health` | 14, 15 | `supported` | unchanged, `PASS` |
| `discipline_just_cause` | 16, 15 | `supported` | unchanged, `PASS` |
| `sick_leave` | 10, 15 | `supported` | unchanged, `PASS` |
| `higher_level_assignments` | 25, 15 | `supported` | unchanged, `PASS` |
| `uniforms_work_clothes` | 26, 15 | `supported` | unchanged, `PASS` |
| `employee_claims` | 27, 15 | `supported` | unchanged, `PASS` |
| `steward_grievance_handling` | 17, 15 | `supported` | unchanged, `PASS` |

Research-only (`seniority_assignment_administration`, `hours_work_scheduling`, `craft_jurisdiction`, `training_qualification`) and rejected-builder (`grievance_procedure_timeliness`) candidates from Bundle 2 remain in the same state. No Bundle 3 feature promotes any of them to `supported`; doing so would require new source research, which is out of scope for this phase.

## Part B — Bundle 3 Candidate Feature Source Requirements

For each Bundle 2 GOAL 2 candidate, this table records the controlling/supporting source class it needs, whether that source is already available locally, and the sufficiency result.

| Candidate | Source class needed | Already available locally? | Sufficiency result | Fail-closed behavior if insufficient |
| --- | --- | --- | --- | --- |
| Deeper step-by-step argument-building guidance | Same per-topic CBA article citations already verified in Part A | Yes — reuses existing `verified_current` anchors, no new citation needed | `sufficient` | If a topic has fewer than the existing minimum anchor count, argument-step generation for that topic is withheld, not invented |
| Investigative-interview preparation workflows | Procedural citations already verified (Article 15 grievance procedure, Article 17 steward access/investigation) | Yes | `sufficient` for topics that already cite Art. 15/17; generic (non-cited) interview technique content is procedural guidance, not a legal claim, and carries no citation | `sufficient`, with generic-guidance sections explicitly labeled as non-cited practice guidance, never presented as contract text |
| Issue-fact collection checklists | No CBA citation required — structural checklist only, keyed to each topic's existing "Separate verification" fact list already documented in Part A | Yes (already written as prose per topic) | `sufficient` | N/A — non-citable content is clearly labeled, not gated |
| Evidence-request / document-request planning | Same as issue-fact checklists — derived from each topic's existing "Separate verification" list | Yes | `sufficient` | N/A |
| Multi-topic issue decomposition | Existing registry routing/collision logic and existing per-topic citations | Yes | `sufficient` | If topics collide ambiguously, fail closed to the existing routing-collision behavior (ask/disambiguate), never silently pick one |
| Packet sequencing and completion tracking | No new source — operates on the existing packet workspace data model | N/A (structural feature) | `sufficient` | N/A |
| Citation-backed "why this step matters" explanations | Same per-topic anchors as Part A | Yes | `sufficient` | If a step cannot be tied to an existing anchor, it is shown unlabeled/generic, never assigned a fabricated citation |
| Public-only escalation guidance | Verified official public contact/agency sources (e.g., NLRB, DOL/OSHA, EEOC, USPS OIG, national APWU) — **not currently in local cache** | **No** | `insufficient — research required` | Fail closed: no escalation contact is presented as verified until a separate future phase fetches and allowlists an official source; Bundle 3 must not fabricate or recall contact info from memory |
| Public contact-directory architecture | Same as escalation guidance — needs a new verified official source class | **No** | `insufficient — research required` | Bundle 3 may design the data model and empty-state UI for a future contact directory, but must ship with zero unverified contacts; the feature is `research_only` this cycle, matching the same label used for Part A candidates |
| Source-sufficiency and unsupported-topic warnings | Existing Part A `research_only`/`rejected` classifications | Yes | `sufficient` | This is itself a fail-closed mechanism; strengthening its visibility needs no new source |
| Reusable templates from public-only workflow results | No new source — templates are structural (topic + step sequence + existing citation set), stored via the existing Saved mechanism | N/A | `sufficient` | A template may never carry a citation the underlying topic doesn't already have; template creation is blocked for `research_only`/`rejected` topics |
| Printable and exportable steward packets | No new source — extends existing plain-text/Markdown export | N/A | `sufficient` | N/A |
| Narrow/mobile usability | No source dependency | N/A | `sufficient` | N/A |
| Saved organization and retrieval | No new source | N/A | `sufficient` | N/A |
| Source provenance visibility | Existing citation-anchor/paragraph-hash identities already computed | Yes | `sufficient` | N/A |
| Fail-closed behavior when coverage is insufficient | Existing Part A classification | Yes | `sufficient` | This *is* the fail-closed mechanism being extended, not a feature that needs it |

## Part C — Citation/Currentness Requirements For Bundle 3

Every Bundle 3 feature that displays or references contract text must satisfy the same `verified_current` gate already enforced by `lib/publicCitationIntegrity.ts` / `lib/cbaCitationIntegrity.ts` for Bundle 1/2 content. No Bundle 3 feature introduces a second, weaker citation-currentness path. A step, template, or interview-prep item that cannot resolve to a `verified_current` anchor must render as explicitly non-cited guidance or must not render at all — never as an uncited assertion presented with contract-text formatting.

## Part D — Escalation/Contact Source Note

Per the mission's explicit instruction, this phase does not fetch or synchronize new public sources and does not add URLs from memory. Any public contact or escalation-path information (union local, NLRB, DOL/OSHA, EEOC, USPS OIG, or similar) requires a **separate verified official source** to be allowlisted in a future phase before it can be marked `supported`. Until then, public-only escalation guidance and the public contact-directory architecture remain `research_only` and are represented in Bundle 3 (if included) only as an explicitly labeled, empty, fail-closed placeholder — never as populated but unverified contact data.

## Selection Result

- Existing ten supported topics: unchanged, `PASS`.
- Bundle 3 candidates with `sufficient` local sourcing: 14 of 16 reviewed.
- Bundle 3 candidates requiring new public-source research before they can be marked `supported`: public-only escalation guidance; public contact-directory architecture (both `research_only` this cycle).
- Source-sufficiency gate for the selected Bundle 3 (see `docs/public-steward-workflow-platform-bundle-3-decision.md`): `PASS`, on the condition that escalation/contact-directory work stays scoped to architecture-and-empty-state only in this cycle.

## Alignment With The Final Selected Bundle 3

`docs/public-steward-workflow-platform-bundle-3-candidate-matrix.md` selected exactly five
candidates for implementation — per-topic argument plans, structured evidence/document-request
checklists, packet sequencing and completion tracking, escalation-guidance strengthening within
existing sources only (no contact directory), and print-friendly export polish — and explicitly
deferred reusable public-only templates (source-sufficient but scope-deferred to keep Bundle 3
bounded) and any new supported topic (source-insufficient). All five selected candidates are
marked `sufficient` above and require no new source. The `research_only`/insufficient rows
above (contact-directory, new supported topics) are excluded from the selected bundle, not
merely deprioritized — see `docs/public-steward-workflow-platform-bundle-3-decision.md` for the
final scope statement.
