import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.91-closeout-helper-current-accepted-pushed-freshness";
const docPath = "docs/v0.9.91-closeout-helper-current-accepted-pushed-freshness.md";

describe("v0.9.91 closeout helper current accepted pushed freshness", () => {
  it("documents d20e125 proof-chain preference and preserved gates", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=d20e125`",
      "`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_closeout_push_20260702T085505Z`",
      "must not regress to `bc8fbef`, `cfa7c2c`, or `1465817` as the current accepted pushed checkpoint",
      "Missing proof still reports WARN.",
      "Accepted-WARN stays parked and is not converted to PASS.",
      "Real-doc implementation remains unapproved.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks closeout helper freshness in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0991_closeout_helper_current_freshness: {
        phase: string;
        status: string;
        proof_chain_accepted_pushed_checkpoint: string;
        proof_chain_prior_short_commits_historical_only: string[];
        warn_fail_gates_preserved: boolean;
        queue_015_status: string;
        next_postcss_status: string;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v0991_closeout_helper_current_freshness;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.proof_chain_accepted_pushed_checkpoint).toBe("d20e125");
    expect(state.proof_chain_prior_short_commits_historical_only).toEqual(["bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.warn_fail_gates_preserved).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.package_lock_changed).toBe(false);
  });
});
