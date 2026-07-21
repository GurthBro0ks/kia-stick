import type { CbaParagraph, CbaSourceCache } from "@/lib/cbaSource";

export const CBA_SOURCE_INSTANCE_ALGORITHM_VERSION = "cba-source-instance.v1" as const;
export const CBA_PARAGRAPH_HASH_ALGORITHM_VERSION = "cba-paragraph-content.v1" as const;
export const CBA_CITATION_ANCHOR_ALGORITHM_VERSION = "cba-citation-anchor.v1" as const;
export const CBA_NORMALIZATION_ALGORITHM_VERSION = "cba-normalization.v1" as const;

export type CitationVerificationState =
  | "verified_current"
  | "source_instance_changed"
  | "paragraph_changed"
  | "paragraph_missing"
  | "locator_changed"
  | "ambiguous_duplicate"
  | "legacy_unverifiable"
  | "cache_unavailable"
  | "invalid_metadata";

export interface CbaSourceInstance {
  sourceInstanceId: string;
  sourceInstanceAlgorithmVersion: typeof CBA_SOURCE_INSTANCE_ALGORITHM_VERSION;
  sourceId: string;
  pdfSha256: string;
  normalizedContentSha256: string;
  extractionTool: string;
  extractionToolVersion: string;
  parserSchemaVersion: string;
  normalizationAlgorithmVersion: string;
}

export interface CbaCitationIntegrityFields {
  sourceInstanceId: string;
  sourceInstanceAlgorithmVersion: typeof CBA_SOURCE_INSTANCE_ALGORITHM_VERSION;
  paragraphContentSha256: string;
  paragraphHashAlgorithmVersion: typeof CBA_PARAGRAPH_HASH_ALGORITHM_VERSION;
  citationAnchorSha256: string;
  citationAnchorAlgorithmVersion: typeof CBA_CITATION_ANCHOR_ALGORITHM_VERSION;
  citationVerificationState: CitationVerificationState;
}

export interface CbaCitationMetadata {
  sourceKind?: string;
  sourceId?: string;
  publicSourceType?: string;
  paragraphId?: string;
  pdfPageNumber?: number;
  printedPageLabel?: string | null;
  articleNumber?: string | null;
  sectionId?: string;
  subsection?: string | null;
  sourceInstanceId?: string;
  sourceInstanceAlgorithmVersion?: string;
  paragraphContentSha256?: string;
  paragraphHashAlgorithmVersion?: string;
  citationAnchorSha256?: string;
  citationAnchorAlgorithmVersion?: string;
  citationVerificationState?: CitationVerificationState;
}

export interface CitationVerificationResult {
  state: CitationVerificationState;
  sourceInstance?: CbaSourceInstance;
  currentParagraph?: CbaParagraph;
}

export type SourceDriftClassification =
  | "source_unchanged"
  | "metadata_only_change"
  | "extraction_tool_change"
  | "normalization_version_change"
  | "source_content_changed"
  | "incompatible_schema";

export type ParagraphDriftClassification =
  | "paragraph_unchanged"
  | "paragraph_moved"
  | "paragraph_changed"
  | "paragraph_added"
  | "paragraph_removed"
  | "ambiguous_duplicate";

export interface ParagraphDrift {
  state: ParagraphDriftClassification;
  previousParagraphId?: string;
  proposedParagraphId?: string;
  paragraphContentSha256: string;
}

export interface CbaSourceDriftReport {
  sourceState: SourceDriftClassification;
  currentSourceInstance: CbaSourceInstance;
  proposedSourceInstance: CbaSourceInstance;
  paragraphDrift: ParagraphDrift[];
}

export interface CbaSourceOverwriteGuard {
  allowed: boolean;
  reason: "source_instance_unchanged" | "source_instance_changed_review_required" | "exact_hash_confirmation_required" | "exact_hash_confirmation_accepted";
  report: CbaSourceDriftReport;
  requiresExactExpectedHashes: boolean;
}

