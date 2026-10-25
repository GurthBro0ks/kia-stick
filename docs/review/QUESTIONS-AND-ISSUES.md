# KIA Stick: open questions and known issues

Date: Sat 2026-10-24, about 3:50 PM EDT. Code is at kia/jcim-qa-fix-1 tip 5381522c (base main 47ebf51a); these docs ride on branch kia/claude-review-2026-10-24. Accepted checkpoint stays 20562b3. Nothing here is accepted or QA-passed.
**Status: NOT mergeable.** The final review (delta 5, `KIA-jcim-qa-fix-1-review-delta-5.md`, sha256 ec6778b4…) is FAIL with blocking finding B-5. The Lead stopped the amendment loop after 5 rounds, per Gurth's instruction (no Amendment 6). The work is sent to Claude for an outside review.
File:line references are at tip 5381522c unless marked otherwise. UNKNOWN means the team doesn't know.
Evidence lives outside the repo in the team's evidence folder (names like `KIA-jcim-qa-fix-1-review-delta-4.md`). It is cited by name only.

---

## Part 1: open questions (for Gurth or Claude)

### Q1. Is regex/keyword routing the right design at all?
- **Today:** topic selection is regexes plus word lists in `lib/publicStewardWorkflowRegistry.ts`. Positive matchers are per topic (for example safety at :265-271). Competing-word families are at :768-929. Closed vocabularies are `annualLeaveClosedVocabulary` :972 and `safetyClosedVocabulary` :1021, combined in `matchedSupportedTopicIds` :1035. The router is `lib/chatAnswerRouter.ts` `resolveChatAnswerLane` :78-88.
- **History:**
  - Five review rounds (B-1..B-5) each closed the listed rows, and fresh phrasings then found new confident wrong answers.
  - Amendment 5 (closed vocabulary) held for annual leave: 0 wrong answers in delta 5.
  - It failed for safety (B-5): 19 personal injury or illness questions answer Art 14. Meanwhile basic questions such as "Can I refuse unsafe work?" get no answer.
  - So even a closed word set gives too little coverage and still lets wrong answers through.
- **Options to weigh (none chosen):**
  - (a) keep the closed vocabulary and widen it carefully, row by row;
  - (b) a menu or guided topic picker, so the user chooses the topic and free text only fills in facts;
  - (c) suggest topics but always ask the user to confirm before answering;
  - (d) a local-only classifier. AGENTS.md forbids cloud calls, so it would have to be fully offline. Cost and risk are UNKNOWN.
- **Question:** should KIA keep keyword routing at all, or move to one of these? Which direction does Gurth want? The answer also decides whether B-5 gets the narrow fix (I-0) or is replaced by the new design, and how much of the 7 QA-fix test files (Q8) is worth keeping.

### Q2. What should the phrasings that lost their answer do?
Amendment 5 turned these from an answer into a no-answer (amend-5 build D5; claude-progress.md Amendment 5 bullet):
- **"Annual leave accrual", "Can I sell back annual leave?", "Annual leave payout when I retire".** Accrual rates and leave payout are mostly in the ELM (Employee and Labor Relations Manual), which is not an admitted source (NB-8). Should these stay a no-answer, get a fixed "this is in the ELM, not in the sources KIA has" message, or wait until the ELM is admitted? UNKNOWN whether admitting the ELM is in scope.
- **"Vacation for a family trip".** "family" is allowed only before "visit". Should "family trip" be allowed?
- **Pregnancy safety: "Health and safety rules for my pregnancy", "Is it unsafe to work while pregnant?".** Personal-condition words block safety on purpose. Should these route to Art 14, or to a fixed referral (the pregnancy, accommodation and FMLA topics are not in the admitted sources), or stay a no-answer?
- **Also lost:** "Health concerns about my working hours", "Is it unsafe to work 16 hours?" and "Do I get higher level pay during annual leave?".

### Q3. NB-G2: "Sick leave for a National Guard drill"
- At tip it answers **sick_leave** (Art 10 + JCIM 10.6). The probe oracle classed that as correct because the user named sick leave (amend-5 probe-results `at-tip-5381522/class-d4-fresh.json`).
- But "Sick leave for military duty" is pinned to a **no-answer** (`tests/jcimQaFix1Amend5.test.ts:237`, `tests/jcimQaFix1Amend4.test.ts:228`). Subpoena-style reasons behave like the National Guard case (delta-4 NB-G2).
- **Question:** should a different leave purpose (military, court) always win and give a no-answer, even when "sick leave" is named? The current behaviour is inconsistent between "military" and "National Guard drill".

