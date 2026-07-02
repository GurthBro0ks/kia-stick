import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.94-current-accepted-pushed-state-contract";
const docPath = "docs/v0.9.94-current-accepted-pushed-state-contract.md";
const contractPath = "data/current-accepted-pushed-state.json";

describe("v0.9.94 current accepted pushed state contract", () => {
  it("documents the static single-source contract", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Contract file: `data/current-accepted-pushed-state.json`",
      "Current accepted pushed checkpoint: `v0.9.92 at c72f14f`",
      "Current accepted pushed commit: `c72f14f15859c105637aa4193a976303a7de3233`",
      "Settings -> Operator Status reads the contract instead of duplicating the current accepted pushed headline.",
      "Closeout helper proof-chain selection reads the same contract before falling back to older feature-state windows.",
      "The contract is static repo-owned fake-only metadata and does not read proof directories at runtime.",
      "Package files remain unchanged and package version remains `0.7.0`.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("makes dfa7052 the only current accepted pushed value", () => {
    const contract = JSON.parse(readFileSync(contractPath, "utf8")) as {
      phase: string;
      checkpoint_label: string;
      accepted_pushed_commit: string;
      accepted_pushed_short_commit: string;
      accepted_pushed_proof_dir: string;
      local_implementation_proof_dir: string;
      operator_qa_pass_proof_dir: string;
      accepted_pushed: boolean;
      historical_prior_checkpoints: Array<{ short_commit: string; status: string }>;
      next_postcss_status: string;
      v0912c_status: string;
      queue_015_status: string;
      package_version: string;
    };

    expect(contract.phase).toBe("KIA-Stick-v0.9.98-to-v1.0.2-post-closeout-accepted-state-contract-refresh");
    expect(contract.checkpoint_label).toBe("v0.9.97 at dfa7052");
    expect(contract.accepted_pushed_commit).toBe("dfa7052e5bd87e8e96362c0e93565a29409964b3");
    expect(contract.accepted_pushed_short_commit).toBe("dfa7052");
    expect(contract.accepted_pushed_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_93_to_v0_9_97_operator_qa_pass_closeout_push_20260702T133507Z"
    );
    expect(contract.local_implementation_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_93_to_v0_9_97_accepted_pushed_state_single_source_alignment_20260702T101516Z"
    );
    expect(contract.operator_qa_pass_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_93_to_v0_9_97_operator_qa_pass_recording_20260702T124930Z"
    );
    expect(contract.accepted_pushed).toBe(true);
    expect(contract.historical_prior_checkpoints.map((checkpoint) => checkpoint.short_commit)).toEqual([
      "c72f14f",
      "d20e125",
      "bc8fbef",
      "cfa7c2c",
      "1465817",
    ]);
    expect(contract.historical_prior_checkpoints.every((checkpoint) => checkpoint.status === "historical_only_not_current")).toBe(true);
    expect(contract.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(contract.v0912c_status).toBe("blocked_pending_exact_target");
    expect(contract.queue_015_status).toBe("blocked");
    expect(contract.package_version).toBe("0.7.0");
  });
});
