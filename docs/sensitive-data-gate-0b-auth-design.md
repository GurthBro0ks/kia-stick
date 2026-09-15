# Sensitive-Data Gate 0B — Authentication / Authorization Design

Phase: `KIA-Stick-sensitive-data-gate-0B-auth-design-planning`

REVISION=4 — bounded single-finding revision resolving `S1_DISABLED_CLOSURE_AUTHORITY_UNRECONCILED`, the one remaining material ambiguity of the independent re-QA of revision 3 (commit `297f7343d6d3c1a2c61f7e767e9b1663cf32e24d`, `RESULT=WARN`): §17.1 promised a `DISABLED` → `CLOSED` election while §4.6 required session-bound re-authentication for account closure and `DISABLED_ORDINARY_SESSION_AUTHORITY=invalid`, so the design never named what authority, if any, may enter a closure ceremony from `DISABLED`. This revision separates `ACTIVE_ACCOUNT_CLOSURE_AUTHORITY` from `DISABLED_ACCOUNT_CLOSURE_AUTHORITY`, specifies a narrowly bounded `ACCOUNT_CLOSURE_CEREMONY` for the disabled case, states explicitly that account closure is **not** private-data deletion or key destruction, and registers the underlying product choice as `OWNER_DECISION_D6` (§26.6) rather than deciding it. Only §4.6, §4.9, §9.4, §17, §20, §21, §22, §23 and §26 entries that closure authority directly touches are revised; every area the revision-3 re-QA passed is preserved unchanged. REVISION=3 was the bounded final-blocker revision resolving the three remaining material findings of the independent re-QA of revision 2 (commit `725b8fbc9e80d624ba44954592dce9a624174c83`, `RESULT=FAIL`): R1 the hidden fifth owner decision, now surfaced as `OWNER_DECISION_D5` (§26.5); R2 the incoherent disabled-account reactivation state machine (§9.4, §17); and R3 D3's crossing of the Gate 0C encryption boundary (§26.3). Revision 2 resolved F1-F6 and the F7 clarification against revision 1 (commit `5127132bfd3a6107941118f2d95152d202546db8`); the re-QA confirmed F1, F3, F4, F5 and F7 as resolved, and those areas — together with the MFA qualification boundary, the browser/TLS model, the authorization-bypass model and the validation-equivalence record — are preserved unchanged here. Only R1, R2, R3 and the register/traceability/future-test entries they directly touch are revised.

STATUS=DESIGN/PLANNING ONLY

AUTHENTICATION_IMPLEMENTATION_AUTHORIZED=no

AUTHORIZATION_IMPLEMENTATION_AUTHORIZED=no

PRIVATE_DATA_IMPLEMENTATION_APPROVED=no

ENCRYPTION_IMPLEMENTATION_AUTHORIZED=no

PRODUCTION_AUTH_ARCHITECTURE_ACCEPTED=no

REAL_DATA_USED=no

Baseline: branch `omarchy-path-setup`, `HEAD` = `origin/main` = live remote `main` = `52dd6bcb87e63528156df4eb7786ba98e4cd0a78`, 0 ahead / 0 behind, worktree clean, `PRODUCT_VERSION=0.7.0`.

Authoritative input: `docs/sensitive-data-gate-0-threat-model.md` (Gate 0A), accepted reviewed artifact commit `6d5aaf21880021f46e66236513298e845f3577ea`, terminally closed at `52dd6bcb87e63528156df4eb7786ba98e4cd0a78`, with its sealed proof manifest verified for this phase. `GATE_0A_STATUS=ACCEPTED_AND_TERMINALLY_CLOSED`.

Governing plan (already accepted, `PLAN ONLY`): `docs/user-owned-knowledge-base-secure-file-transfer-gate-plan.md`. Its §1, §2, §3, §5, §10, §19, §21, §22, §26, §28, §29 and its `NEVER ALLOW` list are treated here as accepted constraint, not as something this document re-derives or may relax. Where this document and Gate 0A or the governing plan could be read as differing, Gate 0A and the governing plan win.

Inherited but not duplicated: `docs/v0.6-future-implementation-gate-draft.md` (one-gate/one-document discipline, Audit gate shape, GitHub-safe proof rules), `docs/v0.6-real-doc-safety-checklist.md`, `docs/v0.6-local-redaction-policy-plan.md`, `docs/v0.6-operator-approval-packet.md`, `docs/v0.2-document-vault-redaction-plan.md`, and repo-local `AGENTS.md` / `DESIGN.md`.

## How to read this document

Three labels are used throughout and are not interchangeable:

- **REQUIREMENT** — already fixed by accepted evidence (Gate 0A, the governing plan, or repo-local `AGENTS.md`). Gate 0B may not weaken it. A future implementation plan that contradicts one of these is rejected on that basis alone.
- **DESIGN CHOICE** — a decision this document makes, from repo evidence, to resolve a question Gate 0A explicitly handed forward (Gate 0A §10). It is reviewable and may be overturned by the owner or by independent QA, but it is a real answer, not a deferral.
- **UNRESOLVED OWNER DECISION** — a question that repo evidence does not settle and that this document deliberately does not guess. Each one is written out in full in the §26 owner decision register with DECISION_ID / QUESTION / WHY_OWNER_DECISION / OPTIONS / SECURITY_TRADEOFFS / RECOMMENDATION / DEPENDENCIES / MUST_BE_DECIDED_BEFORE. There are **six**. They are bounded, and none of them blocks the rest of this design from being reviewed.

`OWNER_DECISION_REQUIRED=yes` — see §26. `OWNER_DECISION_COUNT=6`; `OWNER_DECISION_IDS=D1,D2,D3,D4,D5,D6`; `OWNER_DECISIONS_ACCEPTED=0`. This is disclosed, not hidden: a planning phase may contain bounded owner decisions, and these six are named rather than resolved by guesswork. Revision 1 claimed three; independent QA established that a fourth — the credential / fallback policy — was hidden inside what read as a revisitable engineering preference (§4.8). The re-QA of revision 2 established that a fifth — whether a `DISABLED` account may self-reactivate at all — was still being carried as a §17.2 "product question" outside the register, with a terminal-disable implementation default that would have settled it without an owner ever answering. It is now `D5` (§26.5). The re-QA of revision 3 then established that whether a `DISABLED` account may **close** itself — a question revision 3 answered nowhere, while §17.1 nonetheless promised the transition — is a **sixth** decision, independent of D5 in both directions. It is now `D6` (§26.6). A recommendation in this document is a recommendation and never a record of owner acceptance.

---

## 1. Purpose and security invariants

### 1.1 What Gate 0B resolves

Gate 0A enumerated threats and fixed control *families*, then handed fifteen authentication/authorization questions to a separate gate (Gate 0A §10, `AUTH_DESIGN_STATUS=REQUIRES_SEPARATE_GATE`). Gate 0B answers those questions at the architecture level — identity model, principal model, session architecture, authorization enforcement, role model, operator access, MFA, recovery, revocation mechanism, multi-device sessions, CSRF/cross-origin posture, abuse limits, and a content-free auth audit schema — so that a later implementation plan can be evaluated against something concrete rather than against a blank space.

The specific gap this closes: today a reviewer cannot say whether a proposed private-data implementation is safe, because there is no accepted statement of what "authenticated" or "authorized" is even supposed to mean in KIA Stick. After Gate 0B is accepted, a reviewer can check a proposal against a named session model, a named ownership model, and a named revocation mechanism.

### 1.2 What Gate 0B does NOT resolve

This document does not implement, enable, scaffold, or authorize any of it. In particular it does not:

- Add or select an auth library, middleware, cookie, session store, database schema, account table, login/registration/recovery/MFA UI, authorization helper, private route, or private storage.
- Install or change any package, or create any credential, key, or secret.
- Design encryption or key management. That is Gate 0C and is deliberately left open; §20 identifies the handoff without crossing into it. `ENCRYPTION_DESIGN_STATUS=REQUIRES_SEPARATE_GATE`.
- Design uploads, OCR, parsing, indexing, embeddings, retention/deletion mechanics, or backup/restore. Those are separate later gates in the governing plan's approval sequence.
- Access, open, read, hash, or index any real or private document.
- Change runtime behavior, product version, `feature_list.json` accepted state, `CLOSEOUT.md`, production source, or any test.

Nothing below is a statement about what KIA Stick does today. KIA Stick today has no authentication and no authorization (§3), and needs neither, because it holds no private data.

### 1.3 Auth-specific invariants, translated from Gate 0A

Each invariant below is a REQUIREMENT traced to its accepted source. These are the non-negotiable floor for every later section; where a later section makes a DESIGN CHOICE, that choice is valid only if it preserves all of these.

| Invariant | Value | Accepted source |
|---|---|---|
| AUTH_REQUIRED_BEFORE_PRIVATE_DATA | yes | Governing plan §2 — "no private route may ship 'temporarily open'" |
| AUTHORIZATION_DENY_BY_DEFAULT | yes | Gate 0A §9, THREAT-002 |
| SERVER_AUTHORITATIVE_AUTHORIZATION | yes | Governing plan §2 `NEVER ALLOW` client-side-only authorization; Gate 0A THREAT-002 |
| OBJECT_OWNERSHIP_CHECK_REQUIRED | yes, independent of the general authorization check | Gate 0A §9, THREAT-004 |
| UNKNOWN_AUTH_STATE | DENY | Gate 0A §16 |
| UNKNOWN_OWNER | DENY | Gate 0A §16 |
| AUTHZ_CHECK_THROWS_OR_TIMES_OUT | DENY | Gate 0A §16 |
| REVOCATION_REQUIREMENT | DENY_ON_NEXT_PROTECTED_REQUEST_AFTER_AUTHORITY_ACCEPTS_REVOCATION | Gate 0A §3 AUTHENTICATION_DATA, §10, THREAT-020. The Gate 0A floor is unchanged and not weakened; the trailing clause names the precondition that was always implicit — an authority that never receives the revocation cannot have accepted it (§12.1, §13.2) |
| AUTH_SESSION_CREDENTIAL_LOGGING_ALLOWED | no — absolute, no diagnostic exception | Gate 0A §15, THREAT-007; see §16.1 |
| SESSION_IDENTIFIER_RENEWAL | required on successful authentication and on relevant privilege elevation | Gate 0A §9, THREAT-003 |
| PRIVATE_CONTENT_IN_AUTH_LOGS_ALLOWED | no — absolute, no diagnostic exception | Gate 0A §15, `PRIVATE_CONTENT_LOGGING_ALLOWED=no` |
| LEAST_PRIVILEGE | required for every principal touching private data | Gate 0A §2, §9 |
| USER_ISOLATION | no auth, session, cache, log, or index path may span two workspaces | Gate 0A §2; governing plan §1, §29 |
| SILENT_ADMIN_READ_PATH | forbidden; operator access self-audits or it is a FAIL | Gate 0A §15, THREAT-022; governing plan §26 |
| TLS_FOR_PRIVATE_ENDPOINTS | required without exception, including local-only builds | Governing plan §3; Gate 0A §9 |
| SHARING_AUTHORIZED | no | Governing plan "What This Plan Does Not Authorize" lists `sharing`; Gate 0A THREAT-020 notes shared workspaces do not exist and sharing remains out of scope |
| SECRETS_IN_GIT_PROOF_LOGS | forbidden | Governing plan §28; Gate 0A THREAT-007 |

**On SHARING_AUTHORIZED=no.** This was checked against existing accepted project evidence rather than assumed. The governing plan's `NEVER ALLOW`-adjacent "What This Plan Does Not Authorize" list names `sharing` explicitly, §2 forbids shared/anonymous access to any private workspace, and Gate 0A THREAT-020 states shared workspaces do not exist today and sharing remains out of scope. Gate 0A §10 does ask whether a future steward/representative role might need scoped access to a member's data — but asking a question is not evidence for an affirmative answer. No accepted evidence says otherwise, so sharing stays unauthorized here (§3.4, §8.2).

---

## 2. Deployment and identity assumptions

### 2.1 Evidence about the deployment shape

Facts, each verified in this repository during this phase:

- `AGENTS.md` scopes the repo as "a laptop-only MVP," and forbids NUC, SSH, Discord, Caddy, DNS, cron, systemd, tmux, or cloud calls for this MVP.
- `package.json` binds both `dev` and `start` to `--hostname 127.0.0.1`. There is no deployment target, no reverse-proxy config, and no hosting configuration in the repo.
- `app/health/route.ts` reports `targetMachine: "USER_LAPTOP_ONLY"`, `cloudRequired: false`, `apiKeyRequired: false`, `privateData: "blocked"`, `externalAi: "disabled"`.
- Dependencies are `next`, `react`, `react-dom`, `lucide-react` only. No auth, session, crypto, database, or identity package is present.
- The governing plan's "What This Plan Does Not Authorize" list names `public deployment` and `user accounts`.
- Against that, the governing plan §1/§29 and Gate 0A THREAT-001 require `userWorkspaceId` scoping on every private record and a test asserting workspace B cannot read workspace A — which is multi-workspace language.

That last bullet is the tension, and it is real rather than apparent. The repo's *deployment* evidence is unambiguously single-device and local. The repo's *data-model* evidence is unambiguously multi-workspace-capable. Both are accepted. The resolution adopted here is that they are answering different questions: the data model must be multi-workspace-safe from the first line of private-data code, because retrofitting workspace scoping is the single most commonly missed control (Gate 0A THREAT-001, THREAT-016), while the deployment may legitimately start as one device with one workspace.

### 2.2 Options assessed

**Option A — single-user / local-device identity.** Identity is "whoever can unlock this laptop"; the application adds a local unlock credential over a `127.0.0.1` runtime.

- Trust boundaries: browser ↔ local Node process only; no network boundary beyond loopback.
- External dependency: none.
- Recovery: bounded by device-level recovery; no remote reset path exists or is needed.
- Offline/local behavior: fully offline. Matches `local-fake-deterministic` and the no-cloud posture exactly.
- User isolation: degenerate — one user, one workspace. Isolation is untested by real use, which is a hidden cost: THREAT-001 controls would exist on paper but never be exercised.
- Operator visibility: degenerate and uncomfortable — the operator and the user are the same person and have full filesystem access by definition (Gate 0A §4.2).
- Complexity: lowest.
- Suitability for future private KIA data: adequate for one steward's own case files on their own laptop; not sufficient the moment a second person's data exists.

**Option B — application-managed user accounts (first-party, self-hosted).** KIA Stick owns the account record, the credential verifier, and the session store; no third party is involved.

- Trust boundaries: browser ↔ Node server, with a real authentication boundary and a real authorization boundary; this is the first architecture in which Gate 0A §4.2's "authentication boundary" and "authorization boundary" actually exist.
- External dependency: none required, *provided* recovery and MFA are designed without email/SMS (§10, §11).
- Recovery: fully owned by KIA Stick — which is both the advantage (no third-party bypass surface) and the burden (§11).
- Offline/local behavior: works offline when deployed locally; the same code works if later exposed.
- User isolation: real and testable. `userWorkspaceId` scoping (governing plan §1) gets exercised rather than merely declared.
- Operator visibility: must be designed explicitly (§9) rather than being an accident of filesystem access.
- Complexity: moderate — credential storage, session store, authorization layer.
- Suitability: this is the model the governing plan's §1/§2/§29 language already presupposes.

**Option C — external identity provider.** Identity delegated to a third-party IdP (OIDC/OAuth).

- Trust boundaries: adds a third-party trust boundary and a network boundary that do not otherwise exist.
- External dependency: hard runtime dependency on a remote service; contradicts `AGENTS.md`'s no-cloud-calls boundary and the laptop-only scope.
- Recovery: outsourced — which is a genuine benefit in isolation, but it means the IdP account becomes the real key to a member's private case data, and compromise or lockout there is compromise or lockout here.
- Offline/local behavior: breaks. A laptop-only tool that cannot authenticate without internet is a worse product for a steward working from a break room.
- User isolation: adequate.
- Operator visibility: metadata (who logged in, when, from where) leaks to the IdP — and KIA Stick's user population is union members whose association with a grievance tool is itself sensitive.
- Complexity: moderate, but with an availability and privacy cost that the current architecture has no reason to pay.
- Suitability: poor for this product, today.

**Option D — device-bound credential (WebAuthn/passkey) over a local-first deployment.** Not a separate identity authority so much as a credential type usable inside Option A or B.

- Assessed and *not* selected: passkeys are strong against phishing and credential stuffing, but a purely device-bound credential with no second factor makes device loss (THREAT-024) a total-loss event, and the recovery story then depends entirely on Gate 0C key design.
- Gate 0B does **not** select a credential type, and does not express a preference dressed as a deferral. Which credential is primary, whether any fallback authentication path exists at all, and how that relates to the offline recovery credential are one coupled product/security policy, surfaced as `OWNER_DECISION_D4` (§26.4). §4.8 states the lifecycle requirements that hold whichever way D4 is decided.

### 2.3 Preferred design family

`PREFERRED_IDENTITY_MODEL=APPLICATION_MANAGED_FIRST_PARTY_ACCOUNTS_ON_A_LOCAL_FIRST_DEPLOYMENT`

**DESIGN CHOICE.** Option B (application-managed, first-party accounts), deployed initially in Option A's shape: one device, loopback-bound, one real account, one workspace, no external identity dependency.

Why this and not the others:

- Option C is rejected on evidence, not taste: it contradicts `AGENTS.md`'s no-cloud boundary, breaks offline use, and leaks membership-adjacent metadata to a third party. §19 records `EXTERNAL_IDENTITY_DEPENDENCY=none` as a design invariant rather than an accident.
- Option A alone is rejected because "whoever can unlock the laptop" is not an identity the server can make an authorization decision about. Gate 0A requires server-authoritative, deny-by-default authorization with per-object ownership checks (§1.3). You cannot check ownership against a principal that does not exist as a record. Option A also leaves the THREAT-001 isolation control permanently unexercised.
- Option B satisfies every §1.3 invariant without adding a network or vendor dependency, and it is the model the already-accepted governing plan §1/§2/§29 language presupposes.

The deliberate consequence: **the authorization architecture is built multi-workspace-correct from day one even though the first deployment has exactly one workspace.** Every private record carries `userWorkspaceId`; every private read/write/list/delete path is workspace-scoped; the workspace-isolation test (governing plan §29) is written and run against synthetic workspace A / workspace B fixtures even while only one real workspace exists. This costs little now and is the one thing that cannot be retrofitted safely later.

What this choice does *not* settle is how far the deployment is ever allowed to reach. That is `OWNER_DECISION_D1` (§26.1), and it is the decision that changes MFA policy (§10), TLS posture (§14), and operator model (§9). The design below is written so that D1 changes *policy strictness*, not *architecture*.

---

## 3. Account / principal model

### 3.1 Current state, verified

`CURRENT_AUTH_IMPLEMENTATION_PRESENT=no`, verified this phase:

- No `middleware.ts` / `middleware.js` exists at any repo root level.
- `app/` contains exactly three route handlers: `app/api/public-source/route.ts`, `app/api/public-cba-source/route.ts`, `app/health/route.ts`. The first two are `runtime = "nodejs"`, `dynamic = "force-dynamic"` GET handlers that reject any query string and return bounded public-source cache reads with `Cache-Control: no-store`. None reads a cookie, a header credential, or a session.
- A case-insensitive search of `app/`, `lib/`, and `components/` for cookie/session/JWT/OAuth/NextAuth/CSRF/sign-in symbols returns three matches, all unrelated to authentication: an identifier-shaped-value rejection regex in `lib/fakePilotSimulatorModel.ts` (which mentions the *words* session/token/cookie only as things to reject inside fake metadata), and two prose strings about employment in `lib/publicGrievanceOutline.ts` and `lib/publicStewardWorkflowRegistry.ts`.
- No auth, session, crypto, or database dependency exists in `package.json`.
- `components/KiaStickApp.tsx` is a client component persisting five `localStorage` keys — `kia-stick.saved-answers.v0.1`, `kia-stick.current-thread.v0.4`, `kia-stick.quarantine.v0.1`, `kia-stick.vault-state.v0.4`, `kia-stick.import-wizard-state.v0.5.1` — none of which is or resembles a credential.

There is therefore no existing auth implementation to build on, and none to remove. Gate 0B is designing onto a blank auth surface, which is the safest possible starting position and should be preserved until an implementation gate is separately authorized.

### 3.2 Future abstract principals

All future. None exists. None is authorized by naming it here.

**USER_ACCOUNT** — the authentication subject. Holds: an opaque account identifier; credential verifier material (never a recoverable credential); account status (`ACTIVE` / `DISABLED` / `CLOSED`); creation and last-authentication timestamps. Holds no private case content, and no personal identifier beyond the minimum the chosen credential type requires (Gate 0A §3 PERSONAL_IDENTIFIERS, data minimization).

**USER_WORKSPACE** — the authorization scope and the unit of isolation. Identified by the opaque `userWorkspaceId` the governing plan §1 already names. Every private record is scoped to exactly one workspace. A workspace is not a folder and not a UI tab; it is the boundary that THREAT-001 is about.

**SESSION** — an authenticated, revocable, time-bounded binding between one USER_ACCOUNT and one client. Each session record carries **two distinct opaque values that must never be conflated** (§5.4): a `SESSION_BEARER_CREDENTIAL`, which authenticates requests and is never logged; and a `SESSION_AUDIT_ID`, which authenticates nothing and exists solely for audit and session-list correlation. Both are distinct from the account identifier. Sessions are first-class records precisely because revocation must act on them individually (§12, §13.1).

**OPERATOR_ADMIN_PRINCIPAL** — deliberately **not defined as an application principal** in the first private architecture (§8, §9). There is no admin role, no admin route, and no admin session. This is a DESIGN CHOICE, and §9 explains why defining one would be the more dangerous option.

**SERVICE_PRINCIPAL** — non-human identities for background work that a private architecture may eventually need (retention expiry, deletion propagation, index maintenance). Each is narrowly scoped to one function, holds no interactive credential, cannot authenticate as a user, and cannot read private content except where its single function provably requires it. Named here so that least privilege (§1.3) has something to apply to; no service principal is authorized or specified.

Function scope alone does not delimit reach, and independent QA was right to say so: "index maintenance" names *what* a job does, not *whose* records it may touch. Therefore a service principal's authority is **both** function-scoped **and** workspace-bound — it carries an explicit grant naming the single `userWorkspaceId` it may act within, that grant is issued by the same authoritative authorization decision point that governs user requests (§7.2), it is independently revocable, and it expires. A background job with no such grant has no private-data authority at all; "it is internal" is never an authorization. The absence of a user session is not a reason to skip the decision point — it is a reason the job must carry its own explicit, narrower authority (§7.2, §8.3).

### 3.3 Ownership

`WORKSPACE_OWNERSHIP_MODEL=ONE_WORKSPACE_OWNED_BY_EXACTLY_ONE_ACCOUNT`

**DESIGN CHOICE**, answering Gate 0A §10's ownership question:

- **Who owns a workspace:** exactly one USER_ACCOUNT, recorded server-side, immutable for the workspace's lifetime in the first architecture. Ownership transfer is not designed and not authorized.
- **May one account own multiple workspaces:** no, in the first private architecture — one account, one workspace, 1:1. The *data model* still carries `userWorkspaceId` on every record rather than inferring scope from the account, so that a later 1:N decision is a policy change rather than a schema migration. Making it 1:N now would add a workspace-selection surface, a "current workspace" ambient state, and a new class of cross-workspace bug (THREAT-001, THREAT-023) for a capability nothing in the repo asks for.
- **May a workspace have multiple users:** no. That is sharing.

### 3.4 Sharing

`WORKSPACE_SHARING_STATUS=NOT_AUTHORIZED`

**REQUIREMENT**, from the governing plan's "What This Plan Does Not Authorize" (`sharing`) and §2's `NEVER ALLOW` on shared/anonymous access to any private workspace.

No team workspace, no organization, no steward-acting-for-member delegation, no invite, no link-share, no read-only guest, and no "just for support" second principal is introduced by this document. Any of those is a separate gate with its own threat model, because each one converts THREAT-001 from "a bug class" into "a designed feature that must be right."

