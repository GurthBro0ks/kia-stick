import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.35-fake-operator-status-polish";
const docPath = "docs/v0.9.35-fake-operator-status-polish.md";

describe("v0.9.35 fake operator status polish", () => {
  it("documents the accepted WARN status fields for Settings", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "latest accepted pushed WARN checkpoint `beea159bb44ecc35ed8cb9b5a55aa1c0f3f217f6`",
      "manual QA `ACCEPTED_WARN`",
      "current local bundle status: manual QA `PASS`, pushed `no`",
      "Next/PostCSS parked as `WARN_SAFE_NEXT_TARGET_UNCLEAR`, not fixed",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` blocked",
      "`queue-015-v07-first-real-doc-gate-request` blocked",
      "product version `0.7.0`",
      "prompt version `prompt.fake-docs.v0.5-import-wizard-hardening`",
      "no real-doc capability",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("keeps Settings copy status-only with no document intake affordance", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0935_fake_operator_status_polish: {
        phase: string;
        status: string;
        copy_only_status_ui: boolean;
        accepted_warn_commit_visible: string;
        current_bundle_manual_qa_status: string;
        next_postcss_status: string;
        v0912c_status: string;
        queue_015_status: string;
        real_doc_capability_added: boolean;
      };
    };
    const state = featureList.v0935_fake_operator_status_polish;

    expect(component).toContain("Accepted pushed WARN checkpoint visible");
    expect(component).toContain("beea159bb44ecc35ed8cb9b5a55aa1c0f3f217f6");
    expect(component).toContain("manual QA ACCEPTED_WARN");
    expect(component).toContain("manual QA PASS for v0.9.33-to-v0.9.37; pushed no");
    expect(component).toContain("WARN_SAFE_NEXT_TARGET_UNCLEAR; parked, not fixed");
    expect(component).toContain("blocked pending exact operator-approved Next target");
    expect(component).not.toContain("<input type=\"file\"");
    expect(component).not.toContain("showOpenFilePicker");
    expect(component).not.toContain("FileReader");
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.copy_only_status_ui).toBe(true);
    expect(state.accepted_warn_commit_visible).toBe("beea159bb44ecc35ed8cb9b5a55aa1c0f3f217f6");
    expect(state.current_bundle_manual_qa_status).toBe("PASS");
    expect(state.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.v0912c_status).toBe("blocked_pending_exact_target");
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_capability_added).toBe(false);
  });
});
