export const CBA_SOURCE_ID = "apwu-usps-cba-2024-2027" as const;
export const CBA_SOURCE_PAGE_URL =
  "https://apwu.org/contracts/2024-2027-apwu-usps-collective-bargaining-agreement/" as const;
export const CBA_SOURCE_PDF_URL =
  "https://apwu.org/wp-content/uploads/2025/10/2024-2027-APWU-USPS-CBA-September-21-2024-September-20-2027-Bookmarked.pdf" as const;
export const CBA_SOURCE_HOST = "apwu.org" as const;
export const CBA_SOURCE_TITLE = "2024-2027 APWU-USPS Collective Bargaining Agreement" as const;
export const CBA_SOURCE_OWNER = "American Postal Workers Union, AFL-CIO and U.S. Postal Service" as const;
export const CBA_SOURCE_CLASS = "controlling_contract_language" as const;
export const CBA_DOCUMENT_STATUS = "official_final" as const;
export const CBA_SOURCE_SENSITIVITY = "public_non_sensitive" as const;
export const CBA_SOURCE_ACCESS_MODE = "exact_allowlisted_read_only" as const;
export const CBA_EFFECTIVE_START = "2024-09-21" as const;
export const CBA_EFFECTIVE_END = "2027-09-20" as const;
export const CBA_EXPECTED_PDF_PAGES = 536 as const;
export const CBA_CONTROLLING_SCOPE = "yes_with_scope_caveats" as const;
export const CBA_SCOPE_REQUIRES_FACT_MATCH = "yes" as const;
export const CBA_LEGAL_ADVICE = "no" as const;
export const CBA_CACHE_SCHEMA = "kia-public-cba-cache.v1" as const;
export const CBA_PDF_CACHE_RELATIVE_PATH = ".kia-public-data/apwu-usps-cba-2024-2027.pdf" as const;
export const CBA_JSON_CACHE_RELATIVE_PATH = ".kia-public-data/apwu-usps-cba-2024-2027.json" as const;
export const CBA_PROVIDER = "local-public-cba-deterministic" as const;
export const CBA_PROMPT_VERSION = "prompt.public-cba.v0.1-citation-first" as const;
export const CBA_MAX_RESPONSE_BYTES = 50 * 1024 * 1024;
export const CBA_MAX_CACHE_BYTES = 20 * 1024 * 1024;
export const CBA_TIMEOUT_MS = 30_000;
export const CBA_SCOPE_WARNING =
  "Controlling contract language for covered APWU bargaining-unit employees, subject to the cited article, craft, employee status, local agreements, memoranda, and case facts." as const;

export type CbaStructuralType =
  | "preamble"
  | "article"
  | "appendix"
  | "memorandum_of_understanding"
  | "letter_of_intent"
  | "attachment"
  | "index_or_front_matter"
  | "unknown";

export interface CbaParagraph {
  id: string;
  text: string;
  contentHash: string;
  pdfPageIndex: number;
  pdfPageNumber: number;
  printedPageLabel: string | null;
  structuralType: CbaStructuralType;
  articleNumber: string | null;
  articleTitle: string | null;
  sectionNumber: string | null;
  sectionTitle: string | null;
  subsection: string | null;
}

export interface CbaPage {
  id: string;
  pdfPageIndex: number;
  pdfPageNumber: number;
  printedPageLabel: string | null;
  paragraphs: CbaParagraph[];
}

export interface CbaStructureEntry {
  id: string;
  structuralType: CbaStructuralType;
  label: string;
  title: string;
  articleNumber: string | null;
  startPdfPage: number;
}

