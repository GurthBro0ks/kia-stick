export type SyntheticApprovalPacketStatus = "PASS" | "WARN" | "FAIL";

export interface SyntheticApprovalPacket {
  packetId: string;
  syntheticOnly: true;
  futureDocumentPlaceholders: string[];
  futureGatePlaceholders: string[];
  allowedAction: string;
  blockedActions: string[];
  rollbackPlan?: string;
  deletionRetentionPlan?: string;
  reviewerPlaceholder?: string;
  proofSafeOutputAgreement?: boolean;
  stopOnWarnFailAgreement?: boolean;
  queue015Status?: string;
  queue015BlockedConfirmation?: boolean;
  realDocumentAccessed?: boolean;
  safetyChecklistResult?: string;
  redactionPrivacyPolicyResult?: string;
}

export interface SyntheticApprovalPacketReason {
  status: SyntheticApprovalPacketStatus;
  code: string;
  field: string;
  message: string;
}

export interface SyntheticApprovalPacketValidation {
  status: SyntheticApprovalPacketStatus;
  reasons: SyntheticApprovalPacketReason[];
  guard: {
    syntheticFieldsOnly: true;
    acceptsPathArguments: false;
    readsUserFiles: false;
    scansDirectories: false;
    queue015Status: string;
  };
}

interface StringField {
  field: string;
  value: string;
}

