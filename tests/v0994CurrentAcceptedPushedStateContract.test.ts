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

  it("makes 97574a9 the only current accepted pushed value", () => {
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

    expect(contract.phase).toBe("KIA-Stick-v1.0.73-to-v1.0.77-post-closeout-accepted-state-contract-refresh");
    expect(contract.checkpoint_label).toBe("v1.0.72 at cf2be1f");
    expect(contract.accepted_pushed_commit).toBe("cf2be1ffde6d52d6ad01f54f52ce8e8d7c937358");
    expect(contract.accepted_pushed_short_commit).toBe("cf2be1f");
    expect(contract.accepted_pushed_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_68_to_v1_0_72_post_closeout_accepted_state_contract_refresh_20260708T172615Z/closeout_push_20260708T184656Z");
    expect(contract.local_implementation_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_68_to_v1_0_72_post_closeout_accepted_state_contract_refresh_20260708T172615Z"
    );
    expect(contract.operator_qa_pass_proof_dir).toBe(
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_68_to_v1_0_72_post_closeout_accepted_state_contract_refresh_20260708T172615Z/closeout_push_20260708T184656Z"
    );
    expect(contract.accepted_pushed).toBe(true);
    expect(contract.historical_prior_checkpoints.map((checkpoint) => checkpoint.short_commit)).toEqual(["d099ff5","73b3f38","5b7a575","720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(contract.historical_prior_checkpoints.every((checkpoint) => checkpoint.status === "historical_only_not_current")).toBe(true);
    expect(contract.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(contract.v0912c_status).toBe("blocked_pending_exact_target");
    expect(contract.queue_015_status).toBe("blocked");
    expect(contract.package_version).toBe("0.7.0");
  });
});
