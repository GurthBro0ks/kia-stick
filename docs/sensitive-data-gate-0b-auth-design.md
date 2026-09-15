# Sensitive-Data Gate 0B — Authentication / Authorization Design

Phase: `KIA-Stick-sensitive-data-gate-0B-auth-design-planning`

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
- **UNRESOLVED OWNER DECISION** — a question that repo evidence does not settle and that this document deliberately does not guess. Each one is written out in full in §26 with DECISION / OPTIONS / TRADEOFFS / RECOMMENDATION / WHY_OPERATOR_INPUT_IS_REQUIRED. There are three. They are bounded, and none of them blocks the rest of this design from being reviewed.

`OWNER_DECISION_REQUIRED=yes` — see §26. This is disclosed, not hidden: a PASS planning phase may contain bounded owner decisions, and these three are named rather than resolved by guesswork.

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
| REVOCATION_REQUIREMENT | DENY_ON_NEXT_PROTECTED_REQUEST | Gate 0A §3 AUTHENTICATION_DATA, §10, THREAT-020 |
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

- Assessed and *not* selected as the sole model: passkeys are strong against phishing and credential stuffing, but a purely device-bound credential with no second factor makes device loss (THREAT-024) a total-loss event, and the recovery story then depends entirely on Gate 0C key design. It is recorded here as the leading candidate credential type to reconsider at implementation-plan time, not as something Gate 0B selects.

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

**SESSION** — an authenticated, revocable, time-bounded binding between one USER_ACCOUNT and one client, with its own opaque identifier distinct from the account identifier. Sessions are first-class records precisely because revocation must act on them individually (§12, §13).

**OPERATOR_ADMIN_PRINCIPAL** — deliberately **not defined as an application principal** in the first private architecture (§8, §9). There is no admin role, no admin route, and no admin session. This is a DESIGN CHOICE, and §9 explains why defining one would be the more dangerous option.

**SERVICE_PRINCIPAL** — non-human identities for background work that a private architecture may eventually need (retention expiry, deletion propagation, index maintenance). Each is narrowly scoped to one function, holds no interactive credential, cannot authenticate as a user, and cannot read private content except where its single function provably requires it. Named here so that least privilege (§1.3) has something to apply to; no service principal is authorized or specified.

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

**REQUIREMENT (Gate 0A §9, THREAT-003):** the authoritative session identifier is generated *after* successful authentication, and any pre-authentication identifier is invalidated rather than upgraded in place. An identifier observable before authentication must never be replayable as an authenticated identifier afterwards. This is the session-fixation control and it is not optional.

The same regeneration applies on any privilege elevation (§5.4) — including, if re-authentication for a sensitive action is ever introduced, the transition into that elevated state.

Emits `SESSION_CREATED`.

### 4.5 Logout

- Server-side destruction (not expiry, not a client-side flag) of the session record, so the next protected request with that identifier is denied (§12).
- The client-side credential transport is cleared, but clearing it is a convenience, never the mechanism — a logout that only clears a cookie and leaves the server-side session valid is a FAIL state.
- Emits `LOGOUT` and `SESSION_REVOKED`.

### 4.6 Re-authentication

Required for: credential change, MFA enrolment or removal (if MFA exists, §10), recovery-secret regeneration, session-revoke-all, account disable, and account closure. Each of these is an action that, if performed by a stolen session, compounds the compromise — so each requires proof of the credential, not merely proof of a session.

Re-authentication produces a short-lived elevated state that is itself session-bound, does not survive logout, and triggers identifier rotation per §4.4.

### 4.7 Session expiration

Defined in §5.5. Expiry is a bound on session lifetime, never a substitute for revocation (§12).

### 4.8 Credential requirements

If the selected credential model is a user-chosen secret (a password or passphrase), the following are future requirements, stated without selecting a library or vendor:

- Stored only as a verifier produced by a memory-hard, salted, deliberately slow password-hashing function with per-credential salt and tunable cost. Never stored reversibly, never encrypted-and-decryptable, never hashed with a fast general-purpose digest.
- Never logged, never included in an audit event, never in proof output, never in an error message or stack trace (§1.3, Gate 0A §15).
- Length-first strength policy with a generous maximum, screened against known-breached credential lists where that screening can be done offline; no composition rules that push users toward predictable patterns; no forced periodic rotation absent evidence of compromise.
- Credential change requires re-authentication (§4.6) and revokes all other sessions (§12).

**Preferred credential type (DESIGN CHOICE, revisitable at implementation-plan time):** a device-bound passkey/WebAuthn credential as the primary factor, with a user-chosen passphrase as the recoverable secondary — because for a local-first tool the dominant credential threat is device loss (THREAT-024) rather than remote credential stuffing, and a device-bound credential paired with a user-held recovery secret (§11) addresses both without an external dependency. This is recorded as a preference with reasons, not as a vendor selection; no library is named or authorized.

