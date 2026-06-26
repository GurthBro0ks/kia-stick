import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { FakeUploadPanel, ImportWizardPanel, VaultPanel } from "@/components/KiaStickApp";
import { createInitialImportWizardState } from "@/lib/importWizardModel";
import { createRuntimeVersion } from "@/lib/version";
import { createInitialVaultState, laneCounts, workflowStateCounts } from "@/lib/vaultModel";

const phase = "KIA-Stick-v0.7.12-fake-only-polish-and-real-doc-gate-planning";
const currentPhase = "KIA-Stick-v0.7.16-synthetic-packet-safety-drift-guard";
const docPath = "docs/v0.7.12-fake-only-polish-and-real-doc-gate-planning.md";
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

describe("v0.7.12 fake-only polish and real-doc gate planning", () => {
  it("documents fake-only PASS/WARN/FAIL review and planning-only gate requirements", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);

    for (const surface of ["Chat", "Sources", "Saved", "Upload", "Import", "Vault", "Settings", "`/health`", "`/version`", "Mobile / narrow"]) {
      expect(doc).toContain(surface);
    }

    for (const expected of [
      "`PASS`",
      "`WARN`",
      "`FAIL`",
      "mobile bottom nav remains readable",
      "Local Proof Inspection Checklist",
      "WARN_MISSING_RESULT",
      "exactly-one-document",
      "exactly-one-gate",
      "operator approval packet",
      "safety checklist",
      "Redaction/privacy policy placeholders",
      "does **not** implement real-doc work",
    ]) {
      expect(doc).toContain(expected);
    }
  });

  it("renders clearer fake-only Upload, Import, and Vault copy without file inputs", () => {
    const version = createRuntimeVersion({ buildDate: "20260626", gitSha: "v0712" });
    const vaultState = createInitialVaultState();
    const uploadHtml = renderToStaticMarkup(React.createElement(FakeUploadPanel, {
      fakeOnlyConfirmed: true,
      onFakeOnlyConfirmedChange: () => undefined,
      onQueueFakeUpload: () => undefined,
      quarantine: [],
    }));
    const importHtml = renderToStaticMarkup(React.createElement(ImportWizardPanel, {
      state: createInitialImportWizardState(),
      runtimeVersion: version,
      onAction: () => undefined,
    }));
    const vaultHtml = renderToStaticMarkup(React.createElement(VaultPanel, {
      counts: laneCounts(vaultState.records),
      workflowCounts: workflowStateCounts(vaultState.records),
      state: vaultState,
      view: "vault",
      runtimeVersion: version,
      setView: () => undefined,
      onAction: () => undefined,
    }));

    expect(uploadHtml).toContain("No cloud/API key is required");
    expect(uploadHtml).toContain("Buttons queue synthetic names, sizes, and timestamps only");
    expect(importHtml).toContain("No real import path exists");
    expect(importHtml).toContain("no cloud/API key requirement");
    expect(vaultHtml).toContain("any real-doc gate are blocked");
    expect(`${uploadHtml}\n${importHtml}\n${vaultHtml}`).not.toContain("type=\"file\"");
  });

  it("updates release state, queue state, and generated QA checklist without moving product or prompt identity", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
      };
      v0712_fake_only_polish_and_real_doc_gate_planning: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
        runtime_copy_changed: boolean;
        runtime_capability_changed: boolean;
        docs_tests_checklists_only_for_real_doc_gate: boolean;
        queue_015_status: string;
        queue_026_status: string;
        authorizes_real_doc_work: boolean;
        real_document_access: boolean;
        private_vault_inspected: boolean;
        file_input_added: boolean;
        upload_handler_added: boolean;
        ocr_added: boolean;
        embeddings_added: boolean;
        vector_store_added: boolean;
        manual_qa_status: string;
        push_performed: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const qaGate = readFileSync("scripts/qa_gate.sh", "utf8");
    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const v0712 = queue.items.find((item) => item.id === "queue-026-v0712-fake-only-polish-and-real-doc-gate-planning");

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);

    const state = featureList.v0712_fake_only_polish_and_real_doc_gate_planning;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted_after_operator_qa_pass_push_verified");
    expect(state.product_version).toBe(productVersion);
    expect(state.package_version).toBe(productVersion);
    expect(state.prompt_version).toBe(promptVersion);
    expect(state.runtime_copy_changed).toBe(true);
    expect(state.runtime_capability_changed).toBe(false);
    expect(state.docs_tests_checklists_only_for_real_doc_gate).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.queue_026_status).toBe("accepted");
    expect(state.authorizes_real_doc_work).toBe(false);
    expect(state.real_document_access).toBe(false);
    expect(state.private_vault_inspected).toBe(false);
    expect(state.file_input_added).toBe(false);
    expect(state.upload_handler_added).toBe(false);
    expect(state.ocr_added).toBe(false);
    expect(state.embeddings_added).toBe(false);
    expect(state.vector_store_added).toBe(false);
    expect(state.manual_qa_status).toBe("PASS");
    expect(state.push_performed).toBe(true);

    expect(realDocGate?.status).toBe("blocked");
    expect(v0712?.phase).toBe(phase);
    expect(v0712?.status).toBe("accepted");
    expect(`${v0712?.summary}\n${v0712?.next_action}`).toContain("fake-only UI copy");
    expect(`${v0712?.summary}\n${v0712?.next_action}`).toContain("planning-only");
    expect(`${v0712?.summary}\n${v0712?.next_action}`).toContain("operator QA PASS");
    expect(qaGate).toContain("Review Chat, Sources, Saved, Upload, Import, Vault, Settings, /version, and /health.");
    expect(qaGate).toContain("Confirm queue-015 remains blocked.");
  });

  it("does not add real-doc runtime affordances", () => {
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
