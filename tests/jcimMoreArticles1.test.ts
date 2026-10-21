import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createChatSubmitSnapshot, routeChatQuestion } from "@/lib/chatAnswerRouter";
import {
  JCIM_NORMALIZED_SHA256, JCIM_SECTION_IDS, JCIM_SHA256, JCIM_SOURCE_ID, type JcimCache,
  jcimCitation, jcimPacketSourceVerifier, jcimTopicCitation, verifyJcimCitation,
} from "@/lib/jcimSource";
import { readJcimCache, validateJcimCache } from "@/lib/jcimSourceServer";
import { buildPublicStewardPacket, publicStewardPacketExportEligibility } from "@/lib/publicStewardPacket";
import { publicStewardWorkflowTopic } from "@/lib/publicStewardWorkflowRegistry";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import {
  createJcimSourceFixtureCache, createSyntheticJcimPdfBytes, createSyntheticShortJcimPdfBytes,
} from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-more-articles-1: admit JCIM Articles 14, 25 and 27 for existing topics only.
// SYNTHETIC fixtures only. Same narrow admission-unit boundary as jcimSource.admissionUnit.test.ts:
// only the exact synthetic PDF bytes and synthetic section JSON receive the admission pins.
vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();
  const fixture = await import("@/tests/fixtures/jcimSourceFixture");
  const identity = await import("@/lib/jcimSource");
  const syntheticPdf = fixture.createSyntheticJcimPdfBytes();
  const syntheticShortPdf = fixture.createSyntheticShortJcimPdfBytes();
  const syntheticSections = Buffer.from(fixture.syntheticJcimStableJson(fixture.createJcimSourceFixtureCache().normalized.sections));
  return { ...original, createHash: (...args: Parameters<typeof original.createHash>) => {
    const hash = original.createHash(...args);
    const chunks: Buffer[] = [];
    const proxy: import("node:crypto").Hash = new Proxy(hash, {
      get(target, property) {
        if (property === "update") return (data: import("node:crypto").BinaryLike, encoding?: BufferEncoding) => {
          chunks.push(typeof data === "string" ? Buffer.from(data, encoding) : Buffer.from(data as Uint8Array));
          if (typeof data === "string" && encoding) target.update(data, encoding); else target.update(data);
          return proxy;
        };
        if (property === "digest") return (encoding?: import("node:crypto").BinaryToTextEncoding) => {
          const result = encoding ? target.digest(encoding) : target.digest();
          if (args[0] === "sha256" && encoding === "hex") {
            const input = Buffer.concat(chunks);
            if (input.equals(syntheticPdf) || input.equals(syntheticShortPdf)) return identity.JCIM_SHA256;
            if (input.equals(syntheticSections)) return identity.JCIM_NORMALIZED_SHA256;
          }
          return result;
        };
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    return proxy;
  } };
});

const EXPECTED_IDS = ["preface", "introduction", "article-14", "article-15", "article-16", "article-17", "article-19", "article-25", "article-27"];
const OLD_IDS = ["preface", "introduction", "article-15", "article-16", "article-17", "article-19"];
const OLD_NORMALIZED_SHA256 = "4630eb409316468bea9597e7c981e868cd7d5a7f762b473ee23efe613362d8c3";
const NEW_TOPICS = [
  ["safety_health", "14", "article-14"],
  ["higher_level_assignments", "25", "article-25"],
  ["employee_claims", "27", "article-27"],
] as const;
const cache = createJcimSourceFixtureCache();
const pdf = createSyntheticJcimPdfBytes();
const cba = createCbaSourceFixtureCacheWithArticle19();
const version = createRuntimeVersion({ buildDate: "20261021", gitSha: "jcimmore1" });

function withCacheDirectory(
  setup: (directory: string) => void,
  check: (root: string) => void,
  options: { directoryMode?: number } = {},
) {
  const root = mkdtempSync(path.join(realpathSync(tmpdir()), "kia-synthetic-jcim-more-"));
  try {
    const directory = path.join(root, ".kia-public-data");
    mkdirSync(directory, { mode: options.directoryMode ?? 0o700 });
    setup(directory);
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeCache(directory: string, json: unknown, bytes: Uint8Array) {
  writeFileSync(path.join(directory, `${JCIM_SOURCE_ID}.json`), JSON.stringify(json), { mode: 0o600 });
  writeFileSync(path.join(directory, `${JCIM_SOURCE_ID}.pdf`), bytes, { mode: 0o600 });
}

function readFrom(root: string) {
  const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(root);
  try {
    return readJcimCache();
  } finally {
    cwdSpy.mockRestore();
  }
}

function oldSixSectionCache(): JcimCache {
  const old = structuredClone(cache) as unknown as { normalized: { sha256: string; sectionCount: number; sections: JcimCache["normalized"]["sections"] } };
  old.normalized.sections = old.normalized.sections.filter((section) => OLD_IDS.includes(section.id));
  old.normalized.sectionCount = 6;
  old.normalized.sha256 = OLD_NORMALIZED_SHA256;
  return old as unknown as JcimCache;
}

describe("KIA-jcim-more-articles-1: exact ordered JCIM admission allowlist", () => {
  it("admits exactly nine sections in PDF order under the new normalized pin", () => {
    expect([...JCIM_SECTION_IDS]).toEqual(EXPECTED_IDS);
    expect(JCIM_NORMALIZED_SHA256).toBe("ff62a070121b62895dcc66982b8717b4281e3cbb7fac22173c328b7d93ed8338");
    expect(JCIM_SHA256).toBe("6605cc0a94532a0264c0f2bd78f604f23e49c85ded15416c166858ae28a7d6f7");
    expect(cache.normalized.sections.map((section) => section.id)).toEqual(EXPECTED_IDS);
    expect(validateJcimCache(cache, pdf)).toBe(true);
  });

  it.each(["18", "20", "8", "10", "11", "26"])("rejects unadmitted JCIM Article %s", (article) => {
    const id = `article-${article}`;
    expect((JCIM_SECTION_IDS as readonly string[]).includes(id)).toBe(false);
    const forbidden = { id, title: "SYNTHETIC forbidden", paragraphs: [{ id: `${id}-pdf1-unit1`, text: `SYNTHETIC Article ${article}.1 forbidden`,
      pdfPageNumber: 1, printedPageLabel: null, articleNumber: article, qaId: null, heading: null }] };
    expect(validateJcimCache({ ...cache, normalized: { ...cache.normalized, sections: [...cache.normalized.sections, forbidden] } }, pdf)).toBe(false);
    const replaced = structuredClone(cache);
    replaced.normalized.sections[2] = forbidden;
    expect(validateJcimCache(replaced, pdf)).toBe(false);
    const fakeCitation = { ...jcimTopicCitation(cache, "safety_health")[0], sectionId: id, articleNumber: article };
    expect(verifyJcimCitation(fakeCitation, cache)).not.toBe("verified_current");
  });
});

describe("KIA-jcim-more-articles-1: fail-closed local cache", () => {
  it("positive control: the exact synthetic nine-section cache is available", () => {
    withCacheDirectory((directory) => writeCache(directory, cache, pdf), (root) => {
      expect(readFrom(root)).toMatchObject({ status: "available" });
    });
  });

  it("rejects an old six-section cache as drift_detected", () => {
    const old = oldSixSectionCache();
    expect(validateJcimCache(old, pdf)).toBe(false);
    withCacheDirectory((directory) => writeCache(directory, old, pdf), (root) => {
      expect(readFrom(root)).toEqual({ status: "unavailable", reason: "drift_detected" });
    });
  });

  it("rejects wrong PDF bytes, wrong length and a normalized mismatch as drift_detected", () => {
    const short = createSyntheticShortJcimPdfBytes();
    expect(createHash("sha256").update(short).digest("hex")).toBe(JCIM_SHA256);
    const mismatch = { ...cache, normalized: { ...cache.normalized, sha256: "f".repeat(64) } };
    const drifted = structuredClone(cache);
    drifted.normalized.sections[2].paragraphs[0].text += " SYNTHETIC drift";
    for (const [json, bytes] of [[cache, new Uint8Array(pdf.length)], [cache, short], [mismatch, pdf], [drifted, pdf]] as const) {
      withCacheDirectory((directory) => writeCache(directory, json, bytes), (root) => {
        expect(readFrom(root)).toEqual({ status: "unavailable", reason: "drift_detected" });
      });
    }
  });

  it("rejects unsafe permissions and symlinks as cache_unsafe", () => {
    withCacheDirectory((directory) => writeCache(directory, cache, pdf), (root) => {
      const directory = path.join(root, ".kia-public-data");
      expect(lstatSync(directory).mode & 0o077).not.toBe(0);
      expect(readFrom(root)).toEqual({ status: "unavailable", reason: "cache_unsafe" });
    }, { directoryMode: 0o755 });
    withCacheDirectory((directory) => {
      writeFileSync(path.join(directory, `${JCIM_SOURCE_ID}.json`), JSON.stringify(cache), { mode: 0o644 });
      writeFileSync(path.join(directory, `${JCIM_SOURCE_ID}.pdf`), pdf, { mode: 0o600 });
    }, (root) => {
      expect(lstatSync(path.join(root, ".kia-public-data", `${JCIM_SOURCE_ID}.json`)).mode & 0o077).not.toBe(0);
      expect(readFrom(root)).toEqual({ status: "unavailable", reason: "cache_unsafe" });
    });
    withCacheDirectory((directory) => {
      const real = path.join(path.dirname(directory), "real-json");
      writeFileSync(real, JSON.stringify(cache), { mode: 0o600 });
      symlinkSync(real, path.join(directory, `${JCIM_SOURCE_ID}.json`));
      writeFileSync(path.join(directory, `${JCIM_SOURCE_ID}.pdf`), pdf, { mode: 0o600 });
    }, (root) => {
      expect(readFrom(root)).toEqual({ status: "unavailable", reason: "cache_unsafe" });
    });
    const root = mkdtempSync(path.join(realpathSync(tmpdir()), "kia-synthetic-jcim-more-link-"));
    try {
      const target = path.join(root, "real-dir");
      mkdirSync(target, { mode: 0o700 });
      writeCache(target, cache, pdf);
      symlinkSync(target, path.join(root, ".kia-public-data"));
      expect(readFrom(root)).toEqual({ status: "unavailable", reason: "cache_unsafe" });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("KIA-jcim-more-articles-1: citations for the new articles", () => {
  it.each(NEW_TOPICS)("%s cites exactly JCIM Article %s and verifies current", (topicId, article, sectionId) => {
    const citations = jcimTopicCitation(cache, topicId);
    expect(citations.map((citation) => citation.articleNumber)).toEqual([article]);
    const [citation] = citations;
    expect(citation.sectionId).toBe(sectionId);
    expect(citation.sourceId).toBe(JCIM_SOURCE_ID);
    expect(citation.publicSourceType).toBe("jcim_joint_interpretation");
    expect(verifyJcimCitation(citation, cache)).toBe("verified_current");
    expect(jcimPacketSourceVerifier(cache).verify(citation)).toBe("verified_current");
    expect(verifyJcimCitation(citation, null)).toBe("cache_unavailable");
    expect(verifyJcimCitation({ ...citation, paragraphId: "unadmitted-unit" }, cache)).toBe("paragraph_missing");
    expect(verifyJcimCitation({ ...citation, citationAnchorSha256: "0".repeat(64) }, cache)).toBe("locator_changed");
    expect(verifyJcimCitation(citation, { ...cache, normalized: { ...cache.normalized, sha256: "0".repeat(64) } })).toBe("source_instance_changed");
    const section = cache.normalized.sections.find((item) => item.id === sectionId)!;
    expect(jcimCitation(cache, section, section.paragraphs[0]).articleNumber).toBe(article);
  });

  it("keeps the existing topic map and leaves batch-2 topics without JCIM", () => {
    expect(jcimTopicCitation(cache, "discipline_just_cause").map((citation) => citation.articleNumber)).toEqual(["16"]);
    expect(jcimTopicCitation(cache, "steward_grievance_handling").map((citation) => citation.articleNumber)).toEqual(["15", "17"]);
    for (const topicId of ["annual_leave", "overtime", "holiday_scheduling", "sick_leave", "uniforms_work_clothes", "article_19_new_topic"]) {
      expect(jcimTopicCitation(cache, topicId), topicId).toEqual([]);
    }
    expect(jcimTopicCitation(null, "safety_health")).toEqual([]);
  });
});

describe("KIA-jcim-more-articles-1: routing for the three topics", () => {
  it.each(NEW_TOPICS)("%s: Chat keeps verified CBA first and adds JCIM Article %s second", (topicId, article) => {
    const question = publicStewardWorkflowTopic(topicId).exampleQuestion;
    const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "Official-Like", detail: "Detailed" });
    const answer = routeChatQuestion({ question, snapshot, publicSource: null, cbaSource: cba, jcimSource: cache, runtimeVersion: version });
    expect(answer.noAnswer).toBe(false);
    expect(answer.citations[0].publicSourceType).toBe("cba_contract");
    const jcim = answer.citations.filter((citation) => citation.sourceId === JCIM_SOURCE_ID);
    expect(jcim.map((citation) => citation.articleNumber)).toEqual([article]);
    const firstJcim = answer.citations.findIndex((citation) => citation.sourceId === JCIM_SOURCE_ID);
    expect(answer.citations.slice(0, firstJcim).every((citation) => citation.publicSourceType === "cba_contract")).toBe(true);
    expect(answer.shortAnswer).toContain("The JCIM provides joint interpretation");
    const withoutJcim = routeChatQuestion({ question, snapshot, publicSource: null, cbaSource: cba, jcimSource: null, runtimeVersion: version });
    expect(withoutJcim.citations.some((citation) => citation.sourceId === JCIM_SOURCE_ID)).toBe(false);
  });

  it.each(NEW_TOPICS)("%s: a steward packet carries the JCIM Article %s supplemental and is export-eligible", (topicId, article) => {
    const supplementalCitations = jcimTopicCitation(cache, topicId);
    const verifier = jcimPacketSourceVerifier(cache);
    const packet = buildPublicStewardPacket({ source: cba, topicIds: [topicId], runtimeVersion: version,
      createdAt: "2026-10-21T16:00:00.000Z", supplementalCitations, supplementalSourceVerifiers: [verifier] })!;
    expect(packet).not.toBeNull();
    expect(packet.supplementalCitations?.map((citation) => citation.articleNumber)).toEqual([article]);
    expect(publicStewardPacketExportEligibility(packet, cba, [verifier])).toEqual({ eligible: true });
  });
});
