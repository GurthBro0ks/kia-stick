import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PublicStewardPacketView } from "@/components/KiaStickApp";
import {
  JCIM_BYTES, JCIM_NORMALIZED_SHA256, JCIM_SECTION_IDS, type JcimCache, type JcimParagraph,
  jcimTopicCitation, verifyJcimCitation,
} from "@/lib/jcimSource";
import { validateJcimCache } from "@/lib/jcimSourceServer";
import { buildPublicStewardPacket, publicStewardPacketToMarkdown, publicStewardPacketToText } from "@/lib/publicStewardPacket";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createJcimSourceFixtureCache, createSyntheticJcimPdfBytes, syntheticJcimStableJson } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-batch1-closeout-hardening-1: test-only hardening for review 0aaabcb1 findings F1, F2, F3, F6.
// SYNTHETIC fixtures only, generated in-test. No real JCIM text.
//
// Narrow hash boundary for F2 only: a test may register the exact stable JSON of a synthetic section list,
// and only that exact input hashes to the normalized pin. That leaves the page-range guard as the only guard
// able to reject the registered cache. Every other input (PDF bytes, unregistered sections, CBA packets) uses
// real SHA-256. The PDF identity is pinned per call through validateJcimCache's expectedPdf parameter.
const pinned = vi.hoisted(() => new Set<string>());
vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();
  const identity = await import("@/lib/jcimSource");
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
          if (args[0] === "sha256" && encoding === "hex" && pinned.size > 0 && pinned.has(Buffer.concat(chunks).toString("utf8"))) {
            return identity.JCIM_NORMALIZED_SHA256;
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

const realSha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const pdf = createSyntheticJcimPdfBytes();
const syntheticPdfPins = { sha256: realSha256(pdf), byteCount: JCIM_BYTES };

function pinSections(cache: JcimCache): JcimCache {
  pinned.add(syntheticJcimStableJson(cache.normalized.sections));
  return cache;
}

function withPage(sectionId: string, page: number): JcimCache {
  const cache = structuredClone(createJcimSourceFixtureCache());
  const section = cache.normalized.sections.find((item) => item.id === sectionId)!;
  section.paragraphs = section.paragraphs.map((paragraph, index) => ({ ...paragraph, id: `${sectionId}-pdf${page}-p0${index + 1}`, pdfPageNumber: page }));
  return cache;
}

const EXPECTED_PAGE_RANGES: [string, number, number][] = [
  ["preface", 3, 3], ["introduction", 29, 29], ["article-8", 51, 67], ["article-10", 71, 92],
  ["article-11", 93, 98], ["article-14", 134, 138], ["article-15", 139, 149],
  ["article-16", 150, 157], ["article-17", 158, 167], ["article-19", 169, 169],
  ["article-25", 177, 178], ["article-26", 179, 181], ["article-27", 182, 183],
];

describe("F1: normalized pin is enforced for a self-consistent cache", () => {
  it("control: the pinned synthetic thirteen-section cache validates", () => {
    expect(validateJcimCache(pinSections(createJcimSourceFixtureCache()), pdf, syntheticPdfPins)).toBe(true);
  });

  it("rejects a self-consistent thirteen-section cache whose normalized hash is not the pin", () => {
    const cache = structuredClone(createJcimSourceFixtureCache());
    cache.normalized.sections.find((section) => section.id === "article-14")!.paragraphs[0].text =
      "SYNTHETIC Article 14.1 SAFETY: a different imaginary lantern ladder check.";
    const selfConsistent = realSha256(syntheticJcimStableJson(cache.normalized.sections));
    expect(selfConsistent).not.toBe(JCIM_NORMALIZED_SHA256);
    cache.normalized.sha256 = selfConsistent;
    // Every other guard passes: thirteen ordered ids, admitted pages, article numbers, and the content re-hash
    // equals the recorded sha256. Only the pin comparison can reject it.
    expect(cache.normalized.sections.map((section) => section.id)).toEqual([...JCIM_SECTION_IDS]);
    expect(validateJcimCache(cache, pdf, syntheticPdfPins)).toBe(false);
  });

  // N6 (review 0f52d313): renamed from the misleading "old six-section pin label" title; this case varies a
  // different section (preface) and never used the old pin.
  it("rejects a self-consistent cache varied in the preface section (second mutation site)", () => {
    const cache = structuredClone(createJcimSourceFixtureCache());
    cache.normalized.sections[0].paragraphs[0].text += " SYNTHETIC variant";
    cache.normalized.sha256 = realSha256(syntheticJcimStableJson(cache.normalized.sections));
    expect(validateJcimCache(cache, pdf, syntheticPdfPins)).toBe(false);
  });

  // KIA-jcim-more-articles-2 mutation COUNT-9: only the section-count guard can reject a pinned, self-consistent
  // prefix that drops the last admitted section (ids, pages, article numbers and re-hash all pass).
  it("rejects a pinned self-consistent cache missing the last admitted section", () => {
    const cache = structuredClone(createJcimSourceFixtureCache());
    cache.normalized.sections = cache.normalized.sections.slice(0, -1);
    expect(cache.normalized.sections).toHaveLength(JCIM_SECTION_IDS.length - 1);
    expect(validateJcimCache(pinSections(cache), pdf, syntheticPdfPins)).toBe(false);
  });
});

describe("F2: exact page ranges for all thirteen admitted sections", () => {
  it("pins the sync script PAGES table exactly, in PDF order", () => {
    const script = readFileSync(path.join(process.cwd(), "scripts", "jcim-source-sync.py"), "utf8");
    const table = /^PAGES = \[([\s\S]*?)\]\n/m.exec(script)?.[1] ?? "";
    const tuples = [...table.matchAll(/\("([a-z0-9-]+)", (\d+), (\d+)\)/g)].map((match) => [match[1], Number(match[2]), Number(match[3])]);
    expect(tuples).toEqual(EXPECTED_PAGE_RANGES);
    expect(tuples.map(([id]) => id)).toEqual([...JCIM_SECTION_IDS]);
  });

  it.each(EXPECTED_PAGE_RANGES)("%s admits exactly PDF pages %i-%i", (sectionId, first, last) => {
    for (const page of new Set([first, last])) {
      expect(validateJcimCache(pinSections(withPage(sectionId, page)), pdf, syntheticPdfPins), `${sectionId} page ${page}`).toBe(true);
    }
    for (const page of [first - 1, last + 1]) {
      expect(validateJcimCache(pinSections(withPage(sectionId, page)), pdf, syntheticPdfPins), `${sectionId} page ${page}`).toBe(false);
    }
  });

  it("rejects Article 25 content on the Article 26 pages 179-181", () => {
    for (const page of [179, 180, 181]) {
      expect(validateJcimCache(pinSections(withPage("article-25", page)), pdf, syntheticPdfPins), `page ${page}`).toBe(false);
    }
  });

  it("rejects new-section content on the unadmitted gap pages (Articles 7, 9, 12 and 24)", () => {
    for (const [sectionId, page] of [["article-8", 50], ["article-8", 68], ["article-10", 70], ["article-11", 99],
      ["article-26", 176], ["article-10", 93], ["article-11", 92]] as const) {
      expect(validateJcimCache(pinSections(withPage(sectionId, page)), pdf, syntheticPdfPins), `${sectionId} page ${page}`).toBe(false);
    }
  });
});

function unit(sectionId: string, page: number, index: number, text: string): JcimParagraph {
  return { id: `${sectionId}-pdf${page}-unit${index}`, text, pdfPageNumber: page, printedPageLabel: null,
    articleNumber: sectionId.startsWith("article-") ? sectionId.slice(8) : null, qaId: null, heading: null };
}

// Each section: a heading unit, optional decoy, the intended body unit, then a cross-reference unit.
const SELECTOR_UNITS: Record<string, string[]> = {
  "article-14": ["ARTICLE 14 SAFETY AND HEALTH (SYNTHETIC heading)",
    "SYNTHETIC decoy: see Article 14.10 for an imaginary lantern rule.",
    "Article 14.1 SYNTHETIC body: an invented crew checks a pretend orange ladder.",
    "SYNTHETIC cross-reference: as described in Article 14.1 and 14.2 for paper robots."],
  "article-15": ["ARTICLE 15 SYNTHETIC DISPUTE PROCEDURE heading",
    "Article 15.1 SYNTHETIC body: an imaginary robot records a purple ticket.",
    "SYNTHETIC cross-reference: see Article 15.2 for the invented ticket."],
  "article-16": ["ARTICLE 16 SYNTHETIC DISCIPLINE PROCEDURE heading",
    "Article 16.1 SYNTHETIC body: a fictional lantern review considers a green token.",
    "SYNTHETIC cross-reference: see Article 16.2 for the invented token."],
  "article-17": ["ARTICLE 17 SYNTHETIC STEWARDS heading",
    "Article 17.1 SYNTHETIC body: an imaginary helper sorts cards.",
    "SYNTHETIC cross-reference: see Article 17.2 for the invented cards."],
  "article-25": ["ARTICLE 25 HIGHER LEVEL ASSIGNMENTS (SYNTHETIC heading)",
    "SYNTHETIC decoy: see Article 25.12 for an imaginary silver hat.",
    "Article 25.1 SYNTHETIC body: a fictional robot borrows a silver hat for one shift.",
    "SYNTHETIC cross-reference: invented pay under Article 25.1 and 25.2."],
  "article-27": ["ARTICLE 27 EMPLOYEE CLAIMS (SYNTHETIC heading)",
    "Article 27 provides SYNTHETIC body: an invented claims window for a lost paper kite.",
    "SYNTHETIC cross-reference: the window that Article 27 provides for paper kites."],
  "article-8": ["ARTICLE 8 HOURS OF WORK (SYNTHETIC heading)",
    "Article 8.5.F & 8.5.G SYNTHETIC subheading for invented lantern shifts",
    "Article 8.5.F provides SYNTHETIC body: an imaginary robot limits pretend extra shifts.",
    "SYNTHETIC cross-reference: the limit that Article 8.5.F provides for paper robots."],
  "article-10": ["ARTICLE 10 LEAVE (SYNTHETIC heading)",
    "Article 10.3.A VACATION PLANNING (SYNTHETIC subheading)",
    "Article 10.3.A establishes SYNTHETIC body: an invented calendar for moon-lantern vacations.",
    "SYNTHETIC decoy: Article 10.6 also provides an imaginary paper-kite form.",
    "Article 10.6 provides SYNTHETIC body: an invented hundredth-of-a-lantern minimum charge.",
    "SYNTHETIC cross-reference: the plan Article 10.3.A establishes and the minimum Article 10.6 provides."],
  "article-11": ["ARTICLE 11 HOLIDAYS (SYNTHETIC heading)",
    "SYNTHETIC decoy: Article 11.6. The invented posting lists paper robots.",
    "Article 11.6 HOLIDAY SCHEDULE SYNTHETIC body: an imaginary pecking order for lantern day.",
    "SYNTHETIC cross-reference: see Article 11.6 HOLIDAY SCHEDULE for the invented order."],
  "article-26": ["ARTICLE 26 UNIFORMS AND WORK CLOTHES (SYNTHETIC heading)",
    "Article 26.1",
    "Article 26.1 provides SYNTHETIC body: an invented committee for pretend silver hats.",
    "SYNTHETIC cross-reference: the committee that Article 26.1 provides for paper hats."],
};
const SELECTOR_PAGES: Record<string, number> = {
  "article-8": 51, "article-10": 71, "article-11": 93, "article-14": 134, "article-15": 139, "article-16": 150,
  "article-17": 158, "article-25": 177, "article-26": 179, "article-27": 182,
};

function multiUnitCache(): JcimCache {
  const cache = structuredClone(createJcimSourceFixtureCache());
  cache.normalized.sections = cache.normalized.sections.map((section) => SELECTOR_UNITS[section.id]
    ? { ...section, paragraphs: SELECTOR_UNITS[section.id].map((text, index) => unit(section.id, SELECTOR_PAGES[section.id], index + 1, text)) }
    : section);
  return cache;
}

const SELECTOR_TOPICS = ["safety_health", "higher_level_assignments", "employee_claims", "discipline_just_cause",
  "steward_grievance_handling", "overtime", "annual_leave", "sick_leave", "holiday_scheduling", "uniforms_work_clothes"];

describe("F3: selector precision with heading, decoy, body and cross-reference units", () => {
  const cache = multiUnitCache();
  it.each([
    ["safety_health", ["article-14-pdf134-unit3"]],
    ["higher_level_assignments", ["article-25-pdf177-unit3"]],
    ["employee_claims", ["article-27-pdf182-unit2"]],
    ["discipline_just_cause", ["article-16-pdf150-unit2"]],
    ["steward_grievance_handling", ["article-15-pdf139-unit2", "article-17-pdf158-unit2"]],
    ["overtime", ["article-8-pdf51-unit3"]],
    ["annual_leave", ["article-10-pdf71-unit3"]],
    ["sick_leave", ["article-10-pdf71-unit5"]],
    ["holiday_scheduling", ["article-11-pdf93-unit3"]],
    ["uniforms_work_clothes", ["article-26-pdf179-unit3"]],
  ])("%s selects only the intended body unit", (topicId, expected) => {
    const citations = jcimTopicCitation(cache, topicId);
    expect(citations.map((citation) => citation.paragraphId)).toEqual(expected);
    for (const citation of citations) {
      expect(citation.paragraphId).not.toMatch(/-unit1$/);
      expect(verifyJcimCitation(citation, cache)).not.toBe("paragraph_missing");
    }
  });

  it("finds no unit when only the heading and cross-references remain", () => {
    const stripped = structuredClone(cache);
    for (const section of stripped.normalized.sections) {
      if (!SELECTOR_UNITS[section.id]) continue;
      section.paragraphs = section.paragraphs.filter((paragraph) => !/SYNTHETIC body/.test(paragraph.text) && !/cross-reference/.test(paragraph.text));
    }
    for (const topicId of SELECTOR_TOPICS) {
      expect(jcimTopicCitation(stripped, topicId), topicId).toEqual([]);
    }
  });

  // N4 (review 0f52d313): selection is the FIRST matching unit in PDF order (lib/jcimSource.ts uses
  // paragraphs.find). This pins the current order dependency: correctness relies on the body unit preceding
  // any matching cross-reference, as it does in the official PDF. Order independence would need a lib/ change
  // and is out of scope.
  it("pins the current order dependency: a matching cross-reference placed before the body is selected", () => {
    const reordered = structuredClone(cache);
    for (const section of reordered.normalized.sections) {
      if (!SELECTOR_UNITS[section.id]) continue;
      const crossRef = section.paragraphs.find((paragraph) => /cross-reference/.test(paragraph.text))!;
      section.paragraphs = [crossRef, ...section.paragraphs.filter((paragraph) => paragraph !== crossRef)];
    }
    for (const topicId of SELECTOR_TOPICS) {
      const citations = jcimTopicCitation(reordered, topicId);
      expect(citations.length, topicId).toBeGreaterThan(0);
      for (const citation of citations) {
        const paragraph = reordered.normalized.sections.find((section) => section.id === citation.sectionId)!
          .paragraphs.find((item) => item.id === citation.paragraphId)!;
        expect(paragraph.text, topicId).toMatch(/cross-reference/);
      }
    }
  });
});

describe("F6: CBA-only golden 5 values (scope item 10 placement)", () => {
  it("keeps the CBA-only packet identities unchanged with no JCIM supplemental", () => {
    const sha = (value: string) => createHash("sha256").update(value).digest("hex");
    // The three limitation literals are read from the golden test itself, so both files share one definition.
    const golden = readFileSync(path.join(process.cwd(), "tests", "publicPacketGolden.test.ts"), "utf8");
    const literal = (name: string) => new RegExp(`const ${name} = '([^']+)';`).exec(golden)![1];
    const legacy = literal("legacyLimitation");
    const overtimeLegacy = literal("overtimeLegacyLimitation");
    const displayed = literal("displayedLimitation");
    const source = createCbaSourceFixtureCache();
    const packet = buildPublicStewardPacket({ source, topicIds: ["annual_leave", "overtime"],
      runtimeVersion: createRuntimeVersion({ buildDate: "20260813", gitSha: "printqa1" }), createdAt: "2026-08-13T17:00:00.000Z" })!;
    const stored = packet.limitations.map((item) => item.text).filter((text) => text === legacy || text === overtimeLegacy);
    expect(stored).toEqual([legacy, overtimeLegacy]);
    const original = (value: string) => { let index = 0; return value.replaceAll(displayed, () => stored[index++] ?? legacy); };
    expect({
      serialized: sha(JSON.stringify(packet)),
      contentIdentity: packet.contentIdentity,
      text: sha(original(publicStewardPacketToText(packet))),
      markdown: sha(original(publicStewardPacketToMarkdown(packet))),
      view: sha(original(renderToStaticMarkup(React.createElement(PublicStewardPacketView,
        { packet, source, onCitationNavigate: () => undefined, onSave: () => undefined })))),
    }).toEqual({
      serialized: "3646ba04ebb1f44db727099a8b6c26aa0f0c78d9ff7485e7ac6f961a1d348587",
      contentIdentity: "0d381e7610bf6911c1eb7b3d537f5b99b3940748e900fbbee27f0f8bd6cf7e1b",
      text: "a491e60c703e1b7118cbdbb70c6e1c6608cf0fc927a206a5daa8781fa0a06ec1",
      markdown: "7d5c46fa4e7aad398524fe18c631c3bc4112f4a322fc3e54a4e5bfc7e0129e14",
      view: "e93220a54cdeb2aded0f8e67e25ee4641cfaef11ef90178d7b897797802a4e92",
    });
    expect(packet.supplementalCitations).toBeUndefined();
    expect(packet.supplementalSourceAppendix).toBeUndefined();
  });
});
