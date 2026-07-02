import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.93-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.93-accepted-pushed-state-checkpoint.md";

describe("v0.9.93 accepted pushed state checkpoint", () => {
  it("records c72f14f as current and prior baselines as historical only", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Current accepted pushed checkpoint: `v0.9.92 at c72f14f`",
      "Current accepted pushed commit: `c72f14f15859c105637aa4193a976303a7de3233`",
      "Current accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_88_to_v0_9_92_operator_qa_pass_closeout_push_20260702T094921Z`",
      "Accepted validation/manual QA/push: `PASS` / `PASS` / pushed yes",
      "`HEAD == origin/main == c72f14f15859c105637aa4193a976303a7de3233`",
      "`d20e1251d5e7c117aa9592fb8614acb77ab3220b` is historical only, not current.",
      "`bc8fbef3114631ea3e0363b8e700ce0c2dce236e` is historical only, not current.",
      "`cfa7c2c72cbff14a8e9515119256a806a7b00bcd` is historical only, not current.",
      "`1465817e8efad6207705833e9e08f22030d6a116` is historical only, not current.",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0993_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_commit: string;
        accepted_pushed_short_commit: string;
        accepted_pushed_proof_dir: string;
        historical_prior_accepted_pushed_short_commits: string[];
        d20e125_current_state_prevented: boolean;
        bc8fbef_current_state_prevented: boolean;
        cfa7c2c_current_state_prevented: boolean;
        stale_1465817_current_state_prevented: boolean;
        queue_015_status: string;
        next_postcss_status: string;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v0993_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_commit).toBe("c72f14f15859c105637aa4193a976303a7de3233");
    expect(state.accepted_pushed_short_commit).toBe("c72f14f");
    expect(state.accepted_pushed_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_88_to_v0_9_92_operator_qa_pass_closeout_push_20260702T094921Z"
    );
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["d20e125", "bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.d20e125_current_state_prevented).toBe(true);
    expect(state.bc8fbef_current_state_prevented).toBe(true);
    expect(state.cfa7c2c_current_state_prevented).toBe(true);
    expect(state.stale_1465817_current_state_prevented).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.package_lock_changed).toBe(false);
  });
});