export interface CbaSourceCache {
  schema: typeof CBA_CACHE_SCHEMA;
  source: {
    id: typeof CBA_SOURCE_ID;
    title: typeof CBA_SOURCE_TITLE;
    owner: typeof CBA_SOURCE_OWNER;
    sourcePageUrl: typeof CBA_SOURCE_PAGE_URL;
    pdfUrl: typeof CBA_SOURCE_PDF_URL;
    finalUrl: typeof CBA_SOURCE_PDF_URL;
    sourceClass: typeof CBA_SOURCE_CLASS;
    documentStatus: typeof CBA_DOCUMENT_STATUS;
    sensitivity: typeof CBA_SOURCE_SENSITIVITY;
    accessMode: typeof CBA_SOURCE_ACCESS_MODE;
    effectiveStart: typeof CBA_EFFECTIVE_START;
    effectiveEnd: typeof CBA_EFFECTIVE_END;
    controllingForCoveredEmployees: typeof CBA_CONTROLLING_SCOPE;
    scopeRequiresFactMatch: typeof CBA_SCOPE_REQUIRES_FACT_MATCH;
    legalAdvice: typeof CBA_LEGAL_ADVICE;
    readOnly: true;
  };
  retrievedAt: string;
  response: {
    contentType: string;
    byteCount: number;
    sha256: string;
    redirectChain: string[];
  };
  extraction: {
    tool: "pdftotext";
    toolVersion: string;
    pdfinfoVersion: string;
    pageCount: typeof CBA_EXPECTED_PDF_PAGES;
    characterCount: number;
    nonEmptyPageCount: number;
    emptyPageCount: number;
    pageDelimiterCount: number;
    sha256: string;
  };
  normalized: {
    sha256: string;
    articleCount: number;
    sectionCount: number;
    paragraphCount: number;
    structureCount: number;
    structures: CbaStructureEntry[];
    pages: CbaPage[];
  };
}

export type CbaSourceUnavailableReason = "cache_missing" | "cache_invalid" | "cache_unsafe";
export type CbaSourceRouteResponse =
  | { status: "available"; source: CbaSourceCache }
  | { status: "unavailable"; reason: CbaSourceUnavailableReason };

export const cbaPilotQuestions = [
  "How many days do I have to file a grievance?",
  "What does Article 17 say about representation?",
  "What are the just-cause and discipline protections?",
  "Does the NLRB Weingarten page override the APWU-USPS CBA?",
  "Did management violate the contract in my specific case?",
] as const;

export function cbaParagraphAnchorId(paragraphId: string): string {
  return `cba-source-${paragraphId}`;
}

export function validateCbaSyncArguments(args: string[]): typeof CBA_SOURCE_ID {
  if (args.length !== 1 || args[0] !== CBA_SOURCE_ID) {
    throw new Error(`Exactly one approved source ID is accepted: ${CBA_SOURCE_ID}`);
  }
  return CBA_SOURCE_ID;
}

export function validateCbaRedirectTarget(currentUrl: string, location: string): URL {
  const target = new URL(location, currentUrl);
  const approvedHost = target.hostname === CBA_SOURCE_HOST || target.hostname.endsWith(`.${CBA_SOURCE_HOST}`);
  if (
    target.protocol !== "https:" ||
    !approvedHost ||
    target.port !== "" ||
    target.username !== "" ||
    target.password !== ""
  ) {
    throw new Error("CBA redirect target is outside the approved APWU HTTPS host.");
  }
  return target;
}

export function validateCbaFinalUrl(value: string): typeof CBA_SOURCE_PDF_URL {
  if (value !== CBA_SOURCE_PDF_URL) throw new Error("Final URL does not equal the exact approved CBA PDF URL.");
  return CBA_SOURCE_PDF_URL;
}

export function validateCbaContentType(value: string | null, bytes?: Uint8Array): string {
  const contentType = (value ?? "").trim().toLowerCase();
  const pdfType = /^application\/pdf(?:\s*;|$)/.test(contentType);
  let hasPdfMagic = false;
  if (bytes) {
    try {
      hasPdfMagic = validatePdfMagic(bytes);
    } catch {
      hasPdfMagic = false;
    }
  }
  if (!pdfType && !hasPdfMagic) throw new Error("Approved CBA response is neither application/pdf nor PDF-signature verified.");
  return contentType || "application/pdf; verified-by-signature";
}

export function validatePdfMagic(bytes: Uint8Array): true {
  if (bytes.length < 5 || String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("Approved CBA response does not have the required %PDF- magic header.");
  }
  return true;
}

export function validateCbaResponseByteCount(byteCount: number): number {
  if (!Number.isSafeInteger(byteCount) || byteCount < 1 || byteCount > CBA_MAX_RESPONSE_BYTES) {
    throw new Error(`Approved CBA response exceeds the ${CBA_MAX_RESPONSE_BYTES}-byte cap.`);
  }
  return byteCount;
}

export function validateCbaPageCount(pageCount: number): typeof CBA_EXPECTED_PDF_PAGES {
  if (pageCount !== CBA_EXPECTED_PDF_PAGES) {
    throw new Error(`Approved CBA must contain exactly ${CBA_EXPECTED_PDF_PAGES} PDF pages; received ${pageCount}.`);
  }
  return CBA_EXPECTED_PDF_PAGES;
}

