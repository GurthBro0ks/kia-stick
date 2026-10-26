#!/usr/bin/env python3
"""Write the local slimy-verify manifest and runtime binding.

Resolves the approved aliases ``python3`` and ``node`` once, follows each
alias to its canonical file, and records those files. The hook later execs
the bound Node path directly. This script does not scan the filesystem and
does not run during doctor, drive, or check.

Outputs are gitignored because they contain machine paths:
``slimy-verify/adapter.json`` and ``slimy-verify/binding.json``.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
APPROVED_ALIASES = ("python3", "node")
CORE_COMMIT = "9e4b475c03ee74ace2fc9e0dc4485e1823a402c4"
TARGET_COMMIT = "25177e0d6f9bec4c00494f782359067bb1fd6b81"
REQUIRED = [
    "data/current-accepted-pushed-state.json",
    "data/fake-corpus.json",
    "lib/acceptedState.ts",
    "lib/answerGovernor.ts",
    "lib/sourceModel.ts",
    "lib/version.ts",
    "package.json",
]
ADAPTER_PATHS = [
    "binding.json",
    "fixtures/annual-leave-question.json",
    "hooks/journey.py",
]


def fail(message):
    print(message, file=sys.stderr)
    raise SystemExit(3)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_alias(name):
    found = shutil.which(name)
    if not found:
        fail(f"approved alias missing: {name}")
    candidate = Path(found).resolve()
    if candidate.is_symlink() or not candidate.is_file() or not os.access(candidate, os.X_OK):
        fail(f"approved alias {name} does not resolve to a regular executable")
    for parent in candidate.parents:
        if parent.is_symlink():
            fail(f"approved alias {name} resolves through a symlink directory")
    return candidate


def node_version(path):
    completed = subprocess.run(
        [str(path), "-p", "process.version"],
        capture_output=True,
        text=True,
        timeout=10,
        check=False,
        env={"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"},
    )
    version = completed.stdout.strip()
    if completed.returncode != 0 or not version.startswith("v22."):
        fail("approved node alias is not Node 22")
    return version


def write(path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main():
    if tuple(APPROVED_ALIASES) != ("python3", "node"):
        fail("approved alias list changed")
    python_path = canonical_alias("python3")
    node_path = canonical_alias("node")
    version = node_version(node_path)
    binding = {
        "node": {"path": str(node_path), "sha256": digest(node_path), "version": version},
        "python": {"path": str(python_path), "sha256": digest(python_path)},
    }
    binding_path = ROOT / "binding.json"
    write(binding_path, binding)
    adapter_files = {relative: digest(ROOT / relative) for relative in ADAPTER_PATHS}
    manifest = {
        "adapter_files": adapter_files,
        "commands": {
            "check": [str(python_path), "{target}/slimy-verify/hooks/journey.py", "check", "{target}", "{work}"],
            "drive": [str(python_path), "{target}/slimy-verify/hooks/journey.py", "drive", "{target}", "{work}"],
        },
        "contract": "1.0.0",
        "core": {"commit": CORE_COMMIT, "version": "v1.0.3"},
        "name": "kia-stick",
        "proof_kind": "synthetic",
        "required": REQUIRED,
        "runtime_files": {
            str(node_path): binding["node"]["sha256"],
            str(python_path): binding["python"]["sha256"],
        },
        "target_commit": TARGET_COMMIT,
        "timeout_seconds": 30,
        "version": "0.2.0",
    }
    write(ROOT / "adapter.json", manifest)
    print(f"python_sha256={binding['python']['sha256']}")
    print(f"node_sha256={binding['node']['sha256']}")
    print(f"node_version={version}")
    print(f"manifest_sha256={digest(ROOT / 'adapter.json')}")


if __name__ == "__main__":
    main()
