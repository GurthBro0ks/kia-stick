# Public source authority model

KIA Stick classifies authority by source, issue, employee coverage, and exact citation. A nominally higher source rank never removes the need to check scope, craft, status, effective dates, incorporated materials, local agreements, memoranda, and case facts. Conflicting sources must be displayed separately; the application must not blend them into an unsupported rule.

## Authority roles

1. **CBA controlling contract language.** The exact official final 2024–2027 APWU-USPS Collective Bargaining Agreement is the only contract source ingested in Pilot 1B. It is controlling contract language for covered APWU bargaining-unit employees with scope caveats. Citations identify the PDF page, verified printed page when available, article, section, subsection, paragraph, retrieval time, PDF hash, and normalized hash.
2. **JCIM joint interpretation.** Not ingested. A future exact-source gate and separate authority label are required.
3. **Signed national MOUs and Letters of Intent.** Only material contained within the approved official CBA PDF is present. No additional document is ingested.
4. **Official USPS handbooks or manuals.** Not ingested. Incorporation and issue relevance would need explicit review.
5. **National settlements and arbitration decisions.** Not ingested.
6. **LMOU, local settlements, and local past practice.** Not ingested. Local material must never silently override national language.
7. **NLRB and general statutory guidance.** The exact NLRB Weingarten page remains separate official general guidance. Its USPS-controlling applicability is unverified; it is not relabeled as CBA language.
8. **Steward notes and unsupported assertions.** No real notes are ingested. Bundled fake samples remain isolated and cannot support public-source claims.

## Safety and conflict rules

- Authority is source- and issue-dependent.
- CBA summaries distinguish cited contract language from deterministic paraphrase and do not decide facts.
- Cross-source answers retain separate source IDs, authority classes, providers, hashes, and citation anchors.
- A missing or unsupported public source produces a source-lane no-answer; it never falls through to fake claims.
- Sensitive, private, member, grievance, medical, personnel, payroll, financial, or internal-union data requires a future separate approval gate and is outside this pilot.
- Pilot 1B uses no LLM, embeddings, vector store, OCR, background fetch, arbitrary URL, or browser-supplied filesystem path.
