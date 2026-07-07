import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.24-post-closeout-current-state-contract-refresh";
const docPath = "docs/v1.0.24-post-closeout-current-state-contract-refresh.md";

describe("v1.0.24 post-closeout current state contract refresh", () => {
  it("documents the post-closeout static contract refresh", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Contract file: `data/current-accepted-pushed-state.json`", "Current accepted pushed checkpoint: `v1.0.22 at 8b42744`", "Current accepted pushed commit: `8b4274413ca056a4b647a163fd79c8165a024820`", "The contract marks `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` as historical only, not current.", "After every future closeout push, refresh this current accepted pushed state contract in a separate fake-only checkpoint before doing baseline-sensitive UI or tooling work."]) {
      expect(doc).toContain(required);
    }
  });

  it("makes 8b42744 current and older baselines historical in the contract", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8")) as { phase: string; checkpoint_label: string; accepted_pushed_commit: string; accepted_pushed_short_commit: string; accepted_pushed_proof_dir: string; historical_prior_checkpoints: Array<{ short_commit: string; status: string }> };
    expect(contract.phase).toBe("KIA-Stick-v1.0.58-to-v1.0.62-post-closeout-accepted-state-contract-refresh");
    expect(contract.checkpoint_label).toBe("v1.0.57 at 5b7a575");
    expect(contract.accepted_pushed_commit).toBe("5b7a57584cc66d8b9ef9b7ff905c1682e58a9caa");
    expect(contract.accepted_pushed_short_commit).toBe("5b7a575");
    expect(contract.accepted_pushed_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_53_to_v1_0_57_post_closeout_accepted_state_contract_refresh_20260707T061535Z/closeout_push_20260707T062624Z");
    expect(contract.historical_prior_checkpoints.map((checkpoint) => checkpoint.short_commit)).toEqual(["720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(contract.historical_prior_checkpoints.every((checkpoint) => checkpoint.status === "historical_only_not_current")).toBe(true);
  });
});
