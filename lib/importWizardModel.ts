import type { RuntimeVersion } from "@/lib/version";
import {
  assertFakeRedactionMetadataSafe,
  cloneRedactionMetadata,
  fakeImportRedactionMetadata,
  redactionEligibilityImpactFor,
  redactionMetadataCategoryLabels,
  redactionReviewOutcomeFor,
  type FakeEligibilityImpact,
  type FakeRedactionMetadata,
  type FakeRedactionReviewOutcome,
} from "@/lib/redactionMetadataModel";

export const importWizardSteps = [
  "start_safety",
  "source_placeholder",
  "scope_confirm",
  "quarantine_confirm",
  "provenance_hash",
  "redaction_detection",
  "admin_redaction_review",
  "metadata_review",
  "index_eligibility",
  "audit_summary",
] as const;

export type ImportWizardStep = (typeof importWizardSteps)[number];

export type ImportScopeMode = "single_fake_file" | "explicit_fake_batch";
export type ImportIndexDecision = "not_indexable" | "eligible_fake_only";

export interface FakeImportWizardRecord {
  id: string;
  displayName: string;
  fakeSourceAlias: string;
  scopeMode: ImportScopeMode;
  itemCount: number;
  lane: "quarantine";
  sourceStatus: "fake_placeholder";
  sensitivity: "moderate";
  fakeHash: string;
  fakeProvenance: string;
  redactionFlags: string[];
  redactionMetadata: FakeRedactionMetadata[];
  redactionReviewOutcome: FakeRedactionReviewOutcome;
  redactionEligibilityImpact: FakeEligibilityImpact;
  reviewer: string;
  metadataReviewer: string;
  indexDecision: ImportIndexDecision;
  proofId: string;
  githubSafe: boolean;
}

export interface ImportWizardAuditEntry {
  id: string;
  action: string;
  actor: string;
  at: string;
  step: ImportWizardStep;
  note: string;
}

export interface ImportWizardState {
  currentStep: ImportWizardStep;
  record: FakeImportWizardRecord;
  auditLog: ImportWizardAuditEntry[];
  acknowledgedSafety: boolean;
  sourceSelected: boolean;
  scopeConfirmed: boolean;
  quarantineConfirmed: boolean;
  provenanceRecorded: boolean;
  redactionPreviewed: boolean;
  redactionApproved: boolean;
  metadataApproved: boolean;
  auditComplete: boolean;
  lastBlockedReason: string;
  fakeOnly: true;
  realActionsDisabled: true;
}

export type ImportWizardAction =
  | { type: "start_fake_wizard"; actor?: string; now?: string }
  | { type: "select_fake_source"; actor?: string; now?: string; scopeMode?: ImportScopeMode; itemCount?: number }
  | { type: "confirm_fake_scope"; actor?: string; now?: string }
  | { type: "confirm_fake_quarantine"; actor?: string; now?: string }
  | { type: "record_fake_provenance"; actor?: string; now?: string }
  | { type: "preview_fake_redaction"; actor?: string; now?: string }
  | { type: "approve_fake_redaction"; actor?: string; now?: string }
  | { type: "approve_fake_metadata"; actor?: string; now?: string }
  | { type: "decide_fake_index"; actor?: string; now?: string; decision?: ImportIndexDecision }
  | { type: "complete_fake_audit"; actor?: string; now?: string }
  | { type: "jump_to_step"; targetStep: ImportWizardStep; actor?: string; now?: string }
  | { type: "block_future_real_action"; actor?: string; now?: string; reason?: string }
  | { type: "reset_fake_wizard"; actor?: string; now?: string };

export type ImportWizardNextActionType =
  | "start_fake_wizard"
  | "select_fake_source"
  | "confirm_fake_scope"
  | "confirm_fake_quarantine"
  | "record_fake_provenance"
  | "preview_fake_redaction"
  | "approve_fake_redaction"
  | "approve_fake_metadata"
  | "decide_fake_index"
  | "complete_fake_audit";

