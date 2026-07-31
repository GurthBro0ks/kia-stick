# KIA-Stick Public Steward Workflow Platform Bundle 3 — Current-State Audit

Phase: `KIA-Stick-public-steward-workflow-platform-bundle-3-planning-and-secure-knowledge-boundary`

Target machine: `USER_LAPTOP_ONLY`

Status: `PLAN ONLY`. This document audits the actual Bundle 2 implementation as pushed at
`004c8fa1a4e95713da6351a8ac7f46e129e977fb`. It is grounded in source and tests, not in
README/CLOSEOUT bookkeeping prose. Every claim below cites an exact file, and where useful,
an exact line, type, or function name.

## 1. The ten supported public steward topics

Defined as the `PublicStewardWorkflowTopicId` union in
`lib/publicStewardWorkflowRegistry.ts:9-19`:

`annual_leave`, `overtime`, `holiday_scheduling`, `safety_health`, `discipline_just_cause`,
`sick_leave`, `higher_level_assignments`, `uniforms_work_clothes`, `employee_claims`,
`steward_grievance_handling`.

Each topic is one `PublicStewardWorkflowTopic` object (`lib/publicStewardWorkflowRegistry.ts:28-55`)
with: `id`, `templateId` (`public-grievance-outline.<id>.v1`), `displayName`,
`shortDescription`, `exampleQuestion`, `requiredSourceId` (always `CBA_SOURCE_ID`),
`requiredArticles`, `supportedScope`, `unsupportedScope`, `localVerification`,
`sourceSufficiency` (`status: "supported"`, `primaryArticle`, `supportingArticles`,
`minimumTopicParagraphs`), `positive`/`negative` regex arrays, `citationSpecs`
(exact paragraph-matching predicates), and `outlineLabels`.

Five topics are Bundle 1 (`annual_leave`, `overtime`, `holiday_scheduling`, `safety_health`,
`discipline_just_cause`); five are Bundle 2 additions (`sick_leave`,
`higher_level_assignments`, `uniforms_work_clothes`, `employee_claims`,
`steward_grievance_handling`). This exactly matches
`docs/public-steward-workflow-source-matrix.md` ("Selection result": 10 supported, 4
research-only, 1 rejected-as-standalone).

## 2. Registry and routing architecture

Routing is a **deterministic, local, regex-based matcher** — no ML, no external call, no
scoring/confidence model.

- `detectPublicStewardWorkflowTopic(question)` (`lib/publicStewardWorkflowRegistry.ts:709-719`)
  normalizes the question (`trim().toLowerCase().replace(/\s+/g," ")`), rejects fake/sample
  probes (`/\b(fake|sample)\b/`), then filters `PUBLIC_STEWARD_WORKFLOW_TOPICS` to topics whose
  `negative` guards do **not** match and whose `positive` patterns **do** match. It returns a
  topic id only if exactly one topic matches; otherwise `null`.
- `publicStewardWorkflowMatch(question)` (`lib/publicStewardWorkflowRegistry.ts:721-744`) is
  the richer form used for diagnostics: it returns `topicId`, the full `matchedTopicIds` array,
  an `ambiguous` boolean (`matchedTopicIds.length > 1`), and `unsupportedCandidateId` (a
  `research_only`/`rejected` candidate id whose `routing` regex matched, if any).
- `topicParagraphs(sourceParagraphs, topic)` (`lib/publicStewardWorkflowRegistry.ts:748-762`)
  resolves each topic's `citationSpecs` against the **live** cached CBA source; if any spec
  fails to resolve, it returns `null` — this is the runtime fail-closed path (source drift ⇒
  no outline, not a stale outline).

## 3. Topic eligibility and ambiguity handling

- Ambiguity is a first-class routing state, not an error: `ambiguous: true` when 2+ topics'
  `positive` patterns match with no disqualifying `negative` guard. Each supported topic
  carries an explicit, documented "Collision risk" and the regex `negative` guard that resolves
  it (e.g. `sick_leave` vs `annual_leave`, `steward_grievance_handling` vs NLRB Weingarten).
