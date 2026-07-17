import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const commit = "ab1878e4c681c8f658e8a5bf6bd36f3ad4423fea";
const proof = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_68_to_v1_1_72_post_closeout_accepted_state_contract_refresh_20260717T092307Z/closeout_push_20260717T095029Z";
const history = ["0cb007d","84b5dac","65f8865","857ba0e","b8fb834","0286f03","ac23ed9","05cb559","a215dd4","0051a15","aa8f8c6","b911fd1","628fbd4","6d0715b","1da06ff","0269435","fcf5097","6ca589d","f662b37","cf2be1f","d099ff5","73b3f38","5b7a575","720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"];

describe("v1.1.73 accepted pushed state checkpoint", () => {
  it("records v1.1.72 as the single current baseline with exact history and proof chain", () => {
    const contract = JSON.parse(readFileSync("tests/fixtures/current-accepted-pushed-state-v1.1.72.json", "utf8"));
    expect(contract.phase).toBe("KIA-Stick-v1.1.73-to-v1.1.77-post-closeout-accepted-state-contract-refresh");
    expect(contract.checkpoint_label).toBe("v1.1.72 at ab1878e");
    expect(contract.accepted_pushed_commit).toBe(commit);
    expect(contract.accepted_pushed_short_commit).toBe("ab1878e");
    expect(contract.accepted_pushed_proof_dir).toBe(proof);
    expect(contract.local_implementation_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_68_to_v1_1_72_post_closeout_accepted_state_contract_refresh_20260717T092307Z");
    expect(contract.operator_qa_pass_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_1_68_to_v1_1_72_post_closeout_accepted_state_contract_refresh_20260717T092307Z/operator_qa_pass_20260717T094539Z");
    expect(contract.accepted_pushed_phase).toBe("KIA-Stick-v1.1.68-to-v1.1.72-operator-qa-pass-closeout-and-push");
    expect(contract.accepted_equality).toBe(`HEAD == origin/main == ${commit}`);
    expect(contract.historical_prior_checkpoints.map((checkpoint: { short_commit: string }) => checkpoint.short_commit)).toEqual(history);
    expect(contract.historical_prior_checkpoints.every((checkpoint: { status: string }) => checkpoint.status === "historical_only_not_current")).toBe(true);
  });
});