export interface ImportWizardAuditExport {
  exportType: "kia-stick-fake-import-wizard-audit";
  generatedAt: string;
  version: RuntimeVersion;
  guard: {
    fakeMetadataOnly: true;
    privatePathsIncluded: false;
    fileContentIncluded: false;
    fileObjectsIncluded: false;
    ocrTextIncluded: false;
    snippetsIncluded: false;
    uploadsIncluded: false;
    vectorStoreIncluded: false;
    privateNotesIncluded: false;
    realIdentifiersIncluded: false;
    realImportImplemented: false;
    filePickerImplemented: false;
    exportContainsOnlySyntheticMetadata: true;
  };
  summary: {
    currentStep: ImportWizardStep;
    auditEntries: number;
    itemCount: number;
    indexDecision: ImportIndexDecision;
    redactionReviewOutcome: FakeRedactionReviewOutcome;
    redactionEligibilityImpact: FakeEligibilityImpact;
    realActionsDisabled: true;
  };
  fakeState: Pick<
    ImportWizardState,
    | "currentStep"
    | "acknowledgedSafety"
    | "sourceSelected"
    | "scopeConfirmed"
    | "quarantineConfirmed"
    | "provenanceRecorded"
    | "redactionPreviewed"
    | "redactionApproved"
    | "metadataApproved"
    | "auditComplete"
    | "fakeOnly"
    | "realActionsDisabled"
  >;
  record: FakeImportWizardRecord;
  auditLog: ImportWizardAuditEntry[];
}

export const importWizardStepLabels: Record<ImportWizardStep, string> = {
  start_safety: "Start / safety",
  source_placeholder: "Source placeholder",
  scope_confirm: "Scope confirm",
  quarantine_confirm: "Copy-to-quarantine confirm",
  provenance_hash: "Provenance / hash",
  redaction_detection: "Redaction detection preview",
  admin_redaction_review: "Admin redaction review",
  metadata_review: "Metadata review",
  index_eligibility: "Index eligibility",
  audit_summary: "Audit summary",
};

export const importWizardAllowedTransitions: Record<ImportWizardStep, readonly ImportWizardStep[]> = {
  start_safety: ["source_placeholder"],
  source_placeholder: ["scope_confirm"],
  scope_confirm: ["quarantine_confirm"],
  quarantine_confirm: ["provenance_hash"],
  provenance_hash: ["redaction_detection"],
  redaction_detection: ["admin_redaction_review"],
  admin_redaction_review: ["metadata_review"],
  metadata_review: ["index_eligibility"],
  index_eligibility: ["audit_summary"],
  audit_summary: [],
};