- `tests/publicStewardRoutingCollision.test.ts` is the dedicated regression suite for this
  behavior (collision pairs between the 10 supported topics and between supported topics and
  `research_only`/`rejected` candidates).
- Unsupported candidates (`research_only`, `rejected`) live in
  `PUBLIC_STEWARD_RESEARCH_CANDIDATES` (`lib/publicStewardWorkflowRegistry.ts:648-698`), each
  with `id`, `primaryArticles`, `result`, `boundedScope`, `separateVerification`, `reason`, and
  a `routing` regex used only to detect and label the near-miss — never to build an outline.

## 4. Source sufficiency mechanism per topic

Each `PublicStewardWorkflowTopic.sourceSufficiency` records `status: "supported"`,
`primaryArticle`, `supportingArticles`, and `minimumTopicParagraphs`. Sufficiency is enforced
twice:

1. **Design time**: `docs/public-steward-workflow-source-matrix.md` documents, per topic, the
   exact allowlisted CBA paragraphs (`cba-pdf-pNNN-pNN` ids), their `p-hash`
   (`cba-paragraph-content.v1`) and `anchor` (`cba-citation-anchor.v1`), and a stated "Reason"
   for why that paragraph set is enough for a bounded, case-neutral outline.
2. **Runtime**: `topicParagraphs()` re-resolves every `citationSpecs` entry against the live
   cache; any unresolved spec makes the whole topic fail closed for that build (no partial
   outline is ever produced).

Topics that did **not** clear this bar stay `research_only` (`seniority_assignment_administration`,
`hours_work_scheduling`, `craft_jurisdiction`, `training_qualification`) or `rejected`
(`grievance_procedure_timeliness` — rejected specifically because a standalone builder would
require private dates/case facts). Unsupported topics remain visible in Sources but have no
builder — this is the existing fail-closed convention Bundle 3 must reuse rather than invent.

## 5. Citation-currentness enforcement

`lib/publicCitationIntegrity.ts` (mirrored by `lib/cbaCitationIntegrity.ts` for the CBA source)
defines a hash-chain re-verification, not a cached boolean:

- `derivePublicSourceInstance(source)` hashes `{cacheSchema, normalizedContentSha256,
  responseSha256, sourceId}` into `sourceInstanceId` (`public-source-instance.v1`).
- `derivePublicCitationIntegrity(source, section, paragraph)` computes
  `paragraphContentSha256` (`public-paragraph-content.v1`) and a `citationAnchorSha256`
  (`public-citation-anchor.v1`) over `{paragraphContentSha256, paragraphId, sectionId,
  sourceId, sourceInstanceId}`.
- `verifyPublicCitation(citation, source)` re-derives all of the above against the **current**
  loaded cache and returns one of: `verified_current`, `cache_unavailable`,
  `legacy_unverifiable`, `invalid_metadata`, `source_instance_changed`, `paragraph_missing`,
  `paragraph_changed`, `locator_changed`. Only `verified_current` is export-eligible.

This means "currentness" is re-checked on every read against the live local cache file, not
asserted once at build time. Any edit to the cached source (even a whitespace change) flips
paragraphs to `paragraph_changed`/`locator_changed` and blocks export. This is the mechanism
any Bundle 3 feature that emits new cited content (argument steps, evidence requests) must
reuse unmodified.

## 6. Twelve-section outline architecture

`PublicGrievanceOutline` (`lib/publicGrievanceOutline.ts:50-77`) has exactly twelve content
fields beyond identity/version metadata: `title`, `issue`, `governingContractLanguage`,
`elementsToEstablish`, `factsToConfirm`, `evidenceToRequest`, `questionsForManagement`,
`stepOneArgument`, `possibleRemedies`, `timelinessAndProcedureLimits`, `escalationReadiness`,
`limitations`. Ten of these are `CitedGrievanceOutlineItem[]` (`{text, citationIds[]}` —
`lib/publicGrievanceOutline.ts:45-48`) or `string[]` for the two fact-gathering sections
(`factsToConfirm`, `questionsForManagement`), which are deliberately citation-free because they
ask the user/steward to supply facts, not law.

