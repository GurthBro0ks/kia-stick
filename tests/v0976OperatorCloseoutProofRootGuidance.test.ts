import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.76-operator-closeout-proof-root-guidance";
const docPath = "docs/v0.9.76-operator-closeout-proof-root-guidance.md";

describe("v0.9.76 operator closeout proof-root guidance", () => {
  it("records operator guidance for active proof review", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Use `npm run closeout:summary -- --proof-dir <proof_dir>`",
      "Use `npm run closeout:review -- --proof-dir <proof_dir>`",
      "Default `npm run closeout:summary` and `npm run closeout:review` should choose `/home/mint/kia-stick-local-proofs`",
      "`/tmp` is fallback only.",
      "Stale old `/tmp` proofs should not drive current closeout decisions",
      "Stop-on-WARN/FAIL behavior is preserved.",
      "Manual QA remains pending",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks guidance in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0976_operator_closeout_proof_root_guidance: {
        phase: string;
        status: string;
        active_bundle_should_use_explicit_proof_dir: boolean;
        default_uses_persistent_root: boolean;
        tmp_is_fallback_only: boolean;
        stop_on_warn_fail_preserved: boolean;
      };
    };
    const state = featureList.v0976_operator_closeout_proof_root_guidance;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.active_bundle_should_use_explicit_proof_dir).toBe(true);
    expect(state.default_uses_persistent_root).toBe(true);
    expect(state.tmp_is_fallback_only).toBe(true);
    expect(state.stop_on_warn_fail_preserved).toBe(true);
  });
});
