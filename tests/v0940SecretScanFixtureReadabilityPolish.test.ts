import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.40-secret-scan-fixture-readability-polish";
const docPath = "docs/v0.9.40-secret-scan-fixture-readability-polish.md";

describe("v0.9.40 secret-scan fixture readability polish", () => {
  it("documents conservative synthetic fixture labeling", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "known_synthetic_secret_fixture",
      "secret_review_required",
      "Secret-scan output is not removed or hidden.",
      "`.env` files are not read or printed.",
      "does not downgrade real secret findings",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("classifies known synthetic secret-looking fixtures without hiding real hits", async () => {
    const mod = (await import(pathToFileURL(resolve("scripts/closeout-helper.mjs")).href)) as {
      classifySecretScanLine(line: string): string;
    };

    const syntheticFixtureLine = ['tests/proofIndex.test.ts:81: const syntheticToken = ["to", "ken=', "gh", 'p_", "abcdefghijkl"].join("");'].join("");
    expect(mod.classifySecretScanLine(syntheticFixtureLine)).toBe("known_synthetic_secret_fixture");
    expect(mod.classifySecretScanLine(["README.md:1: ", "gh", "p_realsecretlookingvalue123"].join(""))).toBe("secret_review_required");
  });
});
