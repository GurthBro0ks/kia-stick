import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.81-operator-state-summary";
const docPath = "docs/v0.9.81-operator-state-summary.md";

describe("v0.9.81 operator state summary", () => {
  it("records the current operator accepted state", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Latest accepted pushed phase: `KIA-Stick-v0.9.73-to-v0.9.77-operator-qa-pass-closeout-and-push`",
      "Latest accepted pushed commit: `cfa7c2c72cbff14a8e9515119256a806a7b00bcd`",
      "Latest accepted pushed short commit: `cfa7c2c`",
      "Validation: `PASS`",
      "Manual QA: `PASS`",
      "Push: yes",
      "Product version: `0.7.0`",
      "Prompt version: `prompt.fake-docs.v0.5-import-wizard-hardening`",
      "No Discord notification was sent for this local checkpoint.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the operator summary in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0981_operator_state_summary: {
        phase: string;
        status: string;
        latest_accepted_pushed_commit: string;
        latest_accepted_pushed_short_commit: string;
        validation: string;
        manual_qa_status: string;
        pushed: boolean;
        discord_sent: boolean;
        provider: string;
      };
    };
    const state = featureList.v0981_operator_state_summary;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.latest_accepted_pushed_commit).toBe("cfa7c2c72cbff14a8e9515119256a806a7b00bcd");
    expect(state.latest_accepted_pushed_short_commit).toBe("cfa7c2c");
    expect(state.validation).toBe("PASS");
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.pushed).toBe(true);
    expect(state.discord_sent).toBe(false);
    expect(state.provider).toBe("local-fake-deterministic");
  });
});
