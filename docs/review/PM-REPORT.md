# KIA Stick: project manager report (KIA-jcim-qa-fix-1)

Date: Sat 2026-10-24, about 3:50 PM EDT. Written by KIA Lead's team from the work order and evidence files. Times are EDT (America/Detroit).
This is a status report. It records no QA pass and no acceptance.

## 1. Status
- **Fix branch kia/jcim-qa-fix-1 (tip 5381522c) is NOT mergeable.**
  - The final review (delta 5, 3:18-3:45 PM EDT) is **FAIL**, with blocking finding B-5.
  - Per Gurth's standing instruction there is no Amendment 6, so the Lead stopped the amendment loop after 5 rounds.
  - The work goes to an outside Claude review on branch kia/claude-review-2026-10-24. That branch is the fix branch plus these handoff docs.
- **Accepted checkpoint: 20562b3.** It has not moved. Nothing in this report is accepted.
- **main is at 47ebf51a.** The box served app (/workspace/kia-stick) runs 47ebf51a on 127.0.0.1:3000 only (restored by item E, review 2fa62ea6, PASS WITH CONDITIONS).
- **Owner QA, 2026-10-24 (t766u, 9:47 AM EDT):** Gurth's batched QA on main 47ebf51a failed 3 of 8 topics: annual leave, sick leave, safety and health. Overtime, holiday schedule, uniforms, higher level work and employee claim passed.
- **The fix branch itself:** local only. Not pushed, no PR, not merged, not deployed. Ledger status is FAIL_3_OF_8_FIX_PENDING_REQA and qa_pass_recorded is false.
- **Box data (Part B, 9:50-9:51 AM EDT):** .kia-public-data was set to mode 700 and the JCIM cache was re-synced to pin 2b3fcc2b (13 sections). All three source endpoints then reported available. The omarchy JCIM resync (t744u) was done earlier that morning.

## 2. What went wrong, and the fix history
**Root causes** (evidence rootcause.md, rootcause-2.md):
- The official topic matchers needed an extra qualifier word. Plain questions such as "How does sick leave work?" matched no topic and got no answer.
- When no official topic matched, auto mode fell through to the fake sample corpus. "How much annual leave do I get?" was answered silently from fake documents F-001/F-002/F-008.
- JCIM citations used the NLRB label template, so they rendered "retrieved undefined · undefined".
- Holiday did cite the correct 11.6 unit, but the label hid "11.6". The "wrong unit" theory was disproved.