const syntheticIdPattern = /^(?:FAKE|SYNTH)-[A-Z0-9][A-Z0-9-]*$/;
const pathLikePattern =
  /(?:^|[\s"'`])(?:~\/|\.{1,2}\/|[A-Za-z]:[\\/]|\/(?:home|media|mnt|tmp|var|Users|[A-Za-z0-9_.-]+\/)|[A-Za-z0-9_.-]+\.(?:pdf|docx?|xlsx?|csv|txt|md|png|jpe?g))\b/i;

const hardRejectPatterns: Array<{ code: string; pattern: RegExp; message: string }> = [
  { code: "path_shaped_value", pattern: pathLikePattern, message: "Path-shaped or filename-shaped values are not allowed." },
  { code: "private_mount_marker", pattern: /\/(?:media|mnt)\b/i, message: "Mounted private/source path markers are not allowed." },
  { code: "home_path_marker", pattern: /(?:^|[\s"'`])(?:~\/|\/home\/)/i, message: "Home-directory path markers are not allowed." },
  { code: "apwu_marker", pattern: /\bAPWU\b/i, message: "APWU source markers are not allowed in synthetic packets." },
  { code: "usps_marker", pattern: /\bUSPS\b/i, message: "USPS source markers are not allowed in synthetic packets." },
  { code: "private_marker", pattern: /\bprivate\b/i, message: "Private-source wording is not allowed in synthetic packets." },
  { code: "real_documents_marker", pattern: /\breal-documents\b/i, message: "Real-document storage markers are not allowed." },
  { code: "quarantine_marker", pattern: /\bquarantine\b/i, message: "Quarantine storage wording is not allowed in this synthetic validator." },
  { code: "vector_store_marker", pattern: /\bvector[-\s]?store\b/i, message: "Vector-store wording is not allowed in packet values." },
  { code: "recursive_scope", pattern: /\brecursive(?:ly)?\b/i, message: "Recursive scope wording is not allowed." },
  { code: "batch_scope", pattern: /\bbatch(?:es)?\b/i, message: "Batch scope wording is not allowed." },
  { code: "wildcard_scope", pattern: /\bwildcard\b|\*\/|\*\.[A-Za-z0-9]+|\bglob\b/i, message: "Wildcard source wording is not allowed." },
  {
    code: "broad_source_scope",
    pattern: /\b(?:all|any|every|entire|whole)\s+(?:source|sources|folder|folders|directory|directories|document|documents|file|files)\b|\bscan everything\b/i,
    message: "Broad source wording is not allowed.",
  },
  {
    code: "source_path_wording",
    pattern: /\bsource[-\s]?path\b|\bsource\s+(?:folder|directory)\b|\bpath\s+(?:reader|intake|validation)\b/i,
    message: "Source-path wording is not allowed.",
  },
];

const requestedCapabilityPattern =
  /\b(?:file\s+picker|directory\s+picker|drag\/drop|drag and drop|path\s+reader|file\s+read|upload|OCR|indexing|embedding|summarization|real\s+redaction)\b/i;

function addReason(
  reasons: SyntheticApprovalPacketReason[],
  status: SyntheticApprovalPacketStatus,
  code: string,
  field: string,
  message: string
) {
  reasons.push({ status, code, field, message });
}

function flattenStrings(value: unknown, field = "packet"): StringField[] {
  if (typeof value === "string") return [{ field, value }];
  if (Array.isArray(value)) return value.flatMap((item, index) => flattenStrings(item, `${field}.${index}`));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => flattenStrings(child, field === "packet" ? key : `${field}.${key}`));
}

function isBlockedActionField(field: string): boolean {
  return field === "blockedActions" || field.startsWith("blockedActions.");
}

function validateSyntheticId(value: string, field: string, reasons: SyntheticApprovalPacketReason[]) {
  if (!syntheticIdPattern.test(value)) {
    addReason(reasons, "FAIL", "non_synthetic_id", field, "Expected a fake or synthetic uppercase ID such as SYNTH-ONE-DOC-ALPHA.");
  }
}

export function validateSyntheticApprovalPacket(packet: SyntheticApprovalPacket): SyntheticApprovalPacketValidation {
  const reasons: SyntheticApprovalPacketReason[] = [];

  if (!packet || typeof packet !== "object") {
    return {
      status: "FAIL",
      reasons: [
        {
          status: "FAIL",
          code: "invalid_packet",
          field: "packet",
          message: "Packet must be an in-memory synthetic object.",
        },
      ],
      guard: {
        syntheticFieldsOnly: true,
        acceptsPathArguments: false,
        readsUserFiles: false,
        scansDirectories: false,
        queue015Status: "missing",
      },
    };
  }

  if (packet.syntheticOnly !== true) addReason(reasons, "FAIL", "not_synthetic_only", "syntheticOnly", "Packet must explicitly be synthetic-only.");
  if (packet.realDocumentAccessed === true) addReason(reasons, "FAIL", "real_document_accessed", "realDocumentAccessed", "Synthetic packet cannot record real document access.");

  validateSyntheticId(packet.packetId, "packetId", reasons);

  if (!Array.isArray(packet.futureDocumentPlaceholders) || packet.futureDocumentPlaceholders.length !== 1) {
    addReason(reasons, "FAIL", "document_placeholder_count", "futureDocumentPlaceholders", "Exactly one synthetic future document placeholder is required.");
  } else {
    validateSyntheticId(packet.futureDocumentPlaceholders[0], "futureDocumentPlaceholders.0", reasons);
  }

  if (!Array.isArray(packet.futureGatePlaceholders) || packet.futureGatePlaceholders.length !== 1) {
    addReason(reasons, "FAIL", "gate_placeholder_count", "futureGatePlaceholders", "Exactly one synthetic future gate placeholder is required.");
  } else {
    validateSyntheticId(packet.futureGatePlaceholders[0], "futureGatePlaceholders.0", reasons);
  }

  if (!packet.allowedAction?.trim()) addReason(reasons, "FAIL", "missing_allowed_action", "allowedAction", "A narrow synthetic allowed action is required.");
  if (!Array.isArray(packet.blockedActions) || packet.blockedActions.length === 0) {
    addReason(reasons, "FAIL", "missing_blocked_actions", "blockedActions", "Blocked actions must be listed before the packet can pass.");
  }
  if (!packet.rollbackPlan?.trim()) addReason(reasons, "FAIL", "missing_rollback_plan", "rollbackPlan", "Rollback plan is required.");
  if (packet.proofSafeOutputAgreement !== true) {
    addReason(reasons, "FAIL", "missing_proof_safe_agreement", "proofSafeOutputAgreement", "Proof-safe output agreement must be true.");
  }
  if (packet.stopOnWarnFailAgreement !== true) {
    addReason(reasons, "FAIL", "missing_stop_on_warn_fail", "stopOnWarnFailAgreement", "Stop-on-WARN/FAIL agreement must be true.");
  }
  if (packet.queue015Status !== "blocked" || packet.queue015BlockedConfirmation !== true) {
    addReason(reasons, "FAIL", "queue_015_not_blocked", "queue015Status", "queue-015 must remain blocked in this synthetic validator.");
  }

  if (!packet.reviewerPlaceholder?.trim()) {
    addReason(reasons, "WARN", "missing_reviewer_placeholder", "reviewerPlaceholder", "Reviewer placeholder is missing; packet is safe but incomplete.");
  }
  if (!packet.deletionRetentionPlan?.trim()) {
    addReason(reasons, "WARN", "missing_retention_placeholder", "deletionRetentionPlan", "Deletion/retention placeholder is missing; packet is safe but incomplete.");
  }
  if (!packet.redactionPrivacyPolicyResult?.trim()) {
    addReason(
      reasons,
      "WARN",
      "missing_redaction_policy_result",
      "redactionPrivacyPolicyResult",
      "Redaction/privacy policy result placeholder is missing; packet is safe but incomplete."
    );
  }

  for (const field of flattenStrings(packet)) {
    for (const reject of hardRejectPatterns) {
      if (reject.pattern.test(field.value)) addReason(reasons, "FAIL", reject.code, field.field, reject.message);
    }

    if (!isBlockedActionField(field.field) && requestedCapabilityPattern.test(field.value)) {
      addReason(reasons, "FAIL", "requested_real_doc_capability", field.field, "Packet value appears to request a forbidden real-doc capability.");
    }

    if (/queue-?015/i.test(field.value) && /\b(?:unblock(?:ed)?|ready|accept(?:ed)?|open|proceed)\b/i.test(field.value)) {
      addReason(reasons, "FAIL", "queue_015_unblock_implied", field.field, "Packet cannot imply queue-015 is unblocked.");
    }
  }

  const status: SyntheticApprovalPacketStatus = reasons.some((reason) => reason.status === "FAIL")
    ? "FAIL"
    : reasons.some((reason) => reason.status === "WARN")
      ? "WARN"
      : "PASS";

  return {
    status,
    reasons,
    guard: {
      syntheticFieldsOnly: true,
      acceptsPathArguments: false,
      readsUserFiles: false,
      scansDirectories: false,
      queue015Status: packet.queue015Status ?? "missing",
    },
  };
}