Every citation used in a section resolves to a `Citation` object carrying
`sourceInstanceId`/`paragraphContentSha256`/`citationAnchorSha256`
(`lib/publicCitationIntegrity.ts:27-35` shape, mirrored for CBA), so a section's citations can
be independently re-verified even after the outline object is Saved to `localStorage`.

`PublicStewardPacket` (`lib/publicStewardPacket.ts:47-74`) reuses the same shape at the
multi-topic level: `governingContractLanguage`, `factsToConfirm`, `evidenceChecklist`,
`managementQuestions`, `stepOnePreparation`, `procedureCaveats`, `escalationReadiness`,
`limitations`, plus packet-only fields `overlapConflictNotes` (topic-collision notes across the
1-3 selected topics) and `sourceAppendix` (per-citation article/section/paragraph/hash
appendix). There is **no** `sequence`, `progress`, or `completedSteps` field on either type —
outlines and packets are static, fully-generated documents, not staged workflows.

## 7. Packet workspace behavior

`PublicStewardPacket.selectedTopicIds: PublicStewardWorkflowTopicId[]`
(`lib/publicStewardPacket.ts:51`) holds 1-to-3 topic ids. The packet aggregates each topic's
`buildPublicGrievanceOutline()` output (`lib/publicStewardPacket.ts:8-13`) into one merged,
deduplicated document via `uniqueStrings()` and citation-id dedup helpers
(`lib/publicStewardPacket.ts:78+`). `topicSummaries: PublicStewardPacketTopicSummary[]`
(`lib/publicStewardPacket.ts:27-33`) keeps each topic's `title`/`primaryArticle`/
`supportedScope`/`separateVerification` visible even after merging.
`tests/publicStewardPacketWorkspace.test.ts` covers the 1-3 topic bound, dedup, and
overlap-note generation. `PUBLIC_STEWARD_PACKET_PRIVATE_WARNING`
(`lib/publicStewardPacket.ts:24-25`) is carried on every packet: "Case-neutral public-source
workspace only. Do not enter names, dates, case facts, medical information, personnel data,
financial facts, or grievance documents."

## 8. Saved identity, migration, dedupe, and reopen behavior

`savedRecordId(savedType, saveKey)` (`lib/savedAnswers.ts:96-104`) is namespaced by
`savedType`: `"public-argument-plan"`, `"public-grievance-outline"`, `"public-steward-packet"`,
or the generic `"answer"` fallback, then hashed: `saved-<namespace>-<sha256(saveKey)>`. This
means the same logical content (same outline template + topic) always resolves to the same
Saved id — the dedup key is content identity, not insertion order — and `SaveAnswerStatus`
(`lib/savedAnswers.ts:84`) is one of `"created" | "replaced" | "duplicate"`, all handled
explicitly (`tests/savedRecordIdentity.test.ts`).

`migrateSavedAnswers(input)` (`lib/savedAnswers.ts:526+`) is a defensive parser: for each raw
stored item it re-derives `savedType` from structural shape guards
(`isPublicArgumentPlanLike`/similar predicates near `lib/savedAnswers.ts:439-505`), falls back
field-by-field (`provider`, `sourceId`, `sourceTitle`, etc.) to values recoverable from nested
citation objects, and drops anything that cannot be reconstructed into a valid `SavedAnswer`
rather than throwing. This is how legacy pre-Bundle-2 Saved records stay readable after schema
growth.

Reopen is UI-side in `components/KiaStickApp.tsx` (Saved list renders each record's
`savedType`-specific summary and routes "Open" back into the matching packet/outline/plan
view).

