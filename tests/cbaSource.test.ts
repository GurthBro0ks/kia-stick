import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CBA_EXPECTED_PDF_PAGES,
  CBA_MAX_RESPONSE_BYTES,
  CBA_SOURCE_ID,
  CBA_SOURCE_PDF_URL,
  normalizeExtractedCbaText,
  searchCba,
  validateCbaContentType,
  validateCbaPageCount,
  validateCbaRedirectTarget,
  validateCbaResponseByteCount,
  validateCbaSourceCache,
  validateCbaSyncArguments,
  validatePdfMagic,
  validatePopplerToolAvailability,
} from "@/lib/cbaSource";
import { readBoundedCbaSourceCache } from "@/lib/cbaSourceServer";
import {
  cbaFixturePdfBytes,
  cbaFixtureSha256,
  createCbaSourceFixtureCache,
  syntheticCbaExtraction,
} from "@/tests/fixtures/cbaSourceFixture";

function fixtureIo(options: {
  missing?: boolean;
  malformed?: boolean;
  symlink?: boolean;
  wrongSource?: boolean;
  checksumMismatch?: boolean;
} = {}) {
  const cache = createCbaSourceFixtureCache();
  if (options.wrongSource) (cache.source as { id: string }).id = "wrong-source";
  const json = options.malformed ? Buffer.from("{broken", "utf8") : Buffer.from(JSON.stringify(cache), "utf8");
  const pdf = options.checksumMismatch ? Buffer.from("%PDF-different", "utf8") : cbaFixturePdfBytes;
  return {
    cwd: () => "/repo",
    getuid: () => 1000,
    lstat: (target: string) => {
      if (options.missing && target.endsWith("apwu-usps-cba-2024-2027.json")) throw Object.assign(new Error("missing"), { code: "ENOENT" });
      const directory = target.endsWith(".kia-public-data");
      const isPdf = target.endsWith(".pdf");
      return {
        isDirectory: () => directory,
        isFile: () => !directory,
        isSymbolicLink: () => Boolean(options.symlink && !directory && target.endsWith(".json")),
        mode: directory ? 0o40700 : 0o100600,
        size: directory ? 0 : isPdf ? pdf.byteLength : json.byteLength,
        uid: 1000,
      };
    },
    readFile: (target: string) => target.endsWith(".pdf") ? pdf : json,
    realpath: (target: string) => target,
  };
}

