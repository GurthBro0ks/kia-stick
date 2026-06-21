import type { RuntimeVersion } from "@/lib/version";

export const fakePilotSimulatorGates = [
  "approval",
  "scope",
  "nonrecursive",
  "quarantine_label",
  "provenance",
  "redaction_review",
  "metadata_review",
  "eligibility",
  "audit",
  "rollback",
  "retention",
] as const;

export type FakePilotSimulatorGate = (typeof fakePilotSimulatorGates)[number];
export type FakePilotGateStatus = "PASS" | "WARN" | "FAIL";
export type FakePilotEligibilityDecision = "not_indexable" | "candidate_metadata_only";
export type FakePilotRetentionDecision = "delete_synthetic_run" | "retain_synthetic_summary_only";

export interface FakePilotGateResult {
  gate: FakePilotSimulatorGate;
  status: FakePilotGateStatus;
  reasonCode: string;
  label: string;
}

export interface FakePilotSimulatorRecord {
  pilotId: string;
  sourceScopeLabel: string;
  sourceCategoryLabel: string;
  itemCount: number;
  recursiveDiscovery: false;
  quarantineLabel: string;
  provenanceLabel: string;
  redactionFindingCounts: Record<string, number>;
  metadataReviewCounts: Record<string, number>;
  eligibilityDecision: FakePilotEligibilityDecision;
  retentionDecision: FakePilotRetentionDecision;
  syntheticOnly: true;
}

export interface FakePilotAuditEntry {
  id: string;
  gate: FakePilotSimulatorGate;
  action: string;
  actor: string;
  at: string;
  status: FakePilotGateStatus;
  note: string;
}

export interface FakePilotSimulatorState {
  currentGate: FakePilotSimulatorGate;
  completedGates: FakePilotSimulatorGate[];
  warnings: FakePilotGateResult[];
  failures: FakePilotGateResult[];
  record: FakePilotSimulatorRecord;
  auditLog: FakePilotAuditEntry[];
  lastBlockedReason: string;
  fakeOnly: true;
  realActionsDisabled: true;
}

export type FakePilotSimulatorAction =
  | { type: "approve_operator"; actor?: string; now?: string }
  | { type: "confirm_scope"; actor?: string; now?: string; itemCount?: number; sourceCategoryLabel?: string }
  | { type: "confirm_nonrecursive"; actor?: string; now?: string; recursiveDiscovery?: boolean }
  | { type: "assign_quarantine_label"; actor?: string; now?: string; quarantineLabel?: string }
  | { type: "record_provenance_label"; actor?: string; now?: string; provenanceLabel?: string }
  | { type: "review_redaction"; actor?: string; now?: string; findingCounts?: Record<string, number> }
  | { type: "review_metadata"; actor?: string; now?: string; metadataCounts?: Record<string, number> }
  | { type: "decide_eligibility"; actor?: string; now?: string; decision?: FakePilotEligibilityDecision }
  | { type: "confirm_audit"; actor?: string; now?: string }
  | { type: "confirm_rollback"; actor?: string; now?: string }
  | { type: "decide_retention"; actor?: string; now?: string; decision?: FakePilotRetentionDecision }
  | { type: "record_warning"; actor?: string; now?: string; gate?: FakePilotSimulatorGate; reasonCode?: string; label?: string }
  | { type: "reset_fake_simulator"; actor?: string; now?: string };

export interface FakePilotProofExport {
  exportType: "kia-stick-fake-pilot-simulator-proof";
  generatedAt: string;
  version: RuntimeVersion;
  guard: {
    fakeMetadataOnly: true;
    syntheticIdsLabelsCountsOnly: true;
    privatePathsIncluded: false;
    filenamesIncluded: false;
    fileContentIncluded: false;
    snippetsIncluded: false;
    ocrTextIncluded: false;
    hashValuesIncluded: false;
    identifiersIncluded: false;
    exportsIncluded: false;
    vectorDataIncluded: false;
    privateNotesIncluded: false;
    uploadHandlerIncluded: false;
    fileInputIncluded: false;
    realDocumentAccessed: false;
    realPilotImplemented: false;
  };
  summary: {
    currentGate: FakePilotSimulatorGate;
    completedGateCount: number;
    passCount: number;
    warnCount: number;
    failCount: number;
    proofResult: FakePilotGateStatus;
    eligibilityDecision: FakePilotEligibilityDecision;
    retentionDecision: FakePilotRetentionDecision;
  };
  record: FakePilotSimulatorRecord;
  gateResults: FakePilotGateResult[];
  auditLog: FakePilotAuditEntry[];
}

