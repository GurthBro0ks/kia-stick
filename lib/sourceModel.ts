import corpusJson from "@/data/fake-corpus.json";

export type SourceClass =
  | "controlling_contract_language"
  | "local_controlling_source"
  | "signed_mou"
  | "joint_interpretation"
  | "official_manual"
  | "persuasive_authority"
  | "local_settlement"
  | "past_practice_evidence"
  | "supporting_evidence"
  | "steward_note"
  | "historical_background"
  | "unknown_unverified";

export type Scope = "All Fake" | "Official-Like" | "Local-Like" | "Notes+Evidence";
export type Mode =
  | "Strict Research"
  | "Calm Neutral"
  | "Aggressive Grievance"
  | "Steward-to-Supervisor";
export type Detail = "Simple" | "Detailed" | "Checklist";

export type SourceBucket =
  | "controlling"
  | "local"
  | "interpretive"
  | "manual"
  | "persuasive"
  | "evidence"
  | "notes"
  | "background"
  | "unverified";

export type SourceHierarchy =
  | "local"
  | "state_area"
  | "national"
  | "manuals_handbooks"
  | "arbitration_settlements"
  | "steward_notes_evidence"
  | "unknown";

export interface FakeDocument {
  id: string;
  title: string;
  type: string;
  class: SourceClass;
  scope: Scope;
  status: string;
  citable: boolean;
  privacy: string;
  review: string;
  redaction: string;
  ocr: string;
  hash: string;
  corpusVersion: string;
  indexVersion: string;
  page: string;
  article: string;
  section: string;
  file: string;
  tags: string[];
  excerpt: string;
  body: string;
}

export interface SourceHierarchyGroup {
  hierarchy: SourceHierarchy;
  label: string;
  docs: FakeDocument[];
}

export interface CorpusData {
  generatedAt: string;
  corpusVersion: string;
  indexVersion: string;
  requiredBanner: string;
  sourceClasses: SourceClass[];
  docs: FakeDocument[];
}

export interface Citation {
  id: string;
  title: string;
  class: SourceClass;
  scope: Scope;
  status: string;
  page: string;
  article: string;
  section: string;
  file: string;
  hash: string;
  citable: boolean;
  sourceKind?: "fake" | "public";
  sourceId?: string;
  sectionId?: string;
  paragraphId?: string;
  retrievedAt?: string;
  contentHash?: string;
  officialUrl?: string;
  publicSourceType?: "nlrb_guidance" | "cba_contract";
  sourcePageUrl?: string;
  officialPdfUrl?: string;
  responseHash?: string;
  effectiveStart?: string;
  effectiveEnd?: string;
  pdfPageIndex?: number;
  pdfPageNumber?: number;
  printedPageLabel?: string | null;
  structuralType?: string;
  articleNumber?: string | null;
  articleTitle?: string | null;
  subsection?: string | null;
  provider?: string;
  promptVersion?: string;
  sourceInstanceId?: string;
  sourceInstanceAlgorithmVersion?: string;
  paragraphContentSha256?: string;
  paragraphHashAlgorithmVersion?: string;
  citationAnchorSha256?: string;
  citationAnchorAlgorithmVersion?: string;
  citationVerificationState?:
    | "verified_current"
    | "source_instance_changed"
    | "paragraph_changed"
    | "paragraph_missing"
    | "locator_changed"
    | "ambiguous_duplicate"
    | "legacy_unverifiable"
    | "cache_unavailable"
    | "invalid_metadata";
}

export const corpus = corpusJson as unknown as CorpusData;

export const sourceClassLabels: Record<SourceClass, string> = {
  controlling_contract_language: "Controlling contract language",
  local_controlling_source: "Local controlling source",
  signed_mou: "Signed MOU",
  joint_interpretation: "Joint interpretation",
  official_manual: "Official manual",
  persuasive_authority: "Persuasive authority",
  local_settlement: "Local settlement",
  past_practice_evidence: "Past-practice evidence",
  supporting_evidence: "Supporting evidence",
  steward_note: "Steward note",
  historical_background: "Historical background",
  unknown_unverified: "Unknown / unverified",
};

export const bucketLabels: Record<SourceBucket, string> = {
  controlling: "Controlling",
  local: "Local",
  interpretive: "Interpretive",
  manual: "Manual",
  persuasive: "Persuasive",
  evidence: "Evidence",
  notes: "Notes",
  background: "Background",
  unverified: "Unverified",
};

export const sourceHierarchyOrder: SourceHierarchy[] = [
  "local",
  "state_area",
  "national",
  "manuals_handbooks",
  "arbitration_settlements",
  "steward_notes_evidence",
  "unknown",
];

export const sourceHierarchyLabels: Record<SourceHierarchy, string> = {
  local: "Local",
  state_area: "State/Area",
  national: "National",
  manuals_handbooks: "Manuals/Handbooks",
  arbitration_settlements: "Arbitration/Settlements",
  steward_notes_evidence: "Steward Notes/Evidence",
  unknown: "Unknown",
};

