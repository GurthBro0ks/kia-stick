import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.4-persistent-proof-pointer-update";
const docPath = "docs/v0.9.4-persistent-proof-pointer-update.md";
const desktopPointer = "/home/mint/Desktop/kia-stick-proofs/LATEST_KIA_PROOF.txt";
const localProofRoot = "/home/mint/kia-stick-local-proofs";
const generatedProofDir = "/tmp/proof_kia_stick_v0_9_1_to_v0_9_5_release_state_consolidation_bundle_20260627T105926Z";

describe("v0.9.4 persistent proof pointer update", () => {
  it("documents the local pointer and GitHub-safe pointer payload", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(desktopPointer);
    expect(doc).toContain(localProofRoot);
    expect(doc).toContain(generatedProofDir);
    for (const allowed of ["proof directory", "phase", "result", "accepted commit", "queue states", "product and prompt versions", "safety boundary"]) {
      expect(doc).toContain(allowed);
    }
  });

  it("tracks pointer state without storing real document details", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v094_persistent_proof_pointer_update: {
        phase: string;
        status: string;
        queue_049_status: string;
        desktop_pointer_file: string;
        local_proof_summary_dir: string;
        persistent_proof_pointer_status: string;
        stores_secrets: boolean;
        copies_private_files: boolean;
        real_document_access: boolean;
      };
    };
    const state = featureList.v094_persistent_proof_pointer_update;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted_after_closeout_push");
    expect(state.queue_049_status).toBe("accepted");
    expect(state.desktop_pointer_file).toBe(desktopPointer);
    expect(state.local_proof_summary_dir).toContain(localProofRoot);
    expect(state.persistent_proof_pointer_status).toBe("updated");
    expect(state.stores_secrets).toBe(false);
    expect(state.copies_private_files).toBe(false);
    expect(state.real_document_access).toBe(false);
  });

  it("updates the local desktop pointer with safe metadata only", () => {
    expect(existsSync(desktopPointer)).toBe(true);
    const pointer = readFileSync(desktopPointer, "utf8");
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      release_readiness: { closeout_push_proof_dir: string };
    };

    expect(pointer).toContain(featureList.release_readiness.closeout_push_proof_dir);
    expect(pointer).toContain("KIA-Stick-v0.9.1-to-v0.9.5-release-state-consolidation-proof-durability-closeout-and-push");
    expect(pointer).toContain("QUEUE_015_STATUS=blocked");
    expect(pointer).toContain("QUEUE_046_TO_050_STATUS=accepted");
    expect(pointer).toContain("PRODUCT_VERSION=0.7.0");
    expect(pointer).toContain("PROMPT_VERSION=prompt.fake-docs.v0.5-import-wizard-hardening");
    expect(pointer).not.toMatch(/(?:token|cookie|authorization|secret)\s*[:=]\s*[A-Za-z0-9._+/\-=]{8,}|\/media\/mint\/SHARED\/APWU/i);
  });
});
