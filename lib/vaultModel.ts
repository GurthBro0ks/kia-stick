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
  "redaction_detection",
  "admin_review",
  "approved_redacted_copy",
  "metadata",
  "index_decision",
  "audit",
] as const;

export type LifecycleStep = (typeof lifecycleSteps)[number];

export type AuthorityLevel = "controlling" | "official" | "local_official" | "persuasive" | "steward_note" | "example" | "unknown";
export type SourceStatus = "public" | "member_only" | "local_private" | "steward_private" | "restricted" | "unknown";
export type Sensitivity = "low" | "moderate" | "high" | "restricted_sensitive" | "unknown";
export type RedactionStatus = "not_started" | "detection_flagged" | "review_needed" | "approved_redacted" | "rejected" | "restricted";
export type MetadataStatus = "not_reviewed" | "needs_changes" | "reviewed" | "rejected";
export type IndexEligibility = "not_eligible" | "eligible_private" | "eligible_redacted" | "eligible_public";

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
  indexEligibility: IndexEligibility;
  indexReason: string;
  reviewer: string;
  reviewedAt: string;
  fakeSourceRef: string;
  fakeHash: string;
  fakeProvenance: string;
  fakeSummary: string;
  redactionFlags: string[];
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
  redaction_detection: "redaction detection",
  admin_review: "admin review",
  approved_redacted_copy: "approved redacted copy",
  metadata: "metadata",
  index_decision: "index decision",
  audit: "audit",
};

