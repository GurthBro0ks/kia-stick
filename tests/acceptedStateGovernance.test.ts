import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";

const immutableHistoricalFixture = "tests/fixtures/current-accepted-pushed-state-v1.1.72.json";

describe("accepted-state governance loop break", () => {
  it("records pushed Bundle 2 as current while retaining Bundle 1 as history", () => {
    expect(currentAcceptedPushedState.checkpoint_kind).toBe("capability");
    expect(currentAcceptedPushedState.checkpoint_label).toBe("Public Steward Workflow Platform Bundle 2 and Employee Claims Copy Repair at 3baedc9");
    expect(currentAcceptedPushedState.accepted_bundle).toBe("KIA-Stick-public-steward-workflow-platform-bundle-2");
    expect(currentAcceptedPushedState.accepted_pushed_commit).toBe("3baedc9c327fbb7a528706ec442a63f88172e425");
    expect(currentAcceptedPushedState.accepted_pushed_short_commit).toBe("3baedc9");
    expect(currentAcceptedPushedState.repository_recording_commit).toBe("b23810834bd02eeef7cd0cbf03d8ab274d08917b");
    expect(currentAcceptedPushedState.repository_recording_short_commit).toBe("b238108");
    expect(currentAcceptedPushedState.accepted_equality).toContain("HEAD == origin/main == remote main == b23810834bd02eeef7cd0cbf03d8ab274d08917b");
    expect(currentAcceptedPushedState.accepted_equality).not.toContain("HEAD == origin/main == remote main == 3baedc9c");
    expect(currentAcceptedPushedState.accepted_pushed_proof_dir).toContain("closeout_push_20260731T112937Z");
    expect(currentAcceptedPushedState.historical_prior_checkpoints[0]).toEqual({
      checkpoint: "Public Steward Workflow Platform Bundle 1 and Discipline Copy Repair",
      commit: "ea0ce8de9cd6b85b56528fabc9e8ca7f8bf43a52",
      short_commit: "ea0ce8d",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[1]).toEqual({
      checkpoint: "Public CBA Annual-Leave Cited Grievance Outline and Automatic Routing Repair",
      commit: "9a66d37148f37d2dee16bcbe6b9a12aa4ba9946a",
      short_commit: "9a66d37",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[2]).toEqual({
      checkpoint: "Public Settings User Summary and Operator Diagnostics Split",
      commit: "76c73122a87cb23b5b8595a002d54d7a127fbba8",
      short_commit: "76c7312",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[3]).toEqual({
      checkpoint: "CBA Citation Durability Source Instance and Resync Drift Guard",
      commit: "1e0e96b0e0cd95d1e62af1eb76cfd5b57c43f4e8",
      short_commit: "1e0e96b",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[4]).toEqual({
      checkpoint: "Public Truth and Generic CBA Routing Repair",
      commit: "571436a59a7d09756b401912906377c6257680af",
      short_commit: "571436a",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.historical_prior_checkpoints[5]).toEqual({
      checkpoint: "Public Data Pilot 1B",
      commit: "006da8dc25638cdbe5ebd43b04b5b5c506056ab9",
      short_commit: "006da8d",
      status: "historical_only_not_current",
    });
    expect(currentAcceptedPushedState.data_modes).toEqual({
      fake_corpus: "available",
      public_sources: "available_exact_allowlisted",
      private_data: "blocked",
      external_ai: "disabled",
    });
    expect(currentAcceptedPushedState.local_implementation_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_bundle_2_final_post_push_accepted_state_refresh_to_b238108_20260731T115400Z");
    expect(currentAcceptedPushedState.local_bundle_operator_qa_pass_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_bundle_2_final_post_push_accepted_state_refresh_to_b238108_operator_qa_pass_recording_20260731T120818Z");
    expect(currentAcceptedPushedState.local_bundle_phase).toBe("KIA-Stick-public-steward-workflow-platform-bundle-2-final-post-push-accepted-state-refresh-to-b238108");
    expect(currentAcceptedPushedState.local_bundle_status).toBe("public steward workflow platform bundle 2 final post-push accepted-state refresh to b238108; validation PASS; pushed no; manual QA PASS; closeout pending explicit authorization");
    expect(currentAcceptedPushedState.local_bundle_status).not.toContain("stale local-bundle push-status repair");
    expect(currentAcceptedPushedState.latest_pushed_closeout_commit).toBe("b23810834bd02eeef7cd0cbf03d8ab274d08917b");
    expect(currentAcceptedPushedState.latest_pushed_closeout_short_commit).toBe("b238108");
    expect(currentAcceptedPushedState.latest_pushed_closeout_status).toContain("pushed yes");
    expect(currentAcceptedPushedState.latest_pushed_closeout_status).toContain("repository equality at b23810834bd02eeef7cd0cbf03d8ab274d08917b");
    expect(currentAcceptedPushedState.local_bundle_status).not.toContain("pushed yes");
    expect([
      currentAcceptedPushedState.accepted_pushed_commit,
      currentAcceptedPushedState.repository_recording_commit,
      currentAcceptedPushedState.latest_pushed_closeout_commit,
    ]).toEqual([
      "3baedc9c327fbb7a528706ec442a63f88172e425",
      "b23810834bd02eeef7cd0cbf03d8ab274d08917b",
      "b23810834bd02eeef7cd0cbf03d8ab274d08917b",
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
