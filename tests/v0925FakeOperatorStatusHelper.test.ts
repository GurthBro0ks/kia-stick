import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.25-fake-operator-status-helper";
const docPath = "docs/v0.9.25-fake-operator-status-helper.md";
const scriptPath = resolve("scripts/fake-browser-qa-evidence.mjs");
const acceptedCommit = "c5d12a004f4c9d270260ee860781b99421a938dd";
const acceptedProofDir = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_18_to_v0_9_22_fake_only_qa_evidence_proof_readiness_bundle_20260628T111708Z/closeout_push_20260628T120057Z";

interface QaModule {
  buildFakeBrowserQaEvidence(options?: { root?: string; phase?: string }): {
    phase: string;
    proofReviewField: string;
    manualQaStatus: string;
    pushedState: string;
    acceptedPushedCommit: string;
    acceptedPushedProofDir: string;
    acceptedPushedValidation: string;
    acceptedPushedManualQaStatus: string;
    operatorStatusSurface: string;
    queue015Status: string;
    nextPostcssStatus: string;
    realDocCapabilityBlocked: boolean;
    browserDocumentIntakeBlocked: boolean;
  };
  renderMarkdownEvidence(packet: unknown): string;
}

async function loadModule(): Promise<QaModule> {
  return (await import(pathToFileURL(scriptPath).href)) as QaModule;
}

describe("v0.9.25 fake operator status helper", () => {
  it("documents accepted baseline and operator status fields in the helper", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "accepted pushed baseline phase",
      "accepted pushed commit",
      "accepted pushed closeout proof directory",
      "operator status surface: `Settings`",
      "Manual QA is `PASS`",
      "writes only under `/home/mint/kia-stick-local-proofs` or the system temp directory",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("exports current local pending state plus accepted pushed baseline fields", async () => {
    const mod = await loadModule();
    const packet = mod.buildFakeBrowserQaEvidence({ root: process.cwd() });
    const markdown = mod.renderMarkdownEvidence(packet);
    const outDir = mkdtempSync(join(tmpdir(), "kia-v0925-helper-"));

    expect(packet.proofReviewField).toBe("PASS_READY_FOR_CLOSEOUT_REVIEW");
    expect(packet.manualQaStatus).toBe("PASS");
    expect(packet.pushedState).toBe("no");
    expect(packet.acceptedPushedCommit).toBe(acceptedCommit);
    expect(packet.acceptedPushedProofDir).toBe(acceptedProofDir);
    expect(packet.acceptedPushedValidation).toBe("PASS");
    expect(packet.acceptedPushedManualQaStatus).toBe("PASS");
    expect(packet.operatorStatusSurface).toBe("Settings");
    expect(packet.queue015Status).toBe("blocked");
    expect(packet.nextPostcssStatus).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(packet.realDocCapabilityBlocked).toBe(true);
    expect(packet.browserDocumentIntakeBlocked).toBe(true);
    expect(markdown).toContain(`ACCEPTED_PUSHED_COMMIT=${acceptedCommit}`);
    expect(markdown).toContain(`ACCEPTED_PUSHED_PROOF_DIR=${acceptedProofDir}`);
    expect(markdown).toContain("OPERATOR_STATUS_SURFACE=Settings");

    const script = readFileSync(scriptPath, "utf8");
    expect(script).not.toMatch(/playwright|puppeteer|selenium|showOpenFilePicker|showDirectoryPicker|webkitdirectory|readAsText|readAsArrayBuffer|createReadStream|multer/i);
    expect(outDir).toContain(tmpdir());
  });
});
