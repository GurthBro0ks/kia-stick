# Public Steward Workflow Bundle 2 Source-Sufficiency Matrix

Phase: `KIA-Stick-public-steward-workflow-platform-bundle-2-topic-expansion-and-packet-workspace`

Result: `PASS`

Source boundary: existing exact-allowlisted, read-only cache for
`apwu-usps-cba-2024-2027`. No fetch, sync, refresh, replacement, regeneration,
or source mutation was performed.

Source instance:
`a0a745ccf96c75cf907c5f1684a293643894144864805c1108f06006ac5a1556`
(`cba-source-instance.v1`).

PDF SHA-256:
`64195ca9def180ddab5bd2322e1aff85ca589534c2c1daa85b1752474b8b7a7c`.

Normalized SHA-256:
`14127f596ff7a81136ef0fc3303f4a6e2d6aa5c2fbc3c854d254aa73cff3632c`.

Selection rule: `supported` requires exact current paragraphs from the
allowlisted source, valid paragraph and citation-anchor identities, enough
controlling text for a bounded answer and conditional twelve-section outline,
and deterministic routing that does not require an LMOU, JCIM, handbook,
arbitration decision, local practice, management policy, or case fact to be
invented. `research_only` retains exact source discovery but has no builder.
`rejected` has no builder because the requested workflow itself would cross a
safety or truth boundary.

Every citation below is `verified_current`. `paragraph` is the exact normalized
paragraph identity; `p-hash` is `cba-paragraph-content.v1`; `anchor` is
`cba-citation-anchor.v1`.

## Candidate 1 — annual_leave

- Display title: Annual leave
- Result: `supported` (Bundle 1 retained)
- Articles: 10 and shared procedure Article 15
- Bounded scope: annual-leave denial, scheduling, choice-period, and advance-commitment preparation
- Separate verification: LMOU provisions, local leave calendars, request procedures, and past practice
- Routing phrases: annual leave request or denial; vacation scheduling; choice period; prime-time leave
- Negative guards: sick leave, FMLA, LWOP, OWCP, medical, attendance discipline
- Collision risk: sick leave; resolved by exact leave-category phrases and negative guards
- Exact topic paragraphs:
  - `cba-pdf-p055-p02`, Article 10 §2, PDF 55, p-hash `99ef93f283be169fdb5649cfdf3769eef72ff792ba25275f5eea1eb500c7eed8`, anchor `57eae6e409a9970d47158cfdd8fa2297d65f0cfe1cc41a61509245de7d4df05a`
  - `cba-pdf-p055-p03`, Article 10 §3, PDF 55, p-hash `4bd8f7c61d15b6c6ec1997c6349bd30267e0f1b8fe88ac18604d4cfa67b01f40`, anchor `fb671ea9ae4fe4a2f4b1217e0f2f478cd9dd8ea1921ddd4b2fc664d019e5c664`
  - `cba-pdf-p056-p03`, Article 10 §4, PDF 56, p-hash `a05e17b299a611d5605c82fa2215111633824bdec889a448971120c6e7ba3819`, anchor `8247f0c928a79ba21ca5313e25f496bd7739f0c2ab308587b169a8d261142952`
  - `cba-pdf-p057-p02`, Article 10 §4, PDF 57, p-hash `f69780d85b475ade1636fcce1c1990eeff6c9adb64db60561ceb068b8d42a162`, anchor `09a8646e8664d7eff3f2af09778dcd031fc7c8dbf23f624c0ed4e2b532e1b458`
- Reason: four distinct current anchors support conditional scheduling, planning, and commitment analysis without deciding a case.

## Candidate 2 — overtime

- Display title: Overtime
- Result: `supported` (Bundle 1 retained)
- Articles: 8 and shared procedure Article 15
- Bounded scope: ODL administration, selection, rotation, mandatory assignment, and stated limits
- Separate verification: LMOU implementation, craft or tour rules, qualifications, availability, and assignment records
- Routing phrases: overtime; ODL; overtime desired list; forced overtime; bypass and rotation
- Negative guards: annual leave, sick leave, FMLA, LWOP, OWCP, medical
- Collision risk: broad work scheduling; resolved by requiring overtime or ODL language
- Exact topic paragraphs:
  - `cba-pdf-p037-p03`, Article 8 §5.F, PDF 37, p-hash `e9b6726466918d1e404ca97165f01bf3cc102fe5f876bc334f6cf919ceda32a7`, anchor `b7134c6e023150c055d001777d3c0e58e2421fab62fdd187041587011cb8c2d4`
  - `cba-pdf-p038-p02`, Article 8 §5.F, PDF 38, p-hash `55f796813356d559633f8b5498988c05acf787f7a067a0bede1cd99e7d2a8a44`, anchor `19bc23f1a4546f673c24950136ece6e4cc4d8674d15d7d449512ae2ea9a82654`
  - `cba-pdf-p038-p04`, Article 8 §5.F, PDF 38, p-hash `3d5724c6aee25867c1706d4b74d542138acd05b82bf1a6d9eaa6272319c0dde1`, anchor `b38857dec592b70e03945df361f87ebb902415cd9bed3c803c1b35fe14641adf`