This is worth stating plainly because KIA Stick's problem domain actively invites the mistake: a steward representing a member genuinely does need that member's documents, and it would feel natural to model that as workspace sharing. Gate 0B declines to design it. If the owner later wants delegated representative access, that is a distinct gate, and it should be designed as an explicit, revocable, audited, time-boxed grant with its own threat model — not as an incremental widening of the ownership check.

---

## 4. Authentication flow

Abstract lifecycle only. No UI, no API, no endpoint shapes, no code, no real accounts. Every step below is a future design requirement.

### 4.1 Account creation

- The first account is created by an explicit, local, operator-initiated bootstrap action, not by an open registration surface. **DESIGN CHOICE:** in a local-first deployment, open self-service registration is an attack surface with no user to serve — there is exactly one legitimate account.
- Creating the account creates exactly one workspace, atomically. There is no window in which an authenticated account exists with no workspace, because "authenticated but unknown workspace" is an ambiguous-owner state and §1.3 requires DENY there.
- No private content may be accepted during creation.
- Emits `ACCOUNT_CREATED` (§16).

### 4.2 Identity verification

Not applicable in the local-first deployment: there is no email or phone to verify, and no external verification channel exists or is authorized (§19). If D1 (§26.1) later authorizes network exposure or a second user, identity verification becomes required and must be designed then — it is not designed here, and no verification channel is pre-selected.

### 4.3 Login

- Deny-by-default: no private route is reachable before a successful authentication (§1.3 AUTH_REQUIRED_BEFORE_PRIVATE_DATA).
- Failures are indistinguishable between "no such account" and "wrong credential," and are rate-limited per §15.
- Failure emits `LOGIN_FAILED` with a safe reason code and no credential material (§16).
- Success emits `LOGIN_SUCCEEDED` and proceeds to §4.4.

### 4.4 Session creation and identifier regeneration

**REQUIREMENT (Gate 0A §9, THREAT-003):** the authoritative session **bearer credential** (§5.4) is generated *after* successful authentication, and any pre-authentication value is invalidated rather than upgraded in place. A value observable before authentication must never be replayable as an authenticated credential afterwards. The session's `SESSION_AUDIT_ID` (§5.4) is a separate, non-authenticating reference and is never a substitute for this rule. This is the session-fixation control and it is not optional.

The same regeneration applies on any privilege elevation (§5.4) — including, if re-authentication for a sensitive action is ever introduced, the transition into that elevated state.

Emits `SESSION_CREATED`.

### 4.5 Logout

- Server-side destruction (not expiry, not a client-side flag) of the session record, so the next protected request with that identifier is denied (§12).
- The client-side credential transport is cleared, but clearing it is a convenience, never the mechanism — a logout that only clears a cookie and leaves the server-side session valid is a FAIL state.
- Emits `LOGOUT` and `SESSION_REVOKED`.

### 4.6 Re-authentication

Required for: credential change, MFA enrolment or removal (if MFA exists, §10), recovery-credential regeneration, session-revoke-all, account disable, and **account closure elected from `ACTIVE`**. Each of these is an action that, if performed by a stolen session, compounds the compromise — so each requires proof of the credential, not merely proof of a session.

**Scope of that list, stated precisely (repair, revision 4).** Every action above is an action of an `ACTIVE` account. Revision 3 wrote "account closure" without qualification while §17.1 simultaneously promised a `DISABLED` → `CLOSED` election, and independent re-QA correctly read the pair as unreconciled: a literal §4.6 makes the disabled closure election unreachable, because `DISABLED_ORDINARY_SESSION_AUTHORITY=invalid`. The qualification is now explicit and binding document-wide:

`ACTIVE_ACCOUNT_CLOSURE_AUTHORITY=ORDINARY_SESSION_PLUS_SECTION_4_6_REAUTHENTICATION`

`DISABLED_ACCOUNT_CLOSURE_AUTHORITY=UNDECIDED_OWNER_DECISION_D6`

`DISABLED_CLOSURE_USES_ORDINARY_SESSION=no`

This section governs the **`ACTIVE`** path only. Whether a `DISABLED` account may close itself at all, and by what authority it would enter a closure ceremony if it may, is `OWNER_DECISION_D6` (§26.6) and is specified — not decided — in §17.1. Nothing in this section may be cited as authorizing, or as denying, a disabled-account closure.

Re-authentication produces a short-lived elevated state that is itself **session-bound**, does not survive logout, and triggers identifier rotation per §4.4. Two consequences follow, and revision 1 stated only the first:

- Because the elevated state is session-bound, it can only ever be reached by a principal that already holds a valid ordinary session. It is therefore **not** a mechanism a `DISABLED` account can use, since disabling revokes every session and denies authentication (§17). Revision 1 nevertheless routed disabled-account re-enable through this section; that path was unreachable. Revision 3 left the same defect in place for the **closure** election, which this revision repairs. The coherent account state machine, the separate narrowly scoped reactivation ceremony, and the separate narrowly scoped account-closure ceremony are specified in §17. In all three cases the rule is one rule: **a transition out of `DISABLED` may never be conditioned on authority that `DISABLED` has by construction removed.**
- Exactly which credential proof re-authentication demands — primary credential only, primary plus a second factor, or a fallback path if one exists at all — is not settled here. It is part of `OWNER_DECISION_D4` (§26.4). What is fixed regardless: re-authentication is satisfied by **authentication** authority, never by recovery authority alone, unless D4 explicitly chooses otherwise (§11.1).

### 4.7 Session expiration

Defined in §5.5. Expiry is a bound on session lifetime, never a substitute for revocation (§12).

### 4.8 Credential requirements

**What is selected here: nothing.** The credential type, the existence and shape of any fallback authentication path, and the relationship between ordinary authentication and offline recovery are one coupled policy, carried as `OWNER_DECISION_D4` (§26.4) rather than resolved by this document. Revision 1 stated a "preferred credential type (revisitable at implementation-plan time)" — a device-bound passkey primary with a passphrase secondary — while §2.2 simultaneously described the same credential type as deferred. Independent QA correctly read that as a hidden owner decision: whether the secondary is an AND factor, an alternative login, or a recovery-only path determines MFA posture, takeover resistance, hardware requirements and recovery burden, and it is not an engineering detail.

What **is** fixed here are the requirements that hold under every D4 outcome.

**Separation of ceremonies (REQUIREMENT under every D4 option unless D4 explicitly overrides it).** Ordinary authentication and recovery are separate ceremonies with separate authority. An offline recovery credential is **not** an ordinary alternate login credential: it authorizes a credential-reset ceremony, not a private-data session (§11). Any D4 option that would make recovery material an ordinary login path must be chosen knowingly and explicitly, because it collapses the two ceremonies into one and makes the recovery credential the weakest full-access path.

If the selected credential model includes a user-chosen secret (a password or passphrase), the following are future requirements, stated without selecting a library or vendor:

- Stored only as a verifier produced by a memory-hard, salted, deliberately slow password-hashing function with per-credential salt and tunable cost. Never stored reversibly, never encrypted-and-decryptable, never hashed with a fast general-purpose digest.
- Never logged, never included in an audit event, never in proof output, never in an error message or stack trace (§1.3, Gate 0A §15).
- Length-first strength policy with a generous maximum, screened against known-breached credential lists where that screening can be done offline; no composition rules that push users toward predictable patterns; no forced periodic rotation absent evidence of compromise.
- Credential change requires re-authentication (§4.6) and revokes **all** sessions for the account, **including the session that initiated the change** (§12.4).

**On that last point (F7 clarification).** Revision 1 said "all other sessions" here and "all sessions including the initiating one" in §12.4. The stronger rule governs, and it governs everywhere: flow, epoch transition, user-visible outcome and future tests (§22 test 8). The single rule is:

`CREDENTIAL_CHANGE_REVOCATION_SCOPE=ALL_SESSIONS_INCLUDING_THE_INITIATING_SESSION`

The epoch mechanism (§12.2) satisfies it without a special case, since the initiating session's recorded epoch is stale the instant the epoch increments. The user-visible consequence is intended and must be designed for rather than patched around: after changing a credential the user re-authenticates, which is the correct outcome when the premise of the change is that the prior credential may be compromised. No implicit re-issue of a session to the initiating client is permitted, because that is a silent exception to the revocation rule.

**If a device-bound credential type is chosen under D4**, one further constraint applies: WebAuthn/passkey platform assumptions — authenticator availability, platform vs roaming authenticator, and the behaviour of a device-bound credential under a strictly local deployment — are unresolved and must be validated before implementation acceptance (§22, §23). No library, vendor, or authenticator is named or authorized anywhere in this document.

### 4.9 Account closure

Covered in §17, and the two closure paths are **not** the same path. Closure elected from `ACTIVE` uses ordinary session authority plus §4.6 re-authentication (`ACTIVE_ACCOUNT_CLOSURE_AUTHORITY`). Closure elected from `DISABLED` cannot use either, exists only if `OWNER_DECISION_D6` (§26.6) permits it, and if permitted runs through the dedicated limited `ACCOUNT_CLOSURE_CEREMONY` of §17.1 entered with the accepted recovery authority (§11).

Under **both** paths, and stated here because this is where readers look for it: account closure is an **authentication and account-lifecycle** operation. It ends authorization. It does **not** by itself delete private data, destroy keys, perform cryptographic erasure, eradicate backups or destroy a workspace — `ACCOUNT_CLOSURE_IMPLIES_PRIVATE_DATA_DELETION=no`, `ACCOUNT_CLOSURE_IMPLIES_KEY_DESTRUCTION=no`, `PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES` (§17.1, §20).

---

## 5. Session architecture

### 5.1 The governing constraint

Gate 0A fixes `REVOCATION_REQUIREMENT=DENY_ON_NEXT_PROTECTED_REQUEST` with, in its own words, "no stale-ALLOW tolerance window for a protected private-data request." Gate 0B's job is not to restate that requirement but to select a session architecture that can *prove* it. Gate 0A is explicit that a design which cannot demonstrate next-request denial is unacceptable.

### 5.2 Design families compared

**Opaque server-side session.** The session bearer credential (§5.4) is a high-entropy random value carrying no claims; all authoritative state (account, workspace, status, issue/expiry times) lives server-side and is consulted on each protected request.

- Revocation: **satisfied directly.** Deleting or invalidating the server-side record causes the very next protected request to fail its lookup and be denied. No window, no TTL dependency, no cache to reason about.
- Cost: a lookup per protected request, and a session store to operate.
- Fit for KIA Stick: the lookup cost is irrelevant at this scale — a single-user, loopback, local-first deployment (§2.3) has no performance argument for avoiding it. The usual reason people reach for stateless tokens (horizontal scale across stateless nodes) does not apply to a laptop-bound Node process.

**Stateless signed token (JWT-style).** Claims are carried in a signed token the server verifies without lookup.

- Revocation: **not satisfied by the design itself.** A validly-signed unexpired token remains acceptable after revocation. The standard repairs — a denylist, a session-version/epoch check, a per-request status lookup — all reintroduce exactly the authoritative server-side lookup the model exists to avoid, at which point it is an opaque session with extra signature-verification complexity and a larger credential.
- Additional risk: key management for the signing key becomes a Gate 0C entanglement before Gate 0C exists (THREAT-006, THREAT-007), and "shorten the TTL" is the tempting mitigation that Gate 0A explicitly forecloses.
- Fit: poor, for a system whose hardest stated session requirement is revocation.

**Hybrid (short-lived access token + refresh token).** Rejected for the same reason, more sharply: it *institutionalizes* a stale-ALLOW window equal to the access-token lifetime. That is precisely the "size of an allowable window" framing Gate 0A rules out.

### 5.3 Selection

`PREFERRED_SESSION_MODEL=OPAQUE_SERVER_SIDE_SESSION`

**DESIGN CHOICE.** Selected because it is the only compared family that satisfies `DENY_ON_NEXT_PROTECTED_REQUEST` by construction rather than by bolt-on, and because the one architectural argument for stateless tokens — stateless horizontal scale — has no purchase on a single-device deployment. Choosing it also keeps Gate 0B from creating a signing-key dependency on an encryption gate that has not happened yet (§20).

### 5.4 Conceptual session properties

- **Authoritative session state:** server-side only. The client holds an opaque reference and nothing else. No claim presented by the client is ever trusted as an authorization input (§7.4).
- **Session bearer credential** (`SESSION_BEARER_CREDENTIAL`): high-entropy, cryptographically random, unpredictable, opaque, distinct from the account identifier and from the workspace identifier, and never derived from any of them. **This value authenticates a request.** It is a credential in the full sense of §16.4 and §1.3, it is held only by the client and by the authoritative session lookup, and it may never appear in any log, audit record, telemetry stream, diagnostic output, proof artifact, notification, session list, or error path.
- **Session audit identifier** (`SESSION_AUDIT_ID`): a **separate**, non-authenticating, content-free opaque reference to the authoritative server-side session *record*. Revision 1 used one term — "session identifier" — for both the bearer credential and the value permitted in audit events (§16.3), so a literal reading of the allowed-field list permitted logging a live credential. That is now closed. `SESSION_AUDIT_ID` is defined by what it is **not** allowed to be:
  - it is **never accepted as an authentication credential** on any request, and a request presenting it in place of the bearer credential is denied exactly as an unauthenticated request is;
  - the bearer credential is **not derivable** from it, in either direction — neither is a hash, truncation, encoding, or other function of the other; they are independently generated;
  - it **cannot be replayed** to resume, resurrect, or impersonate a session;
  - it is suitable **only** for correlating audit and session-list records, and carries no private content;
  - it is safe to display to the owner in a session list (§13.1) and to record in audit events (§16.3).
  Conceptually this is the distinction between an authoritative session record's internal object identity and the bearer secret that points at it; the design uses that distinction deliberately and states it rather than leaving it implied. No implementation, storage, or library for either value is chosen here.
- **Transport:** a cookie, subject to §6, if the browser-session model is used. `AUTH_CREDENTIAL_LOCALSTORAGE_ALLOWED=no` (§6.2).
- **Renewal / rotation:** identifier regenerated on successful authentication and on privilege elevation (§4.4). Periodic mid-session rotation is permitted but is not the revocation mechanism.
- **Privilege-elevation rotation:** required; see §4.6.
- **Logout invalidation:** server-side destruction, immediate (§4.5).
- **Revocation:** §12.
- **Concurrent sessions:** §13.
- **Device/session listing and termination:** §13.
- **No token secrets are generated by this document.** None. Not an example, not a placeholder, not a test fixture.

### 5.5 Lifetimes

Stated as design requirements with reasoning; exact values are an implementation-plan parameter, not a Gate 0B constant.

- **Idle timeout:** required, and short — this is the primary control against an unattended unlocked device, which for a steward using this tool in a workplace is a realistic scenario rather than a theoretical one (THREAT-024).
- **Absolute lifetime:** required, independent of activity, so a session cannot be kept alive indefinitely by activity alone.
- **Expiry is a bound, not a revocation mechanism.** Every expiry rule in this section is defence in depth behind §12; none of them is permitted to be the reason a revoked session stops working.

---

## 6. Cookie / browser security

Applies if and when a browser session model is used, which the preferred design assumes.

### 6.1 Cookie and transport requirements

**REQUIREMENTs**, from Gate 0A §9 and the governing plan §3:

- `HttpOnly` — the session cookie is never readable by page JavaScript. This is what keeps an XSS bug from becoming silent, persistent session theft (THREAT-003).
- `Secure` — transmitted only over TLS.
- `SameSite` — restrictive by default (`Lax` at minimum; `Strict` preferred for a single-origin local-first app that has no legitimate cross-site entry flow). Not treated as the whole CSRF defence (§14).
- **Path/domain scoping** — narrowest scope that works; never a wildcard parent domain, never broader than the private application surface.
- **TLS** — required for any private endpoint without exception, explicitly including local-only builds that could ever be exposed (governing plan §3). "It's only on localhost" is not an exemption, and the repo's existing `--hostname 127.0.0.1` binding is a reduction in exposure, not a substitute for transport security.
- Session cookies are not persisted beyond the session lifetime rules in §5.5, and are cleared on logout.

**Local-first / TLS compatibility — stated honestly rather than hand-waved.** `BROWSER_SESSION_SECURITY_CONTRADICTION_RESOLVED=yes`. The requirements above are not weakened for loopback, and nothing here may be read as permission to run a private endpoint over the repo's current plain HTTP dev binding. But the interaction between `Secure` cookies and a strictly local deployment is a real unresolved compatibility question, not a solved one, and revision 1 asserted the requirement without acknowledging it:

- **REQUIRED, not negotiable:** `HttpOnly`; `Secure`; restrictive `SameSite`; narrowest path/domain scope; TLS on every private endpoint; and **refusal to operate the private surface at all** if the transport requirement is not met. A private deployment that cannot satisfy transport security does not fall back to plaintext — it declines to serve private data. That refusal is itself a required behaviour, not an operational nicety.
- **IMPLEMENTATION CHOICE, deliberately not made here:** *how* a reviewable trusted local origin is established for a loopback deployment — the trust arrangement, its certificate lifecycle, and where its private key lives. Several arrangements exist; each has different key-custody consequences that touch Gate 0C (§20). Gate 0B names the requirement and refuses to pre-select the mechanism.
- **UNRESOLVED, and a required future validation item (§22, §23):** whether the selected arrangement actually yields `Secure`-cookie-eligible, TLS-terminated behaviour in the browsers the owner uses, on a local origin, without weakening any requirement above, and without introducing an external dependency (§19). Until that is demonstrated, the private surface is not implementation-acceptable. This is tracked under D1 (§26.1) and THREAT-003 (§21).
- **Network-exposed requirements are not weakened by any of this.** Nothing in the local-first case reduces what a network-reachable deployment must do; if anything, exposure adds MFA (§10.2) on top.

### 6.2 Browser storage

`AUTH_CREDENTIAL_LOCALSTORAGE_ALLOWED=no`

**REQUIREMENT.** No authentication or session credential may live in `localStorage`, `sessionStorage`, IndexedDB, or any other script-readable browser store, and no such value may be authoritative for an authorization decision.

This is KIA-specific rather than generic. KIA Stick *already* persists five `localStorage` keys today (§3.1), and they work well for what they are: public/fake workflow state. Gate 0A §4.1 flags precisely this as a "partial precedent" surface — the danger is not that `localStorage` exists, but that a future private implementation reaches for the pattern already in the codebase. Gate 0A states the reasons directly: `localStorage` is unencrypted, readable by any script on the origin and by anyone with access to the browser profile, has no per-user isolation, no server-side authorization, and no deletion guarantee beyond the one browser profile holding it.

No exception is proposed. There is no "just the session ID," no "just a non-sensitive hint," and no "only in dev." A value that determines access is a credential regardless of what it is called.

**Scope clarification.** This rule governs **script-readable** browser storage. An `HttpOnly` session cookie (§6.1) is the intended transport for the bearer credential (§5.4) and is not a violation of this rule — it is the control, precisely because page JavaScript cannot read it. Where §22 test 21 asserts that "no credential persists in browser storage," it means no credential in script-readable storage; the `HttpOnly` cookie is expected and is subject to §5.5 and §6.1 instead. Independent QA flagged the earlier wording as ambiguous on exactly this point.

`HttpOnly` also has a stated limit: it prevents a script from *reading* the cookie, but it cannot prevent an XSS bug from using the already-authenticated browser to read and exfiltrate private content through the application's own authorized requests. That residual is real, is not closed by any cookie attribute, and is why §6.3 assumes XSS is possible rather than absent.

### 6.3 XSS and session-fixation assumptions

- **XSS is assumed possible, not assumed absent.** `HttpOnly` is load-bearing for that reason. Any future private UI inherits the repo's existing lint/type discipline and must additionally avoid raw HTML injection paths for private content — and, per THREAT-012/THREAT-013, must never treat private document text as instructions or as markup.
- **Session fixation** is addressed by mandatory identifier regeneration at §4.4, not by cookie attributes alone.
- **Session theft** is assumed to be possible via device compromise or an unattended unlocked device. The mitigations are idle timeout (§5.5), individually revocable sessions (§13.1), and revoke-all (§12) — this is why §13.1 refuses to treat multi-session support as a convenience feature — subject in every case to the authority being reachable (§13.2).

---

## 7. Authorization model

Authorization is designed independently of authentication, and this separation is load-bearing rather than stylistic.

### 7.1 Core principles

**REQUIREMENTs:**

- `AUTHORIZATION_DEFAULT=deny`. A private route or record accessor with no explicit authorization decision denies. Reachability is never inherited from being adjacent to an authorized path.
- **Authentication does not imply access.** A valid session establishes *who*, and nothing else. Every private read, write, list, search, export, and delete makes its own authorization decision. THREAT-002 is the case where these two were conflated.
- **Every private object belongs to exactly one workspace scope.** No private record type may omit `userWorkspaceId` (governing plan §1).
- **Ownership is checked server-side, always.** Client-side checks may exist for UX (hiding an action the user cannot perform) but are never authoritative — governing plan §2 `NEVER ALLOW`.
- **ID-addressed records require object-level authorization** in addition to the general route authorization. Knowing an identifier is not evidence of being entitled to the object it names. This is THREAT-004 and it is the reason object-level and route-level checks are listed separately.
- **List / search / index / export paths are workspace-scoped at the query**, not filtered after retrieval. A query that fetches broadly and filters in application code is one missing filter away from THREAT-001, and one export bug away from THREAT-023.
- **Deletion paths are workspace-scoped**, with the same object-level ownership check as reads.
- **Derived artifacts inherit ownership** from their source — extracted text, OCR output, embeddings, caches, exports, provenance anchors. Gate 0A §3 DERIVED_DATA states derived data may never be treated as safer than its source; the authorization consequence is that it carries the same `userWorkspaceId` and the same checks.
- **Private routes never trust client-provided ownership assertions.** A workspace identifier arriving in a request body, query parameter, header, or cookie is an untrusted input to be *validated against* the server-side session, never a value to authorize *from*.

### 7.2 Decision point

`AUTHORIZATION_DECISION_POINT=SERVER_SIDE_PRIVATE_DATA_ACCESS_LAYER_INSIDE_THE_NODE_RUNTIME_BOUNDARY`

**DESIGN CHOICE.** The decision is made server-side, inside the existing Node route boundary (the one `app/api/*/route.ts` handlers already occupy today, §3.1), at a private-data access layer that every private record operation passes through — before any storage I/O, and before any private byte is read.

Two enforcement points, not one:

1. **Route-level:** is there a valid session, is the account `ACTIVE`, is the session unrevoked? A failure here denies before any record is addressed.
2. **Object-level:** does the addressed record's `userWorkspaceId` match the session's authorized workspace? This runs on every ID-addressed access, independently of (1), because (1) passing is exactly the condition under which THREAT-004 bites.

Deliberately **not** chosen: authorization scattered across individual route handlers. Gate 0A THREAT-002's failure mode is "missing on one route," and per-handler checks make that failure invisible — a new route is unprotected by default and nothing detects it. A single access layer makes the deny-by-default property structural: a route that does not go through it cannot reach private data at all. No middleware, helper, or layer is implemented or scaffolded by saying this.

**The bypass invariant, stated testably.** `PRIVATE_ROUTE_BYPASS_MODEL_DEFINED=yes`; `BACKGROUND_JOB_AUTHORIZATION_DEFINED=yes`. Independent QA accepted the single-layer claim but found it under-specified for paths that hold no user session. The invariant is:

> **NO_PRIVATE_DATA_ROUTE_OR_BACKGROUND_JOB_MAY_ACCESS_PRIVATE_DATA_WITHOUT_PASSING_THE_AUTHORITATIVE_AUTHORIZATION_DECISION_POINT.**

It binds, without exception, on: API routes and any other request-reachable private handler; ID-addressed reads; list, search and index queries; export; delete; derived-artifact creation and reads (extracted text, OCR output, embeddings, caches, provenance anchors); background, scheduled, retention, deletion-propagation and index-maintenance jobs; and every service identity (§3.2). There is no "internal" caller exempt from it, and no path that reaches private storage around it. The absence of a user session changes *what authority is presented* — a service principal presents its explicit, workspace-bound, revocable, expiring grant (§3.2, §8.3) — never *whether a decision is made*.

**One precision revision 1 got wrong.** Revision 1 said the decision happens "before any storage I/O," which contradicts itself: deciding requires reading the session record and the addressed object's ownership metadata, both of which are storage I/O. The accurate rule distinguishes two classes of read:

