import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.39-closeout-summary-proof-dir-usability";
const docPath = "docs/v0.9.39-closeout-summary-proof-dir-usability.md";
const scriptPath = resolve("scripts/closeout-helper.mjs");

function writeProof(root: string, result: string): string {
  const proofDir = join(root, "proof_kia_stick_v0_9_39_fixture_20260628T170000Z");
  mkdirSync(proofDir, { recursive: true });
  writeFileSync(join(proofDir, "RESULT.md"), result);
  return proofDir;
}

function createRepoFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "kia-v0939-repo-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "README.md"), "fixture\n");
  writeFileSync(join(root, "feature_list.json"), JSON.stringify({ phase }, null, 2));
  writeFileSync(
    join(root, "docs/phase-backlog.json"),
    JSON.stringify(
      {
        schema: "kia-stick-local-task-queue.v1",
        updated_at: "2026-06-28T17:00:00.000Z",
        items: [],
      },
      null,
      2
    )
  );
  execFileSync("git", ["init", "-b", "main"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["config", "user.email", "v0939@example.invalid"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["config", "user.name", "v0939 Fixture"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["add", "."], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["commit", "-m", "Initial fixture"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["update-ref", "refs/remotes/origin/main", "HEAD"], { cwd: root, encoding: "utf8" });
  return root;
}

describe("v0.9.39 closeout summary proof-dir usability", () => {
  it("documents explicit proof-dir and default discovery modes", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "npm run closeout:summary -- --proof-dir <path>",
      "npm run closeout:review -- --proof-dir <path>",
      "PROOF_DISCOVERY_MODE=default_latest_from_proof_root",
      "Accepted-WARN remains parked WARN, not PASS.",
      "The helper does not execute `git push`.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("prints explicit proof metadata without using generic latest-proof discovery", () => {
    const root = mkdtempSync(join(tmpdir(), "kia-v0939-proof-"));
    const repoRoot = createRepoFixture();
    const proofDir = writeProof(
      root,
      [
        "PHASE=KIA-Stick-v0.9.33-to-v0.9.37-accepted-warn-state-and-fake-only-proof-report-operator-ux-bundle-closeout-and-push",
        "RESULT=PASS",
        "PUSHED=yes",
        "MANUAL_QA_STATUS=PASS",
      ].join("\n")
    );

    const result = spawnSync("node", [scriptPath, "summary", "--root", repoRoot, "--proof-dir", proofDir], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("RESULT=PASS");
    expect(result.stdout).toContain("PROOF_DISCOVERY_MODE=explicit_proof_dir");
    expect(result.stdout).toContain(`PROOF_DIR=${proofDir}`);
    expect(result.stdout).toContain("PUSHED=yes");
    expect(result.stdout).toContain("MANUAL_QA_STATUS=PASS");
  });
});
