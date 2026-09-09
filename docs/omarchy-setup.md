# Working on Omarchy

The active checkout on this laptop is `/home/slimy/projects/kia-stick`.
GitHub is `https://github.com/GurthBro0ks/kia-stick`.
The shared volume mounts at `/run/media/slimy/SHARED`.
The application uses its repository-local caches; the shared volume is not needed to run it.

```bash
cd /home/slimy/projects/kia-stick
source ./init.sh
npm ci --no-audit --no-fund
npm run dev
```

Open `http://127.0.0.1:3000`. Node and npm are provided by the installed mise environment.
Use `npm ci` to retain the committed dependency versions when rebuilding the environment.
The existing ignored `.kia-public-data` cache was copied from the Mint import, including
the NLRB JSON and the public APWU-USPS CBA JSON/PDF. No source refresh is needed.

## Evidence paths

New QA, phase-runner, and proof-index output defaults to
`${XDG_STATE_HOME:-$HOME/.local/state}/kia-stick/proofs`.
On this laptop this is `/home/slimy/.local/state/kia-stick/proofs`.
The historical proof collection was copied there from the migration archive.

```bash
npm run qa
npm run proof:list
npm run proof:index -- write
npm run closeout:summary
```

`PROOF_DIR` still selects the exact QA output directory. `KIA_PROOF_ROOT` selects the
QA/proof-list/closeout root; `KIA_PHASE_RUNNER_PROOF_ROOT` overrides phase-runner output.
The local proof index takes `--root`. Existing proof safety checks still apply.
Set an absolute `XDG_STATE_HOME` before running these tools to relocate all default paths.

Old `/home/mint/kia-stick-local-proofs/...` references are translated to the current
proof directory when the tools locate evidence. Historical documents, timestamps,
commit IDs, and accepted-state records retain their original contents.

## Migration provenance

- Original checkout: `/home/slimy/Work/_mint-import/20260829T154703Z/kia-stick`.
- GitHub `main` at setup: `a4a3ec849830b71c060803a1bc705acf6ced45d2`.
- Preserved local commit: `9b0fda9f562fb7e632e571e6299eb2dcc77b7b1e` (source citation integrity hardening).
- Migration branch: `omarchy-path-setup`; the original checkout remains intact.
- Archived proof source: `/home/slimy/Documents/MigrationArchive/mint/20260829T154703Z/projects/kia/kia-stick-local-proofs`.

Private document storage remains outside this setup. The existing shared-drive boundary
applies to both Mint and Omarchy mount paths. No GitHub push or operator acceptance is
part of this migration.
