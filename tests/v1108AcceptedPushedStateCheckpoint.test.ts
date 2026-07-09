import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.1.8-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.1.8-accepted-pushed-state-checkpoint.md";

describe("v1.1.8 accepted pushed state checkpoint", () => {
  it("documents 628fbd4 as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v1.1.7 at 628fbd4`",
      "Accepted pushed commit: `628fbd477ad12b77fea98e86a132cdf69412bbfe`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_3_to_v1_1_7_post_closeout_accepted_state_contract_refresh_20260709T142005Z/closeout_push_20260709T145726Z`",
      "Accepted equality: `HEAD == origin/main == 628fbd477ad12b77fea98e86a132cdf69412bbfe`",
      "Prior current checkpoint `6d0715b` is historical only, not current.",
    ])
      expect(doc).toContain(required);
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(
      readFileSync("feature_list.json", "utf8"),
    ).v1108_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("628fbd4");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("6d0715b");
    expect(state.historical_prior_accepted_pushed_short_commits[0]).toBe(
      "6d0715b",
    );
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
