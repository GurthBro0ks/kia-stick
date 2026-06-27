import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.7.13-planning-only-real-doc-gate-rehearsal";
const currentPhase = "KIA-Stick-v0.8.5-next-large-work-checkpoint";
const currentStatus = "v081_v085_backlog_reconciliation_bundle_accepted_after_closeout_push";
const docPath = "docs/v0.7.13-planning-only-real-doc-gate-rehearsal.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

function readRuntimeSources(): string {
  const candidates = [
    "app/health/route.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "app/version/page.tsx",
    "components/KiaStickApp.tsx",
    "lib/answerGovernor.ts",
    "lib/conversationModel.ts",
    "lib/fakePilotSimulatorModel.ts",
    "lib/importWizardModel.ts",
    "lib/redactionMetadataModel.ts",
    "lib/savedAnswers.ts",
    "lib/serverVersion.ts",
    "lib/sourceModel.ts",
    "lib/vaultModel.ts",
    "lib/version.ts",
  ];

  const files: string[] = [];
  for (const file of candidates) {
    expect(existsSync(file)).toBe(true);
    files.push(readFileSync(file, "utf8"));
  }
  return files.join("\n");
}

describe("v0.7.13 planning-only real-doc gate rehearsal", () => {
  it("documents a synthetic-only rehearsal without approving implementation", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);

    for (const required of [
      "planning-only rehearsal",
      "not an approval packet",
      "does **not** authorize or implement real-doc work",
      "No real document may be named or touched in this phase",
      "Synthetic-Only Rehearsal Packet",
      "FAKE-GATE-REHEARSAL-001",
      "SYNTH-ONE-DOC-ALPHA",
      "SYNTH-GATE-METADATA-ONLY",
      "queue-015-v07-first-real-doc-gate-request` remains blocked",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("requires exactly one future document and exactly one future gate", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      "exactly-one-document",
      "exactly-one-gate",
      "Future Operator Approval Packet Checklist",
      "Future Stop-On-WARN/FAIL Checklist",
      "Redaction And Privacy Policy Placeholders",
      "Proof-Safe Output Rules",
      "Rehearsal PASS/WARN/FAIL Examples",
      "Required Closeout Gates Before Any Future Real-Doc Implementation",
    ]) {
      expect(doc).toContain(required);
    }

    expect(doc).toContain("Confirmation that no broad/private/recursive/source-path wording is present.");
    expect(doc).toContain("Missing, ambiguous, broad, or path-shaped fields are `FAIL`.");
    expect(doc).toContain("Any `WARN` or `FAIL` blocks future real-doc implementation");
  });

  it("rejects broad, private, recursive, source-path, and capability language", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const rejected of [
      "broad source scope",
      "recursive scope",
      "private-source browsing",
      "source-path language",
      "directory-level language",
      "batch language",
      "wildcard language",
      "scan everything",
      "folder",
      "file upload",
      "OCR",
      "indexing",
      "vector storage",
    ]) {
      expect(doc).toContain(rejected);
    }

    const realMount = ["/media", "mint", "SHARED", "APWU"].join("/");
    const privateVault = ["kia-stick", "private-vault"].join("-");
    expect(doc).not.toContain(realMount);
    expect(doc).not.toContain(privateVault);
  });

  it("records queue and feature state while keeping queue-015 blocked", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
      };
      v0713_planning_only_real_doc_gate_rehearsal: {
        phase: string;
        status: string;
        operator_qa_closeout_proof_dir: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
        planning_only: boolean;
        docs_tests_state_only: boolean;
        runtime_ui_changed: boolean;
        runtime_capability_changed: boolean;
        authorizes_real_doc_work: boolean;
        real_document_named: boolean;
        real_document_access: boolean;
        private_vault_inspected: boolean;
        file_picker_added: boolean;
        path_reader_added: boolean;
        upload_handler_added: boolean;
        ocr_added: boolean;
        indexing_added: boolean;
        vector_store_added: boolean;
        queue_015_status: string;
        queue_028_status: string;
        future_gate_rule: {
          exactly_one_document: boolean;
          exactly_one_gate: boolean;
          broad_private_recursive_source_path_language_rejected: boolean;
          stop_on_warn_fail: boolean;
        };
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const rehearsal = queue.items.find((item) => item.id === "queue-028-v0713-planning-only-real-doc-gate-rehearsal");

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.status).toBe(currentStatus);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);

    const state = featureList.v0713_planning_only_real_doc_gate_rehearsal;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted_after_push");
    expect(state.operator_qa_closeout_proof_dir).toContain("proof_kia_stick_v0_7_13_operator_qa_pass_closeout");
    expect(state.product_version).toBe(productVersion);
    expect(state.package_version).toBe(productVersion);
    expect(state.prompt_version).toBe(promptVersion);
    expect(state.planning_only).toBe(true);
    expect(state.docs_tests_state_only).toBe(true);
    expect(state.runtime_ui_changed).toBe(false);
    expect(state.runtime_capability_changed).toBe(false);
    expect(state.authorizes_real_doc_work).toBe(false);
    expect(state.real_document_named).toBe(false);
    expect(state.real_document_access).toBe(false);
    expect(state.private_vault_inspected).toBe(false);
    expect(state.file_picker_added).toBe(false);
    expect(state.path_reader_added).toBe(false);
    expect(state.upload_handler_added).toBe(false);
    expect(state.ocr_added).toBe(false);
    expect(state.indexing_added).toBe(false);
    expect(state.vector_store_added).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.queue_028_status).toBe("accepted");
    expect(state.future_gate_rule.exactly_one_document).toBe(true);
    expect(state.future_gate_rule.exactly_one_gate).toBe(true);
    expect(state.future_gate_rule.broad_private_recursive_source_path_language_rejected).toBe(true);
    expect(state.future_gate_rule.stop_on_warn_fail).toBe(true);

    expect(realDocGate?.status).toBe("blocked");
    expect(rehearsal?.phase).toBe(phase);
    expect(rehearsal?.status).toBe("accepted");
    expect(`${rehearsal?.summary}\n${rehearsal?.next_action}`).toContain("synthetic-only");
    expect(`${rehearsal?.summary}\n${rehearsal?.next_action}`).toContain("queue-015 blocked");
  });

  it("does not add runtime file intake, OCR, indexing, vector, or upload affordances", () => {
    const runtime = readRuntimeSources();

    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b/);
    expect(runtime).not.toMatch(/\bwebkitdirectory\b/);
    expect(runtime).not.toMatch(/\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
    expect(runtime).not.toMatch(/\breadRealDocument\b|\bquarantineRealDocument\b|\brunOcr\b|\bcreateVectorStore\b/);
    expect(runtime).not.toMatch(/\bmulter\b|\buploadHandler\b/i);
  });
});
