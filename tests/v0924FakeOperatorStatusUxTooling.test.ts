import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.24-fake-operator-status-ux-tooling";
const docPath = "docs/v0.9.24-fake-operator-status-ux-tooling.md";
const acceptedCommit = "c5d12a004f4c9d270260ee860781b99421a938dd";

describe("v0.9.24 fake operator status UX/tooling", () => {
  it("documents the Settings operator status fields and read-only UX contract", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Settings tab now includes",
      "`Accepted commit`",
      "`Accepted proof`",
      "`Baseline QA`",
      "`Current QA`",
      "`Real-doc gate`",
      "`Next/PostCSS`",
      "read-only display copy",
      "does not browse local paths",
      "Manual QA `PASS`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("renders accepted pushed checkpoint copy in Settings without adding browser intake capability", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0924_fake_operator_status_ux_tooling: {
        phase: string;
        status: string;
        settings_operator_status_visible: boolean;
        current_manual_qa_status: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        browser_document_intake_blocked: boolean;
      };
    };
    const state = featureList.v0924_fake_operator_status_ux_tooling;

    expect(component).toContain("Fake-only operator status");
    expect(component).toContain("Accepted pushed WARN checkpoint visible");
    expect(component).toContain(acceptedCommit);
    expect(component).toContain("manual QA PASS for v0.9.23-to-v0.9.27");
    expect(component).toContain("queue-015 blocked; no real-doc capability");
    expect(component).toContain("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(component).not.toMatch(/showOpenFilePicker|showDirectoryPicker|webkitdirectory|readAsText|readAsArrayBuffer|browser File object/i);
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.settings_operator_status_visible).toBe(true);
    expect(state.current_manual_qa_status).toBe("PASS");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.browser_document_intake_blocked).toBe(true);
  });
});
