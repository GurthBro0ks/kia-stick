import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  normalizeApprovedArticleHtml,
  normalizedContentForHash,
  PUBLIC_SOURCE_ID,
  PUBLIC_SOURCE_MAX_RESPONSE_BYTES,
  PUBLIC_SOURCE_URL,
  validateApprovedFinalUrl,
  validateHtmlContentType,
  validatePublicSourceCache,
  validateRedirectTarget,
  validateResponseByteCount,
  validateSyncArguments,
} from "@/lib/publicSource";
import { readBoundedPublicSourceCache } from "@/lib/publicSourceServer";
import { createPublicSourceFixtureCache, fixtureSha256, syntheticNlrBHtml } from "@/tests/fixtures/publicSourceFixture";

function fixtureIo(options: {
  missing?: boolean;
  symlink?: boolean;
  directorySymlink?: boolean;
  malformed?: boolean;
  wrongOwner?: boolean;
  wrongMode?: boolean;
  escapedRealpath?: boolean;
} = {}) {
  const cache = createPublicSourceFixtureCache();
  return {
    cwd: () => "/repo",
    getuid: () => 1000,
    lstat: (target: string) => {
      if (options.missing && target.endsWith("nlrb-weingarten-rights.json")) {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }
      const directory = target.endsWith(".kia-public-data");
      return {
        isDirectory: () => directory,
        isFile: () => !directory,
        isSymbolicLink: () => Boolean((options.symlink && !directory) || (options.directorySymlink && directory)),
        mode: directory ? 0o40700 : options.wrongMode ? 0o100644 : 0o100600,
        size: directory ? 0 : JSON.stringify(cache).length,
        uid: options.wrongOwner && !directory ? 2000 : 1000,
      };
    },
    readFile: () => options.malformed ? "{not-json" : JSON.stringify(cache),
    realpath: (target: string) => options.escapedRealpath && target.endsWith("nlrb-weingarten-rights.json") ? "/outside/cache.json" : target,
  };
}

