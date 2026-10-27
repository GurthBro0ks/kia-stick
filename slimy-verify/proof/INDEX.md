# Pilot proof index

Current proof is `binding/` for adapter `kia-stick` `0.2.0`. It supersedes the earlier pre-binding `0.1.0` records in this directory. Those earlier records are kept for history.

## Pre-binding history (adapter 0.1.0)

Core `v1.0.3` commit `9e4b475c03ee74ace2fc9e0dc4485e1823a402c4`. Adapter `kia-stick` `0.1.0`. Product baseline `25177e0d6f9bec4c00494f782359067bb1fd6b81`. Checkout at run time `fda12d2202da930bde1fb1a76e10c5d07c32209e`. Proof kind `synthetic`. Live acceptance is false.

Each `*.json` file is the controller's stdout. The matching `*.exit` file is the process exit code.

| Check | Result | Artifacts |
| --- | --- | --- |
| doctor | exit 0, reason `ready` | `doctor.json`, `doctor.exit` |
| drive | exit 0, reason `completed`, 1 passed | `drive.json`, `drive.exit` |
| check | exit 0, reason `completed`, 1 passed | `check.json`, `check.exit` |
| evidence | exit 0, drive then check | `evidence.json`, `evidence.exit` |
| cleanup | exit 0, reason `scratch-removed` | `cleanup.json`, `cleanup.exit` |
| evidence after cleanup | drive, check, and cleanup kept | `evidence-after-cleanup.json` |
| dry-run of all five verbs | exit 0, runs directory not created | `dry-run/` |
| conformance | 17 passed of 17 | `conformance.json`, `conformance-report.json` |
| forced check failure | exit 4, `adapter-failed`, child exit 8, scratch removed, cleanup exit 0 | `failure/` |

Versions are in the `identity` object of `evidence-after-cleanup.json`: core `v1.0.3` / `9e4b475c03ee74ace2fc9e0dc4485e1823a402c4`, adapter `0.1.0`, target baseline `25177e0d6f9bec4c00494f782359067bb1fd6b81`, target head `fda12d2202da930bde1fb1a76e10c5d07c32209e`.

`doctor --dry-run` stays read-only. The controller reports `reason: ready` and `dry_run: true` for doctor, because doctor returns before the other verbs rewrite the reason to `dry-run`. The runs directory was absent before and after every dry-run.

The bounded journey has no browser step, so there is no screenshot. The chat screen calls the same `buildAnswer` function, but this pilot does not start the web server.

No install was added. The interpreter pin inside the JSON is the contract's absolute runtime file.
