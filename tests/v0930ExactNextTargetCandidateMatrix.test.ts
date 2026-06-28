import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.30-exact-next-target-candidate-matrix";
const docPath = "docs/v0.9.30-exact-next-target-candidate-matrix.md";

describe("v0.9.30 exact Next target candidate matrix", () => {
  it("documents candidates without approving an implementation target", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "`next@15.5.19` current lockfile",
      "`next@16.2.9` latest",
      "`next@16.2.8` backport tag",
      "`next@15.3.9` next-15-3 tag",
      "`next@9.3.3` npm audit suggested fix",
      "`not_proven_clean`",
      "`blocked_forced_downgrade`",
      "No candidate is `proven_clean`.",
      "Result: `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "This phase does not approve",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks unclear target status and blocked implementation state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0930_exact_next_target_candidate_matrix: {
        phase: string;
        status: string;
        result: string;
        proven_clean_target: string;
        approved_for_implementation: boolean;
        candidate_next_latest: string;
        candidate_next_latest_status: string;
        audit_suggested_fix: string;
        v0912c_blocked_pending_exact_target: boolean;
        queue_015_status: string;
      };
    };
    const state = featureList.v0930_exact_next_target_candidate_matrix;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.result).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.proven_clean_target).toBe("none");
    expect(state.approved_for_implementation).toBe(false);
    expect(state.candidate_next_latest).toBe("16.2.9");
    expect(state.candidate_next_latest_status).toBe("not_proven_clean");
    expect(state.audit_suggested_fix).toBe("next@9.3.3 semver-major forced downgrade");
    expect(state.v0912c_blocked_pending_exact_target).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
  });
});