describe("bounded public source", () => {
  it("accepts only the exact source ID and rejects URL/path-shaped arguments", () => {
    expect(validateSyncArguments([PUBLIC_SOURCE_ID])).toBe(PUBLIC_SOURCE_ID);
    for (const args of [[], [PUBLIC_SOURCE_URL], ["../source"], [PUBLIC_SOURCE_ID, PUBLIC_SOURCE_URL], ["other-source"]]) {
      expect(() => validateSyncArguments(args)).toThrow("Exactly one source ID");
    }
  });

  it("requires the exact final URL and rejects redirects outside the approved HTTPS host", () => {
    expect(validateApprovedFinalUrl(PUBLIC_SOURCE_URL)).toBe(PUBLIC_SOURCE_URL);
    expect(validateRedirectTarget(PUBLIC_SOURCE_URL, PUBLIC_SOURCE_URL).hostname).toBe("www.nlrb.gov");
    expect(() => validateApprovedFinalUrl(`${PUBLIC_SOURCE_URL}/other`)).toThrow("exact approved source URL");
    expect(() => validateRedirectTarget(PUBLIC_SOURCE_URL, "https://example.com/other")).toThrow("outside the approved HTTPS host");
    expect(() => validateRedirectTarget(PUBLIC_SOURCE_URL, "http://www.nlrb.gov/other")).toThrow("outside the approved HTTPS host");
  });

  it("enforces HTML content and the response-size cap", () => {
    expect(validateHtmlContentType("text/html; charset=UTF-8")).toBe("text/html; charset=utf-8");
    expect(() => validateHtmlContentType("application/pdf")).toThrow("not text/html");
    expect(validateResponseByteCount(PUBLIC_SOURCE_MAX_RESPONSE_BYTES)).toBe(PUBLIC_SOURCE_MAX_RESPONSE_BYTES);
    expect(() => validateResponseByteCount(PUBLIC_SOURCE_MAX_RESPONSE_BYTES + 1)).toThrow("byte cap");
  });

  it("normalizes only the approved article body with deterministic anchors", () => {
    const first = normalizeApprovedArticleHtml(syntheticNlrBHtml);
    const second = normalizeApprovedArticleHtml(syntheticNlrBHtml);
    expect(first).toEqual(second);
    expect(first.map((section) => section.id)).toEqual([
      "section-01-overview",
      "section-02-when-do-employees-have-a-right-to-request-a-union-representative",
      "section-03-what-may-a-union-representative-do-during-an-employee-interview",
      "section-04-what-are-the-limitations",
    ]);
    expect(first.flatMap((section) => section.paragraphs).every((paragraph) => /^section-\d{2}-.+-p\d{2}$/.test(paragraph.id))).toBe(true);
    expect(normalizedContentForHash(first)).not.toContain("Unrelated navigation");
    expect(normalizedContentForHash(first)).not.toContain("discard me");
  });

  it("validates exact schema, source identity, URL, and normalized checksum", () => {
    const cache = createPublicSourceFixtureCache();
    expect(validatePublicSourceCache(cache, fixtureSha256).ok).toBe(true);
    expect(validatePublicSourceCache({ ...cache, source: { ...cache.source, id: "other" } }, fixtureSha256).ok).toBe(false);
    expect(validatePublicSourceCache({ ...cache, source: { ...cache.source, url: "https://example.com" } }, fixtureSha256).ok).toBe(false);
    expect(validatePublicSourceCache({ ...cache, normalized: { ...cache.normalized, sha256: "0".repeat(64) } }, fixtureSha256).ok).toBe(false);
  });

  it("reads only the fixed cache and fails safely for missing, malformed, and symlinked files", () => {
    expect(readBoundedPublicSourceCache(fixtureIo()).status).toBe("available");
    expect(readBoundedPublicSourceCache(fixtureIo({ missing: true }))).toEqual({ status: "unavailable", reason: "cache_missing" });
    expect(readBoundedPublicSourceCache(fixtureIo({ malformed: true }))).toEqual({ status: "unavailable", reason: "cache_invalid" });
    expect(readBoundedPublicSourceCache(fixtureIo({ symlink: true }))).toEqual({ status: "unavailable", reason: "cache_unsafe" });
  });

  it("rejects wrong ownership, wrong mode, linked directories, and escaped realpaths", () => {
    expect(readBoundedPublicSourceCache(fixtureIo({ wrongOwner: true }))).toEqual({ status: "unavailable", reason: "cache_unsafe" });
    expect(readBoundedPublicSourceCache(fixtureIo({ wrongMode: true }))).toEqual({ status: "unavailable", reason: "cache_unsafe" });
    expect(readBoundedPublicSourceCache(fixtureIo({ directorySymlink: true }))).toEqual({ status: "unavailable", reason: "cache_unsafe" });
    expect(readBoundedPublicSourceCache(fixtureIo({ escapedRealpath: true }))).toEqual({ status: "unavailable", reason: "cache_unsafe" });
  });

  it("keeps browser and sync surfaces pathless and read-only", () => {
    const route = readFileSync("app/api/public-source/route.ts", "utf8");
    const sync = readFileSync("scripts/public-source-sync.mjs", "utf8");
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    expect(route).toContain("route_query_rejected");
    expect(route).not.toMatch(/searchParams\.get|request\.json|readFileSync/);
    expect(sync).toContain('redirect: "manual"');
    expect(sync).toContain("PUBLIC_SOURCE_TIMEOUT_MS");
    expect(sync).toContain("PUBLIC_SOURCE_MAX_RESPONSE_BYTES");
    expect(sync).toContain("validateSyncArguments(process.argv.slice(2))");
    expect(component).toContain('fetch("/api/public-source"');
    expect(component).not.toMatch(/FileReader|showOpenFilePicker|webkitdirectory|type=["']file/);
  });
});