- **Authority and ownership metadata** — the session record, the account status and epoch, and the addressed object's `userWorkspaceId` — *may* be read, because reading them is how the decision is made. These reads return no private payload.
- **Protected private payload** — document content, derived text, embeddings, export bytes, search result bodies — may not be read, streamed, buffered, or emitted until the decision has returned ALLOW. A denied request must never have touched a private byte.

`AUTHORIZATION_DECISION_PRECEDES_PROTECTED_PAYLOAD_ACCESS=yes`. Future tests for both halves of this invariant are at §22 (tests 1-4, 24, 25).

### 7.3 Resource ownership model

`RESOURCE_OWNERSHIP_MODEL=EVERY_PRIVATE_RECORD_KEYED_BY_OPAQUE_USERWORKSPACEID_WITH_DERIVED_ARTIFACTS_INHERITING_SOURCE_WORKSPACE`

Consistent with governing plan §1's `(userWorkspaceId, recordType)` namespacing note, which itself generalizes the type-namespacing already proven in `lib/savedAnswers.ts` for public Saved records.

### 7.4 Client-side checks

Permitted for UX only, never authoritative, and never the sole check. Any UI affordance that hides a private action must have a corresponding server-side denial that works identically when the UI is bypassed entirely. A future security test asserts exactly this (§22, "client-only bypass").

---

## 8. Role model and least privilege

### 8.1 Does the first private architecture need roles?

Assessed against evidence rather than assumed. The first private deployment has one account, one workspace, one owner, and no sharing (§3). A role system exists to express *differences* in authority; with a single principal there are no differences to express. Introducing roles now would add an authorization input that is always the same value, plus a new escalation surface (THREAT-021) defending against a privilege boundary that does not exist.

### 8.2 Selection

`ROLE_MODEL=ROLE_USER_OWNER_ONLY_PLUS_NARROWLY_SCOPED_NON_HUMAN_SERVICE_IDENTITIES`

**DESIGN CHOICE.** Exactly one human role — the workspace owner — with authority over their own workspace and nothing else. Plus, as needed and separately specified at implementation time, non-human service identities scoped to a single function (§3.2).

Explicitly **not** invented, per the mission's own caution and for lack of any supporting evidence: super-admin, steward-with-sharing, manager-with-sharing, organization-wide reader, auditor-with-read, support agent. Each would require sharing or admin read, both of which are unauthorized (§3.4, §9).

Gate 0A §10 asks whether a future steward/representative role might need scoped access to a member's data. Gate 0B's answer: **not in the first architecture**, and if it is ever wanted it is a separate gate (§3.4), because it is a sharing feature wearing a role's clothing.

### 8.3 Least privilege as applied

- The owner principal can act only within its own workspace. There is no scope in which it can address another workspace's record, including by identifier.
- Service principals get one function's worth of access and no interactive authentication path.
- No principal accumulates authority by being logged in longer, by having been created first, or by being the only account.

---

## 9. Operator / admin access

THREAT-022 (operator/admin overreach) is rated Critical impact / High risk in Gate 0A, and the governing plan §26 `NEVER ALLOW`s undisclosed admin access to private content. This section is written to that bar.

### 9.1 The honest starting position

In a local-first single-device deployment the operator, the owner, and the user are the same person, and that person has full filesystem access to the machine by definition (Gate 0A §4.2). No application-level control changes that. Gate 0A names this tension rather than hiding it, and Gate 0B does the same: **on a single-user laptop, application-level operator controls are not a confidentiality boundary against the device's own owner.** They become a real boundary only if a second person's private data ever exists on a system someone else administers — which is exactly `OWNER_DECISION_D1` (§26.1).

Saying so plainly matters, because the alternative is to write an operator-access policy that reads as protective and in fact protects no one today.

### 9.2 Models evaluated

**A — operator technically cannot read user content.** Content is protected by key material only the user's credential can unlock; the operator holds ciphertext and metadata.

- Strongest against THREAT-022, and the only model where the control is architectural rather than procedural.
- Entirely dependent on Gate 0C key design, which does not exist. The governing plan §5 already forbids a master key that decrypts all workspaces with no audit trail, and already defaults key ownership to the user's workspace — which points at this model without deciding it.
- Cost: recovery becomes genuinely hard (§11), and operator support becomes content-blind.

**B — break-glass access requiring explicit action and audit.** Operator content access exists but only through an exceptional, approved, time-boxed, audited, user-visible path.

- A legitimate model, and the usual answer for hosted products.
- But it is only as good as its enforcement, and on a single-operator product the approver and the requester are the same person — the procedural control is self-approved, which is close to no control.

**C — ordinary administrative read access.** Rejected. Directly contradicts governing plan §26's `NEVER ALLOW` and Gate 0A §15's rule that operator access without a corresponding audit entry is a FAIL. Recorded here only to state that it was considered and refused, per the mission's caution against casually choosing it.

### 9.3 Selection

`OPERATOR_PRIVATE_CONTENT_ACCESS=NO_ROUTINE_ACCESS__NO_ADMIN_PRINCIPAL__NO_OPERATOR_IDENTITY_AUTHORITY__MODEL_A_PREFERRED__BREAK_GLASS_UNRESOLVED_PENDING_GATE_0C`

**DESIGN CHOICE, with a named dependency.** For the first private architecture:

- There is **no admin principal, no admin role, no admin session, and no admin route** (§3.2, §8.2, §9.4). There is nothing to log in as, and no operator identity authority over any account (`APPLICATION_ADMIN_PRINCIPAL_PRESENT=no`). This is the strongest control actually available at Gate 0B, and it is available *now* rather than pending another gate.
- Model A is the **preferred target**, consistent with governing plan §5's user-workspace key-ownership default. Gate 0B cannot select it outright, because whether the operator *technically* can decrypt is decided by key design, not by auth design.
- Whether any break-glass path exists at all is `OWNER_DECISION_D2` (§26.2). Gate 0B does not create one. A design with no break-glass path is strictly safer and is the default in the absence of a decision.

`DEPENDENCY_ON_ENCRYPTION_GATE=yes`. Specifically unresolved until Gate 0C: whether operator-held storage is decryptable without the user's credential; whether cryptographic erasure is available as a revocation mechanism for operator reach; and whether any recovery path (§11) implies an operator-usable decryption capability. Those three are the whole of the dependency, and none of them is an auth decision.

### 9.4 Support without privileged identity authority

`OPERATOR_ACCOUNT_RECOVERY_POWER=none`

`OPERATOR_CREDENTIAL_RESET_POWER=none`

`OPERATOR_REACTIVATION_POWER=none`

`OPERATOR_ACCOUNT_CLOSURE_POWER=none`

`APPLICATION_ADMIN_CLOSURE_POWER=none`

`APPLICATION_ADMIN_PRINCIPAL_PRESENT=no`

**This section is a repair.** Revision 1 listed "revoke sessions, disable an account, or trigger a user-initiated recovery" as support operations, and §18 treated operator misuse as unreachable. Independent QA found both wrong: §11.1 excludes operator initiation, approval and completion of recovery, §9.3 defines no admin principal, route or session — so revision 1 granted powers with no principal to exercise them and no stated authentication for them, while Gate 0A THREAT-022 explicitly includes direct filesystem/database access that §18 dismissed. An undocumented superuser is exactly what "support" must not become.

**Three authorities, kept distinct.** Revision 1 blurred them; this revision does not.

1. **OWNER authority (application-level).** Revoking a session, revoking all sessions, changing a credential, regenerating a recovery credential, disabling the account and closing it **from `ACTIVE`** are **owner** actions performed from the `ACTIVE` state. They are performed by the authenticated account owner, through the owner's own ordinary authentication and re-authentication (§4.6), and by nobody else. They were never support powers; listing them under support was the defect.

   `ACTIVE_ACCOUNT_CLOSURE_AUTHORITY=ORDINARY_SESSION_PLUS_SECTION_4_6_REAUTHENTICATION`.

   **Reactivation of a `DISABLED` account is an owner action too, but it does not use that proof, and this revision corrects that.** Revision 2 listed reactivation in this same sentence, which required "the owner's own ordinary authentication and re-authentication (§4.6)" — authority a `DISABLED` account by construction does not have, because disabling revokes every session and denies ordinary authentication (§17.1), and because §4.6's elevated state is session-bound and therefore unreachable without a valid ordinary session (§4.6). Independent re-QA correctly read that as reintroducing the exact unreachable precondition §17 had repaired. The governing rule, stated once and binding document-wide:

   `DISABLED_ORDINARY_SESSION_AUTHORITY=invalid`

   `REACTIVATION_ENTRY_USES_ORDINARY_SESSION=no`

   A `DISABLED` account's entry into the limited reactivation ceremony is authorized **only** by the separately defined accepted recovery authority (§11, with the demanded credential following `OWNER_DECISION_D4`), never by an ordinary authenticated session and never by §4.6 re-authentication. Whether the ceremony exists at all is `OWNER_DECISION_D5` (§26.5). It remains an owner action under every outcome: no operator, support function or admin principal can initiate, approve or complete it (`OPERATOR_REACTIVATION_POWER=none`).

   **Closure of a `DISABLED` account is the same shape of problem, and revision 4 corrects it the same way.** Revision 3 left "closing it" in the sentence above without qualification while §17.1 separately promised a `DISABLED` → `CLOSED` election; independent re-QA of revision 3 found that pair unreconciled, because the sentence above demands exactly the ordinary-session and §4.6 authority that `DISABLED` removes. The governing rule extends without exception:

   `DISABLED_CLOSURE_USES_ORDINARY_SESSION=no`

   `DISABLED_ACCOUNT_CLOSURE_AUTHORITY=UNDECIDED_OWNER_DECISION_D6`

   If — and only if — `OWNER_DECISION_D6` (§26.6) permits a `DISABLED` account to close itself, entry into the limited `ACCOUNT_CLOSURE_CEREMONY` of §17.1 is authorized **only** by the separately defined accepted recovery authority (§11, credential per `OWNER_DECISION_D4`), never by an ordinary authenticated session, never by §4.6 re-authentication, never by break-glass content authority (§9.5, D2), and never by Gate 0C key authority (§20). It too remains an owner action under every outcome: `OPERATOR_ACCOUNT_CLOSURE_POWER=none`, `APPLICATION_ADMIN_CLOSURE_POWER=none`. **No operator, support function or admin principal may close, or assist in closing, a user's account** — under either D6 outcome and from either originating state. This document does not create an operator or administrative closure authority, and none may be inferred from a support requirement, a retention obligation, an abuse report, or an incident.
2. **SUPPORT function (application-level, content-free, unprivileged).** Support holds **no** application identity with authority over an account. It cannot authenticate as the user, cannot act on the user's behalf, and cannot reach private content, because there is no principal for it to do so as (§9.3). What remains — and it is genuinely sufficient for a single-owner local product — is:
   - explaining recovery, reactivation, and credential-change steps so the user can perform them themselves;
   - interpreting safe, closed-enumeration error and event codes (§16.3) the user reports;
   - checking service health and whether the application is running;
   - where a future design permits it, confirming that an account state exists — `ACTIVE` / `DISABLED` / `CLOSED` — without exposing private content;
   - reading content-free auth audit events (§16) where the deployment grants that access: counts, outcome codes, timestamps, `SESSION_AUDIT_ID` and other opaque references, correlation identifiers — never a bearer credential (§5.4, §16.4);
   - confirming that a record exists and its safe-label metadata — type, size band, retention state, redaction state — per the metadata-minimization model the governing plan §9 and `lib/redactionMetadataModel.ts` already establish for fake data;
   - reproducing a defect against synthetic/fake fixtures, the discipline this repository already runs on (Gate 0A §15);
   - helping the user use their **own** recovery material, without ever receiving, holding, viewing, or transcribing it.
   Support may **not** initiate, approve, or complete a recovery; may not reset or rotate a credential; may not reactivate a disabled account; **may not close, disable, or elect closure of an account, from any originating state**; may not revoke or create a session; and may not change account state. Those are owner actions, and none of them acquires an operator on-ramp by being listed in a support section.
3. **OS / root authority (local, not application authority).** In some deployment scenarios whoever administers the host has root and full filesystem access to it. That is a fact about the machine, and this document states it (§9.1) rather than hiding it. It is **not** application authentication authority, it is not an application principal, and it confers no application-level account-recovery, credential-reset, or reactivation power. Whether OS/root access can technically decrypt private content is a **Gate 0C** question (§20) and is deliberately not answered here. Critically, application-level controls do not mitigate OS-level access, so THREAT-022 keeps its operator residual in full (§18, §21).

No capability above is expandable at implementation time. If the owner ever wants an operator to hold real identity authority, that requires an explicit owner decision in a later design revision with its own threat model — it may not be inferred from a support requirement, a recovery convenience, or an incident.

### 9.5 If a break-glass path is ever authorized

Not authorized, not designed, not implemented. Minimum bar it would have to clear, recorded so that D2 can be decided against something concrete: explicit user-visible initiation or notification; a stated, recorded, task-scoped reason; hard time-boxing with automatic expiry; a scope limited to the specific records the task requires rather than the workspace; `ADMIN_BREAK_GLASS_STARTED` / `ADMIN_BREAK_GLASS_ENDED` audit events that cannot be suppressed by the principal using the path (§16); independent revocation; and a content-free audit trail that is itself reviewable. Operator access with no corresponding audit entry is a FAIL state, without exception (Gate 0A §15).

---

## 10. MFA policy

### 10.1 Assessment

- **Normal users, local-first deployment.** The credential threats MFA is best at — remote credential stuffing, phishing, password reuse — largely do not apply to an account reachable only from loopback on one laptop. The dominant threat is THREAT-024 device loss, and a second factor stored on the same lost device adds little.
- **Normal users, if network-exposed.** The calculus inverts completely. A network-reachable authentication endpoint holding union members' grievance and medical/OWCP-like material (Gate 0A §3, highest sensitivity) without a second factor is not defensible.
- **Operator/admin principals.** Not applicable: there is no admin principal (§9.3). If D2 ever creates a break-glass path, MFA on it is mandatory, not optional.
- **Recovery-sensitive actions.** Credential change, recovery-credential regeneration, revoke-all, disable, closure — these already require re-authentication (§4.6). Where a second factor exists, it is required for these regardless of whether it is required at ordinary login.

### 10.2 Selection

`MFA_POLICY=DEFERRED_FOR_THE_LOCAL_SINGLE_USER_DEPLOYMENT__REQUIRED_BEFORE_ANY_NETWORK_EXPOSED_OR_MULTI_USER_DEPLOYMENT__MANDATORY_ON_ANY_BREAK_GLASS_PATH_IF_ONE_IS_EVER_AUTHORIZED`

**DESIGN CHOICE.** Deferred, with the deferral bounded by a condition rather than by a date.

Why deferral is safe *for the intended first deployment*, specifically: the first deployment is one account, on one laptop, bound to `127.0.0.1`, with no registration surface, no external identity dependency, and no remote authentication endpoint to attack. The realistic compromise paths are physical device access and local malware — and both defeat a same-device second factor too. What actually mitigates them is device-level encryption plus idle timeout (§5.5) plus revocability (§12, §13), all of which this design requires.

Why the deferral is conditional rather than open-ended: the moment D1 (§26.1) authorizes network exposure or a second user, the premise above is void. The condition is written into the policy value so that "we deferred MFA" cannot later be cited as precedent for shipping a network-exposed deployment without it.

**The deferral boundary, made testable.** `MFA_DEFERRAL_BOUNDARY_TESTABLE=yes`. Independent QA found the deferral premise plausible but unfalsifiable: nothing required the runtime to *refuse* when the premise stopped holding, and a D1 answer on paper cannot prove what a deployment actually does. The deferral is therefore conditioned on a **deployment qualification test** whose conditions are observable, not on an intention:

`MFA_DEFERRAL_ALLOWED` only while **all** of the following hold and are demonstrated by that test:

- the private authentication and private-data endpoints are bound **exclusively** to an accepted local-only interface within the deployment class D1 authorizes — no non-loopback bind, no LAN bind, no wildcard bind;
- no network-reachable path to a private endpoint exists, including via a reverse proxy, port forward, tunnel, container publish, or any other forwarding arrangement;
- there is exactly **one** user-owner account, and no registration or enrolment surface by which a second could appear;
- no multi-user mode is enabled or reachable;
- no break-glass principal exists (D2 not decided as (b), §26.2);
- the deployment qualification test itself passes and is re-run as a precondition of the deployment, not once at design time.

If **any** condition ceases to hold: `MFA_REQUIRED_BEFORE_EXPOSURE=yes`, and the correct behaviour is to **refuse to serve the private surface** until a second factor is in place — not to serve it and log a warning. Conditions that fail this test include a non-loopback binding, a forwarding or proxy exposure, and the creation of a second account; the LAN case is explicitly in scope. How the test is implemented at runtime is not prescribed here. Future tests: §22 tests 26 and 27.

**One assessment correction.** Revision 1's "a second factor on the same lost device adds little" is true of a same-device software factor and not true in general: a separate hardware authenticator, or a factor requiring user verification, does change the physical-access calculus. Conversely, login-time MFA does not defend against local malware or the theft of an already-live session — those are answered by idle timeout (§5.5), revocability (§12, §13) and device-level protections (§13.2), not by a login factor. Which factor, and whether any fallback exists, is `OWNER_DECISION_D4` (§26.4).

If a second factor is implemented, the constraint from §19 applies: it must not introduce an external dependency. An offline, device-held authenticator factor satisfies this; SMS and email-based factors do not, and are additionally weak.

No MFA code, enrolment flow, secret, or library is designed, named, or authorized here.

---

## 11. Account recovery

Recovery is treated as an authentication bypass surface, because that is what it is: a second path to the same access, usually with weaker proof and less scrutiny than the primary path. A recovery design that is easier to attack than login has not added availability, it has replaced the front door with the back one.

### 11.1 Requirements

**REQUIREMENTs for any future recovery design:**

- **Forgotten / lost credential:** a recovery path exists, but it proves possession of something the user holds, not knowledge of facts about the user.
- **No security questions based on personal facts.** Explicitly forbidden. For KIA Stick's user population this would be doubly bad: the answers are frequently discoverable from the same employment context the tool operates in.
- **Lost MFA factor** (if MFA exists): handled by the same user-held recovery credential, never by an operator override.
- **Lost device:** revocation of that device's sessions (§13.1) is independent of, and does not require, credential recovery — **provided the authoritative session service is still reachable.** Where the lost device *is* the sole authority, remote revocation is unavailable and the honest posture is §13.2. Revision 1 promised revocation unconditionally; that promise was invalid for the sole-host case.
- **Account-takeover resistance:** recovery requires proof of possession of a credential issued through an authorized ceremony and held by the user. It never depends on a channel KIA Stick does not control, and never on an operator's judgment.
- **Recovery is a distinct ceremony, not an alternate login.** Successfully presenting recovery material authorizes a bounded credential-reset ceremony; it does **not** by itself open an ordinary authenticated session over private data, unless `OWNER_DECISION_D4` (§26.4) explicitly chooses that policy. A fresh ordinary authentication is required afterwards before any protected private-data request is served.
- **Recovery does not disclose private content**, and does not bypass any Gate 0C encryption constraint (§11.3, §20). Recovering *access* is not recovering *content*; see §11.4.
- **Rate limiting:** recovery attempts are rate-limited and progressively delayed exactly as authentication attempts are (§15), because an unlimited recovery endpoint is an unlimited authentication endpoint.
- **Operator involvement:** none, in any path — not merely none in the routine path. An operator cannot initiate, approve, or complete a recovery, cannot reset a credential, and cannot reactivate a disabled account: `OPERATOR_ACCOUNT_RECOVERY_POWER=none`, `OPERATOR_CREDENTIAL_RESET_POWER=none`, `OPERATOR_REACTIVATION_POWER=none` (§9.4). This is the direct consequence of §9 — a recovery path an operator can drive *is* a silent admin read path, however it is labelled. Support may explain the steps and help the user use their own material, and that is the whole of it.
- **User notification:** recovery start and completion are recorded as audit events (§16) and surfaced to the user. In a single-user local deployment the "notification" is in-application rather than out-of-band; an out-of-band channel would be an external dependency (§19).
- **Audit:** `RECOVERY_STARTED` / `RECOVERY_COMPLETED`, content-free.
- **Session invalidation after recovery:** **mandatory.** Completing a recovery revokes every existing session for the account (§12), because the premise of recovery is that the prior access state is no longer trusted.

### 11.2 Selection

`RECOVERY_MODEL=USER_HELD_OFFLINE_SINGLE_USE_RECOVERY_CREDENTIAL_ISSUED_AT_ACCOUNT_CREATION__SEPARATE_CEREMONY_FROM_ORDINARY_AUTHENTICATION__NO_OPERATOR_RECOVERY_PATH__NO_EXTERNAL_CHANNEL`

**DESIGN CHOICE.** At account creation the user is issued a high-entropy **recovery credential** — the term used consistently from here on, in place of revision 1's "recovery secret," to keep it visibly a credential subject to §4.8 and §16.4 rather than an incidental string. It is displayed once, stored by the user outside the application (written down, or in a password manager), and stored server-side only as a verifier. Using it authorizes a credential-reset ceremony — not an ordinary session (§4.8) — is single-use, and forces issuance of a replacement. Its full lifecycle is below, and holds under every `OWNER_DECISION_D4` outcome.

Chosen because it is the only model that satisfies every requirement above without an external channel (§19) and without an operator (§9). Email and SMS reset are excluded on both grounds — they are external dependencies *and* they relocate the real key to a third-party account. Security questions are excluded outright. Operator-mediated reset is excluded because it recreates THREAT-022.

The cost is real and must be stated to the user up front rather than discovered: **if both the credential and the recovery credential are lost, account access is not recoverable by anyone, including the operator.** Gate 0A §2 lists Recoverability as an objective in explicit tension with confidentiality and provable deletion, and requires that tension be designed for rather than left implicit. This is that design: KIA Stick chooses confidentiality, discloses the consequence at account creation, and does not hold a hidden bypass. What that means for the *content* — as opposed to the account — is a Gate 0C question and is not asserted here (§11.4, §26.3).

`RECOVERY_SECRET_LIFECYCLE_COMPLETE=yes`

**Recovery credential lifecycle — complete, and binding under every D4 outcome.** Revision 1 established high entropy, verifier-only storage, single use and replacement-on-use, but left regeneration, concurrency and failure undefined: independent QA found that regenerating did not require invalidating the old unused secret, and that concurrent consumption and failed-replacement outcomes were unspecified. Those are the gaps that let two valid secrets exist at once. The full lifecycle:

- **Entropy.** High entropy, generated by a cryptographically secure source, with strength sufficient that guessing is infeasible independent of the rate limits in §15. Never user-chosen, never derived from any credential, personal fact, or account identifier.
- **Issuance.** Generated only through an explicitly authorized ceremony: account creation (§4.1), or a regeneration that itself required current strong authority (below). Never issued as a side effect of any other operation.
- **Delivery confirmation.** Where the model uses user-held material, issuance is not complete until the user has confirmed receipt. An unconfirmed issuance leaves the previously valid credential in force rather than silently replacing it with one the user never captured.
- **Storage.** Server-side as a verifier only, under §4.8's rules. Never stored, persisted, cached, printed, or logged as plaintext by any ordinary diagnostic, error path, telemetry, proof artifact, or notification (§16.4).
- **Use is one-time.** A successful consumption permanently invalidates that credential. `EXACTLY_ONE_SUCCESSFUL_CONSUMPTION` — where two ceremonies race, at most one succeeds, and the other is denied as an invalid credential rather than both proceeding. Replay of a consumed credential fails closed and emits an audit event (§22 test 29).
- **Use forces replacement.** Consumption mandates issuance of a replacement through the same confirmed-issuance rule. If replacement issuance fails or is not confirmed, the account is left in a defined state — the consumed credential remains invalid, no new credential is silently minted, and the outstanding replacement obligation is recorded and surfaced to the user — rather than in an ambiguous one.
- **Use revokes sessions.** Completing a recovery increments the account epoch and revokes every existing session (§11.1, §12.4).
- **Regeneration requires current strong authority.** Regenerating a recovery credential requires re-authentication (§4.6) with current ordinary authentication authority. It may **not** be driven by a weaker fallback path, and may not be driven by presenting the existing recovery credential alone. **Regeneration invalidates the previous credential immediately on confirmed issuance of its replacement** — this was the specific revision 1 gap.
- **No silent accumulation.** At most one recovery credential is valid for an account at any time. `CONCURRENTLY_VALID_RECOVERY_CREDENTIALS=at_most_one`. Multiple forgotten copies of previously valid material must not remain acceptable; each issuance retires its predecessor.
- **Compromise or theft has a defined response.** Suspected exposure is treated as a credential compromise (§18): immediate regeneration under re-authentication, revocation of all sessions, and an audit record. If the user cannot re-authenticate to regenerate, the correct outcome is the recovery-loss posture (§26.3), not an operator bypass.
- **Auditable without recording the secret.** `RECOVERY_STARTED`, `RECOVERY_COMPLETED`, issuance, confirmation, regeneration, replay-rejection and replacement-failure are all recorded as content-free events (§16) that record *that* the state changed and never any fragment of the material itself.
- **Rate-limited** at least as strictly as login (§11.1, §15).

