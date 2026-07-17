export const PUBLIC_SOURCE_ID = "nlrb-weingarten-rights" as const;
export const PUBLIC_SOURCE_URL =
  "https://www.nlrb.gov/about-nlrb/rights-we-protect/your-rights/weingarten-rights" as const;
export const PUBLIC_SOURCE_HOST = "www.nlrb.gov" as const;
export const PUBLIC_SOURCE_TITLE = "Weingarten Rights" as const;
export const PUBLIC_SOURCE_OWNER = "National Labor Relations Board" as const;
export const PUBLIC_SOURCE_CLASS = "official_guidance" as const;
export const PUBLIC_SOURCE_SENSITIVITY = "public_non_sensitive" as const;
export const PUBLIC_SOURCE_ACCESS_MODE = "exact_allowlisted_read_only" as const;
export const PUBLIC_SOURCE_POSTAL_APPLICABILITY = "unverified" as const;
export const PUBLIC_SOURCE_CONTROLLING_FOR_USPS = "no" as const;
export const PUBLIC_SOURCE_CACHE_SCHEMA = "kia-public-source-cache.v1" as const;
export const PUBLIC_SOURCE_CACHE_RELATIVE_PATH = ".kia-public-data/nlrb-weingarten-rights.json" as const;
export const PUBLIC_SOURCE_PROVIDER = "local-public-static-deterministic" as const;
export const PUBLIC_SOURCE_PROMPT_VERSION = "prompt.public-docs.v0.1-citation-first" as const;
export const PUBLIC_SOURCE_APPLICABILITY_WARNING =
  "Official general NLRB guidance; USPS-specific controlling applicability is not established by this source." as const;
export const PUBLIC_SOURCE_MAX_RESPONSE_BYTES = 1_000_000;
export const PUBLIC_SOURCE_TIMEOUT_MS = 15_000;

export interface PublicSourceParagraph {
  id: string;
  text: string;
}

export interface PublicSourceSection {
  id: string;
  title: string;
  paragraphs: PublicSourceParagraph[];
}

export interface PublicSourceCache {
  schema: typeof PUBLIC_SOURCE_CACHE_SCHEMA;
  source: {
    id: typeof PUBLIC_SOURCE_ID;
    title: typeof PUBLIC_SOURCE_TITLE;
    owner: typeof PUBLIC_SOURCE_OWNER;
    url: typeof PUBLIC_SOURCE_URL;
    finalUrl: typeof PUBLIC_SOURCE_URL;
    sourceClass: typeof PUBLIC_SOURCE_CLASS;
    sensitivity: typeof PUBLIC_SOURCE_SENSITIVITY;
    accessMode: typeof PUBLIC_SOURCE_ACCESS_MODE;
    postalApplicability: typeof PUBLIC_SOURCE_POSTAL_APPLICABILITY;
    controllingForUsps: typeof PUBLIC_SOURCE_CONTROLLING_FOR_USPS;
    readOnly: true;
  };
  retrievedAt: string;
  response: {
    contentType: string;
    byteCount: number;
    sha256: string;
  };
  normalized: {
    sha256: string;
    sectionCount: number;
    sections: PublicSourceSection[];
  };
}

export type PublicSourceUnavailableReason =
  | "cache_missing"
  | "cache_invalid"
  | "cache_unsafe"
  | "route_query_rejected";

export type PublicSourceRouteResponse =
  | { status: "available"; source: PublicSourceCache }
  | { status: "unavailable"; reason: PublicSourceUnavailableReason };

export const publicPilotQuestions = [
  "When may a represented employee request a union representative during an investigatory interview?",
  "What role may the representative play?",
  "Does this source by itself establish the controlling rule for USPS employees?",
] as const;

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return namedEntities[entity.toLowerCase()] ?? match;
  });
}

function cleanText(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/[\u00a0\s]+/g, " ")
    .trim();
}

function slug(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return normalized || "section";
}

function extractBalancedElement(html: string, start: number, tagName: string): string {
  const startEnd = html.indexOf(">", start);
  if (startEnd === -1) throw new Error("Approved article body start tag is malformed.");
  const token = new RegExp(`<\\/?${tagName}\\b[^>]*>`, "gi");
  token.lastIndex = startEnd + 1;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = token.exec(html))) {
    if (match[0].startsWith("</")) depth -= 1;
    else if (!match[0].endsWith("/>")) depth += 1;
    if (depth === 0) return html.slice(startEnd + 1, match.index);
  }
  throw new Error("Approved article body does not have a balanced closing tag.");
}

