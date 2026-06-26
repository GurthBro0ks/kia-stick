import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = resolve("scripts/local-proof-index.mjs");
const phase = "KIA-Stick-v0.7.11-persistent-proof-index-and-review-guide";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

interface LocalProofIndexModule {
  assertSafeProofRoot(root: string): string;
  discoverLocalProofs(root?: string): Array<{
    path: string;
    timestamp: string;
    result: string;
    resultMdExists: boolean;
    openThisFolderExists: boolean;
    screenshotsCount: number;
    warnings: string[];
  }>;
  selectLatestLocalProof<T>(proofs: T[]): T | null;
  selectLatestReviewReadyProof<T extends { result: string; resultMdExists: boolean; openThisFolderExists: boolean; screenshotsCount: number }>(
    proofs: T[]
  ): T | null;
  writeLocalProofIndex(root?: string, outDir?: string): {
    markdownPath: string;
    jsonPath: string;
    proofs: unknown[];
  };
}

async function loadModule(): Promise<LocalProofIndexModule> {
  return (await import(pathToFileURL(scriptPath).href)) as LocalProofIndexModule;
}

function makeProofRoot(): string {
  return mkdtempSync(join(tmpdir(), "kia-local-proof-index-"));
}

function makeProof(root: string, name: string, options: { result?: string; open?: boolean; screenshots?: number } = {}): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  if (options.result !== undefined) writeFileSync(join(dir, "RESULT.md"), options.result);
  if (options.open) writeFileSync(join(dir, "OPEN_THIS_FOLDER.txt"), "Open this proof folder.\n");
  if (options.screenshots) {
    const screenshotsDir = join(dir, "screenshots");
    mkdirSync(screenshotsDir);
    for (let index = 1; index <= options.screenshots; index += 1) {
      writeFileSync(join(screenshotsDir, `${String(index).padStart(2, "0")}.png`), "fake image bytes");
    }
  }
  return dir;
}

