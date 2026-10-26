#!/usr/bin/env python3
"""Synthetic KIA Stick journey for the slimy-verify pilot.

Runs the real fake-corpus answer governor (lib/answerGovernor.ts buildAnswer)
under Node 22. The question and expected projection live in the adapter fixture.
Scratch receives only that projection plus result counts. Raw module output stays
in work/transient, which the controller deletes.
"""
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
process.stdout.write(JSON.stringify(projection));
"""


def fail(code):
    raise SystemExit(code)


def write_json(path, value):
    path.parent.mkdir(mode=0o700, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.chmod(temp, 0o600)
    os.replace(temp, path)


def real_executable(path):
    if not path.exists():
        return None
    resolved = path.resolve()
    if resolved.is_file() and not resolved.is_symlink() and os.access(resolved, os.X_OK):
        return resolved
    return None


def node_version(binary, env):
    try:
        completed = subprocess.run(
            [str(binary), "-p", "process.versions.node"],
            capture_output=True,
            text=True,
            env=env,
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    if completed.returncode != 0:
        return ""
    return completed.stdout.strip()


def find_node(env):
    preferred = [Path("/usr/bin/node"), Path("/usr/local/bin/node")]
    discovered = []
    skip = {"proc", "sys", "dev", "run", "tmp", "var", "sys"}
    try:
        top_level = list(Path("/").iterdir())
    except OSError:
        top_level = []
    for child in top_level:
        if child.name in skip or child.name.startswith("."):
            continue
        candidate = child / "node"
        if candidate.is_file() and not candidate.is_symlink():
            discovered.append(candidate)
    ordered = preferred + sorted(discovered, key=lambda item: str(item))
    seen = set()
    for candidate in ordered:
        resolved = real_executable(candidate)
        if resolved is None or resolved in seen:
            continue
        seen.add(resolved)
        version = node_version(resolved, env)
        if version.startswith("22."):
            return resolved
    return None


def run_journey(target, work, fixture_path):
    transient = work / "transient"
    transient.mkdir(mode=0o700, exist_ok=True)
    base_env = {
        "PATH": "/usr/bin:/bin",
        "HOME": str(work),
        "TMPDIR": str(work),
        "LANG": "C.UTF-8",
        "CI": "true",
        "NODE_ENV": "test",
        "NODE_NO_WARNINGS": "1",
    }
    node = find_node(base_env)
    if node is None:
        fail(3)
    loader = transient / "loader.mjs"
    runner = transient / "runner.mjs"
    loader.write_text(LOADER, encoding="utf-8")
    runner.write_text(RUNNER, encoding="utf-8")
    env = dict(base_env)
    env.update({
        "KIA_TARGET": str(target),
        "KIA_WORK": str(work),
        "KIA_FIXTURE": str(fixture_path),
        "KIA_LOADER": str(loader),
    })
    completed = subprocess.run(
        [str(node), str(runner)],
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
        projection = json.loads(completed.stdout)
    except ValueError:
        fail(8)
    return projection


def main(argv):
    if len(argv) != 4 or argv[1] not in {"drive", "check"}:
        fail(2)
    verb = argv[1]
    target = Path(argv[2]).resolve()
    work = Path(argv[3]).resolve()
    fixture_path = target / "slimy-verify" / "fixtures" / "annual-leave-question.json"
    try:
        fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
        expect = fixture["expect"]
    except (OSError, ValueError, KeyError):
        fail(8)
    projection = run_journey(target, work, fixture_path)
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
