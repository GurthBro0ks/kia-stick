import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.24 current-state contract refresh", () => {
  it("keeps the contract static, fake-only, and free of stale current baselines", () => {
    const contract = readFileSync("data/current-accepted-pushed-state.json", "utf8");
    const doc = readFileSync("docs/v1.1.24-post-closeout-current-state-contract-refresh.md", "utf8");
    expect(contract).toContain('"accepted_pushed_short_commit": "ac23ed9"');
    expect(contract).toContain('"short_commit": "aa8f8c6"');
    expect(doc).toContain("does not read proof directories at runtime");
    expect(contract).not.toContain('"accepted_pushed_short_commit": "aa8f8c6"');
  });
});