### 4.9 Account closure

Covered in §17.

---

## 5. Session architecture

### 5.1 The governing constraint

Gate 0A fixes `REVOCATION_REQUIREMENT=DENY_ON_NEXT_PROTECTED_REQUEST` with, in its own words, "no stale-ALLOW tolerance window for a protected private-data request." Gate 0B's job is not to restate that requirement but to select a session architecture that can *prove* it. Gate 0A is explicit that a design which cannot demonstrate next-request denial is unacceptable.

### 5.2 Design families compared

**Opaque server-side session.** The session identifier is a high-entropy random value carrying no claims; all authoritative state (account, workspace, status, issue/expiry times) lives server-side and is consulted on each protected request.

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
- **Session identifier:** high-entropy, cryptographically random, unpredictable, opaque, distinct from the account identifier and from the workspace identifier, and never derived from any of them.
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

### 6.2 Browser storage

`AUTH_CREDENTIAL_LOCALSTORAGE_ALLOWED=no`

**REQUIREMENT.** No authentication or session credential may live in `localStorage`, `sessionStorage`, IndexedDB, or any other script-readable browser store, and no such value may be authoritative for an authorization decision.

This is KIA-specific rather than generic. KIA Stick *already* persists five `localStorage` keys today (§3.1), and they work well for what they are: public/fake workflow state. Gate 0A §4.1 flags precisely this as a "partial precedent" surface — the danger is not that `localStorage` exists, but that a future private implementation reaches for the pattern already in the codebase. Gate 0A states the reasons directly: `localStorage` is unencrypted, readable by any script on the origin and by anyone with access to the browser profile, has no per-user isolation, no server-side authorization, and no deletion guarantee beyond the one browser profile holding it.

No exception is proposed. There is no "just the session ID," no "just a non-sensitive hint," and no "only in dev." A value that determines access is a credential regardless of what it is called.

### 6.3 XSS and session-fixation assumptions

- **XSS is assumed possible, not assumed absent.** `HttpOnly` is load-bearing for that reason. Any future private UI inherits the repo's existing lint/type discipline and must additionally avoid raw HTML injection paths for private content — and, per THREAT-012/THREAT-013, must never treat private document text as instructions or as markup.
- **Session fixation** is addressed by mandatory identifier regeneration at §4.4, not by cookie attributes alone.
- **Session theft** is assumed to be possible via device compromise or an unattended unlocked device. The mitigations are idle timeout (§5.5), individually revocable sessions (§13), and revoke-all (§12) — this is why §13 refuses to treat multi-session support as a convenience feature.

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

`OPERATOR_PRIVATE_CONTENT_ACCESS=NO_ROUTINE_ACCESS__NO_ADMIN_PRINCIPAL__MODEL_A_PREFERRED__BREAK_GLASS_UNRESOLVED_PENDING_GATE_0C`

**DESIGN CHOICE, with a named dependency.** For the first private architecture:

- There is **no admin principal, no admin role, no admin route, and no admin session** (§3.2, §8.2). There is nothing to log in as. This is the strongest control actually available at Gate 0B, and it is available *now* rather than pending another gate.
- Model A is the **preferred target**, consistent with governing plan §5's user-workspace key-ownership default. Gate 0B cannot select it outright, because whether the operator *technically* can decrypt is decided by key design, not by auth design.
- Whether any break-glass path exists at all is `OWNER_DECISION_D2` (§26.2). Gate 0B does not create one. A design with no break-glass path is strictly safer and is the default in the absence of a decision.

`DEPENDENCY_ON_ENCRYPTION_GATE=yes`. Specifically unresolved until Gate 0C: whether operator-held storage is decryptable without the user's credential; whether cryptographic erasure is available as a revocation mechanism for operator reach; and whether any recovery path (§11) implies an operator-usable decryption capability. Those three are the whole of the dependency, and none of them is an auth decision.

### 9.4 Support without content access

Support operations that must remain possible without reading private content, and are sufficient for realistic support:

- Confirm an account's status (`ACTIVE` / `DISABLED` / `CLOSED`) and whether a session exists — status, not content.
- Read content-free auth audit events (§16): counts, outcome codes, timestamps, opaque identifiers, correlation IDs.
- Confirm that a record exists and its safe-label metadata — type, size band, retention state, redaction state — per the metadata-minimization model the governing plan §9 and `lib/redactionMetadataModel.ts` already establish for fake data.
- Reproduce a defect against synthetic/fake fixtures, which is the discipline this repository already runs on (Gate 0A §15).
- Revoke sessions, disable an account, or trigger a user-initiated recovery — all of which act on access, none of which reads content.

### 9.5 If a break-glass path is ever authorized

