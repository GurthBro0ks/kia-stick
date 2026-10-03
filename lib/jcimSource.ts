import type { Citation } from "@/lib/sourceModel";
import { canonicalJson, paragraphContentSha256, sha256Hex } from "@/lib/cbaCitationIntegrity";
import type { SupplementalSourceVerifier } from "@/lib/publicPacketProvenance";

export const JCIM_SOURCE_ID = "apwu-usps-jcim-2025" as const;
export const JCIM_LANDING_URL = "https://apwu.org/contracts/jcim-2025-joint-contract-intepretation-manual-jcim/" as const;
export const JCIM_PDF_URL = "https://apwu.org/wp-content/uploads/2026/03/JCIM-2025-Web_BOOKMARKED_v4.pdf" as const;
export const JCIM_SHA256 = "6605cc0a94532a0264c0f2bd78f604f23e49c85ded15416c166858ae28a7d6f7" as const;
export const JCIM_NORMALIZED_SHA256 = "4630eb409316468bea9597e7c981e868cd7d5a7f762b473ee23efe613362d8c3" as const;
export const JCIM_BYTES = 3111811 as const;
export const JCIM_LAST_MODIFIED = "Wed, 04 Mar 2026 20:17:59 GMT" as const;
export const JCIM_EDITION = "November 2025" as const;
export const JCIM_TITLE = "USPS-APWU Joint Contract Interpretation Manual" as const;
export const JCIM_AUTHORITY_CLASS = "joint_national_interpretation" as const;
export const JCIM_AUTHORITY_LABEL = "Joint interpretation (JCIM)" as const;
export const JCIM_SECTION_IDS = ["preface", "introduction", "article-15", "article-16", "article-17", "article-19"] as const;

export interface JcimParagraph {
  id: string;
  text: string;
  pdfPageNumber: number;
  printedPageLabel: string | null;
  articleNumber: string | null;
  qaId: string | null;
  heading: string | null;
}
export interface JcimSection { id: string; title: string; paragraphs: JcimParagraph[] }
export interface JcimCache {
  schema: "kia-jcim-cache.v1";
  source: { id: typeof JCIM_SOURCE_ID; title: typeof JCIM_TITLE; authorityClass: typeof JCIM_AUTHORITY_CLASS;
    authorityLabel: typeof JCIM_AUTHORITY_LABEL; landingUrl: typeof JCIM_LANDING_URL; pdfUrl: typeof JCIM_PDF_URL;
    edition: typeof JCIM_EDITION; readOnly: true };
  response: { sha256: typeof JCIM_SHA256; byteCount: typeof JCIM_BYTES; lastModified: typeof JCIM_LAST_MODIFIED };
  normalized: { sha256: string; sectionCount: 6; sections: JcimSection[] };
}

function instanceId(source: JcimCache): string {
  return sha256Hex(canonicalJson({ cacheSchema: source.schema, normalizedContentSha256: source.normalized.sha256,
    responseSha256: source.response.sha256, sourceId: source.source.id }));
}

export function jcimCitation(source: JcimCache, section: JcimSection, paragraph: JcimParagraph): Citation {
  const sourceInstanceId = instanceId(source);
  const paragraphContentSha = paragraphContentSha256(paragraph.text);
  const citationAnchorSha256 = sha256Hex(canonicalJson({ paragraphContentSha256: paragraphContentSha,
    paragraphId: paragraph.id, sectionId: section.id, sourceId: JCIM_SOURCE_ID, sourceInstanceId }));
  return { id: `${JCIM_SOURCE_ID}@${paragraph.id}`, title: `${JCIM_TITLE} (${JCIM_EDITION})`, class: "joint_interpretation",
    scope: "Official-Like", status: `${JCIM_AUTHORITY_LABEL} · verified current`,
    page: `PDF ${paragraph.pdfPageNumber}${paragraph.printedPageLabel ? ` / printed ${paragraph.printedPageLabel}` : ""}`,
    article: paragraph.articleNumber ? `Article ${paragraph.articleNumber}` : section.title,
    section: paragraph.qaId ? `Q&A ${paragraph.qaId}` : paragraph.heading ?? section.title,
    file: JCIM_PDF_URL, hash: source.normalized.sha256, citable: true, sourceKind: "public",
    sourceId: JCIM_SOURCE_ID, publicSourceType: "jcim_joint_interpretation", sectionId: section.id,
    paragraphId: paragraph.id, officialUrl: JCIM_PDF_URL, officialPdfUrl: JCIM_PDF_URL,
    sourcePageUrl: JCIM_LANDING_URL, responseHash: JCIM_SHA256, pdfPageNumber: paragraph.pdfPageNumber,
    printedPageLabel: paragraph.printedPageLabel, articleNumber: paragraph.articleNumber,
    sourceInstanceId, sourceInstanceAlgorithmVersion: "public-source-instance.v1",
    paragraphContentSha256: paragraphContentSha, paragraphHashAlgorithmVersion: "public-paragraph-content.v1",
    citationAnchorSha256, citationAnchorAlgorithmVersion: "public-citation-anchor.v1",
    citationVerificationState: "verified_current" };
}

export function verifyJcimCitation(citation: Citation, source: JcimCache | null): NonNullable<Citation["citationVerificationState"]> {
  if (!source) return "cache_unavailable";
  if (citation.sourceId !== JCIM_SOURCE_ID || citation.publicSourceType !== "jcim_joint_interpretation" ||
    citation.sourceInstanceId !== instanceId(source)) return "source_instance_changed";
  const section = source.normalized.sections.find((item) => item.id === citation.sectionId);
  const paragraph = section?.paragraphs.find((item) => item.id === citation.paragraphId);
  if (!section || !paragraph) return "paragraph_missing";
  const expected = jcimCitation(source, section, paragraph);
  return citation.paragraphContentSha256 === expected.paragraphContentSha256 &&
    citation.citationAnchorSha256 === expected.citationAnchorSha256 &&
    citation.articleNumber === expected.articleNumber && citation.pdfPageNumber === expected.pdfPageNumber
    ? "verified_current" : "locator_changed";
}

export function jcimPacketSourceVerifier(source: JcimCache | null): SupplementalSourceVerifier {
  return { sourceId: JCIM_SOURCE_ID, publicSourceType: "jcim_joint_interpretation", authorityClass: "joint_interpretation",
    verify: (citation) => verifyJcimCitation(citation, source) };
}

export function jcimTopicCitation(source: JcimCache | null, topic: string): Citation[] {
  if (!source || !["discipline_just_cause", "steward_grievance_handling"].includes(topic)) return [];
  const sections = topic === "discipline_just_cause" ? ["article-16"] : ["article-15", "article-17"];
  return sections.flatMap((id) => {
    const section = source.normalized.sections.find((item) => item.id === id);
    const paragraph = section?.paragraphs.find((item) => /Article (?:15|16|17)\.\d|JUST CAUSE|REPRESENTATION|GRIEVANCE/i.test(item.text));
    return section && paragraph ? [jcimCitation(source, section, paragraph)] : [];
  });
}
