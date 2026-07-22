import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { currentAcceptedPushedState } from "@/lib/acceptedState";

const phase = "KIA-Stick-v0.9.71-browser-qa-status-checklist-polish";
const docPath = "docs/v0.9.71-browser-qa-status-checklist-polish.md";

describe("v0.9.71 browser QA status checklist polish", () => {
  it("documents browser QA checks for current fake-only status surfaces", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "App header build identity matches local HEAD after server restart.",
      "Settings current accepted pushed status is not stale and shows v0.9.67 at `1465817`.",
      "Settings historical accepted-WARN status is clearly historical/parked, not current.",
      "`/version` displayVersion and Git SHA match current local HEAD.",
      "`/health` phase is `KIA-Stick-v0.9.68-to-v0.9.72-accepted-pushed-state-and-runtime-status-freshness-bundle`.",
      "`/health` fakeOnly is true.",
      "`/health` realDbTouched is false.",
      "Next/PostCSS remains `WARN_SAFE_NEXT_TARGET_UNCLEAR`.",
      "`KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation` remains blocked.",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("updates operator smoke runtime expectation without requiring a server", () => {
    const result = spawnSync("node", ["scripts/operator-qa-smoke.mjs", "--base-url", "http://127.0.0.1:9"], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Operator QA smoke PASS");
    expect(result.stdout).toContain(`Runtime phase: ${currentAcceptedPushedState.local_bundle_phase}`);
    expect(result.stdout).toContain(`Accepted checkpoint: ${currentAcceptedPushedState.checkpoint_label}`);
    expect(result.stdout).toContain("Settings version identity");
    expect(result.stdout).toContain("/health local route");
    expect(result.stdout).toContain("/version local route");
    expect(result.stdout).toContain("local_route_checks=SKIPPED_SERVER_UNAVAILABLE");
  });

  it("tracks checklist freshness metadata in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0971_browser_qa_status_checklist_polish: {
        phase: string;
        status: string;
        app_header_head_check: boolean;
        settings_current_checkpoint_check: boolean;
        version_head_check: boolean;
        health_fake_only_check: boolean;
        blocked_gate_checks: string[];
        manual_qa_status: string;
        operator_qa_pass_text: string;
        package_lock_changed: boolean;
        real_doc_capability_added: boolean;
      };
    };
    const state = featureList.v0971_browser_qa_status_checklist_polish;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.app_header_head_check).toBe(true);
    expect(state.settings_current_checkpoint_check).toBe(true);
    expect(state.version_head_check).toBe(true);
    expect(state.health_fake_only_check).toBe(true);
    expect(state.blocked_gate_checks).toContain("queue-015");
    expect(state.blocked_gate_checks).toContain("v0.9.12C");
    expect(state.blocked_gate_checks).toContain("Next/PostCSS");
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.operator_qa_pass_text).toBe(
      "OPERATOR_QA_PASS for /home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_68_to_v0_9_72_accepted_pushed_state_runtime_status_freshness_bundle_20260701T094248Z"
    );
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_capability_added).toBe(false);
  });
});