Not authorized, not designed, not implemented. Minimum bar it would have to clear, recorded so that D2 can be decided against something concrete: explicit user-visible initiation or notification; a stated, recorded, task-scoped reason; hard time-boxing with automatic expiry; a scope limited to the specific records the task requires rather than the workspace; `ADMIN_BREAK_GLASS_STARTED` / `ADMIN_BREAK_GLASS_ENDED` audit events that cannot be suppressed by the principal using the path (§16); independent revocation; and a content-free audit trail that is itself reviewable. Operator access with no corresponding audit entry is a FAIL state, without exception (Gate 0A §15).

---

## 10. MFA policy

### 10.1 Assessment

- **Normal users, local-first deployment.** The credential threats MFA is best at — remote credential stuffing, phishing, password reuse — largely do not apply to an account reachable only from loopback on one laptop. The dominant threat is THREAT-024 device loss, and a second factor stored on the same lost device adds little.
- **Normal users, if network-exposed.** The calculus inverts completely. A network-reachable authentication endpoint holding union members' grievance and medical/OWCP-like material (Gate 0A §3, highest sensitivity) without a second factor is not defensible.
- **Operator/admin principals.** Not applicable: there is no admin principal (§9.3). If D2 ever creates a break-glass path, MFA on it is mandatory, not optional.
- **Recovery-sensitive actions.** Credential change, recovery-secret regeneration, revoke-all, disable, closure — these already require re-authentication (§4.6). Where a second factor exists, it is required for these regardless of whether it is required at ordinary login.

### 10.2 Selection

`MFA_POLICY=DEFERRED_FOR_THE_LOCAL_SINGLE_USER_DEPLOYMENT__REQUIRED_BEFORE_ANY_NETWORK_EXPOSED_OR_MULTI_USER_DEPLOYMENT__MANDATORY_ON_ANY_BREAK_GLASS_PATH_IF_ONE_IS_EVER_AUTHORIZED`

**DESIGN CHOICE.** Deferred, with the deferral bounded by a condition rather than by a date.

Why deferral is safe *for the intended first deployment*, specifically: the first deployment is one account, on one laptop, bound to `127.0.0.1`, with no registration surface, no external identity dependency, and no remote authentication endpoint to attack. The realistic compromise paths are physical device access and local malware — and both defeat a same-device second factor too. What actually mitigates them is device-level encryption plus idle timeout (§5.5) plus revocability (§12, §13), all of which this design requires.

Why the deferral is conditional rather than open-ended: the moment D1 (§26.1) authorizes network exposure or a second user, the premise above is void. The condition is written into the policy value so that "we deferred MFA" cannot later be cited as precedent for shipping a network-exposed deployment without it.

If a second factor is implemented, the constraint from §19 applies: it must not introduce an external dependency. An offline, device-held authenticator factor satisfies this; SMS and email-based factors do not, and are additionally weak.

No MFA code, enrolment flow, secret, or library is designed, named, or authorized here.

---

## 11. Account recovery

Recovery is treated as an authentication bypass surface, because that is what it is: a second path to the same access, usually with weaker proof and less scrutiny than the primary path. A recovery design that is easier to attack than login has not added availability, it has replaced the front door with the back one.

### 11.1 Requirements

**REQUIREMENTs for any future recovery design:**

- **Forgotten / lost credential:** a recovery path exists, but it proves possession of something the user holds, not knowledge of facts about the user.
- **No security questions based on personal facts.** Explicitly forbidden. For KIA Stick's user population this would be doubly bad: the answers are frequently discoverable from the same employment context the tool operates in.
- **Lost MFA factor** (if MFA exists): handled by the same user-held recovery secret, never by an operator override.
- **Lost device:** revocation of that device's sessions (§13) is independent of, and does not require, credential recovery.
- **Account-takeover resistance:** recovery requires proof of possession of a secret issued at account creation and held by the user. It never depends on a channel KIA Stick does not control, and never on an operator's judgment.
- **Rate limiting:** recovery attempts are rate-limited and progressively delayed exactly as authentication attempts are (§15), because an unlimited recovery endpoint is an unlimited authentication endpoint.
- **Operator involvement:** none in the routine path. An operator cannot initiate, approve, or complete a recovery. This is the direct consequence of §9 — a recovery path an operator can drive *is* a silent admin read path, however it is labelled.
- **User notification:** recovery start and completion are recorded as audit events (§16) and surfaced to the user. In a single-user local deployment the "notification" is in-application rather than out-of-band; an out-of-band channel would be an external dependency (§19).
- **Audit:** `RECOVERY_STARTED` / `RECOVERY_COMPLETED`, content-free.
- **Session invalidation after recovery:** **mandatory.** Completing a recovery revokes every existing session for the account (§12), because the premise of recovery is that the prior access state is no longer trusted.

### 11.2 Selection

`RECOVERY_MODEL=USER_HELD_OFFLINE_SINGLE_USE_RECOVERY_SECRET_ISSUED_AT_ACCOUNT_CREATION__NO_OPERATOR_RECOVERY_PATH__NO_EXTERNAL_CHANNEL`

