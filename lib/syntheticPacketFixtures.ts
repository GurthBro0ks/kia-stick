import type { SyntheticApprovalPacket, SyntheticApprovalPacketStatus } from "@/lib/syntheticApprovalPacketValidator";

export interface SyntheticPacketFixture {
  id: string;
  title: string;
  expectedStatus: SyntheticApprovalPacketStatus;
  className: "PASS" | "WARN" | "FAIL";
  unsafeClass?: string;
  packet: SyntheticApprovalPacket;
  expectedReasonCodes: string[];
}

export function completeSyntheticPacket(overrides: Partial<SyntheticApprovalPacket> = {}): SyntheticApprovalPacket {
  return {
    packetId: "FAKE-MATRIX-PACKET-001",
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
    rollbackPlan: "SYNTH-ROLLBACK-REMOVE-MATRIX-SUMMARY",
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

export const syntheticPacketFixtureMatrix: SyntheticPacketFixture[] = [
  {
    id: "matrix-pass-complete",
    title: "complete synthetic packet",
    expectedStatus: "PASS",
    className: "PASS",
    packet: completeSyntheticPacket(),
    expectedReasonCodes: [],
  },
  {
    id: "matrix-warn-missing-reviewer-retention",
    title: "safe packet missing reviewer and retention placeholders",
    expectedStatus: "WARN",
    className: "WARN",
    packet: completeSyntheticPacket({
      reviewerPlaceholder: undefined,
      deletionRetentionPlan: undefined,
    }),
    expectedReasonCodes: ["missing_reviewer_placeholder", "missing_retention_placeholder"],
  },
  {
    id: "matrix-warn-missing-operator-signature",
    title: "operator signature placeholder missing",
    expectedStatus: "WARN",
    className: "WARN",
    packet: completeSyntheticPacket({
      reviewerPlaceholder: undefined,
    }),
    expectedReasonCodes: ["missing_reviewer_placeholder"],
  },
  {
    id: "matrix-warn-missing-redaction-policy-result",
    title: "redaction policy result placeholder missing",
    expectedStatus: "WARN",
    className: "WARN",
    packet: completeSyntheticPacket({
      redactionPrivacyPolicyResult: undefined,
    }),
    expectedReasonCodes: ["missing_redaction_policy_result"],
  },
  {
    id: "matrix-fail-path-shaped",
    title: "path-shaped placeholder rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "path-shaped",
    packet: completeSyntheticPacket({
      futureDocumentPlaceholders: ["synthetic-packet.pdf"],
    }),
    expectedReasonCodes: ["path_shaped_value", "non_synthetic_id"],
  },
  {
    id: "matrix-fail-private-path-wording",
    title: "private/path-shaped wording rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "private-path-wording",
    packet: completeSyntheticPacket({
      futureDocumentPlaceholders: ["/home/mint/example.pdf"],
      allowedAction: "inspect private source path label",
    }),
    expectedReasonCodes: ["path_shaped_value", "home_path_marker", "private_marker", "source_path_wording", "non_synthetic_id"],
  },
  {
    id: "matrix-fail-recursive",
    title: "recursive scope wording rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "recursive",
    packet: completeSyntheticPacket({
      allowedAction: "scan everything recursively from source path labels",
    }),
    expectedReasonCodes: ["recursive_scope", "broad_source_scope", "source_path_wording"],
  },
  {
    id: "matrix-fail-too-broad-scope",
    title: "too-broad scope wording rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "too-broad-scope",
    packet: completeSyntheticPacket({
      allowedAction: "review all documents",
    }),
    expectedReasonCodes: ["broad_source_scope"],
  },
  {
    id: "matrix-fail-broad-source",
    title: "broad source wording rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "broad-source",
    packet: completeSyntheticPacket({
      allowedAction: "review every source document",
    }),
    expectedReasonCodes: ["broad_source_scope"],
  },
  {
    id: "matrix-fail-private-source",
    title: "private source wording rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "private-source",
    packet: completeSyntheticPacket({
      allowedAction: "inspect private source marker",
    }),
    expectedReasonCodes: ["private_marker"],
  },
  {
    id: "matrix-fail-queue-015-unblock",
    title: "queue-015 unblock implication rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "queue-015-unblock",
    packet: completeSyntheticPacket({
      allowedAction: "queue-015 is ready to proceed",
    }),
    expectedReasonCodes: ["queue_015_unblock_implied"],
  },
  {
    id: "matrix-fail-multiple-docs",
    title: "multiple future document placeholders rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "multiple-docs",
    packet: completeSyntheticPacket({
      futureDocumentPlaceholders: ["SYNTH-ONE-DOC-ALPHA", "SYNTH-SECOND-DOC-BETA"],
    }),
    expectedReasonCodes: ["document_placeholder_count"],
  },
  {
    id: "matrix-fail-multiple-gates",
    title: "multiple future gate placeholders rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "multiple-gates",
    packet: completeSyntheticPacket({
      futureGatePlaceholders: ["SYNTH-GATE-METADATA-ONLY", "SYNTH-GATE-SECOND"],
    }),
    expectedReasonCodes: ["gate_placeholder_count"],
  },
  {
    id: "matrix-fail-missing-rollback",
    title: "missing rollback plan rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "missing-rollback",
    packet: completeSyntheticPacket({
      rollbackPlan: undefined,
    }),
    expectedReasonCodes: ["missing_rollback_plan"],
  },
  {
    id: "matrix-fail-unsafe-proof-output",
    title: "unsafe proof output agreement rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "unsafe-proof-output",
    packet: completeSyntheticPacket({
      proofSafeOutputAgreement: false,
    }),
    expectedReasonCodes: ["missing_proof_safe_agreement"],
  },
  {
    id: "matrix-fail-upload-ocr-index-vector",
    title: "forbidden capability wording rejected",
    expectedStatus: "FAIL",
    className: "FAIL",
    unsafeClass: "upload-ocr-indexing-vector",
    packet: completeSyntheticPacket({
      allowedAction: "upload OCR indexing embedding vector-store request",
    }),
    expectedReasonCodes: ["vector_store_marker", "requested_real_doc_capability"],
  },
];

export function summarizeSyntheticPacketFixtureMatrix() {
  return {
    total: syntheticPacketFixtureMatrix.length,
    pass: syntheticPacketFixtureMatrix.filter((fixture) => fixture.expectedStatus === "PASS").length,
    warn: syntheticPacketFixtureMatrix.filter((fixture) => fixture.expectedStatus === "WARN").length,
    fail: syntheticPacketFixtureMatrix.filter((fixture) => fixture.expectedStatus === "FAIL").length,
    unsafeClasses: syntheticPacketFixtureMatrix.flatMap((fixture) => (fixture.unsafeClass ? [fixture.unsafeClass] : [])),
  };
}