describe("bounded official CBA source", () => {
  it("accepts only the exact CBA source ID and rejects URL/path/additional arguments", () => {
    expect(validateCbaSyncArguments([CBA_SOURCE_ID])).toBe(CBA_SOURCE_ID);
    for (const args of [[], [CBA_SOURCE_PDF_URL], ["../cba.pdf"], [CBA_SOURCE_ID, "extra"], ["other"]]) {
      expect(() => validateCbaSyncArguments(args)).toThrow("Exactly one approved source ID");
    }
  });

  it("enforces same-host HTTPS redirects, bounded PDF content, magic, and exact page count", () => {
    expect(validateCbaRedirectTarget(CBA_SOURCE_PDF_URL, CBA_SOURCE_PDF_URL).hostname).toBe("apwu.org");
    expect(() => validateCbaRedirectTarget(CBA_SOURCE_PDF_URL, "https://example.com/cba.pdf")).toThrow("approved APWU HTTPS host");
    expect(() => validateCbaRedirectTarget(CBA_SOURCE_PDF_URL, "http://apwu.org/cba.pdf")).toThrow("approved APWU HTTPS host");
    expect(validatePdfMagic(cbaFixturePdfBytes)).toBe(true);
    expect(() => validatePdfMagic(Buffer.from("not-pdf"))).toThrow("%PDF-");
    expect(validateCbaContentType("application/pdf", cbaFixturePdfBytes)).toBe("application/pdf");
    expect(validateCbaContentType("application/octet-stream", cbaFixturePdfBytes)).toBe("application/octet-stream");
    expect(() => validateCbaContentType("text/html", Buffer.from("<html>"))).toThrow("neither application/pdf");
    expect(validateCbaResponseByteCount(CBA_MAX_RESPONSE_BYTES)).toBe(CBA_MAX_RESPONSE_BYTES);
    expect(() => validateCbaResponseByteCount(CBA_MAX_RESPONSE_BYTES + 1)).toThrow("byte cap");
    expect(validateCbaPageCount(CBA_EXPECTED_PDF_PAGES)).toBe(CBA_EXPECTED_PDF_PAGES);
    expect(() => validateCbaPageCount(535)).toThrow("exactly 536");
  });

  it("treats missing host tools as a safe WARN without installing anything", () => {
    expect(validatePopplerToolAvailability("/usr/bin/pdfinfo", "/usr/bin/pdftotext")).toEqual({
      pdfinfoPath: "/usr/bin/pdfinfo",
      pdftotextPath: "/usr/bin/pdftotext",
    });
    expect(() => validatePopplerToolAvailability(null, "/usr/bin/pdftotext")).toThrow("RESULT=WARN");
    expect(() => validatePopplerToolAvailability("/usr/bin/pdfinfo", null)).toThrow("RESULT=WARN");
  });

  it("normalizes twice deterministically with stable page IDs, Article 1-43, and separate appendix/MOU structures", () => {
    const extracted = syntheticCbaExtraction();
    const first = normalizeExtractedCbaText(extracted, cbaFixtureSha256);
    const second = normalizeExtractedCbaText(extracted, cbaFixtureSha256);
    expect(first).toEqual(second);
    expect(first.sha256).toBe(second.sha256);
    expect(first.articleCount).toBe(43);
    expect(first.pages).toHaveLength(536);
    expect(first.pages[0].id).toBe("cba-pdf-p001");
    expect(first.pages[535].id).toBe("cba-pdf-p536");
    expect(first.pages[0].printedPageLabel).toBeNull();
    expect(first.structures.some((entry) => entry.structuralType === "appendix")).toBe(true);
    expect(first.structures.some((entry) => entry.structuralType === "memorandum_of_understanding")).toBe(true);
  });

  it("validates exact source and normalized/PDF hashes and fails safely for fixed-cache hazards", () => {
    const cache = createCbaSourceFixtureCache();
    expect(validateCbaSourceCache(cache, cbaFixtureSha256, cbaFixtureSha256(cbaFixturePdfBytes)).ok).toBe(true);
    expect(readBoundedCbaSourceCache(fixtureIo()).status).toBe("available");
    expect(readBoundedCbaSourceCache(fixtureIo({ missing: true }))).toEqual({ status: "unavailable", reason: "cache_missing" });
    expect(readBoundedCbaSourceCache(fixtureIo({ malformed: true }))).toEqual({ status: "unavailable", reason: "cache_invalid" });
    expect(readBoundedCbaSourceCache(fixtureIo({ symlink: true }))).toEqual({ status: "unavailable", reason: "cache_unsafe" });
    expect(readBoundedCbaSourceCache(fixtureIo({ wrongSource: true }))).toEqual({ status: "unavailable", reason: "cache_invalid" });
    expect(readBoundedCbaSourceCache(fixtureIo({ checksumMismatch: true }))).toEqual({ status: "unavailable", reason: "cache_invalid" });
  });

  it("ranks exact article and grievance terms deterministically without expansion", () => {
    const source = createCbaSourceFixtureCache();
    const first = searchCba(source, "Article 15 grievance", 5);
    const second = searchCba(source, "Article 15 grievance", 5);
    expect(first).toEqual(second);
    expect(first[0].paragraph.articleNumber).toBe("15");
    expect(first[0].relevance).toContain("exact Article 15");
    expect(searchCba(source, "", 5)).toEqual([]);
  });

  it("does not treat routing or high-frequency corpus terms as sufficient retrieval evidence", () => {
    const source = createCbaSourceFixtureCache();
    source.normalized.pages[0].paragraphs[0].text = "Fixture boilerplate says employees receive free access to a public work area.";

    expect(searchCba(source, "What does the CBA say about employees receiving free pet llamas?", 5)).toEqual([]);
    expect(searchCba(source, "What does the contract say?", 5)).toEqual([]);
    expect(searchCba(source, "employees postal union service", 5)).toEqual([]);
  });

  it("keeps the app pathless and the exact source sync explicit", () => {
    const route = readFileSync("app/api/public-cba-source/route.ts", "utf8");
    const sync = readFileSync("scripts/public-source-sync.mjs", "utf8");
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    expect(route).toContain("route_query_rejected");
    expect(route).not.toMatch(/searchParams\.get|request\.json|readFileSync/);
    expect(sync).toContain('redirect: "manual"');
    expect(sync).toContain("CBA_MAX_RESPONSE_BYTES");
    expect(sync).toContain("validateCbaSyncArguments(process.argv.slice(2))");
    expect(component).toContain('fetch("/api/public-cba-source"');
    expect(component).not.toMatch(/FileReader|showOpenFilePicker|webkitdirectory|type=["']file/);
  });
});
