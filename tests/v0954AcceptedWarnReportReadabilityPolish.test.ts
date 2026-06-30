import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.54-accepted-warn-report-readability-polish";
const docPath = "docs/v0.9.54-accepted-warn-report-readability-polish.md";
const scriptPath = resolve("scripts/closeout-helper.mjs");

describe("v0.9.54 accepted-WARN report readability polish", () => {
  it("documents accepted-WARN as parked rather than fixed", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "accepted-WARN is parked and operator-accepted",
      "accepted-WARN does not mean fixed",
      "exact Next target is still not proven",
      "no package mutation happened",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked",
      "ACCEPTED_WARN_MEANING=operator_accepted_parked_warn_not_fixed; exact_next_target_not_proven; no_package_mutation; v0912c_blocked; queue_015_blocked",
      "does not weaken normal stop-on-WARN/FAIL gates",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("prints accepted-WARN meaning in closeout summary for accepted WARN proofs", () => {
    const proofRoot = join(tmpdir(), `kia-v0954-proof-${Date.now()}`);
    const proofDir = join(proofRoot, "proof_kia_stick_v0_9_52_warn_20260630T185549Z");
    mkdirSync(proofDir, { recursive: true });
    writeFileSync(
      join(proofDir, "RESULT.md"),
      [
        "PHASE=KIA-Stick-v0.9.48-to-v0.9.52-accepted-warn-closeout-and-push",
        "RESULT=WARN",
        "PUSHED=yes",
        "MANUAL_QA_STATUS=ACCEPTED_WARN",
        "OPERATOR_QA_ACCEPTED_WARN for synthetic proof",
      ].join("\n")
    );

    const summary = spawnSync("node", [scriptPath, "summary", "--proof-dir", proofDir], { encoding: "utf8" });

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("ACCEPTED_WARN_STATUS=accepted_warn_parked");
    expect(summary.stdout).toContain(
      "ACCEPTED_WARN_MEANING=operator_accepted_parked_warn_not_fixed; exact_next_target_not_proven; no_package_mutation; v0912c_blocked; queue_015_blocked"
    );
    expect(summary.stdout).toContain("STOP_ON_WARN_FAIL_STATUS=STOP_REQUIRED");
  });
});

