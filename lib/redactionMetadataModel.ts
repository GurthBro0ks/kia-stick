export type FakeRedactionCategory =
  | "fake_name"
  | "fake_date"
  | "fake_local_context"
  | "fake_distribution_limit"
  | "fake_work_product"
  | "fake_restricted_marker";

export type FakeRedactionSeverity = "low" | "moderate" | "high" | "restricted";
export type FakeEligibilityImpact = "none" | "metadata_required" | "redaction_required" | "not_indexable";
export type FakeRedactionReviewOutcome = "approve_redaction" | "needs_more_redaction" | "reject_sensitive" | "metadata_incomplete";

export interface FakeRedactionMetadata {
  category: FakeRedactionCategory;
  severity: FakeRedactionSeverity;
  reviewerNote: string;
  confidence: number;
  reason: string;
  safeExampleLabel: string;
  eligibilityImpact: FakeEligibilityImpact;
}

const forbiddenMetadataFragments = [
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

export const fakeImportRedactionMetadata: FakeRedactionMetadata[] = [
  {
    category: "fake_name",
    severity: "moderate",
    reviewerNote: "Synthetic name-shaped placeholder requires fake redaction review before metadata approval.",
    confidence: 0.92,
    reason: "Names are modeled as sensitive even when fictional.",
    safeExampleLabel: "fake-person-label",
    eligibilityImpact: "redaction_required",
  },
  {
    category: "fake_date",
    severity: "low",
    reviewerNote: "Synthetic date-shaped placeholder needs authority metadata before eligibility.",
    confidence: 0.81,
    reason: "Dates can imply timeline context and must be reviewed.",
    safeExampleLabel: "fake-date-label",
    eligibilityImpact: "metadata_required",
  },
  {
    category: "fake_local_context",
    severity: "moderate",
    reviewerNote: "Synthetic local-context placeholder needs redaction and metadata review.",
    confidence: 0.87,
    reason: "Local context can become identifying in real workflows.",
    safeExampleLabel: "fake-local-context-label",
    eligibilityImpact: "redaction_required",
  },
];

export const fakeVaultRedactionMetadataByRecord: Record<string, FakeRedactionMetadata[]> = {
  "fake-vault-selected": [
    {
      category: "fake_distribution_limit",
      severity: "moderate",
      reviewerNote: "Selection-only fake row is not reviewed and remains quarantine-only.",
      confidence: 0.73,
      reason: "Unreviewed selection metadata cannot imply redaction approval.",
      safeExampleLabel: "fake-selection-label",
      eligibilityImpact: "not_indexable",
    },
  ],
  "fake-vault-official-public": [],
  "fake-vault-member-only": [
    {
      category: "fake_distribution_limit",
      severity: "moderate",
      reviewerNote: "Member-only fake label requires metadata restrictions before eligibility.",
      confidence: 0.9,
      reason: "Distribution limits affect citation and indexing scope.",
      safeExampleLabel: "fake-member-only-label",
      eligibilityImpact: "metadata_required",
    },
  ],
  "fake-vault-local-official": [
    {
      category: "fake_local_context",
      severity: "moderate",
      reviewerNote: "Local-official fake label needs scope confirmation in metadata review.",
      confidence: 0.84,
      reason: "Local context controls where the fake item can be cited.",
      safeExampleLabel: "fake-local-official-label",
      eligibilityImpact: "metadata_required",
    },
  ],
  "fake-vault-steward-note": [
    {
      category: "fake_work_product",
      severity: "high",
      reviewerNote: "Steward-work-product fake label needs more redaction before metadata review.",
      confidence: 0.94,
      reason: "Work-product style notes are treated as sensitive in the fake workflow.",
      safeExampleLabel: "fake-work-product-label",
      eligibilityImpact: "redaction_required",
    },
  ],
  "fake-vault-redacted-example": [],
  "fake-vault-restricted": [
    {
      category: "fake_restricted_marker",
      severity: "restricted",
      reviewerNote: "Restricted fake marker rejects this row from index eligibility.",
      confidence: 0.99,
      reason: "Restricted-sensitive placeholders are never indexable in this fake model.",
      safeExampleLabel: "fake-restricted-label",
      eligibilityImpact: "not_indexable",
    },
  ],
  "fake-vault-quarantine": [
    {
      category: "fake_distribution_limit",
      severity: "moderate",
      reviewerNote: "Quarantine fake row has no completed hash/provenance or review.",
      confidence: 0.77,
      reason: "Quarantine is a holding state, not redaction approval.",
      safeExampleLabel: "fake-quarantine-label",
      eligibilityImpact: "not_indexable",
    },
  ],
};

export function cloneRedactionMetadata(metadata: readonly FakeRedactionMetadata[]): FakeRedactionMetadata[] {
  return metadata.map((item) => ({ ...item }));
}

export function redactionReviewOutcomeFor(metadata: readonly FakeRedactionMetadata[]): FakeRedactionReviewOutcome {
  if (metadata.some((item) => item.severity === "restricted" || item.eligibilityImpact === "not_indexable")) return "reject_sensitive";
  if (metadata.some((item) => item.severity === "high" || item.eligibilityImpact === "redaction_required")) return "needs_more_redaction";
  if (metadata.some((item) => item.eligibilityImpact === "metadata_required")) return "metadata_incomplete";
  return "approve_redaction";
}

export function redactionEligibilityImpactFor(metadata: readonly FakeRedactionMetadata[]): FakeEligibilityImpact {
  if (metadata.some((item) => item.eligibilityImpact === "not_indexable")) return "not_indexable";
  if (metadata.some((item) => item.eligibilityImpact === "redaction_required")) return "redaction_required";
  if (metadata.some((item) => item.eligibilityImpact === "metadata_required")) return "metadata_required";
  return "none";
}

export function redactionMetadataCategoryLabels(metadata: readonly FakeRedactionMetadata[]): string[] {
  return metadata.map((item) => item.safeExampleLabel);
}

export function assertFakeRedactionMetadataSafe(metadata: readonly FakeRedactionMetadata[]): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];

  for (const item of metadata) {
    if (item.confidence < 0 || item.confidence > 1) reasons.push(`invalid confidence for ${item.category}`);
    for (const [key, value] of Object.entries(item)) {
      if (typeof value !== "string") continue;
      if (forbiddenMetadataFragments.some((fragment) => value.includes(fragment))) reasons.push(`unsafe private reference in ${key}`);
      if (/\b(?:member|account|employee|case)[_-]?id\s*[:=]/i.test(value)) reasons.push(`unsafe identifier-shaped value in ${key}`);
    }
  }

  return {
    ok: reasons.length === 0,
    reasons: [...new Set(reasons)],
  };
}
