import {
  canonicalJson,
  paragraphContentSha256,
  sha256Hex,
  type CitationVerificationState,
} from "@/lib/cbaCitationIntegrity";
import type {
  PublicSourceCache,
  PublicSourceParagraph,
  PublicSourceSection,
} from "@/lib/publicSource";
import type { Citation } from "@/lib/sourceModel";

export const PUBLIC_SOURCE_INSTANCE_ALGORITHM_VERSION = "public-source-instance.v1" as const;
export const PUBLIC_PARAGRAPH_HASH_ALGORITHM_VERSION = "public-paragraph-content.v1" as const;
export const PUBLIC_CITATION_ANCHOR_ALGORITHM_VERSION = "public-citation-anchor.v1" as const;

export interface PublicSourceInstance {
  sourceInstanceId: string;
  sourceInstanceAlgorithmVersion: typeof PUBLIC_SOURCE_INSTANCE_ALGORITHM_VERSION;
  sourceId: string;
  responseSha256: string;
  normalizedContentSha256: string;
  cacheSchema: string;
}

export interface PublicCitationIntegrityFields {
  sourceInstanceId: string;
  sourceInstanceAlgorithmVersion: typeof PUBLIC_SOURCE_INSTANCE_ALGORITHM_VERSION;
  paragraphContentSha256: string;
  paragraphHashAlgorithmVersion: typeof PUBLIC_PARAGRAPH_HASH_ALGORITHM_VERSION;
  citationAnchorSha256: string;
  citationAnchorAlgorithmVersion: typeof PUBLIC_CITATION_ANCHOR_ALGORITHM_VERSION;
  citationVerificationState: CitationVerificationState;
}

export interface PublicCitationVerificationResult {
  state: CitationVerificationState;
  sourceInstance?: PublicSourceInstance;
  currentParagraph?: PublicSourceParagraph;
}

function isSha256(value: string | undefined): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

export function derivePublicSourceInstance(source: PublicSourceCache): PublicSourceInstance {
  const canonical = {
    cacheSchema: source.schema,
    normalizedContentSha256: source.normalized.sha256,
    responseSha256: source.response.sha256,
    sourceId: source.source.id,
  };
  return {
    ...canonical,
    sourceInstanceId: sha256Hex(canonicalJson(canonical)),
    sourceInstanceAlgorithmVersion: PUBLIC_SOURCE_INSTANCE_ALGORITHM_VERSION,
  };
}

export function derivePublicCitationIntegrity(
  source: PublicSourceCache,
  section: PublicSourceSection,
  paragraph: PublicSourceParagraph
): PublicCitationIntegrityFields {
  const sourceInstance = derivePublicSourceInstance(source);
  const paragraphSha256 = paragraphContentSha256(paragraph.text);
  const anchor = {
    paragraphContentSha256: paragraphSha256,
    paragraphId: paragraph.id,
    sectionId: section.id,
    sourceId: source.source.id,
    sourceInstanceId: sourceInstance.sourceInstanceId,
  };
  return {
    sourceInstanceId: sourceInstance.sourceInstanceId,
    sourceInstanceAlgorithmVersion: PUBLIC_SOURCE_INSTANCE_ALGORITHM_VERSION,
    paragraphContentSha256: paragraphSha256,
    paragraphHashAlgorithmVersion: PUBLIC_PARAGRAPH_HASH_ALGORITHM_VERSION,
    citationAnchorSha256: sha256Hex(canonicalJson(anchor)),
    citationAnchorAlgorithmVersion: PUBLIC_CITATION_ANCHOR_ALGORITHM_VERSION,
    citationVerificationState: "verified_current",
  };
}

export function verifyPublicCitation(
  citation: Pick<Citation,
    | "sourceId"
    | "sectionId"
    | "paragraphId"
    | "sourceInstanceId"
    | "sourceInstanceAlgorithmVersion"
    | "paragraphContentSha256"
    | "paragraphHashAlgorithmVersion"
    | "citationAnchorSha256"
    | "citationAnchorAlgorithmVersion"
  >,
  source: PublicSourceCache | null
): PublicCitationVerificationResult {
  if (!source) return { state: "cache_unavailable" };
  const metadata = [
    citation.sourceInstanceId,
    citation.sourceInstanceAlgorithmVersion,
    citation.paragraphContentSha256,
    citation.paragraphHashAlgorithmVersion,
    citation.citationAnchorSha256,
    citation.citationAnchorAlgorithmVersion,
  ];
  if (metadata.every((value) => value === undefined)) return { state: "legacy_unverifiable" };
  if (
    citation.sourceId !== source.source.id ||
    !citation.sectionId ||
    !citation.paragraphId ||
    !isSha256(citation.sourceInstanceId) ||
    !isSha256(citation.paragraphContentSha256) ||
    !isSha256(citation.citationAnchorSha256) ||
    citation.sourceInstanceAlgorithmVersion !== PUBLIC_SOURCE_INSTANCE_ALGORITHM_VERSION ||
    citation.paragraphHashAlgorithmVersion !== PUBLIC_PARAGRAPH_HASH_ALGORITHM_VERSION ||
    citation.citationAnchorAlgorithmVersion !== PUBLIC_CITATION_ANCHOR_ALGORITHM_VERSION
  ) return { state: "invalid_metadata" };

  const sourceInstance = derivePublicSourceInstance(source);
  if (citation.sourceInstanceId !== sourceInstance.sourceInstanceId) {
    return { state: "source_instance_changed", sourceInstance };
  }

  const section = source.normalized.sections.find((candidate) => candidate.id === citation.sectionId);
  if (!section) return { state: "paragraph_missing", sourceInstance };
  const paragraph = section.paragraphs.find((candidate) => candidate.id === citation.paragraphId);
  if (!paragraph) return { state: "paragraph_missing", sourceInstance };
  if (paragraphContentSha256(paragraph.text) !== citation.paragraphContentSha256) {
    return { state: "paragraph_changed", sourceInstance, currentParagraph: paragraph };
  }

  const currentIntegrity = derivePublicCitationIntegrity(source, section, paragraph);
  if (currentIntegrity.citationAnchorSha256 !== citation.citationAnchorSha256) {
    return { state: "locator_changed", sourceInstance, currentParagraph: paragraph };
  }
  return { state: "verified_current", sourceInstance, currentParagraph: paragraph };
}
