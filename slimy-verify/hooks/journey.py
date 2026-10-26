#!/usr/bin/env python3
"""Synthetic KIA Stick journey for the slimy-verify pilot.

Runs the real fake-corpus answer governor (lib/answerGovernor.ts buildAnswer)
under Node 22. The question and expected projection live in the adapter fixture.
Scratch receives only that projection plus result counts. Raw module output stays
in work/transient, which the controller deletes.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

LOADER = r"""
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const target = process.env.KIA_TARGET;
if (!target) throw new Error("KIA_TARGET missing");

function fileForAlias(specifier) {
  const abs = path.join(target, specifier.slice(2));
  const candidates = [abs, abs + ".ts", abs + ".tsx", abs + ".json", path.join(abs, "index.ts")];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return abs;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const abs = fileForAlias(specifier);
    if (abs.endsWith(".json")) return { shortCircuit: true, url: pathToFileURL(abs).href };
    return nextResolve(pathToFileURL(abs).href, context);
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".json")) {
    const data = readFileSync(new URL(url), "utf8");
    return { format: "module", shortCircuit: true, source: "export default " + data + ";\n" };
  }
  return nextLoad(url, context);
}
"""

RUNNER = r"""
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const work = process.env.KIA_WORK;
const target = process.env.KIA_TARGET;
register(pathToFileURL(process.env.KIA_LOADER).href, { parentURL: pathToFileURL(work + "/transient/runner.mjs").href });
const fixture = JSON.parse(readFileSync(process.env.KIA_FIXTURE, "utf8"));
const { buildAnswer } = await import(pathToFileURL(target + "/lib/answerGovernor.ts").href);
const answer = buildAnswer(fixture.question, {
  mode: fixture.mode,
  scope: fixture.scope,
  detail: fixture.detail,
});
const shortAnswer = typeof answer.shortAnswer === "string" ? answer.shortAnswer : "";
const projection = {
  bestGuessDisabled: answer.bestGuessDisabled === true,
  citationClasses: answer.citations.map((citation) => citation.class),
  citationIds: answer.citations.map((citation) => citation.id),
  intent: answer.intent,
  noAnswer: answer.noAnswer === true,
  productVersion: answer.version.productVersion,
  provider: answer.version.provider,
  shortAnswerSha256: createHash("sha256").update(shortAnswer).digest("hex"),
};
const runtime = {
  sha256: createHash("sha256").update(readFileSync(process.execPath)).digest("hex"),
  version: process.version,
};
process.stdout.write(JSON.stringify({ projection, runtime }));
"""


def fail(code):
    raise SystemExit(code)


def write_json(path, value):
    path.parent.mkdir(mode=0o700, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.chmod(temp, 0o600)
    os.replace(temp, path)


def canonical_pinned(raw, expected_hash):
    if not isinstance(raw, str) or not isinstance(expected_hash, str):
        fail(3)
    path = Path(raw)
    if not path.is_absolute() or path.is_symlink() or not path.is_file() or not os.access(path, os.X_OK):
        fail(3)
    for parent in path.parents:
        if parent.is_symlink():
            fail(3)
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != expected_hash:
        fail(3)
    return path


def load_binding(target):
    binding_path = target / "slimy-verify" / "binding.json"
    try:
        binding = json.loads(binding_path.read_text(encoding="utf-8"))
        node = binding["node"]
        python_pin = binding["python"]
    except (OSError, ValueError, KeyError, TypeError):
        fail(3)
    python_path = canonical_pinned(python_pin.get("path"), python_pin.get("sha256"))
    node_path = canonical_pinned(node.get("path"), node.get("sha256"))
    if Path(sys.executable).resolve() != python_path:
        fail(3)
    version = node.get("version")
    if not isinstance(version, str) or not version.startswith("v22."):
        fail(3)
    return node_path, node["sha256"], version


def run_journey(target, work, fixture_path, node_path, node_sha256, node_version):
    transient = work / "transient"
    transient.mkdir(mode=0o700, exist_ok=True)
    loader = transient / "loader.mjs"
    runner = transient / "runner.mjs"
    loader.write_text(LOADER, encoding="utf-8")
    runner.write_text(RUNNER, encoding="utf-8")
    env = {
        "PATH": "/usr/bin:/bin",
        "HOME": str(work),
        "TMPDIR": str(work),
        "LANG": "C.UTF-8",
        "CI": "true",
        "NODE_ENV": "test",
        "NODE_NO_WARNINGS": "1",
        "KIA_TARGET": str(target),
        "KIA_WORK": str(work),
        "KIA_FIXTURE": str(fixture_path),
        "KIA_LOADER": str(loader),
    }
    completed = subprocess.run(
        [str(node_path), str(runner)],
        cwd=work,
        env=env,
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    if completed.returncode != 0 or not completed.stdout:
        fail(8)
    try:
        payload = json.loads(completed.stdout)
        projection = payload["projection"]
        runtime = payload["runtime"]
    except (ValueError, KeyError, TypeError):
        fail(8)
    if runtime.get("sha256") != node_sha256 or runtime.get("version") != node_version:
        fail(8)
    write_json(work / "runtime.json", {"sha256": runtime["sha256"], "version": runtime["version"]})
    return projection


def main(argv):
    if len(argv) != 4 or argv[1] not in {"drive", "check"}:
        fail(2)
    verb = argv[1]
    target = Path(argv[2]).resolve()
    work = Path(argv[3]).resolve()
    fixture_path = target / "slimy-verify" / "fixtures" / "annual-leave-question.json"
    node_path, node_sha256, node_version = load_binding(target)
    try:
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
        expect = fixture["expect"]
    except (OSError, ValueError, KeyError):
        fail(8)
    projection = run_journey(target, work, fixture_path, node_path, node_sha256, node_version)
    if projection != expect:
        fail(8)
    state_path = work / "state.json"
    if verb == "check":
        try:
            saved = json.loads(state_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            fail(8)
        if saved != projection:
            fail(8)
    elif verb == "drive":
        write_json(state_path, projection)
    else:
        fail(2)
    write_json(work / "result.json", {"failed": 0, "passed": 1, "skipped": 0, "tests": 1})


if __name__ == "__main__":
    main(sys.argv)