### 11.3 Encryption dependency

`RECOVERY_ENCRYPTION_DEPENDENCY=yes`

Unresolved until Gate 0C, stated precisely: this section designs recovery of **access** (credential and session state). Whether recovering access also recovers **content** depends entirely on how key material relates to the user credential — a question this document does not touch. Three sub-questions handed to Gate 0C:

1. If content keys derive from the user credential, does a credential reset orphan the content, and does the recovery credential therefore also need to protect key material?
2. Can the recovery credential serve as an alternate key-unwrap path without becoming the master key the governing plan §5 forbids?
3. Is "lost credential" designed to equal "content unrecoverable by design" — Gate 0A §11's lost-key question — and if so, is the user told at account creation?

Gate 0B deliberately does not answer these. Answering them *is* encryption design. The auth-side constraint Gate 0C inherits is: whatever it chooses must not create an operator-usable decryption capability (§9), and must not require an external channel (§19). One conditionality is worth stating so Gate 0C is not handed a contradiction: the no-operator-unwrap constraint is written against the current preferred model, in which D2 (§26.2) is not decided as (b). If the owner ever chooses a break-glass path, that constraint must be re-derived rather than silently carried forward.

### 11.4 Account recovery is not data recovery

`AUTH_RECOVERY_DISTINCT_FROM_DATA_KEY_RECOVERY=yes`

These are two different things and this document is responsible for only the first:

- **AUTHENTICATION / ACCOUNT RECOVERY** — restoring the user's ability to authenticate and hold an authorized session. Designed here, in §11.
- **PRIVATE-DATA / KEY RECOVERY** — whether the bytes of previously stored private content can still be decrypted and read. **Not** designed here, and not decidable here, because it depends on how key material relates to the credential — a Gate 0C question (§20).

Two inferences are therefore forbidden anywhere in this design, and both appeared in revision 1:

- Successful account recovery does **not** imply that encrypted private content can be decrypted.
- Loss of account access does **not**, by itself, establish that private content is permanently lost. Until Gate 0C defines key and recovery semantics, that outcome is undetermined, and asserting either answer overstates what Gate 0B knows.

---

## 12. Revocation

### 12.1 Fixed requirement

`REVOCATION_REQUIREMENT=DENY_ON_NEXT_PROTECTED_REQUEST_AFTER_AUTHORITY_ACCEPTS_REVOCATION`

The Gate 0A floor — `DENY_ON_NEXT_PROTECTED_REQUEST`, no stale-ALLOW tolerance window — is fixed by Gate 0A, not by this document, and is **not weakened here**. Gate 0B selects a mechanism capable of satisfying it and does not restate, reinterpret, or soften it. TTL-only models remain rejected (§5.2, §12.2).

The trailing clause names a precondition that was always implicit and that revision 1 left unstated, which allowed §§11/13/18/22 to promise revocation in a scenario where it cannot be delivered. Once the authoritative session service has **accepted** a revocation, the very next protected request presenting that session is denied, with no window. What the requirement cannot do is bind an authority that never received the revocation: an authoritative service that is unreachable — because the device holding it was lost or stolen (§13.2) — cannot accept anything. That is an availability-of-authority limit, not a tolerance window, and it is stated honestly rather than papered over. `LOST_DEVICE_REMOTE_REVOCATION_ALWAYS_AVAILABLE=no` (§13.2).

### 12.2 Mechanism

**DESIGN CHOICE:** authoritative server-side session state (§5.3) with **immediate session-record invalidation**, plus an **account-level authorization epoch** consulted on every protected request.

- **Session-level:** revoking a session deletes or marks invalid the authoritative record. The next protected request presenting that identifier fails its lookup and is denied. There is no window because there is no cached ALLOW to outlive the revocation.
- **Account-level:** an integer epoch on the account, incremented by credential change, recovery completion, account disable, account closure, and revoke-all. Every protected request validates the session's recorded epoch against the account's current epoch; a mismatch denies. This makes bulk revocation atomic and correct even if some session records are slow to be removed.

Both are authoritative server-side reads, not caches. Where any caching is ever introduced, Gate 0A's condition binds: caching is permitted only where it is *demonstrably* revocation-aware, and a short-lived stale ALLOW is not acceptable for a protected private-data request. A TTL-only model is explicitly rejected here, as Gate 0A requires.

### 12.3 Testable invariant

> After an accepted revocation, the next protected request using the revoked session is denied.

Stated in this form deliberately: it is directly testable, it names the observable (the next protected request), and it admits no tolerance window. It appears as a required future test in §22.

### 12.4 Coverage

| Event | Effect |
|---|---|
| Logout | That session invalidated server-side; next protected request denied |
| Individual device/session revoke | That session only; other sessions unaffected (§13.1), and available only where the authority is reachable (§13.2) |
| Revoke all devices | Epoch incremented; every session denied on its next protected request |
| Credential reset / change | Epoch incremented; **all** sessions revoked, **including the session that made the change** (§4.8, the single governing rule); the initiating client re-authenticates and is not silently re-issued a session |
| Recovery completion | Epoch incremented; all sessions revoked (§11.1) |
| Account disable | Epoch incremented; all sessions revoked; subsequent authentication denied (§17) |
| Account closure | Epoch incremented; all sessions revoked permanently (§17) |
| Operator session revocation | No operator principal exists (§9.3), so there is no operator session to revoke. If D2 ever authorizes a break-glass path, its session is independently and immediately revocable, and its expiry is not the revocation mechanism |

---

## 13. Multi-device session model

### 13.1 Concurrent sessions

`MULTI_DEVICE_POLICY=MULTIPLE_CONCURRENT_SESSIONS_ALLOWED__EACH_INDIVIDUALLY_IDENTIFIED_AND_INDIVIDUALLY_REVOCABLE__CONTENT_FREE_SESSION_METADATA`

**DESIGN CHOICE.** Concurrent sessions are permitted.

Why permitted rather than restricted to one: a single-session rule sounds safer and is not. It provides no confidentiality benefit — one stolen session is fully sufficient for an attacker — while creating a pattern where logging in elsewhere silently kills the user's working session, which trains users to treat unexpected logouts as normal. That is the exact signal that should alarm them. It is also wrong on the facts even in the "single-device" deployment: two browsers, or a normal and a private window, on the same laptop are already two sessions.

Requirements where concurrency is allowed:

- **Individual session identity:** each session is a distinct record with its own opaque identifier. No shared or reused identifier.
- **Session list:** the owner can enumerate their own active sessions.
- **Revoke one:** any listed session can be revoked individually, denying its next protected request (§12).
- **Revoke all:** available, epoch-based, and a required control after suspected compromise (§18) and after recovery (§11).
- **Last-used metadata:** coarse and content-free — the session's `SESSION_AUDIT_ID` (§5.4, never its bearer credential), creation time, last-activity time, and a coarse client descriptor. Enough for the owner to recognise a session they do not expect. A session list that displayed the bearer credential would be a credential-disclosure surface; it displays the audit identifier instead, which cannot authenticate anything.
- **No private content in session metadata.** REQUIREMENT (§1.3, §16). Session metadata is audit-class data (Gate 0A §3 AUDIT / SECURITY METADATA) and carries no document content, no case facts, no personal identifiers, and no private paths. Precise geolocation and any identifier-shaped value are excluded — a session list is a support surface, not a tracking surface.

### 13.2 Lost or stolen device, and the reach of revocation

`LOST_DEVICE_REMOTE_REVOCATION_ALWAYS_AVAILABLE=no`

Revision 1 promised, across §§11/13/18/22, that a lost device's sessions could always be revoked without credential recovery. Independent QA found that promise invalid for the deployment this document actually prefers: if the only Node/session authority runs on one loopback laptop and that laptop is lost, no other device can reach the authority to revoke anything, and two browser profiles on the same lost machine are not an independent control channel. The two cases are now separated, and which one applies is a direct consequence of `OWNER_DECISION_D1` deployment reach (§26.1).

**CASE A — the authoritative session service remains reachable** from a trusted device or path the user still controls (for example, the lost item is a browser client, a second machine, or a phone, while the authority runs elsewhere and is still reachable).

- Individual-session revocation and revoke-all are both available and behave exactly as §12 specifies.
- The §12.3 invariant applies in full: the next protected request from the lost device is denied.
- This is the case the incident-response row in §18 assumes.

**CASE B — a strictly local deployment in which the lost or stolen device contains the only authoritative auth/session service.**

- **Application-level remote revocation is unavailable.** There is no independent reachable authority to accept a revocation, so there is nothing for the next-request invariant to act on. The design does not pretend otherwise, and no future document may cite §12 as evidence that this case is covered.
- **Device and OS-level protection becomes a critical containment dependency** — full-disk encryption, a strong device credential, lock-screen policy, and whatever remote-wipe capability the *device platform* provides. These are outside the application boundary and outside this document's authority, but the design depends on them here and must say so.
- **Private-data confidentiality may additionally depend on Gate 0C** encryption design and on at-rest protection of the device (§20). Whether the private content on that device is readable by whoever holds it is not an auth question and is not answered here.
- **The user should treat the lost device as potentially compromised**, including any session that was live on it, rather than assuming a session expired safely.
- **Any future migration or recovery to another authority must be separately designed**, and must not silently resurrect sessions: a restored or migrated authority may not reinstate session records that were live on the lost device.
- The §12 invariant is not weakened. It applies from the moment the authoritative system accepts a revocation; it does not and cannot guarantee acceptance by an authority nobody can reach.

**What this is not.** It is not a hidden requirement for a cloud service, a remote management channel, or a second always-on host. Introducing one would be a D1 decision with its own privacy and network consequences (§19, §26.1), not an implementation-time fix for this limitation. Stating the limitation honestly is the deliverable; choosing whether to pay for a remote control plane is the owner's.

---

## 14. CSRF and cross-origin model

### 14.1 CSRF

**REQUIREMENT** (Gate 0A §9): CSRF protection on any private state-changing endpoint, given the cookie-based session model selected in §5.

- Every private state-changing request carries a CSRF defence that does not rely solely on the cookie being present — because the browser attaches the cookie automatically, which is precisely the property CSRF abuses.
- `SameSite` (§6.1) is defence in depth, not the whole control. It is a cookie-attachment policy enforced by the browser, with variation across browsers and versions, and it is not a substitute for a per-request check.
- Safe methods are genuinely safe: no private state change, no deletion, and no privilege change behind a GET.
- Every private deletion, revocation, credential change, and closure path is a state-changing endpoint for this purpose.

### 14.2 Origin and CORS

- **Origin assumptions:** the private surface is same-origin and single-origin. The repo has exactly one application origin today and no evidence of any second first-party client.
- **CORS default: deny.** No cross-origin access to any private API. No permissive origin reflection, no wildcard, and no credentialed cross-origin requests.
- **Cross-origin private API access: denied unless explicitly designed**, which it is not, here or elsewhere. Any future need for it is a separate design question with its own review.
- **State-changing request protections:** origin/referer validation in addition to the CSRF control, consistent with the deny-by-default posture.

**No CORS or runtime code is changed by this document.** The existing public routes (`app/api/public-source/route.ts`, `app/api/public-cba-source/route.ts`) are untouched, and their current behaviour — `runtime = "nodejs"`, `dynamic = "force-dynamic"`, query strings rejected, `Cache-Control: no-store` — is recorded here as observed fact, not modified.

---

## 15. Rate limiting, lockout, and abuse

### 15.1 Surfaces requiring limits

Login; account creation (the bootstrap path, if it is ever repeatable); recovery; MFA verification if MFA exists; session creation; and credential reset. Each is an endpoint where an attacker gets unlimited guesses unless something stops them.

### 15.2 Requirements

- **No permanent lockout.** A permanent or long lockout triggered by failed attempts is a trivial denial-of-service against the legitimate owner — and in a single-account deployment, locking out the one account locks out the entire product. Gate 0A §16's rate-limit rule is about denying the *marginal request*, not about destroying availability.
- **Progressive delay** as the primary mechanism: increasing backoff per failed attempt, which makes brute force and credential stuffing uneconomic while leaving a legitimate user a usable path after a short wait.
- **Scope:** limits applied per account *and* per source, so that neither an attacker spreading attempts across accounts nor one hammering a single account escapes. In a single-account deployment the per-account limit is the operative one, which is exactly why it must not be a hard lock.
- **Recovery limits are at least as strict as login limits** (§11.1).
- **Fail closed on unknown limiter state:** if rate-limit state is unavailable or ambiguous, deny the marginal request rather than allow unbounded retries — Gate 0A §16, verbatim in effect.
- **Operator/admin protections:** not applicable — no admin principal (§9.3). If D2 ever authorizes a break-glass path, it is rate-limited and audited at least as strictly as user authentication.
- **Security-event recording:** repeated failures emit `LOGIN_FAILED` / `ACCESS_DENIED` events with safe reason codes and counts only (§16). Never the attempted credential, and never a partial credential.

No rate-limiting implementation, library, store, or configuration is added or authorized.

---

## 16. Auth audit event model

### 16.1 Governing rule

`PRIVATE_CONTENT_IN_AUTH_AUDIT_ALLOWED=no`

`AUTH_SESSION_CREDENTIAL_LOGGING_ALLOWED=no`

**Two absolute rules, not one.** The first keeps private *content* out of audit records. The second — added in this revision — keeps *authenticating material* out of them, and it is absolute in the same way: no actual session cookie, bearer credential, refresh credential, recovery credential, credential verifier, or any hash, truncation, or encoding of such material from which a request could be authenticated or a session replayed, may be placed in application logs, auth audit records, telemetry, diagnostic output, proof artifacts, or notifications. There is no diagnostic exception and no "only the first few characters." Where session events need correlating, the non-authenticating `SESSION_AUDIT_ID` (§5.4) exists for exactly that purpose. `SAFE_SESSION_AUDIT_IDENTIFIER_DEFINED=yes`.

**REQUIREMENT**, from Gate 0A §15 (`PRIVATE_CONTENT_LOGGING_ALLOWED=no`, absolute, no diagnostic exception). Audit records are themselves data (Gate 0A §3 AUDIT / SECURITY METADATA) and must not become the channel that leaks what the rest of the architecture protects.

The shape below deliberately reuses the append-only label/count/boolean/timestamp convention this repository already uses for its own proof and gate output (`docs/v0.6-future-implementation-gate-draft.md`, "Audit" gate type; governing plan §22), rather than inventing a new one.

### 16.2 Event types

`ACCOUNT_CREATED`, `LOGIN_SUCCEEDED`, `LOGIN_FAILED`, `SESSION_CREATED`, `SESSION_REVOKED`, `LOGOUT`, `RECOVERY_STARTED`, `RECOVERY_COMPLETED`, `MFA_CHANGED`, `ACCESS_DENIED`, `AUTHORIZATION_CHANGED`, `ACCOUNT_DISABLED`, `ACCOUNT_CLOSED`, `ADMIN_BREAK_GLASS_STARTED`, `ADMIN_BREAK_GLASS_ENDED`.

The last two are defined but unreachable in the first architecture, since no admin principal exists (§9.3). They are specified now so that if D2 ever authorizes a break-glass path, the audit obligation is already fixed and cannot be negotiated down at implementation time.

### 16.3 Allowed fields

- Event type, from the closed enumeration above.
- Timestamp.
- Opaque account identifier, opaque workspace identifier, and `SESSION_AUDIT_ID` (§5.4) — references, never content, and never derived from a personal identifier.

  **This is the F1 repair and it is the whole point of §5.4.** Revision 1 permitted an "opaque session identifier" here while using the same phrase in §5.4 for the bearer credential, so implementing this allowed-field list literally would have written a live credential into the audit log — violating Gate 0A §15 and THREAT-007. The permitted value is the **non-authenticating** `SESSION_AUDIT_ID`, and it is permitted *because* it cannot authenticate a request, cannot be replayed, and cannot be turned back into the bearer credential. The bearer credential is not permitted here in any form: not whole, not hashed, not truncated, not encoded, not "for one release." The same substitution applies wherever a session is referenced outside the authentication path — audit events, the §13.1 session list, rotation records, incident records, and every future test in §22.
- Safe reason or error code from a closed enumeration (e.g. `NO_SESSION`, `SESSION_REVOKED`, `OWNER_MISMATCH`, `ACCOUNT_DISABLED`, `RATE_LIMITED`). Codes, not free text: free text is how private content reaches logs.
- Correlation identifier, tying related events together without carrying content.
- Coarse outcome (`ALLOWED` / `DENIED`) and counts.

### 16.4 Forbidden fields

Passwords, passphrases, recovery credentials, credential verifiers, or any fragment of them; **session bearer credentials, session cookies, refresh credentials, and any value that authenticates a request or permits session replay, whether whole, hashed, truncated, or encoded** (§5.4, §16.1); any other credential; private document text; OCR output; private prompts or model output; medical, OWCP-like, personnel, employment, or financial facts; real document paths or filenames; case facts; personal identifiers; free-text diagnostic traces over private-data flows; and anything from which private content could be reconstructed.

`ACCESS_DENIED` records *that* a denial happened and its coded reason — never the content the requester was trying to reach.

### 16.5 Retention

Bounded, longer than the underlying data where incident response requires it, but never a route around a user's deletion request (Gate 0A §3 AUDIT / SECURITY METADATA). Exact retention interacts with the retention/deletion gate and is not set here.

---

## 17. Account and workspace lifecycle

Authorization consequences only. Private-data deletion mechanics are reserved for the retention/deletion gate and are deliberately not solved here.

### 17.1 Account state machine

`ACCOUNT_STATE_MACHINE_COHERENT=yes`

`DISABLED_ACCOUNT_PROTECTED_ACCESS=deny`

`DISABLED_ORDINARY_SESSION_AUTHORITY=invalid`

`REACTIVATION_ENTRY_USES_ORDINARY_SESSION=no`

`REACTIVATION_CEREMONY_PRIVATE_DATA_ACCESS=deny`

`REACTIVATION_SUCCESS_TRANSITION=DISABLED_TO_ACTIVE_ONLY`

`CLOSED_REACTIVATION_ALLOWED=no`

`FRESH_NORMAL_AUTH_REQUIRED_AFTER_REACTIVATION=yes`

`ACTIVE_ACCOUNT_CLOSURE_AUTHORITY=ORDINARY_SESSION_PLUS_SECTION_4_6_REAUTHENTICATION`

`DISABLED_ACCOUNT_CLOSURE_AUTHORITY=UNDECIDED_OWNER_DECISION_D6`

`DISABLED_CLOSURE_USES_ORDINARY_SESSION=no`

`ACCOUNT_CLOSURE_CEREMONY_PRIVATE_DATA_ACCESS=deny`

`APPLICATION_ADMIN_CLOSURE_POWER=none`

`CLOSED_STATE_TERMINAL_FOR_GATE_0B=yes`

`ACCOUNT_CLOSURE_IMPLIES_PRIVATE_DATA_DELETION=no`

`ACCOUNT_CLOSURE_IMPLIES_KEY_DESTRUCTION=no`

`PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES`

**This is a repair, twice over.** Revision 1 revoked every session and denied authentication on disable, then said a disabled account "may be re-enabled by the owner via re-authentication (§4.6)." Independent QA found that path unreachable: §4.6's elevated state is session-bound, disabling leaves no session and permits no new one, and there is no admin principal to act instead (§9.3). Revision 2 added the dedicated ceremony below, but left two contradictions that independent re-QA then failed: §9.4 still routed reactivation through ordinary authentication and §4.6 re-authentication — the same unreachable precondition — and this section allowed `DISABLED` → `CLOSED` through the same ceremony while describing the ceremony's success as returning the account to `ACTIVE`, so a closure could be read as an activation. Both are fixed here. §9.4 now states `REACTIVATION_ENTRY_USES_ORDINARY_SESSION=no` as a governing rule, and the ceremony below has exactly one success transition. The state machine is coherent in the sense that every state is reachable, every transition names the authority that performs it, no transition requires authority the originating state has by construction removed, and no outcome is described as two different things.

**And a third time, for the other outgoing transition (revision 4).** Revision 3 applied the rule above to reactivation and then left the `DISABLED` → `CLOSED` election standing with no authority named at all: §4.6 required session-bound re-authentication for "account closure" without qualification, `DISABLED_ORDINARY_SESSION_AUTHORITY=invalid` made that unreachable from `DISABLED`, and §17.1 promised the transition anyway while deferring only *which credential* it demands to D4 — which selects a credential type, not an authority model. Independent re-QA of revision 3 raised this as `S1_DISABLED_CLOSURE_AUTHORITY_UNRECONCILED` and, correctly, made no product choice. This revision fixes it by doing three separate things that revision 3 conflated into silence:

1. **Separating the two closure authorities.** `ACTIVE` closure and `DISABLED` closure are different transitions with different entry authority, and the document now says so in every place it previously said "account closure" flatly (§4.6, §4.9, §9.4, here, §17.4, §22).
2. **Specifying, without selecting, a bounded `ACCOUNT_CLOSURE_CEREMONY`** for the disabled case — so that if the owner permits disabled self-closure it can be built without redesign, and so that its limits are reviewable now rather than invented at implementation time.
3. **Registering the product choice as `OWNER_DECISION_D6` (§26.6)** rather than answering it. Whether a `DISABLED` account may self-close is a product and security policy question this repository contains no evidence to settle, and the previous revisions' habit of promising the transition while defining no authority for it is precisely the failure mode the register exists to prevent.

The invariant the three repairs share, stated once: **no transition out of a state may require authority that entering the state destroyed, and no transition may be promised in the state machine unless its entry authority is named somewhere in this document.**

**States.** Three account states exist under Gate 0B, plus up to two transient ceremonies that are not account states.

| State | Authentication | Ordinary protected private-data access | Sessions |
|---|---|---|---|
| `ACTIVE` | ordinary authentication permitted | permitted, subject to §7 | ordinary sessions may exist |
| `DISABLED` | ordinary authentication **denied** | **denied**, unconditionally | none; all revoked at transition, and never restored |
| `CLOSED` | permanently denied | permanently denied | none; all revoked permanently |

`REACTIVATION_CEREMONY` is a **transient ceremony state**, not a fourth account state. It exists only if `OWNER_DECISION_D5` (§26.5) permits self-reactivation, it holds only ceremony authority, it never holds session authority, and it terminates in exactly one outcome per attempt.

`ACCOUNT_CLOSURE_CEREMONY` is likewise a **transient ceremony state**, not an account state. It exists only if `OWNER_DECISION_D6` (§26.6) permits a `DISABLED` account to close itself, it holds only ceremony authority, it never holds session authority, it never holds private-data authority, and it terminates in exactly one outcome per attempt. It is a **distinct** ceremony from `REACTIVATION_CEREMONY`: the two are never the same code path, never the same authority, never entered by one another, and never convertible into one another. D5 and D6 are answered independently, and either ceremony may exist without the other.

**Invariants that hold regardless of any product choice below.**