- Reason: the three anchors form a coherent bounded assignment and rotation workflow.

## Candidate 3 — holiday_scheduling

- Display title: Holiday scheduling
- Result: `supported` (Bundle 1 retained)
- Articles: 11 and shared procedure Article 15
- Bounded scope: holiday eligibility, schedule posting, employee category, and assignment sequence
- Separate verification: LMOU selection order, local schedule, employee category, and actual posting
- Routing phrases: holiday schedule; holiday work; required on a holiday; posting
- Negative guards: vacation, annual-leave request, religious accommodation, holiday party
- Collision risk: annual leave and broad scheduling; resolved by holiday-specific nouns and exclusions
- Exact topic paragraphs:
  - `cba-pdf-p058-p03`, Article 11 §1, PDF 58, p-hash `9560b774708ef05be5b507c00a3ca3e0d89b0b8f04de7c250e1ead19ec8a84ff`, anchor `3c53e82146c9b5e52bf3ee2a8ef57a56b748adf71824e6b85d91858d7f26d921`
  - `cba-pdf-p059-p05`, Article 11 §6, PDF 59, p-hash `8e177803b69b7e6ec72c47a85b2d31d40ce6c5501abe11844777f003abd28f4f`, anchor `ba94df10823f7063e6dc0207e851935ffca703b14c4e24a6e5ff7456f2dd3f1f`
  - `cba-pdf-p060-p02`, Article 11 §6, PDF 60, p-hash `ed0943eb06268c858dc9a65fc307124b4fe1c2dc6c6415b595407a70a1ed61bb`, anchor `8a64e97a05a0400e97fefd75da51c6e6503dec23c683142bf3af91a00a501f24`
- Reason: eligibility, posting, and sequence are separately anchored and can be framed conditionally.

## Candidate 4 — safety_health

- Display title: Safety and health
- Result: `supported` (Bundle 1 retained)
- Articles: 14 and shared procedure Article 15
- Bounded scope: unsafe-condition report, management response, correction, records, and special escalation caution
- Separate verification: current hazard facts, emergency rules, committee process, inspection records, and non-CBA authority
- Routing phrases: unsafe condition; unhealthful condition; safety hazard; Article 14
- Negative guards: medical diagnosis, OWCP, workers compensation, treatment plan, FMLA
- Collision risk: medical or emergency advice; resolved by exclusions and contract-process framing
- Exact topic paragraphs:
  - `cba-pdf-p087-p06`, Article 14 §6, PDF 87, p-hash `4aca8be0cad28b1b80e67b59f46050ceda7ce132ba1e45214bbcd14e4d7ea09a`, anchor `ce9bd59bd50bc8f12168a1d606704980af89436874713ef3d3fcfae3b6954958`
  - `cba-pdf-p088-p03`, Article 14 §6, PDF 88, p-hash `6587f18a0012bf07935cd79f869a4328cdb37205d16f037223597083bdb5aeba`, anchor `2c7fe264ba8cd704dd646d6888a1f8084af9f3d0b18d43ad9d9f2edb4be0ece3`
  - `cba-pdf-p089-p02`, Article 14 §6, PDF 89, p-hash `1af8ca9ecf7cae5097687a596c6f3099f4f1deb1eeb8b4de5726f5d5707aac74`, anchor `e8fcacbc7f7dd9c0f98a2c7fa62db44955d6826460f2f35b9c0830523166280d`
- Reason: responsibility, reporting/correction, and special appeal language are all current and distinct.

## Candidate 5 — discipline_just_cause

