import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.99-post-closeout-current-state-contract-refresh";
const docPath = "docs/v0.9.99-post-closeout-current-state-contract-refresh.md";

describe("v0.9.99 post-closeout current state contract refresh", () => {
  it("documents the post-closeout static contract refresh", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Contract file: `data/current-accepted-pushed-state.json`",
      "Current accepted pushed checkpoint: `v0.9.97 at dfa7052`",
      "Current accepted pushed commit: `dfa7052e5bd87e8e96362c0e93565a29409964b3`",
      "The contract marks `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, and `1465817` as historical only, not current.",
      "After every future closeout push, refresh this current accepted pushed state contract in a separate fake-only checkpoint before doing baseline-sensitive UI or tooling work.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("makes 20485da current and older baselines historical in the contract", () => {
    const contract = JSON.parse(readFileSync("data/current-accepted-pushed-state.json", "utf8")) as {
      checkpoint_label: string;
      accepted_pushed_commit: string;
      accepted_pushed_short_commit: string;
      historical_prior_checkpoints: Array<{ short_commit: string; status: string }>;
    };

    expect(contract.checkpoint_label).toBe("v1.0.17 at b4b9fcf");
    expect(contract.accepted_pushed_commit).toBe("b4b9fcfce31108b09350e7d304fd1cff105edc31");
    expect(contract.accepted_pushed_short_commit).toBe("b4b9fcf");
    expect(contract.historical_prior_checkpoints.map((checkpoint) => checkpoint.short_commit)).toEqual([
      "20485da",
      "97574a9",
      "80e91c7",
      "dfa7052",
      "c72f14f",
      "d20e125",
      "bc8fbef",
      "cfa7c2c",
      "1465817",
    ]);
    expect(contract.historical_prior_checkpoints.every((checkpoint) => checkpoint.status === "historical_only_not_current")).toBe(true);
  });
});
