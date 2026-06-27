import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.8-synthetic-governance-report-hardening";
const docPath = "docs/v0.9.8-synthetic-governance-report-hardening.md";
const scriptPath = "scripts/synthetic-governance-report.mjs";

function runReport(args: string[] = []) {
  return spawnSync("node", [scriptPath, ...args], { cwd: process.cwd(), encoding: "utf8" });
}

describe("v0.9.8 synthetic governance report hardening", () => {
  it("documents report hardening requirements", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("built-in synthetic fixtures and fixed repo-owned metadata only");
    expect(doc).toContain("PASS fixtures");
    expect(doc).toContain("WARN fixtures");
    expect(doc).toContain("FAIL fixtures");
    expect(doc).toContain("stopOnWarnFail: true");
  });

  it("prints counts, queue guard, synthetic-only guard, and stop rule", () => {
    const result = runReport();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Report status: PASS");
    expect(result.stdout).toContain("PASS fixtures: 1");
    expect(result.stdout).toContain("WARN fixtures: 3");
    expect(result.stdout).toContain("FAIL fixtures: 12");
    expect(result.stdout).toContain("queue015Status: blocked");
    expect(result.stdout).toContain("realDocumentAccessed: false");
    expect(result.stdout).toContain("readsUserFiles: false");
    expect(result.stdout).toContain("scansDirectories: false");
    expect(result.stdout).toContain("acceptsPathArguments: false");
    expect(result.stdout).toContain("stopOnWarnFail: true");
  });

  it("keeps report output proof-safe and rejects path arguments", () => {
    const result = runReport();
    const rejected = runReport(["/tmp/not-real-input.json"]);

    expect(result.status).toBe(0);
    expect(result.stdout).not.toMatch(/\/home\/mint|\/media|\/mnt|APWU|USPS|real-documents|private-vault/i);
    expect(result.stdout).not.toMatch(/\b(?:token|cookie|secret|password|authorization)\b/i);
    expect(rejected.status).toBe(1);
    expect(rejected.stderr).toContain("Unexpected argument rejected");
    expect(rejected.stdout).toBe("");
  });
});