**DESIGN CHOICE.** At account creation the user is issued a high-entropy recovery secret, displayed once, stored by the user outside the application (written down, or in a password manager). It is stored server-side only as a verifier, under the same rules as any other credential (§4.8). Using it authenticates a credential reset, is single-use, and forces issuance of a replacement.

Chosen because it is the only model that satisfies every requirement above without an external channel (§19) and without an operator (§9). Email and SMS reset are excluded on both grounds — they are external dependencies *and* they relocate the real key to a third-party account. Security questions are excluded outright. Operator-mediated reset is excluded because it recreates THREAT-022.

The cost is real and must be stated to the user up front rather than discovered: **if both the credential and the recovery secret are lost, access is not recoverable by anyone, including the operator.** Gate 0A §2 lists Recoverability as an objective in explicit tension with confidentiality and provable deletion, and requires that tension be designed for rather than left implicit. This is that design: KIA Stick chooses confidentiality, discloses the consequence at account creation, and does not hold a hidden bypass.

### 11.3 Encryption dependency

`RECOVERY_ENCRYPTION_DEPENDENCY=yes`

Unresolved until Gate 0C, stated precisely: this section designs recovery of **access** (credential and session state). Whether recovering access also recovers **content** depends entirely on how key material relates to the user credential — a question this document does not touch. Three sub-questions handed to Gate 0C:

1. If content keys derive from the user credential, does a credential reset orphan the content, and does the recovery secret therefore also need to protect key material?
2. Can the recovery secret serve as an alternate key-unwrap path without becoming the master key the governing plan §5 forbids?
3. Is "lost credential" designed to equal "content unrecoverable by design" — Gate 0A §11's lost-key question — and if so, is the user told at account creation?

Gate 0B deliberately does not answer these. Answering them *is* encryption design. The auth-side constraint Gate 0C inherits is: whatever it chooses must not create an operator-usable decryption capability (§9), and must not require an external channel (§19).

---

## 12. Revocation

### 12.1 Fixed requirement

`REVOCATION_REQUIREMENT=DENY_ON_NEXT_PROTECTED_REQUEST` — fixed by Gate 0A, not by this document. Gate 0B selects a mechanism capable of satisfying it and does not restate, reinterpret, or soften it.

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
| Individual device/session revoke | That session only; other sessions unaffected (§13) |
| Revoke all devices | Epoch incremented; every session denied on its next protected request |
| Credential reset / change | Epoch incremented; all sessions revoked, including the one that made the change |
| Recovery completion | Epoch incremented; all sessions revoked (§11.1) |
| Account disable | Epoch incremented; all sessions revoked; subsequent authentication denied (§17) |
| Account closure | Epoch incremented; all sessions revoked permanently (§17) |
| Operator session revocation | No operator principal exists (§9.3), so there is no operator session to revoke. If D2 ever authorizes a break-glass path, its session is independently and immediately revocable, and its expiry is not the revocation mechanism |

---

## 13. Multi-device session model

`MULTI_DEVICE_POLICY=MULTIPLE_CONCURRENT_SESSIONS_ALLOWED__EACH_INDIVIDUALLY_IDENTIFIED_AND_INDIVIDUALLY_REVOCABLE__CONTENT_FREE_SESSION_METADATA`

**DESIGN CHOICE.** Concurrent sessions are permitted.

Why permitted rather than restricted to one: a single-session rule sounds safer and is not. It provides no confidentiality benefit — one stolen session is fully sufficient for an attacker — while creating a pattern where logging in elsewhere silently kills the user's working session, which trains users to treat unexpected logouts as normal. That is the exact signal that should alarm them. It is also wrong on the facts even in the "single-device" deployment: two browsers, or a normal and a private window, on the same laptop are already two sessions.

Requirements where concurrency is allowed:

- **Individual session identity:** each session is a distinct record with its own opaque identifier. No shared or reused identifier.
- **Session list:** the owner can enumerate their own active sessions.
- **Revoke one:** any listed session can be revoked individually, denying its next protected request (§12).
- **Revoke all:** available, epoch-based, and a required control after suspected compromise (§18) and after recovery (§11).
- **Last-used metadata:** coarse and content-free — creation time, last-activity time, a coarse client descriptor. Enough for the owner to recognise a session they do not expect.
- **No private content in session metadata.** REQUIREMENT (§1.3, §16). Session metadata is audit-class data (Gate 0A §3 AUDIT / SECURITY METADATA) and carries no document content, no case facts, no personal identifiers, and no private paths. Precise geolocation and any identifier-shaped value are excluded — a session list is a support surface, not a tracking surface.

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

**REQUIREMENT**, from Gate 0A §15 (`PRIVATE_CONTENT_LOGGING_ALLOWED=no`, absolute, no diagnostic exception). Audit records are themselves data (Gate 0A §3 AUDIT / SECURITY METADATA) and must not become the channel that leaks what the rest of the architecture protects.

