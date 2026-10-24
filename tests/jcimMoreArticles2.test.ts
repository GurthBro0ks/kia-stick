import { readFileSync } from "node:fs";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createChatSubmitSnapshot, routeChatQuestion } from "@/lib/chatAnswerRouter";
import {
  JCIM_NORMALIZED_SHA256, JCIM_SECTION_IDS, JCIM_SHA256, JCIM_SOURCE_ID, type JcimCache,
  jcimPacketSourceVerifier, jcimTopicCitation, verifyJcimCitation,
} from "@/lib/jcimSource";
import { readJcimCache, validateJcimCache } from "@/lib/jcimSourceServer";
import { buildPublicStewardPacket, publicStewardPacketExportEligibility } from "@/lib/publicStewardPacket";
import { publicStewardWorkflowTopic } from "@/lib/publicStewardWorkflowRegistry";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import {
  createJcimSourceFixtureCache, createSyntheticJcimPdfBytes,
} from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-more-articles-2: admit JCIM Articles 8, 10, 11 and 26 for existing topics only (scope-1 §1 table).
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

const EXPECTED_IDS = ["preface", "introduction", "article-8", "article-10", "article-11", "article-14", "article-15",
  "article-16", "article-17", "article-19", "article-25", "article-26", "article-27"];
const NEW_NORMALIZED_SHA256 = "2b3fcc2b6f946948dff8f64b3229a41e7ed9a0b0289edef6de85f40edcce344e";
const NINE_IDS = ["preface", "introduction", "article-14", "article-15", "article-16", "article-17", "article-19", "article-25", "article-27"];
const NINE_NORMALIZED_SHA256 = "ff62a070121b62895dcc66982b8717b4281e3cbb7fac22173c328b7d93ed8338";
// [topic, JCIM article, section, synthetic fixture paragraph]
const NEW_TOPICS = [
  ["overtime", "8", "article-8", "article-8-pdf51-p01"],
  ["annual_leave", "10", "article-10", "article-10-pdf71-p01"],
  ["sick_leave", "10", "article-10", "article-10-pdf71-p02"],
  ["holiday_scheduling", "11", "article-11", "article-11-pdf93-p01"],
  ["uniforms_work_clothes", "26", "article-26", "article-26-pdf179-p01"],
] as const;
const cache = createJcimSourceFixtureCache();
const pdf = createSyntheticJcimPdfBytes();
const cba = createCbaSourceFixtureCacheWithArticle19();
const version = createRuntimeVersion({ buildDate: "20261024", gitSha: "jcimmore2" });

