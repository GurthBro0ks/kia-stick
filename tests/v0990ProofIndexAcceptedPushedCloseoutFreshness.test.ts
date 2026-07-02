import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.90-proof-index-accepted-pushed-closeout-freshness";
const docPath = "docs/v0.9.90-proof-index-accepted-pushed-closeout-freshness.md";

describe("v0.9.90 proof index accepted pushed closeout freshness", () => {
  it("documents d20e125 as the latest accepted pushed closeout commit", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Latest accepted pushed closeout proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_operator_status_runtime_stale_baseline_fix_closeout_push_20260702T085505Z`",
      "Latest accepted pushed closeout commit: `d20e1251d5e7c117aa9592fb8614acb77ab3220b`",
      "Latest accepted pushed short commit: `d20e125`",
      "`bc8fbef`",
      "`cfa7c2c`",
      "`1465817`",
      "`Latest proof` can still refer to a newer in-progress local proof.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks proof-index freshness in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0990_proof_index_accepted_pushed_closeout_freshness: {
        phase: string;
        status: string;
        latest_accepted_pushed_closeout_commit: string;
        latest_accepted_pushed_short_commit: string;
        prior_accepted_pushed_short_commits_historical_only: string[];
        package_lock_changed: boolean;
        real_doc_capability_added: boolean;
      };
    };
    const state = featureList.v0990_proof_index_accepted_pushed_closeout_freshness;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.latest_accepted_pushed_closeout_commit).toBe("d20e1251d5e7c117aa9592fb8614acb77ab3220b");
    expect(state.latest_accepted_pushed_short_commit).toBe("d20e125");
    expect(state.prior_accepted_pushed_short_commits_historical_only).toEqual(["bc8fbef", "cfa7c2c", "1465817"]);
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_capability_added).toBe(false);
  });
});
