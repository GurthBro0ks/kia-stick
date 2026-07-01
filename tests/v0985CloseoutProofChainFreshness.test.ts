import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.85-closeout-proof-chain-freshness";
const docPath = "docs/v0.9.85-closeout-proof-chain-freshness.md";

describe("v0.9.85 closeout proof-chain freshness", () => {
  it("documents the current proof-chain fields and stale-baseline guard", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=bc8fbef",
      "PROOF_CHAIN_LOCAL_IMPLEMENTATION_PROOF=/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_78_to_v0_9_82_accepted_pushed_state_next_safe_work_checkpoint_20260701T161640Z",
      "PROOF_CHAIN_OPERATOR_QA_PROOF=/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_78_to_v0_9_82_operator_qa_pass_recording_20260701T163018Z",
      "PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_78_to_v0_9_82_operator_qa_pass_recording_20260701T163018Z/closeout_push_20260701T163622Z",
      "Missing proof still reports WARN.",
      "Accepted-WARN stays parked and is not converted to PASS.",
      "Real-doc implementation remains unapproved.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks proof-chain freshness in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0985_closeout_proof_chain_freshness: {
        phase: string;
        status: string;
        proof_chain_accepted_pushed_checkpoint: string;
        stale_cfa7c2c_current_state_prevented: boolean;
        warn_fail_gates_preserved: boolean;
        queue_015_status: string;
        next_postcss_status: string;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v0985_closeout_proof_chain_freshness;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.proof_chain_accepted_pushed_checkpoint).toBe("bc8fbef");
    expect(state.stale_cfa7c2c_current_state_prevented).toBe(true);
    expect(state.warn_fail_gates_preserved).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.package_lock_changed).toBe(false);
  });
});