function withCacheDirectory(setup: (directory: string) => void, check: (root: string) => void) {
  const root = mkdtempSync(path.join(realpathSync(tmpdir()), "kia-synthetic-jcim-more2-"));
  try {
    const directory = path.join(root, ".kia-public-data");
    mkdirSync(directory, { mode: 0o700 });
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

function oldNineSectionCache(sha256 = NINE_NORMALIZED_SHA256): JcimCache {
  const old = structuredClone(cache) as unknown as { normalized: { sha256: string; sectionCount: number; sections: JcimCache["normalized"]["sections"] } };
  old.normalized.sections = old.normalized.sections.filter((section) => NINE_IDS.includes(section.id));
  old.normalized.sectionCount = 9;
  old.normalized.sha256 = sha256;
  return old as unknown as JcimCache;
}

describe("KIA-jcim-more-articles-2: exact ordered 13-section JCIM admission allowlist", () => {
  it("admits exactly thirteen sections in PDF order under the new normalized pin", () => {
    expect([...JCIM_SECTION_IDS]).toEqual(EXPECTED_IDS);
    expect(JCIM_NORMALIZED_SHA256).toBe(NEW_NORMALIZED_SHA256);
    expect(JCIM_SHA256).toBe("6605cc0a94532a0264c0f2bd78f604f23e49c85ded15416c166858ae28a7d6f7");
    expect(cache.normalized.sectionCount).toBe(13);
    expect(cache.normalized.sections.map((section) => section.id)).toEqual(EXPECTED_IDS);
    expect(validateJcimCache(cache, pdf)).toBe(true);
  });

  it("the sync script admits the same thirteen sections and reports thirteen", () => {
    const script = readFileSync(path.join(process.cwd(), "scripts", "jcim-source-sync.py"), "utf8");
    const table = /^PAGES = \[([\s\S]*?)\]\n/m.exec(script)?.[1] ?? "";
    expect([...table.matchAll(/\("([a-z0-9-]+)", \d+, \d+\)/g)].map((match) => match[1])).toEqual(EXPECTED_IDS);
    expect(script).toContain("13 sections\")");
    expect(script).not.toContain("9 sections\")");
  });

  it.each(["18", "20", "9", "12", "13", "24", "28"])("rejects unadmitted JCIM Article %s", (article) => {
    const id = `article-${article}`;
    expect((JCIM_SECTION_IDS as readonly string[]).includes(id)).toBe(false);
    const forbidden = { id, title: "SYNTHETIC forbidden", paragraphs: [{ id: `${id}-pdf1-unit1`, text: `SYNTHETIC Article ${article}.1 forbidden`,
      pdfPageNumber: 1, printedPageLabel: null, articleNumber: article, qaId: null, heading: null }] };
    expect(validateJcimCache({ ...cache, normalized: { ...cache.normalized, sections: [...cache.normalized.sections, forbidden] } }, pdf)).toBe(false);
    const replaced = structuredClone(cache);
    replaced.normalized.sections[3] = forbidden;
    expect(validateJcimCache(replaced, pdf)).toBe(false);
    const fakeCitation = { ...jcimTopicCitation(cache, "overtime")[0], sectionId: id, articleNumber: article };
    expect(verifyJcimCitation(fakeCitation, cache)).not.toBe("verified_current");
  });
});

describe("KIA-jcim-more-articles-2: fail-closed local cache", () => {
  it("positive control: the exact synthetic thirteen-section cache is available", () => {
    withCacheDirectory((directory) => writeCache(directory, cache, pdf), (root) => {
      expect(readFrom(root)).toMatchObject({ status: "available" });
    });
  });

  it("rejects the old nine-section cache (ff62a070 pin) as drift_detected", () => {
    const old = oldNineSectionCache();
    expect(old.normalized.sections.map((section) => section.id)).toEqual(NINE_IDS);
    expect(validateJcimCache(old, pdf)).toBe(false);
    withCacheDirectory((directory) => writeCache(directory, old, pdf), (root) => {
      expect(readFrom(root)).toEqual({ status: "unavailable", reason: "drift_detected" });
    });
  });

  it("rejects a nine-section cache even when it is labelled with the new pin", () => {
    const relabelled = oldNineSectionCache(NEW_NORMALIZED_SHA256);
    expect(validateJcimCache(relabelled, pdf)).toBe(false);
    withCacheDirectory((directory) => writeCache(directory, relabelled, pdf), (root) => {
      expect(readFrom(root)).toEqual({ status: "unavailable", reason: "drift_detected" });
    });
  });
});

describe("KIA-jcim-more-articles-2: citations for the new articles", () => {
  it.each(NEW_TOPICS)("%s cites exactly JCIM Article %s (%s) and verifies current", (topicId, article, sectionId, paragraphId) => {
    const citations = jcimTopicCitation(cache, topicId);
    expect(citations.map((citation) => citation.articleNumber)).toEqual([article]);
    const [citation] = citations;
    expect(citation.sectionId).toBe(sectionId);
    expect(citation.paragraphId).toBe(paragraphId);
    expect(citation.sourceId).toBe(JCIM_SOURCE_ID);
    expect(citation.publicSourceType).toBe("jcim_joint_interpretation");
    expect(verifyJcimCitation(citation, cache)).toBe("verified_current");
    expect(jcimPacketSourceVerifier(cache).verify(citation)).toBe("verified_current");
    expect(verifyJcimCitation(citation, null)).toBe("cache_unavailable");
    expect(verifyJcimCitation({ ...citation, paragraphId: "unadmitted-unit" }, cache)).toBe("paragraph_missing");
    expect(verifyJcimCitation({ ...citation, citationAnchorSha256: "0".repeat(64) }, cache)).toBe("locator_changed");
    expect(verifyJcimCitation(citation, { ...cache, normalized: { ...cache.normalized, sha256: "0".repeat(64) } })).toBe("source_instance_changed");
  });

  it("content caution: a JCIM citation is a locator only and carries no paragraph text", () => {
    for (const [topicId, , sectionId, paragraphId] of NEW_TOPICS) {
      const paragraph = cache.normalized.sections.find((section) => section.id === sectionId)!.paragraphs.find((item) => item.id === paragraphId)!;
      for (const citation of jcimTopicCitation(cache, topicId)) {
        expect(JSON.stringify(citation), topicId).not.toContain(paragraph.text);
        expect(citation.sourceId).toBe(JCIM_SOURCE_ID);
      }
    }
  });

  it("annual_leave deliberately changes from [] (more-articles-1) to JCIM Article 10; sick_leave uses a different Article 10 unit", () => {
    const annual = jcimTopicCitation(cache, "annual_leave");
    const sick = jcimTopicCitation(cache, "sick_leave");
    expect(annual).not.toEqual([]);
    expect(annual.map((citation) => citation.articleNumber)).toEqual(["10"]);
    expect(sick.map((citation) => citation.articleNumber)).toEqual(["10"]);
    expect(annual[0].paragraphId).not.toBe(sick[0].paragraphId);
  });

  it("keeps the existing topic map unchanged", () => {
    expect(jcimTopicCitation(cache, "discipline_just_cause").map((citation) => citation.articleNumber)).toEqual(["16"]);
    expect(jcimTopicCitation(cache, "steward_grievance_handling").map((citation) => citation.articleNumber)).toEqual(["15", "17"]);
    expect(jcimTopicCitation(cache, "safety_health").map((citation) => citation.articleNumber)).toEqual(["14"]);
    expect(jcimTopicCitation(cache, "higher_level_assignments").map((citation) => citation.articleNumber)).toEqual(["25"]);
    expect(jcimTopicCitation(cache, "employee_claims").map((citation) => citation.articleNumber)).toEqual(["27"]);
    for (const topicId of ["article_19_new_topic", "toString", "__proto__"]) expect(jcimTopicCitation(cache, topicId), topicId).toEqual([]);
    expect(jcimTopicCitation(null, "overtime")).toEqual([]);
  });
});

describe("KIA-jcim-more-articles-2: routing for the five topics", () => {
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
      createdAt: "2026-10-24T10:00:00.000Z", supplementalCitations, supplementalSourceVerifiers: [verifier] })!;
    expect(packet).not.toBeNull();
    expect(packet.supplementalCitations?.map((citation) => citation.articleNumber)).toEqual([article]);
    expect(publicStewardPacketExportEligibility(packet, cba, [verifier])).toEqual({ eligible: true });
  });
});