export const fakePilotSimulatorGateLabels: Record<FakePilotSimulatorGate, string> = {
  approval: "Operator approval",
  scope: "Source scope",
  nonrecursive: "Non-recursive rule",
  quarantine_label: "Quarantine label",
  provenance: "Provenance label",
  redaction_review: "Redaction review",
  metadata_review: "Metadata review",
  eligibility: "Index eligibility",
  audit: "Audit proof",
  rollback: "Rollback",
  retention: "Retention / deletion",
};

const gateActionMap: Record<Exclude<FakePilotSimulatorAction["type"], "record_warning" | "reset_fake_simulator">, FakePilotSimulatorGate> = {
  approve_operator: "approval",
  confirm_scope: "scope",
  confirm_nonrecursive: "nonrecursive",
  assign_quarantine_label: "quarantine_label",
  record_provenance_label: "provenance",
  review_redaction: "redaction_review",
  review_metadata: "metadata_review",
  decide_eligibility: "eligibility",
  confirm_audit: "audit",
  confirm_rollback: "rollback",
  decide_retention: "retention",
};

const forbiddenActionKeys = new Set([
  "path",
  "sourcePath",
  "localPath",
  "privatePath",
  "filename",
  "fileName",
  "rawText",
  "rawContent",
  "content",
  "contents",
  "document",
  "documents",
  "file",
  "files",
  "blob",
  "bytes",
  "ocrText",
  "snippet",
  "snippets",
  "hash",
  "hashValue",
  "upload",
  "uploads",
  "export",
  "exports",
  "vectorStore",
  "vectorData",
  "embedding",
  "embeddings",
  "privateNote",
  "privateNotes",
  "identifier",
  "identifiers",
  "memberId",
  "accountId",
  "employeeId",
  "caseId",
]);

const forbiddenPrivateFragments = [
  "/media/mint/SHARED/APWU",
  "kia-stick-private-vault",
  "data/real-documents",
  "data/quarantine",
  "data/redacted-approved",
  "uploads/",
  "exports/",
  "backups/",
  "vector-store/",
  "DB/",
];

const pathLikePattern = /(^|[\s"'`])(?:~\/|\.\/|\.\.\/|\/|[A-Za-z]:[\\/])|[A-Za-z0-9_-]+\.(?:pdf|docx?|xlsx?|png|jpe?g|txt|md)\b/i;
const hashLikePattern = /\b[a-f0-9]{32,}\b/i;
const identifierLikePattern = /\b(?:member|account|employee|case|session|device|token|cookie)[_-]?(?:id|key)?\s*[:=]\s*[A-Za-z0-9_-]{4,}/i;

function cloneRecord(record: FakePilotSimulatorRecord): FakePilotSimulatorRecord {
  return {
    ...record,
    redactionFindingCounts: { ...record.redactionFindingCounts },
    metadataReviewCounts: { ...record.metadataReviewCounts },
  };
}

function cloneGateResult(result: FakePilotGateResult): FakePilotGateResult {
  return { ...result };
}

function cloneAuditEntry(entry: FakePilotAuditEntry): FakePilotAuditEntry {
  return { ...entry };
}

function cloneState(state: FakePilotSimulatorState): FakePilotSimulatorState {
  return {
    ...state,
    completedGates: [...state.completedGates],
    warnings: state.warnings.map(cloneGateResult),
    failures: state.failures.map(cloneGateResult),
    record: cloneRecord(state.record),
    auditLog: state.auditLog.map(cloneAuditEntry),
  };
}

function nowFrom(action: Record<string, unknown>): string {
  return typeof action.now === "string" ? action.now : new Date().toISOString();
}

function actorFrom(action: Record<string, unknown>): string {
  return typeof action.actor === "string" ? sanitizeProofText(action.actor) : "local-fake-admin";
}

function nextGate(gate: FakePilotSimulatorGate): FakePilotSimulatorGate {
  const index = fakePilotSimulatorGates.indexOf(gate);
  return fakePilotSimulatorGates[Math.min(index + 1, fakePilotSimulatorGates.length - 1)];
}

function safeLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const sanitized = sanitizeProofText(value.trim());
  if (!sanitized || sanitized === "[sanitized fake-only proof text]") return fallback;
  return sanitized;
}

function safeCountMap(input: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ...fallback };
  const output: Record<string, number> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const safeKey = safeLabel(key, "synthetic_count");
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) continue;
    output[safeKey] = Math.min(Math.floor(value), 99);
  }
  return Object.keys(output).length > 0 ? output : { ...fallback };
}

