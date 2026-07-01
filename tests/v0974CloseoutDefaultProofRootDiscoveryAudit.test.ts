import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.74-closeout-default-proof-root-discovery-audit";
const docPath = "docs/v0.9.74-closeout-default-proof-root-discovery-audit.md";

describe("v0.9.74 closeout default proof-root discovery audit", () => {
  it("documents the stale default issue and safe discovery order", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "defaulted to `/tmp`",
      "stale or missing `/tmp` proofs",
      "Explicit `--proof-dir` always wins.",
      "`KIA_PROOF_ROOT` wins when supplied and inside an allowed proof root.",
      "`/home/mint/kia-stick-local-proofs` wins when it exists and contains KIA proof directories.",
      "`/tmp` is fallback only.",
      "must not mutate proof directories",
      "must not scan arbitrary private folders",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the audit in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0974_closeout_default_proof_root_discovery_audit: {
        phase: string;
        status: string;
        stale_tmp_issue_documented: boolean;
        safe_discovery_order: string[];
        proof_directories_mutated: boolean;
        arbitrary_private_folder_scan: boolean;
      };
    };
    const state = featureList.v0974_closeout_default_proof_root_discovery_audit;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.stale_tmp_issue_documented).toBe(true);
    expect(state.safe_discovery_order).toEqual(["explicit --proof-dir", "KIA_PROOF_ROOT", "persistent KIA proof root", "/tmp fallback"]);
    expect(state.proof_directories_mutated).toBe(false);
    expect(state.arbitrary_private_folder_scan).toBe(false);
  });
});