- `ACTIVE`: ordinary authentication is allowed, and ordinary protected authorization may proceed if every normal check in §7 passes. Being `ACTIVE` is a precondition of protected access, never by itself a grant of it.
- `DISABLED`: ordinary protected access is denied; **all** ordinary active sessions are revoked at the moment of transition (epoch increment, §12.2) and are non-authoritative from that instant; a session that predates the transition is denied on its next protected request; and ordinary authentication is denied, so no new one can be obtained.
- `DISABLED`, stated as a rule rather than as an observation: **ordinary authenticated-session authority cannot be required as the prerequisite for entering *any* ceremony that leaves `DISABLED` — reactivation or closure — because that authority is precisely what `DISABLED` removes.** `DISABLED_ORDINARY_SESSION_AUTHORITY=invalid`; `REACTIVATION_ENTRY_USES_ORDINARY_SESSION=no`; `DISABLED_CLOSURE_USES_ORDINARY_SESSION=no`. A design that demands an ordinary session or §4.6 session-bound re-authentication to reach either ceremony has defined an unreachable transition, which is the defect revisions 1 and 2 carried for reactivation and revision 3 carried for closure.
- `DISABLED`, and stated because a reader will ask: a `DISABLED` account is **not** stranded by accident. Whether it has a way out at all is exactly what `OWNER_DECISION_D5` (reactivation) and `OWNER_DECISION_D6` (closure) decide, independently of each other. If both are answered (a), `DISABLED` has **no** outgoing transition under Gate 0B and is terminal in practice, and that is a consequence the owner must accept knowingly rather than discover — which is why it is registered twice rather than assumed once (§26.5, §26.6).
- `CLOSED` is **not** equivalent to `DISABLED`, and must never be described as merely another disabled state. It is **terminal** under Gate 0B: `CLOSED_STATE_TERMINAL_FOR_GATE_0B=yes`. `CLOSED_REACTIVATION_ALLOWED=no`: the reactivation ceremony **must not** convert a `CLOSED` account to `ACTIVE`, and presenting a `CLOSED` account to it is a denial, not a success. `CLOSED` is equally terminal for the closure ceremony: presenting an already-`CLOSED` account to `ACCOUNT_CLOSURE_CEREMONY` is a denial and produces no state change, and closure may **never** be used as a second-chance route back into any ceremony, any credential reset, or any access path. Any future resurrection of a `CLOSED` account would require a separate owner and design decision, is **not** authorized here, and is not implied by anything in this section — a closure that could be undone by the reactivation path would mean closure never actually ended access.
- `CLOSED` is terminal for **authorization**, which is a narrower claim than it may read as. It says access ends; it says nothing about what happens to stored private content. See "Account closure is not private-data deletion" below — `ACCOUNT_CLOSURE_IMPLIES_PRIVATE_DATA_DELETION=no`.
- No transition into or out of any state is available to an operator, a support function, or an application admin principal — **including closure**: `OPERATOR_REACTIVATION_POWER=none`, `OPERATOR_ACCOUNT_CLOSURE_POWER=none`, `APPLICATION_ADMIN_CLOSURE_POWER=none`, `APPLICATION_ADMIN_PRINCIPAL_PRESENT=no` (§9.4). No operator may close an account on the user's behalf under any D6 outcome.
- No state transition, in either direction, is itself a grant of private-data authority. Reaching `ACTIVE` is a precondition of protected access, never a grant of it; reaching `CLOSED` ends authorization but authorizes no read, write, export or deletion of private content; and neither ceremony holds private-data authority at any point.

**Transitions.**

| From → To | Performed by | Authority required |
|---|---|---|
| (none) → `ACTIVE` | owner | explicit local bootstrap (§4.1) |
| `ACTIVE` → `DISABLED` | owner | re-authentication (§4.6) from an ordinary session |
| `ACTIVE` → `CLOSED` | owner | ordinary session plus re-authentication (§4.6); `ACTIVE_ACCOUNT_CLOSURE_AUTHORITY` |
| `DISABLED` → `REACTIVATION_CEREMONY` | owner, **only if `OWNER_DECISION_D5` (§26.5) permits a ceremony at all** | the accepted recovery authority defined in §11, credential per `OWNER_DECISION_D4`; **never** an ordinary session, **never** §4.6 re-authentication, **never** an operator |
| `REACTIVATION_CEREMONY` → `ACTIVE` | owner | ceremony authority; **the only success outcome of the ceremony** |
| `REACTIVATION_CEREMONY` → `DISABLED` | — | failure, abandonment or expiry; the account is left exactly as it was |
| `DISABLED` → `ACCOUNT_CLOSURE_CEREMONY` | owner, **only if `OWNER_DECISION_D6` (§26.6) permits disabled self-closure at all** | the accepted recovery authority defined in §11, credential per `OWNER_DECISION_D4`; **never** an ordinary session, **never** §4.6 re-authentication, **never** an operator, **never** break-glass or key authority |
| `ACCOUNT_CLOSURE_CEREMONY` → `CLOSED` | owner | ceremony authority; **the only success outcome of that ceremony**; a **separate** election, never a reactivation success |
| `ACCOUNT_CLOSURE_CEREMONY` → `DISABLED` | — | failure, abandonment or expiry; the account is left exactly as it was |
| `DISABLED` → `CLOSED` **directly** | — | **not available.** If D6 permits disabled self-closure it runs through the ceremony above; if D6 does not, the transition does not exist |
| `CLOSED` → anything | **not designed, not authorized** | — |

**The reactivation ceremony (`REACTIVATION_CEREMONY`), if §26.5 / D5 permits one.** A dedicated, limited path — not an ordinary login, not a private-data session, and not an admin route:

- **Entry.** Entry is authorized **only** by the separately defined accepted recovery authority and its ceremony (§11), with the demanded credential following `OWNER_DECISION_D4` (§26.4) and the separation-of-ceremonies principle in §4.8 applying to it. Entry may **not** require, accept, or be satisfied by an existing ordinary authenticated session or by §4.6 session-bound re-authentication. The document says nowhere, in any wording, that a disabled owner should "re-authenticate using your existing ordinary session" or any equivalent.
- **Authority while in the ceremony.** Ceremony authority permits **only** the minimal identity and account-state restoration actions: proving the credential the ceremony demands, and effecting the `DISABLED` → `ACTIVE` transition. It **must not** permit private-data reads; private-data writes; exports; search; workspace access; key or data recovery; changes of ownership; or operator/admin access. `REACTIVATION_CEREMONY_PRIVATE_DATA_ACCESS=deny`. It does not open an ordinary session, does not read, list, search, export or delete any private record, and discloses no private content or safe-label metadata beyond the account status it is transitioning.
- **Success outcome — exactly one.** `REACTIVATION_SUCCESS_TRANSITION=DISABLED_TO_ACTIVE_ONLY`. The ceremony's only success is `DISABLED` → `ACTIVE`. Closure is **not** a success outcome of this ceremony, and `CLOSED` is never reachable through it. Revision 2's wording allowed the same ceremony to close an account and then described success as returning the account to `ACTIVE`; those are two different outcomes and are now stated separately.
- **After success.** Ceremony authority **ends** at the transition — it is not carried forward, extended, or converted into a session. No prior session is restored; sessions revoked at disable stay revoked, permanently. Any recovery or ceremony material consumed follows the §11.2 lifecycle rules in full, including single-use consumption and invalidation. `FRESH_NORMAL_AUTH_REQUIRED_AFTER_REACTIVATION=yes`: a **fresh ordinary authentication ceremony** (§4.3, §4.4, new bearer credential) is required afterwards, and **only** the ordinary session resulting from it may later attempt a protected private-data request, subject to every normal §7 check. Returning to `ACTIVE` is therefore a precondition for protected access and never itself an access grant.
- **Failure.** Failure, abandonment, expiry or a `CLOSED` account leaves the account in the state it was already in. There is no partial success and no fallback path.
- It is rate-limited at least as strictly as login and recovery (§15), audited content-free (§16), and surfaced to the owner.
- It creates **no operator backdoor**. No operator, support function, or application admin principal can initiate, approve, or complete it (§9.4). If the ceremony cannot be completed by the user, the outcome is the recovery-loss posture (§26.3) — never an operator bypass.

**Account closure, stated as two separate authorities.** This is the revision-4 repair, and it replaces a paragraph that promised a `DISABLED` → `CLOSED` election while naming no authority able to reach it.

- **`ACTIVE_ACCOUNT_CLOSURE_AUTHORITY=ORDINARY_SESSION_PLUS_SECTION_4_6_REAUTHENTICATION`.** An `ACTIVE` owner closes the account from an ordinary authenticated session, with §4.6 re-authentication — a **fresh, recent** proof of the credential `OWNER_DECISION_D4` selects, not merely proof of a session, because a stolen session must not be able to destroy the account. This path needs no ceremony, is available under every D5 and D6 outcome, and is unchanged from revision 3 apart from being named explicitly rather than stated flatly as "account closure".
- **`DISABLED_ACCOUNT_CLOSURE_AUTHORITY=UNDECIDED_OWNER_DECISION_D6`.** A `DISABLED` owner has, by construction, neither an ordinary session nor any way to obtain one, so the `ACTIVE` path above is unreachable from `DISABLED` and **may not be cited as the authority for it**. Whether such an owner may close the account at all is `OWNER_DECISION_D6` (§26.6) and is **not decided here**. Gate 0B does not assume the answer in either direction, and no implementation default selects one (§23).

**The account-closure ceremony (`ACCOUNT_CLOSURE_CEREMONY`), if §26.6 / D6 permits one.** Specified so that D6 can be decided against something concrete, and so that if it is answered (b) the path is already bounded rather than designed at implementation time. Its existence is conditional; its limits are not.

- **Entry.** Entry is authorized **only** by the separately defined accepted recovery authority and its ceremony (§11), with the demanded credential following `OWNER_DECISION_D4` (§26.4) and the separation-of-ceremonies principle in §4.8 applying to it. Entry may **not** require, accept, or be satisfied by: an existing or pre-disable ordinary authenticated session; §4.6 session-bound re-authentication; operator, support or application-admin authority (§9.4); a break-glass content path (§9.5, D2); or any Gate 0C key authority (§20). An attempt presenting a pre-disable session is **denied**, not treated as proof.
- **Authority while in the ceremony.** `ACCOUNT_CLOSURE_CEREMONY_PRIVATE_DATA_ACCESS=deny`. Ceremony authority permits **only**: proving the identity/account-control condition the accepted policy demands; confirming the irreversible account-status transition to the owner; effecting that account-lifecycle transition; and revoking session and account authorization state as the transition requires. It **must not** permit private-data reads; private-data writes; workspace browsing; search; export; document access; ownership transfer; key unwrap; key destruction; encrypted-data recovery; or any claim that private data has been deleted. It does not open an ordinary session, and it discloses no private content and no safe-label metadata beyond the account status it is transitioning.
- **Confirmation.** Because the outcome is irreversible under Gate 0B, the ceremony requires an explicit, unambiguous owner confirmation of that irreversibility before the transition, and it states plainly what closure does and does not do — in particular that it ends access and does **not**, by itself, delete private content (below).
- **Success outcome — exactly one.** The ceremony's only success is `DISABLED` → `CLOSED`. It is **not** an outcome of the reactivation ceremony, is **never** reported or recorded as a reactivation success, never produces `ACTIVE`, and is never a path by which a `CLOSED` account could later be made `ACTIVE`.
- **After success.** Ceremony authority **ends** at the transition; it is not carried forward, extended, or converted into a session. The account epoch is incremented, all sessions are revoked permanently, authentication is permanently denied, and `ACCOUNT_CLOSED` is recorded (§12.2, §16.2, §17.4). Any recovery or ceremony material consumed follows the §11.2 lifecycle rules in full, including single-use consumption and invalidation.
- **Failure.** Failure, abandonment, expiry, or an already-`CLOSED` account leaves the account in the state it was already in. There is no partial success, no fallback path, and no partially-closed state.
- It is rate-limited at least as strictly as login and recovery (§15), audited content-free (§16), and surfaced to the owner.
- It creates **no operator backdoor**. No operator, support function, or application admin principal can initiate, approve, or complete it (§9.4): `OPERATOR_ACCOUNT_CLOSURE_POWER=none`, `APPLICATION_ADMIN_CLOSURE_POWER=none`. If the owner cannot complete it, the outcome is the recovery-loss posture (§26.3) — never an operator bypass.

**Account closure is not private-data deletion.** Stated explicitly because the distinction is load-bearing and because promising deletion the design cannot prove would be worse than promising nothing.

`ACCOUNT_CLOSURE_IMPLIES_PRIVATE_DATA_DELETION=no`

`ACCOUNT_CLOSURE_IMPLIES_KEY_DESTRUCTION=no`

`PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES`

Account closure is an **authentication and account-lifecycle** operation. What Gate 0B asserts about it is exactly one thing: **it ends authorization, immediately and unconditionally.** It is **not** automatically, and must not be described or implemented as though it were: private-data deletion; key destruction; cryptographic erasure; backup eradication; or workspace data destruction. Gate 0B decides none of those and is not competent to — key handling is Gate 0C (§20, D3), and retention, deletion and backup eradication belong to the retention/deletion gate (Gate 0A §14, §17; governing plan §17, §18, §20, §21). Any effect of closure on encrypted data, keys, backups, retained private records, or workspace destruction remains **subject to those later gates and unresolved until they are separately accepted**. Neither ceremony, and no closure path, may claim otherwise to the user or in any audit event, and no later document may cite this section as evidence that a closed account's data has been deleted. Conversely, and equally binding: deletion progress is never a reason to keep authorization alive, and closure never waits on a deletion pipeline.

### 17.2 Whether disabled accounts are self-reactivatable — `OWNER_DECISION_D5`

`DISABLED_SELF_REACTIVATION_POLICY=UNDECIDED_OWNER_DECISION_D5`

**Scope of this subsection.** It governs **reactivation only** — the `DISABLED` → `ACTIVE` direction. The other outgoing transition, `DISABLED` → `CLOSED`, is `OWNER_DECISION_D6` (§26.6) and is governed by §17.3. Revision 3 addressed only the first and left the second unowned; that is the defect this revision repairs, and the two questions are answered independently.

**Registered rather than carried as a loose product question.** Whether a `DISABLED` account may be reactivated by its own owner at all is a **product decision, not an engineering invariant**. Both are coherent: terminal disable is simpler and strictly smaller in attack surface, while self-reactivation preserves a "pause my account" capability with a real user benefit. Revision 1 assumed self-reactivation without designing a path to it, which is how the unreachable transition arose.

**This subsection is a repair.** Revision 2 surfaced the question here but kept it outside the §26 register, treated it as a dependency of `OWNER_DECISION_D4`, and named **terminal disable** as the safe implementation default if the owner never answered. Independent re-QA established that this was a distinct fifth owner decision, not a D4 subquestion: holding every D4 credential choice fixed, the owner can still independently choose terminal disable or pause-and-reactivate, and that choice changes availability, account semantics and attack surface. It also established that an implementation default would settle a policy the owner never accepted, contradicting the register's completeness claim. Both are corrected. The question is now `OWNER_DECISION_D5` (§26.5), it carries the full register format, it is an implementation blocker in its own right (§23), and **there is no implementation default**: if D5 is unanswered, implementation does not begin. D5 and D4 are related — D4 fixes which credential any permitted ceremony demands — but neither determines the other.

Gate 0B does not choose D5. It fixes the invariants that hold under **either** outcome, and §17.1 states them: disable denies ordinary protected access and revokes all sessions non-authoritatively; ordinary session authority is invalid in `DISABLED` and can never be the ceremony's entry condition; no operator may reactivate; any permitted reactivation runs through §17.1's limited ceremony, is entered only through the accepted recovery authority, grants no private-data access, and succeeds only as `DISABLED` → `ACTIVE`; `CLOSED` can never be reactivated; and a fresh ordinary authentication is required before any protected access afterwards.

**D5 does not decide D6, in either direction.** Under D5(a) the account has no reactivation path, and whether it may nonetheless close itself is still open. Under D5(b) the account has a reactivation path, and the owner may still legitimately require that a disabled owner reactivate first and close from `ACTIVE` — which is coherent, is strictly smaller in surface, and is not implied by choosing (b). Revision 3's §26.5 option (a) asserted that "a disabled owner's only remaining election is explicit closure", which both assumed D6(b) without registering it and contradicted the fact that no authority for that election existed; that assertion is withdrawn (§26.5).

### 17.3 Whether disabled accounts may close themselves — `OWNER_DECISION_D6`

`DISABLED_SELF_CLOSURE_POLICY=UNDECIDED_OWNER_DECISION_D6`

`DISABLED_ACCOUNT_CLOSURE_AUTHORITY=UNDECIDED_OWNER_DECISION_D6`

**Why this is a sixth decision and not a subdecision of D5.** The re-QA of revision 3 isolated the ambiguity but deliberately made no product choice, leaving open whether the answer belonged inside D5 or was its own decision. It is its own decision, and the test is the same independence test that separated D5 from D4: hold the other decision fixed at **each** of its outcomes and ask whether the owner still has a real choice.

- Hold **D5 = (a) terminal disable**. No reactivation ceremony exists. The owner can still independently choose whether a disabled account may close itself through a dedicated closure ceremony, or whether `DISABLED` simply has no outgoing transition under Gate 0B at all. Revision 3 assumed the former ("closure is the only election available to it") without designing an authority for it, which is exactly how the unreachable transition arose a third time.
- Hold **D5 = (b) limited self-reactivation**. A reactivation ceremony exists. The owner can still independently choose to require that a disabled owner reactivate to `ACTIVE` and close from there under `ACTIVE_ACCOUNT_CLOSURE_AUTHORITY` — one ceremony instead of two, strictly less surface — or to offer a direct closure ceremony from `DISABLED`.

Neither outcome of D5 determines D6, and neither outcome of D6 determines D5; all four combinations are coherent and defensible. The security profiles also differ in kind rather than in degree, which is the stronger reason: **reactivation is restorative and closure is destructive and irreversible.** Permitting disabled self-closure makes the accepted recovery authority sufficient to **permanently end** account access, so an attacker who obtains recovery material gains a terminal denial-of-access capability that D5(b) does not give them — under D5(b) the worst case is an unwanted reactivation, which the true owner can observe, audit and disable again. That is a different threat with a different tradeoff and a different acceptable answer, and folding it into D5 would hide it behind a decision the owner might answer for entirely unrelated availability reasons.

`HIDDEN_OWNER_DECISIONS_FOUND=none_after_revision`. Registering this as D6 raises the owner-decision count from five to six. That count is a consequence of the design, not a target: the previous count was not preserved, and a sixth decision was surfaced rather than absorbed.

Gate 0B does not choose D6. It fixes the invariants that hold under **either** outcome, and §17.1 states them: `DISABLED_ORDINARY_SESSION_AUTHORITY=invalid` and `DISABLED_CLOSURE_USES_ORDINARY_SESSION=no`, so no closure path may be conditioned on an ordinary session or §4.6 re-authentication; no operator, support function or admin principal may close an account (`OPERATOR_ACCOUNT_CLOSURE_POWER=none`, `APPLICATION_ADMIN_CLOSURE_POWER=none`); any permitted disabled closure runs through §17.1's limited `ACCOUNT_CLOSURE_CEREMONY`, entered **only** through the accepted recovery authority, granting **no** private-data access (`ACCOUNT_CLOSURE_CEREMONY_PRIVATE_DATA_ACCESS=deny`) and succeeding **only** as `DISABLED` → `CLOSED`; `CLOSED` is terminal under Gate 0B and is never re-enterable, never reactivatable, and never usable as an access-recovery route; and under **every** outcome closure ends authorization without implying private-data deletion or key destruction.

### 17.4 Stage-by-stage authorization consequences

| Stage | Authorization consequence |
|---|---|
| Account creation | Creates exactly one workspace atomically (§4.1). No authenticated-but-workspace-less state, because that is an unknown-owner state and §1.3 requires DENY |
| Workspace creation | Only as part of account creation in the first architecture (§3.3) |
| Account disable | Epoch incremented; all sessions revoked and non-authoritative; **every subsequent protected request denied**; subsequent ordinary authentication denied; no ordinary session authority remains or can be obtained. Reversible **only** through the §17.1 reactivation ceremony and **only** if `OWNER_DECISION_D5` (§26.5) is decided to permit it; the ceremony is entered only through the accepted recovery authority, never an ordinary session; reactivation never restores old sessions, never grants private-data access by itself, and requires a fresh ordinary authentication before any protected access. Whether the account may instead be **closed** from `DISABLED` is the separate `OWNER_DECISION_D6` (§26.6, §17.3); if D5 and D6 are both answered (a), `DISABLED` has no outgoing transition under Gate 0B |
| Account closure (from `ACTIVE`) | Elected from an ordinary session with §4.6 re-authentication (`ACTIVE_ACCOUNT_CLOSURE_AUTHORITY`). Epoch incremented; all sessions revoked permanently; authentication permanently denied; `ACCOUNT_CLOSED` recorded. Authorization ends at closure regardless of what the deletion pipeline has or has not finished |
| Account closure (from `DISABLED`) | Available **only** if `OWNER_DECISION_D6` (§26.6) permits it, and then **only** through the §17.1 `ACCOUNT_CLOSURE_CEREMONY` entered with the accepted recovery authority — never an ordinary session, never §4.6 re-authentication, never an operator or admin principal (`DISABLED_CLOSURE_USES_ORDINARY_SESSION=no`; `OPERATOR_ACCOUNT_CLOSURE_POWER=none`). The ceremony grants no private-data access (`ACCOUNT_CLOSURE_CEREMONY_PRIVATE_DATA_ACCESS=deny`), succeeds only as `DISABLED` → `CLOSED`, and its authority ends at the transition. Same authorization consequences as the `ACTIVE` path once the transition occurs |
| Account closure — what it does **not** do | Closure is an account-lifecycle operation, not a data operation. `ACCOUNT_CLOSURE_IMPLIES_PRIVATE_DATA_DELETION=no`; `ACCOUNT_CLOSURE_IMPLIES_KEY_DESTRUCTION=no`; `PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES`. No closure path may claim, to the user or in any audit event, that private data has been deleted, that keys have been destroyed, or that cryptographic erasure or backup eradication has occurred (§17.1, §20) |
| Workspace no longer authorized | Next protected request denied (§12.3). No grace period, no in-flight exception |
| Reactivation | **Not available to a closed account at all**: `CLOSED` is terminal, `CLOSED_REACTIVATION_ALLOWED=no`, the §17.1 ceremony denies a `CLOSED` account rather than succeeding, and any reactivation-after-closure capability is a separate owner and design decision not authorized here, because it would mean closure did not actually end access. For a **disabled** account, reactivation is governed entirely by §17.1 and `OWNER_DECISION_D5` — a dedicated limited ceremony entered only through the accepted recovery authority and never an ordinary session, with no operator authority, no private-data access, no restored sessions, a single success transition `DISABLED` → `ACTIVE`, ceremony authority ending at that transition, and a fresh ordinary authentication required before protected access resumes. Closure is equally terminal: a `CLOSED` account cannot be presented to the closure ceremony either, and closure may never be used as an access-recovery mechanism (`CLOSED_STATE_TERMINAL_FOR_GATE_0B=yes`) |

**Data-deletion dependency, stated separately and not solved here:** what happens to the private *content* of a closed account — across primary, derived, cache, index, export, and backup stores — is the retention/deletion gate's problem (Gate 0A §14, §17; governing plan §17, §18, §20, §21), and what happens to any keys protecting it is Gate 0C's (§20, D3). Gate 0B asserts only the access consequence: **closure ends authorization immediately and unconditionally, and does not wait on deletion to complete.** The converse is also asserted: deletion progress is never a reason to keep authorization alive. Nothing beyond that is asserted, and in particular `PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES` — this document does not say a closed account's data is deleted, because no accepted design proves it, and a later document may not read this section as though it had.

---

## 18. Security event and incident-response handoff

Expected auth-side reactions. No monitoring infrastructure is designed, built, or authorized; this is the handoff to the incident-response gate the governing plan §27 already requires.

