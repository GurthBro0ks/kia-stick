import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";

const immutableHistoricalFixture = "tests/fixtures/current-accepted-pushed-state-v1.1.72.json";

describe("accepted-state governance loop break", () => {
  it("records the pushed public-truth repair as current while retaining Pilot 1B as history", () => {
    expect(currentAcceptedPushedState.checkpoint_kind).toBe("capability");
    expect(currentAcceptedPushedState.checkpoint_label).toBe("Public Truth and Generic CBA Routing Repair at 571436a");
    expect(currentAcceptedPushedState.accepted_bundle).toBe("KIA-Stick-public-truth-and-generic-CBA-retrieval-routing-repair");
    expect(currentAcceptedPushedState.accepted_pushed_commit).toBe("571436a59a7d09756b401912906377c6257680af");
    expect(currentAcceptedPushedState.accepted_pushed_short_commit).toBe("571436a");
    expect(currentAcceptedPushedState.accepted_pushed_proof_dir).toContain("closeout_push_20260721T131958Z");
    expect(currentAcceptedPushedState.historical_prior_checkpoints[0]).toEqual({
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
    expect(currentAcceptedPushedState.local_implementation_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_cba_citation_durability_source_instance_resync_drift_guard_20260721T134506Z");
    expect(currentAcceptedPushedState.local_bundle_operator_qa_pass_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_cba_citation_durability_source_instance_resync_drift_guard_operator_qa_pass_recording_20260721T143005Z");
    expect(currentAcceptedPushedState.local_bundle_status).toBe("citation durability/source-instance/resync-drift implementation; validation PASS; pushed no; manual QA PASS");
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