- Display title: Discipline and just cause
- Result: `supported` (Bundle 1 retained)
- Articles: 16 and shared procedure Article 15
- Bounded scope: corrective discipline, just cause, grievance review, notice, and concurrence
- Separate verification: charges, evidence, notice, prior record, status, defenses, and local handling
- Routing phrases: just cause; disciplinary action; Article 16; letter of warning
- Negative guards: attendance-policy-only, medical diagnosis, criminal advice, legal representation
- Collision risk: attendance and statutory interview rights; resolved by Article 16 and discipline-process language
- Exact topic paragraphs:
  - `cba-pdf-p114-p07`, Article 16 §1, PDF 114, p-hash `90e0e76e190e9afaef577bd1d68e448c02a635a040f1770c41bfbc6b031fa386`, anchor `4828022643934da645bde3d6b03bca75a6e70c90db2c3cb8b6124b999de08fb0`
  - `cba-pdf-p115-p02`, Article 16 §1, PDF 115, p-hash `5c308efcec509123cb420841e3db0815284d96c610b68c11e466df9361e716fb`, anchor `753c00ec53e2ca3eddcd691df2c44db04e3a25f7ff1c9b5cd86e874b5ddc1753`
  - `cba-pdf-p118-p02`, Article 16 §6, PDF 118, p-hash `132a05efab2d8833bd90d87183ca3542048b7b1d98e41738dfaf3f3819a8c743`, anchor `9dc7e91a8a9fd3ad5b1239f9678bc315b854f5c2c1cbbf267be4f55a6c6ebefe`
- Reason: the three anchors support a bounded, non-merits discipline preparation workflow.

## Candidate 6 — sick_leave

- Display title: Sick leave administration
- Result: `supported` (new in Bundle 2)
- Articles: 10 and shared procedure Article 15
- Bounded scope: sick-leave certification, charging, minimum-charge, and combined-leave administration
- Separate verification: ELM provisions, call-in rules, protected-leave authority, leave records, and medical-documentation requirements
- Routing phrases: sick leave certification; charge sick leave; short absence; minimum leave charge
- Negative guards: FMLA, OWCP, diagnosis, treatment, workers compensation, attendance discipline
- Collision risk: annual leave; resolved by annual-leave negative guards and sick-leave-specific phrases
- Exact topic paragraphs:
  - `cba-pdf-p057-p03`, Article 10 §4, PDF 57, p-hash `72df2111b0676db18b1133cc20c843ac719cf7c6644bf544dcd355e20abcf776`, anchor `411d95add1fdd4492bd2a1c614dd95472136196e5246e3e2bc911002c09f300a`
  - `cba-pdf-p057-p04`, Article 10 §4, PDF 57, p-hash `48addb34a81430f7cbc33231578e549044ad46f8733078fb33df9077ef16f74d`, anchor `5aa7cf7d07d2a86edd188b9bcc2cb7d9cb219a8f57ad19fbe447426886a36588`
  - `cba-pdf-p057-p05`, Article 10 §4, PDF 57, p-hash `920ff53444b084f182e67d3c9d9b54d8de096c75858d003f5fff58672a01f4e3`, anchor `e942dceb87206ebc9faf1beb6bed08aa4cdcc1d9e3444ef7090712f512c5125d`
- Reason: three current anchors support a case-neutral administration outline while medical and incorporated-manual questions remain excluded.

## Candidate 7 — higher_level_assignments

- Display title: Higher-level assignments
- Result: `supported` (new in Bundle 2)
- Articles: 25 and shared procedure Article 15
- Bounded scope: higher-level definition, directed work, written order, and eligible/qualified/available selection
- Separate verification: craft eligibility, position level, qualifications, availability, duties, duration, selection, and pay records
- Routing phrases: higher-level assignment; higher-level detail; written order; Article 25
- Negative guards: permanent promotion, job posting, bid assignment, calculations, amount owed
- Collision risk: posting/bidding and promotions; resolved by temporary detail and Article 25 language
- Exact topic paragraphs:
  - `cba-pdf-p133-p04`, Article 25, PDF 133, p-hash `71bd3e1edaece58c3bb59d523e09bee51c8ab99368c72e406f1c3301f5ff9e25`, anchor `d53d90c25f51b7b080d4527a9e848b4916fcc415b41962f770495c55d9473222`
  - `cba-pdf-p134-p03`, Article 25, PDF 134, p-hash `0ed0598e6f0270164a8b0d4fb9d19fcb67605b2535e6fbcbc8df9cd8627bf851`, anchor `89af6f60a655c18c9d06ca06b17e09691501153a58cfb64b1fbab25aebd43e94`
  - `cba-pdf-p134-p04`, Article 25, PDF 134, p-hash `0ebf7845ae838f22d224af17f872f1f0c2213f38452915ccdcebbf97d4a66e9c`, anchor `7bf6b028e5e32433cce55945df9addf0cbc8b43c5f008cc4046e9305a376f4e6`
