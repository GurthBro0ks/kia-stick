import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.14-operator-qa-report-readability-polish";
const docPath = "docs/v0.9.14-operator-qa-report-readability-polish.md";

describe("v0.9.14 operator QA/report readability polish", () => {
  it("documents honest WARN and smoke-only proof wording", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "WARN_SAFE_NEXT_TARGET_UNCLEAR",
      "accepted/parked decision, not a fixed advisory",
      "cannot prove the parked Next/PostCSS audit path is fixed",
      "DISCORD_SENT=no",
      "NOTIFY_MODE=disabled",
      "DEDUPE_RESULT=not_applicable",
      "v0.9.12C remains blocked",
      "Product/package version remains `0.7.0`",
      "Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks readability state without claiming advisory remediation", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0914_operator_qa_report_readability_polish: {
        phase: string;
        status: string;
        warn_wording_honest: boolean;
        smoke_claims_security_fix: boolean;
        next_postcss_advisories_fixed: boolean;
        package_lock_changed: boolean;
        queue_015_status: string;
        manual_qa_status: string;
      };
    };
    const state = featureList.v0914_operator_qa_report_readability_polish;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.warn_wording_honest).toBe(true);
    expect(state.smoke_claims_security_fix).toBe(false);
    expect(state.next_postcss_advisories_fixed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.manual_qa_status).toBe("PENDING");
  });
});
