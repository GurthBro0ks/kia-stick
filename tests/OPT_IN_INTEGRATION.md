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

If the variable is unset or empty, the suite is skipped and prints `NOT_RUN`.
A skipped run is not a PASS.
A supplied but unusable path fails an explicit prerequisite test. Unsafe
permissions fail the real-cache suite's explicit permission test.

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