- Reason: the national article supplies a coherent temporary-detail framework without requiring a pay calculation.

## Candidate 8 — uniforms_work_clothes

- Display title: Uniforms and work clothes
- Result: `supported` (new in Bundle 2)
- Articles: 26 and shared procedure Article 15
- Bounded scope: program administration, eligibility category, and allowance-record framework
- Separate verification: eligibility, assignment category, anniversary year, ELM criteria, program/vendor records, and actual history
- Routing phrases: uniform program; work clothes; work clothing eligibility; allowance administration
- Negative guards: costume, dress code, calculations, personal shopping
- Collision risk: money calculation; resolved by administration-only scope and calculation guards
- Exact topic paragraphs:
  - `cba-pdf-p135-p04`, Article 26, PDF 135, p-hash `18534c5c5d17898c81dfe3d29fa12d7c48e9bd7f618451a6365702c7151ad400`, anchor `283f2e62afdb1635905604fdc8bbc8fc521cc505916a7bb989e2c823b4667836`
  - `cba-pdf-p136-p03`, Article 26, PDF 136, p-hash `915909edb1cc151ee963a502331163f9c812464bfc99a2894f4c92ed24ef8adc`, anchor `1cf60555b9ac386632224574e48ebde6431b925283cd043e3cbd5263c81930d5`
  - `cba-pdf-p137-p03`, Article 26, PDF 137, p-hash `86e2e7f7f40f3ca24ef4efdcde05216450ceee49cccaf9c93808babcc38606ba`, anchor `9aefe6e06ff5d035b690075be1e793979014359a9372c6439d0372e7af805093`
- Reason: administration and eligibility records can be organized without calculating an allowance or deciding entitlement.

## Candidate 9 — employee_claims

- Display title: Employee property claims
- Result: `supported` (new in Bundle 2)
- Articles: 27 and shared procedure Article 15
- Bounded scope: claim scope, documentation, steward/local recommendation, determination notice, and appeal posture
- Separate verification: property and employment connection, possession circumstances, cause, documentation, handling, determination, and appeal posture
- Routing phrases: employee claim; personal property loss or damage; Article 27 claim
- Negative guards: motor vehicle, car claim, vehicle contents, calculations, amount, employer claim, overpayment
- Collision risk: employer claims and monetary calculations; resolved by personal-property and Article 27 phrases
- Exact topic paragraph:
  - `cba-pdf-p139-p02`, Article 27, PDF 139, p-hash `e361dad15eebadb4924686e586eb8a61ba959d95c1c53ff7b050a20863dc3ce2`, anchor `cdb48477b873cc1da58a19de21832495e76adf762f5afa038aab158959887636`; this single normalized paragraph contains separately matched scope, documentation/recommendation, and appeal clauses
- Reason: the exact Article 27 paragraph is unusually dense but supplies all three separately tested procedural anchors; the builder makes no valuation, negligence, or reimbursement finding.

## Candidate 10 — steward_grievance_handling

- Display title: Steward grievance handling
- Result: `supported` (new in Bundle 2)
- Articles: 17 and shared procedure Article 15
- Bounded scope: contractual designation, investigation, access, permission, interviews, grievance handling, and writing time
- Separate verification: certification, work location, representational purpose, requests/responses, records sought, time used, and local procedure
- Routing phrases: steward investigates or adjusts a grievance; steward access to records; grievance-writing time
- Negative guards: Weingarten, investigatory interview, interrogation, disciplinary interview, request a union representative
- Collision risk: NLRB Weingarten; resolved by explicit statutory-interview negative guards and contractual-grievance phrases
- Exact topic paragraphs:
  - `cba-pdf-p119-p04`, Article 17 §1, PDF 119, p-hash `8813faee136ea5532be2dfc38722fac82d86ebde55da630f3b3c9144b976a445`, anchor `196fe4975c2115e2568a481ff75567b259a1846ce13d225dcdb60f79cc900538`
  - `cba-pdf-p121-p02`, Article 17 §2.A, PDF 121, p-hash `8df6e246720296eabea3c7e6b8f3de1d6591fa55f3dd2baa260df7227bb06530`, anchor `102d35b65d9a7e08beb6b1559b5cee4b08cc6058ff74da8fe7c5b644ca1d4161`
  - `cba-pdf-p122-p02`, Article 17 §2.A, PDF 122, p-hash `833639c159b7da675c48d4e4f24336f2e530aa2b849de00abca3971870b0947f`, anchor `0a6612e0920bc145f5fb28a5e6ccf91c7aea5999b318460d386ea876fc6a1eb3`