function extractApprovedArticleBody(html: string): string {
  const fields = /<(div|article|section)\b[^>]*class=(['"])[^'"]*\bfield--name-body\b[^'"]*\2[^>]*>/gi;
  const candidates: string[] = [];
  let field: RegExpExecArray | null;
  while ((field = fields.exec(html))) {
    const body = extractBalancedElement(html, field.index, field[1]);
    const text = cleanText(body);
    if (
      text.includes("When do employees have a right to request a union representative?") &&
      text.includes("What may a union representative do during an employee interview?") &&
      text.includes("What are the limitations")
    ) candidates.push(body);
  }
  if (candidates.length !== 1) throw new Error("Approved NLRB main article body was not uniquely identified.");
  return candidates[0];
}

function isStrongOnlyParagraph(innerHtml: string): boolean {
  const trimmed = innerHtml.trim();
  return /^<(?:strong|b)\b[^>]*>[\s\S]*<\/(?:strong|b)>(?:\s|&nbsp;)*$/i.test(trimmed);
}

export function normalizeApprovedArticleHtml(html: string): PublicSourceSection[] {
  if (typeof html !== "string" || html.length === 0) throw new Error("Source response is empty.");
  const article = extractApprovedArticleBody(html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|iframe|form)\b[\s\S]*?<\/\1>/gi, " ");
  const blocks = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const sections: PublicSourceSection[] = [];
  let currentTitle = "Overview";
  let currentParagraphs: string[] = [];

  function flushSection() {
    if (currentParagraphs.length === 0) return;
    const sectionNumber = sections.length + 1;
    const id = `section-${String(sectionNumber).padStart(2, "0")}-${slug(currentTitle)}`;
    sections.push({
      id,
      title: currentTitle,
      paragraphs: currentParagraphs.map((text, index) => ({
        id: `${id}-p${String(index + 1).padStart(2, "0")}`,
        text,
      })),
    });
    currentParagraphs = [];
  }

  let match: RegExpExecArray | null;
  while ((match = blocks.exec(article))) {
    const tag = match[1].toLowerCase();
    const text = cleanText(match[2]);
    if (!text) continue;
    const headingLike = tag.startsWith("h") || (tag === "p" && isStrongOnlyParagraph(match[2]) && text.length <= 180);
    if (headingLike) {
      if (/^content in other languages$/i.test(text)) break;
      flushSection();
      currentTitle = text;
      continue;
    }
    currentParagraphs.push(text);
  }
  flushSection();

  if (sections.length === 0 || sections.every((section) => section.paragraphs.length === 0)) {
    throw new Error("Approved NLRB article normalization produced no paragraphs.");
  }
  return sections;
}

export function normalizedContentForHash(sections: PublicSourceSection[]): string {
  return JSON.stringify(
    sections.map((section) => ({
      id: section.id,
      title: section.title,
      paragraphs: section.paragraphs.map((paragraph) => ({ id: paragraph.id, text: paragraph.text })),
    }))
  );
}

export function validateSyncArguments(args: string[]): typeof PUBLIC_SOURCE_ID {
  if (args.length !== 1 || args[0] !== PUBLIC_SOURCE_ID) {
    throw new Error(`Exactly one source ID is accepted: ${PUBLIC_SOURCE_ID}`);
  }
  return PUBLIC_SOURCE_ID;
}

export function validateRedirectTarget(currentUrl: string, location: string): URL {
  const target = new URL(location, currentUrl);
  if (
    target.protocol !== "https:" ||
    target.hostname !== PUBLIC_SOURCE_HOST ||
    target.port !== "" ||
    target.username !== "" ||
    target.password !== ""
  ) {
    throw new Error("Redirect target is outside the approved HTTPS host.");
  }
  return target;
}

export function validateApprovedFinalUrl(value: string): typeof PUBLIC_SOURCE_URL {
  if (value !== PUBLIC_SOURCE_URL) throw new Error("Final URL does not equal the exact approved source URL.");
  return PUBLIC_SOURCE_URL;
}

export function validateHtmlContentType(value: string | null): string {
  const contentType = (value ?? "").trim().toLowerCase();
  if (!/^text\/html(?:\s*;|$)/.test(contentType)) throw new Error("Approved source response is not text/html.");
  return contentType;
}