describe("local proof index", () => {
  it("lists local proof directories newest-first with proof review metadata", async () => {
    const mod = await loadModule();
    const root = makeProofRoot();
    const oldProof = makeProof(root, "proof_kia_stick_v0_7_10a_demo_20260626T080000Z", {
      result: "RESULT=PASS\n",
      open: true,
      screenshots: 2,
    });
    const latestProof = makeProof(root, "proof_kia_stick_v0_7_10b_operator_smoke_evidence_20260626T090618Z", {
      result: "RESULT=PASS\n",
      open: true,
      screenshots: 8,
    });

    const proofs = mod.discoverLocalProofs(root);
    const latest = mod.selectLatestLocalProof(proofs);
    const latestReviewReady = mod.selectLatestReviewReadyProof(proofs);

    expect(proofs.map((proof) => proof.path)).toEqual([latestProof, oldProof]);
    expect(latest?.path).toBe(latestProof);
    expect(latestReviewReady?.path).toBe(latestProof);
    expect(proofs[0].result).toBe("PASS");
    expect(proofs[0].resultMdExists).toBe(true);
    expect(proofs[0].openThisFolderExists).toBe(true);
    expect(proofs[0].screenshotsCount).toBe(8);
    expect(proofs[0].warnings).toEqual([]);
  });

  it("reports missing RESULT.md as WARN instead of accepting incomplete proof dirs", async () => {
    const mod = await loadModule();
    const root = makeProofRoot();
    makeProof(root, "proof_kia_stick_incomplete_20260626T091000Z", { open: true, screenshots: 1 });

    const [proof] = mod.discoverLocalProofs(root);

    expect(proof.result).toBe("WARN_MISSING_RESULT");
    expect(proof.resultMdExists).toBe(false);
    expect(proof.warnings).toContain("WARN_MISSING_RESULT");
  });

  it("refuses arbitrary home roots while allowing temp fixtures", async () => {
    const mod = await loadModule();
    const root = makeProofRoot();

    expect(mod.assertSafeProofRoot(root)).toBe(resolve(root));
    expect(() => mod.assertSafeProofRoot("/home/mint")).toThrow(/Refusing to inspect proof root/);
  });

  it("writes a markdown and JSON index without reading outside the proof root", async () => {
    const mod = await loadModule();
    const root = makeProofRoot();
    makeProof(root, "proof_kia_stick_v0_7_10b_operator_smoke_evidence_20260626T090618Z", {
      result: "RESULT=PASS\n",
      open: true,
      screenshots: 8,
    });

    const output = mod.writeLocalProofIndex(root, root);
    const markdown = readFileSync(output.markdownPath, "utf8");
    const json = JSON.parse(readFileSync(output.jsonPath, "utf8")) as {
      proofRoot: string;
      latestProof: string;
      latestReviewReadyProof: string;
      proofs: Array<{ screenshotsCount: number }>;
    };

    expect(existsSync(output.markdownPath)).toBe(true);
    expect(existsSync(output.jsonPath)).toBe(true);
    expect(markdown).toContain("KIA Stick Local Proof Index");
    expect(markdown).toContain("WARN");
    expect(json.proofRoot).toBe(resolve(root));
    expect(json.latestProof).toContain("proof_kia_stick_v0_7_10b_operator_smoke_evidence_20260626T090618Z");
    expect(json).toHaveProperty("latestReviewReadyProof");
    expect(json.proofs[0].screenshotsCount).toBe(8);
  });

  it("prints readable helper output from the npm-facing script", () => {
    const root = makeProofRoot();
    makeProof(root, "proof_kia_stick_v0_7_10b_operator_smoke_evidence_20260626T090618Z", {
      result: "RESULT=PASS\n",
      open: true,
      screenshots: 8,
    });

    const result = spawnSync("node", [scriptPath, "latest", "--root", root], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Latest proof:");
    expect(result.stdout).toContain("Latest review-ready proof:");
    expect(result.stdout).toContain("result=PASS");
    expect(result.stdout).toContain("open_this_folder=yes");
    expect(result.stdout).toContain("screenshots=8");
  });

  it("records v0.7.11 as fake-only proof indexing without moving product, prompt, or real-doc gates", () => {
    const doc = readFileSync("docs/v0.7.11-persistent-proof-index-review-guide.md", "utf8");
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      release_readiness: {
        product_version: string;
        package_version: string;
        prompt_version: string;
      };
      v0711_persistent_proof_index_review_guide: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
        queue_015_status: string;
        authorizes_real_doc_work: boolean;
        runtime_ui_changed: boolean;
        manual_qa_status: string;
        push_performed: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const v0711 = queue.items.find((item) => item.id === "queue-025-v0711-persistent-proof-index-review-guide");

    expect(packageJson.scripts["proof:index"]).toBe("node scripts/local-proof-index.mjs");
    expect(doc).toContain(phase);
    expect(doc).toContain("/home/mint/kia-stick-local-proofs");
    expect(doc).toContain("/home/mint/Desktop/kia-stick-proofs/LATEST_KIA_PROOF.txt");
    expect(doc).toContain("WARN_MISSING_RESULT");
    expect(doc).toContain("does not read real documents");
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v0711_persistent_proof_index_review_guide.phase).toBe(phase);
    expect(featureList.v0711_persistent_proof_index_review_guide.status).toBe("ready_to_push_validation_passed_manual_qa_pending");
    expect(featureList.v0711_persistent_proof_index_review_guide.product_version).toBe(productVersion);
    expect(featureList.v0711_persistent_proof_index_review_guide.package_version).toBe(productVersion);
    expect(featureList.v0711_persistent_proof_index_review_guide.prompt_version).toBe(promptVersion);
    expect(featureList.v0711_persistent_proof_index_review_guide.queue_015_status).toBe("blocked");
    expect(featureList.v0711_persistent_proof_index_review_guide.authorizes_real_doc_work).toBe(false);
    expect(featureList.v0711_persistent_proof_index_review_guide.runtime_ui_changed).toBe(false);
    expect(featureList.v0711_persistent_proof_index_review_guide.manual_qa_status).toBe("pending_operator_review");
    expect(featureList.v0711_persistent_proof_index_review_guide.push_performed).toBe(false);
    expect(realDocGate?.status).toBe("blocked");
    expect(v0711?.phase).toBe(phase);
    expect(v0711?.status).toBe("ready_to_push");
    expect(`${v0711?.summary}\n${v0711?.next_action}`).toContain("persistent proof");
    expect(`${v0711?.summary}\n${v0711?.next_action}`).toContain("manual QA pending");
  });
});