- Reason: the current contract anchors are sufficient for grievance handling while the statutory interview lane remains separate.

## Candidate 11 — seniority_assignment_administration

- Display title: Seniority and assignment administration
- Result: `research_only`
- Articles: 12 plus craft Articles 37–41
- Bounded scope: exact source research by craft and assignment path
- Separate verification: craft, installation, assignment type, bid history, qualifications, LMOU, and craft-specific rules
- Routing phrases: seniority plus reassignment, posting, bid selection, or award
- Negative guards: none needed because the candidate never becomes builder-eligible
- Collision risk: higher-level details and craft-specific bidding
- Representative exact paragraphs:
  - `cba-pdf-p061-p04`, Article 12, p-hash `23cc0220aae399999108fa1d3745eef27568f90b534a94bfad11f29dbef9ca3a`, anchor `38ce3a28ebc34a0bfd6de4a768905fd0a48dcea257be44dec4855da76159d514`
  - `cba-pdf-p062-p03`, Article 12, p-hash `59a94fa66978f0713ce206d0aaa7cda5f1c8d6bc2bfc758f046c9d920a3caee0`, anchor `5e581d0cff8913787075219baa1c17bb2ef7f7ddb5cbceefdda9154aea7c028e`
  - `cba-pdf-p062-p04`, Article 12, p-hash `3b6cf88dcdbbeca0671e9d741bc8f490c199ca55dc94bb49db9718d6717e2f07`, anchor `6a93771d04c2722535f84e1813bc92c40c5663bcdb28125c95b4e7999b375358`
- Reason: a single national workflow would blend materially different craft and assignment rules.

## Candidate 12 — hours_work_scheduling

- Display title: Broad hours and work scheduling
- Result: `research_only`
- Articles: 8
- Bounded scope: exact Article 8 research outside the supported overtime subset
- Separate verification: employee category, service day, schedule, guarantees, premiums, exceptions, and local implementation
- Routing phrases: work schedule, hours of work, service week/day plus change, notice, administration, or guarantee
- Negative guards: none needed because the candidate never becomes builder-eligible
- Collision risk: overtime and employee-category-specific notice rules
- Representative exact paragraphs:
  - `cba-pdf-p034-p02`, Article 8, p-hash `995738d2869a4ddd88140b5f956440542e2755328a34c679b5918a2b1a83b509`, anchor `81709c91c11c94b02ae65ca449108070e735b96db2fd79aa3b99d0806a50b519`
  - `cba-pdf-p035-p03`, Article 8 §2, p-hash `e2c65572aa51ecf98e702a5103ccbbfedb174d9ec4b1e364e1178b23d26a88e5`, anchor `1fffe12048e1ab36740cfc4dfab0cabf3f14c66f186e898e65f30b43057680a5`
  - `cba-pdf-p036-p02`, Article 8 §2, p-hash `29b21095fa07734f13bf3b493cf7afdfe2d332eff9122b67104dccab72f8d74b`, anchor `e7b25ac24a329667014519a49c197bde0ff04088d7833d9446c2206183760ec4`
- Reason: category-specific rules and exceptions cannot be collapsed into one safe generic outline.

## Candidate 13 — craft_jurisdiction

- Display title: Craft or occupational-group jurisdiction
- Result: `research_only`
- Articles: 7 and craft Articles 37–41
- Bounded scope: exact source research by affected craft
- Separate verification: actual duties, craft, occupational group, work location, assignment reason, and craft-specific language
- Routing phrases: craft jurisdiction; cross-craft; occupational group; different craft
- Negative guards: none needed because the candidate never becomes builder-eligible
- Collision risk: posting/bidding and higher-level selection
- Representative exact paragraphs:
  - `cba-pdf-p032-p04`, Article 7 §2, p-hash `2f3ad6f888c03ea33807d8a22ad872a2caa816dcc7546f25a1ef2ce76796f277`, anchor `008830aa27dcceec64e0910754b2410dbf66843e74129b9890f3127676fb1e68`
  - `cba-pdf-p033-p02`, Article 7 §2, p-hash `857a5367037f56127b6dd5d6e5cac6b72a0aabcfa530e2acb5da5576b984721a`, anchor `3997fce0aab1375e33513bc0973ec0326b7db7a2c19bf0c3a063e8a5bd17945a`