### Q4. Employee claim: phone damage gets a no-answer
- "Employee claim for my phone damaged in an accident" gets a no-answer. "accident" is injury-family wording, so safety_health and employee_claims tie and the question is treated as ambiguous. It is pinned at `tests/jcimQaFix1Amend4.test.ts:357`. The Builder's reason was that an on-duty injury could involve OWCP, so a confident Art 27 answer might be wrong.
- "Can I file an employee claim for damage from my injury?" is also a no-answer (NB-D3).
- **Question:** should explicit "employee claim" plus property words (phone, glasses, car) win Art 27 when no person-injury word appears? Or should it stay a no-answer for re-QA? Gurth passed Employee Claim on 2026-10-24 with "How do I file an employee claim?", which still works.

### Q5. Should the fake sample lane exist at all?
- **Today:** fakes answer only an explicit Fake source selection (`chatAnswerRouter.ts:81`), fake/sample-labelled questions (`isLabelledFakeQuestion` :32) and the 5 canned questions (`lib/answerGovernor.ts:130-136`, matched at `chatAnswerRouter.ts:86`). The UI default scope is still "All Fake" (rootcause-2: `components/KiaStickApp.tsx` about :378-381 at 47ebf51a).
- **History:** before the fix, auto mode silently answered "How much annual leave do I get?" from fakes F-001/F-002/F-008.
- AGENTS.md and DESIGN.md still describe the product as a "fake sample documents only" MVP. The app now also serves public CBA/JCIM/NLRB lanes (see I-12).
- **Question:** remove the fake lane from chat (keep it only for tests or demos), keep it behind the explicit selector only, or keep it as it is now? If it goes, much of `lib/answerGovernor.ts` (524 lines) and the fake corpus plumbing may become dead code. Claude should measure this.

### Q6. npm audit criticals: what is the upgrade policy?
- `npm audit` against the tip lockfile (run 2026-10-24 on a /tmp copy of package.json and package-lock.json) shows 11 advisories: 1 moderate, 7 high, 3 critical. Matches E review N6.
- **Critical:**
  - `next` (direct, 15.5.19 locked; advisories on Server Actions DoS/SSRF and cache confusion);
  - `vitest` (direct, dev);
  - `tinypool` (transitive via vitest).
- **High:** brace-expansion, js-yaml, nanoid, postcss, sharp, source-map-js, vite.
- The app binds 127.0.0.1 only, and it is UNKNOWN whether it uses Server Actions. Real exposure is UNKNOWN.
- **Question:** may we do a dependency-bump branch, behind Node 22 CI and Rule 1 review? Who approves lockfile changes?

### Q7. Is "How do I report an injury?" right as Art 14?
- `injury` is in `SAFETY_CLOSED_WORDS` (`publicStewardWorkflowRegistry.ts:1010-1017`), and "How do I report an injury?" is pinned to Article 14.1 (`tests/jcimQaFix1Amend4.test.ts:350`). Injury reporting also involves OWCP forms (CA-1/CA-2), which are not in the sources.
- Related: unconditioned `injury`/`accident` in that set is part of the B-5 cause (I-0).
- **Question:** is an Art 14 answer acceptable for this, or should it carry a fixed OWCP note? This is a domain call for Gurth.

### Q8. What should happen to the 7 QA-fix test files?
- 1,497 added test lines across `tests/jcimQaFix1*.test.ts` (Amend3 172 tests, Amend4 268, Amend5 328). Many rows overlap.
- **Question:** once the routing approach is settled (Q1), consolidate them into one table-driven acceptance file plus the fixed probe set?

---

## Part 2: known issues