function auditEntry(
  gate: FakePilotSimulatorGate,
  action: string,
  status: FakePilotGateStatus,
  note: string,
  now: string,
  actor = "local-fake-admin"
): FakePilotAuditEntry {
  const safeAction = sanitizeProofText(action).replaceAll(/[^a-zA-Z0-9_-]/g, "_");
  return {
    id: `${now}-${gate}-${safeAction}`.replaceAll(/[^a-zA-Z0-9_-]/g, "-"),
    gate,
    action: safeAction,
    actor: sanitizeProofText(actor),
    at: now,
    status,
    note: sanitizeProofText(note),
  };
}

function withAudit(state: FakePilotSimulatorState, entry: FakePilotAuditEntry): FakePilotSimulatorState {
  return {
    ...state,
    auditLog: [entry, ...state.auditLog.map(cloneAuditEntry)],
  };
}

function markCompleted(
  state: FakePilotSimulatorState,
  gate: FakePilotSimulatorGate,
  now: string,
  actor: string,
  action: string,
  note: string,
  updates: Partial<FakePilotSimulatorState> = {}
): FakePilotSimulatorState {
  const completed = [...new Set([...state.completedGates, gate])];
  return withAudit(
    {
      ...cloneState(state),
      ...updates,
      completedGates: completed,
      currentGate: gate === "retention" ? "retention" : nextGate(gate),
      lastBlockedReason: "",
    },
    auditEntry(gate, action, "PASS", note, now, actor)
  );
}

function blockedState(state: FakePilotSimulatorState, gate: FakePilotSimulatorGate, reasonCode: string, label: string, now: string, actor: string): FakePilotSimulatorState {
  const failure: FakePilotGateResult = {
    gate,
    status: "FAIL",
    reasonCode: sanitizeProofText(reasonCode),
    label: sanitizeProofText(label),
  };
  return withAudit(
    {
      ...cloneState(state),
      failures: [failure, ...state.failures.map(cloneGateResult)],
      lastBlockedReason: failure.label,
    },
    auditEntry(gate, "blocked_fake_pilot_gate", "FAIL", failure.label, now, actor)
  );
}

export function createInitialFakePilotSimulatorState(now = "2026-06-21T00:00:00.000Z"): FakePilotSimulatorState {
  return {
    currentGate: "approval",
    completedGates: [],
    warnings: [],
    failures: [],
    record: {
      pilotId: "fake-pilot-001",
      sourceScopeLabel: "synthetic_single_document_shell",
      sourceCategoryLabel: "synthetic_steward_packet_label",
      itemCount: 1,
      recursiveDiscovery: false,
      quarantineLabel: "synthetic_private_holding_label",
      provenanceLabel: "synthetic_provenance_receipt_label",
      redactionFindingCounts: {
        fake_name_label: 1,
        fake_date_label: 1,
        fake_local_context_label: 1,
      },
      metadataReviewCounts: {
        authority_label: 1,
        sensitivity_label: 1,
        retention_label: 1,
      },
      eligibilityDecision: "not_indexable",
      retentionDecision: "delete_synthetic_run",
      syntheticOnly: true,
    },
    auditLog: [
      auditEntry(
        "approval",
        "fake_pilot_simulator_loaded",
        "WARN",
        "Loaded synthetic one-document pilot simulator; no source file, path, OCR, upload, indexing, vector store, or private storage exists.",
        now,
        "system"
      ),
    ],
    lastBlockedReason: "",
    fakeOnly: true,
    realActionsDisabled: true,
  };
}

export function assertFakePilotPayloadSafe(value: unknown): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  function visit(input: unknown, keyName = "") {
    if (keyName && forbiddenActionKeys.has(keyName)) {
      reasons.push(`forbidden file/content field: ${keyName}`);
    }

    if (typeof input === "string") {
      if (forbiddenPrivateFragments.some((fragment) => input.includes(fragment))) reasons.push("forbidden private reference");
      if (pathLikePattern.test(input)) reasons.push("path-or-filename-shaped value");
      if (hashLikePattern.test(input)) reasons.push("hash-shaped value");
      if (identifierLikePattern.test(input)) reasons.push("identifier-shaped value");
      return;
    }

    if (!input || typeof input !== "object") return;

    if (typeof File !== "undefined" && input instanceof File) {
      reasons.push("browser File object is not allowed in fake pilot simulator actions");
      return;
    }

    for (const [childKey, childValue] of Object.entries(input as Record<string, unknown>)) {
      visit(childValue, childKey);
    }
  }

  visit(value);
  return {
    ok: reasons.length === 0,
    reasons: [...new Set(reasons)],
  };
}

