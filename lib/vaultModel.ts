import type { RuntimeVersion } from "@/lib/version";
import {
  assertFakeRedactionMetadataSafe,
  cloneRedactionMetadata,
  fakeVaultRedactionMetadataByRecord,
  redactionEligibilityImpactFor,
  redactionMetadataCategoryLabels,
  redactionReviewOutcomeFor,
  type FakeEligibilityImpact,
  type FakeRedactionMetadata,
  type FakeRedactionReviewOutcome,
} from "@/lib/redactionMetadataModel";

export const vaultLanes = [
  "official_public",
  "official_member_only",
  "local_official",
  "steward_only",
  "redacted_examples",
  "restricted_sensitive",
  "quarantine",
] as const;

export type VaultLane = (typeof vaultLanes)[number];

export const lifecycleSteps = [
  "selected",
  "quarantine",
  "hash_provenance",
  "redaction_review",
  "metadata_review",
  "index_eligibility",
  "audit",
] as const;

export type LifecycleStep = (typeof lifecycleSteps)[number];

export type AuthorityLevel = "controlling" | "official" | "local_official" | "persuasive" | "steward_note" | "example" | "unknown";
export type SourceStatus = "public" | "member_only" | "local_private" | "steward_private" | "restricted" | "unknown";
export type Sensitivity = "low" | "moderate" | "high" | "restricted_sensitive" | "unknown";
export type RedactionStatus = "not_started" | "detection_flagged" | "review_needed" | "approved_redacted" | "rejected" | "restricted";
export type MetadataStatus = "not_reviewed" | "needs_changes" | "reviewed" | "rejected";
export type VaultWorkflowState =
  | "not_indexable"
  | "quarantine_only"
  | "redaction_required"
  | "metadata_required"
  | "review_rejected"
  | "eligible_fake_only";

export interface FakeVaultRecord {
  id: string;
  title: string;
  lane: VaultLane;
  lifecycleStep: LifecycleStep;
  authorityLevel: AuthorityLevel;
  sourceStatus: SourceStatus;
  sensitivity: Sensitivity;
  redactionStatus: RedactionStatus;
  metadataStatus: MetadataStatus;
  workflowState: VaultWorkflowState;
  indexReason: string;
  lastBlockedReason: string;
  reviewer: string;
  reviewedAt: string;
  fakeSourceRef: string;
  fakeHash: string;
  fakeProvenance: string;
  fakeSummary: string;
  redactionFlags: string[];
  redactionMetadata: FakeRedactionMetadata[];
  redactionReviewOutcome: FakeRedactionReviewOutcome;
  redactionEligibilityImpact: FakeEligibilityImpact;
  githubSafe: boolean;
}

export interface VaultAuditEntry {
  id: string;
  recordId: string;
  action: string;
  actor: string;
  at: string;
  note: string;
}

export interface VaultState {
  records: FakeVaultRecord[];
  auditLog: VaultAuditEntry[];
}

export type VaultAction =
  | {
      type: "advance";
      recordId: string;
      targetStep?: LifecycleStep;
      actor?: string;
      now?: string;
    }
  | {
      type: "approve_redaction";
      recordId: string;
      actor?: string;
      now?: string;
    }
  | {
      type: "approve_metadata";
      recordId: string;
      actor?: string;
      now?: string;
    }
  | {
      type: "reject_review";
      recordId: string;
      reason: string;
      actor?: string;
      now?: string;
    }
  | {
      type: "block_index";
      recordId: string;
      reason: string;
      actor?: string;
      now?: string;
    };

export interface VaultAuditExport {
  exportType: "kia-stick-fake-vault-audit";
  generatedAt: string;
  version: RuntimeVersion;
  guard: {
    fakeMetadataOnly: true;
    privatePathsIncluded: false;
    fileContentIncluded: false;
    ocrTextIncluded: false;
    snippetsIncluded: false;
    realIdentifiersIncluded: false;
    exportContainsOnlySyntheticMetadata: true;
  };
  summary: {
    records: number;
    auditEntries: number;
    workflowStates: Record<VaultWorkflowState, number>;
  };
  records: Array<
    Pick<
      FakeVaultRecord,
      | "id"
      | "title"
      | "lane"
      | "lifecycleStep"
      | "authorityLevel"
      | "sourceStatus"
      | "sensitivity"
      | "redactionStatus"
      | "metadataStatus"
      | "workflowState"
      | "indexReason"
      | "reviewer"
      | "reviewedAt"
      | "fakeSourceRef"
      | "fakeHash"
      | "fakeProvenance"
      | "fakeSummary"
      | "redactionFlags"
      | "redactionMetadata"
      | "redactionReviewOutcome"
      | "redactionEligibilityImpact"
      | "githubSafe"
    >
  >;
  auditLog: VaultAuditEntry[];
}

