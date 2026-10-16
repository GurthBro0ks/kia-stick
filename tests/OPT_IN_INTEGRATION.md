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

Not every guard is isolated without mocks. Length guards cannot be isolated
without a hash mock: VALIDATE checks the hash first, so a wrong-length PDF is
rejected before the length guard is reached; LIVE checks length first, but if
that guard is removed the hash guard still rejects. VALIDATE hash isolation
needs real bytes in the opt-in suite or the unit mock. LIVE hash isolation is
covered by the default real-crypto suite. The LIVE tamper test is an explicit
one-byte example that overlaps the LIVE hash test.

Separate production issue: the phase runner does not stop on failure. After a
failed step it still runs all remaining validation steps and only skips
commit/push. These test and documentation changes do not fix this.

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