export function sanitizeProofText(value: string): string {
  if (
    forbiddenPrivateFragments.some((fragment) => value.includes(fragment)) ||
    pathLikePattern.test(value) ||
    hashLikePattern.test(value) ||
    identifierLikePattern.test(value)
  ) {
    return "[sanitized fake-only proof text]";
  }
  return value;
}

export function applyFakePilotSimulatorAction(
  state: FakePilotSimulatorState,
  action: FakePilotSimulatorAction | Record<string, unknown>
): FakePilotSimulatorState {
  const actionRecord = action as Record<string, unknown>;
  const now = nowFrom(actionRecord);
  const actor = actorFrom(actionRecord);
  const guard = assertFakePilotPayloadSafe(action);

  if (!guard.ok) {
    return blockedState(
      state,
      state.currentGate,
      "unsafe_payload",
      `Blocked unsafe fake pilot payload: ${guard.reasons.join("; ")}`,
      now,
      actor
    );
  }

  if (actionRecord.type === "reset_fake_simulator") return createInitialFakePilotSimulatorState(now);

  if (actionRecord.type === "record_warning") {
    const gate = fakePilotSimulatorGates.includes(actionRecord.gate as FakePilotSimulatorGate)
      ? (actionRecord.gate as FakePilotSimulatorGate)
      : state.currentGate;
    const warning: FakePilotGateResult = {
      gate,
      status: "WARN",
      reasonCode: safeLabel(actionRecord.reasonCode, "operator_review_needed"),
      label: safeLabel(actionRecord.label, "Operator review needed before a later content-touching phase."),
    };
    return withAudit(
      {
        ...cloneState(state),
        warnings: [warning, ...state.warnings.map(cloneGateResult)],
      },
      auditEntry(gate, "record_fake_pilot_warning", "WARN", warning.label, now, actor)
    );
  }

  if (typeof actionRecord.type !== "string" || !(actionRecord.type in gateActionMap)) {
    return blockedState(state, state.currentGate, "unknown_action", "Unknown fake pilot simulator action.", now, actor);
  }

  const gate = gateActionMap[actionRecord.type as keyof typeof gateActionMap];
  if (gate !== state.currentGate) {
    return blockedState(
      state,
      gate,
      "gate_order_violation",
      `Gate ${fakePilotSimulatorGateLabels[gate]} blocked until ${fakePilotSimulatorGateLabels[state.currentGate]} is complete.`,
      now,
      actor
    );
  }

  switch (actionRecord.type) {
    case "approve_operator":
      return markCompleted(state, "approval", now, actor, "approve_fake_pilot_operator_gate", "Operator approved synthetic simulator gate only.");
    case "confirm_scope": {
      const itemCount = typeof actionRecord.itemCount === "number" ? Math.floor(actionRecord.itemCount) : 1;
      if (itemCount !== 1) {
        return blockedState(state, "scope", "single_document_required", "Scope must remain exactly one synthetic document item.", now, actor);
      }
      return markCompleted(state, "scope", now, actor, "confirm_fake_pilot_scope", "Confirmed exactly one synthetic source item.", {
        record: {
          ...cloneRecord(state.record),
          itemCount: 1,
          sourceCategoryLabel: safeLabel(actionRecord.sourceCategoryLabel, state.record.sourceCategoryLabel),
        },
      });
    }
    case "confirm_nonrecursive":
      if (actionRecord.recursiveDiscovery === true) {
        return blockedState(state, "nonrecursive", "recursive_discovery_blocked", "Recursive discovery is blocked in the fake pilot simulator.", now, actor);
      }
      return markCompleted(state, "nonrecursive", now, actor, "confirm_nonrecursive_fake_pilot", "Confirmed non-recursive synthetic flow only.");
    case "assign_quarantine_label":
      return markCompleted(state, "quarantine_label", now, actor, "assign_fake_quarantine_label", "Assigned synthetic private holding label; no copy exists.", {
        record: {
          ...cloneRecord(state.record),
          quarantineLabel: safeLabel(actionRecord.quarantineLabel, state.record.quarantineLabel),
        },
      });
    case "record_provenance_label":
      return markCompleted(state, "provenance", now, actor, "record_fake_provenance_label", "Recorded synthetic provenance label only; no hash value exists.", {
        record: {
          ...cloneRecord(state.record),
          provenanceLabel: safeLabel(actionRecord.provenanceLabel, state.record.provenanceLabel),
        },
      });
    case "review_redaction":
      return markCompleted(state, "redaction_review", now, actor, "review_fake_redaction_counts", "Reviewed synthetic redaction category counts only.", {
        record: {
          ...cloneRecord(state.record),
          redactionFindingCounts: safeCountMap(actionRecord.findingCounts, state.record.redactionFindingCounts),
        },
      });
    case "review_metadata":
      return markCompleted(state, "metadata_review", now, actor, "review_fake_metadata_counts", "Reviewed synthetic metadata label counts only.", {
        record: {
          ...cloneRecord(state.record),
          metadataReviewCounts: safeCountMap(actionRecord.metadataCounts, state.record.metadataReviewCounts),
        },
      });
    case "decide_eligibility": {
      const decision = actionRecord.decision === "candidate_metadata_only" ? "candidate_metadata_only" : "not_indexable";
      return markCompleted(state, "eligibility", now, actor, "decide_fake_eligibility", "Recorded fake eligibility decision; no index or vector store exists.", {
        record: {
          ...cloneRecord(state.record),
          eligibilityDecision: decision,
        },
      });
    }
    case "confirm_audit":
      return markCompleted(state, "audit", now, actor, "confirm_fake_audit", "Confirmed GitHub-safe synthetic proof fields only.");
    case "confirm_rollback":
      return markCompleted(state, "rollback", now, actor, "confirm_fake_rollback", "Confirmed rollback labels for synthetic state only.");
    case "decide_retention": {
      const decision = actionRecord.decision === "retain_synthetic_summary_only" ? "retain_synthetic_summary_only" : "delete_synthetic_run";
      return markCompleted(state, "retention", now, actor, "decide_fake_retention", "Recorded synthetic retention decision only.", {
        record: {
          ...cloneRecord(state.record),
          retentionDecision: decision,
        },
      });
    }
    default:
      return blockedState(state, state.currentGate, "unknown_action", "Unknown fake pilot simulator action.", now, actor);
  }
}

