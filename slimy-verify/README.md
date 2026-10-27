# KIA Stick slimy-verify adapter (pilot)

This is a thin adapter for the shared `slimy-verify` controller, contract `1.0.0`, core tag `v1.0.3`. It runs one synthetic KIA Stick journey. It does not accept the product, grant a live run, or replace harness proof.

The controller is not in this repo. Do not copy `verify.py` or the rest of the core here. If the controller looks wrong, report it. Do not patch it from this checkout.

## What the journey does

`hooks/journey.py` loads the real `buildAnswer` function from `lib/answerGovernor.ts` with Node 22 and asks one made-up fake-corpus question:

`Can annual leave be denied after I submitted inside the fake window?`

Options are Strict Research, All Fake, and Detailed. The expected intent, fake citation ids, and short-answer SHA-256 are in `fixtures/annual-leave-question.json`. `drive` runs that call and stores the projection in task scratch. `check` runs it again and requires the same projection. Counts go to `work/result.json`. The full answer text is not written into evidence.

Proof kind is `synthetic`. `live` is not supported.

## Fetch the core

Use the owner-provided interface bundle `slimy-verify-v1.0.3.bundle`. Clone it outside this repo:

```bash
git clone /path/to/slimy-verify-v1.0.3.bundle /path/to/slimy-verify-core
git -C /path/to/slimy-verify-core checkout v1.0.3
git -C /path/to/slimy-verify-core rev-parse 'v1.0.3^{commit}'
```

The last command must print:

`9e4b475c03ee74ace2fc9e0dc4485e1823a402c4`

Run the controller from that checkout so its `HEAD` and tag stay on that commit. Do not publish this pilot to the slimy-verify repo.

## Prepare the local binding

The committed hook and fixture have no machine paths. Preparation resolves two approved aliases, `python3` and `node`, to canonical regular files and writes the gitignored files `slimy-verify/adapter.json` and `slimy-verify/binding.json`.

```bash
python3 slimy-verify/prepare.py
```

Run that again after the hook, fixture, or either binary changes. Do not commit the generated files. A missing alias fails preparation and does not write a usable manifest.

The manifest pins both canonical files in `runtime_files` and pins `binding.json` in `adapter_files`. Doctor checks those hashes before it runs a command. The hook reads the binding and execs that Node path. It does not search `PATH` and it has no fallback binary.

v1.0.3 checks the files you declare. It does not prove that trusted adapter code executed only those files. This hook is written to exec the bound Node, and the PATH-decoy proof checks that behavior. A different hook could still call another program without doctor noticing, as long as the declared files stayed in place.

The command argv uses the canonical Python file. The `python3` symlink spelling can be a command, and doctor accepts it; the symlink spelling cannot be a `runtime_files` key. Preparation follows the alias and pins the real file.

## Run

From this repo, with `<core>` set to that checkout and `<runs>` set to a task directory that is not inside this repo or the core. Use a new task id after regenerating the binding. Keep the previous manifest if an older task still needs cleanup.

```bash
python3 <core>/verify.py doctor --adapter slimy-verify/adapter.json --target "$PWD"
python3 <core>/verify.py drive --adapter slimy-verify/adapter.json --target "$PWD" --runs <runs> --task pilot-bind-001
python3 <core>/verify.py check --adapter slimy-verify/adapter.json --target "$PWD" --runs <runs> --task pilot-bind-001
python3 <core>/verify.py evidence --adapter slimy-verify/adapter.json --target "$PWD" --runs <runs> --task pilot-bind-001
python3 <core>/verify.py cleanup --adapter slimy-verify/adapter.json --target "$PWD" --runs <runs> --task pilot-bind-001
```

Add `--dry-run` to any verb to skip side effects. `doctor` is always read-only. `cleanup` deletes scratch and keeps evidence.

Conformance, against this adapter:

```bash
python3 <core>/conformance.py --adapter slimy-verify/adapter.json --target "$PWD" --evidence /path/to/conformance-report.json
```

Exit codes follow the controller: `0` success, `2` bad usage, `3` not ready, `4` adapter or check failure, `5` timeout, `6` ownership or safety refusal, `7` internal error. A missing or changed bound Node fails doctor with code `3` and reason `runtime-file-mismatch`.

## Pins

| Pin | Value |
| --- | --- |
| Contract | `1.0.0` |
| Core | tag `v1.0.3`, commit `9e4b475c03ee74ace2fc9e0dc4485e1823a402c4` |
| Product baseline | `25177e0d6f9bec4c00494f782359067bb1fd6b81` |
| Adapter | `kia-stick` `0.2.0` |
| Local runtimes | hashes written by `prepare.py` for the canonical Python and Node files |

`required` lists the product files this journey reads. They must match the baseline blobs exactly. A later checkout may contain this adapter; its real `HEAD` is recorded, and it must still descend from the baseline.

`adapter_files` hashes `hooks/journey.py`, the fixture, and `binding.json`. Doctor checks those hashes without running the journey. Commands are argv arrays. The only substitutions are `{target}` and `{work}`. There is no shell. The controller sets `PATH` to `/usr/bin:/bin` and drops inherited environment variables. Do not widen that `PATH`. Do not pin symlink paths.

## Verbs the adapter does not implement

`doctor`, `evidence`, and `cleanup` are controller verbs. The manifest schema allows only `commands.drive` and `commands.check`. Do not add the other verbs to the manifest.

## Limits

- Synthetic data and a dev checkout only. No production writes, private documents, or outbound messages.
- No new package is required. Preparation binds the Python and Node 22 executables already on the machine. The journey does not install anything and does not read `.env` files.
- `node_modules` cannot be listed in `required`, because those files are not baseline git blobs. This journey does not start Next or the browser.
- The answer object includes a timestamp. The hook compares a stable projection, not that timestamp.
- Evidence stores counts, exit codes, and the version pins. It does not store the answer text.
- A passing run is not live acceptance and is not product acceptance.

Saved pilot outputs are under `slimy-verify/proof/`.
