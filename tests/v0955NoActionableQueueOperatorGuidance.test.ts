import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.55-no-actionable-queue-operator-guidance";
const docPath = "docs/v0.9.55-no-actionable-queue-operator-guidance.md";

describe("v0.9.55 no-actionable-queue operator guidance", () => {
  it("documents safe no-actionable-queue interpretation", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "No actionable queue items. Blocked and parked items are intentionally skipped.",
      "safe idle state",
      "Continue fake-only proof/report/operator UX polish.",
      "Repeat official-source research later",
      "Request exact Next target approval only if a clean target is proven.",
      "Keep the real-doc gate blocked.",
      "Queue status is not auto-changed.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("keeps queue next output parked while helper documents safe choices in feature state", () => {
    const queue = spawnSync("npm", ["run", "queue:next"], { encoding: "utf8" });
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0955_no_actionable_queue_operator_guidance: {
        status: string;
        queue_status_changed: boolean;
        queue_015_status: string;
        guidance: string;
        safe_next_choices: string[];
      };
    };
    const state = featureList.v0955_no_actionable_queue_operator_guidance;

    expect(queue.status).toBe(0);
    expect(queue.stdout).toContain("No actionable queue items. Blocked and parked items are intentionally skipped.");
    expect(state.status).toBe("accepted");
    expect(state.queue_status_changed).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.guidance).toContain("Blocked and parked items are intentionally skipped");
    expect(state.safe_next_choices).toContain("continue fake-only proof/report/operator UX polish");
    expect(state.safe_next_choices).toContain("keep real-doc gate blocked");
  });
});
