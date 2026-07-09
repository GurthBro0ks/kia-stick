import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.1.3-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.1.3-accepted-pushed-state-checkpoint.md";

describe("v1.1.3 accepted pushed state checkpoint", () => {
  it("documents 6d0715b as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v1.1.2 at 6d0715b`",
      "Accepted pushed commit: `6d0715be19ed40d0f97a71022ae08912f1a82666`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_98_to_v1_1_2_post_closeout_accepted_state_contract_refresh_20260709T110558Z/closeout_push_20260709T120853Z`",
      "Accepted equality: `HEAD == origin/main == 6d0715be19ed40d0f97a71022ae08912f1a82666`",
      "Prior current checkpoint `1da06ff` is historical only, not current.",
    ]) expect(doc).toContain(required);
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1103_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("6d0715b");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("1da06ff");
    expect(state.historical_prior_accepted_pushed_short_commits[0]).toBe("1da06ff");
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
