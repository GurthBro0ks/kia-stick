import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.45-next-action-decision-clarity";
const docPath = "docs/v0.9.45-next-action-decision-clarity.md";
const scriptPath = resolve("scripts/closeout-helper.mjs");

function writeProof(resultText: string): string {
  const proofDir = join(tmpdir(), `kia-v0945-proof-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(proofDir, { recursive: true });
  writeFileSync(join(proofDir, "RESULT.md"), resultText);
  return proofDir;
}

describe("v0.9.45 next-action decision clarity", () => {
  it("documents explicit next-action labels without queue or push mutation", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "operator_qa_needed",
      "closeout_push_needed",
      "accepted_pushed_state_recorded",
      "warn_accepted_parked",
      "blocked_package_lock_changed",
      "blocked_safety_state",
      "Does not auto-change queue status.",
      "Does not auto-push.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("prints operator QA and closeout/push next-action states", () => {
    const pendingProof = writeProof(["PHASE=KIA-Stick-v0.9.45-fixture", "RESULT=PASS", "PUSHED=no", "MANUAL_QA_STATUS=PENDING"].join("\n"));
    const acceptedLocalProof = writeProof(["PHASE=KIA-Stick-v0.9.45-fixture", "RESULT=PASS", "PUSHED=no", "MANUAL_QA_STATUS=PASS"].join("\n"));

    const pending = spawnSync("node", [scriptPath, "summary", "--proof-dir", pendingProof], { encoding: "utf8" });
    const acceptedLocal = spawnSync("node", [scriptPath, "summary", "--proof-dir", acceptedLocalProof], { encoding: "utf8" });

    expect(pending.status).toBe(0);
    expect(pending.stdout).toContain("NEXT_ACTION_STATE=operator_qa_needed");
    expect(pending.stdout).toContain("NEXT_STEP=Operator manual QA review is required before closeout/push.");
    expect(acceptedLocal.status).toBe(0);
    expect(acceptedLocal.stdout).toContain("NEXT_ACTION_STATE=closeout_push_needed");
  });
});
