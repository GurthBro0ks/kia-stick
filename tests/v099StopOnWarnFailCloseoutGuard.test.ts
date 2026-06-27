import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.9-stop-on-warn-fail-closeout-guard";
const docPath = "docs/v0.9.9-stop-on-warn-fail-closeout-guard.md";
const scriptPath = "scripts/closeout-helper.mjs";

interface CloseoutModule {
  assessCloseout(input: {
    proof: { exists: boolean; result: string; warnFailFree: boolean; flags: string[] };
    git: { dirty: boolean; ahead: number; branch: string };
    queue: { ok: boolean; item: { id: string; status: string } | null; error?: string };
  }): { status: string; nextAction: string; stopOnWarnFail: boolean; queueAcceptanceAllowed: boolean; issues: Array<{ code: string }> };
}

async function loadModule(): Promise<CloseoutModule> {
  return (await import(pathToFileURL(scriptPath).href)) as CloseoutModule;
}

describe("v0.9.9 stop-on-WARN/FAIL closeout guard", () => {
  it("documents stop-on-WARN/FAIL closeout behavior", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("If proof, report, validation, queue, or safety output says `WARN`, stop");
    expect(doc).toContain("If proof, report, validation, queue, or safety output says `FAIL`, stop");
    expect(doc).toContain("must not move to accepted while unresolved `WARN` or `FAIL` evidence exists");
    expect(doc).toContain("Missing proof may be `WARN` unless replacement proof is explicitly recorded");
    expect(doc).toContain("does not mutate queue state and does not push");
  });

  it("blocks queue acceptance when closeout is WARN", async () => {
    const mod = await loadModule();
    const assessment = mod.assessCloseout({
      proof: { exists: true, result: "PASS", warnFailFree: false, flags: [] },
      git: { dirty: false, ahead: 0, branch: "main" },
      queue: { ok: true, item: { id: "queue-055-v0910-synthetic-governance-hardening-checkpoint", status: "needs_review" } },
    });

    expect(assessment.status).toBe("WARN");
    expect(assessment.stopOnWarnFail).toBe(true);
    expect(assessment.queueAcceptanceAllowed).toBe(false);
    expect(assessment.issues.map((issue) => issue.code)).toContain("proof_warn_fail_text");
  });

  it("allows queue acceptance only when proof, git, and queue are clear", async () => {
    const mod = await loadModule();
    const assessment = mod.assessCloseout({
      proof: { exists: true, result: "PASS", warnFailFree: true, flags: [] },
      git: { dirty: false, ahead: 0, branch: "main" },
      queue: { ok: true, item: { id: "queue-055-v0910-synthetic-governance-hardening-checkpoint", status: "accepted" } },
    });

    expect(assessment.status).toBe("PASS");
    expect(assessment.stopOnWarnFail).toBe(false);
    expect(assessment.queueAcceptanceAllowed).toBe(true);
  });
});