export function validatePopplerToolAvailability(pdfinfoPath: string | null, pdftotextPath: string | null) {
  if (!pdfinfoPath || !pdftotextPath) {
    throw new Error("RESULT=WARN: required Poppler tools pdfinfo and pdftotext must already be available.");
  }
  return { pdfinfoPath, pdftotextPath };
}

function cleanLine(value: string): string {
  return value.split("\u0000").join("").replace(/\u00ad/g, "").replace(/[\t ]+/g, " ").trim();
}

function stableSlug(value: string): string {
  const result = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return result || "unknown";
}

function extractedPages(extractedText: string): string[] {
  const pages = extractedText.replace(/\r\n?/g, "\n").split("\f");
  if (pages.length > 0 && pages.at(-1)?.trim() === "") pages.pop();
  validateCbaPageCount(pages.length);
  return pages;
}

interface ArticleStart {
  articleNumber: number;
  pageIndex: number;
  lineIndex: number;
  title: string;
}

function articleCandidates(pages: string[]): Map<number, ArticleStart[]> {
  const candidates = new Map<number, ArticleStart[]>();
  pages.forEach((page, pageIndex) => {
    const lines = page.split("\n").map(cleanLine);
    lines.forEach((line, lineIndex) => {
      const match = /^ARTICLE\s+(\d{1,2})$/i.exec(line);
      if (!match) return;
      const articleNumber = Number.parseInt(match[1], 10);
      if (articleNumber < 1 || articleNumber > 43) return;
      const title = lines.slice(lineIndex + 1).find((candidate) => candidate && !/^\d+$/.test(candidate)) ?? `Article ${articleNumber}`;
      const entries = candidates.get(articleNumber) ?? [];
      entries.push({ articleNumber, pageIndex, lineIndex, title });
      candidates.set(articleNumber, entries);
    });
  });
  return candidates;
}

function choosePrimaryArticleStarts(pages: string[]): ArticleStart[] {
  const candidates = articleCandidates(pages);
  let best: ArticleStart[] = [];
  let bestSpan = -1;
  for (const start of candidates.get(1) ?? []) {
    if (start.pageIndex < 4) continue;
    const chain = [start];
    let previous = start;
    for (let articleNumber = 2; articleNumber <= 43; articleNumber += 1) {
      const next = (candidates.get(articleNumber) ?? []).find((candidate) => (
        candidate.pageIndex > previous.pageIndex ||
        (candidate.pageIndex === previous.pageIndex && candidate.lineIndex > previous.lineIndex)
      ));
      if (!next) break;
      chain.push(next);
      previous = next;
    }
    const span = chain.at(-1)!.pageIndex - chain[0].pageIndex;
    if (chain.length > best.length || (chain.length === best.length && span > bestSpan)) {
      best = chain;
      bestSpan = span;
    }
  }
  if (best.length !== 43 || bestSpan < 100) {
    throw new Error("Deterministic CBA parser did not identify the complete primary Article 1-43 sequence.");
  }
  return best;
}

function printedPageLabel(lines: string[]): string | null {
  const tail = lines.map(cleanLine).filter(Boolean).slice(-6);
  const numeric = tail.filter((line) => /^\d{1,3}$/.test(line));
  return numeric.length === 1 ? numeric[0] : null;
}

function paragraphBlocks(page: string): string[] {
  return page
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n+/)
    .map((block) => block.split("\n").map(cleanLine).filter(Boolean).join(" ").replace(/\s+/g, " ").trim())
    .flatMap((block) => block.split(/(?=\bSection\s+\d+(?:\.[A-Za-z0-9]+)?\.)|(?=\bStep\s+\d+\s*:)/i))
    .map((block) => block.trim())
    .filter(Boolean);
}

