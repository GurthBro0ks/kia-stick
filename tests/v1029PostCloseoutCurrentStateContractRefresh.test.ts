import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.29-post-closeout-current-state-contract-refresh";
const docPath = "docs/v1.0.29-post-closeout-current-state-contract-refresh.md";

describe("v1.0.29 post-closeout current state contract refresh", () => {
  it("documents the post-closeout static contract refresh", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Contract file: `data/current-accepted-pushed-state.json`", "Current accepted pushed checkpoint: `v1.0.27 at 87420e2`", "Current accepted pushed commit: `87420e2e293fd86b2b76c66729e0e905bb688c0d`", "The contract marks `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` as historical only, not current.", "After every future closeout push, refresh this current accepted pushed state contract in a separate fake-only checkpoint before doing baseline-sensitive UI or tooling work."]) {
      expect(doc).toContain(required);
    }
  });

  it("makes 87420e2 current and older baselines historical in the contract", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8")) as { phase: string; checkpoint_label: string; accepted_pushed_commit: string; accepted_pushed_short_commit: string; accepted_pushed_proof_dir: string; historical_prior_checkpoints: Array<{ short_commit: string; status: string }> };
    expect(contract.phase).toBe("KIA-Stick-v1.0.48-to-v1.0.52-post-closeout-accepted-state-contract-refresh");
    expect(contract.checkpoint_label).toBe("v1.0.47 at 5c7f360");
    expect(contract.accepted_pushed_commit).toBe("5c7f3600267f161db3d773181d82a3c4f4727dea");
    expect(contract.accepted_pushed_short_commit).toBe("5c7f360");
    expect(contract.accepted_pushed_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_43_to_v1_0_47_post_closeout_accepted_state_contract_refresh_20260706T164518Z/closeout_push_20260707T054817Z");
    expect(contract.historical_prior_checkpoints.map((checkpoint) => checkpoint.short_commit)).toEqual(["886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(contract.historical_prior_checkpoints.every((checkpoint) => checkpoint.status === "historical_only_not_current")).toBe(true);
  });
});
