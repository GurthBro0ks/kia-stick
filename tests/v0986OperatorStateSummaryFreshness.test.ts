import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.86-operator-state-summary-freshness";
const docPath = "docs/v0.9.86-operator-state-summary-freshness.md";

describe("v0.9.86 operator state summary freshness", () => {
  it("labels bc8fbef current and cfa7c2c historical", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Latest accepted pushed phase: `KIA-Stick-v0.9.78-to-v0.9.82-operator-qa-pass-closeout-and-push`",
      "Latest accepted pushed commit: `bc8fbef3114631ea3e0363b8e700ce0c2dce236e`",
      "Latest accepted pushed short commit: `bc8fbef`",
      "Latest closeout/push proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_78_to_v0_9_82_operator_qa_pass_recording_20260701T163018Z/closeout_push_20260701T163622Z`",
      "`HEAD == origin/main == bc8fbef3114631ea3e0363b8e700ce0c2dce236e`",
      "`cfa7c2c` remains a historical v0.9.73-to-v0.9.77 accepted pushed checkpoint.",
      "No Discord notification is sent for this local implementation checkpoint.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks operator state freshness in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0986_operator_state_summary_freshness: {
        phase: string;
        status: string;
        latest_accepted_pushed_short_commit: string;
        stale_prior_baseline_marked_historical: boolean;
        discord_sent: boolean;
        provider: string;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0986_operator_state_summary_freshness;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.latest_accepted_pushed_short_commit).toBe("bc8fbef");
    expect(state.stale_prior_baseline_marked_historical).toBe(true);
    expect(state.discord_sent).toBe(false);
    expect(state.provider).toBe("local-fake-deterministic");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
