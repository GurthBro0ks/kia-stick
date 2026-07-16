import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "65f88659b238ae0cfacd51f0dab71844d885a76c";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_53_to_v1_1_57_post_closeout_accepted_state_contract_refresh_20260715T214207Z/closeout_push_20260716T145607Z";
const history = ["857ba0e","b8fb834","0286f03","ac23ed9","05cb559","a215dd4","0051a15","aa8f8c6","b911fd1","628fbd4","6d0715b","1da06ff","0269435","fcf5097","6ca589d","f662b37","cf2be1f","d099ff5","73b3f38","5b7a575","720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"];

describe("v1.1.58 accepted pushed state checkpoint", () => {
  it("records v1.1.57 as the single current baseline with exact history", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.phase).toBe("KIA-Stick-v1.1.58-to-v1.1.62-post-closeout-accepted-state-contract-refresh");
    expect(contract.checkpoint_label).toBe("v1.1.57 at 65f8865");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_short_commit).toBe("65f8865");
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.local_implementation_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_53_to_v1_1_57_post_closeout_accepted_state_contract_refresh_20260715T214207Z");
    expect(contract.operator_qa_pass_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_53_to_v1_1_57_post_closeout_accepted_state_contract_refresh_20260715T214207Z/operator_qa_pass_20260716T144157Z");
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.53-to-v1.1.57-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints.map((checkpoint: { short_commit: string }) => checkpoint.short_commit)).toEqual(history);
    expect(contract.historical_prior_checkpoints.every((checkpoint: { status: string }) => checkpoint.status === "historical_only_not_current")).toBe(true);
  });
});
