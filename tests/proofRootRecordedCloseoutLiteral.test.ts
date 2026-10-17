import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * KIA-proof-root-helper-fix-1.
 *
 * The closeout helper prints the RECORDED closeout/push proof pointer from feature_list.json
 * (scripts/proof-paths.mjs: "Keep recorded evidence paths intact"); it never rebases that value
 * under KIA_LOCAL_PROOF_ROOT. The proof tree below is synthetic and built at runtime in mkdtemp:
 * no real proofs and no committed fixture files. /tmp is used because it is one of the helper's
 * allowed proof roots.
 */
const relativeCloseoutProof =
  "proof_kia_stick_v0_9_58_to_v0_9_62_operator_qa_pass_recording_20260630T213116Z/closeout_push_20260630T214918Z";
const recordedCloseoutProof = `/home/mint/kia-stick-local-proofs/${relativeCloseoutProof}`;
const v0966TestFile = "tests/v0966AcceptedPushedProofCloseoutDiscoveryCheckpoint.test.ts";

let syntheticRoot = "";
let syntheticCloseoutProof = "";

function childEnv(localProofRoot?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: "1" };
  for (const key of Object.keys(env)) {
    if (key.startsWith("VITEST") || key === "KIA_LOCAL_PROOF_ROOT" || key === "KIA_PROOF_ROOT") delete env[key];
  }
  if (localProofRoot) env.KIA_LOCAL_PROOF_ROOT = localProofRoot;
  return env;
}

function closeoutSummary(localProofRoot?: string) {
  return spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", syntheticCloseoutProof], {
    encoding: "utf8",
    env: childEnv(localProofRoot),
  });
}

function proofChainLines(stdout: string): string[] {
  return stdout.split("\n").filter((line) => line.startsWith("PROOF_CHAIN_"));
}

beforeAll(() => {
  syntheticRoot = mkdtempSync("/tmp/kia-synthetic-proof-root-");
  syntheticCloseoutProof = join(syntheticRoot, relativeCloseoutProof);
  mkdirSync(syntheticCloseoutProof, { recursive: true });
  writeFileSync(
    join(syntheticCloseoutProof, "RESULT.md"),
    ["PHASE=KIA-Stick-v0.9.62-synthetic-closeout-push", "RESULT=PASS", "PUSHED=yes", ""].join("\n"),
  );
});

afterAll(() => {
  if (syntheticRoot) rmSync(syntheticRoot, { recursive: true, force: true });
});

describe("closeout helper keeps the recorded closeout proof literal under a non-default proof root", () => {
  it("prints the recorded literal, not the synthetic on-disk path, when KIA_LOCAL_PROOF_ROOT points elsewhere", () => {
    const summary = closeoutSummary(syntheticRoot);

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_DISCOVERY_MODE=explicit_proof_dir");
    expect(summary.stdout).toContain("PUSHED=yes");
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=d1a31cd");
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${recordedCloseoutProof}`);
    expect(summary.stdout).not.toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${syntheticCloseoutProof}`);
  });

  it("produces identical proof-chain output with KIA_LOCAL_PROOF_ROOT unset (default unchanged)", () => {
    const withRoot = closeoutSummary(syntheticRoot);
    const withoutRoot = closeoutSummary();

    expect(withoutRoot.status).toBe(0);
    expect(proofChainLines(withoutRoot.stdout)).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${recordedCloseoutProof}`);
    expect(proofChainLines(withoutRoot.stdout)).toEqual(proofChainLines(withRoot.stdout));
  });

  it("passes the gated v0966 checkpoint test against the synthetic root", () => {
    const run = spawnSync(process.execPath, ["node_modules/vitest/vitest.mjs", "run", v0966TestFile], {
      encoding: "utf8",
      env: childEnv(syntheticRoot),
    });
    const output = `${run.stdout}\n${run.stderr}`;

    expect(output).not.toContain("NOT_RUN");
    expect(output).toMatch(/Tests\s+3 passed \(3\)/);
    expect(run.status).toBe(0);
  }, 120_000);
});
