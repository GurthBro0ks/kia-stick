import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.75-closeout-default-persistent-root-implementation";
const docPath = "docs/v0.9.75-closeout-default-persistent-root-implementation.md";

describe("v0.9.75 closeout default persistent-root implementation", () => {
  it("documents persistent-root default behavior", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "`--proof-dir` remains the strongest selector",
      "`--proof-root` remains an explicit root selector",
      "`KIA_PROOF_ROOT` is honored only when it resolves inside an allowed proof root.",
      "`/home/mint/kia-stick-local-proofs` is selected by default",
      "`/tmp` is used only as fallback.",
      "The helper remains read-only.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("shows persistent KIA proof-root mode in default summary output", () => {
    const summary = spawnSync("node", ["scripts/closeout-helper.mjs", "summary"], { encoding: "utf8" });

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_DISCOVERY_MODE=default_latest_from_persistent_kia_proof_root");
    expect(summary.stdout).toContain("PROOF_DISCOVERY_NOTE=persistent KIA proof root selected");
    expect(summary.stdout).toContain("PROOF_DIR=/home/mint/kia-stick-local-proofs/");
  });

  it("tracks implementation details in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0975_closeout_default_persistent_root_implementation: {
        phase: string;
        status: string;
        persistent_default_root: string;
        explicit_proof_dir_still_wins: boolean;
        helper_read_only: boolean;
        package_json_changed: boolean;
        package_lock_changed: boolean;
      };
    };
    const state = featureList.v0975_closeout_default_persistent_root_implementation;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.persistent_default_root).toBe("/home/mint/kia-stick-local-proofs");
    expect(state.explicit_proof_dir_still_wins).toBe(true);
    expect(state.helper_read_only).toBe(true);
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
  });
});