The shape below deliberately reuses the append-only label/count/boolean/timestamp convention this repository already uses for its own proof and gate output (`docs/v0.6-future-implementation-gate-draft.md`, "Audit" gate type; governing plan §22), rather than inventing a new one.

### 16.2 Event types

`ACCOUNT_CREATED`, `LOGIN_SUCCEEDED`, `LOGIN_FAILED`, `SESSION_CREATED`, `SESSION_REVOKED`, `LOGOUT`, `RECOVERY_STARTED`, `RECOVERY_COMPLETED`, `MFA_CHANGED`, `ACCESS_DENIED`, `AUTHORIZATION_CHANGED`, `ACCOUNT_DISABLED`, `ACCOUNT_CLOSED`, `ADMIN_BREAK_GLASS_STARTED`, `ADMIN_BREAK_GLASS_ENDED`.

The last two are defined but unreachable in the first architecture, since no admin principal exists (§9.3). They are specified now so that if D2 ever authorizes a break-glass path, the audit obligation is already fixed and cannot be negotiated down at implementation time.

### 16.3 Allowed fields

- Event type, from the closed enumeration above.
- Timestamp.
- Opaque account identifier, opaque workspace identifier, opaque session identifier — references, never content, and never derived from a personal identifier.
- Safe reason or error code from a closed enumeration (e.g. `NO_SESSION`, `SESSION_REVOKED`, `OWNER_MISMATCH`, `ACCOUNT_DISABLED`, `RATE_LIMITED`). Codes, not free text: free text is how private content reaches logs.
- Correlation identifier, tying related events together without carrying content.
- Coarse outcome (`ALLOWED` / `DENIED`) and counts.

### 16.4 Forbidden fields

Passwords, passphrases, recovery secrets, credential verifiers, or any fragment of them; session tokens or any other credential; private document text; OCR output; private prompts or model output; medical, OWCP-like, personnel, employment, or financial facts; real document paths or filenames; case facts; personal identifiers; free-text diagnostic traces over private-data flows; and anything from which private content could be reconstructed.

`ACCESS_DENIED` records *that* a denial happened and its coded reason — never the content the requester was trying to reach.

### 16.5 Retention

Bounded, longer than the underlying data where incident response requires it, but never a route around a user's deletion request (Gate 0A §3 AUDIT / SECURITY METADATA). Exact retention interacts with the retention/deletion gate and is not set here.

---

## 17. Account and workspace lifecycle

Authorization consequences only. Private-data deletion mechanics are reserved for the retention/deletion gate and are deliberately not solved here.

| Stage | Authorization consequence |
|---|---|
| Account creation | Creates exactly one workspace atomically (§4.1). No authenticated-but-workspace-less state, because that is an unknown-owner state and §1.3 requires DENY |
| Workspace creation | Only as part of account creation in the first architecture (§3.3) |
| Account disable | Epoch incremented; all sessions revoked; **every subsequent protected request denied**; subsequent authentication denied. Reversible by re-enable, which does not restore old sessions |
| Account closure | Epoch incremented; all sessions revoked permanently; authentication permanently denied; `ACCOUNT_CLOSED` recorded. Authorization ends at closure regardless of what the deletion pipeline has or has not finished |
| Workspace no longer authorized | Next protected request denied (§12.3). No grace period, no in-flight exception |
| Reactivation | Not designed for a closed account. A disabled account may be re-enabled by the owner via re-authentication (§4.6); a closed account is terminal in this design. Any reactivation-after-closure capability is a separate decision, because it would mean closure did not actually end access |

**Data-deletion dependency, stated separately and not solved here:** what happens to the private *content* of a closed account — across primary, derived, cache, index, export, and backup stores — is the retention/deletion gate's problem (Gate 0A §14, §17; governing plan §17, §18, §20, §21). Gate 0B asserts only the access consequence: **closure ends authorization immediately and unconditionally, and does not wait on deletion to complete.** The converse is also asserted: deletion progress is never a reason to keep authorization alive.

---

## 18. Security event and incident-response handoff

Expected auth-side reactions. No monitoring infrastructure is designed, built, or authorized; this is the handoff to the incident-response gate the governing plan §27 already requires.

