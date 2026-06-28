import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.19-fake-browser-qa-evidence-helper";
const docPath = "docs/v0.9.19-fake-browser-qa-evidence-helper.md";
const scriptPath = resolve("scripts/fake-browser-qa-evidence.mjs");

interface QaModule {
  buildFakeBrowserQaEvidence(options?: { root?: string; phase?: string }): {
    browserAutomationStatus: string;
    manualQaStatus: string;
    queue015Status: string;
    surfaces: Array<{ name: string; check: string }>;
    realDocCapabilityBlocked: boolean;
    browserDocumentIntakeBlocked: boolean;
  };
  renderMarkdownEvidence(packet: unknown): string;
}

async function loadModule(): Promise<QaModule> {
  return (await import(pathToFileURL(scriptPath).href)) as QaModule;
}

describe("v0.9.19 fake browser QA evidence helper", () => {
  it("documents deterministic manual checklist/export coverage for all browser QA surfaces", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "scripts/fake-browser-qa-evidence.mjs",
      "Browser automation status: `manual_checklist_export`",
      "Chat",
      "Sources",
      "Saved",
      "Upload",
      "Vault",
      "Import",
      "Settings",
      "`/version`",
      "`/health`",
      "No real documents are read",
      "No file picker, FileReader, upload handler",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("builds proof-safe fake-only evidence without new dependencies or browser intake code", async () => {
    const mod = await loadModule();
    const packet = mod.buildFakeBrowserQaEvidence({ root: process.cwd(), phase });
    const markdown = mod.renderMarkdownEvidence(packet);
    const script = readFileSync(scriptPath, "utf8");

    expect(packet.browserAutomationStatus).toBe("manual_checklist_export");
    expect(packet.manualQaStatus).toBe("PENDING");
    expect(packet.queue015Status).toBe("blocked");
    expect(packet.realDocCapabilityBlocked).toBe(true);
    expect(packet.browserDocumentIntakeBlocked).toBe(true);
    expect(packet.surfaces.map((surface) => surface.name)).toEqual([
      "Chat",
      "Sources",
      "Saved",
      "Upload",
      "Vault",
      "Import",
      "Settings",
      "/version",
      "/health",
    ]);
    expect(markdown).toContain("PROOF_SAFE_OUTPUT_ONLY=yes");
    expect(script).not.toMatch(/playwright|puppeteer|selenium|showOpenFilePicker|showDirectoryPicker|webkitdirectory|readAsText|readAsArrayBuffer|createReadStream|multer/i);
  });

  it("writes only to safe proof roots and rejects arbitrary output directories", () => {
    const outDir = mkdtempSync(join(tmpdir(), "kia-fake-browser-qa-"));
    const write = spawnSync("node", [scriptPath, "--out-dir", outDir], { encoding: "utf8" });
    const reject = spawnSync("node", [scriptPath, "--out-dir", "/home/mint"], { encoding: "utf8" });

    expect(write.status).toBe(0);
    expect(readFileSync(join(outDir, "FAKE_BROWSER_QA_EVIDENCE.md"), "utf8")).toContain("Fake Browser QA Evidence Checklist");
    expect(readFileSync(join(outDir, "FAKE_BROWSER_QA_EVIDENCE.json"), "utf8")).toContain("manual_checklist_export");
    expect(reject.status).not.toBe(0);
    expect(reject.stderr).toContain("Refusing to write QA evidence outside");
  });
});
