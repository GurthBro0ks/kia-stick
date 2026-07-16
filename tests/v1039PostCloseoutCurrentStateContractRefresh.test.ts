import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.39-post-closeout-current-state-contract-refresh";
const docPath = "docs/v1.0.39-post-closeout-current-state-contract-refresh.md";

describe("v1.0.39 post-closeout current state contract refresh", () => {
  it("documents the post-closeout static contract refresh", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Contract file: `data/current-accepted-pushed-state.json`", "Current accepted pushed checkpoint: `v1.0.37 at 841dee7`", "Current accepted pushed commit: `841dee7d44e2af18d60500b13880ba99c1bee9a6`", "The contract marks `870d3a7`, `87420e2`, `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` as historical only, not current.", "After every future closeout push, refresh this current accepted pushed state contract in a separate fake-only checkpoint before doing baseline-sensitive UI or tooling work."]) {
      expect(doc).toContain(required);
    }
  });

  it("makes 886631f current and older baselines historical in the contract", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8")) as { phase: string; checkpoint_label: string; accepted_pushed_commit: string; accepted_pushed_short_commit: string; accepted_pushed_proof_dir: string; historical_prior_checkpoints: Array<{ short_commit: string; status: string }> };
    expect(contract.phase).toBe("KIA-Stick-v1.1.58-to-v1.1.62-post-closeout-accepted-state-contract-refresh");
    expect(contract.checkpoint_label).toBe("v1.1.57 at 65f8865");
    expect(contract.accepted_pushed_commit).toBe("65f88659b238ae0cfacd51f0dab71844d885a76c");
    expect(contract.accepted_pushed_short_commit).toBe("65f8865");
    expect(contract.accepted_pushed_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_53_to_v1_1_57_post_closeout_accepted_state_contract_refresh_20260715T214207Z/closeout_push_20260716T145607Z");
    expect(contract.historical_prior_checkpoints.map((checkpoint) => checkpoint.short_commit)).toEqual(["857ba0e","b8fb834","0286f03","ac23ed9","05cb559","a215dd4","0051a15","aa8f8c6","b911fd1","628fbd4","6d0715b","1da06ff","0269435","fcf5097","6ca589d","f662b37","cf2be1f","d099ff5","73b3f38","5b7a575","720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(contract.historical_prior_checkpoints.every((checkpoint) => checkpoint.status === "historical_only_not_current")).toBe(true);
  });
});