type CanonicalValue = null | boolean | number | string | CanonicalValue[] | { [key: string]: CanonicalValue };

const sha256Constants = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

function rightRotate(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

export function sha256Hex(value: string): string {
  const input = new TextEncoder().encode(value);
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const words = new Uint32Array(64);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const gamma0 = rightRotate(words[index - 15], 7) ^ rightRotate(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const gamma1 = rightRotate(words[index - 2], 17) ^ rightRotate(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + gamma0 + words[index - 7] + gamma1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let index = 0; index < 64; index += 1) {
      const sigma1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temporaryOne = (h + sigma1 + choice + sha256Constants[index] + words[index]) >>> 0;
      const sigma0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temporaryTwo = (sigma0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temporaryOne) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temporaryOne + temporaryTwo) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((part) => part.toString(16).padStart(8, "0")).join("");
}

export function canonicalJson(value: CanonicalValue): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical JSON does not permit non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function shortCbaDigest(value: string, length = 12): string {
  return value.slice(0, Math.max(8, Math.min(length, 24)));
}

export function normalizeCbaParagraphForHash(value: string): string {
  return value.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[\t\n\f\v \u00a0]+/g, " ").trim();
}

export function paragraphContentSha256(value: string): string {
  return sha256Hex(normalizeCbaParagraphForHash(value));
}

export function deriveCbaSourceInstance(
  source: CbaSourceCache,
  options: { normalizationAlgorithmVersion?: string } = {}
): CbaSourceInstance {
  const normalizationAlgorithmVersion = options.normalizationAlgorithmVersion ?? CBA_NORMALIZATION_ALGORITHM_VERSION;
  const canonical = {
    extractionTool: source.extraction.tool,
    extractionToolVersion: source.extraction.toolVersion,
    normalizationAlgorithmVersion,
    normalizedContentSha256: source.normalized.sha256,
    parserSchemaVersion: source.schema,
    pdfSha256: source.response.sha256,
    sourceId: source.source.id,
  };
  return {
    ...canonical,
    normalizationAlgorithmVersion,
    sourceInstanceId: sha256Hex(canonicalJson(canonical)),
    sourceInstanceAlgorithmVersion: CBA_SOURCE_INSTANCE_ALGORITHM_VERSION,
  };
}

function sectionNumberFromCitation(citation: CbaCitationMetadata): string | null {
  if (!citation.sectionId || citation.sectionId === "section-unknown") return null;
  return citation.sectionId.replace(/^section-/, "") || null;
}

export function deriveCbaCitationAnchor(input: {
  sourceInstanceId: string;
  sourceId: string;
  pdfPageNumber: number;
  printedPageLabel: string | null;
  articleNumber: string | null;
  sectionNumber: string | null;
  subsection: string | null;
  paragraphId: string;
  paragraphContentSha256: string;
}): string {
  return sha256Hex(canonicalJson({
    algorithm: CBA_CITATION_ANCHOR_ALGORITHM_VERSION,
    articleNumber: input.articleNumber,
    paragraphContentSha256: input.paragraphContentSha256,
    paragraphId: input.paragraphId,
    pdfPageNumber: input.pdfPageNumber,
    printedPageLabel: input.printedPageLabel,
    sectionNumber: input.sectionNumber,
    sourceId: input.sourceId,
    sourceInstanceId: input.sourceInstanceId,
    subsection: input.subsection,
  }));
}

export function deriveCbaCitationIntegrity(source: CbaSourceCache, paragraph: CbaParagraph): CbaCitationIntegrityFields {
  const sourceInstance = deriveCbaSourceInstance(source);
  const paragraphHash = paragraphContentSha256(paragraph.text);
  return {
    sourceInstanceId: sourceInstance.sourceInstanceId,
    sourceInstanceAlgorithmVersion: sourceInstance.sourceInstanceAlgorithmVersion,
    paragraphContentSha256: paragraphHash,
    paragraphHashAlgorithmVersion: CBA_PARAGRAPH_HASH_ALGORITHM_VERSION,
    citationAnchorSha256: deriveCbaCitationAnchor({
      sourceInstanceId: sourceInstance.sourceInstanceId,
      sourceId: source.source.id,
      pdfPageNumber: paragraph.pdfPageNumber,
      printedPageLabel: paragraph.printedPageLabel,
      articleNumber: paragraph.articleNumber,
      sectionNumber: paragraph.sectionNumber,
      subsection: paragraph.subsection,
      paragraphId: paragraph.id,
      paragraphContentSha256: paragraphHash,
    }),
    citationAnchorAlgorithmVersion: CBA_CITATION_ANCHOR_ALGORITHM_VERSION,
    citationVerificationState: "verified_current",
  };
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function cbaParagraphs(source: CbaSourceCache): CbaParagraph[] {
  return source.normalized.pages.flatMap((page) => page.paragraphs);
}

function hasNoIntegrityMetadata(citation: CbaCitationMetadata): boolean {
  return [
    citation.sourceInstanceId,
    citation.sourceInstanceAlgorithmVersion,
    citation.paragraphContentSha256,
    citation.paragraphHashAlgorithmVersion,
    citation.citationAnchorSha256,
    citation.citationAnchorAlgorithmVersion,
  ].every((value) => value === undefined);
}

export function verifyCbaCitation(citation: CbaCitationMetadata, source: CbaSourceCache | null): CitationVerificationResult {
  if (citation.sourceKind !== "public" || citation.publicSourceType !== "cba_contract" || !citation.paragraphId || !citation.sourceId) {
    return { state: "invalid_metadata" };
  }
  if (hasNoIntegrityMetadata(citation)) return { state: "legacy_unverifiable" };
  if (
    citation.sourceInstanceAlgorithmVersion !== CBA_SOURCE_INSTANCE_ALGORITHM_VERSION ||
    citation.paragraphHashAlgorithmVersion !== CBA_PARAGRAPH_HASH_ALGORITHM_VERSION ||
    citation.citationAnchorAlgorithmVersion !== CBA_CITATION_ANCHOR_ALGORITHM_VERSION ||
    !isSha256(citation.sourceInstanceId) ||
    !isSha256(citation.paragraphContentSha256) ||
    !isSha256(citation.citationAnchorSha256)
  ) return { state: "invalid_metadata" };
  if (!source) return { state: "cache_unavailable" };

  const sourceInstance = deriveCbaSourceInstance(source);
  if (citation.sourceId !== source.source.id || citation.sourceInstanceId !== sourceInstance.sourceInstanceId) {
    return { state: "source_instance_changed", sourceInstance };
  }

  const exactParagraph = cbaParagraphs(source).find((paragraph) => paragraph.id === citation.paragraphId);
  if (!exactParagraph) {
    const sameContent = cbaParagraphs(source).filter((paragraph) => paragraphContentSha256(paragraph.text) === citation.paragraphContentSha256);
    if (sameContent.length > 1) return { state: "ambiguous_duplicate", sourceInstance };
    if (sameContent.length === 1) return { state: "locator_changed", sourceInstance, currentParagraph: sameContent[0] };
    return { state: "paragraph_missing", sourceInstance };
  }

  if (paragraphContentSha256(exactParagraph.text) !== citation.paragraphContentSha256) {
    return { state: "paragraph_changed", sourceInstance, currentParagraph: exactParagraph };
  }
  const sectionNumber = sectionNumberFromCitation(citation);
  if (
    citation.pdfPageNumber !== exactParagraph.pdfPageNumber ||
    citation.printedPageLabel !== exactParagraph.printedPageLabel ||
    citation.articleNumber !== exactParagraph.articleNumber ||
    sectionNumber !== exactParagraph.sectionNumber ||
    citation.subsection !== exactParagraph.subsection
  ) return { state: "locator_changed", sourceInstance, currentParagraph: exactParagraph };

  const currentIntegrity = deriveCbaCitationIntegrity(source, exactParagraph);
  if (citation.citationAnchorSha256 !== currentIntegrity.citationAnchorSha256) {
    return { state: "locator_changed", sourceInstance, currentParagraph: exactParagraph };
  }
  return { state: "verified_current", sourceInstance, currentParagraph: exactParagraph };
}

export function citationVerificationMessage(state: CitationVerificationState): string {
  switch (state) {
    case "verified_current":
      return "Verified against the current bounded CBA source instance.";
    case "source_instance_changed":
      return "The CBA source instance changed; this saved locator is not verified against the current source.";
    case "paragraph_changed":
      return "The cited paragraph text changed; this locator cannot be treated as current.";
    case "paragraph_missing":
      return "The cited paragraph is not present in the current source.";
    case "locator_changed":
      return "The cited locator changed; re-search the current CBA before relying on it.";
    case "ambiguous_duplicate":
      return "More than one current paragraph matches this citation content; no location was guessed.";
    case "legacy_unverifiable":
      return "Legacy citation - re-verification required.";
    case "cache_unavailable":
      return "The bounded CBA cache is unavailable, so this citation cannot be verified.";
    case "invalid_metadata":
      return "Citation integrity metadata is incomplete or invalid.";
  }
}

export function isCbaCitationCurrent(citation: CbaCitationMetadata): boolean {
  return citation.citationVerificationState === "verified_current";
}

function byParagraphId(source: CbaSourceCache): Map<string, CbaParagraph> {
  return new Map(cbaParagraphs(source).map((paragraph) => [paragraph.id, paragraph]));
}

function sourceState(
  current: CbaSourceCache,
  proposed: CbaSourceCache,
  currentNormalizationAlgorithmVersion: string = CBA_NORMALIZATION_ALGORITHM_VERSION,
  proposedNormalizationAlgorithmVersion: string = CBA_NORMALIZATION_ALGORITHM_VERSION
): SourceDriftClassification {
  if (current.schema !== proposed.schema) return "incompatible_schema";
  const currentInstance = deriveCbaSourceInstance(current, { normalizationAlgorithmVersion: currentNormalizationAlgorithmVersion });
  const proposedInstance = deriveCbaSourceInstance(proposed, { normalizationAlgorithmVersion: proposedNormalizationAlgorithmVersion });
  if (currentInstance.sourceInstanceId === proposedInstance.sourceInstanceId) {
    return current.retrievedAt === proposed.retrievedAt ? "source_unchanged" : "metadata_only_change";
  }
  if (current.extraction.tool !== proposed.extraction.tool || current.extraction.toolVersion !== proposed.extraction.toolVersion) return "extraction_tool_change";
  if (currentNormalizationAlgorithmVersion !== proposedNormalizationAlgorithmVersion) return "normalization_version_change";
  if (current.normalized.sha256 === proposed.normalized.sha256 && current.response.sha256 === proposed.response.sha256) return "normalization_version_change";
  return "source_content_changed";
}

export function compareCbaSourceInstances(
  current: CbaSourceCache,
  proposed: CbaSourceCache,
  options: { currentNormalizationAlgorithmVersion?: string; proposedNormalizationAlgorithmVersion?: string } = {}
): CbaSourceDriftReport {
  const currentNormalizationAlgorithmVersion = options.currentNormalizationAlgorithmVersion ?? CBA_NORMALIZATION_ALGORITHM_VERSION;
  const proposedNormalizationAlgorithmVersion = options.proposedNormalizationAlgorithmVersion ?? CBA_NORMALIZATION_ALGORITHM_VERSION;
  const currentInstance = deriveCbaSourceInstance(current, { normalizationAlgorithmVersion: currentNormalizationAlgorithmVersion });
  const proposedInstance = deriveCbaSourceInstance(proposed, { normalizationAlgorithmVersion: proposedNormalizationAlgorithmVersion });
  const currentById = byParagraphId(current);
  const proposedById = byParagraphId(proposed);
  const proposedByHash = new Map<string, CbaParagraph[]>();
  for (const paragraph of cbaParagraphs(proposed)) {
    const hash = paragraphContentSha256(paragraph.text);
    proposedByHash.set(hash, [...(proposedByHash.get(hash) ?? []), paragraph]);
  }
  const usedProposedIds = new Set<string>();
  const paragraphDrift: ParagraphDrift[] = [];

  for (const [id, paragraph] of currentById) {
    const hash = paragraphContentSha256(paragraph.text);
    const direct = proposedById.get(id);
    if (direct && paragraphContentSha256(direct.text) === hash) {
      usedProposedIds.add(direct.id);
      paragraphDrift.push({ state: "paragraph_unchanged", previousParagraphId: id, proposedParagraphId: direct.id, paragraphContentSha256: hash });
      continue;
    }
    const matches = proposedByHash.get(hash) ?? [];
    if (matches.length === 1) {
      usedProposedIds.add(matches[0].id);
      paragraphDrift.push({ state: "paragraph_moved", previousParagraphId: id, proposedParagraphId: matches[0].id, paragraphContentSha256: hash });
      continue;
    }
    if (matches.length > 1) {
      matches.forEach((match) => usedProposedIds.add(match.id));
      paragraphDrift.push({ state: "ambiguous_duplicate", previousParagraphId: id, paragraphContentSha256: hash });
      continue;
    }
    paragraphDrift.push({
      state: direct ? "paragraph_changed" : "paragraph_removed",
      previousParagraphId: id,
      proposedParagraphId: direct?.id,
      paragraphContentSha256: hash,
    });
    if (direct) usedProposedIds.add(direct.id);
  }

  for (const paragraph of cbaParagraphs(proposed)) {
    if (usedProposedIds.has(paragraph.id)) continue;
    paragraphDrift.push({
      state: "paragraph_added",
      proposedParagraphId: paragraph.id,
      paragraphContentSha256: paragraphContentSha256(paragraph.text),
    });
  }
  return {
    sourceState: sourceState(current, proposed, currentNormalizationAlgorithmVersion, proposedNormalizationAlgorithmVersion),
    currentSourceInstance: currentInstance,
    proposedSourceInstance: proposedInstance,
    paragraphDrift,
  };
}

export function evaluateCbaSourceOverwriteGuard(input: {
  current: CbaSourceCache;
  proposed: CbaSourceCache;
  expectedCurrentSourceInstanceId?: string;
  expectedProposedSourceInstanceId?: string;
  operatorApprovedExactHashes?: boolean;
  currentNormalizationAlgorithmVersion?: string;
  proposedNormalizationAlgorithmVersion?: string;
}): CbaSourceOverwriteGuard {
  const report = compareCbaSourceInstances(input.current, input.proposed, {
    currentNormalizationAlgorithmVersion: input.currentNormalizationAlgorithmVersion,
    proposedNormalizationAlgorithmVersion: input.proposedNormalizationAlgorithmVersion,
  });
  if (report.sourceState === "source_unchanged" || report.sourceState === "metadata_only_change") {
    return { allowed: true, reason: "source_instance_unchanged", report, requiresExactExpectedHashes: false };
  }
  const exactConfirmation = input.operatorApprovedExactHashes === true &&
    input.expectedCurrentSourceInstanceId === report.currentSourceInstance.sourceInstanceId &&
    input.expectedProposedSourceInstanceId === report.proposedSourceInstance.sourceInstanceId;
  return exactConfirmation
    ? { allowed: true, reason: "exact_hash_confirmation_accepted", report, requiresExactExpectedHashes: true }
    : { allowed: false, reason: input.operatorApprovedExactHashes ? "exact_hash_confirmation_required" : "source_instance_changed_review_required", report, requiresExactExpectedHashes: true };
}