export const fakeVaultRecords: FakeVaultRecord[] = [
  {
    id: "fake-vault-official-public",
    title: "Public handbook citation shell",
    lane: "official_public",
    lifecycleStep: "metadata",
    authorityLevel: "official",
    sourceStatus: "public",
    sensitivity: "low",
    redactionStatus: "approved_redacted",
    metadataStatus: "reviewed",
    indexEligibility: "eligible_public",
    indexReason: "Fake public metadata fixture marked reviewed; no real source text is stored.",
    reviewer: "FAKE-ADMIN",
    reviewedAt: "2026-06-20T00:00:00.000Z",
    fakeSourceRef: "fake-ref-public-handbook-shell",
    fakeHash: "fakehash-public-0a1b2c3d",
    fakeProvenance: "Fictional public lane shell created for UI testing.",
    fakeSummary: "Represents a reviewed public-authority metadata row without document content.",
    redactionFlags: [],
    githubSafe: true,
  },
  {
    id: "fake-vault-member-only",
    title: "Member-only notice metadata shell",
    lane: "official_member_only",
    lifecycleStep: "admin_review",
    authorityLevel: "official",
    sourceStatus: "member_only",
    sensitivity: "moderate",
    redactionStatus: "review_needed",
    metadataStatus: "needs_changes",
    indexEligibility: "not_eligible",
    indexReason: "Member-only fake lane needs admin review before any private-only index decision.",
    reviewer: "UNREVIEWED",
    reviewedAt: "",
    fakeSourceRef: "fake-ref-member-only-notice",
    fakeHash: "fakehash-member-1b2c3d4e",
    fakeProvenance: "Fictional member-only lane shell; no account or source data.",
    fakeSummary: "Shows a review queue item that is not automatically indexable.",
    redactionFlags: ["distribution limit", "member-only source status"],
    githubSafe: true,
  },
  {
    id: "fake-vault-local-official",
    title: "Local bulletin authority shell",
    lane: "local_official",
    lifecycleStep: "index_decision",
    authorityLevel: "local_official",
    sourceStatus: "local_private",
    sensitivity: "moderate",
    redactionStatus: "approved_redacted",
    metadataStatus: "reviewed",
    indexEligibility: "eligible_private",
    indexReason: "Fake local metadata is reviewed for private laptop-only indexing.",
    reviewer: "FAKE-ADMIN",
    reviewedAt: "2026-06-20T00:00:00.000Z",
    fakeSourceRef: "fake-ref-local-bulletin-shell",
    fakeHash: "fakehash-local-2c3d4e5f",
    fakeProvenance: "Fictional local-official shell with no local identifiers.",
    fakeSummary: "Demonstrates private index eligibility after review without exposing content.",
    redactionFlags: ["local distribution label"],
    githubSafe: true,
  },
  {
    id: "fake-vault-steward-note",
    title: "Steward note review shell",
    lane: "steward_only",
    lifecycleStep: "redaction_detection",
    authorityLevel: "steward_note",
    sourceStatus: "steward_private",
    sensitivity: "high",
    redactionStatus: "detection_flagged",
    metadataStatus: "not_reviewed",
    indexEligibility: "not_eligible",
    indexReason: "Steward-only notes require redaction and metadata review before any index choice.",
    reviewer: "UNREVIEWED",
    reviewedAt: "",
    fakeSourceRef: "fake-ref-steward-note-shell",
    fakeHash: "fakehash-steward-3d4e5f6a",
    fakeProvenance: "Fictional steward-work-product shell for workflow testing.",
    fakeSummary: "Shows sensitive review flags while storing only sanitized fake metadata.",
    redactionFlags: ["work product", "possible private narrative"],
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
    indexEligibility: "eligible_redacted",
    indexReason: "Fake redacted example is approved and contains no re-identifying fields.",
    reviewer: "FAKE-ADMIN",
    reviewedAt: "2026-06-20T00:00:00.000Z",
    fakeSourceRef: "fake-ref-approved-redacted-example",
    fakeHash: "fakehash-redacted-4e5f6a7b",
    fakeProvenance: "Fictional approved example created from synthetic facts only.",
    fakeSummary: "Represents the only kind of example that could become GitHub-safe after review.",
    redactionFlags: [],
    githubSafe: true,
  },
  {
    id: "fake-vault-restricted",
    title: "Restricted-sensitive placeholder shell",
    lane: "restricted_sensitive",
    lifecycleStep: "admin_review",
    authorityLevel: "unknown",
    sourceStatus: "restricted",
    sensitivity: "restricted_sensitive",
    redactionStatus: "restricted",
    metadataStatus: "not_reviewed",
    indexEligibility: "not_eligible",
    indexReason: "Restricted-sensitive material is never indexable by default.",
    reviewer: "UNREVIEWED",
    reviewedAt: "",
    fakeSourceRef: "fake-ref-restricted-placeholder",
    fakeHash: "fakehash-restricted-5f6a7b8c",
    fakeProvenance: "Fictional restricted lane placeholder; no private facts.",
    fakeSummary: "Keeps restricted policy visible without storing sensitive content.",
    redactionFlags: ["restricted sensitivity", "never index by default"],
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
    indexEligibility: "not_eligible",
    indexReason: "Quarantine means not reviewed, not approved, and never indexable.",
    reviewer: "UNREVIEWED",
    reviewedAt: "",
    fakeSourceRef: "fake-ref-quarantine-placeholder",
    fakeHash: "fakehash-quarantine-6a7b8c9d",
    fakeProvenance: "Fictional quarantine placeholder only; no copied file exists.",
    fakeSummary: "Shows raw-intake governance without any file upload or content access.",
    redactionFlags: ["raw intake placeholder", "hash/provenance incomplete"],
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

function cloneRecord(record: FakeVaultRecord): FakeVaultRecord {
  return {
    ...record,
    redactionFlags: [...record.redactionFlags],
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
    records: fakeVaultRecords.map(cloneRecord),
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
      const matched = forbiddenPrivateFragments.find((fragment) => input.includes(fragment));
      if (matched) reasons.push(`forbidden private reference: ${matched}`);
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

function eligibilityFor(record: FakeVaultRecord): { eligibility: IndexEligibility; reason: string } {
  if (record.lane === "quarantine") {
    return { eligibility: "not_eligible", reason: "Quarantine is never indexable." };
  }
  if (record.lane === "restricted_sensitive") {
    return { eligibility: "not_eligible", reason: "Restricted-sensitive material is never indexable by default." };
  }
  if (record.metadataStatus !== "reviewed" || record.redactionStatus !== "approved_redacted") {
    return { eligibility: "not_eligible", reason: "Review and approved redaction are required before any index decision." };
  }
  if (record.lane === "official_public") {
    return { eligibility: "eligible_public", reason: "Reviewed fake public metadata may be marked public-index eligible." };
  }
  if (record.lane === "redacted_examples") {
    return { eligibility: "eligible_redacted", reason: "Reviewed fake redacted example may be marked redacted-index eligible." };
  }
  return { eligibility: "eligible_private", reason: "Reviewed fake private metadata may be marked local private-index eligible only." };
}

function applyLifecycleEffects(record: FakeVaultRecord, nextStep: LifecycleStep, now: string): FakeVaultRecord {
  const updated: FakeVaultRecord = {
    ...record,
    lifecycleStep: nextStep,
    redactionFlags: [...record.redactionFlags],
  };

  if (nextStep === "redaction_detection" && updated.redactionFlags.length === 0) {
    updated.redactionFlags = ["fake detector found no sensitive fields"];
    updated.redactionStatus = "detection_flagged";
  }

  if (nextStep === "admin_review") {
    updated.redactionStatus = updated.sensitivity === "restricted_sensitive" ? "restricted" : "review_needed";
  }

  if (nextStep === "approved_redacted_copy") {
    updated.redactionStatus = updated.sensitivity === "restricted_sensitive" ? "restricted" : "approved_redacted";
    updated.indexEligibility = "not_eligible";
    updated.indexReason = "Approved redacted copy alone does not make the item indexable.";
  }

  if (nextStep === "metadata") {
    updated.metadataStatus = updated.sensitivity === "restricted_sensitive" ? "rejected" : "needs_changes";
    updated.indexEligibility = "not_eligible";
    updated.indexReason = "Metadata review must be completed before index eligibility is decided.";
  }

  if (nextStep === "index_decision") {
    updated.metadataStatus = updated.sensitivity === "restricted_sensitive" ? "rejected" : "reviewed";
    updated.reviewer = "FAKE-ADMIN";
    updated.reviewedAt = now;
    const decision = eligibilityFor(updated);
    updated.indexEligibility = decision.eligibility;
    updated.indexReason = decision.reason;
  }

  if (nextStep === "audit") {
    const decision = eligibilityFor(updated);
    updated.indexEligibility = decision.eligibility;
    updated.indexReason = decision.reason;
  }

  return updated;
}

function isAdvanceAction(action: VaultAction | Record<string, unknown>): action is Extract<VaultAction, { type: "advance" }> {
  return action.type === "advance" && typeof action.recordId === "string";
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
        auditEntry(
          "blocked",
          "blocked_real_file_access",
          `Blocked non-metadata vault action: ${guard.reasons.join("; ")}`,
          now,
          actor
        ),
        ...state.auditLog.map(cloneAudit),
      ],
    };
  }

  if (isAdvanceAction(action)) {
    let changed = false;
    const records = state.records.map((record) => {
      if (record.id !== action.recordId) return cloneRecord(record);
      changed = true;
      const nextStep = nextLifecycleStep(record.lifecycleStep);
      return applyLifecycleEffects(record, nextStep, now);
    });

    if (!changed) return cloneState(state);

    const updated = records.find((record) => record.id === action.recordId);
    return {
      records,
      auditLog: [
        auditEntry(
          action.recordId,
          "advance_fake_gate",
          `Advanced fake metadata item to ${updated ? lifecycleLabels[updated.lifecycleStep] : "next gate"}; no file content was accessed.`,
          now,
          actor
        ),
        ...state.auditLog.map(cloneAudit),
      ],
    };
  }

  if (isBlockIndexAction(action)) {
    let changed = false;
    const records = state.records.map((record) => {
      if (record.id !== action.recordId) return cloneRecord(record);
      changed = true;
      return {
        ...cloneRecord(record),
        indexEligibility: "not_eligible" as const,
        indexReason: action.reason,
      };
    });

    if (!changed) return cloneState(state);

    return {
      records,
      auditLog: [
        auditEntry(action.recordId, "mark_not_indexable", action.reason, now, actor),
        ...state.auditLog.map(cloneAudit),
      ],
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