| Event | Auth-side reaction |
|---|---|
| Suspected account compromise | Revoke all sessions (epoch increment); require re-authentication; require credential change; audit; notify the owner |
| Stolen session | Revoke that session individually, or all if uncertain; audit; the next protected request is denied (§12.3) |
| Credential leak | Force credential change; revoke all sessions (including the initiating one, §4.8); regenerate the recovery credential under re-authentication, retiring the previous one on confirmed issuance (§11.2); audit |
| Operator misuse — application level | No application principal exists to misuse: no admin role, route, or session, and no operator account-recovery, credential-reset, or reactivation power (§9.3, §9.4). If D2 ever authorizes break-glass: immediate revocation of the break-glass session, audit, owner notification, and a review that the path itself survives |
| Operator misuse — OS / filesystem level | **Reachable, and retained in full.** Revision 1 called operator misuse unreachable; that was wrong, and independent QA was right to reject it. Gate 0A THREAT-022 explicitly includes direct filesystem and database access, and §9.1 acknowledges the operator holds the host. No application-level control mitigates it, and no no-admin-route test can cover it. Auth-side reaction is limited to what auth can actually do — audit what the application observes, revoke sessions, require credential change — and the substantive answer is Gate 0C at-rest key design (§20) plus device/OS controls (§13.2), not this section |
| Repeated `ACCESS_DENIED` anomalies | Rate-limit (§15); record counts and coded reasons; treat sustained cross-workspace denial patterns as a THREAT-001/THREAT-004 signal warranting investigation |
| Recovery abuse | Rate-limit and progressively delay (§11.1, §15); audit `RECOVERY_STARTED` without completion; notify the owner |
| Lost device — authority still reachable (CASE A, §13.2) | Revoke that device's sessions individually (§13.1) — no credential recovery required; offer revoke-all; audit; the next protected request from that device is denied (§12.3) |
| Lost device — the lost device holds the sole authority (CASE B, §13.2) | **Application-level remote revocation is unavailable**, and this row does not pretend otherwise. Containment falls to device/OS protection and, for content confidentiality, to Gate 0C at-rest design. Treat the device and any session live on it as potentially compromised; any later migration to a new authority must not resurrect sessions |

Every reaction above is expressible with the controls this document already defines — revoke, deny, audit, notify, require re-authentication — which is the point: incident response should not require capabilities the architecture lacks. All notifications are in-application in the local-first deployment; no out-of-band channel is introduced (§19).

---

## 19. External identity and network dependency

`EXTERNAL_IDENTITY_DEPENDENCY=none`

**DESIGN CHOICE, stated as an invariant of the preferred model.** The preferred identity design (§2.3) depends on **no** external identity provider, **no** email provider, **no** SMS provider, **no** push provider, and **no** remote identity, verification, or notification service.

Consequently:

- **No metadata leaves KIA Stick** for authentication purposes. No account identifier, login timestamp, device descriptor, or IP address is transmitted to any third party.
- **No trust is delegated.** KIA Stick is the sole authority for its own accounts, sessions, and authorization decisions.
- **No availability dependency.** Authentication works with no network connectivity — which matters for a laptop-only tool used in workplaces.
- **Privacy:** this is a deliberate product decision, not an oversight. KIA Stick's users are union members, and the mere fact that a particular person authenticates to a grievance tool is sensitive association metadata. Handing that to an IdP, an email provider, or an SMS carrier would create a disclosure channel outside the confidentiality boundary the rest of this design maintains.
- **Recovery implications:** the whole reason §11 uses a user-held offline secret rather than an email or SMS reset. It is also why recovery failure is genuinely terminal — the tradeoff is explicit and is disclosed to the user up front.
- **Security implications:** removes an entire class of threats (IdP compromise, account-recovery hijack via a mail provider, SIM swap) at the cost of the operational convenience those services provide.

This invariant binds later gates too: an MFA factor (§10) or a notification channel (§18) that introduces an external dependency contradicts this section and requires a separate owner decision, not an implementation-time judgment call.

No vendor integration is authorized, and no vendor is named or selected anywhere in this document.

---

## 20. Encryption-gate handoff

`ENCRYPTION_DESIGN_STATUS=REQUIRES_SEPARATE_GATE`

Gate 0B identifies where auth decisions constrain Gate 0C. It does **not** design encryption, and it deliberately does **not** select KEK/DEK structure, KMS, per-user keys, or service master keys — none of those is an auth invariant established by accepted evidence, and choosing one here would be authoring the encryption design under another name.

| Auth decision (this document) | Constraint it places on Gate 0C | Still unresolved |
|---|---|---|
| Account identity is first-party and local (§2.3) | No external key custodian follows from identity; key custody is Gate 0C's to decide within governing plan §5 | Where key material lives and what protects that store |
| Workspace is the isolation unit, 1:1 with account (§3.3) | Key scoping must be at least workspace-granular to avoid reintroducing cross-workspace reach the authorization layer forbids | Whether per-workspace keys are used, and their structure |
| No admin principal; operator content access disfavoured (§9) | Gate 0C must not create an operator-usable decryption capability that §9 forbids at the auth layer | Whether the operator can technically decrypt (Model A) — the decisive question |
| Recovery is a user-held offline credential, no operator path (§11) | Any key-recovery path must be drivable by the user alone, and must not become the master key governing plan §5 forbids. Account recovery does **not** imply key/data recovery (§11.4) | Whether the recovery credential participates in key unwrap at all; what happens to content when account access is unrecoverable (D3, §26.3) |
| Credential reset revokes all sessions (§12) | Session revocation must not silently orphan content; the relationship between credential change and key material needs an answer | Whether credential change implies key re-wrap |
| Account closure ends authorization immediately (§17) | Closure must not depend on key destruction, and key destruction must not be assumed to substitute for authorization. Equally, closure must not be **reported** as key destruction or data deletion: `ACCOUNT_CLOSURE_IMPLIES_KEY_DESTRUCTION=no`, `ACCOUNT_CLOSURE_IMPLIES_PRIVATE_DATA_DELETION=no`, and the closure ceremony of §17.1 holds no key authority and performs no key operation | Whether cryptographic erasure is used for deletion (Gate 0A §14); what disposition, if any, closure implies for keys and stored content — `PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES` |
| Multiple concurrent sessions per account (§13.1) | Key availability cannot be bound to a single session or device instance | How key material is made available across concurrent sessions |
| No external dependency (§19) | Key custody cannot depend on a remote KMS without contradicting this invariant | Whether local key custody is sufficient, and what protects it |

`DEPENDENCY_ON_ENCRYPTION_GATE=yes`. The right-hand column is the complete set of what Gate 0B leaves open for Gate 0C. None of it is answered here.

---

## 21. Threat traceability

Auth design mapped to Gate 0A threats. **No threat is declared solved** — a design is not a control until it is implemented, tested, and accepted, and nothing here is implemented.

**THREAT-001 — cross-user data exposure**
- AUTH_CONTROL: mandatory `userWorkspaceId` on every private record; workspace-scoped queries at the query rather than by post-filtering; single access layer making scoping structural.
- DESIGN_SECTION: §3.3, §7.1, §7.2, §7.3.
- UNRESOLVED_DEPENDENCY: storage design (not yet gated); whether the first deployment ever has a second workspace to exercise isolation against (D1).
- FUTURE_TEST: workspace B cannot read, list, search, export, or delete workspace A's record, against synthetic fixtures (§22).

**THREAT-002 — broken authorization / missing server-side check**
- AUTH_CONTROL: deny-by-default; server-authoritative decisions; two-level enforcement at a single access layer so a new route is unreachable rather than unprotected; the §7.2 bypass invariant binding routes, ID-addressed reads, list/search, export, delete, derived artifacts, background jobs and service identities alike; service principals carrying explicit workspace-bound, revocable, expiring grants (§3.2) rather than being exempt for lacking a session; authority-metadata reads distinguished from protected-payload access.
- DESIGN_SECTION: §1.3, §3.2, §7.1, §7.2, §7.4, §8.3.
- UNRESOLVED_DEPENDENCY: the actual route surface does not exist yet, so the route audit is future work; storage design is a later gate.
- FUTURE_TEST: unauthenticated access denial on every private route; client-only bypass test; route inventory asserting no private route bypasses the access layer; background-job authorization test asserting a job with no valid workspace-bound grant is denied and cannot cross workspace scope (§22 tests 24, 25).

**THREAT-003 — session theft / fixation**
- AUTH_CONTROL: opaque high-entropy bearer credentials that are never logged (§16.1) and are distinct from the non-authenticating `SESSION_AUDIT_ID`; mandatory regeneration on authentication and privilege elevation; `HttpOnly`/`Secure`/restrictive `SameSite`; TLS with refusal to serve the private surface if transport security is unmet; idle and absolute lifetimes; individually revocable sessions.
- DESIGN_SECTION: §4.4, §5.4, §5.5, §6.1, §6.2, §6.3, §13.1, §16.1.
- UNRESOLVED_DEPENDENCY: the local-origin TLS trust arrangement and whether it yields `Secure`-cookie-eligible behaviour in the owner's browsers is an unvalidated compatibility question (§6.1, D1); device-level compromise is partly outside application control; `HttpOnly` does not stop XSS using the authenticated browser to exfiltrate content through authorized requests; the credential/factor policy itself is undecided (D4).
- FUTURE_TEST: session-fixation test (pre-auth identifier is not valid post-auth, including after privilege elevation); logout invalidation; stolen-session revocation; audit-identifier non-authentication and non-replay (§22 test 28); local-origin TLS/`Secure`-cookie qualification (§22 test 30).

**THREAT-004 — IDOR**
- AUTH_CONTROL: object-level ownership check on every ID-addressed private resource, independent of the route-level check; identifiers never treated as capabilities.
- DESIGN_SECTION: §7.1, §7.2.
- UNRESOLVED_DEPENDENCY: identifier shape and storage design are future gates.
- FUTURE_TEST: IDOR sweep across the private record ID space using a second synthetic workspace's identifiers.

**THREAT-007 — secrets**
- AUTH_CONTROL: no secret in Git, proof, logs, telemetry, diagnostics, or notifications; `AUTH_SESSION_CREDENTIAL_LOGGING_ALLOWED=no` as an absolute rule (§16.1) with the audit schema referencing only the non-authenticating `SESSION_AUDIT_ID` (§5.4, §16.3); credential verifiers only, never recoverable credentials; recovery material never persisted or logged in plaintext (§11.2); forbidden-field list covering bearer, refresh and recovery material whole, hashed, truncated or encoded (§16.4); no signing key introduced, because the opaque-session choice avoids needing one.
- DESIGN_SECTION: §1.3, §4.8, §5.3, §5.4, §11.2, §16.1, §16.3, §16.4.
- UNRESOLVED_DEPENDENCY: secret storage for any future service credential is Gate 0C / storage-gate territory; `scripts/privacy-scan.mjs` has not been validated against future secret shapes and is not claimed sufficient for them (Gate 0A THREAT-007 `CURRENT_STATE`).
- FUTURE_TEST: secret-scanning extended to auth secret shapes; audit-log leakage test under normal, error and crash conditions; assertion that no credential material appears in any error path; assertion that `SESSION_AUDIT_ID` cannot authenticate or be converted to the bearer credential (§22 test 28).

**THREAT-020 — stale authorization**
- AUTH_CONTROL: authoritative server-side session state plus account authorization epoch; immediate invalidation; TTL-only models explicitly rejected; no cached ALLOW is authoritative; one governing credential-change revocation rule covering the initiating session (§4.8, F7); in `DISABLED`, every ordinary session is revoked and non-authoritative and `DISABLED_ORDINARY_SESSION_AUTHORITY=invalid`, so no stale session and no ceremony authority can stand in for a live authorization — reactivation ends its own authority at the `DISABLED` → `ACTIVE` transition and a fresh ordinary authentication is required before any protected request (§17.1). The same holds for closure, which revision 3 left unstated: a pre-disable session is **denied** as entry proof to the `ACCOUNT_CLOSURE_CEREMONY` rather than accepted (`DISABLED_CLOSURE_USES_ORDINARY_SESSION=no`), closure-ceremony authority ends at the `DISABLED` → `CLOSED` transition and is never converted into a session, and closure itself increments the epoch so every remaining session is denied on its next protected request (§12.2, §17.1, §17.4).
- DESIGN_SECTION: §5.2, §5.3, §12, §13.2, §17.1, §17.4.
- UNRESOLVED_DEPENDENCY: the invariant binds from the moment the authority **accepts** a revocation; where the sole authority is unreachable (CASE B, §13.2) there is no acceptance to act on. That is an availability-of-authority limit tied to D1, not a tolerance window, and it does not weaken the requirement. Proof is otherwise implementation-time.
- FUTURE_TEST: the §12.3 invariant — after accepted revocation, the next protected request is denied — exercised for logout, revoke-one, revoke-all, credential reset (including the initiating session), recovery, disable, and closure **from both originating states**; the disabled-account tests distinguishing ordinary denial from the limited reactivation and closure ceremonies, and asserting that a successful `DISABLED` → `ACTIVE` transition still denies protected access until a fresh ordinary authentication succeeds (§22 tests 11, 35, 37); the disabled-closure entry-authority and containment tests (§22 tests 40-43); plus the CASE A/CASE B qualification tests (§22 tests 22, 23).

**THREAT-021 — privilege escalation**
- AUTH_CONTROL: single human role; no admin principal to escalate to; no operator account-recovery, credential-reset, reactivation or **closure** power (`OPERATOR_ACCOUNT_CLOSURE_POWER=none`, `APPLICATION_ADMIN_CLOSURE_POWER=none`, §9.4); fail-closed on ambiguous role or owner state; service principals narrowly scoped **and workspace-bound**, with explicit, revocable, expiring grants and no interactive authentication path (§3.2, §8.3); the §17.1 reactivation ceremony bounded to status transition only, with no private-data authority; the §17.1 `ACCOUNT_CLOSURE_CEREMONY` bounded the same way and no more permissively — `ACCOUNT_CLOSURE_CEREMONY_PRIVATE_DATA_ACCESS=deny`, no read, write, search, export, workspace access, ownership transfer, key unwrap, key destruction or data-recovery authority, and no conversion of ceremony authority into a session.
- DESIGN_SECTION: §1.3, §3.2, §8.2, §8.3, §9.4, §17.1, §17.3.
- UNRESOLVED_DEPENDENCY: if D1 or a later sharing gate introduces a second role, this analysis must be redone — a minimal role model is a control only while it stays minimal; grant issuance and invalidation mechanics are implementation-gate work; whether the §17.1 reactivation ceremony exists as an authority at all is `OWNER_DECISION_D5` (§26.5) and whether the `ACCOUNT_CLOSURE_CEREMONY` does is `OWNER_DECISION_D6` (§26.6), and for each that does, its containment becomes a control that must actually be built and tested rather than merely specified. Each additional ceremony is an additional authority surface: D6(b) adds a second one, and that cost is part of what D6 decides.
- FUTURE_TEST: role-escalation attempts; assertion that no request can acquire authority over a workspace it does not own; service-identity grant scope and invalidation tests (§22 test 25); assertion that the reactivation ceremony cannot reach private data (§22 test 33); assertion that the closure ceremony cannot reach private data, cannot unwrap or destroy keys, and cannot be converted into a session (§22 test 42).

**THREAT-022 — operator / admin overreach**
- AUTH_CONTROL: no admin principal, role, route, or session; `OPERATOR_ACCOUNT_RECOVERY_POWER=none`, `OPERATOR_CREDENTIAL_RESET_POWER=none`, `OPERATOR_REACTIVATION_POWER=none`, `OPERATOR_ACCOUNT_CLOSURE_POWER=none`, `APPLICATION_ADMIN_CLOSURE_POWER=none` (§9.4); support strictly content-free and unprivileged, and explicitly barred from closing, disabling or electing closure of an account from any originating state, with owner actions no longer misfiled as support powers; application authority explicitly separated from OS/root authority; Model A preferred; break-glass not created; any future break-glass self-audits or is a FAIL.
- DESIGN_SECTION: §9.1, §9.3, §9.4, §9.5, §16.2, §17.1, §18.
- UNRESOLVED_DEPENDENCY: **substantial, and larger than revision 1 admitted.** Whether the operator can technically decrypt is Gate 0C's (`DEPENDENCY_ON_ENCRYPTION_GATE=yes`); whether any break-glass path exists is D2; whether a reactivation ceremony exists at all is D5 and whether a closure ceremony does is D6 — and under **all** D5 and D6 outcomes `OPERATOR_REACTIVATION_POWER=none` and `OPERATOR_ACCOUNT_CLOSURE_POWER=none`, so neither decision creates, nor can be read as creating, an operator path. Closure deserves the explicit statement because an operator-closable account is a denial-of-access power, and this design grants none. OS/filesystem-level operator misuse is **reachable and unmitigated by application controls** (§18), Gate 0A THREAT-022 explicitly includes direct filesystem/database access, and no no-admin-route test covers it. On a single-user laptop the operator is the owner and holds the device (§9.1).
- FUTURE_TEST: assertion that no admin route or principal exists; assertion that no operator path can reset a credential, complete a recovery, reactivate a disabled account, or **close an account on the user's behalf** (§22 tests 32, 43); break-glass audit test if one is ever authorized; audit-completeness test that operator-adjacent actions cannot be performed without a corresponding event. Explicitly **not** claimed: any application test that bounds OS-level access.

**THREAT-023 — export cross-workspace leakage**
- AUTH_CONTROL: export paths workspace-scoped at the query; derived artifacts inherit workspace ownership; exports subject to the same object-level checks as reads.
- DESIGN_SECTION: §7.1, §7.3.
- UNRESOLVED_DEPENDENCY: the private export feature itself is not designed or authorized (governing plan §19); labelling requirements belong to that future gate.
- FUTURE_TEST: export from workspace A contains no workspace B record, against synthetic fixtures.

**THREAT-024 — device loss**
- AUTH_CONTROL: no credential in script-readable browser storage (`HttpOnly` cookie transport excepted and required, §6.2); idle and absolute session lifetimes; individually revocable sessions; revoke-all; recovery independent of the lost device **where the authority is reachable**; MFA required before any network-exposed deployment, with a testable qualification boundary (§10.2).
- DESIGN_SECTION: §5.5, §6.2, §10.2, §11.1, §13.1, §13.2.
- UNRESOLVED_DEPENDENCY: **CASE B (§13.2) is a real unmitigated gap at the application layer** — where the lost device holds the sole authority, remote revocation is unavailable, and containment depends on device/OS protection plus Gate 0C at-rest design. Which case applies is determined by D1. Whether any private content is ever cached client-side is a storage-gate decision; device-level encryption is outside application control; Gate 0A rates this residual risk Medium for exactly that reason. Separately and explicitly: losing a device, a credential or the accepted recovery authority is an **authentication-authority** event, and this row claims nothing about whether previously encrypted private content remains decryptable afterwards — `PRIVATE_DATA_RECOVERABILITY_AFTER_AUTH_RECOVERY=UNRESOLVED_PENDING_GATE_0C` (§11.4, §20, D3), and no control here mandates or assumes a key-unwrap, escrow or key-recovery path.
- FUTURE_TEST: CASE A lost-device revocation qualification; CASE B behaviour asserting the design claims no application-level remote revocation and that a later migrated authority does not resurrect sessions (§22 tests 22, 23); shared-device/browser behaviour; assertion that no credential persists in script-readable browser storage; and assertion that no auth-recovery test asserts encrypted-data recoverability or invokes a key-unwrap path (§22 tests 34, 38).

`THREAT_TRACEABILITY_COMPLETE=yes`; `THREATS_DECLARED_SOLVED_BY_DESIGN=none`. Complete in the sense that every threat traced here carries AUTH_CONTROL / DESIGN_SECTION / UNRESOLVED_DEPENDENCY / FUTURE_TEST, and that the rows affected by each revision's repairs have been updated to match the repaired design rather than the design that failed review — revision 2 updated THREAT-002, THREAT-003, THREAT-007, THREAT-020, THREAT-021, THREAT-022 and THREAT-024, revision 3 further updated THREAT-020, THREAT-021, THREAT-022 and THREAT-024 for the D5 registration, the reactivation state machine and the D3 Gate 0C boundary, and revision 4 updated THREAT-020, THREAT-021 and THREAT-022 for the disabled-account closure authority, the `ACCOUNT_CLOSURE_CEREMONY` containment bounds and the D6 registration. No other row is affected by R1-R3 or S1, and none was rewritten for tidiness — in particular THREAT-024 is untouched by revision 4, because closure authority changes nothing about device loss, and THREAT-023 and THREAT-007 are likewise unaffected. Not complete in the sense that any threat is closed: none is, no control is implemented, and THREAT-007, THREAT-022 and THREAT-024 in particular carry unresolved dependencies this document cannot discharge.

---

## 22. Future auth security validation plan

Tests a future implementation would have to pass. **None is performed now.** All use fake/synthetic identities and data only; no real users, no real member data, no real documents. This extends Gate 0A §18 on the auth axis rather than duplicating it.

