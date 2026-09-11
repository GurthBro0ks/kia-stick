import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";

const immutableHistoricalFixture = "tests/fixtures/current-accepted-pushed-state-v1.1.72.json";

describe("accepted-state governance loop break", () => {
  it("records the pushed source and citation integrity hardening capability while retaining export/print repair history", () => {
    expect(currentAcceptedPushedState.checkpoint_kind).toBe("capability");
    expect(currentAcceptedPushedState.checkpoint_label).toBe("Source and Citation Integrity Hardening at 9b0fda9");
    expect(currentAcceptedPushedState.accepted_bundle).toBe("KIA-Stick-post-Bundle-3-source-citation-integrity-hardening-implementation");
    expect(currentAcceptedPushedState.accepted_pushed_commit).toBe("9b0fda9f562fb7e632e571e6299eb2dcc77b7b1e");
    expect(currentAcceptedPushedState.accepted_pushed_short_commit).toBe("9b0fda9");
    expect(currentAcceptedPushedState.repository_recording_commit).toBe("ca091d37fd8ff5c8f63fad084b81e5f59a749797");
    expect(currentAcceptedPushedState.repository_recording_short_commit).toBe("ca091d3");
    expect(currentAcceptedPushedState.accepted_equality).toContain("HEAD == origin/main == remote main == ca091d37fd8ff5c8f63fad084b81e5f59a749797");
    expect(currentAcceptedPushedState.accepted_equality).not.toContain("HEAD == origin/main == remote main == 9b0fda9f");
    expect(currentAcceptedPushedState.accepted_pushed_proof_dir).toContain("push_blocker_resolution_20260910T143632Z");
    expect(currentAcceptedPushedState.historical_prior_checkpoints[0]).toEqual({
      checkpoint: "Export and Print Copy Helper False-Positive and Runtime Truth Repair",
      commit: "76653608353ab0bb59210aa6fb241346efeb82a9",
      short_commit: "7665360",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[1]).toEqual({
      checkpoint: "Accessibility and Saved-State Resilience QA Failure Repair",
      commit: "996032370846952e59756caa23cde2eed9a1d458",
      short_commit: "9960323",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[2]).toEqual({
      checkpoint: "Public Steward Workflow Platform Bundle 3 Core Repairs and Runtime Truth/Favicon Fix",
      commit: "e8a4499c6bac349566d0f9eeb66d15d497bcd602",
      short_commit: "e8a4499",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[3]).toEqual({
      checkpoint: "Public Steward Workflow Platform Bundle 3 and Multi-Topic Ambiguity Fail-Closed Repair",
      commit: "96be9069e7694af237823b0da3a30919be60546c",
      short_commit: "96be906",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[4]).toEqual({
      checkpoint: "Public Steward Workflow Platform Bundle 2 and Employee Claims Copy Repair",
      commit: "3baedc9c327fbb7a528706ec442a63f88172e425",
      short_commit: "3baedc9",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[5]).toEqual({
      checkpoint: "Public Steward Workflow Platform Bundle 1 and Discipline Copy Repair",
      commit: "ea0ce8de9cd6b85b56528fabc9e8ca7f8bf43a52",
      short_commit: "ea0ce8d",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[6]).toEqual({
      checkpoint: "Public CBA Annual-Leave Cited Grievance Outline and Automatic Routing Repair",
      commit: "9a66d37148f37d2dee16bcbe6b9a12aa4ba9946a",
      short_commit: "9a66d37",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[7]).toEqual({
      checkpoint: "Public Settings User Summary and Operator Diagnostics Split",
      commit: "76c73122a87cb23b5b8595a002d54d7a127fbba8",
      short_commit: "76c7312",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[8]).toEqual({
      checkpoint: "CBA Citation Durability Source Instance and Resync Drift Guard",
      commit: "1e0e96b0e0cd95d1e62af1eb76cfd5b57c43f4e8",
      short_commit: "1e0e96b",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[9]).toEqual({
      checkpoint: "Public Truth and Generic CBA Routing Repair",
      commit: "571436a59a7d09756b401912906377c6257680af",
      short_commit: "571436a",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.data_modes).toEqual({
      fake_corpus: "available",
      public_sources: "available_exact_allowlisted",
      private_data: "blocked",
      external_ai: "disabled",
    });
    expect(currentAcceptedPushedState.local_implementation_proof_dir).toBe("/home/slimy/.local/state/kia-stick/proofs/proof_kia_stick_source_citation_integrity_accepted_state_promotion_operator_qa_pass_recording_20260911T105246Z");
    expect(currentAcceptedPushedState.local_bundle_operator_qa_pass_proof_dir).toBe("/home/slimy/.local/state/kia-stick/proofs/proof_kia_stick_source_citation_integrity_accepted_state_promotion_operator_qa_pass_recording_20260911T105246Z");
    expect(currentAcceptedPushedState.operator_qa_pass_proof_dir).toBe("/home/slimy/.local/state/kia-stick/proofs/proof_kia_stick_source_citation_integrity_omarchy_operator_qa_pass_recording_20260909T152344Z");
    expect(currentAcceptedPushedState.local_bundle).toBe("Source and Citation Integrity Post-Push Accepted-State Promotion");
    expect(currentAcceptedPushedState.local_bundle_phase).toBe("KIA-Stick-source-citation-integrity-post-push-accepted-state-promotion");
    expect(currentAcceptedPushedState.local_bundle_validation).toBe("PASS");
    expect(currentAcceptedPushedState.local_bundle_pushed).toBe(false);
    expect(currentAcceptedPushedState.local_bundle_manual_qa).toBe("PASS");
    expect(currentAcceptedPushedState.local_bundle_status).toBe("source and citation integrity post-push accepted-state promotion; validation PASS; pushed no; manual QA PASS");
    expect(currentAcceptedPushedState.local_bundle_status).not.toContain("stale local-bundle push-status repair");
    expect(currentAcceptedPushedState.latest_pushed_closeout_commit).toBe("ca091d37fd8ff5c8f63fad084b81e5f59a749797");
    expect(currentAcceptedPushedState.latest_pushed_closeout_short_commit).toBe("ca091d3");
    expect(currentAcceptedPushedState.latest_pushed_closeout_status).toContain("pushed yes");
    expect(currentAcceptedPushedState.latest_pushed_closeout_status).toContain("repository equality at ca091d37fd8ff5c8f63fad084b81e5f59a749797");
    expect(currentAcceptedPushedState.local_bundle_status).not.toContain("pushed yes");
    expect([
      currentAcceptedPushedState.accepted_pushed_commit,
      currentAcceptedPushedState.repository_recording_commit,
      currentAcceptedPushedState.latest_pushed_closeout_commit,
    ]).toEqual([
      "9b0fda9f562fb7e632e571e6299eb2dcc77b7b1e",
      "ca091d37fd8ff5c8f63fad084b81e5f59a749797",
      "ca091d37fd8ff5c8f63fad084b81e5f59a749797",
    ]);
    expect(new Set([
      currentAcceptedPushedState.accepted_pushed_commit,
      currentAcceptedPushedState.repository_recording_commit,
      currentAcceptedPushedState.latest_pushed_closeout_commit,
    ]).size).toBe(2);
    expect(currentAcceptedPushedState.repository_recording_commit)
      .toBe(currentAcceptedPushedState.latest_pushed_closeout_commit);
    expect(new Set(currentAcceptedPushedState.historical_prior_checkpoints.map((item) => item.commit)).size)
      .toBe(currentAcceptedPushedState.historical_prior_checkpoints.length);
  });

  it("keeps historical checkpoint assertions on one immutable v1.1.72 fixture", () => {
    const fixture = JSON.parse(readFileSync(immutableHistoricalFixture, "utf8"));
    expect(fixture.checkpoint_label).toBe("v1.1.72 at ab1878e");
    const historicalLiveReads = spawnSync("rg", [
      "-l",
      'readFileSync\\("data/current-accepted-pushed-state\\.json"|const contractPath = "data/current-accepted-pushed-state\\.json"',
      "tests",
    ], { encoding: "utf8" });
    expect(historicalLiveReads.status).toBe(1);
    expect(historicalLiveReads.stdout).toBe("");
  });

  it("bounds direct current-baseline consumers to a small explicit set", () => {
    const result = spawnSync("rg", [
      "-l",
      '^import .*@/data/current-accepted-pushed-state\\.json|^export const CURRENT_ACCEPTED_PUSHED_STATE_PATH = "data/current-accepted-pushed-state\\.json"',
      "app",
      "components",
      "lib",
      "scripts",
      "tests",
    ], { encoding: "utf8" });
    expect(result.status).toBe(0);
    const consumers = result.stdout.trim().split("\n").filter(Boolean).sort();
    expect(consumers.length).toBeLessThanOrEqual(10);
    expect(consumers).toEqual([
      "lib/acceptedState.ts",
      "scripts/accepted-state.mjs",
      "tests/acceptedStateGovernance.test.ts",
      "tests/helpers/currentAcceptedState.ts",
    ]);
  });

  it("routes Settings, closeout helper, proof index, and current tests through shared helpers", () => {
    expect(readFileSync("components/KiaStickApp.tsx", "utf8")).toContain('from "@/lib/acceptedState"');
    expect(readFileSync("scripts/closeout-helper.mjs", "utf8")).toContain('from "./accepted-state.mjs"');
    expect(readFileSync("scripts/local-proof-index.mjs", "utf8")).toContain('from "./accepted-state.mjs"');
    expect(readFileSync("tests/helpers/currentAcceptedState.ts", "utf8")).toContain('from "@/data/current-accepted-pushed-state.json"');
  });

  it("does not create another five-version bookkeeping ladder", () => {
    const docs = spawnSync("rg", ["--files", "docs"], { encoding: "utf8" }).stdout;
    expect(docs).not.toMatch(/v1\.1\.(78|79|80|81|82)-/);
    expect(currentAcceptedPushedState.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(currentAcceptedPushedState.v0912c_status).toBe("blocked_pending_exact_target");
    expect(currentAcceptedPushedState.queue_015_status).toBe("blocked");
    expect(currentAcceptedPushedState.package_version).toBe("0.7.0");
  });
});
