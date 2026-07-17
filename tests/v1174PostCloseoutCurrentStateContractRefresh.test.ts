import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("v1.1.74 contract refresh", () => {
  it("keeps exact current and historical roles in static repo-owned metadata", () => {
    const contract = readFileSync("tests/fixtures/current-accepted-pushed-state-v1.1.72.json", "utf8");
    const doc = readFileSync("docs/v1.1.74-post-closeout-current-state-contract-refresh.md", "utf8");
    expect(contract).toContain('"accepted_pushed_short_commit": "ab1878e"');
    expect(contract).toContain('"short_commit": "0cb007d"');
    expect(contract).not.toContain('"accepted_pushed_short_commit": "0cb007d"');
    expect(contract).not.toContain("readFileSync");
    expect(contract).not.toContain("readdirSync");
    expect(doc).toContain("does not read proof directories at runtime");
  });
});
