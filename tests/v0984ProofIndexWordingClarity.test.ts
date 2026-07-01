import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.84-proof-index-wording-clarity";
const docPath = "docs/v0.9.84-proof-index-wording-clarity.md";

describe("v0.9.84 proof index wording clarity", () => {
  it("documents separate proof classes and current closeout commit visibility", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "`Latest proof`: newest filesystem proof, which may be incomplete or in progress.",
      "`Latest accepted pushed closeout proof`: newest `RESULT=PASS`, `PUSHED=yes` closeout proof.",
      "`Latest accepted pushed closeout commit`: the `COMMIT_SHA` recorded by that closeout proof.",
      "`Latest operator QA PASS proof`: newest non-closeout proof with manual QA `PASS`.",
      "`Latest accepted-WARN proof`: parked accepted-WARN evidence, not PASS.",
      "`Latest screenshot review-ready candidate`: screenshot-gated review candidate.",
      "commit `bc8fbef3114631ea3e0363b8e700ce0c2dce236e`",
      "WARN_MISSING_RESULT",
      "queue-015 remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks wording clarity in feature state without package or real-doc drift", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0984_proof_index_wording_clarity: {
        phase: string;
        status: string;
        latest_proof_label_clarified: boolean;
        accepted_pushed_closeout_commit_visible: boolean;
        accepted_pushed_short_commit: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        real_doc_capability_added: boolean;
      };
    };
    const state = featureList.v0984_proof_index_wording_clarity;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.latest_proof_label_clarified).toBe(true);
    expect(state.accepted_pushed_closeout_commit_visible).toBe(true);
    expect(state.accepted_pushed_short_commit).toBe("bc8fbef");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_capability_added).toBe(false);
  });
});