- Reason: the national source requires craft and actual-duty fact matching beyond a case-neutral builder.

## Candidate 14 — training_qualification

- Display title: Training and qualification administration
- Result: `research_only`
- Articles: craft Articles 37–39
- Bounded scope: exact craft-specific training and qualification research
- Separate verification: craft, duty assignment, skill, training history, qualification standard, and posting path
- Routing phrases: training or qualification plus bid, assignment, craft, or position
- Negative guards: none needed because the candidate never becomes builder-eligible
- Collision risk: posting/bidding and higher-level detail selection
- Representative exact paragraphs:
  - `cba-pdf-p176-p03`, Article 37 §3.A, p-hash `8567fd74b23f736c8270eba5645ecd3d8c56f2a385f9b10ac74e8f7125d36e61`, anchor `84cbd14b396b7504e6a4cc1f67badbc3eed84e9556ad72011e6ad58a14de2119`
  - `cba-pdf-p177-p02`, Article 37 §3.A, p-hash `ab90970b4e888b68ec5fb25ca6ba53c38f200960f280f5b61f5df82c5f3145d7`, anchor `f22c02786e9492b362cefe77964586873f290189eeb9cbaffd88df29e734c747`
  - `cba-pdf-p178-p02`, Article 37 §3.A, p-hash `ca2defdbe187e5e74d96c2964d5f12f2b150945f676cb816cea0005014329648`, anchor `c0f63a084e9957e17df8fd0456daf203840186afda84809ce796c242a7ab8da2`
- Reason: qualification paths are craft- and assignment-specific and overlap bidding procedures.

## Candidate 15 — grievance_procedure_timeliness

- Display title: Standalone grievance timeliness
- Result: `rejected` as a standalone builder; Article 15 remains shared support
- Articles: 15
- Bounded scope: exact Article 15 answer and shared procedural anchors in each supported outline
- Separate verification: actual dates, knowledge trigger, grievance type, extensions, special procedure, and local processing
- Routing phrases: grievance or Step 1/2 plus deadline, timeliness, time limit, or days to file
- Negative guards: no builder eligibility regardless of routing
- Collision risk: a standalone workflow could be mistaken for a deadline calculator
- Representative exact paragraphs:
  - `cba-pdf-p097-p06`, Article 15 §2, p-hash `06438cd8aad1b2f8284ff8643437b4618076923ef35d5eb75a1a10441a1b74b5`, anchor `6cf5a9465db798ef88ef8477c63af4bddc2185c734215d165af9f86558858542`
  - `cba-pdf-p098-p02`, Article 15 §2, p-hash `fd51e47319f28551e83d5f8533ed47300109ca9115f50b68be864147b44929b3`, anchor `a890b6f6c10c71bbe4aa912de05c298f312873a5e4c403d703104e1a4cb08f34`
  - `cba-pdf-p099-p02`, Article 15 §2, p-hash `0f52b0a58939525c311a985d57300d1598a79a0764b536baa9527d54eda144c2`, anchor `60056a0bc94b9b346ac5409b50a42557ded9ffe980f00d8387334e8dfd420f3f`
- Reason: the app may quote the qualified procedure but cannot accept private dates or calculate a deadline.

## Selection result

- Total candidates reviewed: 15
- Prior supported topics: 5
- New supported topics: 5
- Total supported topics: 10
- Supported IDs: `annual_leave`, `overtime`, `holiday_scheduling`,
  `safety_health`, `discipline_just_cause`, `sick_leave`,
  `higher_level_assignments`, `uniforms_work_clothes`, `employee_claims`,
  `steward_grievance_handling`
- Research-only IDs: `seniority_assignment_administration`,
  `hours_work_scheduling`, `craft_jurisdiction`, `training_qualification`
- Rejected builder ID: `grievance_procedure_timeliness`
- Source-sufficiency gate: `PASS`

Unsupported candidates remain visible in Sources and fail closed for workflow
creation. General exact CBA retrieval and the existing qualified Article 15
answer remain available without creating a standalone timeliness builder.