export const importWizardScreenCopy: Record<ImportWizardStep, { title: string; plain: string; stopSign: string }> = {
  start_safety: {
    title: "Start / Safety",
    plain: "Import is a review process, not a shortcut. This fake scaffold does not read, copy, OCR, summarize, or index anything.",
    stopSign: "Blocked until the operator acknowledges that selection is not import and quarantine is not indexing.",
  },
  source_placeholder: {
    title: "Source Placeholder",
    plain: "Choose what would be reviewed later. This fake step only selects synthetic metadata; it has no file picker and reads no bytes.",
    stopSign: "Blocked if a real path, file object, or content field appears in the action payload.",
  },
  scope_confirm: {
    title: "Scope Confirm",
    plain: "Confirm one fake file or an explicitly bounded fake batch. Scope confirmation still does not copy, hash, OCR, summarize, or index.",
    stopSign: "Blocked until fake source selection exists and the scope is non-recursive.",
  },
  quarantine_confirm: {
    title: "Copy-to-Quarantine Confirm",
    plain: "Quarantine is a private holding idea. In this scaffold it is only a fake metadata gate and is never indexable.",
    stopSign: "Blocked until fake scope confirmation is complete.",
  },
  provenance_hash: {
    title: "Provenance / Hash Receipt",
    plain: "Provenance is the receipt. This scaffold uses a fake hash and fake provenance only.",
    stopSign: "Blocked until fake quarantine confirmation exists.",
  },
  redaction_detection: {
    title: "Redaction Detection Preview",
    plain: "Detection is a warning light, not approval. This scaffold shows fake category counts only.",
    stopSign: "Blocked until fake provenance is recorded.",
  },
  admin_redaction_review: {
    title: "Admin Redaction Review",
    plain: "Redaction review decides whether a safe derivative could exist later. It is not metadata approval or indexing.",
    stopSign: "Blocked until fake redaction preview is complete.",
  },
  metadata_review: {
    title: "Metadata Review",
    plain: "Metadata review names authority, source status, sensitivity, and citation handling. It is still not indexing.",
    stopSign: "Blocked until fake redaction review is approved.",
  },
  index_eligibility: {
    title: "Index Eligibility",
    plain: "Index eligibility is a separate yes/no decision. Approval is not indexing.",
    stopSign: "Blocked until fake metadata review is approved.",
  },
  audit_summary: {
    title: "Audit Summary",
    plain: "The audit summary proves which fake gates ran without exposing documents, paths, snippets, OCR, or private notes.",
    stopSign: "Blocked until fake index eligibility is decided.",
  },
};

