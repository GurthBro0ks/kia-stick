import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.98-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.98-accepted-pushed-state-checkpoint.md";

describe("v1.0.98 accepted pushed state checkpoint", () => {
  it("documents 1da06ff as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [
      phase,
      "Accepted pushed checkpoint: `v1.0.97 at 1da06ff`",
      "Accepted pushed commit: `1da06ffaa37b3787a652c1761e1c3f24b26df691`",
      "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_93_to_v1_0_97_post_closeout_accepted_state_contract_refresh_20260709T102419Z/closeout_push_20260709T105649Z`",
      "Accepted equality: `HEAD == origin/main == 1da06ffaa37b3787a652c1761e1c3f24b26df691`",
      "Prior current checkpoint `0269435` is historical only, not current.",
    ]) expect(doc).toContain(required);
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1098_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("1da06ff");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("0269435");
    expect(state.historical_prior_accepted_pushed_short_commits[0]).toBe("0269435");
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
