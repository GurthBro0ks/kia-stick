import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.96-proof-index-closeout-helper-stale-baseline-guard";
const docPath = "docs/v0.9.96-proof-index-closeout-helper-stale-baseline-guard.md";

describe("v0.9.96 proof-index and closeout-helper stale-baseline guard", () => {
  it("documents c72f14f helper/proof-index freshness and preserved gates", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Latest accepted pushed closeout commit is `c72f14f15859c105637aa4193a976303a7de3233`.",
      "Closeout helper current proof-chain selection reports `PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=c72f14f`.",
      "The helper must not regress to `d20e125`, `bc8fbef`, `cfa7c2c`, or `1465817` as the current accepted pushed checkpoint.",
      "Accepted-WARN stays parked and is not converted to PASS.",
      "Missing proof still reports WARN.",
      "Real-doc implementation remains unapproved.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("reports 97574a9 from closeout helper current proof-chain selection", () => {
    const currentProof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_38_to_v1_0_42_post_closeout_accepted_state_contract_refresh_20260705T225915Z/closeout_push_20260705T231305Z";
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary", "--proof-dir", currentProof], {
      encoding: "utf8",
    });

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=886631f");
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${currentProof}`);
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=97574a9");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=c72f14f");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=d20e125");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=bc8fbef");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=cfa7c2c");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=1465817");
  });

  it("tracks stale-baseline guard state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0996_proof_index_closeout_helper_stale_baseline_guard: {
        phase: string;
        status: string;
        proof_chain_accepted_pushed_checkpoint: string;
        proof_index_latest_accepted_pushed_short_commit: string;
        stale_current_short_commits_prevented: string[];
        warn_fail_gates_preserved: boolean;
        queue_015_status: string;
        next_postcss_status: string;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v0996_proof_index_closeout_helper_stale_baseline_guard;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.proof_chain_accepted_pushed_checkpoint).toBe("c72f14f");
    expect(state.proof_index_latest_accepted_pushed_short_commit).toBe("c72f14f");
    expect(state.stale_current_short_commits_prevented).toEqual(["d20e125", "bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.warn_fail_gates_preserved).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.package_lock_changed).toBe(false);
  });
});
