import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.78-accepted-pushed-state-checkpoint";
const docPath = "docs/v0.9.78-accepted-pushed-state-checkpoint.md";

describe("v0.9.78 accepted pushed state checkpoint", () => {
  it("records the v0.9.77 accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Accepted pushed phase: `KIA-Stick-v0.9.73-to-v0.9.77-operator-qa-pass-closeout-and-push`",
      "Accepted pushed commit: `cfa7c2c72cbff14a8e9515119256a806a7b00bcd`",
      "Accepted pushed short commit: `cfa7c2c`",
      "Manual QA status: `PASS`",
      "Push performed: yes",
      "`HEAD == origin/main == cfa7c2c72cbff14a8e9515119256a806a7b00bcd`",
      "only secret-looking token remains the existing synthetic `ghp_` fixture",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`, not fixed.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0978_accepted_pushed_state_checkpoint: {
        phase: string;
        status: string;
        accepted_pushed_commit: string;
        accepted_pushed_short_commit: string;
        manual_qa_status: string;
        pushed: boolean;
        head_equals_origin_main_after_push: boolean;
        next_postcss_status: string;
        queue_015_status: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        real_doc_implementation_approved: boolean;
      };
    };
    const state = featureList.v0978_accepted_pushed_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted_pushed_recorded");
    expect(state.accepted_pushed_commit).toBe("cfa7c2c72cbff14a8e9515119256a806a7b00bcd");
    expect(state.accepted_pushed_short_commit).toBe("cfa7c2c");
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.pushed).toBe(true);
    expect(state.head_equals_origin_main_after_push).toBe(true);
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