## 9. Export formats

Two parallel export paths exist per artifact type (outline, packet; the older single-answer and
Weingarten-plan paths use the same pattern):

- **Plain text**: clipboard copy, gated by `publicGrievanceOutlineExportEligibility(outline,
  source)` (`components/KiaStickApp.tsx:3187-3197`) — export is blocked unless the outline's
  citations are `verified_current` **at copy time**, not just at build time.
- **Markdown**: `publicGrievanceOutlineToMarkdown(outline)` /
  `publicStewardPacketToMarkdown(packet)` build a `Blob` (`text/markdown;charset=utf-8`)
  delivered through a `DownloadLink` component (`components/KiaStickApp.tsx:3207-3216`,
  `:3401-3410`) with fixed filenames (`kia-stick-fake-vault-audit.md` pattern for the
  fake-only surfaces; outline/packet exports use their own descriptive names).
- Both paths surface a visible `verified-current export ready` / `export blocked` badge
  (`components/KiaStickApp.tsx:3293-3294`) so the fail-closed state is never silent.

No PDF, no print stylesheet, no server-side export endpoint — export is 100% client-side and
local.

## 10. Sources discovery behavior

Two allowlisted, read-only, **local-file-backed** source classes exist — there is no live
network fetch path in the runtime:

- `app/api/public-cba-source/route.ts` → `readBoundedCbaSourceCache()`
  (`lib/cbaSourceServer.ts`) → `.kia-public-data/apwu-usps-cba-2024-2027.{json,pdf}` — the
  controlling CBA text backing all 10 supported topics.
- `app/api/public-source/route.ts` → `readBoundedPublicSourceCache()`
  (`lib/publicSourceServer.ts`) → `.kia-public-data/nlrb-weingarten-rights.json` — official
  general NLRB guidance (`PUBLIC_SOURCE_CLASS = "official_guidance"`,
  `PUBLIC_SOURCE_POSTAL_APPLICABILITY = "unverified"`,
  `PUBLIC_SOURCE_CONTROLLING_FOR_USPS = "no"`, `lib/publicSource.ts:1-18`) used **only** by the
  Weingarten argument-plan pilot, not by the 10-topic steward registry.

Both routes reject any query string (`400 route_query_rejected`) and set
`Cache-Control: no-store` — this is a defensive "no parameterized remote proxy" contract, not
an oversight. `/health` reports `publicSources.count: 2` (`app/health/route.ts:29-33`),
confirming exactly these two source classes exist today.

## 11. Settings, `/health`, and `/version` truth contracts

- `/health` (`app/health/route.ts`) is a hardcoded-phase JSON payload: `phase` is a **string
  literal** (`LOCAL_RUNTIME_PHASE`, currently the Bundle 2 phase name, `app/health/route.ts:11-12`)
  that must be hand-updated on every accepted-phase change; it also reports
  `acceptedCheckpoint`/`acceptedCommit`/`repositoryRecordingCommit`/
  `latestPushedCloseoutCommit` sourced from `lib/acceptedState.ts` (which itself reads
  `data/current-accepted-pushed-state.json`), `supportedStewardTopicCount:
  PUBLIC_STEWARD_WORKFLOW_TOPICS.length`, `privateData: "blocked"`, `externalAi: "disabled"`,
  and the full `RuntimeVersion` object.
- `/version` (`app/version/page.tsx`) renders the same `RuntimeVersion` fields
  (`displayVersion`, `productVersion`, `promptVersion`, `provider`, `corpusVersion`,
  `indexVersion`, `buildDate`, `gitSha`).
- Settings (`SettingsPanel`/`SettingsContent`, `components/KiaStickApp.tsx:1038+`) splits a
  **user-facing summary** from **operator diagnostics** (per the historical "Public Settings
  User Summary and Operator Diagnostics Split" capability) and derives repository-equality
  claims from `currentAcceptedPushedState`, not from a re-run `git` comparison at request time.
- This is a hand-maintained, string-literal truth contract, not a generated one. This is the
  exact mechanism that produced the long run of `v1.1.x` "Settings operator status current
  accepted pushed refresh" bookkeeping docs in `docs/` — a materially relevant limitation (see
  §13).

