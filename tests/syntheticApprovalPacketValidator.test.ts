import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  type SyntheticApprovalPacket,
  validateSyntheticApprovalPacket,
} from "@/lib/syntheticApprovalPacketValidator";
import { PRODUCT_VERSION, PROMPT_VERSION } from "@/lib/version";

const phase = "KIA-Stick-v0.7.14-synthetic-approval-packet-validator";
const currentPhase = "KIA-Stick-v0.7.16-synthetic-packet-safety-drift-guard";
const docPath = "docs/v0.7.14-synthetic-approval-packet-validator.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

function completePacket(overrides: Partial<SyntheticApprovalPacket> = {}): SyntheticApprovalPacket {
  return {
    packetId: "FAKE-APPROVAL-PACKET-001",
    syntheticOnly: true,
    futureDocumentPlaceholders: ["SYNTH-ONE-DOC-ALPHA"],
    futureGatePlaceholders: ["SYNTH-GATE-METADATA-ONLY"],
    allowedAction: "SYNTH-METADATA-LABEL-CHECK-ONLY",
    blockedActions: [
      "BLOCK_FILE_INTAKE",
      "BLOCK_TEXT_DERIVATION",
      "BLOCK_INDEX_PIPELINE",
      "BLOCK_SOURCE_EXPANSION",
      "BLOCK_GATE_STATUS_CHANGE",
    ],
    rollbackPlan: "SYNTH-ROLLBACK-REMOVE-PACKET-SUMMARY",
    deletionRetentionPlan: "SYNTH-RETENTION-SUMMARY-ONLY",
    reviewerPlaceholder: "SYNTH-REVIEWER-PENDING",
    proofSafeOutputAgreement: true,
    stopOnWarnFailAgreement: true,
    queue015Status: "blocked",
    queue015BlockedConfirmation: true,
    realDocumentAccessed: false,
    safetyChecklistResult: "SYNTH-SAFETY-PENDING",
    redactionPrivacyPolicyResult: "SYNTH-POLICY-PENDING",
    ...overrides,
  };
}

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