function boundedHeading(value: string, maximum: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maximum) return cleaned;
  const candidate = cleaned.slice(0, maximum + 1);
  const boundary = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, boundary > maximum / 2 ? boundary : maximum).trim()}…`;
}

function detectStructuralHeading(block: string): { type: CbaStructuralType; label: string; title: string } | null {
  const appendix = /^(APPENDIX\s+[^—:.-]+)[\s:—.-]*(.*)$/i.exec(block);
  if (appendix) return { type: "appendix", label: boundedHeading(appendix[1], 120), title: boundedHeading(appendix[2].trim() || appendix[1], 240) };
  const mou = /^(MEMORANDUM(?:S)? OF UNDERSTANDING|MEMORANDUM|MOU)\b[\s:—.-]*(.*)$/i.exec(block);
  if (mou) return { type: "memorandum_of_understanding", label: boundedHeading(mou[1], 120), title: boundedHeading(mou[2].trim() || mou[1], 240) };
  const loi = /^(LETTER(?:S)? OF INTENT)\b[\s:—.-]*(.*)$/i.exec(block);
  if (loi) return { type: "letter_of_intent", label: boundedHeading(loi[1], 120), title: boundedHeading(loi[2].trim() || loi[1], 240) };
  const attachment = /^(ATTACHMENT\s+[^—:.-]+)[\s:—.-]*(.*)$/i.exec(block);
  if (attachment) return { type: "attachment", label: boundedHeading(attachment[1], 120), title: boundedHeading(attachment[2].trim() || attachment[1], 240) };
  return null;
}

export function normalizedCbaContentForHash(pages: CbaPage[], structures: CbaStructureEntry[]): string {
  return JSON.stringify({
    structures,
    pages: pages.map((page) => ({
      id: page.id,
      pdfPageIndex: page.pdfPageIndex,
      pdfPageNumber: page.pdfPageNumber,
      printedPageLabel: page.printedPageLabel,
      paragraphs: page.paragraphs,
    })),
  });
}

export function normalizeExtractedCbaText(
  extractedText: string,
  sha256: (value: string) => string
): CbaSourceCache["normalized"] {
  const rawPages = extractedPages(extractedText);
  const articleStarts = choosePrimaryArticleStarts(rawPages);
  const articleByPage = new Map(articleStarts.map((entry) => [entry.pageIndex, entry]));
  const firstArticlePage = articleStarts[0].pageIndex;
  const lastArticlePage = articleStarts.at(-1)!.pageIndex;
  const structures: CbaStructureEntry[] = [];
  const preambleCandidates = rawPages
    .slice(Math.max(0, firstArticlePage - 12), firstArticlePage)
    .flatMap((page, offset) => page.split("\n").map(cleanLine).includes("PREAMBLE") ? [Math.max(0, firstArticlePage - 12) + offset] : []);
  const preamblePage = preambleCandidates.at(-1) ?? Math.max(0, firstArticlePage - 1);
  structures.push({ id: "cba-preamble", structuralType: "preamble", label: "Preamble", title: "Preamble", articleNumber: null, startPdfPage: preamblePage + 1 });
  for (const article of articleStarts) {
    structures.push({
      id: `cba-article-${article.articleNumber}`,
      structuralType: "article",
      label: `Article ${article.articleNumber}`,
      title: article.title,
      articleNumber: String(article.articleNumber),
      startPdfPage: article.pageIndex + 1,
    });
  }

  let structuralType: CbaStructuralType = "index_or_front_matter";
  let articleNumber: string | null = null;
  let articleTitle: string | null = null;
  let sectionNumber: string | null = null;
  let sectionTitle: string | null = null;
  let currentStructureKey = "";
  const normalizedPages: CbaPage[] = [];
  const sectionKeys = new Set<string>();

  rawPages.forEach((rawPage, pdfPageIndex) => {
    const pdfPageNumber = pdfPageIndex + 1;
    const articleStart = articleByPage.get(pdfPageIndex);
    if (articleStart) {
      structuralType = "article";
      articleNumber = String(articleStart.articleNumber);
      articleTitle = articleStart.title;
      sectionNumber = null;
      sectionTitle = null;
    } else if (pdfPageIndex === preamblePage) {
      structuralType = "preamble";
      articleNumber = null;
      articleTitle = "Preamble";
      sectionNumber = null;
      sectionTitle = null;
    } else if (pdfPageIndex < preamblePage) {
      structuralType = "index_or_front_matter";
      articleNumber = null;
      articleTitle = null;
    } else if (pdfPageIndex > lastArticlePage && structuralType === "article") {
      structuralType = "unknown";
      articleNumber = null;
      articleTitle = null;
      sectionNumber = null;
      sectionTitle = null;
    }

    const lines = rawPage.split("\n");
    const pagePrintedLabel = printedPageLabel(lines);
    const blocks = paragraphBlocks(rawPage);
    const paragraphs: CbaParagraph[] = [];
    blocks.forEach((block) => {
      if (pdfPageIndex > lastArticlePage) {
        const structuralHeading = detectStructuralHeading(block);
        if (structuralHeading) {
          structuralType = structuralHeading.type;
          articleNumber = null;
          articleTitle = structuralHeading.title;
          sectionNumber = null;
          sectionTitle = null;
          const structureKey = `${structuralHeading.type}:${structuralHeading.label}:${structuralHeading.title}`;
          if (structureKey !== currentStructureKey) {
            currentStructureKey = structureKey;
            structures.push({
              id: `cba-${structuralHeading.type}-${stableSlug(`${structuralHeading.label}-${structuralHeading.title}`)}-${pdfPageNumber}`,
              structuralType: structuralHeading.type,
              label: structuralHeading.label,
              title: structuralHeading.title,
              articleNumber: null,
              startPdfPage: pdfPageNumber,
            });
          }
        }
      }

      const sectionMatch = /^Section\s+(\d+(?:\.[A-Za-z0-9]+)?)\.?\s*(.{0,120}?)(?=\s+(?:Step\s+\d+|[A-Z]\.|\([a-z0-9]+\))|$)/i.exec(block);
      if (sectionMatch && structuralType === "article") {
        sectionNumber = sectionMatch[1];
        sectionTitle = sectionMatch[2].trim() || null;
        sectionKeys.add(`${articleNumber}:${sectionNumber}`);
      }
      const subsectionMatch = /\bStep\s+(\d+)\s*:?\s*(?:\(([a-z0-9]+)\))?|^\(([a-z0-9]+)\)/i.exec(block);
      const subsection = subsectionMatch
        ? subsectionMatch[1]
          ? `Step ${subsectionMatch[1]}${subsectionMatch[2] ? `(${subsectionMatch[2]})` : ""}`
          : `(${subsectionMatch[3]})`
        : null;
      const paragraphNumber = paragraphs.length + 1;
      const id = `cba-pdf-p${String(pdfPageNumber).padStart(3, "0")}-p${String(paragraphNumber).padStart(2, "0")}`;
      paragraphs.push({
        id,
        text: block,
        contentHash: sha256(block),
        pdfPageIndex,
        pdfPageNumber,
        printedPageLabel: pagePrintedLabel,
        structuralType,
        articleNumber,
        articleTitle,
        sectionNumber,
        sectionTitle,
        subsection,
      });
    });
    normalizedPages.push({
      id: `cba-pdf-p${String(pdfPageNumber).padStart(3, "0")}`,
      pdfPageIndex,
      pdfPageNumber,
      printedPageLabel: pagePrintedLabel,
      paragraphs,
    });
  });

  const paragraphCount = normalizedPages.reduce((total, page) => total + page.paragraphs.length, 0);
  if (paragraphCount < 500) throw new Error("Deterministic CBA normalization produced too few paragraphs.");
  const normalizedWithoutHash = {
    articleCount: articleStarts.length,
    sectionCount: sectionKeys.size,
    paragraphCount,
    structureCount: structures.length,
    structures,
    pages: normalizedPages,
  };
  return {
    sha256: sha256(normalizedCbaContentForHash(normalizedPages, structures)),
    ...normalizedWithoutHash,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  return Object.keys(value).sort().join("|") === [...expected].sort().join("|");
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

const cbaStructuralTypes = new Set<CbaStructuralType>([
  "preamble",
  "article",
  "appendix",
  "memorandum_of_understanding",
  "letter_of_intent",
  "attachment",
  "index_or_front_matter",
  "unknown",
]);

function isNullableBoundedString(value: unknown, maximum = 240): boolean {
  return value === null || (typeof value === "string" && value.length > 0 && value.length <= maximum);
}

export function validateCbaSourceCache(
  input: unknown,
  sha256: (value: string) => string,
  pdfSha256: string
): { ok: true; cache: CbaSourceCache } | { ok: false; reason: "cache_invalid" } {
  if (!isRecord(input) || !exactKeys(input, ["schema", "source", "retrievedAt", "response", "extraction", "normalized"])) return { ok: false, reason: "cache_invalid" };
  if (input.schema !== CBA_CACHE_SCHEMA || !isRecord(input.source) || !isRecord(input.response) || !isRecord(input.extraction) || !isRecord(input.normalized)) return { ok: false, reason: "cache_invalid" };
  const expectedSourceKeys = [
    "id", "title", "owner", "sourcePageUrl", "pdfUrl", "finalUrl", "sourceClass", "documentStatus", "sensitivity", "accessMode",
    "effectiveStart", "effectiveEnd", "controllingForCoveredEmployees", "scopeRequiresFactMatch", "legalAdvice", "readOnly",
  ];
  if (
    !exactKeys(input.source, expectedSourceKeys) ||
    input.source.id !== CBA_SOURCE_ID || input.source.title !== CBA_SOURCE_TITLE || input.source.owner !== CBA_SOURCE_OWNER ||
    input.source.sourcePageUrl !== CBA_SOURCE_PAGE_URL || input.source.pdfUrl !== CBA_SOURCE_PDF_URL || input.source.finalUrl !== CBA_SOURCE_PDF_URL ||
    input.source.sourceClass !== CBA_SOURCE_CLASS || input.source.documentStatus !== CBA_DOCUMENT_STATUS ||
    input.source.sensitivity !== CBA_SOURCE_SENSITIVITY || input.source.accessMode !== CBA_SOURCE_ACCESS_MODE ||
    input.source.effectiveStart !== CBA_EFFECTIVE_START || input.source.effectiveEnd !== CBA_EFFECTIVE_END ||
    input.source.controllingForCoveredEmployees !== CBA_CONTROLLING_SCOPE || input.source.scopeRequiresFactMatch !== CBA_SCOPE_REQUIRES_FACT_MATCH ||
    input.source.legalAdvice !== CBA_LEGAL_ADVICE || input.source.readOnly !== true
  ) return { ok: false, reason: "cache_invalid" };
  if (
    typeof input.retrievedAt !== "string" || !Number.isFinite(Date.parse(input.retrievedAt)) ||
    !exactKeys(input.response, ["contentType", "byteCount", "sha256", "redirectChain"]) ||
    typeof input.response.contentType !== "string" || typeof input.response.byteCount !== "number" ||
    input.response.byteCount < 1 || input.response.byteCount > CBA_MAX_RESPONSE_BYTES ||
    !/^application\/pdf(?:\s*;|$)|^application\/octet-stream(?:\s*;|$)|^application\/pdf; verified-by-signature$/i.test(input.response.contentType) ||
    !isSha256(input.response.sha256) || input.response.sha256 !== pdfSha256 || !Array.isArray(input.response.redirectChain) ||
    input.response.redirectChain.length < 1 || input.response.redirectChain.length > 4 || input.response.redirectChain.at(-1) !== CBA_SOURCE_PDF_URL ||
    input.response.redirectChain.some((url) => typeof url !== "string" || !(url === CBA_SOURCE_PDF_URL || url.startsWith("https://apwu.org/") || url.startsWith("https://www.apwu.org/"))) ||
    !exactKeys(input.extraction, ["tool", "toolVersion", "pdfinfoVersion", "pageCount", "characterCount", "nonEmptyPageCount", "emptyPageCount", "pageDelimiterCount", "sha256"]) ||
    input.extraction.tool !== "pdftotext" || typeof input.extraction.toolVersion !== "string" || typeof input.extraction.pdfinfoVersion !== "string" ||
    input.extraction.pageCount !== CBA_EXPECTED_PDF_PAGES || !isSafeInteger(input.extraction.characterCount) || input.extraction.characterCount < 1 ||
    !isSafeInteger(input.extraction.nonEmptyPageCount) || !isSafeInteger(input.extraction.emptyPageCount) ||
    input.extraction.nonEmptyPageCount + input.extraction.emptyPageCount !== CBA_EXPECTED_PDF_PAGES ||
    input.extraction.pageDelimiterCount !== CBA_EXPECTED_PDF_PAGES || !isSha256(input.extraction.sha256) ||
    !exactKeys(input.normalized, ["sha256", "articleCount", "sectionCount", "paragraphCount", "structureCount", "structures", "pages"]) ||
    !isSha256(input.normalized.sha256) || input.normalized.articleCount !== 43 || !isSafeInteger(input.normalized.sectionCount) || input.normalized.sectionCount < 1 ||
    !isSafeInteger(input.normalized.paragraphCount) || input.normalized.paragraphCount < 500 || !isSafeInteger(input.normalized.structureCount) || input.normalized.structureCount < 44 ||
    !Array.isArray(input.normalized.structures) || !Array.isArray(input.normalized.pages) || input.normalized.pages.length !== CBA_EXPECTED_PDF_PAGES
  ) return { ok: false, reason: "cache_invalid" };

  const articleStructures = new Set<string>();
  const structureIds = new Set<string>();
  for (const structure of input.normalized.structures) {
    if (!isRecord(structure) || !exactKeys(structure, ["id", "structuralType", "label", "title", "articleNumber", "startPdfPage"]) ||
      typeof structure.id !== "string" || !/^cba-[a-z0-9_-]+$/.test(structure.id) || structureIds.has(structure.id) ||
      typeof structure.structuralType !== "string" || !cbaStructuralTypes.has(structure.structuralType as CbaStructuralType) ||
      typeof structure.label !== "string" || structure.label.length < 1 || structure.label.length > 240 ||
      typeof structure.title !== "string" || structure.title.length < 1 || structure.title.length > 500 ||
      !isNullableBoundedString(structure.articleNumber, 2) || !isSafeInteger(structure.startPdfPage) ||
      structure.startPdfPage < 1 || structure.startPdfPage > CBA_EXPECTED_PDF_PAGES) {
      return { ok: false, reason: "cache_invalid" };
    }
    structureIds.add(structure.id);
    if (structure.structuralType === "article") {
      if (typeof structure.articleNumber !== "string" || !/^(?:[1-9]|[1-3][0-9]|4[0-3])$/.test(structure.articleNumber)) return { ok: false, reason: "cache_invalid" };
      articleStructures.add(structure.articleNumber);
    } else if (structure.articleNumber !== null) return { ok: false, reason: "cache_invalid" };
  }
  if (articleStructures.size !== 43) return { ok: false, reason: "cache_invalid" };

  let paragraphCount = 0;
  for (let pageIndex = 0; pageIndex < input.normalized.pages.length; pageIndex += 1) {
    const page = input.normalized.pages[pageIndex];
    if (!isRecord(page) || !exactKeys(page, ["id", "pdfPageIndex", "pdfPageNumber", "printedPageLabel", "paragraphs"]) ||
      page.id !== `cba-pdf-p${String(pageIndex + 1).padStart(3, "0")}` || page.pdfPageIndex !== pageIndex || page.pdfPageNumber !== pageIndex + 1 ||
      !(page.printedPageLabel === null || (typeof page.printedPageLabel === "string" && /^\d{1,3}$/.test(page.printedPageLabel))) || !Array.isArray(page.paragraphs)) {
      return { ok: false, reason: "cache_invalid" };
    }
    for (let paragraphIndex = 0; paragraphIndex < page.paragraphs.length; paragraphIndex += 1) {
      const paragraph = page.paragraphs[paragraphIndex];
      if (!isRecord(paragraph) || !exactKeys(paragraph, ["id", "text", "contentHash", "pdfPageIndex", "pdfPageNumber", "printedPageLabel", "structuralType", "articleNumber", "articleTitle", "sectionNumber", "sectionTitle", "subsection"]) ||
        paragraph.id !== `${page.id}-p${String(paragraphIndex + 1).padStart(2, "0")}` || typeof paragraph.text !== "string" || paragraph.text.length < 1 || paragraph.text.length > 30_000 ||
        !isSha256(paragraph.contentHash) || sha256(paragraph.text) !== paragraph.contentHash || paragraph.pdfPageIndex !== pageIndex || paragraph.pdfPageNumber !== pageIndex + 1 ||
        paragraph.printedPageLabel !== page.printedPageLabel || typeof paragraph.structuralType !== "string" || !cbaStructuralTypes.has(paragraph.structuralType as CbaStructuralType) ||
        !isNullableBoundedString(paragraph.articleNumber, 2) || !isNullableBoundedString(paragraph.articleTitle, 500) ||
        (paragraph.articleNumber !== null && !/^(?:[1-9]|[1-3][0-9]|4[0-3])$/.test(paragraph.articleNumber as string)) ||
        !isNullableBoundedString(paragraph.sectionNumber, 40) || !isNullableBoundedString(paragraph.sectionTitle, 240) || !isNullableBoundedString(paragraph.subsection, 80)) {
        return { ok: false, reason: "cache_invalid" };
      }
      paragraphCount += 1;
    }
  }
  if (paragraphCount !== input.normalized.paragraphCount || input.normalized.structureCount !== input.normalized.structures.length) return { ok: false, reason: "cache_invalid" };
  const cache = input as unknown as CbaSourceCache;
  if (sha256(normalizedCbaContentForHash(cache.normalized.pages, cache.normalized.structures)) !== cache.normalized.sha256) return { ok: false, reason: "cache_invalid" };
  return { ok: true, cache };
}

const searchStopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "do", "does", "for", "from", "have", "how", "i", "in", "is", "it", "many", "my", "of", "on", "or", "say", "the", "to", "what", "with",
]);

const routingOnlySearchTerms = new Set([
  "agreement", "apwu", "article", "bargaining", "cba", "collective", "contract", "postal", "say", "source", "union", "usps",
]);

const highFrequencySearchTerms = new Set([
  "employee", "employer", "management", "service", "work", "working", "unit",
]);

const supportedTopicTerms = new Set([
  "annual", "break", "deadline", "discipline", "evidence", "grievance", "leave", "lunch", "overtime", "represent", "representation", "steward", "supervisor",
]);

function searchTokens(value: string): string[] {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function normalizeSearchToken(token: string): string {
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("s") && token.length > 3 && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function meaningfulQueryTokens(value: string): string[] {
  return [...new Set(searchTokens(value)
    .map(normalizeSearchToken)
    .filter((token) => !searchStopWords.has(token) && !routingOnlySearchTerms.has(token) && !highFrequencySearchTerms.has(token)))];
}

function normalizedTokenSet(value: string): Set<string> {
  return new Set(searchTokens(value).map(normalizeSearchToken));
}

export interface CbaSearchResult {
  paragraph: CbaParagraph;
  score: number;
  relevance: string[];
  excerpt: string;
}

export function searchCba(source: CbaSourceCache, query: string, limit = 8): CbaSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalizedQuery) return [];
  const phrases = [...query.matchAll(/"([^"]+)"/g)]
    .map((match) => match[1].toLowerCase().trim())
    .filter((phrase) => phrase && meaningfulQueryTokens(phrase).length > 0);
  const tokens = meaningfulQueryTokens(query);
  const articleReference = /\barticle\s+(\d{1,2})\b/i.exec(query)?.[1] ?? null;
  const sectionReference = /\bsection\s+(\d+(?:\.[a-z0-9]+)?)\b/i.exec(query)?.[1] ?? null;
  const results: CbaSearchResult[] = [];
  for (const paragraph of source.normalized.pages.flatMap((page) => page.paragraphs)) {
    const text = paragraph.text.toLowerCase();
    const title = (paragraph.articleTitle ?? "").toLowerCase();
    const section = (paragraph.sectionTitle ?? "").toLowerCase();
    const textTokens = normalizedTokenSet(text);
    const titleTokens = normalizedTokenSet(title);
    const sectionTokens = normalizedTokenSet(section);
    let score = 0;
    const relevance: string[] = [];
    let locatorMatched = false;
    let phraseMatched = false;
    let supportedTopicMatched = false;
    const uncommonMatches = new Set<string>();
    if (articleReference && paragraph.articleNumber === articleReference) {
      score += 240;
      relevance.push(`exact Article ${articleReference}`);
      locatorMatched = true;
    }
    if (sectionReference && paragraph.sectionNumber === sectionReference) {
      score += 180;
      relevance.push(`exact Section ${sectionReference}`);
      locatorMatched = true;
    }
    for (const phrase of phrases) {
      if (text.includes(phrase)) {
        score += 180;
        relevance.push(`quoted phrase: ${phrase}`);
        phraseMatched = true;
      }
    }
    for (const token of tokens) {
      const textMatch = textTokens.has(token);
      const titleMatch = titleTokens.has(token);
      const sectionMatch = sectionTokens.has(token);
      if (textMatch || titleMatch || sectionMatch) {
        const supportedTopic = supportedTopicTerms.has(token);
        score += supportedTopic ? 90 : 30;
        if (titleMatch) score += supportedTopic ? 70 : 30;
        if (sectionMatch) score += supportedTopic ? 45 : 20;
        relevance.push(`exact term: ${token}`);
        if (supportedTopic) supportedTopicMatched = true;
        else uncommonMatches.add(token);
      }
    }
    const uncommonTokens = tokens.filter((token) => !supportedTopicTerms.has(token));
    const uncommonCoverage = uncommonTokens.length === 0 ? 0 : uncommonMatches.size / uncommonTokens.length;
    const enoughUncommonEvidence = uncommonMatches.size >= 2 && uncommonCoverage >= 0.5;
    if (!locatorMatched && !phraseMatched && !supportedTopicMatched && !enoughUncommonEvidence) continue;
    const excerpt = paragraph.text.length > 320 ? `${paragraph.text.slice(0, 317)}…` : paragraph.text;
    results.push({ paragraph, score, relevance: [...new Set(relevance)].slice(0, 5), excerpt });
  }
  return results
    .sort((left, right) => right.score - left.score || left.paragraph.pdfPageNumber - right.paragraph.pdfPageNumber || left.paragraph.id.localeCompare(right.paragraph.id))
    .slice(0, Math.max(1, Math.min(limit, 20)));
}
