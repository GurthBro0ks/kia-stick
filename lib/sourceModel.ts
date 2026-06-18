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

export function citationLabel(citation: Citation): string {
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