| Step | Commit(s) | What it did | Review |
|---|---|---|---|
| Part A | abb160fe | plain-phrasing routing, fake-lane guard, JCIM label fix | PASS WITH CONDITIONS (9ad386e6), NB-1..NB-8 |
| Amendment 1 | 42ec8bf3 | added everyday words (vacation, PTO, time off, hazard, injury, OSHA) | delta 1 **FAIL, B-1**: wrong official topics (workers' comp to safety, holidays and other leave types to annual leave) |
| Amendment 2 | 6816de1a, 0420caa2 | exclusion lists for the B-1 cases | delta 2 **FAIL, B-2**: the same families came back with new spellings, plus one new regression |
| Amendment 3 | 8fdc948a, 3296825e | flipped to allowlists with default no-answer and competing-word families | delta 3 **FAIL, B-3**: "time off"/"PTO" plus an unlisted reason still gave an annual-leave answer |
| Amendment 4 | 4a5e6b56, eec28651, 6429ae48 | vacation-reason allowlist; fake lane only for labelled or canned questions | delta 4 **FAIL, B-4**: fixed probe clean, but 18 of 37 fresh questions got confident wrong answers |
| Amendment 5 | 2353de11, 5f357b85, 5381522c | **closed vocabulary**: annual leave and safety answer only when every word is in a known set | delta 5 **FAIL, B-5** (ec6778b4): 19 confident wrong safety (Art 14) answers to personal injury or illness questions |

In plain terms, each word-list round closed the rows the Reviewer had listed. Then fresh phrasings found new wrong answers. The closed vocabulary in Amendment 5 fixed annual leave: 0 wrong answers in every set the Reviewer ran. It did not fix safety.

B-5 examples are "Is it unsafe to work with a cold?" and "Is it dangerous to work with an injury?".
- **Cause:** the words cold, injury, accident and exposed are in the safety word set with no context rule, and the shared filler words (with, have, got, if, for, on, me) let personal sentences through.
- **Where the 19 came from:** 4 were introduced by this branch, from 6429ae48 on. The other 15 were already wrong on main.
- **Suggested narrow fix (Reviewer):** give those words the same context rules that "condition" and "health" already have, and apply the second-sentence rule to safety.

## 3. What changed for users (on the branch; nothing is served)
- More questions get an honest "no answer" instead of a wrong or fake answer. The design rule is that a confident wrong answer is worse than no answer, and a fake answer to a real question is never acceptable.
- Gurth's 10 test phrasings and the 5 canned fake questions still work, byte-identical (delta 5). JCIM citations now show locators such as "Article 11.6" and never "undefined".
- **Accepted product change (Reviewer ruling (a), delta 4):** 11 unlabelled steward questions that used to get fake-sample answers in auto mode now get no answer. Examples: "Can I bring a steward to a meeting?" and "My supervisor is harassing me".
- **Lost answers.** Delta 5 ruled the 27 rows the Builder disclosed acceptable but under-disclosed. Several basic questions that now get no answer were never disclosed:
  - "Can I take vacation next month?"
  - "How is annual leave earned?"
  - "How much vacation do I have left?"
  - "Can I cash out my annual leave?"
  - "Can I refuse unsafe work?"
  - "Is it unsafe to work in the heat?"
  - "Is it unsafe to work around asbestos?"
- **Re-QA risk is HIGH for annual leave and safety.** Anything outside the closed set gets no answer. On safety, some personal-injury questions still get an Art 14 answer (B-5), which is the opposite of the goal.
- **The ledger and the Amendment 5 build doc overclaim.** They say any personal health word gets a no-answer, and B-5 shows that is false (NB-H1).

## 4. Gates still open (nothing is accepted)
1. B-5 fixed, plus a fresh independent review with no BLOCKING finding. Under Gurth's stop rule, this now goes through the Claude review and a Lead/Gurth decision, not Amendment 6.
2. NB-H1 (overclaim) and NB-H2 (undisclosed no-answers) corrected before any re-QA.
3. Node 22 CI green on the final head. The box runs Node v20.19.2, so every box result so far is preliminary.
4. Merge under Rule 1: head unchanged, then Greg pushes, opens the PR and merges.
5. Owner re-QA by Gurth on a build that contains the fix: the 3 failed topics plus the holiday citation display. The box still serves 47ebf51a.

## 5. Deferred items (tracked, not fixed)
- **NB-4:** the JCIM display `section` is now in serialized packet JSON.
- **NB-7:** jcimLocator can mislabel 3 units that no current selector reaches.
- **NB-8:** no accrual amount. That figure is in the ELM, which is not an admitted source.
- **NB-D1:** remaining safe no-answer gaps.
- **NB-D5:** one test runs at 4.57 s against a 5 s timeout.
- **NB-E3:** CBA labels read "Section section-6", and generic search shows "Article unknown".
- **Hazard-pay differential:** this question still gets the generic CBA passage search. Delta 5 NB-H4 adds a related served-mode case: two-sentence questions that end "What does the contract say…?" also fall back to that search.
- **10.4.D citation:** delta 3 found a family-emergency question answered with an Art 10 citation to 10.4.D. That passage is the employer's emergency exception and is easy to read backwards. At the tip, family-emergency wording gets no answer. Whether 10.4.D is still in the standard annual-leave answer is UNKNOWN.
- **E review N2:** /health hard-codes `publicSources.available: true`.
- **E review N6:** npm audit shows 11 advisories, 3 of them critical (next, vitest, tinypool).
- **Node versions:** Node v20 on the box vs Node 22 in CI.

## 6. Process lessons
- **Review loop.** An independent read-only Reviewer caught every wrong-answer class before merge. That took six reviews in one day and ended without a mergeable result. Each round tested only what the Reviewer had thought of, so passing the listed rows never showed that the design was sound.
- **Mutation testing** found untested guard words and dead patterns in every round. In Amendment 5, 518 mutants ran and 59 survived. Delta 5 ruled the 59 survivors acceptable and found that its own 18 targeted mutants were all killed. B-5 was a gap in the vocabulary design, not in the tests. Mutation testing is worth keeping for routing code.
- **Fixed acceptance probe** (from Amendment 4): a frozen question set (qs.json, 434 rows), plus each review's rows, plus a fresh sample. It turned "looks fixed" into a measurable bar. Every round passed the frozen set and then failed the fresh sample. A frozen set alone can't prove coverage of open-ended language.
- **Word lists, even closed ones, did not converge for free-text questions.** The routing design should be reconsidered (see QUESTIONS-AND-ISSUES.md Q1), rather than adding a sixth round of words.