| Event | Auth-side reaction |
|---|---|
| Suspected account compromise | Revoke all sessions (epoch increment); require re-authentication; require credential change; audit; notify the owner |
| Stolen session | Revoke that session individually, or all if uncertain; audit; the next protected request is denied (§12.3) |
| Credential leak | Force credential change; revoke all sessions; re-issue the recovery secret; audit |
| Operator misuse | Not reachable in the first architecture (no admin principal, §9.3). If D2 ever authorizes break-glass: immediate revocation of the break-glass session, audit, owner notification, and a review that the path itself survives |
| Repeated `ACCESS_DENIED` anomalies | Rate-limit (§15); record counts and coded reasons; treat sustained cross-workspace denial patterns as a THREAT-001/THREAT-004 signal warranting investigation |
| Recovery abuse | Rate-limit and progressively delay (§11.1, §15); audit `RECOVERY_STARTED` without completion; notify the owner |
| Lost device | Revoke that device's sessions individually (§13) — no credential recovery required; offer revoke-all; audit |

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
| Recovery is a user-held offline secret, no operator path (§11) | Any key-recovery path must be drivable by the user alone, and must not become the master key governing plan §5 forbids | Whether the recovery secret participates in key unwrap at all |
| Credential reset revokes all sessions (§12) | Session revocation must not silently orphan content; the relationship between credential change and key material needs an answer | Whether credential change implies key re-wrap |
| Account closure ends authorization immediately (§17) | Closure must not depend on key destruction, and key destruction must not be assumed to substitute for authorization | Whether cryptographic erasure is used for deletion (Gate 0A §14) |
| Multiple concurrent sessions per account (§13) | Key availability cannot be bound to a single session or device instance | How key material is made available across concurrent sessions |
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
- AUTH_CONTROL: deny-by-default; server-authoritative decisions; two-level enforcement at a single access layer so a new route is unreachable rather than unprotected.
- DESIGN_SECTION: §1.3, §7.1, §7.2, §7.4.
- UNRESOLVED_DEPENDENCY: the actual route surface does not exist yet, so the route audit is future work.
- FUTURE_TEST: unauthenticated access denial on every private route; client-only bypass test; route inventory asserting no private route bypasses the access layer.

**THREAT-003 — session theft / fixation**
- AUTH_CONTROL: opaque high-entropy identifiers; mandatory regeneration on authentication and privilege elevation; `HttpOnly`/`Secure`/`SameSite`; TLS; idle and absolute lifetimes; individually revocable sessions.
- DESIGN_SECTION: §4.4, §5.4, §5.5, §6.1, §6.3, §13.
- UNRESOLVED_DEPENDENCY: TLS termination in a local-first deployment is an operational question (D1); device-level compromise is partly outside application control.
- FUTURE_TEST: session-fixation test (pre-auth identifier is not valid post-auth); logout invalidation; stolen-session revocation.

**THREAT-004 — IDOR**
- AUTH_CONTROL: object-level ownership check on every ID-addressed private resource, independent of the route-level check; identifiers never treated as capabilities.
- DESIGN_SECTION: §7.1, §7.2.
- UNRESOLVED_DEPENDENCY: identifier shape and storage design are future gates.
- FUTURE_TEST: IDOR sweep across the private record ID space using a second synthetic workspace's identifiers.

**THREAT-007 — secrets**
- AUTH_CONTROL: no secret in Git, proof, logs, or notifications; credential verifiers only, never recoverable credentials; forbidden-field list in the audit schema; no signing key introduced, because the opaque-session choice avoids needing one.
- DESIGN_SECTION: §1.3, §4.8, §5.3, §16.4.
- UNRESOLVED_DEPENDENCY: secret storage for any future service credential is Gate 0C / storage-gate territory; `scripts/privacy-scan.mjs` has not been validated against future secret shapes (Gate 0A THREAT-007 `CURRENT_STATE`).
- FUTURE_TEST: secret-scanning extended to auth secret shapes; audit-log leakage test; assertion that no credential material appears in any error path.

**THREAT-020 — stale authorization**
- AUTH_CONTROL: authoritative server-side session state plus account authorization epoch; immediate invalidation; TTL-only models explicitly rejected; no cached ALLOW is authoritative.
- DESIGN_SECTION: §5.2, §5.3, §12.
- UNRESOLVED_DEPENDENCY: none at the design level — this is the requirement the session model was selected to satisfy. Proof is implementation-time.
- FUTURE_TEST: the §12.3 invariant — after accepted revocation, the next protected request is denied — exercised for logout, revoke-one, revoke-all, credential reset, recovery, and disable.

**THREAT-021 — privilege escalation**
- AUTH_CONTROL: single human role; no admin principal to escalate to; fail-closed on ambiguous role or owner state; service principals narrowly scoped with no interactive authentication path.
- DESIGN_SECTION: §3.2, §8.2, §8.3, §1.3.
- UNRESOLVED_DEPENDENCY: if D1 or a later sharing gate introduces a second role, this analysis must be redone — a minimal role model is a control only while it stays minimal.
- FUTURE_TEST: role-escalation attempts; assertion that no request can acquire authority over a workspace it does not own.

