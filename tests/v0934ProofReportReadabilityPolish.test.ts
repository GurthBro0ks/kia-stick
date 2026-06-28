import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.34-proof-report-readability-polish";
const docPath = "docs/v0.9.34-proof-report-readability-polish.md";
const scriptPath = resolve("scripts/local-proof-index.mjs");

interface LocalProofIndexModule {
  discoverLocalProofs(root?: string): Array<{
    result: string;
    acceptedWarn: boolean;
    reviewState: string;
    resultMdExists: boolean;
    warnings: string[];
  }>;
}

async function loadModule(): Promise<LocalProofIndexModule> {
  return (await import(pathToFileURL(scriptPath).href)) as LocalProofIndexModule;
}

function makeProof(root: string, result: string): void {
  const dir = join(root, "proof_kia_stick_v0_9_32_warn_20260628T155630Z");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "RESULT.md"), result);
}

describe("v0.9.34 proof/report readability polish", () => {
  it("documents accepted-WARN proof readability rules", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "`RESULT=PASS` remains the only clean proof result.",
      "`RESULT=WARN` with explicit `ACCEPTED_WARN`",
      "`ACCEPTED_WARN_PARKED`",
      "Accepted WARN is not treated as PASS.",
      "Unaccepted WARN remains `WARN_REVIEW_REQUIRED`.",
      "`scripts/local-proof-index.mjs` adds a `review_state` label",
      "`scripts/closeout-helper.mjs` reports `proof_accepted_warn=yes`",
      "Closeout review still returns WARN for accepted-WARN proof",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("labels explicit accepted-WARN proof as parked without making it PASS", async () => {
    const mod = await loadModule();
    const root = mkdtempSync(join(tmpdir(), "kia-accepted-warn-proof-"));
    makeProof(root, "RESULT=WARN\nWARN_REASON=no exact clean Next target proven\nMANUAL_QA_STATUS=ACCEPTED_WARN\n");

    const [proof] = mod.discoverLocalProofs(root);
    const cli = spawnSync("node", [scriptPath, "latest", "--root", root], { encoding: "utf8" });

    expect(proof.result).toBe("WARN");
    expect(proof.acceptedWarn).toBe(true);
    expect(proof.reviewState).toBe("ACCEPTED_WARN_PARKED");
    expect(proof.resultMdExists).toBe(true);
    expect(proof.warnings).toEqual([]);
    expect(cli.status).toBe(0);
    expect(cli.stdout).toContain("result=WARN");
    expect(cli.stdout).toContain("review_state=ACCEPTED_WARN_PARKED");
    expect(cli.stdout).not.toContain("result=PASS");
  });
});