export const laneLabels: Record<VaultLane, string> = {
  official_public: "Official public",
  official_member_only: "Official member-only",
  local_official: "Local official",
  steward_only: "Steward-only",
  redacted_examples: "Redacted examples",
  restricted_sensitive: "Restricted sensitive",
  quarantine: "Quarantine",
};

export const lifecycleLabels: Record<LifecycleStep, string> = {
  selected: "selected",
  quarantine: "quarantine",
  hash_provenance: "hash/provenance",
  redaction_review: "redaction review",
  metadata_review: "metadata review",
  index_eligibility: "index eligibility",
  audit: "audit",
};

export const workflowStateLabels: Record<VaultWorkflowState, string> = {
  not_indexable: "not indexable",
  quarantine_only: "quarantine only",
  redaction_required: "redaction required",
  metadata_required: "metadata required",
  review_rejected: "review rejected",
  eligible_fake_only: "eligible fake only",
};

export const fakeVaultRecords: FakeVaultRecord[] = [
  {
    id: "fake-vault-selected",
    title: "Selected fake metadata shell",
    lane: "quarantine",
    lifecycleStep: "selected",
    authorityLevel: "unknown",
    sourceStatus: "unknown",
    sensitivity: "unknown",
    redactionStatus: "not_started",
    metadataStatus: "not_reviewed",
    workflowState: "quarantine_only",
    indexReason: "Selected fake metadata is not copied, not reviewed, and not indexable.",
    lastBlockedReason: "",
    reviewer: "UNREVIEWED",
    reviewedAt: "",
    fakeSourceRef: "fake-ref-selected-placeholder",
    fakeHash: "fakehash-selected-00112233",
    fakeProvenance: "Fictional selected item shell; no source file exists.",
    fakeSummary: "Shows a pre-quarantine fake metadata row that still cannot be indexed.",
    redactionFlags: redactionMetadataCategoryLabels(fakeVaultRedactionMetadataByRecord["fake-vault-selected"]),
    redactionMetadata: cloneRedactionMetadata(fakeVaultRedactionMetadataByRecord["fake-vault-selected"]),
    redactionReviewOutcome: redactionReviewOutcomeFor(fakeVaultRedactionMetadataByRecord["fake-vault-selected"]),
    redactionEligibilityImpact: redactionEligibilityImpactFor(fakeVaultRedactionMetadataByRecord["fake-vault-selected"]),
    githubSafe: true,
  },
  {
    id: "fake-vault-official-public",
    title: "Public handbook citation shell",
    lane: "official_public",
    lifecycleStep: "metadata_review",
    authorityLevel: "official",
    sourceStatus: "public",
    sensitivity: "low",
    redactionStatus: "approved_redacted",
    metadataStatus: "reviewed",
    workflowState: "metadata_required",
    indexReason: "Fake public metadata is reviewed, but index eligibility still requires the explicit fake eligibility gate.",
    lastBlockedReason: "",
    reviewer: "FAKE-ADMIN",
    reviewedAt: "2026-06-20T00:00:00.000Z",
    fakeSourceRef: "fake-ref-public-handbook-shell",
    fakeHash: "fakehash-public-0a1b2c3d",
    fakeProvenance: "Fictional public lane shell created for UI testing.",
    fakeSummary: "Represents a reviewed public-authority metadata row without document content.",
    redactionFlags: [],
    redactionMetadata: cloneRedactionMetadata(fakeVaultRedactionMetadataByRecord["fake-vault-official-public"]),
    redactionReviewOutcome: redactionReviewOutcomeFor(fakeVaultRedactionMetadataByRecord["fake-vault-official-public"]),
    redactionEligibilityImpact: redactionEligibilityImpactFor(fakeVaultRedactionMetadataByRecord["fake-vault-official-public"]),
    githubSafe: true,
  },
  {
    id: "fake-vault-member-only",
    title: "Member-only notice metadata shell",
    lane: "official_member_only",
    lifecycleStep: "redaction_review",
    authorityLevel: "official",
    sourceStatus: "member_only",
    sensitivity: "moderate",
    redactionStatus: "review_needed",
    metadataStatus: "needs_changes",
    workflowState: "redaction_required",
    indexReason: "Member-only fake lane needs redaction approval before metadata or index eligibility review.",
    lastBlockedReason: "",
    reviewer: "UNREVIEWED",
    reviewedAt: "",
    fakeSourceRef: "fake-ref-member-only-notice",
    fakeHash: "fakehash-member-1b2c3d4e",
    fakeProvenance: "Fictional member-only lane shell; no account or source data.",
    fakeSummary: "Shows a review queue item that is not automatically indexable.",
    redactionFlags: redactionMetadataCategoryLabels(fakeVaultRedactionMetadataByRecord["fake-vault-member-only"]),
    redactionMetadata: cloneRedactionMetadata(fakeVaultRedactionMetadataByRecord["fake-vault-member-only"]),
    redactionReviewOutcome: redactionReviewOutcomeFor(fakeVaultRedactionMetadataByRecord["fake-vault-member-only"]),
    redactionEligibilityImpact: redactionEligibilityImpactFor(fakeVaultRedactionMetadataByRecord["fake-vault-member-only"]),
    githubSafe: true,
  },
  {
    id: "fake-vault-local-official",
    title: "Local bulletin authority shell",
    lane: "local_official",
    lifecycleStep: "index_eligibility",
    authorityLevel: "local_official",
    sourceStatus: "local_private",
    sensitivity: "moderate",
    redactionStatus: "approved_redacted",
    metadataStatus: "reviewed",
    workflowState: "eligible_fake_only",
    indexReason: "Reviewed fake local metadata is eligible only as fake laptop-local metadata.",
    lastBlockedReason: "",
    reviewer: "FAKE-ADMIN",
    reviewedAt: "2026-06-20T00:00:00.000Z",
    fakeSourceRef: "fake-ref-local-bulletin-shell",
    fakeHash: "fakehash-local-2c3d4e5f",
    fakeProvenance: "Fictional local-official shell with no local identifiers.",
    fakeSummary: "Demonstrates fake local eligibility after review without exposing content.",
    redactionFlags: redactionMetadataCategoryLabels(fakeVaultRedactionMetadataByRecord["fake-vault-local-official"]),
    redactionMetadata: cloneRedactionMetadata(fakeVaultRedactionMetadataByRecord["fake-vault-local-official"]),
    redactionReviewOutcome: redactionReviewOutcomeFor(fakeVaultRedactionMetadataByRecord["fake-vault-local-official"]),
    redactionEligibilityImpact: redactionEligibilityImpactFor(fakeVaultRedactionMetadataByRecord["fake-vault-local-official"]),
    githubSafe: true,
  },
  {
    id: "fake-vault-steward-note",
    title: "Steward note review shell",
    lane: "steward_only",
    lifecycleStep: "redaction_review",
    authorityLevel: "steward_note",
    sourceStatus: "steward_private",
    sensitivity: "high",
    redactionStatus: "detection_flagged",
    metadataStatus: "not_reviewed",
    workflowState: "redaction_required",
    indexReason: "Steward-only notes require redaction and metadata review before any index choice.",
    lastBlockedReason: "",
    reviewer: "UNREVIEWED",
    reviewedAt: "",
    fakeSourceRef: "fake-ref-steward-note-shell",
    fakeHash: "fakehash-steward-3d4e5f6a",
    fakeProvenance: "Fictional steward-work-product shell for workflow testing.",
    fakeSummary: "Shows sensitive review flags while storing only sanitized fake metadata.",
    redactionFlags: redactionMetadataCategoryLabels(fakeVaultRedactionMetadataByRecord["fake-vault-steward-note"]),
    redactionMetadata: cloneRedactionMetadata(fakeVaultRedactionMetadataByRecord["fake-vault-steward-note"]),
    redactionReviewOutcome: redactionReviewOutcomeFor(fakeVaultRedactionMetadataByRecord["fake-vault-steward-note"]),
    redactionEligibilityImpact: redactionEligibilityImpactFor(fakeVaultRedactionMetadataByRecord["fake-vault-steward-note"]),
    githubSafe: true,
  },
  {
    id: "fake-vault-redacted-example",
    title: "Approved redacted example shell",
    lane: "redacted_examples",
    lifecycleStep: "audit",
    authorityLevel: "example",
    sourceStatus: "unknown",
    sensitivity: "low",
    redactionStatus: "approved_redacted",
    metadataStatus: "reviewed",
    workflowState: "eligible_fake_only",
    indexReason: "Fake redacted example is approved, reviewed, and eligible only as fake metadata.",
    lastBlockedReason: "",
    reviewer: "FAKE-ADMIN",
    reviewedAt: "2026-06-20T00:00:00.000Z",
    fakeSourceRef: "fake-ref-approved-redacted-example",
    fakeHash: "fakehash-redacted-4e5f6a7b",
    fakeProvenance: "Fictional approved example created from synthetic facts only.",
    fakeSummary: "Represents the only kind of example that could become GitHub-safe after review.",
    redactionFlags: [],
    redactionMetadata: cloneRedactionMetadata(fakeVaultRedactionMetadataByRecord["fake-vault-redacted-example"]),
    redactionReviewOutcome: redactionReviewOutcomeFor(fakeVaultRedactionMetadataByRecord["fake-vault-redacted-example"]),
    redactionEligibilityImpact: redactionEligibilityImpactFor(fakeVaultRedactionMetadataByRecord["fake-vault-redacted-example"]),
    githubSafe: true,
  },
  {
    id: "fake-vault-restricted",
    title: "Restricted-sensitive placeholder shell",
    lane: "restricted_sensitive",
    lifecycleStep: "redaction_review",
    authorityLevel: "unknown",
    sourceStatus: "restricted",
    sensitivity: "restricted_sensitive",
    redactionStatus: "restricted",
    metadataStatus: "not_reviewed",
    workflowState: "review_rejected",
    indexReason: "Restricted-sensitive material is rejected for fake indexing by default.",
    lastBlockedReason: "",
    reviewer: "UNREVIEWED",
    reviewedAt: "",
    fakeSourceRef: "fake-ref-restricted-placeholder",
    fakeHash: "fakehash-restricted-5f6a7b8c",
    fakeProvenance: "Fictional restricted lane placeholder; no private facts.",
    fakeSummary: "Keeps restricted policy visible without storing sensitive content.",
    redactionFlags: redactionMetadataCategoryLabels(fakeVaultRedactionMetadataByRecord["fake-vault-restricted"]),
    redactionMetadata: cloneRedactionMetadata(fakeVaultRedactionMetadataByRecord["fake-vault-restricted"]),
    redactionReviewOutcome: redactionReviewOutcomeFor(fakeVaultRedactionMetadataByRecord["fake-vault-restricted"]),
    redactionEligibilityImpact: redactionEligibilityImpactFor(fakeVaultRedactionMetadataByRecord["fake-vault-restricted"]),
    githubSafe: true,
  },
  {
    id: "fake-vault-quarantine",
    title: "Quarantine intake placeholder",
    lane: "quarantine",
    lifecycleStep: "quarantine",
    authorityLevel: "unknown",
    sourceStatus: "unknown",
    sensitivity: "unknown",
    redactionStatus: "not_started",
    metadataStatus: "not_reviewed",
    workflowState: "quarantine_only",
    indexReason: "Quarantine means not reviewed, not approved, and never indexable.",
    lastBlockedReason: "",
    reviewer: "UNREVIEWED",
    reviewedAt: "",
    fakeSourceRef: "fake-ref-quarantine-placeholder",
    fakeHash: "fakehash-quarantine-6a7b8c9d",
    fakeProvenance: "Fictional quarantine placeholder only; no copied file exists.",
    fakeSummary: "Shows raw-intake governance without any file upload or content access.",
    redactionFlags: redactionMetadataCategoryLabels(fakeVaultRedactionMetadataByRecord["fake-vault-quarantine"]),
    redactionMetadata: cloneRedactionMetadata(fakeVaultRedactionMetadataByRecord["fake-vault-quarantine"]),
    redactionReviewOutcome: redactionReviewOutcomeFor(fakeVaultRedactionMetadataByRecord["fake-vault-quarantine"]),
    redactionEligibilityImpact: redactionEligibilityImpactFor(fakeVaultRedactionMetadataByRecord["fake-vault-quarantine"]),
    githubSafe: true,
  },
];