export function bucketForClass(sourceClass: SourceClass): SourceBucket {
  switch (sourceClass) {
    case "controlling_contract_language":
      return "controlling";
    case "local_controlling_source":
      return "local";
    case "signed_mou":
    case "joint_interpretation":
      return "interpretive";
    case "official_manual":
      return "manual";
    case "persuasive_authority":
    case "local_settlement":
    case "past_practice_evidence":
      return "persuasive";
    case "supporting_evidence":
      return "evidence";
    case "steward_note":
      return "notes";
    case "historical_background":
      return "background";
    case "unknown_unverified":
      return "unverified";
  }
}

export function hierarchyForClass(sourceClass: SourceClass): SourceHierarchy {
  switch (sourceClass) {
    case "local_controlling_source":
    case "past_practice_evidence":
      return "local";
    case "joint_interpretation":
      return "state_area";
    case "controlling_contract_language":
    case "signed_mou":
      return "national";
    case "official_manual":
      return "manuals_handbooks";
    case "persuasive_authority":
    case "local_settlement":
      return "arbitration_settlements";
    case "supporting_evidence":
    case "steward_note":
      return "steward_notes_evidence";
    case "historical_background":
    case "unknown_unverified":
      return "unknown";
  }
}

export function buildSourceHierarchyGroups(docs: FakeDocument[] = corpus.docs): SourceHierarchyGroup[] {
  return sourceHierarchyOrder
    .map((hierarchy) => ({
      hierarchy,
      label: sourceHierarchyLabels[hierarchy],
      docs: docs.filter((doc) => hierarchyForClass(doc.class) === hierarchy),
    }))
    .filter((group) => group.docs.length > 0);
}

function sourceHierarchyRank(sourceClass: SourceClass): number {
  return sourceHierarchyOrder.indexOf(hierarchyForClass(sourceClass));
}

export function dedupeFakeDocuments(docs: FakeDocument[]): FakeDocument[] {
  const seen = new Set<string>();
  const unique: FakeDocument[] = [];
  for (const doc of docs) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    unique.push(doc);
  }
  return unique;
}

export function orderFakeDocumentsForCitation(docs: FakeDocument[]): FakeDocument[] {
  return dedupeFakeDocuments(docs).sort((left, right) => {
    const rank = sourceHierarchyRank(left.class) - sourceHierarchyRank(right.class);
    if (rank !== 0) return rank;
    return left.id.localeCompare(right.id);
  });
}

export function citationForDoc(doc: FakeDocument): Citation {
  return {
    id: doc.id,
    title: doc.title,
    class: doc.class,
    scope: doc.scope,
    status: doc.status,
    page: doc.page,
    article: doc.article,
    section: doc.section,
    file: doc.file,
    hash: doc.hash,
    citable: doc.citable,
  };
}

export function dedupeCitations(citations: Citation[]): Citation[] {
  const seen = new Set<string>();
  const unique: Citation[] = [];
  for (const citation of citations) {
    if (seen.has(citation.id)) continue;
    seen.add(citation.id);
    unique.push(citation);
  }
  return unique;
}

export function citationLabel(citation: Citation): string {
  if (citation.sourceKind === "public") {
    if (citation.publicSourceType === "cba_contract") {
      const printed = citation.printedPageLabel ? ` · printed ${citation.printedPageLabel}` : " · printed unknown";
      const integrity = citation.citationVerificationState === "verified_current" ? " · verified current source" : citation.citationVerificationState ? ` · ${citation.citationVerificationState.replaceAll("_", " ")}` : "";
      return `${citation.sourceId} · Article ${citation.articleNumber ?? "unknown"} · Section ${citation.sectionId ?? "unknown"} · PDF ${citation.pdfPageNumber ?? "unknown"}${printed} · ${citation.paragraphId}${integrity}`;
    }
    return `${citation.sourceId} · ${citation.sectionId} · ${citation.paragraphId} · retrieved ${citation.retrievedAt?.slice(0, 10)} · ${citation.contentHash}`;
  }
  return `${citation.title} · ${citation.article} · ${citation.section} · ${citation.page} · ${citation.hash.slice(0, 10)}`;
}

export function docsForScope(scope: Scope): FakeDocument[] {
  if (scope === "All Fake") return corpus.docs;
  if (scope === "Official-Like") {
    return corpus.docs.filter((doc) => doc.scope === "Official-Like" || doc.scope === "All Fake");
  }
  if (scope === "Local-Like") {
    return corpus.docs.filter((doc) => doc.scope === "Local-Like" || doc.scope === "All Fake");
  }
  return corpus.docs.filter((doc) => doc.scope === "Notes+Evidence" || doc.scope === "All Fake");
}