1. **Unauthenticated access denial** — every private route denies with no session.
2. **Cross-user access** — synthetic workspace B cannot read, list, search, export, or delete workspace A's records (THREAT-001; governing plan §29).
3. **IDOR** — direct object addressing with another workspace's identifiers is denied on every ID-addressed private path (THREAT-004).
4. **Client-only bypass** — every UI-hidden private action is denied server-side when the UI is bypassed (§7.4).
5. **Session fixation and elevation rotation** — a pre-authentication bearer credential is invalid after authentication, **and** the bearer credential issued before a privilege elevation (§4.6) is invalid after it. Revision 1's test asserted only the pre/post-login half.
6. **Session theft assumptions** — a captured identifier stops working after revocation, idle timeout, and absolute expiry.
7. **Logout invalidation** — the next protected request after logout is denied server-side, not merely client-cleared.
8. **Next-request revocation** — the §12.3 invariant, for logout, revoke-one, revoke-all, credential reset, recovery, disable, and closure **from each originating state the decided policy permits** (THREAT-020). For credential reset the assertion explicitly includes **the session that initiated the reset** (§4.8), and that no replacement session is silently issued to it.
9. **Individual-session revoke** — revoking one session leaves others working.
10. **All-session revoke** — epoch increment denies every session on its next protected request.
11. **Disabled-account ordinary denial** — a `DISABLED` account's **ordinary** protected requests and **ordinary** authentication attempts are both denied; every ordinary session held at the moment of disable is non-authoritative and denied on its next protected request; no pre-disable session can be used to perform any account action; and `CLOSED` neither behaves as `DISABLED` nor reactivates (§17.1). This test asserts **ordinary** denial only; the limited reactivation ceremony, where D5 permits one, is a distinct path asserted by tests 33 and 35-37, and the limited closure ceremony, where D6 permits one, is a distinct path asserted by tests 40-43. Neither may be conflated with the denial asserted here. In particular, assert that a `DISABLED` account's **ordinary** attempt to elect account closure — presenting a pre-disable session, or attempting §4.6 re-authentication — is **denied** (`DISABLED_CLOSURE_USES_ORDINARY_SESSION=no`), under **both** D6 outcomes.
12. **Recovery abuse and lifecycle** — recovery is rate-limited, progressively delayed, single-use, and revokes all sessions on completion; at most one recovery credential is valid at a time; regeneration requires re-authentication and invalidates the previous credential on confirmed issuance of its replacement; a failed or unconfirmed replacement leaves a defined state rather than an ambiguous one; two concurrent consumption attempts yield exactly one success (§11.2).
13. **Credential stuffing / rate limit** — progressive delay engages; no permanent lockout; limiter-unavailable fails closed.
14. **CSRF** — every private state-changing endpoint rejects a forged cross-site request, with the check not relying solely on cookie presence.
15. **Cross-origin requests** — private APIs deny cross-origin access; no permissive reflection, no wildcard, no credentialed cross-origin.
16. **Role escalation** — no request acquires authority beyond its own workspace (THREAT-021).
17. **Admin/operator access** — assert no admin principal, role, route, or session exists (THREAT-022).
18. **Break-glass audit** — if and only if D2 ever authorizes one: it cannot be used without emitting start and end events, and the events cannot be suppressed by the principal using it.
19. **Auth audit log leakage** — no audit event contains any §16.4 forbidden field, under normal, error, and crash conditions, with no diagnostic path reintroducing it (Gate 0A §15).
20. **Secret leakage** — no credential, verifier, recovery credential, or **session bearer credential** appears in Git, proof output, logs, telemetry, diagnostics, notifications, error messages, or stack traces, whole, hashed, truncated, or encoded (THREAT-007, §16.1, §16.4). The non-authenticating `SESSION_AUDIT_ID` is permitted in audit output and is asserted separately by test 28; revision 1's wording banned "any session identifier," which conflicted with the correlation field §16.3 requires.
21. **Shared-device / browser behaviour** — a second browser profile or private window on the same machine gets no access; no credential persists in **script-readable** browser storage (`localStorage`, `sessionStorage`, IndexedDB). The required `HttpOnly` session cookie is expected and is asserted against §6.1 instead (§6.2).
22. **Lost device, CASE A (authority reachable)** — with the authoritative session service still reachable from a trusted remaining device or path, that device's sessions are revocable individually without credential recovery, and its next protected request is denied (THREAT-024, §13.2).
23. **Lost device, CASE B (sole authority lost)** — in a strictly local deployment whose lost device held the only authoritative auth/session service, assert that the design claims **no** application-level remote revocation, that no test or document implies otherwise, and that a later migrated or restored authority does not resurrect sessions that were live on the lost device. Run against synthetic fixtures only; **no remote channel may be introduced to make this test pass** (§13.2).
24. **Private-route bypass inventory** — enumerate every private-data-reaching path (routes, ID-addressed reads, list, search, export, delete, derived-artifact creation and reads) and assert each passes the authoritative authorization decision point; assert a path constructed to skip it cannot reach private data (§7.2).
25. **Background job and service-identity authorization** — a background, scheduled, retention, deletion-propagation or index-maintenance job with no valid workspace-bound grant is denied; a job whose grant names workspace A cannot read, list, modify, or emit workspace B's records; a revoked or expired grant is denied on its next use (§3.2, §7.2, §8.3).
26. **Deployment qualification (D1)** — assert the running deployment matches the class D1 authorized: interface binding, absence of any network-reachable private endpoint including via proxy or forwarding, account count, and multi-user mode disabled (§10.2, §26.1).
27. **MFA-deferral qualification and transition** — while every §10.2 condition holds, deferral is permitted; when any condition fails — non-loopback binding, LAN or forwarded exposure, a second account, or a break-glass principal — the private surface is **refused** rather than served without a second factor (§10.2).
28. **Audit identifier cannot authenticate** — a request presenting `SESSION_AUDIT_ID` in place of the bearer credential is denied exactly as an unauthenticated request is; the audit identifier cannot be replayed to resume or impersonate a session; and the bearer credential is not derivable from it in either direction (§5.4, §16.3).
29. **Used recovery credential replay** — presenting a consumed recovery credential fails closed, does not re-open the ceremony, and emits a content-free audit event (§11.2).
30. **Local-origin transport qualification** — on the selected local trust arrangement, assert the private surface is TLS-terminated with `Secure`, `HttpOnly`, restrictive-`SameSite`, narrowly scoped cookies in the browsers the owner uses, and that the private surface **refuses to serve** when the transport requirement is unmet (§6.1).
31. **Credential and fallback policy (D4)** — once D4 is decided, assert that the implemented factors match the decided policy exactly; that re-authentication demands the decided proof; and that, unless D4 explicitly chose otherwise, recovery material cannot be used as an ordinary login credential (§4.8, §26.4).
32. **No operator identity authority** — assert no application path allows an operator or support function to reset a credential, initiate/approve/complete a recovery, reactivate a disabled account, **close an account or elect its closure from any originating state**, create or revoke a session, or change account state (§9.4). This test does **not** claim to bound OS-level access (§18).
33. **Reactivation ceremony containment** — if and only if `OWNER_DECISION_D5` permits reactivation: the ceremony cannot read, list, search, export, or delete any private record, cannot write private data, cannot reach workspace contents, cannot perform key or data recovery, cannot change ownership, and acquires no operator or admin access; it does not open an ordinary session; it restores no prior session; and a fresh ordinary authentication is required before any protected private-data request succeeds (§17.1).
34. **Account recovery is not data recovery** — assert that no test, document, or implementation claims that recovering account access implies decryptability of previously stored private content, and that the relationship is deferred to Gate 0C (§11.4, §20).
35. **Reactivation ceremony entry authority (D5)** — if and only if D5 permits reactivation: the ceremony can be **begun without any ordinary authenticated-session authority**, which a `DISABLED` account by construction does not have, and can be begun **only** with the accepted recovery authority (§11, credential per D4). Assert that no ordinary session and no §4.6 session-bound re-authentication is accepted as, or required for, entry, and that an attempt presenting a pre-disable session is denied rather than treated as proof (§9.4, §17.1).
36. **Reactivation cannot resurrect a closed account** — presenting a `CLOSED` account to the reactivation ceremony is denied and produces no state change; `CLOSED` → `ACTIVE` is unreachable by any ceremony path; and a `CLOSED` account remains `CLOSED` after every reactivation attempt, failure mode and retry (`CLOSED_REACTIVATION_ALLOWED=no`, §17.1).
37. **Reactivation success is bounded (D5)** — the ceremony's only success transition is `DISABLED` → `ACTIVE` (`REACTIVATION_SUCCESS_TRANSITION=DISABLED_TO_ACTIVE_ONLY`); closure is never reported or recorded as a reactivation success; ceremony authority **ends** at the transition and cannot be reused, extended or converted into a session; any recovery material consumed follows the §11.2 lifecycle including single-use invalidation; and a successfully reactivated `ACTIVE` account **still** cannot reach private data until a fresh ordinary login succeeds and every normal §7 check passes (§17.1).
38. **Account recovery is not coupled to encryption recovery (D3 / Gate 0C boundary)** — assert that no authentication-recovery or reactivation test asserts, depends on, or implies encrypted-data recoverability; that no such path invokes a key-unwrap, escrow, recovery-key or alternate-decryption mechanism unless Gate 0C later separately authorizes one; and that an implementation **fails qualification** if it couples account recovery or reactivation to an encryption-recovery mechanism that is not separately accepted (`ALTERNATE_KEY_UNWRAP_PATH_MANDATED=no`; `PRIVATE_DATA_RECOVERABILITY_AFTER_AUTH_RECOVERY=UNRESOLVED_PENDING_GATE_0C`; §11.4, §20, §26.3).
39. **Owner decision gate** — assert that implementation cannot begin while any required decision in `D1`-`D6` remains unaccepted, and that no unanswered decision is resolved by an implementation default (§23, §26).
40. **Active-account closure authority** — closure elected from `ACTIVE` requires a valid ordinary session **and** a fresh/recent §4.6 re-authentication with the proof D4 selects (`ACTIVE_ACCOUNT_CLOSURE_AUTHORITY`); a session alone, a stale elevated state, or an expired re-authentication window is **denied**; and the resulting `ACTIVE` → `CLOSED` transition revokes every session on its next protected request (§4.6, §17.1, §17.4).
41. **Disabled-account closure entry authority (D6)** — assert first, under **both** D6 outcomes, that **no** ordinary disabled-account session authority can authorize closure: a pre-disable session, a replayed session identifier, and a §4.6 re-authentication attempt are each denied rather than treated as proof. Then, **if and only if** D6 answers (a), assert that a `DISABLED` account has **no** closure path at all and every closure attempt from `DISABLED` is denied with no state change. Then, **if and only if** D6 answers (b), assert that the `ACCOUNT_CLOSURE_CEREMONY` can be entered **only** with the accepted recovery authority (§11, credential per D4) and by nothing else — not an operator, not a break-glass path, not Gate 0C key authority (§9.4, §17.1, §17.3).
42. **Closure ceremony containment (D6)** — if and only if D6 permits disabled self-closure: the ceremony cannot read, list, search, export, or delete any private record, cannot write private data, cannot browse or reach workspace contents, cannot transfer ownership, cannot unwrap or destroy keys, cannot perform encrypted-data recovery, and acquires no operator or admin access; it does not open an ordinary session; it restores no prior session; and its authority **ends** at the transition and cannot be reused, extended, or converted into a session (`ACCOUNT_CLOSURE_CEREMONY_PRIVATE_DATA_ACCESS=deny`, §17.1).
43. **No operator or admin closure power** — assert that no application path allows an operator, support function, or admin principal to close an account, elect its closure, or complete a closure ceremony on the user's behalf, from **either** originating state and under **both** D6 outcomes (`OPERATOR_ACCOUNT_CLOSURE_POWER=none`, `APPLICATION_ADMIN_CLOSURE_POWER=none`, §9.4). As with test 32, this claims nothing about OS-level access (§18).
44. **Closure is terminal, and closure is not deletion** — assert that a `CLOSED` account cannot reactivate (`CLOSED_REACTIVATION_ALLOWED=no`, test 36), cannot be presented to the closure ceremony again, and cannot use any closure or reactivation path as an access-recovery mechanism (`CLOSED_STATE_TERMINAL_FOR_GATE_0B=yes`); that the account-status transition occurs **without** any private-data deletion, key destruction, cryptographic erasure, backup eradication or workspace destruction being performed, claimed, or recorded in any audit event or user-facing message (`ACCOUNT_CLOSURE_IMPLIES_PRIVATE_DATA_DELETION=no`, `ACCOUNT_CLOSURE_IMPLIES_KEY_DESTRUCTION=no`); and that an implementation **fails qualification** if any closure path asserts data or key deletion, or invokes a key-unwrap, key-destruction or data-recovery mechanism, that a later gate has not separately accepted (`PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES`; §17.1, §20).

`FUTURE_AUTH_VALIDATION_PLAN_COMPLETE=yes` — in the sense that every area repaired in this and the previous revisions now has a named future test with an expected outcome, including the R1 owner-decision gate (test 39), the R2 reactivation state machine (tests 11, 33, 35, 36, 37), the R3 Gate 0C boundary (tests 34, 38) and the S1 closure authority (tests 8, 11, 32, 40, 41, 42, 43, 44). Tests 40-44 were added by revision 4 and are the only additions; no existing test was rewritten except tests 8, 11, 32 and 39, each of which previously spoke of "closure" or "`D1`-`D5`" in terms this revision made more precise. Not in the sense that any test exists: none of these is implemented, and none may be implemented before the implementation gate is separately authorized.

No destructive testing, no real-data testing, and no production testing is authorized by this list. All tests use fake/synthetic identities, workspaces, and fixtures. No real accounts, no real member data, and no real documents.

---

## 23. Implementation blockers

Until every required item is resolved and separately accepted, implementation remains unauthorized. In particular, **implementation may not begin while any of the required `OWNER_DECISION_D1`-`D6` remains unaccepted** (`OWNER_DECISION_COUNT=6`; `OWNER_DECISIONS_ACCEPTED=0`), and no unanswered decision has an implementation default that would resolve it silently.

- [ ] Gate 0B auth design independently QA'd.
- [ ] Gate 0B operator accepted.
- [ ] Session model accepted (§5).
- [ ] Workspace ownership model accepted (§3).
- [ ] Authorization enforcement model accepted (§7).
- [ ] Revocation design accepted (§12).
- [ ] Recovery design accepted (§11).
- [ ] MFA policy accepted (§10).
- [ ] Operator/admin policy accepted (§9).
- [ ] Audit schema accepted (§16).
- [ ] CSRF/cross-origin model accepted (§14).
- [ ] Rate limiting/abuse model accepted (§15).
- [ ] Auth security test plan accepted (§22).
- [ ] Encryption-design dependencies identified (§20) — **identified in this document; acceptance still pending**.
- [ ] Encryption Gate separately accepted where required (Gate 0C).
- [ ] Private-data implementation separately authorized.
- [ ] `OWNER_DECISION_D1` resolved (§26.1) — deployment reach.
- [ ] `OWNER_DECISION_D2` resolved (§26.2) — break-glass existence.
- [ ] `OWNER_DECISION_D3` resolved (§26.3) — recovery-loss product posture.
- [ ] `OWNER_DECISION_D4` resolved (§26.4) — primary credential / recovery credential / fallback policy.
- [ ] `OWNER_DECISION_D5` resolved (§26.5) — disabled-account self-reactivation policy. **No implementation default exists**: an unanswered D5 blocks implementation rather than selecting terminal disable. Revision 2's "or terminal disable implemented as the safe default" wording is withdrawn, because it would have settled an unaccepted owner decision by omission.
- [ ] `OWNER_DECISION_D6` resolved (§26.6) — disabled-account self-closure policy and the authority that enters a closure ceremony. **No implementation default exists**: an unanswered D6 blocks implementation rather than selecting either outcome. Until it is answered, no `DISABLED` → `CLOSED` path may be built, and `DISABLED_ACCOUNT_CLOSURE_AUTHORITY=UNDECIDED_OWNER_DECISION_D6`. Revision 3's §17.1 promise of a disabled closure election, made with no authority defined for it, is withdrawn and replaced by this decision.
- [ ] Local-origin TLS / `Secure`-cookie compatibility demonstrated for the selected deployment (§6.1, §22 test 30).
- [ ] Deployment qualification and MFA-deferral qualification tests defined and passing (§10.2, §22 tests 26-27).

Gate 0A §17's thirteen private-data blockers remain open in full and are not superseded, restated, or partially closed by this document. Gate 0B is one item on that list.

Until all required gates are resolved:

AUTHENTICATION_IMPLEMENTATION_AUTHORIZED=no

AUTHORIZATION_IMPLEMENTATION_AUTHORIZED=no

PRIVATE_DATA_IMPLEMENTATION_APPROVED=no

---

## 24. Out of scope

Gate 0B does NOT authorize: authentication implementation; authorization implementation; login UI; registration UI; account-creation implementation; MFA implementation; recovery implementation; session storage; middleware; cookies; database schemas; account tables; authorization helpers; private routes; encryption; keys; secrets; private storage; uploads; OCR; parsing; indexing; embeddings; private documents; real users; real member data; private knowledge bases; external AI; production secrets; data migration; package installation; dependency changes; deployment; or any change to runtime behaviour, product version, `feature_list.json` accepted state, `CLOSEOUT.md`, production source, or tests.

Writing this document authorizes none of the above, and no part of it may be cited as authorization for any of them.

---

## 25. Next gates

The next action is **not automatic** and does not follow from this document existing.

Possible next steps, in the order they would occur:

1. Independent QA of the exact Gate 0B design revision commit and its sealed proof, explicitly re-testing S1 (the disabled-account closure authority and the D5-versus-D6 classification), R1 (`OWNER_DECISION_D5` completeness), R2 (the account and reactivation state machine), R3 (the Gate 0C boundary in D3), D1-D6 register consistency and count, the closure-versus-data-deletion boundary, regression of the previously passed F1, F3, F4, F5 and F7 repairs, threat traceability, the future-validation plan, validation equivalence, and whole-document consistency.
2. Operator review, including all six owner decisions in the §26 register (D1-D6).
3. Gate 0B terminal closeout.
4. Only after that, a separate owner decision about whether to authorize Gate 0C encryption design — or neither.

This document does **not** author the encryption-design document, does not start it, and does not chain into it. One gate at a time, per the discipline in `docs/v0.6-future-implementation-gate-draft.md` and the governing plan's approval sequence.

`SENSITIVE_DATA_GATE_0B_AUTH_DESIGN_ACCEPTED=no`

---

## 26. Owner decision register

`OWNER_DECISION_REQUIRED=yes`

`OWNER_DECISION_COUNT=6`

`OWNER_DECISION_IDS=D1,D2,D3,D4,D5,D6`

`OWNER_DECISIONS_ACCEPTED=0`

`OWNER_DECISION_REGISTER_CONSISTENT=yes`

`HIDDEN_OWNER_DECISIONS_FOUND=none_after_revision`

Six decisions, and this register is the complete set:

| ID | Decision | Section |
|---|---|---|
| `D1` | Deployment reach | §26.1 |
| `D2` | Whether any break-glass private-content-access path exists | §26.2 |
| `D3` | Recovery-loss product posture | §26.3 |
| `D4` | Primary credential / recovery credential / fallback policy | §26.4 |
| `D5` | Whether a `DISABLED` account may self-reactivate through a dedicated, limited recovery/reactivation ceremony | §26.5 |
| `D6` | Whether a `DISABLED` account may close itself, and what authority may enter a closure ceremony | §26.6 |

Each is bounded, each has a recommendation, and none blocks review of the rest of this design. They are surfaced rather than guessed because guessing any of them would produce false certainty about a security posture.

**On acceptance.** `OWNER_DECISIONS_ACCEPTED=0`. **None** of D1-D6 is accepted, and a RECOMMENDATION below is this document's reasoning, never a record of the owner's answer. No later document may cite a recommendation here as an acceptance, and no decision below carries an implementation default that would settle it without an owner answering. Revision 1 carried three decisions; independent QA established that the credential/fallback policy was a fourth, hidden inside §4.8's "preferred credential type (revisitable at implementation-plan time)" framing — it is now D4. Independent re-QA of revision 2 established that disabled-account self-reactivation was a fifth, carried as a §17.2 product question outside this register and backed by a terminal-disable implementation default — it is now D5, with that default removed. Independent re-QA of revision 3 established that disabled-account **closure** was a sixth: §17.1 promised the `DISABLED` → `CLOSED` transition while §4.6 required session-bound re-authentication that a `DISABLED` account cannot hold, so the design promised a transition and defined no authority for it, and §26.5 option (a) quietly assumed the answer while asserting that no ceremony existed. It is now `D6` (§26.6), and §26.5(a)'s assumption is withdrawn. **The count was not held at five to preserve a previous number** — it moved to six because the design has six decisions, and the independence test in §17.3 is written out so that an independent reviewer can check that classification rather than take it on trust.

### 26.1 D1 — deployment reach

DECISION_ID= `D1`

QUESTION= Is the first private-data deployment permanently single-user and single-device, or is network exposure / a second user an intended future state?

WHY_OWNER_DECISION= This is a product-scope decision, not a technical one. The repository contains genuine evidence for both readings (§2.1) and no evidence that settles the owner's intent. It changes MFA policy, TLS operational requirements, identity verification, the operator model, and — as this revision establishes — whether lost-device revocation is available at all (§13.2). A wrong assumption here is the kind that gets discovered after private data already exists.

OPTIONS=
(a) Permanently local, single-user, single-device, loopback-only.
(b) Local first, with network exposure or a second user as an accepted future intent.
(c) Multi-user from the start.

SECURITY_TRADEOFFS= (a) permits the deferrals this document takes — MFA deferral (§10.2), in-application-only notification (§18), simplest operator posture (§9) — and matches every deployment fact in the repo; it also locks in CASE B lost-device exposure (§13.2), because a strictly local sole authority is unreachable once the device is gone. (b) keeps those deferrals for now but makes each one conditional and requires the conditions to be honoured and tested later (§10.2, §22 tests 26-27); it is what §2.3's architecture is actually built for. (c) makes MFA, identity verification, TLS termination, and a real operator model immediately mandatory, and makes Gate 0C substantially harder. The repo's deployment evidence points at (a) while its data-model evidence (governing plan §1, §29) points at (b).

RECOMMENDATION= (b). Build the multi-workspace-correct architecture described here, deploy it in the single-device shape, and treat MFA and the rest as conditions that trigger on exposure rather than as things permanently waived. Note explicitly that neither (a) nor (b) removes the CASE B lost-device limitation by itself; only an independently reachable authority does, and that is a separate cost the owner would be choosing.

DEPENDENCIES= §2.3 preferred design family; §6.1 transport requirements; §10.2 MFA deferral boundary; §13.2 lost-device CASE A / CASE B; §18 incident response; §19 external dependency; Gate 0C (§20).

MUST_BE_DECIDED_BEFORE= any private-data implementation plan is accepted, and before the deployment qualification test (§22 test 26) can be written against a known deployment class.

### 26.2 D2 — break-glass operator access

DECISION_ID= `D2`

QUESTION= Should any operator break-glass path to private content exist at all?

WHY_OWNER_DECISION= It is a risk-acceptance decision with a real cost to the owner's own future support ability, and it interacts directly with Gate 0C key design (§20). The owner must decide knowingly, not inherit it as a side effect of an auth-design default.

OPTIONS=
(a) None ever — operator access to private content is architecturally impossible (Gate 0A Model A).
(b) Break-glass with mandatory approval, time-boxing, user notification, and unsuppressable audit (Model B), meeting the §9.5 bar in full.
(c) Ordinary administrative read — **already refused** (§9.2), contradicts governing plan §26.

SECURITY_TRADEOFFS= (a) is the strongest privacy guarantee and the best answer to THREAT-022, at the cost that no support path can ever recover a user's content. (b) preserves a recovery-of-last-resort but creates the exact access path THREAT-022 is about, and on a solo-operator product the approver and the requester are the same person — the procedural control is largely self-approved (§9.2). Choosing (b) also invalidates the unconditional no-operator-unwrap constraint this document hands Gate 0C (§11.3, §20), which would have to be re-derived rather than silently carried forward. Neither option changes OS/root-level reach, which is not application authority and is not bounded by this decision (§9.4, §18).

RECOMMENDATION= (a). It is the default this document already implements by defining no admin principal, and it is strictly safer. Choosing (b) later is possible; unchoosing it after private data exists is not.

DEPENDENCIES= §9 (all); §10.1 (MFA mandatory on any break-glass path); §15.2; §16.2 break-glass audit events; §22 test 18; Gate 0C (§20).

MUST_BE_DECIDED_BEFORE= Gate 0C encryption design is accepted, since operator decryptability is the decisive key-design question; and before any private-data implementation plan is accepted.

### 26.3 D3 — recovery-loss product posture

DECISION_ID= `D3`

QUESTION= What product posture should KIA Stick take when the user loses **both** ordinary authentication authority **and** the accepted recovery authority defined in §11?

WHY_OWNER_DECISION= This is a user-facing product-risk acceptance affecting real people's case material, and there is no engineering fact that settles it. Independent QA rejected revision 1's framing of this decision on two grounds, and both are corrected here. First, revision 1 presented an exhaustive binary — permanent loss, or else necessarily an external channel or an operator capability — and that was not supported: a separately enrolled, user-controlled offline authenticator or additional recovery method is a conceptual counterexample that needs neither. Second, revision 1 asserted that content loss is inevitable, while §11.3 simultaneously reserved the relationship between recovered access and recoverable content to Gate 0C. Gate 0B cannot decide whether encrypted private data remains recoverable; that depends on key design (§11.4, §20).

Independent re-QA of revision 2 then found two further defects in this decision, and this revision corrects both. First, revision 2's `MUST_BE_DECIDED_BEFORE` stated that choosing (b), (c) or (d) means the encryption design must accommodate an **alternate unwrap path** — which mandates a cryptographic mechanism and pre-decides precisely the credential-to-key relationship §11.4 reserves to Gate 0C. It is also not implied: option (b) can add an authentication-only method, and regaining authentication authority does not logically require another key-unwrapping path. Gate 0B has no authority to select escrow, recovery keys, secondary key authorities, operator key recovery, alternate decryption, or any other Gate 0C mechanism, and it selects none. What this decision hands Gate 0C is a **conditional question**, not a requirement. Second, revision 2's recommendation called option (a) the "currently accepted" posture while §26 simultaneously states `OWNER_DECISIONS_ACCEPTED=0`. No posture here is accepted; a recommendation is a recommendation.

**The boundary this decision may establish, and nothing beyond it.** `AUTH_RECOVERY_DISTINCT_FROM_DATA_KEY_RECOVERY=yes` (§11.4). **Authentication recovery** determines whether the account or user can regain **authentication authority**. It does **not** determine whether previously encrypted private data is decryptable after recovery. That question belongs to Gate 0C:

`PRIVATE_DATA_RECOVERABILITY_AFTER_AUTH_RECOVERY=UNRESOLVED_PENDING_GATE_0C`

`KEY_RECOVERY_ARCHITECTURE=UNRESOLVED_PENDING_GATE_0C`

`ALTERNATE_KEY_UNWRAP_PATH_MANDATED=no`

`GATE_0C_ARCHITECTURE_SELECTED=no`

No Gate 0C option is accepted, selected, mandated or recommended in this document. Where a key mechanism is named anywhere in this design — §11.3's open questions, §20's handoff table — it is named as an **unresolved Gate 0C question or example**, never as a Gate 0B requirement.