export function fakePilotGateResults(state: FakePilotSimulatorState): FakePilotGateResult[] {
  const results: FakePilotGateResult[] = [];

  for (const gate of fakePilotSimulatorGates) {
    const failure = state.failures.find((item) => item.gate === gate);
    const warning = state.warnings.find((item) => item.gate === gate);
    if (failure) {
      results.push(cloneGateResult(failure));
    } else if (warning) {
      results.push(cloneGateResult(warning));
    } else if (state.completedGates.includes(gate)) {
      results.push({
        gate,
        status: "PASS",
        reasonCode: "gate_complete",
        label: `${fakePilotSimulatorGateLabels[gate]} passed with synthetic metadata only.`,
      });
    } else {
      results.push({
        gate,
        status: "WARN",
        reasonCode: "gate_pending",
        label: `${fakePilotSimulatorGateLabels[gate]} pending; do not proceed to real content.`,
      });
    }
  }

  return results;
}

export function fakePilotProofResult(state: FakePilotSimulatorState): FakePilotGateStatus {
  const results = fakePilotGateResults(state);
  if (results.some((item) => item.status === "FAIL")) return "FAIL";
  if (results.some((item) => item.status === "WARN")) return "WARN";
  return "PASS";
}

function sanitizeRecordForProof(record: FakePilotSimulatorRecord): FakePilotSimulatorRecord {
  return {
    ...cloneRecord(record),
    pilotId: safeLabel(record.pilotId, "fake-pilot-sanitized"),
    sourceScopeLabel: safeLabel(record.sourceScopeLabel, "synthetic_scope_label"),
    sourceCategoryLabel: safeLabel(record.sourceCategoryLabel, "synthetic_source_category_label"),
    quarantineLabel: safeLabel(record.quarantineLabel, "synthetic_private_holding_label"),
    provenanceLabel: safeLabel(record.provenanceLabel, "synthetic_provenance_receipt_label"),
    redactionFindingCounts: safeCountMap(record.redactionFindingCounts, {}),
    metadataReviewCounts: safeCountMap(record.metadataReviewCounts, {}),
  };
}