const forbiddenActionKeys = new Set([
  "path",
  "sourcePath",
  "localPath",
  "privatePath",
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
  "upload",
  "uploads",
  "vectorStore",
  "embeddings",
  "privateNote",
  "realIdentifier",
  "realIdentifiers",
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

function cloneRecord(record: FakeImportWizardRecord): FakeImportWizardRecord {
  return {
    ...record,
    redactionFlags: [...record.redactionFlags],
    redactionMetadata: cloneRedactionMetadata(record.redactionMetadata),
  };
}

function cloneAudit(entry: ImportWizardAuditEntry): ImportWizardAuditEntry {
  return { ...entry };
}

function cloneState(state: ImportWizardState): ImportWizardState {
  return {
    ...state,
    record: cloneRecord(state.record),
    auditLog: state.auditLog.map(cloneAudit),
  };
}

function auditEntry(step: ImportWizardStep, action: string, note: string, now: string, actor = "local-fake-admin"): ImportWizardAuditEntry {
  const safeAction = sanitizeAuditText(action);
  const safeActor = sanitizeAuditText(actor);
  const safeNote = sanitizeAuditText(note);
  return {
    id: `${now}-${step}-${safeAction}`.replaceAll(/[^a-zA-Z0-9_-]/g, "-"),
    action: safeAction,
    actor: safeActor,
    at: now,
    step,
    note: safeNote,
  };
}

function withAudit(state: ImportWizardState, entry: ImportWizardAuditEntry): ImportWizardState {
  return {
    ...state,
    auditLog: [entry, ...state.auditLog.map(cloneAudit)],
  };
}

function setBlocked(state: ImportWizardState, reason: string, now: string, actor: string, action = "blocked_invalid_import_wizard_transition"): ImportWizardState {
  return withAudit(
    {
      ...cloneState(state),
      lastBlockedReason: reason,
    },
    auditEntry(state.currentStep, action, reason, now, actor)
  );
}

function sanitizeAuditText(value: string): string {
  if (forbiddenPrivateFragments.some((fragment) => value.includes(fragment))) {
    return "[sanitized fake-only audit text]";
  }
  return value;
}

export function createInitialImportWizardState(now = "2026-06-20T00:00:00.000Z"): ImportWizardState {
  const state: ImportWizardState = {
    currentStep: "start_safety",
    record: {
      id: "fake-import-wizard-record-001",
      displayName: "Fake steward packet candidate",
      fakeSourceAlias: "operator_selected_single_file",
      scopeMode: "single_fake_file",
      itemCount: 1,
      lane: "quarantine",
      sourceStatus: "fake_placeholder",
      sensitivity: "moderate",
      fakeHash: "fakehash-import-051-a1b2c3d4",
      fakeProvenance: "Synthetic import wizard fixture; no source file exists.",
      redactionFlags: redactionMetadataCategoryLabels(fakeImportRedactionMetadata),
      redactionMetadata: cloneRedactionMetadata(fakeImportRedactionMetadata),
      redactionReviewOutcome: redactionReviewOutcomeFor(fakeImportRedactionMetadata),
      redactionEligibilityImpact: redactionEligibilityImpactFor(fakeImportRedactionMetadata),
      reviewer: "UNREVIEWED",
      metadataReviewer: "UNREVIEWED",
      indexDecision: "not_indexable",
      proofId: "fake-proof-import-wizard-001",
      githubSafe: true,
    },
    auditLog: [
      auditEntry(
        "start_safety",
        "fake_import_wizard_loaded",
        "Loaded fake import wizard metadata only; no file picker, file read, copy, OCR, upload, or indexing exists.",
        now,
        "system"
      ),
    ],
    acknowledgedSafety: false,
    sourceSelected: false,
    scopeConfirmed: false,
    quarantineConfirmed: false,
    provenanceRecorded: false,
    redactionPreviewed: false,
    redactionApproved: false,
    metadataApproved: false,
    auditComplete: false,
    lastBlockedReason: "",
    fakeOnly: true,
    realActionsDisabled: true,
  };

  return state;
}

export function assertImportWizardFakeOnly(value: unknown): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  function visit(input: unknown, keyName = "") {
    if (keyName && forbiddenActionKeys.has(keyName)) {
      reasons.push(`forbidden file/content field: ${keyName}`);
    }

    if (typeof input === "string") {
      if (forbiddenPrivateFragments.some((fragment) => input.includes(fragment))) {
        reasons.push("forbidden private reference");
      }
      return;
    }

    if (!input || typeof input !== "object") return;

    if (typeof File !== "undefined" && input instanceof File) {
      reasons.push("browser File object is not allowed in import wizard actions");
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

export function nextImportWizardStep(step: ImportWizardStep): ImportWizardStep {
  const currentIndex = importWizardSteps.indexOf(step);
  return importWizardSteps[Math.min(currentIndex + 1, importWizardSteps.length - 1)];
}

function transitionKey(from: ImportWizardStep, to: ImportWizardStep): `${ImportWizardStep}->${ImportWizardStep}` {
  return `${from}->${to}`;
}

const explicitBlockedTransitionReasons: Partial<Record<`${ImportWizardStep}->${ImportWizardStep}`, string>> = {
  "source_placeholder->index_eligibility":
    "Select-to-index blocked: fake source selection is not import. Confirm fake scope, quarantine, provenance, redaction review, and metadata review first.",
  "quarantine_confirm->index_eligibility":
    "Quarantine-to-index blocked: quarantine is a holding gate and is never indexable by itself. Record fake provenance, preview redaction, approve redaction, and approve metadata first.",
  "redaction_detection->metadata_review":
    "Detection-to-approval blocked: redaction detection is only a preview. Admin redaction review must explicitly approve fake redaction first.",
  "redaction_detection->index_eligibility":
    "Detection-to-index blocked: redaction detection is not approval and cannot skip admin review or metadata review.",
  "admin_redaction_review->index_eligibility":
    "Redaction-to-index blocked: redaction approval is not indexing. Fake metadata review must approve before index eligibility.",
  "metadata_review->index_eligibility":
    "Metadata-to-index blocked: use the fake metadata approval action so the audit records the review before index eligibility.",
  "metadata_review->audit_summary":
    "Metadata-to-audit blocked: fake metadata review cannot skip the separate index eligibility decision.",
};

function validateTargetStep(state: ImportWizardState, targetStep: ImportWizardStep): string | null {
  const allowed = importWizardAllowedTransitions[state.currentStep];
  if (!allowed.includes(targetStep)) {
    const explicitReason = explicitBlockedTransitionReasons[transitionKey(state.currentStep, targetStep)];
    if (explicitReason) return explicitReason;
    return `Invalid transition: ${importWizardStepLabels[state.currentStep]} can only move to ${importWizardStepLabels[nextImportWizardStep(state.currentStep)]}.`;
  }
  return null;
}

function advanceTo(state: ImportWizardState, targetStep: ImportWizardStep, now: string, actor: string, note: string): ImportWizardState {
  const blocked = validateTargetStep(state, targetStep);
  if (blocked) return setBlocked(state, blocked, now, actor);

  return withAudit(
    {
      ...cloneState(state),
      currentStep: targetStep,
      lastBlockedReason: "",
    },
    auditEntry(targetStep, "advance_fake_import_gate", note, now, actor)
  );
}

export function applyImportWizardAction(state: ImportWizardState, action: ImportWizardAction | Record<string, unknown>): ImportWizardState {
  const actionRecord = action as Record<string, unknown>;
  const now = typeof actionRecord.now === "string" ? actionRecord.now : new Date().toISOString();
  const actor = typeof actionRecord.actor === "string" ? actionRecord.actor : "local-fake-admin";
  const guard = assertImportWizardFakeOnly(action);

  if (!guard.ok) {
    return setBlocked(
      state,
      `Blocked non-metadata import wizard action: ${guard.reasons.join("; ")}`,
      now,
      actor,
      "blocked_real_import_attempt"
    );
  }

  switch (actionRecord.type) {
    case "reset_fake_wizard":
      return createInitialImportWizardState(now);
    case "block_future_real_action":
      return setBlocked(
        state,
        typeof actionRecord.reason === "string"
          ? actionRecord.reason
          : "Future real-content action is disabled. This scaffold has no file picker, file reads, copying, OCR, uploads, or indexing.",
        now,
        actor,
        "blocked_future_real_action"
      );
    case "jump_to_step":
      if (typeof actionRecord.targetStep !== "string" || !importWizardSteps.includes(actionRecord.targetStep as ImportWizardStep)) {
        return setBlocked(state, "Unknown import wizard step.", now, actor);
      }
      {
        const targetStep = actionRecord.targetStep as ImportWizardStep;
        const directJumpReason = explicitBlockedTransitionReasons[transitionKey(state.currentStep, targetStep)];
        const blockedReason =
          directJumpReason ??
          validateTargetStep(state, targetStep) ??
          `Use the named fake action for ${importWizardStepLabels[targetStep]} so sanitized audit and guard flags are written.`;
        return setBlocked(state, `Direct jump blocked: ${blockedReason}`, now, actor);
      }
    case "start_fake_wizard": {
      if (state.currentStep !== "start_safety") return setBlocked(state, "Safety acknowledgement already moved past start.", now, actor);
      const nextState = advanceTo(
        {
          ...state,
          acknowledgedSafety: true,
        },
        "source_placeholder",
        now,
        actor,
        "Acknowledged fake-only safety warning; selection is not import and quarantine is not indexing."
      );
      return nextState;
    }
    case "select_fake_source": {
      if (!state.acknowledgedSafety) return setBlocked(state, "Safety warning must be acknowledged before fake source selection.", now, actor);
      if (state.currentStep !== "source_placeholder") return setBlocked(state, "Fake source placeholder is not the active step.", now, actor);
      const scopeMode = actionRecord.scopeMode === "explicit_fake_batch" ? "explicit_fake_batch" : "single_fake_file";
      const itemCount = typeof actionRecord.itemCount === "number" && actionRecord.itemCount > 1 ? Math.min(Math.floor(actionRecord.itemCount), 3) : 1;
      return advanceTo(
        {
          ...state,
          sourceSelected: true,
          record: {
            ...cloneRecord(state.record),
            scopeMode,
            itemCount: scopeMode === "single_fake_file" ? 1 : itemCount,
          },
        },
        "scope_confirm",
        now,
        actor,
        "Selected synthetic source placeholder only; no path, file picker, or bytes were accessed."
      );
    }
    case "confirm_fake_scope": {
      if (!state.sourceSelected) return setBlocked(state, "Select a fake source placeholder before confirming scope.", now, actor);
      if (state.currentStep !== "scope_confirm") return setBlocked(state, "Scope confirmation is not the active step.", now, actor);
      return advanceTo(
        {
          ...state,
          scopeConfirmed: true,
        },
        "quarantine_confirm",
        now,
        actor,
        "Confirmed explicit fake scope; confirmation is not copying, OCR, summarizing, or indexing."
      );
    }
    case "confirm_fake_quarantine": {
      if (!state.scopeConfirmed) return setBlocked(state, "Scope must be confirmed before quarantine consent.", now, actor);
      if (state.currentStep !== "quarantine_confirm") return setBlocked(state, "Copy-to-quarantine confirmation is not the active step.", now, actor);
      return advanceTo(
        {
          ...state,
          quarantineConfirmed: true,
      record: {
        ...cloneRecord(state.record),
        indexDecision: "not_indexable",
        redactionEligibilityImpact: redactionEligibilityImpactFor(state.record.redactionMetadata),
      },
        },
        "provenance_hash",
        now,
        actor,
        "Confirmed fake quarantine metadata only; quarantine is not indexable and no file was copied."
      );
    }
    case "record_fake_provenance": {
      if (!state.quarantineConfirmed) return setBlocked(state, "Fake quarantine confirmation must happen before provenance.", now, actor);
      if (state.currentStep !== "provenance_hash") return setBlocked(state, "Provenance/hash is not the active step.", now, actor);
      return advanceTo(
        {
          ...state,
          provenanceRecorded: true,
        },
        "redaction_detection",
        now,
        actor,
        "Recorded fake hash and fake provenance receipt only; raw hashes and source paths are absent."
      );
    }
    case "preview_fake_redaction": {
      if (!state.provenanceRecorded) return setBlocked(state, "Fake provenance must be recorded before redaction preview.", now, actor);
      if (state.currentStep !== "redaction_detection") return setBlocked(state, "Redaction detection preview is not the active step.", now, actor);
      return advanceTo(
        {
          ...state,
          redactionPreviewed: true,
        },
        "admin_redaction_review",
        now,
        actor,
        "Previewed fake redaction categories only; detection is not approval."
      );
    }
    case "approve_fake_redaction": {
      if (!state.redactionPreviewed) return setBlocked(state, "Fake redaction preview must happen before admin review.", now, actor);
      if (state.currentStep !== "admin_redaction_review") return setBlocked(state, "Admin redaction review is not the active step.", now, actor);
      return advanceTo(
        {
          ...state,
          redactionApproved: true,
          record: {
            ...cloneRecord(state.record),
            reviewer: "FAKE-ADMIN",
            redactionReviewOutcome: "approve_redaction",
            redactionEligibilityImpact: "metadata_required",
          },
        },
        "metadata_review",
        now,
        actor,
        "Approved fake redaction review only; redaction is not metadata approval or indexing."
      );
    }
    case "approve_fake_metadata": {
      if (!state.redactionApproved) return setBlocked(state, "Fake redaction review must approve before metadata review.", now, actor);
      if (state.currentStep !== "metadata_review") return setBlocked(state, "Metadata review is not the active step.", now, actor);
      return advanceTo(
        {
          ...state,
          metadataApproved: true,
          record: {
            ...cloneRecord(state.record),
            metadataReviewer: "FAKE-METADATA-ADMIN",
          },
        },
        "index_eligibility",
        now,
        actor,
        "Approved fake metadata review only; metadata approval is not indexing."
      );
    }
    case "decide_fake_index": {
      if (!state.metadataApproved) return setBlocked(state, "Fake metadata review must approve before index eligibility.", now, actor);
      if (state.currentStep !== "index_eligibility") return setBlocked(state, "Index eligibility is not the active step.", now, actor);
      const decision = actionRecord.decision === "eligible_fake_only" ? "eligible_fake_only" : "not_indexable";
      return advanceTo(
        {
          ...state,
          record: {
            ...cloneRecord(state.record),
            indexDecision: decision,
          },
        },
        "audit_summary",
        now,
        actor,
        `Recorded ${decision} decision for fake metadata only; approval is not indexing and no embeddings were built.`
      );
    }
    case "complete_fake_audit": {
      if (state.currentStep !== "audit_summary") return setBlocked(state, "Audit summary can complete only after fake index decision.", now, actor);
      return withAudit(
        {
          ...cloneState(state),
          auditComplete: true,
          lastBlockedReason: "",
        },
        auditEntry("audit_summary", "fake_import_audit_complete", "Completed fake import wizard audit summary; proof contains synthetic metadata only.", now, actor)
      );
    }
    default:
      return setBlocked(state, "Unknown fake import wizard action.", now, actor);
  }
}

export function importWizardNextAction(step: ImportWizardStep): ImportWizardNextActionType {
  if (step === "start_safety") return "start_fake_wizard";
  if (step === "source_placeholder") return "select_fake_source";
  if (step === "scope_confirm") return "confirm_fake_scope";
  if (step === "quarantine_confirm") return "confirm_fake_quarantine";
  if (step === "provenance_hash") return "record_fake_provenance";
  if (step === "redaction_detection") return "preview_fake_redaction";
  if (step === "admin_redaction_review") return "approve_fake_redaction";
  if (step === "metadata_review") return "approve_fake_metadata";
  if (step === "index_eligibility") return "decide_fake_index";
  return "complete_fake_audit";
}

export function importWizardNextActionLabel(step: ImportWizardStep): string {
  if (step === "start_safety") return "Start fake wizard";
  if (step === "source_placeholder") return "Select fake source";
  if (step === "scope_confirm") return "Confirm fake scope";
  if (step === "quarantine_confirm") return "Confirm fake quarantine";
  if (step === "provenance_hash") return "Record fake provenance";
  if (step === "redaction_detection") return "Preview fake redaction";
  if (step === "admin_redaction_review") return "Approve fake redaction";
  if (step === "metadata_review") return "Approve fake metadata";
  if (step === "index_eligibility") return "Record fake index decision";
  return "Complete fake audit";
}

export function exportImportWizardAuditJson(state: ImportWizardState, version: RuntimeVersion, generatedAt: string): string {
  const record = sanitizeImportRecordForExport(state.record);
  const payload: ImportWizardAuditExport = {
    exportType: "kia-stick-fake-import-wizard-audit",
    generatedAt,
    version,
    guard: {
      fakeMetadataOnly: true,
      privatePathsIncluded: false,
      fileContentIncluded: false,
      fileObjectsIncluded: false,
      ocrTextIncluded: false,
      snippetsIncluded: false,
      uploadsIncluded: false,
      vectorStoreIncluded: false,
      privateNotesIncluded: false,
      realIdentifiersIncluded: false,
      realImportImplemented: false,
      filePickerImplemented: false,
      exportContainsOnlySyntheticMetadata: true,
    },
    summary: {
      currentStep: state.currentStep,
      auditEntries: state.auditLog.length,
      itemCount: state.record.itemCount,
      indexDecision: state.record.indexDecision,
      redactionReviewOutcome: state.record.redactionReviewOutcome,
      redactionEligibilityImpact: state.record.redactionEligibilityImpact,
      realActionsDisabled: true,
    },
    fakeState: {
      currentStep: state.currentStep,
      acknowledgedSafety: state.acknowledgedSafety,
      sourceSelected: state.sourceSelected,
      scopeConfirmed: state.scopeConfirmed,
      quarantineConfirmed: state.quarantineConfirmed,
      provenanceRecorded: state.provenanceRecorded,
      redactionPreviewed: state.redactionPreviewed,
      redactionApproved: state.redactionApproved,
      metadataApproved: state.metadataApproved,
      auditComplete: state.auditComplete,
      fakeOnly: true,
      realActionsDisabled: true,
    },
    record,
    auditLog: state.auditLog.map(sanitizeAuditEntryForExport),
  };

  return JSON.stringify(payload, null, 2);
}

export function exportImportWizardAuditMarkdown(state: ImportWizardState, version: RuntimeVersion, generatedAt: string): string {
  const auditLog = state.auditLog.map(sanitizeAuditEntryForExport);
  const record = sanitizeImportRecordForExport(state.record);
  const lines = [
    "# KIA Stick Fake Import Wizard Audit",
    "",
    `Generated: ${generatedAt}`,
    `Display version: ${version.displayVersion}`,
    `Current step: ${importWizardStepLabels[state.currentStep]}`,
    `Record: ${record.id}`,
    `Scope: ${record.scopeMode}`,
    `Items: ${record.itemCount}`,
    `Index decision: ${record.indexDecision}`,
    `Redaction outcome: ${record.redactionReviewOutcome}`,
    `Redaction eligibility impact: ${record.redactionEligibilityImpact}`,
    "",
    "## Guard",
    "",
    "- Fake metadata only: true",
    "- Private paths included: false",
    "- File content included: false",
    "- File objects included: false",
    "- OCR text included: false",
    "- Snippets included: false",
    "- Uploads included: false",
    "- Vector store included: false",
    "- Private notes included: false",
    "- Real identifiers included: false",
    "- Real import implemented: false",
    "- File picker implemented: false",
    "- Real identifiers included: false",
    "",
    "## Fake Redaction Metadata",
    "",
    ...record.redactionMetadata.map(
      (item) =>
        `- ${item.safeExampleLabel} | ${item.category} | ${item.severity} | confidence ${item.confidence} | ${item.eligibilityImpact} | ${item.reason}`
    ),
    "",
    "## Audit Events",
    "",
    ...auditLog.map((entry) => `- ${entry.at} | ${entry.action} | ${entry.step} | ${entry.note}`),
    "",
  ];

  return lines.join("\n");
}

function sanitizeAuditEntryForExport(entry: ImportWizardAuditEntry): ImportWizardAuditEntry {
  const sanitized = {
    ...entry,
    id: sanitizeAuditText(entry.id),
    action: sanitizeAuditText(entry.action),
    actor: sanitizeAuditText(entry.actor),
    note: sanitizeAuditText(entry.note),
  };
  const guard = assertImportWizardFakeOnly(sanitized);
  if (guard.ok) return sanitized;

  return {
    ...sanitized,
    note: `Sanitized unsafe audit entry from fake proof: ${guard.reasons.join("; ")}`,
  };
}

function sanitizeImportRecordForExport(record: FakeImportWizardRecord): FakeImportWizardRecord {
  const cloned = cloneRecord(record);
  const metadataGuard = assertFakeRedactionMetadataSafe(cloned.redactionMetadata);
  const recordGuard = assertImportWizardFakeOnly(cloned);
  if (metadataGuard.ok && recordGuard.ok) return cloned;
  return {
    ...cloned,
    redactionFlags: ["sanitized-fake-redaction-metadata"],
    redactionMetadata: [],
    redactionReviewOutcome: "needs_more_redaction",
    redactionEligibilityImpact: "redaction_required",
  };
}