## 12. Fake/public separation

- `content/fake-docs/*.md` — each file must literally contain the banner
  `"FAKE SAMPLE DOCUMENT — NOT REAL CONTRACT LANGUAGE — FOR KIA STICK TESTING ONLY"` and must
  **not** match `/\bAPWU\b/i`, `/\bUSPS\b/i`, `/\bUnited States Postal Service\b/i`, or
  `/\bAmerican Postal Workers Union\b/i` — enforced by `scripts/check-fake-docs.mjs` (43
  lines), run as `npm run scan:fake`, also requires ≥12 fake docs.
- `.kia-public-data/apwu-usps-cba-2024-2027.{json,pdf}` is the **real, public** CBA text (a
  publicly published union contract, not private/member data) and is explicitly exempt from
  the fake-doc banner/term rule because it is a different, allowlisted, real-but-public source
  class — this is the load-bearing distinction between "fake sample" (Upload/Import/Vault demo
  scaffolding) and "public source" (the 10-topic steward registry and the Weingarten pilot).
- `scripts/privacy-scan.mjs` (94 lines) separately checks all git-tracked files for forbidden
  path prefixes (`uploads/`, `data/private/`, `data/real-documents/`, `data/quarantine/`,
  `data/redacted-approved/`, `exports/`, `backups/`, `vector-store/`, `DB/`), forbidden
  extensions (archives, `.apk`/`.xapk`, `.so`, `.luac`, capture formats), and secret patterns
  (private keys, API keys, tokens, Slack/GitHub/OpenAI-shaped secrets).

## 13. Existing limitations that materially affect users

- **No step-by-step argument builder for any of the 10 CBA topics.** The only step-by-step
  "argument plan" in the codebase (`lib/publicArgumentPlan.ts`, `argumentSteps:
  CitedArgumentPlanItem[]`) is hardcoded to a single fixed topic — Weingarten rights — sourced
  from the separate NLRB guidance cache, gated by `isWeingartenArgumentIntent()`
  (`lib/publicArgumentPlan.ts:65-71`). It is architecturally unconnected to
  `PublicStewardWorkflowTopic`/`PublicGrievanceOutline`. The outline's `stepOneArgument` field
  is a flat `CitedGrievanceOutlineItem[]`, not a sequenced/numbered plan.
- **No packet sequencing or completion tracking.** Neither `PublicGrievanceOutline` nor
  `PublicStewardPacket` has a progress/step-status field; both are static generated documents.
- **No contact-directory / escalation-source class.** `publicArgumentPlan.ts:221` literally
  states in its own output: `"A verified national contact-directory source is not included in
  this pilot."` No contact-directory source cache exists anywhere in `.kia-public-data/`.
  `escalationReadiness` sections in outlines/packets are populated only from CBA
  procedural-appeal citations (e.g., Step 2/arbitration language), not from any external
  contact or agency source.
- **Settings/`/health` truth is hand-maintained, not derived.** `LOCAL_RUNTIME_PHASE` in
  `app/health/route.ts` and the phase strings embedded in `scripts/operator-qa-smoke.mjs`,
  `scripts/synthetic-governance-report.mjs`, and `scripts/design-contract-check.mjs` are
  independent string literals that must be kept in sync by hand across every phase. This is
  the direct cause of the very long run of `docs/v1.1.x-*` refresh checkpoints — a process cost
  the mission explicitly wants to stop repeating, not a Bundle 3 feature target.
- **Evidence/document-request guidance is generic per section, not topic-tailored beyond the
  citations already in `evidenceToRequest`.** There is no structured "what document, from
  whom, citing which paragraph" checklist distinct from the outline's existing prose items.
