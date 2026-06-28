import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.41-accepted-pushed-closeout-packet-checklist";
const docPath = "docs/v0.9.41-accepted-pushed-closeout-packet-checklist.md";
const scriptPath = resolve("scripts/closeout-helper.mjs");

describe("v0.9.41 accepted pushed closeout packet checklist", () => {
  it("documents proof-safe closeout packet checklist fields", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "supplied proof dir",
      "manual QA status",
      "pushed state",
      "HEAD/origin equality expectation",
      "package-lock unchanged status",
      "queue-015 blocked status",
      "v0.9.12C blocked status",
      "Next/PostCSS parked status",
      "real-doc capability blocked status",
      "services/Discord/system changes status",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("prints closeout packet checklist fields for explicit proof review", () => {
    const root = mkdtempSync(join(tmpdir(), "kia-v0941-proof-"));
    const proofDir = join(root, "proof_kia_stick_v0_9_41_fixture_20260628T170100Z");
    mkdirSync(proofDir, { recursive: true });
    writeFileSync(join(proofDir, "RESULT.md"), ["PHASE=KIA-Stick-v0.9.41-fixture", "RESULT=PASS", "PUSHED=yes", "MANUAL_QA_STATUS=PASS"].join("\n"));

    const result = spawnSync("node", [scriptPath, "review", "--proof-dir", proofDir], { encoding: "utf8" });

    expect(result.status).toBe(0);
    for (const required of [
      "Closeout packet checklist:",
      `supplied_proof_dir=${proofDir}`,
      "result=PASS",
      "manual_qa_status=PASS",
      "pushed=yes",
      "head_origin_expectation=",
      "dirty_state=",
      "package_lock_unchanged=yes",
      "queue_015=",
      "v0912c=",
      "next_postcss=",
      "real_doc_capability=",
      "services_discord_system_changes=none",
    ]) {
      expect(result.stdout).toContain(required);
    }
  });
});
