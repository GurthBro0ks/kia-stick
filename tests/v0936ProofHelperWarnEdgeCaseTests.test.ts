import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

const phase = "KIA-Stick-v0.9.36-proof-helper-warn-edge-case-tests";
const docPath = "docs/v0.9.36-proof-helper-warn-edge-case-tests.md";
const scriptPath = resolve("scripts/closeout-helper.mjs");

interface CloseoutModule {
  proofHasAcceptedWarn(markdown: string): boolean;
  assessCloseout(input: {
    proof: { exists: boolean; result: string; warnFailFree: boolean; acceptedWarn?: boolean; flags: string[] };
    git: { dirty: boolean; ahead: number; branch: string };
    queue: { ok: boolean; item: { id: string; status: string } | null; error?: string };
  }): { status: string; nextAction: string; stopOnWarnFail: boolean; queueAcceptanceAllowed: boolean; issues: Array<{ code: string }> };
}

async function loadModule(): Promise<CloseoutModule> {
  return (await import(pathToFileURL(scriptPath).href)) as CloseoutModule;
}

describe("v0.9.36 proof helper WARN edge-case tests", () => {
  it("documents accepted-WARN edge cases and fake-only boundary expectations", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Explicit `RESULT=WARN` plus `ACCEPTED_WARN`",
      "Accepted-WARN proof output remains WARN and requires review.",
      "PASS is not used for unresolved Next target research.",
      "Unaccepted WARN remains `WARN_REVIEW_REQUIRED`.",
      "`package-lock.json` unchanged",
      "queue-015 blocked",
      "v0.9.12C blocked",
      "Next/PostCSS parked",
      "real-doc capability blocked",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("allows accepted-WARN only as parked review state and keeps queue acceptance blocked", async () => {
    const mod = await loadModule();
    const acceptedWarnMarkdown = "RESULT=WARN\nWARN_REASON=no exact clean Next target proven\nMANUAL_QA_STATUS=ACCEPTED_WARN\n";
    const accepted = mod.assessCloseout({
      proof: { exists: true, result: "WARN", warnFailFree: false, acceptedWarn: true, flags: [] },
      git: { dirty: false, ahead: 0, branch: "main" },
      queue: { ok: true, item: { id: "queue-fixture", status: "ready_to_push" } },
    });
    const unaccepted = mod.assessCloseout({
      proof: { exists: true, result: "WARN", warnFailFree: false, acceptedWarn: false, flags: [] },
      git: { dirty: false, ahead: 0, branch: "main" },
      queue: { ok: true, item: { id: "queue-fixture", status: "ready_to_push" } },
    });

    expect(mod.proofHasAcceptedWarn(acceptedWarnMarkdown)).toBe(true);
    expect(mod.proofHasAcceptedWarn("RESULT=WARN\nWARN_REASON=missing acceptance\n")).toBe(false);
    expect(accepted.status).toBe("WARN");
    expect(accepted.issues.map((issue) => issue.code)).toContain("proof_result_accepted_warn");
    expect(accepted.issues.map((issue) => issue.code)).toContain("proof_accepted_warn_text");
    expect(accepted.nextAction).toContain("accepted-WARN parked state");
    expect(accepted.queueAcceptanceAllowed).toBe(false);
    expect(accepted.stopOnWarnFail).toBe(true);
    expect(unaccepted.issues.map((issue) => issue.code)).toContain("proof_result_not_pass");
    expect(unaccepted.nextAction).toContain("fix proof warnings");
  });
});