**THREAT-022 — operator / admin overreach**
- AUTH_CONTROL: no admin principal, role, route, or session; Model A preferred; break-glass not created; content-free support surface; any future break-glass self-audits or is a FAIL.
- DESIGN_SECTION: §9 (all), §16.2.
- UNRESOLVED_DEPENDENCY: **substantial.** Whether the operator can technically decrypt is Gate 0C's (`DEPENDENCY_ON_ENCRYPTION_GATE=yes`); whether any break-glass path exists is D2. On a single-user laptop the operator is the owner and holds the device, which no application control changes (§9.1).
- FUTURE_TEST: assertion that no admin route or principal exists; break-glass audit test if one is ever authorized; audit-completeness test that operator-adjacent actions cannot be performed without a corresponding event.

**THREAT-023 — export cross-workspace leakage**
- AUTH_CONTROL: export paths workspace-scoped at the query; derived artifacts inherit workspace ownership; exports subject to the same object-level checks as reads.
- DESIGN_SECTION: §7.1, §7.3.
- UNRESOLVED_DEPENDENCY: the private export feature itself is not designed or authorized (governing plan §19); labelling requirements belong to that future gate.
- FUTURE_TEST: export from workspace A contains no workspace B record, against synthetic fixtures.

**THREAT-024 — device loss**
- AUTH_CONTROL: no credential in script-readable browser storage; idle and absolute session lifetimes; individually revocable sessions; revoke-all; recovery independent of the lost device; MFA required before any network-exposed deployment.
- DESIGN_SECTION: §5.5, §6.2, §11.1, §13, §10.2.
- UNRESOLVED_DEPENDENCY: whether any private content is ever cached client-side is a storage-gate decision; device-level encryption is outside application control; Gate 0A rates this residual risk Medium for exactly that reason.
- FUTURE_TEST: lost-device revocation; shared-device/browser behaviour; assertion that no credential persists in browser storage.

`THREAT_TRACEABILITY_COMPLETE=yes` — in the sense that every threat named by the mission is traced with an unresolved-dependency column and a future test. Not in the sense that any of them is closed.

---

## 22. Future auth security validation plan

Tests a future implementation would have to pass. **None is performed now.** All use fake/synthetic identities and data only; no real users, no real member data, no real documents. This extends Gate 0A §18 on the auth axis rather than duplicating it.

1. **Unauthenticated access denial** — every private route denies with no session.
2. **Cross-user access** — synthetic workspace B cannot read, list, search, export, or delete workspace A's records (THREAT-001; governing plan §29).
3. **IDOR** — direct object addressing with another workspace's identifiers is denied on every ID-addressed private path (THREAT-004).
4. **Client-only bypass** — every UI-hidden private action is denied server-side when the UI is bypassed (§7.4).
5. **Session fixation** — a pre-authentication identifier is invalid after authentication (THREAT-003).
6. **Session theft assumptions** — a captured identifier stops working after revocation, idle timeout, and absolute expiry.
7. **Logout invalidation** — the next protected request after logout is denied server-side, not merely client-cleared.
8. **Next-request revocation** — the §12.3 invariant, for logout, revoke-one, revoke-all, credential reset, recovery, disable, and closure (THREAT-020).
9. **Individual-session revoke** — revoking one session leaves others working.
10. **All-session revoke** — epoch increment denies every session on its next protected request.
11. **Disabled-account denial** — a disabled account's protected requests and authentication attempts are both denied.
12. **Recovery abuse** — recovery is rate-limited, progressively delayed, single-use, and revokes all sessions on completion.
13. **Credential stuffing / rate limit** — progressive delay engages; no permanent lockout; limiter-unavailable fails closed.
14. **CSRF** — every private state-changing endpoint rejects a forged cross-site request, with the check not relying solely on cookie presence.
15. **Cross-origin requests** — private APIs deny cross-origin access; no permissive reflection, no wildcard, no credentialed cross-origin.
16. **Role escalation** — no request acquires authority beyond its own workspace (THREAT-021).
17. **Admin/operator access** — assert no admin principal, role, route, or session exists (THREAT-022).
18. **Break-glass audit** — if and only if D2 ever authorizes one: it cannot be used without emitting start and end events, and the events cannot be suppressed by the principal using it.
19. **Auth audit log leakage** — no audit event contains any §16.4 forbidden field, under normal, error, and crash conditions, with no diagnostic path reintroducing it (Gate 0A §15).
20. **Secret leakage** — no credential, verifier, recovery secret, or session identifier appears in Git, proof output, logs, notifications, error messages, or stack traces (THREAT-007).
21. **Shared-device / browser behaviour** — a second browser profile or private window on the same machine gets no access; no credential persists in browser storage (§6.2).
22. **Lost device** — that device's sessions are revocable individually without credential recovery (THREAT-024).
23. **Account closure** — authorization ends immediately and does not wait on deletion; closure is terminal for authentication (§17).

No destructive testing, no real-data testing, and no production testing is authorized by this list.

---

## 23. Implementation blockers

Until every required item is resolved and separately accepted, implementation remains unauthorized.

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
- [ ] `OWNER_DECISION_D3` resolved (§26.3) — recovery loss posture.

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