function sanitizeGateResultForProof(result: FakePilotGateResult): FakePilotGateResult {
  return {
    gate: result.gate,
    status: result.status,
    reasonCode: safeLabel(result.reasonCode, "sanitized_reason"),
    label: safeLabel(result.label, "Sanitized fake-only gate result."),
  };
}

function sanitizeAuditForProof(entry: FakePilotAuditEntry): FakePilotAuditEntry {
  return {
    id: safeLabel(entry.id, "fake-audit-entry"),
    gate: entry.gate,
    action: safeLabel(entry.action, "fake_action"),
    actor: safeLabel(entry.actor, "fake_actor"),
    at: entry.at,
    status: entry.status,
    note: safeLabel(entry.note, "Sanitized fake-only audit note."),
  };
}

export function exportFakePilotSimulatorProofJson(state: FakePilotSimulatorState, version: RuntimeVersion, generatedAt: string): string {
  const gateResults = fakePilotGateResults(state).map(sanitizeGateResultForProof);
  const passCount = gateResults.filter((item) => item.status === "PASS").length;
  const warnCount = gateResults.filter((item) => item.status === "WARN").length;
  const failCount = gateResults.filter((item) => item.status === "FAIL").length;
  const record = sanitizeRecordForProof(state.record);
  const payload: FakePilotProofExport = {
    exportType: "kia-stick-fake-pilot-simulator-proof",
    generatedAt,
    version,
    guard: {
      fakeMetadataOnly: true,
      syntheticIdsLabelsCountsOnly: true,
      privatePathsIncluded: false,
      filenamesIncluded: false,
      fileContentIncluded: false,
      snippetsIncluded: false,
      ocrTextIncluded: false,
      hashValuesIncluded: false,
      identifiersIncluded: false,
      exportsIncluded: false,
      vectorDataIncluded: false,
      privateNotesIncluded: false,
      uploadHandlerIncluded: false,
      fileInputIncluded: false,
      realDocumentAccessed: false,
      realPilotImplemented: false,
    },
    summary: {
      currentGate: state.currentGate,
      completedGateCount: state.completedGates.length,
      passCount,
      warnCount,
      failCount,
      proofResult: failCount > 0 ? "FAIL" : warnCount > 0 ? "WARN" : "PASS",
      eligibilityDecision: record.eligibilityDecision,
      retentionDecision: record.retentionDecision,
    },
    record,
    gateResults,
    auditLog: state.auditLog.map(sanitizeAuditForProof),
  };

  return JSON.stringify(payload, null, 2);
}

export function exportFakePilotSimulatorProofMarkdown(state: FakePilotSimulatorState, version: RuntimeVersion, generatedAt: string): string {
  const payload = JSON.parse(exportFakePilotSimulatorProofJson(state, version, generatedAt)) as FakePilotProofExport;
  const lines = [
    "# KIA Stick Fake Pilot Simulator Proof",
    "",
    `Generated: ${payload.generatedAt}`,
    `Display version: ${payload.version.displayVersion}`,
    `Proof result: ${payload.summary.proofResult}`,
    `Pilot ID: ${payload.record.pilotId}`,
    `Eligibility: ${payload.record.eligibilityDecision}`,
    `Retention: ${payload.record.retentionDecision}`,
    "",
    "## Guard",
    "",
    "- Fake metadata only: true",
    "- Synthetic IDs, labels, and counts only: true",
    "- Private paths included: false",
    "- Filenames included: false",
    "- File content included: false",
    "- Snippets included: false",
    "- OCR text included: false",
    "- Hash values included: false",
    "- Identifiers included: false",
    "- Exports included: false",
    "- Vector data included: false",
    "- Private notes included: false",
    "- Upload handler included: false",
    "- File input included: false",
    "- Real document accessed: false",
    "- Real pilot implemented: false",
    "",
    "## Gate Results",
    "",
    ...payload.gateResults.map((result) => `- ${result.status} ${fakePilotSimulatorGateLabels[result.gate]}: ${result.label}`),
    "",
    "## Synthetic Counts",
    "",
    ...Object.entries(payload.record.redactionFindingCounts).map(([label, count]) => `- redaction:${label}=${count}`),
    ...Object.entries(payload.record.metadataReviewCounts).map(([label, count]) => `- metadata:${label}=${count}`),
    "",
    "## Audit Events",
    "",
    ...payload.auditLog.map((entry) => `- ${entry.at} | ${entry.status} | ${entry.gate} | ${entry.action} | ${entry.note}`),
    "",
  ];

  return lines.join("\n");
}