const forbiddenActionKeys = new Set([
  "path",
  "sourcePath",
  "localPath",
  "privatePath",
  "rawText",
  "rawContent",
  "content",
  "contents",
  "file",
  "files",
  "blob",
  "bytes",
  "ocrText",
  "snippet",
  "snippets",
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
  "exports/",
  "backups/",
  "vector-store/",
  "DB/",
];

const workflowStateOrder: VaultWorkflowState[] = [
  "not_indexable",
  "quarantine_only",
  "redaction_required",
  "metadata_required",
  "review_rejected",
  "eligible_fake_only",
];

function cloneRecord(record: FakeVaultRecord): FakeVaultRecord {
  return {
    ...record,
    redactionFlags: [...record.redactionFlags],
    redactionMetadata: cloneRedactionMetadata(record.redactionMetadata),
  };
}

function cloneAudit(entry: VaultAuditEntry): VaultAuditEntry {
  return { ...entry };
}

function cloneState(state: VaultState): VaultState {
  return {
    records: state.records.map(cloneRecord),
    auditLog: state.auditLog.map(cloneAudit),
  };
}

function auditEntry(recordId: string, action: string, note: string, now: string, actor = "local-fake-admin"): VaultAuditEntry {
  return {
    id: `${now}-${recordId}-${action}`.replaceAll(/[^a-zA-Z0-9_-]/g, "-"),
    recordId,
    action,
    actor,
    at: now,
    note,
  };
}

export function createInitialVaultState(now = "2026-06-20T00:00:00.000Z"): VaultState {
  return {
    records: fakeVaultRecords.map((record) => refreshRecordState(record)),
    auditLog: [
      auditEntry(
        "all",
        "fake_fixture_loaded",
        "Loaded fake metadata fixtures only; no files, private paths, OCR, or document content were read.",
        now,
        "system"
      ),
    ],
  };
}

export function assertFakeMetadataOnly(value: unknown): { ok: boolean; reasons: string[] } {
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
      reasons.push("browser File object is not allowed in vault metadata actions");
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

export function nextLifecycleStep(step: LifecycleStep): LifecycleStep {
  const currentIndex = lifecycleSteps.indexOf(step);
  return lifecycleSteps[Math.min(currentIndex + 1, lifecycleSteps.length - 1)];
}

function workflowDecisionFor(record: FakeVaultRecord): { state: VaultWorkflowState; reason: string } {
  if (record.redactionStatus === "rejected" || record.metadataStatus === "rejected" || record.redactionStatus === "restricted") {
    return { state: "review_rejected", reason: "Review rejected this fake metadata item; it cannot become indexable." };
  }
  if (record.lifecycleStep === "selected" || record.lifecycleStep === "quarantine" || record.lane === "quarantine") {
    return { state: "quarantine_only", reason: "Selected and quarantine fake metadata is not reviewed, not approved, and never indexable." };
  }
  if (record.redactionEligibilityImpact === "not_indexable") {
    return { state: "review_rejected", reason: "Fake redaction metadata marks this row not indexable." };
  }
  if (record.redactionStatus !== "approved_redacted") {
    return { state: "redaction_required", reason: "Structured fake redaction metadata must be resolved before metadata review or indexing." };
  }
  if (record.metadataStatus !== "reviewed") {
    return { state: "metadata_required", reason: "Metadata review must approve authority, source status, and sensitivity before indexing." };
  }
  if (record.lifecycleStep === "index_eligibility" || record.lifecycleStep === "audit") {
    return { state: "eligible_fake_only", reason: "Eligible only for fake metadata workflow testing; no real document content is indexable." };
  }
  return { state: "not_indexable", reason: "The explicit index eligibility gate has not been reached." };
}

function refreshRecordState(record: FakeVaultRecord, blockedReason = ""): FakeVaultRecord {
  const decision = workflowDecisionFor(record);
  return {
    ...cloneRecord(record),
    workflowState: decision.state,
    indexReason: decision.reason,
    lastBlockedReason: blockedReason,
  };
}

function blockRecord(record: FakeVaultRecord, reason: string): FakeVaultRecord {
  return refreshRecordState(record, reason);
}

function validateTransition(record: FakeVaultRecord, targetStep: LifecycleStep): string | null {
  const expected = nextLifecycleStep(record.lifecycleStep);
  if (record.lifecycleStep === "audit") return "Audit is terminal for this fake workflow.";
  if (targetStep !== expected) {
    return `Invalid transition: ${lifecycleLabels[record.lifecycleStep]} can only move to ${lifecycleLabels[expected]}.`;
  }
  if (targetStep === "hash_provenance" && (!record.fakeHash || !record.fakeProvenance)) {
    return "Hash/provenance gate requires fake hash and fake provenance metadata.";
  }
  if (targetStep === "metadata_review" && record.redactionStatus !== "approved_redacted") {
    return "Blocked: redaction review must be approved before metadata review.";
  }
  if (targetStep === "index_eligibility" && record.metadataStatus !== "reviewed") {
    return "Blocked: metadata review must be approved before index eligibility.";
  }
  if (targetStep === "audit" && record.workflowState !== "eligible_fake_only") {
    return "Blocked: only eligible_fake_only records may enter final audit.";
  }
  return null;
}

function applyLifecycleEffects(record: FakeVaultRecord, nextStep: LifecycleStep): FakeVaultRecord {
  const updated: FakeVaultRecord = {
    ...record,
    lifecycleStep: nextStep,
    redactionFlags: [...record.redactionFlags],
    lastBlockedReason: "",
  };

  if (nextStep === "hash_provenance") {
    updated.workflowState = "redaction_required";
  }

  if (nextStep === "redaction_review") {
    updated.redactionStatus = updated.sensitivity === "restricted_sensitive" ? "restricted" : "review_needed";
    if (updated.redactionFlags.length === 0) updated.redactionFlags = ["fake-review-required"];
    updated.redactionReviewOutcome = redactionReviewOutcomeFor(updated.redactionMetadata);
    updated.redactionEligibilityImpact = redactionEligibilityImpactFor(updated.redactionMetadata);
  }

  if (nextStep === "metadata_review") {
    updated.metadataStatus = "needs_changes";
  }

  if (nextStep === "index_eligibility" || nextStep === "audit") {
    updated.reviewer = "FAKE-ADMIN";
  }

  return refreshRecordState(updated);
}

function isAdvanceAction(action: VaultAction | Record<string, unknown>): action is Extract<VaultAction, { type: "advance" }> {
  return action.type === "advance" && typeof action.recordId === "string";
}

function isApproveRedactionAction(action: VaultAction | Record<string, unknown>): action is Extract<VaultAction, { type: "approve_redaction" }> {
  return action.type === "approve_redaction" && typeof action.recordId === "string";
}

function isApproveMetadataAction(action: VaultAction | Record<string, unknown>): action is Extract<VaultAction, { type: "approve_metadata" }> {
  return action.type === "approve_metadata" && typeof action.recordId === "string";
}

function isRejectReviewAction(action: VaultAction | Record<string, unknown>): action is Extract<VaultAction, { type: "reject_review" }> {
  return action.type === "reject_review" && typeof action.recordId === "string" && typeof action.reason === "string";
}

function isBlockIndexAction(action: VaultAction | Record<string, unknown>): action is Extract<VaultAction, { type: "block_index" }> {
  return action.type === "block_index" && typeof action.recordId === "string" && typeof action.reason === "string";
}

export function applyVaultAction(state: VaultState, action: VaultAction | Record<string, unknown>): VaultState {
  const actionRecord = action as Record<string, unknown>;
  const now = typeof actionRecord.now === "string" ? actionRecord.now : new Date().toISOString();
  const actor = typeof actionRecord.actor === "string" ? actionRecord.actor : "local-fake-admin";
  const guard = assertFakeMetadataOnly(action);

  if (!guard.ok) {
    return {
      ...cloneState(state),
      auditLog: [
        auditEntry("blocked", "blocked_real_file_access", `Blocked non-metadata vault action: ${guard.reasons.join("; ")}`, now, actor),
        ...state.auditLog.map(cloneAudit),
      ],
    };
  }

  if (isAdvanceAction(action)) {
    let changed = false;
    let note = "";
    let auditAction = "advance_fake_gate";
    const records = state.records.map((record) => {
      if (record.id !== action.recordId) return cloneRecord(record);
      changed = true;
      const targetStep = action.targetStep ?? nextLifecycleStep(record.lifecycleStep);
      const blockedReason = validateTransition(record, targetStep);
      if (blockedReason) {
        auditAction = "blocked_invalid_transition";
        note = blockedReason;
        return blockRecord(record, blockedReason);
      }
      const updated = applyLifecycleEffects(record, targetStep);
      note = `Advanced fake metadata item to ${lifecycleLabels[updated.lifecycleStep]}; no file content was accessed.`;
      return updated;
    });

    if (!changed) return cloneState(state);

    return {
      records,
      auditLog: [auditEntry(action.recordId, auditAction, note, now, actor), ...state.auditLog.map(cloneAudit)],
    };
  }

  if (isApproveRedactionAction(action)) {
    let changed = false;
    let note = "";
    let auditAction = "approve_fake_redaction";
    const records = state.records.map((record) => {
      if (record.id !== action.recordId) return cloneRecord(record);
      changed = true;
      if (record.lifecycleStep !== "redaction_review") {
        auditAction = "blocked_invalid_transition";
        note = "Blocked: redaction approval is only allowed at redaction review.";
        return blockRecord(record, note);
      }
      if (record.sensitivity === "restricted_sensitive" || record.redactionStatus === "restricted") {
        auditAction = "reject_fake_review";
        note = "Restricted-sensitive fake metadata cannot pass redaction review.";
        return refreshRecordState({ ...cloneRecord(record), redactionStatus: "rejected", metadataStatus: "rejected" }, note);
      }
      if (record.redactionReviewOutcome === "reject_sensitive") {
        auditAction = "reject_fake_review";
        note = "Structured fake redaction metadata rejected this row as sensitive.";
        return refreshRecordState({ ...cloneRecord(record), redactionStatus: "rejected", metadataStatus: "rejected" }, note);
      }
      if (record.redactionReviewOutcome === "needs_more_redaction") {
        auditAction = "needs_more_fake_redaction";
        note = "Structured fake redaction metadata requires more redaction before metadata review.";
        return refreshRecordState({ ...cloneRecord(record), redactionStatus: "review_needed", metadataStatus: "needs_changes" }, note);
      }
      note = "Approved fake redaction metadata only; no source text or file bytes were reviewed.";
      return refreshRecordState({
        ...cloneRecord(record),
        redactionStatus: "approved_redacted",
        redactionReviewOutcome: "approve_redaction",
        redactionEligibilityImpact: record.redactionEligibilityImpact === "redaction_required" ? "metadata_required" : record.redactionEligibilityImpact,
        redactionFlags: record.redactionFlags.filter((flag) => !flag.includes("incomplete")),
      });
    });

    if (!changed) return cloneState(state);

    return {
      records,
      auditLog: [auditEntry(action.recordId, auditAction, note, now, actor), ...state.auditLog.map(cloneAudit)],
    };
  }

  if (isApproveMetadataAction(action)) {
    let changed = false;
    let note = "";
    let auditAction = "approve_fake_metadata";
    const records = state.records.map((record) => {
      if (record.id !== action.recordId) return cloneRecord(record);
      changed = true;
      if (record.lifecycleStep !== "metadata_review") {
        auditAction = "blocked_invalid_transition";
        note = "Blocked: metadata approval is only allowed at metadata review.";
        return blockRecord(record, note);
      }
      if (record.redactionStatus !== "approved_redacted") {
        auditAction = "blocked_invalid_transition";
        note = "Blocked: redaction approval is required before metadata approval.";
        return blockRecord(record, note);
      }
      note = "Approved fake authority metadata only; index eligibility remains a separate gate.";
      return refreshRecordState({
        ...cloneRecord(record),
        metadataStatus: "reviewed",
        reviewer: "FAKE-ADMIN",
        reviewedAt: now,
      });
    });

    if (!changed) return cloneState(state);

    return {
      records,
      auditLog: [auditEntry(action.recordId, auditAction, note, now, actor), ...state.auditLog.map(cloneAudit)],
    };
  }

  if (isRejectReviewAction(action)) {
    let changed = false;
    const records = state.records.map((record) => {
      if (record.id !== action.recordId) return cloneRecord(record);
      changed = true;
      return refreshRecordState(
        {
          ...cloneRecord(record),
          redactionStatus: record.lifecycleStep === "redaction_review" ? "rejected" : record.redactionStatus,
          metadataStatus: record.lifecycleStep === "metadata_review" ? "rejected" : record.metadataStatus,
          redactionReviewOutcome: "reject_sensitive",
          redactionEligibilityImpact: "not_indexable",
        },
        action.reason
      );
    });

    if (!changed) return cloneState(state);

    return {
      records,
      auditLog: [auditEntry(action.recordId, "reject_fake_review", action.reason, now, actor), ...state.auditLog.map(cloneAudit)],
    };
  }

  if (isBlockIndexAction(action)) {
    let changed = false;
    const records = state.records.map((record) => {
      if (record.id !== action.recordId) return cloneRecord(record);
      changed = true;
      return {
        ...refreshRecordState(record),
        workflowState: "not_indexable" as const,
        indexReason: action.reason,
        lastBlockedReason: action.reason,
      };
    });

    if (!changed) return cloneState(state);

    return {
      records,
      auditLog: [auditEntry(action.recordId, "mark_not_indexable", action.reason, now, actor), ...state.auditLog.map(cloneAudit)],
    };
  }

  return cloneState(state);
}

export function laneCounts(records: FakeVaultRecord[]): Record<VaultLane, number> {
  return vaultLanes.reduce(
    (counts, lane) => ({
      ...counts,
      [lane]: records.filter((record) => record.lane === lane).length,
    }),
    {} as Record<VaultLane, number>
  );
}

export function workflowStateCounts(records: FakeVaultRecord[]): Record<VaultWorkflowState, number> {
  return workflowStateOrder.reduce(
    (counts, state) => ({
      ...counts,
      [state]: records.filter((record) => record.workflowState === state).length,
    }),
    {} as Record<VaultWorkflowState, number>
  );
}

function exportRecord(record: FakeVaultRecord): VaultAuditExport["records"][number] {
  return {
    id: record.id,
    title: record.title,
    lane: record.lane,
    lifecycleStep: record.lifecycleStep,
    authorityLevel: record.authorityLevel,
    sourceStatus: record.sourceStatus,
    sensitivity: record.sensitivity,
    redactionStatus: record.redactionStatus,
    metadataStatus: record.metadataStatus,
    workflowState: record.workflowState,
    indexReason: record.indexReason,
    reviewer: record.reviewer,
    reviewedAt: record.reviewedAt,
    fakeSourceRef: record.fakeSourceRef,
    fakeHash: record.fakeHash,
    fakeProvenance: record.fakeProvenance,
    fakeSummary: record.fakeSummary,
    redactionFlags: [...record.redactionFlags],
    redactionMetadata: cloneRedactionMetadata(record.redactionMetadata),
    redactionReviewOutcome: record.redactionReviewOutcome,
    redactionEligibilityImpact: record.redactionEligibilityImpact,
    githubSafe: record.githubSafe,
  };
}

export function buildVaultAuditExport(state: VaultState, version: RuntimeVersion, generatedAt = new Date().toISOString()): VaultAuditExport {
  const sanitizedRecords = state.records.map(exportRecord);
  const exportPayload: VaultAuditExport = {
    exportType: "kia-stick-fake-vault-audit",
    generatedAt,
    version,
    guard: {
      fakeMetadataOnly: true,
      privatePathsIncluded: false,
      fileContentIncluded: false,
      ocrTextIncluded: false,
      snippetsIncluded: false,
      realIdentifiersIncluded: false,
      exportContainsOnlySyntheticMetadata: true,
    },
    summary: {
      records: state.records.length,
      auditEntries: state.auditLog.length,
      workflowStates: workflowStateCounts(state.records),
    },
    records: sanitizedRecords,
    auditLog: state.auditLog.map(cloneAudit),
  };

  const guard = assertFakeMetadataOnly(exportPayload);
  const redactionGuard = {
    ok: state.records.every((record) => assertFakeRedactionMetadataSafe(record.redactionMetadata).ok),
    reasons: state.records.flatMap((record) => assertFakeRedactionMetadataSafe(record.redactionMetadata).reasons),
  };
  if (!guard.ok || !redactionGuard.ok) {
    return {
      ...exportPayload,
      auditLog: [
        auditEntry(
          "export",
          "blocked_export_guard",
          `Export guard blocked unsafe metadata: ${[...guard.reasons, ...redactionGuard.reasons].join("; ")}`,
          generatedAt,
          "system"
        ),
      ],
      records: [],
      summary: {
        records: 0,
        auditEntries: 1,
        workflowStates: workflowStateCounts([]),
      },
    };
  }

  return exportPayload;
}

export function exportVaultAuditJson(state: VaultState, version: RuntimeVersion, generatedAt?: string): string {
  return `${JSON.stringify(buildVaultAuditExport(state, version, generatedAt), null, 2)}\n`;
}

export function exportVaultAuditMarkdown(state: VaultState, version: RuntimeVersion, generatedAt?: string): string {
  const payload = buildVaultAuditExport(state, version, generatedAt);
  const lines = [
    "# KIA Stick Fake Vault Audit Export",
    "",
    `- Generated: ${payload.generatedAt}`,
    `- Display version: ${payload.version.displayVersion}`,
    `- Product version: ${payload.version.productVersion}`,
    `- Git SHA: ${payload.version.gitSha}`,
    `- Fake metadata only: ${payload.guard.fakeMetadataOnly}`,
    `- Private paths included: ${payload.guard.privatePathsIncluded}`,
    `- File content included: ${payload.guard.fileContentIncluded}`,
    `- OCR text included: ${payload.guard.ocrTextIncluded}`,
    `- Snippets included: ${payload.guard.snippetsIncluded}`,
    `- Real identifiers included: ${payload.guard.realIdentifiersIncluded}`,
    "",
    "## Workflow States",
    "",
    ...workflowStateOrder.map((stateName) => `- ${stateName}: ${payload.summary.workflowStates[stateName]}`),
    "",
    "## Records",
    "",
    ...payload.records.flatMap((record) => [
      `### ${record.title}`,
      "",
      `- ID: ${record.id}`,
      `- Lane: ${record.lane}`,
      `- Lifecycle: ${record.lifecycleStep}`,
      `- Workflow state: ${record.workflowState}`,
      `- Redaction: ${record.redactionStatus}`,
      `- Redaction outcome: ${record.redactionReviewOutcome}`,
      `- Redaction impact: ${record.redactionEligibilityImpact}`,
      `- Metadata: ${record.metadataStatus}`,
      `- Index reason: ${record.indexReason}`,
      `- Fake ref: ${record.fakeSourceRef}`,
      `- Fake hash: ${record.fakeHash}`,
      `- Fake redaction labels: ${record.redactionMetadata.map((item) => item.safeExampleLabel).join(", ") || "none"}`,
      "",
    ]),
    "## Audit Log",
    "",
    ...payload.auditLog.map((entry) => `- ${entry.at} ${entry.action} ${entry.recordId}: ${entry.note}`),
    "",
  ];

  return lines.join("\n");
}