OPTIONS=
(a) Account access becomes unrecoverable under the auth model designed here. The user may later create a new account and workspace if a future implementation gate permits it. The disposition and recoverability of any previously encrypted data is **UNKNOWN until Gate 0C** and is not decided, predicted or implied here.
(b) A future, separately gated, **additional user-controlled authentication** recovery mechanism may be considered — for example a separately enrolled offline authenticator or a second independently stored recovery credential — provided it creates no operator bypass and no external dependency. Considering it implies nothing about key or data recovery.
(c) An external identity or recovery authority could be reconsidered, but only through a separate owner and design decision, with its privacy and network tradeoffs (§19) explicitly accepted rather than absorbed silently.
(d) Another Gate-0A-compliant **authentication** recovery architecture may be separately proposed and independently gated.

SECURITY_TRADEOFFS= (a) is the only option that needs nothing beyond what this document already designs; its cost is a real, permanent loss of **account access**, and — pending Gate 0C — an undetermined outcome for the content itself. (b) reduces the chance of total loss without an operator or a third party, at the cost of more user-held material to manage, a second enrolment ceremony, and more lifecycle surface (§11.2) — it also does not by itself guarantee content decryptability, which remains a Gate 0C question. (c) restores a familiar recovery experience by reintroducing precisely the external dependency and metadata-disclosure channel §19 excludes, and relocates the real key to a third-party account. (d) keeps the door open honestly but resolves nothing today. Gate 0A §2 flags this exact tension between Recoverability and Confidentiality as something that must be designed for explicitly.

Three things this decision explicitly does **not** assert, each of which revision 1 implied: that operator support can simply reset access (it cannot, §9.4); that successful account recovery means encrypted private data can be decrypted (undetermined, §11.4); and that loss necessarily means permanent private-data loss (also undetermined until Gate 0C defines key and recovery semantics).

RECOMMENDATION= (a), as this document's **recommendation and nothing more** — `OWNER_DECISIONS_ACCEPTED=0`, D3 is not accepted, and no later document may cite this line as acceptance. If the owner accepts it, the posture should be stated plainly to the user when the recovery credential is issued rather than buried, and (b) should be preserved as a legitimate, separately gated future improvement rather than foreclosed. The recommendation is scoped to loss of **authentication authority** across the user-held recovery methods this design actually defines, not across all conceivable ones, and it asserts nothing about whether previously encrypted content remains decryptable — that stays `UNRESOLVED_PENDING_GATE_0C`.

DEPENDENCIES= §11 (all), especially §11.2 lifecycle and §11.4 auth-vs-data recovery; §19 external dependency; §26.2 D2; §26.4 D4; Gate 0C (§20).

MUST_BE_DECIDED_BEFORE= any account-creation disclosure text is written, and before Gate 0C key design is accepted. What D3's outcome hands Gate 0C is a **conditional question, not a mandated mechanism**: if the owner chooses (b), (c) or (d), Gate 0C must separately decide whether the additional authentication-recovery authority has any relationship to key material at all, and if so what — a question Gate 0C may answer in the negative. Gate 0B requires no alternate unwrap path, no escrow, no recovery key, no secondary key authority and no operator key recovery under any D3 outcome, and selects no key architecture (`ALTERNATE_KEY_UNWRAP_PATH_MANDATED=no`; `KEY_RECOVERY_ARCHITECTURE=UNRESOLVED_PENDING_GATE_0C`).

### 26.4 D4 — credential and fallback policy

DECISION_ID= `D4`

QUESTION= What is the primary authentication credential; does any fallback authentication path exist at all; and what exactly is the offline recovery credential's relationship to both?

WHY_OWNER_DECISION= Independent QA found this decision hidden rather than absent. §2.2 described the passkey credential type as deferred to implementation-plan time, while §4.8 expressed a preference for a passkey primary with a passphrase "recoverable secondary" — without ever saying whether the two are AND factors, alternative logins, or a recovery-only path, or which proof re-authentication demands. That distinction determines MFA posture, account-takeover resistance, hardware requirements, and how much recovery burden the user carries. It is a product and security policy with user-visible consequences, not an engineering preference, and this revision therefore removes the preference from §4.8 rather than restating it. Gate 0B does **not** resolve it.

OPTIONS=
(a) **Single credential, no fallback.** One primary credential; no alternative authentication path. Recovery exists only as the separate §11 ceremony.
(b) **Primary plus a distinct second factor (AND).** Both required at login; the recovery credential remains a separate ceremony and is not a login path.
(c) **Primary with an alternative login credential (OR).** Two credentials, either sufficient on its own.
(d) **Primary plus recovery material usable as a login credential.** The recovery credential doubles as an alternate login.

SECURITY_TRADEOFFS= (a) is the smallest surface and the clearest ceremony separation; its cost is that losing the primary credential goes straight to the recovery ceremony. (b) is the strongest against credential theft and is the only option that satisfies a future MFA requirement by construction (§10.2), at the cost of hardware or enrolment burden and a second thing to lose. (c) is the most forgiving in daily use and the weakest security posture in the set: overall strength collapses to the weaker of the two paths, and an attacker attacks only that one. (d) is the option this design most strongly cautions against: it deletes the separation of ceremonies §4.8 establishes, turns high-entropy recovery material into an everyday login secret — which encourages storing it somewhere convenient rather than offline — and makes a single stolen artifact sufficient for full private-data access. Across all four options, the §11.2 recovery lifecycle requirements hold unchanged, and key/data recovery remains a Gate 0C question (§11.4).

RECOMMENDATION= (a) for the current single-user local deployment, moving to (b) as the required posture the moment D1 permits any network exposure or a second user (§10.2) — with the §4.8 separation-of-ceremonies principle preserved in both cases. (c) is not recommended. (d) is recommended against, and if the owner chooses it, it must be chosen explicitly and knowingly, not arrived at through an implementation convenience.

DEPENDENCIES= §2.2 option D; §4.6 re-authentication proof; §4.8 credential requirements and ceremony separation; §10.2 MFA deferral boundary; §11.1-§11.2 recovery model and lifecycle; §17.1 which credential a permitted reactivation ceremony demands; `OWNER_DECISION_D5` (§26.5), which is a **separate** decision — D4 fixes which credential such a ceremony would demand, D5 decides whether one exists at all, and neither determines the other; §22 tests 27 and 31; Gate 0C (§20).

MUST_BE_DECIDED_BEFORE= any authentication implementation plan is accepted; before the §17.1 reactivation ceremony can be fully specified, if `OWNER_DECISION_D5` permits one at all; and before the MFA-deferral qualification test (§22 test 27) can assert a concrete factor policy.

### 26.5 D5 — disabled-account self-reactivation policy

DECISION_ID= `D5`

QUESTION= May a `DISABLED` account be reactivated by its own owner at all — through a dedicated, limited reactivation ceremony (§17.1) entered with the accepted recovery authority — or is `DISABLED` terminal in this product until some future, separately authorized administrative/account-management design exists?

WHY_OWNER_DECISION= This is a product decision about account semantics and availability, not an engineering consequence of any other decision. Independent re-QA established it as distinct from D4: holding **every** D4 credential option fixed, the owner can still independently choose terminal disable or pause-and-reactivate, and the choice changes what "disable" means to a user, whether a self-service path back exists, and how much authenticated-but-not-yet-authorized ceremony surface the product carries. Revision 2 kept it outside this register as a §17.2 "product question" and named terminal disable as the implementation default if nobody answered — which would have settled an unaccepted policy by omission. There is no repo evidence that settles the owner's intent, and both outcomes are coherent and defensible. It also has a real user consequence: under option A, a user who disables their account has no self-service way back, which for case material is a decision the owner should make knowingly rather than inherit.

OPTIONS=
(a) **Terminal disable.** `DISABLED` is terminal for **reactivation** until a future, **separately authorized** administrative/account-management design exists. No self-reactivation ceremony is designed or implemented. Whether a disabled owner has any *other* election — specifically explicit closure — is **not** decided by D5 and is `OWNER_DECISION_D6` (§26.6). Revision 3 stated here that "a disabled owner's only remaining election is explicit closure (§17.1), which is terminal"; that clause is **withdrawn**, because it both assumed a D6 outcome the owner never accepted and asserted an election for which the document defined no reachable authority — the defect independent re-QA raised as `S1_DISABLED_CLOSURE_AUTHORITY_UNRECONCILED`.
(b) **Limited self-reactivation.** A `DISABLED` account may self-reactivate through the dedicated limited ceremony of §17.1: entered **only** with the accepted recovery authority (§11) and never with an ordinary authenticated session; granting **no** private-data access, no exports, no search, no workspace access, no key or data recovery, no ownership change and no operator/admin access; succeeding **only** as `DISABLED` → `ACTIVE`; never reaching `CLOSED`; ending its authority at that transition; and requiring a fresh ordinary authentication (§4.3, §4.4) before any protected access.

SECURITY_TRADEOFFS= (a) is strictly smaller in attack surface: no ceremony exists, so no ceremony can be abused, mis-scoped, or grown into an operator on-ramp at implementation time, and there is one less path an attacker holding recovery material can drive. Its cost is availability and user experience — "pause my account" becomes a state with no self-service way back, and if D6 also answers (a) it becomes a state with no way out at all, which the owner should weigh across both decisions rather than either alone (§17.3). (b) preserves a genuine pause capability with a real user benefit, at the cost of a second ceremony to specify, rate-limit, audit and test, and of making the accepted recovery authority sufficient to restore account status — which raises the value of that recovery material and makes the §11.2 lifecycle requirements load-bearing rather than merely prudent. Under **both** options the §17.1 invariants hold unchanged: ordinary session authority is invalid in `DISABLED`, no operator may reactivate (`OPERATOR_REACTIVATION_POWER=none`), `CLOSED` can never be reactivated, and nothing about reactivation implies any private-data or key access. Neither option creates an operator backdoor, and neither is permitted to acquire one at implementation time.

RECOMMENDATION= (a) for the first private-data deployment — it adds no ceremony, no new authority and no new surface, and it can be revisited later without having already shipped a path. If the owner wants a pause capability, (b) is legitimate and is fully specified in §17.1 so it can be chosen without redesign; it must then be chosen explicitly. **This recommendation is not an acceptance** (`OWNER_DECISIONS_ACCEPTED=0`), and unlike revision 2 it is **not** an implementation default: if D5 is unanswered, implementation does not begin (§23).

DEPENDENCIES= §4.6 (why session-bound re-authentication cannot serve a disabled account); §9.4 owner-versus-operator authority and `REACTIVATION_ENTRY_USES_ORDINARY_SESSION=no`; §11.1-§11.2 the accepted recovery authority and its lifecycle, which option (b) consumes; §15 rate limiting; §16 content-free audit; §17.1 state machine and ceremonies; §17.4 lifecycle consequences; §21 THREAT-020, THREAT-021, THREAT-022; §22 tests 11, 33, 35-38; `OWNER_DECISION_D4` (§26.4), which fixes **which** credential a permitted ceremony demands but does not decide **whether** one exists; `OWNER_DECISION_D1` (§26.1), since a multi-user or network-exposed deployment raises the stakes of any reactivation path; `OWNER_DECISION_D6` (§26.6), which is **related but not determined** — D5 governs the `DISABLED` → `ACTIVE` direction and D6 the `DISABLED` → `CLOSED` direction, all four combinations are coherent, and neither answer settles the other (§17.3).

MUST_BE_DECIDED_BEFORE= any authentication implementation plan is accepted; before §17.1's ceremony can be specified, built or tested; and before §22 tests 33 and 35-38 can assert a concrete policy. There is **no** safe implementation default: an unanswered D5 blocks implementation rather than selecting (a).

### 26.6 D6 — disabled-account closure policy

DECISION_ID= `D6`

QUESTION= May a `DISABLED` account be **closed by its own owner** at all — through a dedicated, limited `ACCOUNT_CLOSURE_CEREMONY` (§17.1) entered with the accepted recovery authority — or does closure remain available **only** from `ACTIVE`, leaving a `DISABLED` account with no closure path under Gate 0B until some future, separately authorized account-management design exists? And, consequentially: what authority, if any, may enter that closure ceremony?

WHY_OWNER_DECISION= This is a product and security policy question about account semantics, availability and irreversibility, not an engineering consequence of any other decision, and the repository contains no evidence that settles the owner's intent. Independent re-QA of revision 3 isolated the gap — §17.1 promised a `DISABLED` → `CLOSED` election while §4.6 required session-bound re-authentication for closure and `DISABLED_ORDINARY_SESSION_AUTHORITY=invalid` — and deliberately made no product choice. It is distinct from `OWNER_DECISION_D5` by the same independence test that separated D5 from D4, worked through in §17.3: holding D5 fixed at **either** outcome, the owner still has a real and consequential choice here, and holding D6 fixed at either outcome, D5 remains open. All four combinations are coherent. Revision 3's §26.5 option (a) assumed the answer in passing ("a disabled owner's only remaining election is explicit closure") without registering it, which is precisely the hidden-decision failure mode this register exists to prevent; that assumption is withdrawn. Deciding which credential D4 selects does **not** answer this: a credential type is not an authority model, and naming a credential for an election that no principal can reach settles nothing.

OPTIONS=
(a) **No disabled self-closure.** Closure is available **only** from `ACTIVE`, under `ACTIVE_ACCOUNT_CLOSURE_AUTHORITY` (ordinary session plus §4.6 re-authentication). A `DISABLED` account has no closure path; no `ACCOUNT_CLOSURE_CEREMONY` is designed or implemented; and `DISABLED` remains disabled until a future, **separately authorized** account-management policy exists. If D5 also answers (a), `DISABLED` has no outgoing transition at all under Gate 0B, which the owner must accept knowingly. If D5 answers (b), a disabled owner who wants closure reactivates first and closes from `ACTIVE` — two steps, but no second ceremony.
(b) **Limited disabled self-closure.** A `DISABLED` account may close itself through the dedicated limited `ACCOUNT_CLOSURE_CEREMONY` of §17.1: entered **only** with the accepted recovery authority (§11, credential per D4) and never with an ordinary session, §4.6 re-authentication, operator or admin authority, break-glass content authority, or Gate 0C key authority; granting **no** private-data access, no reads, writes, workspace browsing, search, export, document access, ownership transfer, key unwrap, key destruction, encrypted-data recovery, or any deletion claim; requiring explicit confirmation of irreversibility; succeeding **only** as `DISABLED` → `CLOSED`; ending its authority at that transition; rate-limited, content-free audited, and creating no operator backdoor.

SECURITY_TRADEOFFS= The decisive asymmetry is that **reactivation is restorative and closure is destructive and irreversible**, so this is not the same tradeoff as D5 even though it has the same shape. Under (b), the accepted recovery authority becomes sufficient to **permanently end** account access: an attacker who obtains recovery material gains a terminal denial-of-access capability, and unlike an unwanted reactivation — which the true owner can observe, audit and disable again — an unwanted closure cannot be undone under Gate 0B (`CLOSED_REACTIVATION_ALLOWED=no`, `CLOSED_STATE_TERMINAL_FOR_GATE_0B=yes`). That raises the value of recovery material further than D5(b) does and makes the §11.2 lifecycle requirements and §15 rate limits load-bearing against an availability attack rather than only against a takeover. (b) also adds a second ceremony to specify, bound, rate-limit, audit and test, and a second surface that must not be allowed to grow into an operator on-ramp or acquire private-data authority at implementation time. (a) adds no ceremony, no new authority and no new surface, and cannot be abused because it does not exist; its cost is real but narrower than it first appears — a disabled owner cannot end their account relationship on their own, and under D5(a) as well they are left in a state with no exit, which for case material is a user-facing consequence the owner should choose deliberately rather than inherit. Under **both** options the §17.1 invariants hold unchanged: `DISABLED_CLOSURE_USES_ORDINARY_SESSION=no`; no operator, support function or admin principal may close an account (`OPERATOR_ACCOUNT_CLOSURE_POWER=none`, `APPLICATION_ADMIN_CLOSURE_POWER=none`); `CLOSED` is terminal and never an access-recovery route; and closure never implies private-data deletion or key destruction. Neither option creates an operator backdoor, and neither is permitted to acquire one at implementation time. Neither option decides what happens to stored private content: `PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES`.

RECOMMENDATION= (a) for the first private-data deployment, on the same reasoning that recommends D5(a) and with one addition specific to closure: because the outcome is irreversible and unrecoverable, the cost of getting (b) wrong is strictly higher than the cost of getting D5(b) wrong, and (a) can be revisited later without having already shipped a path that permanently destroys account access. If the owner does want a disabled owner to be able to end the relationship without first reactivating, (b) is legitimate and is fully specified in §17.1 so it can be chosen without redesign; it must then be chosen explicitly, and it should be paired with the §15 limits and the §11.2 single-use lifecycle treated as security controls rather than hygiene. **This recommendation is not an acceptance** (`OWNER_DECISIONS_ACCEPTED=0`), and it is **not** an implementation default: if D6 is unanswered, implementation does not begin (§23).

DEPENDENCIES= §4.6 and §4.9 (why session-bound re-authentication governs the `ACTIVE` path only and cannot serve a disabled account); §9.4 owner-versus-operator authority, `DISABLED_CLOSURE_USES_ORDINARY_SESSION=no` and `OPERATOR_ACCOUNT_CLOSURE_POWER=none`; §11.1-§11.2 the accepted recovery authority and its lifecycle, which option (b) consumes; §15 rate limiting, which under (b) guards an irreversible action; §16 content-free audit; §17.1 state machine and the `ACCOUNT_CLOSURE_CEREMONY`; §17.3 the independence test that classifies this as D6; §17.4 lifecycle consequences; §20 and `OWNER_DECISION_D3` (§26.3), which own what closure does **not** decide about keys and stored content; §21 THREAT-020, THREAT-021, THREAT-022; §22 tests 8, 11, 32, 40-44; `OWNER_DECISION_D4` (§26.4), which fixes **which** credential a permitted ceremony demands but does not decide **whether** one exists; `OWNER_DECISION_D5` (§26.5), which is related but **does not determine** this decision in either direction (§17.3); `OWNER_DECISION_D1` (§26.1), since a multi-user or network-exposed deployment raises the stakes of any ceremony that can irreversibly destroy access.

MUST_BE_DECIDED_BEFORE= any authentication implementation plan is accepted; before §17.1's `ACCOUNT_CLOSURE_CEREMONY` can be specified further, built or tested; before any `DISABLED` → `CLOSED` path is implemented at all; and before §22 tests 41-43 can assert a concrete policy. There is **no** safe implementation default: an unanswered D6 blocks implementation rather than selecting (a). It does **not** need to be decided before Gate 0C, and it decides nothing Gate 0C owns — `PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES` under either outcome.

---

## Current phase result

This document is planning and design only. It changes no runtime behaviour, no production code, no test, no dependency, no `feature_list.json` accepted state, and no `CLOSEOUT.md` content. It creates no account, session, credential, key, or secret. It accesses no real or private document, archive, or vault. It does not weaken any Gate 0A requirement, and it does not start the encryption design.

REAL_DOCUMENTS_ACCESSED=no

CMAL_CONSTITUTION_ACCESSED=no

SENSITIVE_ARCHIVE_ACCESSED=no

REAL_USER_DATA_ACCESSED=no

SECRETS_CREATED=no

AUTHENTICATION_IMPLEMENTATION_AUTHORIZED=no

AUTHORIZATION_IMPLEMENTATION_AUTHORIZED=no

PRIVATE_DATA_IMPLEMENTATION_APPROVED=no

ENCRYPTION_IMPLEMENTATION_AUTHORIZED=no

ENCRYPTION_DESIGN_STATUS=REQUIRES_SEPARATE_GATE

PRODUCTION_AUTH_ARCHITECTURE_ACCEPTED=no

AUTH_SESSION_CREDENTIAL_LOGGING_ALLOWED=no

SAFE_SESSION_AUDIT_IDENTIFIER_DEFINED=yes

ACCOUNT_STATE_MACHINE_COHERENT=yes

DISABLED_ACCOUNT_PROTECTED_ACCESS=deny

DISABLED_ORDINARY_SESSION_AUTHORITY=invalid

REACTIVATION_ENTRY_USES_ORDINARY_SESSION=no

REACTIVATION_CEREMONY_PRIVATE_DATA_ACCESS=deny

REACTIVATION_SUCCESS_TRANSITION=DISABLED_TO_ACTIVE_ONLY

CLOSED_REACTIVATION_ALLOWED=no

CLOSED_STATE_TERMINAL_FOR_GATE_0B=yes

FRESH_NORMAL_AUTH_REQUIRED_AFTER_REACTIVATION=yes

DISABLED_SELF_REACTIVATION_POLICY=UNDECIDED_OWNER_DECISION_D5

ACTIVE_ACCOUNT_CLOSURE_AUTHORITY=ORDINARY_SESSION_PLUS_SECTION_4_6_REAUTHENTICATION

DISABLED_ACCOUNT_CLOSURE_AUTHORITY=UNDECIDED_OWNER_DECISION_D6

DISABLED_SELF_CLOSURE_POLICY=UNDECIDED_OWNER_DECISION_D6

DISABLED_CLOSURE_USES_ORDINARY_SESSION=no

ACCOUNT_CLOSURE_CEREMONY_PRIVATE_DATA_ACCESS=deny

ACCOUNT_CLOSURE_IMPLIES_PRIVATE_DATA_DELETION=no

ACCOUNT_CLOSURE_IMPLIES_KEY_DESTRUCTION=no

PRIVATE_DATA_DISPOSITION_AFTER_ACCOUNT_CLOSURE=UNRESOLVED_PENDING_LATER_GATES

APPLICATION_ADMIN_PRINCIPAL_PRESENT=no

APPLICATION_ADMIN_CLOSURE_POWER=none

OPERATOR_ACCOUNT_RECOVERY_POWER=none

OPERATOR_CREDENTIAL_RESET_POWER=none

OPERATOR_REACTIVATION_POWER=none

OPERATOR_ACCOUNT_CLOSURE_POWER=none

RECOVERY_SECRET_LIFECYCLE_COMPLETE=yes

LOST_DEVICE_REMOTE_REVOCATION_ALWAYS_AVAILABLE=no

REVOCATION_REQUIREMENT=DENY_ON_NEXT_PROTECTED_REQUEST_AFTER_AUTHORITY_ACCEPTS_REVOCATION

AUTH_RECOVERY_DISTINCT_FROM_DATA_KEY_RECOVERY=yes

PRIVATE_DATA_RECOVERABILITY_AFTER_AUTH_RECOVERY=UNRESOLVED_PENDING_GATE_0C

KEY_RECOVERY_ARCHITECTURE=UNRESOLVED_PENDING_GATE_0C

ALTERNATE_KEY_UNWRAP_PATH_MANDATED=no

GATE_0C_ARCHITECTURE_SELECTED=no

OWNER_DECISION_COUNT=6

OWNER_DECISION_IDS=D1,D2,D3,D4,D5,D6

OWNER_DECISIONS_ACCEPTED=0

OWNER_DECISION_REGISTER_CONSISTENT=yes

HIDDEN_OWNER_DECISIONS_FOUND=none_after_revision

MFA_DEFERRAL_BOUNDARY_TESTABLE=yes

BROWSER_SESSION_SECURITY_CONTRADICTION_RESOLVED=yes

PRIVATE_ROUTE_BYPASS_MODEL_DEFINED=yes

BACKGROUND_JOB_AUTHORIZATION_DEFINED=yes

THREAT_TRACEABILITY_COMPLETE=yes

THREATS_DECLARED_SOLVED_BY_DESIGN=none

FUTURE_AUTH_VALIDATION_PLAN_COMPLETE=yes

PREFERRED_SESSION_MODEL=OPAQUE_SERVER_SIDE_SESSION

AUTH_CREDENTIAL_LOCALSTORAGE_ALLOWED=no

AUTHORIZATION_DEFAULT=deny

WORKSPACE_SHARING_STATUS=NOT_AUTHORIZED

SENSITIVE_DATA_GATE_0B_AUTH_DESIGN_ACCEPTED=no

The next step is independent QA of the exact commit introducing this revision, followed by operator review of the §26 register's six decisions (D1-D6), and then a separate owner authorization decision about whether any later gate begins. This revision repairs the one remaining material ambiguity independent review raised against revision 3; it does not accept the design.