describe("v0.7.14 synthetic approval-packet validator", () => {
  it("documents a synthetic-only validator without approving real-doc work", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);

    for (const required of [
      "synthetic-only approval-packet validator",
      "not an approval packet",
      "does not approve real-doc work",
      "exactly one future document placeholder",
      "exactly one future gate placeholder",
      "queue-015-v07-first-real-doc-gate-request` remains blocked",
      "PASS/WARN/FAIL",
      "No file path arguments",
      "No filesystem existence checks",
      "No directory scans",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("returns PASS for a complete synthetic packet", () => {
    const result = validateSyntheticApprovalPacket(completePacket());

    expect(result.status).toBe("PASS");
    expect(result.reasons).toEqual([]);
    expect(result.guard).toEqual({
      syntheticFieldsOnly: true,
      acceptsPathArguments: false,
      readsUserFiles: false,
      scansDirectories: false,
      queue015Status: "blocked",
    });
  });

  it("returns WARN for a safe packet missing reviewer and retention placeholders", () => {
    const packet = completePacket({
      deletionRetentionPlan: undefined,
      reviewerPlaceholder: undefined,
    });
    const result = validateSyntheticApprovalPacket(packet);

    expect(result.status).toBe("WARN");
    expect(result.reasons.map((reason) => reason.code)).toEqual([
      "missing_reviewer_placeholder",
      "missing_retention_placeholder",
    ]);
    expect(result.reasons.every((reason) => reason.status === "WARN")).toBe(true);
  });

  it("returns FAIL for broad, private, recursive, and source-path wording", () => {
    const result = validateSyntheticApprovalPacket(
      completePacket({
        allowedAction: "scan everything recursively from a private source path",
      })
    );

    expect(result.status).toBe("FAIL");
    expect(result.reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining(["private_marker", "recursive_scope", "broad_source_scope", "source_path_wording"])
    );
  });

  it("returns FAIL for real-looking path values", () => {
    const result = validateSyntheticApprovalPacket(
      completePacket({
        futureDocumentPlaceholders: ["/home/mint/example.pdf"],
      })
    );

    expect(result.status).toBe("FAIL");
    expect(result.reasons.map((reason) => reason.code)).toEqual(expect.arrayContaining(["path_shaped_value", "non_synthetic_id"]));
  });

  it("returns FAIL when more than one document placeholder is present", () => {
    const result = validateSyntheticApprovalPacket(
      completePacket({
        futureDocumentPlaceholders: ["SYNTH-ONE-DOC-ALPHA", "SYNTH-SECOND-DOC-BETA"],
      })
    );

    expect(result.status).toBe("FAIL");
    expect(result.reasons.map((reason) => reason.code)).toContain("document_placeholder_count");
  });

  it("returns FAIL when more than one gate placeholder is present", () => {
    const result = validateSyntheticApprovalPacket(
      completePacket({
        futureGatePlaceholders: ["SYNTH-GATE-METADATA-ONLY", "SYNTH-GATE-SECOND"],
      })
    );

    expect(result.status).toBe("FAIL");
    expect(result.reasons.map((reason) => reason.code)).toContain("gate_placeholder_count");
  });

  it("returns FAIL if queue-015 is implied unblocked", () => {
    const result = validateSyntheticApprovalPacket(
      completePacket({
        queue015Status: "accepted",
        allowedAction: "queue-015 ready to proceed",
      })
    );

    expect(result.status).toBe("FAIL");
    expect(result.reasons.map((reason) => reason.code)).toEqual(expect.arrayContaining(["queue_015_not_blocked", "queue_015_unblock_implied"]));
  });

  it("keeps product and prompt versions unchanged", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        package_version: string;
        product_version: string;
        prompt_version: string;
      };
      v0714_synthetic_approval_packet_validator: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
        queue_015_status: string;
        queue_029_status: string;
        authorizes_real_doc_work: boolean;
        real_document_access: boolean;
        file_picker_added: boolean;
        path_reader_added: boolean;
        ocr_added: boolean;
        indexing_added: boolean;
        vector_store_added: boolean;
        upload_handler_added: boolean;
        push_performed: boolean;
        head_equals_origin_main: boolean;
        closeout_push_proof_dir: string;
        accepted_pushed_state: string;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const validatorQueueItem = queue.items.find((item) => item.id === "queue-029-v0714-synthetic-approval-packet-validator");

    expect(PRODUCT_VERSION).toBe(productVersion);
    expect(PROMPT_VERSION).toBe(promptVersion);
    expect(packageJson.version).toBe(productVersion);
    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v0714_synthetic_approval_packet_validator.phase).toBe(phase);
    expect(featureList.v0714_synthetic_approval_packet_validator.status).toBe("accepted_after_push");
    expect(featureList.v0714_synthetic_approval_packet_validator.product_version).toBe(productVersion);
    expect(featureList.v0714_synthetic_approval_packet_validator.package_version).toBe(productVersion);
    expect(featureList.v0714_synthetic_approval_packet_validator.prompt_version).toBe(promptVersion);
    expect(featureList.v0714_synthetic_approval_packet_validator.queue_015_status).toBe("blocked");
    expect(featureList.v0714_synthetic_approval_packet_validator.queue_029_status).toBe("accepted");
    expect(featureList.v0714_synthetic_approval_packet_validator.authorizes_real_doc_work).toBe(false);
    expect(featureList.v0714_synthetic_approval_packet_validator.real_document_access).toBe(false);
    expect(featureList.v0714_synthetic_approval_packet_validator.file_picker_added).toBe(false);
    expect(featureList.v0714_synthetic_approval_packet_validator.path_reader_added).toBe(false);
    expect(featureList.v0714_synthetic_approval_packet_validator.ocr_added).toBe(false);
    expect(featureList.v0714_synthetic_approval_packet_validator.indexing_added).toBe(false);
    expect(featureList.v0714_synthetic_approval_packet_validator.vector_store_added).toBe(false);
    expect(featureList.v0714_synthetic_approval_packet_validator.upload_handler_added).toBe(false);
    expect(featureList.v0714_synthetic_approval_packet_validator.push_performed).toBe(true);
    expect(featureList.v0714_synthetic_approval_packet_validator.head_equals_origin_main).toBe(true);
    expect(featureList.v0714_synthetic_approval_packet_validator.closeout_push_proof_dir).toContain("proof_kia_stick_v0_7_14_operator_qa_closeout_push");
    expect(featureList.v0714_synthetic_approval_packet_validator.accepted_pushed_state).toBe("verified_HEAD_equals_origin_main_after_closeout_push");

    expect(realDocGate?.status).toBe("blocked");
    expect(validatorQueueItem?.phase).toBe(phase);
    expect(validatorQueueItem?.status).toBe("accepted");
    expect(`${validatorQueueItem?.summary}\n${validatorQueueItem?.next_action}`).toContain("synthetic-only");
    expect(`${validatorQueueItem?.summary}\n${validatorQueueItem?.next_action}`).toContain("queue-015 remains blocked");
  });

  it("adds no file picker, path reader, OCR, indexing, vector, upload, or filesystem reader capability", () => {
    const runtime = readRuntimeSources();
    const validatorSource = readFileSync("lib/syntheticApprovalPacketValidator.ts", "utf8");

    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b|\bwebkitdirectory\b|\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
    expect(runtime).not.toMatch(/\breadRealDocument\b|\bquarantineRealDocument\b|\brunOcr\b|\bcreateVectorStore\b/);
    expect(runtime).not.toMatch(/\bmulter\b|\buploadHandler\b/i);

    expect(validatorSource).not.toMatch(/\bfrom\s+["']node:fs["']/);
    expect(validatorSource).not.toMatch(/\breadFileSync\b|\breaddirSync\b|\bexistsSync\b|\bstatSync\b/);
    expect(validatorSource).not.toMatch(/\bprocess\.argv\b/);
  });
});
