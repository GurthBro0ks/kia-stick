# Post-binding proof

Executed checkout: `186fcf2ec5d8747df9703a99085563b6dadbde03`

That checkout is the adapter source that doctor, the journey, conformance, the Node refusals, and the PATH decoy ran against. This directory was written afterward. The commit that adds these files is a later head. Do not treat that later head as the checkout where the run happened.

Preserved earlier heads, not re-run here:

- Pre-binding proof checkout `fda12d2202da930bde1fb1a76e10c5d07c32209e`
- Pre-binding packet head `3f0ac5bb7499ef24366460e14e7796886ba567df`

Adapter `kia-stick` `0.2.0`. Identity, including the manifest hash and the changed-file hashes, is in `identity.json` and `changed-files.json`. The command argv and the Python `runtime_files` pin are the same canonical file. The hook execs only the bound Node. It does not search for candidates and it has no fallback.

| Check | Result |
| --- | --- |
| doctor | exit 0, reason `ready` (`doctor.json`) |
| drive | exit 0, reason `completed`, 1 passed (`drive.json`) |
| check | exit 0, reason `completed`, 1 passed (`check.json`) |
| evidence after drive and check | `evidence.json` |
| cleanup | exit 0, reason `scratch-removed`; work absent (`cleanup.json`) |
| evidence after cleanup | drive, check, cleanup (`evidence-after-cleanup.json`) |
| executed runtime | bound Node hash, `v22.23.4` (`runtime.json`) |
| conformance | 17 of 17, `live_acceptance` false (`conformance.json`, full records in `conformance-report.json`) |
| missing bound Node | doctor exit 3, `runtime-file-mismatch`, runs directory not created (`missing-node.json`) |
| changed bound Node | doctor exit 3, `runtime-file-mismatch`, runs directory not created (`changed-node.json`) |
| PATH decoy | first `node` was the decoy; executed hash and version matched the bound Node (`decoy.json`) |
| tampered fixture hash | doctor exit 3, `adapter-file-mismatch`, runs directory not created (`fixture-hash-tamper.json`, `fixture-hash-tamper.exit`) |
| wrong expected answer | drive exit 0; check exit 4, `adapter-failed`, child exit 8; cleanup exit 0, `scratch-removed` (`wrong-answer-drive.json`, `wrong-answer-check.json`, `wrong-answer-evidence.json`, `wrong-answer-evidence-after-cleanup.json`, `wrong-answer-cleanup.json`, and the matching `.exit` files) |

The tampered-fixture and wrong-answer cases ran at head `88d85492fc0e6c817b81d2c701230a43290489d5`. The declared hash for `fixtures/annual-leave-question.json` had one hex digit flipped, and the fixture bytes stayed as committed. Doctor refused that manifest before a command ran. The wrong-answer task `pilot-bind-wrong-001` drove the real governor, then the saved `shortAnswerSha256` was replaced with 64 zero hex digits. Check reran the governor and refused the mismatch. Evidence after cleanup keeps drive `completed`, check `adapter-failed`, and cleanup `scratch-removed`.

`forced-failure-records.json` is the actual pre-binding `pilot-fail` record objects (adapter `0.1.0`, target `fda12d22`). The identity wrapper is omitted because its runtime key was a path. The `wrong-answer-*` files are the separate `0.2.0` run.

The journey is synthetic module-level proof of `buildAnswer`. It is not browser or live acceptance.

v1.0.3 hashes the runtime files an adapter declares. It does not prove that every program a trusted hook could launch was one of those files. The decoy result is evidence about this hook.

Paths in this directory are roles plus hashes. Unchanged pre-binding proof files were not rewritten.
