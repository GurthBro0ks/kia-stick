import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { JCIM_SOURCE_ID, JCIM_LANDING_URL, JCIM_PDF_URL, JCIM_SHA256, JCIM_NORMALIZED_SHA256, JCIM_BYTES, JCIM_LAST_MODIFIED, JCIM_EDITION, JCIM_TITLE, JCIM_AUTHORITY_CLASS, JCIM_AUTHORITY_LABEL, JCIM_SECTION_IDS, type JcimCache } from "@/lib/jcimSource";

export type JcimState = { status: "available"; source: JcimCache } |
  { status: "unavailable"; reason: "cache_missing" | "cache_unsafe" | "drift_detected" | "unverified_current" };

const pageRanges: Record<string, [number, number]> = {
  preface: [3, 3], introduction: [29, 29], "article-8": [51, 67], "article-10": [71, 92], "article-11": [93, 98],
  "article-14": [134, 138], "article-15": [139, 149], "article-16": [150, 157], "article-17": [158, 167],
  "article-19": [169, 169], "article-25": [177, 178], "article-26": [179, 181], "article-27": [182, 183],
};
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

/** Production PDF pins. Always used by readJcimCache / default validate and live verify. */
export type JcimPdfIdentityPins = {
  readonly sha256: string;
  readonly byteCount: number;
};

export const JCIM_PDF_IDENTITY_PINS: JcimPdfIdentityPins = {
  sha256: JCIM_SHA256,
  byteCount: JCIM_BYTES,
};

/**
 * Pure PDF identity guard shared by validate + live paths.
 * Both length and sha256 are always required; incomplete pins fail closed.
 * Tests may pass alternate pins to isolate M1–M3 without mocks; production
 * callers must use JCIM_PDF_IDENTITY_PINS (the function defaults).
 */
export function matchesJcimPdfIdentity(pdf: Uint8Array, expected: JcimPdfIdentityPins = JCIM_PDF_IDENTITY_PINS): boolean {
  if (!expected || typeof expected.sha256 !== "string" || expected.sha256.length === 0) return false;
  if (typeof expected.byteCount !== "number" || !Number.isInteger(expected.byteCount) || expected.byteCount < 0) return false;
  // LENGTH guard (M2 / M3): evaluated independently of hash so it can be isolated.
  if (pdf.length !== expected.byteCount) return false;
  // HASH guard (M1 / M4): always required; there is no skip/omit path.
  if (hash(pdf) !== expected.sha256) return false;
  return true;
}

export function validateJcimCache(
  value: unknown,
  pdf: Uint8Array,
  expectedPdf: JcimPdfIdentityPins = JCIM_PDF_IDENTITY_PINS,
): value is JcimCache {
  if (!value || typeof value !== "object" || !matchesJcimPdfIdentity(pdf, expectedPdf)) return false;
  const cache = value as JcimCache;
  if (cache.schema !== "kia-jcim-cache.v1" || cache.source?.id !== JCIM_SOURCE_ID ||
    cache.source.title !== JCIM_TITLE || cache.source.authorityClass !== JCIM_AUTHORITY_CLASS ||
    cache.source.authorityLabel !== JCIM_AUTHORITY_LABEL || cache.source.landingUrl !== JCIM_LANDING_URL ||
    cache.source.pdfUrl !== JCIM_PDF_URL || cache.source.edition !== JCIM_EDITION || cache.source.readOnly !== true ||
    cache.response?.sha256 !== JCIM_SHA256 || cache.response.byteCount !== JCIM_BYTES ||
    cache.response.lastModified !== JCIM_LAST_MODIFIED || cache.normalized?.sectionCount !== 13 ||
    !Array.isArray(cache.normalized.sections) || cache.normalized.sections.length !== 13 ||
    cache.normalized.sha256 !== JCIM_NORMALIZED_SHA256) return false;
  if (cache.normalized.sections.some((section, i) => section.id !== JCIM_SECTION_IDS[i] ||
    !Array.isArray(section.paragraphs) || section.paragraphs.length === 0 ||
    section.paragraphs.some((paragraph) => {
      const [first, last] = pageRanges[section.id];
      return !paragraph.id.startsWith(`${section.id}-pdf`) || !paragraph.text?.trim() ||
        paragraph.pdfPageNumber < first || paragraph.pdfPageNumber > last ||
        paragraph.articleNumber !== (section.id.startsWith("article-") ? section.id.slice(8) : null);
    }))) return false;
  return hash(stableJson(cache.normalized.sections)) === cache.normalized.sha256;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function readJcimCache(): JcimState {
  const directory = path.join(process.cwd(), ".kia-public-data");
  const pdfPath = path.join(directory, `${JCIM_SOURCE_ID}.pdf`);
  const jsonPath = path.join(directory, `${JCIM_SOURCE_ID}.json`);
  try {
    const uid = process.getuid?.();
    const directoryStat = lstatSync(directory);
    if (realpathSync(directory) !== directory || !directoryStat.isDirectory() || directoryStat.isSymbolicLink() ||
      (directoryStat.mode & 0o777) !== 0o700 || (uid !== undefined && directoryStat.uid !== uid))
      return { status: "unavailable", reason: "cache_unsafe" };
    for (const target of [pdfPath, jsonPath]) {
      const stat = lstatSync(target);
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o777) !== 0o600 || realpathSync(target) !== target ||
        stat.size > 20_000_000 || (uid !== undefined && stat.uid !== uid))
        return { status: "unavailable", reason: "cache_unsafe" };
    }
    const parsed: unknown = JSON.parse(readFileSync(jsonPath, "utf8"));
    return validateJcimCache(parsed, readFileSync(pdfPath))
      ? { status: "available", source: parsed } : { status: "unavailable", reason: "drift_detected" };
  } catch (error) {
    return { status: "unavailable", reason: (error as NodeJS.ErrnoException).code === "ENOENT" ? "cache_missing" : "cache_unsafe" };
  }
}

export async function verifyJcimLiveIdentity(
  fetcher: typeof fetch = fetch,
  expectedPdf: JcimPdfIdentityPins = JCIM_PDF_IDENTITY_PINS,
): Promise<boolean> {
  try {
    const landing = await fetcher(JCIM_LANDING_URL, { cache: "no-store" });
    if (!landing.ok || landing.url !== JCIM_LANDING_URL) return false;
    const links = [...(await landing.text()).matchAll(/(?:href|src)="(https:\/\/apwu\.org\/[^"]+\.pdf)"/g)].map((match) => match[1]);
    if (links.length === 0 || links.some((link) => link !== JCIM_PDF_URL)) return false;
    const response = await fetcher(JCIM_PDF_URL, { cache: "no-store" });
    if (!response.ok || response.url !== JCIM_PDF_URL || response.headers.get("content-length") !== String(expectedPdf.byteCount) ||
      response.headers.get("last-modified") !== JCIM_LAST_MODIFIED ||
      !response.headers.get("content-type")?.includes("application/pdf")) return false;
    const bytes = new Uint8Array(await response.arrayBuffer());
    // Production default expectedPdf is JCIM_PDF_IDENTITY_PINS (both length + sha256).
    return matchesJcimPdfIdentity(bytes, expectedPdf);
  } catch { return false; }
}