export function validateResponseByteCount(byteCount: number): number {
  if (!Number.isSafeInteger(byteCount) || byteCount < 1 || byteCount > PUBLIC_SOURCE_MAX_RESPONSE_BYTES) {
    throw new Error(`Approved source response exceeds the ${PUBLIC_SOURCE_MAX_RESPONSE_BYTES}-byte cap.`);
  }
  return byteCount;
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

export function validatePublicSourceCache(
  input: unknown,
  sha256: (value: string) => string
): { ok: true; cache: PublicSourceCache } | { ok: false; reason: "cache_invalid" } {
  if (!isRecord(input) || !exactKeys(input, ["schema", "source", "retrievedAt", "response", "normalized"])) {
    return { ok: false, reason: "cache_invalid" };
  }
  if (input.schema !== PUBLIC_SOURCE_CACHE_SCHEMA || !isRecord(input.source) || !isRecord(input.response) || !isRecord(input.normalized)) {
    return { ok: false, reason: "cache_invalid" };
  }
  if (
    !exactKeys(input.source, [
      "id", "title", "owner", "url", "finalUrl", "sourceClass", "sensitivity", "accessMode",
      "postalApplicability", "controllingForUsps", "readOnly",
    ]) ||
    input.source.id !== PUBLIC_SOURCE_ID ||
    input.source.title !== PUBLIC_SOURCE_TITLE ||
    input.source.owner !== PUBLIC_SOURCE_OWNER ||
    input.source.url !== PUBLIC_SOURCE_URL ||
    input.source.finalUrl !== PUBLIC_SOURCE_URL ||
    input.source.sourceClass !== PUBLIC_SOURCE_CLASS ||
    input.source.sensitivity !== PUBLIC_SOURCE_SENSITIVITY ||
    input.source.accessMode !== PUBLIC_SOURCE_ACCESS_MODE ||
    input.source.postalApplicability !== PUBLIC_SOURCE_POSTAL_APPLICABILITY ||
    input.source.controllingForUsps !== PUBLIC_SOURCE_CONTROLLING_FOR_USPS ||
    input.source.readOnly !== true
  ) {
    return { ok: false, reason: "cache_invalid" };
  }
  if (
    typeof input.retrievedAt !== "string" ||
    !Number.isFinite(Date.parse(input.retrievedAt)) ||
    !exactKeys(input.response, ["contentType", "byteCount", "sha256"]) ||
    typeof input.response.contentType !== "string" ||
    !/^text\/html(?:\s*;|$)/.test(input.response.contentType) ||
    typeof input.response.byteCount !== "number" ||
    !Number.isSafeInteger(input.response.byteCount) ||
    input.response.byteCount < 1 ||
    input.response.byteCount > PUBLIC_SOURCE_MAX_RESPONSE_BYTES ||
    !isSha256(input.response.sha256) ||
    !exactKeys(input.normalized, ["sha256", "sectionCount", "sections"]) ||
    !isSha256(input.normalized.sha256) ||
    !Array.isArray(input.normalized.sections) ||
    input.normalized.sectionCount !== input.normalized.sections.length ||
    input.normalized.sections.length < 1 ||
    input.normalized.sections.length > 30
  ) {
    return { ok: false, reason: "cache_invalid" };
  }

  const seenSectionIds = new Set<string>();
  const seenParagraphIds = new Set<string>();
  let totalCharacters = 0;
  for (const section of input.normalized.sections) {
    if (!isRecord(section) || !exactKeys(section, ["id", "title", "paragraphs"])) return { ok: false, reason: "cache_invalid" };
    if (
      typeof section.id !== "string" ||
      !/^section-\d{2}-[a-z0-9-]+$/.test(section.id) ||
      seenSectionIds.has(section.id) ||
      typeof section.title !== "string" ||
      section.title.length < 1 ||
      section.title.length > 240 ||
      !Array.isArray(section.paragraphs) ||
      section.paragraphs.length < 1 ||
      section.paragraphs.length > 80
    ) return { ok: false, reason: "cache_invalid" };
    seenSectionIds.add(section.id);
    for (const paragraph of section.paragraphs) {
      if (!isRecord(paragraph) || !exactKeys(paragraph, ["id", "text"])) return { ok: false, reason: "cache_invalid" };
      if (
        typeof paragraph.id !== "string" ||
        !new RegExp(`^${section.id}-p\\d{2}$`).test(paragraph.id) ||
        seenParagraphIds.has(paragraph.id) ||
        typeof paragraph.text !== "string" ||
        paragraph.text.length < 1 ||
        paragraph.text.length > 12_000
      ) return { ok: false, reason: "cache_invalid" };
      seenParagraphIds.add(paragraph.id);
      totalCharacters += paragraph.text.length;
    }
  }
  if (totalCharacters > 500_000) return { ok: false, reason: "cache_invalid" };

  const sections = input.normalized.sections as unknown as PublicSourceSection[];
  if (sha256(normalizedContentForHash(sections)) !== input.normalized.sha256) return { ok: false, reason: "cache_invalid" };
  return { ok: true, cache: input as unknown as PublicSourceCache };
}
