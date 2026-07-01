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
    kind: string;
    result: string;
    commit: string;
    manualQaStatus: string;
    pushed: string;
    acceptedWarn: boolean;
    resultMdExists: boolean;
    openThisFolderExists: boolean;
    screenshotsCount: number;
    warnings: string[];
  }>;
  selectLatestLocalProof<T>(proofs: T[]): T | null;
  selectLatestReviewReadyProof<T extends { result: string; resultMdExists: boolean; openThisFolderExists: boolean; screenshotsCount: number }>(
    proofs: T[]
  ): T | null;
  selectLatestAcceptedPushedCloseoutProof<T extends { result: string; pushed: string; kind: string; commit?: string; phase?: string; name?: string }>(
    proofs: T[]
  ): T | null;
  selectLatestOperatorQaPassProof<T extends { result: string; manualQaStatus: string; kind: string }>(proofs: T[]): T | null;
  selectLatestAcceptedWarnProof<T extends { acceptedWarn: boolean; phaseSlug?: string; phase?: string; manualQaStatus: string; result: string }>(
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

function makeProof(
  root: string,
  name: string,
  options: { result?: string; manualQa?: string; pushed?: string; open?: boolean; screenshots?: number } = {}
): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  if (options.result !== undefined) {
    const lines = [options.result.trimEnd()];
    if (options.manualQa) lines.push(`MANUAL_QA_STATUS=${options.manualQa}`);
    if (options.pushed) lines.push(`PUSHED=${options.pushed}`);
    writeFileSync(join(dir, "RESULT.md"), `${lines.join("\n")}\n`);
  }
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
    expect(proofs[0].kind).toBe("proof");
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
      latestAcceptedPushedCloseoutProof: string | null;
      latestAcceptedPushedCloseoutCommit: string | null;
      latestOperatorQaPassProof: string | null;
      latestAcceptedWarnProof: string | null;
      reviewReadyExplanation: string;
      proofs: Array<{ screenshotsCount: number }>;
    };

    expect(existsSync(output.markdownPath)).toBe(true);
    expect(existsSync(output.jsonPath)).toBe(true);
    expect(markdown).toContain("KIA Stick Local Proof Index");
    expect(markdown).toContain("WARN");
    expect(markdown).toContain("Latest accepted pushed closeout proof:");
    expect(markdown).toContain("Latest accepted pushed closeout commit:");
    expect(markdown).toContain("Latest operator QA PASS proof:");
    expect(markdown).toContain("Latest accepted-WARN proof:");
    expect(markdown).toContain("Latest screenshot review-ready candidate:");
    expect(markdown).toContain("Review-ready candidate criteria:");
    expect(json.proofRoot).toBe(resolve(root));
    expect(json.latestProof).toContain("proof_kia_stick_v0_7_10b_operator_smoke_evidence_20260626T090618Z");
    expect(json).toHaveProperty("latestReviewReadyProof");
    expect(json).toHaveProperty("latestAcceptedPushedCloseoutProof");
    expect(json).toHaveProperty("latestAcceptedPushedCloseoutCommit");
    expect(json).toHaveProperty("latestOperatorQaPassProof");
    expect(json).toHaveProperty("latestAcceptedWarnProof");
    expect(json.reviewReadyExplanation).toContain("Review-ready candidate criteria:");
    expect(json.proofs[0].screenshotsCount).toBe(8);
  });

  it("labels latest proof, accepted pushed closeout, operator QA PASS, accepted-WARN, and screenshot-gated candidates separately", async () => {
    const mod = await loadModule();
    const root = makeProofRoot();
    const reviewReady = makeProof(root, "proof_kia_stick_v0_7_10b_operator_smoke_evidence_20260626T090618Z", {
      result: "RESULT=PASS\n",
      manualQa: "PASS",
      pushed: "yes",
      open: true,
      screenshots: 8,
    });
    const acceptedWarn = makeProof(root, "proof_kia_stick_v0_9_48_to_v0_9_52_accepted_state_20260630T170813Z", {
      result: "RESULT=WARN\nOPERATOR_QA_ACCEPTED_WARN=fixture\n",
      manualQa: "ACCEPTED_WARN",
      pushed: "no",
    });
    const operatorQa = makeProof(root, "proof_kia_stick_v0_9_53_to_v0_9_57_operator_qa_pass_recording_20260630T195543Z", {
      result: "RESULT=PASS\n",
      manualQa: "PASS",
      pushed: "no",
    });
    const closeout = makeProof(operatorQa, "closeout_push_20260630T204915Z", {
      result: "RESULT=PASS\nCOMMIT_SHA=40935306504d2746f1bae92b21893b13024f91c3\n",
      manualQa: "PASS",
      pushed: "yes",
    });
    const latestInProgress = makeProof(root, "proof_kia_stick_v0_9_58_to_v0_9_62_in_progress_20260630T205845Z");

    const proofs = mod.discoverLocalProofs(root);

    expect(mod.selectLatestLocalProof(proofs)?.path).toBe(latestInProgress);
    expect(mod.selectLatestAcceptedPushedCloseoutProof(proofs)?.path).toBe(closeout);
    expect(mod.selectLatestAcceptedPushedCloseoutProof(proofs)?.commit).toBe("40935306504d2746f1bae92b21893b13024f91c3");
    expect(mod.selectLatestOperatorQaPassProof(proofs)?.path).toBe(operatorQa);
    expect(mod.selectLatestAcceptedWarnProof(proofs)?.path).toBe(acceptedWarn);
    expect(mod.selectLatestReviewReadyProof(proofs)?.path).toBe(reviewReady);
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
    expect(result.stdout).toContain("Latest accepted pushed closeout proof:");
    expect(result.stdout).toContain("Latest accepted pushed closeout commit:");
    expect(result.stdout).toContain("Latest operator QA PASS proof:");
    expect(result.stdout).toContain("Latest accepted-WARN proof:");
    expect(result.stdout).toContain("Latest screenshot review-ready candidate:");
    expect(result.stdout).toContain("Latest review-ready proof:");
    expect(result.stdout).toContain("Review-ready candidate criteria:");
    expect(result.stdout).toContain("result=PASS");
    expect(result.stdout).toContain("commit=unknown");
    expect(result.stdout).toContain("manual_qa=unknown");
    expect(result.stdout).toContain("pushed=unknown");
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
    expect(featureList.v0711_persistent_proof_index_review_guide.status).toBe("accepted_after_operator_qa_pass_push_verified");
    expect(featureList.v0711_persistent_proof_index_review_guide.product_version).toBe(productVersion);
    expect(featureList.v0711_persistent_proof_index_review_guide.package_version).toBe(productVersion);
    expect(featureList.v0711_persistent_proof_index_review_guide.prompt_version).toBe(promptVersion);
    expect(featureList.v0711_persistent_proof_index_review_guide.queue_015_status).toBe("blocked");
    expect(featureList.v0711_persistent_proof_index_review_guide.authorizes_real_doc_work).toBe(false);
    expect(featureList.v0711_persistent_proof_index_review_guide.runtime_ui_changed).toBe(false);
    expect(featureList.v0711_persistent_proof_index_review_guide.manual_qa_status).toBe("PASS");
    expect(featureList.v0711_persistent_proof_index_review_guide.push_performed).toBe(true);
    expect(realDocGate?.status).toBe("blocked");
    expect(v0711?.phase).toBe(phase);
    expect(v0711?.status).toBe("accepted");
    expect(`${v0711?.summary}\n${v0711?.next_action}`).toContain("persistent proof");
    expect(`${v0711?.summary}\n${v0711?.next_action}`).toContain("operator QA PASS");
  });
});
