# Opt-in integration tests

`KIA_REAL_PUBLIC_DATA_DIR` must be an absolute path to a directory named
`.kia-public-data` containing these four files:

- `apwu-usps-jcim-2025.json`
- `apwu-usps-jcim-2025.pdf`
- `apwu-usps-cba-2024-2027.json`
- `apwu-usps-cba-2024-2027.pdf`

The directory must have mode 0700 and the files mode 0600, all owned by the
running user. Symlinks (directory or any file) fail the permission check.
Tests only read the cache. Point the variable at a temporary copy with these
permissions, not the original cache directory, which may not meet the rules.

```sh
KIA_REAL_PUBLIC_DATA_DIR=/abs/.kia-public-data ./node_modules/.bin/vitest run tests/jcimSource.realCache.integration.test.ts tests/publicSourceSufficiencyMatrixV2.test.ts
```

If the variable is unset or empty, each opt-in suite is skipped and prints `NOT_RUN`.
A skipped run is not a PASS.
A supplied but unusable path fails the top-level test
"opt-in prerequisite: KIA_REAL_PUBLIC_DATA_DIR supplied but unusable".
A supplied cache with unsafe permissions (for example, directory 0755, a file
0644, a symlink, or wrong owner) fails the top-level test
"opt-in prerequisite: supplied cache has safe permissions (dir 0700, files 0600, owned by current uid)"
in each opt-in file. The opt-in suites themselves are skipped; they do not run
on an unsafe cache. With a safe cache, the same permission test passes and the
opt-in suites run. Both opt-in files enforce these rules.

scripts/phase-runner.mjs never sets KIA_REAL_PUBLIC_DATA_DIR (verified by reading it). Its child steps inherit the caller's environment unchanged ({...process.env}), so the opt-in suites run under the runner only if the operator exported the variable beforehand.

For real npm phase-runner integration, set `KIA_PHASE_RUNNER_REAL_NPM=1`:

```sh
KIA_PHASE_RUNNER_REAL_NPM=1 ./node_modules/.bin/vitest run tests/phaseRunner.test.ts
```

This requires npm on PATH and is slower (about 4 seconds per test). If
`KIA_PHASE_RUNNER_REAL_NPM` is unset, the real-npm tests are skipped and print
`NOT_RUN`. A skipped run is not a PASS.

## Guard coverage

| Test label / case | Guard reached | Evidence | Mutation isolation |
| --- | --- | --- | --- |
| real-crypto LIVE hash guard | LIVE hash | Default suite, real crypto on synthetic bytes at pinned length | Isolated: removing LIVE hash kills test |
| real-crypto LIVE length guard reached, not isolated | LIVE length | Default suite, real crypto; length rejects before the hash check runs | Not isolated: without the length guard, the hash guard would still reject |
| real-crypto LIVE hash guard, one-byte tamper | LIVE hash | Default suite, real crypto on synthetic bytes | Overlaps LIVE hash test; no extra guard isolation |
| real-crypto LIVE header guard / LIVE-CONTENT-TYPE sanity | LIVE content-type header | Default suite, real crypto; body unread | Header rejection checked; no broader isolation claim |
| unit-mocked VALIDATE length guard isolated | VALIDATE length | Unit suite with pinned hash mock | Isolated only because the hash mock returns the pinned hash, so the hash guard passes |
| unit-mocked LIVE length guard isolated | LIVE length | Unit suite with pinned hash mock | Isolated only because the hash mock returns the pinned hash, so the hash guard passes |
| synthetic pinned-hash admission units, changed PDF | VALIDATE hash | Unit suite, controlled hash mock | Isolated with mock |
| real-bytes VALIDATE hash guard | VALIDATE hash | Opt-in, real bytes and crypto; reversed PDF | Isolated |
| real-bytes VALIDATE+LIVE hash guard, one-byte tamper | VALIDATE and LIVE hash | Opt-in, real bytes and crypto | Isolates hash guards; overlaps other hash cases |
| real-bytes appended byte | VALIDATE hash; LIVE length | Opt-in, real bytes and crypto; VALIDATE checks hash first, LIVE checks length first | Neither length guard isolated (VALIDATE length not reached; LIVE length backed by LIVE hash) |
| seam M1 VALIDATE_HASH isolated | VALIDATE hash | Default suite, real crypto; alternate pins + same-length tamper | Isolated unmocked: removing hash guard would accept |
| seam M2 VALIDATE_LENGTH isolated | VALIDATE length | Default suite, real crypto; alternate pins with matching hash, wrong length | Isolated unmocked: removing length guard would accept |
| seam M3 LIVE_LENGTH isolated | LIVE length | Default suite, real crypto; alternate pins + short body, header length = pin | Isolated unmocked: removing live length guard would accept |
| seam production hard gate | VALIDATE+LIVE pins | Default suite; defaults/`NODE_ENV` cannot skip JCIM pins | N/A (gate, not mutant) |

Production PDF identity is centralized in `matchesJcimPdfIdentity` /
`JCIM_PDF_IDENTITY_PINS` (`lib/jcimSourceServer.ts`). Callers default to the
real `JCIM_SHA256` + `JCIM_BYTES` pins; there is no env/`NODE_ENV` skip.
Unmocked seam tests under `tests/jcimSource.test.ts` isolate M1–M3 by passing
alternate pins (real hash of synthetic bytes) so length and hash fail
independently. Opt-in real-byte tests and unit-mocked length tests remain.
The LIVE tamper test remains an explicit one-byte example overlapping LIVE hash.

