import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.7.10b-closeout-project-state-update";
const evidencePhase = "KIA-Stick-v0.7.10b-persistent-smoke-evidence-rerun";
const currentPhase = "KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint";
const currentStatus = "v096_v0910_synthetic_governance_hardening_bundle_operator_qa_pass_ready_for_closeout";
const docPath = "docs/v0.7.10b-persistent-smoke-evidence-closeout.md";
const proofDir = "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_7_10b_operator_smoke_evidence_20260626T090618Z";
const desktopPointer = "/home/mint/Desktop/kia-stick-proofs/LATEST_KIA_PROOF.txt";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.7.10b persistent smoke evidence closeout", () => {
  it("documents the accepted persistent proof and operator QA PASS", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    for (const expected of [
      phase,
      evidencePhase,
      proofDir,
      desktopPointer,
      "Operator QA status: `PASS`",
      "Manual QA status recorded by this closeout: `PASS`",
      "Screenshots accepted: `8`",
      "File input count: `0`",
      "File chooser events: `0`",
      "Local route smoke: `PASS`",
      "Static operator smoke: `PASS`",
      `Product version: \`${productVersion}\``,
      `Prompt version: \`${promptVersion}\``,
      "`queue-015-v07-first-real-doc-gate-request` remains `blocked`",
    ]) {
      expect(doc).toContain(expected);
    }

    for (const surface of ["Chat", "Sources", "Saved", "Upload", "Import", "Vault", "Settings", "`/version`", "`/health`"]) {
      expect(doc).toContain(surface);
    }
  });

  it("records closeout state without moving runtime phase or version identity", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
      };
      v0710b_persistent_smoke_evidence_closeout: {
        phase: string;
        evidence_phase: string;
        status: string;
        persistent_evidence_proof_dir: string;
        desktop_pointer_file: string;
        operator_qa_status: string;
        manual_qa_status: string;
        screenshots_accepted: number;
        file_input_count: number;
        file_chooser_events: number;
        product_version: string;
        package_version: string;
        prompt_version: string;
        changed_runtime_version: boolean;
        changed_prompt_version: boolean;
        docs_tests_state_only: boolean;
        runtime_ui_changed: boolean;
        queue_015_status: string;
        queue_023_status: string;
        queue_024_status: string;
        authorizes_real_doc_work: boolean;
        real_document_access: boolean;
        private_vault_inspected: boolean;
      };
    };

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.status).toBe(currentStatus);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);

    const closeout = featureList.v0710b_persistent_smoke_evidence_closeout;
    expect(closeout.phase).toBe(phase);
    expect(closeout.evidence_phase).toBe(evidencePhase);
    expect(closeout.status).toBe("accepted_after_operator_qa_pass");
    expect(closeout.persistent_evidence_proof_dir).toBe(proofDir);
    expect(closeout.desktop_pointer_file).toBe(desktopPointer);
    expect(closeout.operator_qa_status).toBe("PASS");
    expect(closeout.manual_qa_status).toBe("PASS");
    expect(closeout.screenshots_accepted).toBe(8);
    expect(closeout.file_input_count).toBe(0);
    expect(closeout.file_chooser_events).toBe(0);
    expect(closeout.product_version).toBe(productVersion);
    expect(closeout.package_version).toBe(productVersion);
    expect(closeout.prompt_version).toBe(promptVersion);
    expect(closeout.changed_runtime_version).toBe(false);
    expect(closeout.changed_prompt_version).toBe(false);
    expect(closeout.docs_tests_state_only).toBe(true);
    expect(closeout.runtime_ui_changed).toBe(false);
    expect(closeout.queue_015_status).toBe("blocked");
    expect(closeout.queue_023_status).toBe("accepted_after_push_verified");
    expect(closeout.queue_024_status).toBe("accepted_after_operator_qa_pass");
    expect(closeout.authorizes_real_doc_work).toBe(false);
    expect(closeout.real_document_access).toBe(false);
    expect(closeout.private_vault_inspected).toBe(false);
  });

  it("adds an accepted queue entry while keeping the real-doc gate blocked", () => {
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };

    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const v079 = queue.items.find((item) => item.id === "queue-023-v079-operator-qa-smoke-pack");
    const closeout = queue.items.find((item) => item.id === "queue-024-v0710b-persistent-smoke-evidence-closeout");

    expect(realDocGate?.status).toBe("blocked");
    expect(v079?.status).toBe("accepted");
    expect(closeout?.phase).toBe(phase);
    expect(closeout?.status).toBe("accepted");
    expect(`${closeout?.summary}\n${closeout?.next_action}`).toContain(proofDir);
    expect(`${closeout?.summary}\n${closeout?.next_action}`).toContain("8 accepted screenshots");
    expect(`${closeout?.summary}\n${closeout?.next_action}`).toContain("zero file inputs");
    expect(`${closeout?.summary}\n${closeout?.next_action}`).toContain("zero file chooser events");
    expect(`${closeout?.summary}\n${closeout?.next_action}`).toContain("queue-015 remains blocked");
  });

  it("keeps no-real-doc and no-file-affordance boundaries explicit", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const forbidden of [
      "file pickers",
      "directory pickers",
      "drag/drop import zones",
      "path readers",
      "real upload handlers",
      "file inputs",
      "OCR",
      "real redaction",
      "embeddings",
      "indexing",
      "vector stores",
      "private-vault inspection",
      "services",
      "secrets",
      "skills",
      "symlinks",
      "global agent config",
    ]) {
      expect(doc).toContain(forbidden);
    }

    expect(doc).toContain("does not approve real-doc capability");
    expect(doc).toContain("Real document access: none");
    expect(doc).toContain("Runtime UI changed: no");
    expect(doc).toContain("Product version changed: no");
    expect(doc).toContain("Prompt version changed: no");
  });
});
