import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "0cb007d38c6e17d316cc25640f0fb28b2b934c55";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_63_to_v1_1_67_post_closeout_accepted_state_contract_refresh_20260716T170411Z/closeout_push_20260717T091002Z";
const history = ["84b5dac","65f8865","857ba0e","b8fb834","0286f03","ac23ed9","05cb559","a215dd4","0051a15","aa8f8c6","b911fd1","628fbd4","6d0715b","1da06ff","0269435","fcf5097","6ca589d","f662b37","cf2be1f","d099ff5","73b3f38","5b7a575","720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"];

describe("v1.1.58 accepted pushed state checkpoint", () => {
  it("records v1.1.57 as the single current baseline with exact history", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8"));
    expect(contract.phase).toBe("KIA-Stick-v1.1.68-to-v1.1.72-post-closeout-accepted-state-contract-refresh");
    expect(contract.checkpoint_label).toBe("v1.1.67 at 0cb007d");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_short_commit).toBe("0cb007d");
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.local_implementation_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_63_to_v1_1_67_post_closeout_accepted_state_contract_refresh_20260716T170411Z");
    expect(contract.operator_qa_pass_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_63_to_v1_1_67_post_closeout_accepted_state_contract_refresh_20260716T170411Z/operator_qa_pass_20260716T172338Z");
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.63-to-v1.1.67-operator-qa-pass-closeout-and-push");
    expect(contract.historical_prior_checkpoints.map((checkpoint: { short_commit: string }) => checkpoint.short_commit)).toEqual(history);
    expect(contract.historical_prior_checkpoints.every((checkpoint: { status: string }) => checkpoint.status === "historical_only_not_current")).toBe(true);
  });
});