Phase-runner validation now stops after the first failed step (see
`scripts/phase-runner.mjs` and `tests/phaseRunner.test.ts` on this branch tip).
Post-validation git trail steps still run; commit/push remain skipped on failure.

## Condition D — pre-release / merge checklist

Operators and Reviewers cite this section before release or merge when
source-handling work is in scope. Rules above for `KIA_REAL_PUBLIC_DATA_DIR`
permissions, NOT_RUN semantics, and the example vitest command are authoritative;
this checklist does not invent additional gates.

Trigger: source-handling code under `lib/*Source*.ts`, `lib/*SourceServer.ts`,
citation integrity, or routing changes, **or** source test fixtures change.

- [ ] **D1 — Opt-in real-cache suites.** Before any release/merge under the
  trigger above, run the opt-in real-cache suites against an **authorized safe
  copy** of the public cache (never chmod the served cache without a separate
  GO). Export `KIA_REAL_PUBLIC_DATA_DIR` to an absolute path whose basename is
  `.kia-public-data`, with dir mode **0700**, files mode **0600**, owned by the
  running user (no symlinks), matching `readJcimCache` / the permission rules in
  this document. Example:

  ```sh
  KIA_REAL_PUBLIC_DATA_DIR=/abs/.kia-public-data ./node_modules/.bin/vitest run \
    tests/jcimSource.realCache.integration.test.ts \
    tests/publicSourceSufficiencyMatrixV2.test.ts
  ```

- [ ] **D2 — Record identities and results separately.** Confirm cache dir/file
  modes beforehand. Record source identities as already practiced (JCIM PDF
  sha256 / bytes / last-modified, normalized sha256; CBA PDF sha256) and the
  opt-in pass/fail counts **separately** from default-suite counts.

- [ ] **D3 — NOT_RUN vs FAIL prerequisite.** Unset/empty `KIA_REAL_PUBLIC_DATA_DIR`
  → report **NOT_RUN** (skipped opt-in; not a PASS). Supplied but unusable or
  unsafe cache → **FAIL** the opt-in prerequisite tests (not PASS, not NOT_RUN),
  with the printed reason. Never substitute synthetic/default-suite results for
  opt-in real-cache coverage.

- [ ] **D4 — Phase-runner does not set the real-cache env.**
  `scripts/phase-runner.mjs` never sets `KIA_REAL_PUBLIC_DATA_DIR`. Step
  `05b_real_public_cache` runs immediately after `05_test`. Unset or empty:
  that step's log is `NOT_RUN`, the step passes, and Vitest is not launched.
  A set value is inherited unchanged and the step runs
  `./node_modules/.bin/vitest run tests/jcimSource.realCache.integration.test.ts tests/publicSourceSufficiencyMatrixV2.test.ts`.
  A nonzero exit fails validation and stops later validation steps. Children
  only inherit an operator-exported value. Opt-in under the runner requires
  the operator to export it beforehand (see above).

- [ ] **D5 — Real-npm opt-in is separate.** Phase-runner real-npm coverage uses
  `KIA_PHASE_RUNNER_REAL_NPM=1` and is independent of Condition D real-cache
  runs. Unset real-npm remains NOT_RUN and is not a PASS.

Origin: formalized from hermetic-4 Note 2 / PR-packet Condition D references into
this in-repo checklist so release/merge reviews can cite `tests/OPT_IN_INTEGRATION.md`
rather than evidence-only markdown.

## Local proof root (opt-in)

Some checkpoint tests read the laptop-only local proof root. `tests/helpers/localProofRoot.ts` resolves it from
`KIA_LOCAL_PROOF_ROOT`, default `/home/mint/kia-stick-local-proofs`, and only checks that the root exists (read-only;
it never checks specific proof subdirectories, so a missing proof inside an opted-in root fails instead of skipping).

Gated files (only the tests that use the proof root are gated; doc-text and `feature_list.json` assertions still run):

- `tests/v0966AcceptedPushedProofCloseoutDiscoveryCheckpoint.test.ts` (closeout-helper test only)
- `tests/v1161ProofIndexCloseoutHelperPostPushFreshnessGuard.test.ts` (persistent-root proof-index test only)
- `tests/v1166ProofIndexCloseoutHelperPostPushFreshnessGuard.test.ts` (persistent-root proof-index test only)
- `tests/v1171ProofIndexCloseoutHelperPostPushFreshnessGuard.test.ts` (persistent-root proof-index test only)
- `tests/v1176ProofIndexCloseoutHelperPostPushFreshnessGuard.test.ts` (persistent-root proof-index test only)

When the root is absent, each gated test is skipped and its name ends with
`[NOT_RUN: local proof root <root> not present; set KIA_LOCAL_PROOF_ROOT to opt in]`.
A skipped run is not a PASS. CI and the box skip these tests; the laptop with the real proofs runs them.

```sh
KIA_LOCAL_PROOF_ROOT=/home/mint/kia-stick-local-proofs ./node_modules/.bin/vitest run tests/v0966AcceptedPushedProofCloseoutDiscoveryCheckpoint.test.ts tests/v11{61,66,71,76}ProofIndexCloseoutHelperPostPushFreshnessGuard.test.ts
```

Expected values from `tests/helpers/currentAcceptedState.ts` still name the recorded `/home/mint/...` proof paths, so the
gated tests fully pass only when the proofs live at the default root.
