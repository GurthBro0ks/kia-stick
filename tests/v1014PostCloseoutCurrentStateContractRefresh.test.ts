import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.14-post-closeout-current-state-contract-refresh";
const docPath = "docs/v1.0.14-post-closeout-current-state-contract-refresh.md";

describe("v1.0.14 post-closeout current state contract refresh", () => {
  it("documents the post-closeout static contract refresh", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Contract file: `data/current-accepted-pushed-state.json`",
      "Current accepted pushed checkpoint: `v1.0.12 at 20485da`",
      "Current accepted pushed commit: `20485da8d731ac94a12dd58d77a68e64bf296c5b`",
      "The contract marks `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` as historical only, not current.",
      "After every future closeout push, refresh this current accepted pushed state contract in a separate fake-only checkpoint before doing baseline-sensitive UI or tooling work.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("makes 20485da current and older baselines historical in the contract", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8")) as {
      phase: string;
      checkpoint_label: string;
      accepted_pushed_commit: string;
      accepted_pushed_short_commit: string;
      accepted_pushed_proof_dir: string;
      historical_prior_checkpoints: Array<{ short_commit: string; status: string }>;
    };

    expect(contract.phase).toBe("KIA-Stick-v1.0.18-to-v1.0.22-post-closeout-accepted-state-contract-refresh");
    expect(contract.checkpoint_label).toBe("v1.0.17 at b4b9fcf");
    expect(contract.accepted_pushed_commit).toBe("b4b9fcfce31108b09350e7d304fd1cff105edc31");
    expect(contract.accepted_pushed_short_commit).toBe("b4b9fcf");
    expect(contract.accepted_pushed_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_13_to_v1_0_17_operator_qa_pass_closeout_push_20260703T142433Z"
    );
    expect(contract.historical_prior_checkpoints.map((checkpoint) => checkpoint.short_commit)).toEqual([
      "20485da",
      "97574a9",
      "80e91c7",
      "dfa7052",
      "c72f14f",
      "d20e125",
      "bc8fbef",
      "cfa7c2c",
      "1465817",
    ]);
    expect(contract.historical_prior_checkpoints.every((checkpoint) => checkpoint.status === "historical_only_not_current")).toBe(true);
  });
});