1. Independent QA of the exact Gate 0B design commit and its sealed proof.
2. Operator review, including the three owner decisions in §26.
3. Gate 0B terminal closeout.
4. Only after that, a separate owner decision about whether to authorize Gate 0C encryption design — or neither.

This document does **not** author the encryption-design document, does not start it, and does not chain into it. One gate at a time, per the discipline in `docs/v0.6-future-implementation-gate-draft.md` and the governing plan's approval sequence.

`SENSITIVE_DATA_GATE_0B_AUTH_DESIGN_ACCEPTED=no`

---

## 26. Unresolved owner decisions

`OWNER_DECISION_REQUIRED=yes`

Three decisions. Each is bounded, each has a recommendation, and none blocks review of the rest of this design. They are surfaced rather than guessed because guessing any of them would produce false certainty about a security posture.

### 26.1 D1 — deployment reach

DECISION= Is the first private-data deployment permanently single-user and single-device, or is network exposure / a second user an intended future state?

OPTIONS=
(a) Permanently local, single-user, single-device, loopback-only.
(b) Local first, with network exposure or a second user as an accepted future intent.
(c) Multi-user from the start.

TRADEOFFS= (a) permits the deferrals this document takes — MFA deferral (§10), in-application-only notification (§18), simplest operator posture (§9) — and matches every deployment fact in the repo. (b) keeps those deferrals for now but makes each one conditional and requires the conditions to be honoured later; it is what §2.3's architecture is actually built for. (c) makes MFA, identity verification, TLS termination, and a real operator model immediately mandatory, and makes Gate 0C substantially harder. The repo's deployment evidence points at (a) while its data-model evidence (governing plan §1, §29) points at (b).

RECOMMENDATION= (b). Build the multi-workspace-correct architecture described here, deploy it in the single-device shape, and treat MFA and the rest as conditions that trigger on exposure rather than as things permanently waived.

WHY_OPERATOR_INPUT_IS_REQUIRED= This is a product-scope decision, not a technical one. The repository contains genuine evidence for both readings (§2.1) and no evidence that settles the owner's intent. It changes MFA policy, TLS operational requirements, identity verification, and the operator model — and a wrong assumption here is the kind that gets discovered after private data already exists.

### 26.2 D2 — break-glass operator access

DECISION= Should any operator break-glass path to private content exist at all?

OPTIONS=
(a) None ever — operator access to private content is architecturally impossible (Gate 0A Model A).
(b) Break-glass with mandatory approval, time-boxing, user notification, and unsuppressable audit (Model B).
(c) Ordinary administrative read — **already refused** (§9.2), contradicts governing plan §26.

TRADEOFFS= (a) is the strongest privacy guarantee and the best answer to THREAT-022, at the cost that no support path can ever recover a user's content; combined with §11 it means lost credential plus lost recovery secret equals permanent loss. (b) preserves a recovery-of-last-resort but creates the exact access path THREAT-022 is about, and on a solo-operator product the approver and the requester are the same person — the procedural control is largely self-approved (§9.2).

RECOMMENDATION= (a). It is the default this document already implements by defining no admin principal, and it is strictly safer. Choosing (b) later is possible; unchoosing it after private data exists is not.

WHY_OPERATOR_INPUT_IS_REQUIRED= It is a risk-acceptance decision with a real cost to the owner's own future support ability, and it interacts directly with Gate 0C key design (§20). The owner must decide knowingly, not inherit it as a side effect of an auth-design default.

### 26.3 D3 — recovery loss posture

DECISION= Is "lost credential plus lost recovery secret equals permanently unrecoverable content" an accepted product behaviour?

OPTIONS=
(a) Yes — accepted and disclosed to the user at account creation.
(b) No — a further recovery mechanism is required, which necessarily means either an external channel (contradicting §19) or an operator-usable capability (contradicting §9 and D2(a)).

TRADEOFFS= (a) is the only option consistent with `EXTERNAL_IDENTITY_DEPENDENCY=none` and with no operator content access; its cost is a real, permanent data-loss mode for a user who loses both secrets. (b) restores recoverability by reintroducing precisely the dependency or the access path that the rest of this design excludes — it is not a free improvement, and Gate 0A §2 flags this exact tension between Recoverability and Confidentiality as something that must be designed for explicitly.

RECOMMENDATION= (a), with the consequence stated plainly at account creation rather than buried — the user should learn this when they are issued the recovery secret, not when they need it.

WHY_OPERATOR_INPUT_IS_REQUIRED= This is a user-facing product-risk acceptance affecting real people's case material. It also constrains Gate 0C (§11.3, §20): if the owner chooses (b), the encryption design must accommodate an alternate unwrap path, which is a materially different key design.

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

SENSITIVE_DATA_GATE_0B_AUTH_DESIGN_ACCEPTED=no

The next step is independent QA of the exact commit introducing this document, followed by operator review of §26's three decisions, and then a separate owner authorization decision about whether any later gate begins.