| ID | Severity (team view) | Issue | Location | Status |
|---|---|---|---|---|
| I-0 | **BLOCKING** | **B-5 (delta 5):** the closed safety vocabulary admits personal injury and illness questions. 19 distinct rows give a confident CBA Art 14 + JCIM 14.1 answer in both envs. Examples: "Is it unsafe to work with a cold?", "Is it dangerous to work with an injury?", "I have an injury, is it unsafe to work?", "Is it unsafe to work? I have a cold." 4 were introduced by this branch from 6429ae48 on (all use the Amendment 3 `dangerous … work` positive); 15 were already wrong on main. Rows: evidence `KIA-jcim-qa-fix-1-review-delta-5-artifacts/B-5-rows.md`. **Cause:** `accident(s)`/`injury(ies)` at :1012 and `cold`/`exposed` at :1016 have no context rule; the shared filler list at :939-941 contains with/have/got/if/for/on/me/my/i; `safetyClosedVocabulary` at :1021-1033 has context rules for `condition`/`health` only, with no personal-context rule and no second-sentence rule. Also: positives at :265 and :270-271; `TOPIC_COMPETING_FAMILIES.safety_health` at :924 has no injury family. **Suggested narrow fix (Reviewer, not an instruction):** give cold / injury / injuries / accident / accidents / exposed context rules like `condition`/`health`, for example "cold" only after "the"/"in", and injury/accident only next to report/reporting/form/deadline. Or reject "work with / if I have / I got / I have been in" personal constructions. In either case, apply the annual-leave second-sentence rule to safety. Keep the pinned row "Is it dangerous to work in the cold?" (`tests/jcimQaFix1Amend4.test.ts:338`) | `lib/publicStewardWorkflowRegistry.ts:1012`, `:1016`, `:939-941`, `:1021-1033` | open, **first to fix** |
| I-0a | High | **NB-H1, overclaim:** `feature_list.json` `owner_qa_batch_1.reqa_disclosed_no_answer` item 6 and the Amendment 5 build doc say any personal health or condition word (and any unknown word) gets a no-answer. B-5 shows that is false for injury, accident and cold | `feature_list.json:14516` (owner_qa_batch_1 line); evidence `KIA-jcim-qa-fix-1-amend-5-build.md` | open |
| I-0b | High (re-QA risk) | **NB-H2, undisclosed no-answers.** These gave an answer at 6429ae48 and give a no-answer at the tip; they are not in the ledger disclosure. Delta 5 ruled the Builder's 27 disclosed losses acceptable but the disclosure incomplete; re-QA risk is HIGH for annual leave and safety. **Annual leave:** "Can I take vacation next month?" / "…in July?" / "…this summer?", "How much vacation do I have left?", "How do I sign up for vacation?", "How does vacation bidding work?", "Can I cash out my annual leave?", "How is annual leave earned?", "How many hours of annual leave do I earn?", "Can I take annual leave in hours?", "Can I swap vacation weeks with a coworker?", "Can I take vacation with my family?". **Safety:** "Can I refuse unsafe work?", "Is it unsafe to work in the heat?", "…around asbestos?", "…in cold conditions?", "There are exposed electrical panels on the dock, is that unsafe?" (only singular "panel" is in the set), "Is there a safety and health committee?", "Is it unsafe to work 12 hours?". Source: evidence `KIA-jcim-qa-fix-1-review-delta-5-artifacts/losses-fresh5.md` | closed sets at `lib/publicStewardWorkflowRegistry.ts:937-1033` | open |
| I-0c | Low | **NB-H3:** "I was exposed, is it unsafe to work?" gets Art 14 (ambiguous; note it for re-QA) | `:1016` (`exposed`) | open |
| I-0d | Low | **NB-H4:** in served mode, two-sentence questions ending "What does the contract say about …?" (for example "My dad died. What does the contract say about time off?") fall back to the generic CBA passage search. Main behaves the same way | CBA passage-search path in `lib/cbaAnswer.ts` (line UNKNOWN) | deferred |
| I-1 | High (gate) | Delta review 5 is done: FAIL B-5. Rulings: the 59 surviving mutants are acceptable; the lost answers are acceptable but under-disclosed (I-0b). Loop stopped; no Amendment 6 | branch tip 5381522c | closed: FAIL |
| I-2 | High (gate) | Node 22 CI not run. Box is Node v20.19.2; all box test results are preliminary (378 files / 2340 tests passed at 5381522 on v20) | `.github/workflows/ci.yml` (node-version 22) | open |
| I-3 | High (gate) | Not mergeable (I-0); not merged under Rule 1. Owner re-QA of annual / sick / safety + holiday citation display pending; the box still serves 47ebf51a | — | open |
| I-4 | Medium | E review N6: npm audit shows 3 critical (next, vitest, tinypool) and 7 high | `package.json`, `package-lock.json` | deferred, see Q6 |
| I-5 | Medium | E review N2: /health hard-codes `publicSources.available: true` even when CBA/NLRB report cache_unsafe. It also reports `targetMachine: "USER_LAPTOP_ONLY"` while running on the box | `app/health/route.ts:26`, `:28-32` | deferred |
| I-6 | Low | NB-E3: CBA citation labels read "Section section-N" (sectionId used raw), and some reviewed CBA Art 14 citations are labelled Section 6 while the text is §1/§2. Generic CBA search shows "Article unknown · section-unknown" | `lib/sourceModel.ts:339`; `lib/cbaAnswer.ts:63` | deferred |
| I-7 | Low | Hazard-pay differential: "Is a hazard pay differential in the contract?" gets the generic CBA passage search instead of a topic answer or no-answer. It is the only OTHER row on phrasings sheet 6 | `tests/jcimQaFix1Amend2.test.ts:64` (row); search path in `lib/cbaAnswer.ts` (line UNKNOWN) | deferred |
| I-8 | Low | 10.4.D citation (delta 3): a family-emergency question got an Art 10 answer citing 10.4.D ("advance commitments… honored except in serious emergency situations"). That is the employer's exception and is easy to read backwards. At tip, family-emergency wording gets a no-answer. Whether 10.4.D is still in the standard annual-leave answer is UNKNOWN: tip labels show Art 10 Section 4, PDF 56-57 | annual-leave paragraph selection in `lib/publicStewardWorkflowRegistry.ts` `topicParagraphs` (:1112) | deferred, verify |
| I-9 | Low | NB-4: JCIM display `section` (for example "Article 11.6") is now in serialized packet JSON. id, contentIdentity and anchors are unchanged; older saved citations keep the old text | `lib/jcimSource.ts:58` | deferred (disclose) |
| I-10 | Low (latent) | NB-7: `jcimLocator` matches "Article N" anywhere in the first 40 chars. 3 real units would get misleading locators (pdf147-unit8 → "Article 25", pdf164-unit5 → "Article 17.3", pdf166-unit1 → "Article 17.4"). None is reachable via the current selectors | `lib/jcimSource.ts:44-47`, selectors :90-101 | deferred |
| I-11 | Low (content) | NB-8: annual leave answers give the Art 10 scheduling/denial outline, not accrual amounts (ELM not admitted) | — | deferred, see Q2 |
| I-12 | Low (docs) | AGENTS.md says "fake sample documents only" and forbids "real APWU, USPS… documents", but the app serves public CBA/JCIM/NLRB lanes. AGENTS.md step 4 says to run `./scripts/git_auto_sync.sh` after QA, which conflicts with the team rule "no git_auto_sync.sh / no KIA_ALLOW_PUSH" | `AGENTS.md:9`, `:24`, `:46`; `scripts/git_auto_sync.sh:43` | open |
| I-13 | Low | NB-D1: safe no-answer gaps remain by design ("What are my safety rights?", "Safety & health?", "hurt at work", "What if I get sick at work?", "Can my leave request be denied?", bare or plural words, holiday wording). Phrasings sheet 6: 213 of 266 rows are no-answer | registry | deferred |
| I-14 | Low (test) | NB-D5: one test (v098) ran 4.57 s against a 5 s timeout under contention, a flake risk | `tests/v098SyntheticGovernanceReportHardening.test.ts` | deferred |
| I-15 | Low (test) | 59 mutants survive in routing (Amendment 5). They were argued equivalent or safe and checked by a 1,138-row probe, not killed | `lib/publicStewardWorkflowRegistry.ts` competing families :768-929 | ruled acceptable in delta 5 (17 spot-checked, 0 probe changes) |
| I-16 | Info | E review N8: /version and /health compute gitSha at runtime via `git rev-parse`, so served-build identity relies on BUILD_ID plus timing | `app/health/route.ts`, `app/version` | deferred |
| I-17 | Info | Node mismatch: box v20.19.2, CI 22, omarchy v26 (resync record) | — | open |
| I-18 | Info | Evidence slip: the Amendment 4 handoff called qs-full.json "434 questions"; the 434-row file is qs.json (sha256 9aa1aa5a…). Disclosed by Builder and Reviewer | work order Amendment 4 | closed (disclosed) |

Deferred by work-order decision (Amendments 1 and 3): NB-4, NB-7, NB-8, NB-D1, NB-D5, NB-E3, and the hazard-pay differential search answer.
