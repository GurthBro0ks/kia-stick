import { describe, expect, it } from "vitest";
import { type JcimCache, type JcimParagraph, jcimTopicCitation } from "@/lib/jcimSource";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-sick-leave-10-5-1: sick_leave cites the JCIM Article 10.5 unit (sick leave program, ELM Section 513),
// not the Article 10.6 minimum-charge unit. SYNTHETIC text only; decoys are placed BEFORE the target because
// jcimTopicCitation picks the first matching unit in section order.

const TARGET = "Article 10.5 provides SYNTHETIC body: an invented sick-lantern program kept in Section 513 of an imaginary manual.";
const DECOYS = [
  "ARTICLE 10 LEAVE (SYNTHETIC heading)",
  "Article 10.5 SICK LEAVE (SYNTHETIC heading-only unit)",
  "SYNTHETIC cross-reference: Article 10.5 also governs an imaginary sick-kite form.",
  "SYNTHETIC decoy: Article 10.5 also provides an imaginary sick-kite form.",
  "SYNTHETIC decoy: see Article 10.5 and Section 513 of an imaginary manual.",
  "Article 10.6 provides SYNTHETIC decoy: an invented hundredth-of-a-lantern minimum charge.",
  "SYNTHETIC decoy: Article 10.6 also provides an imaginary paper-kite form.",
  "Article 10.4 provides SYNTHETIC decoy: an invented lantern-rest rule.",
  "Article 10.50 provides SYNTHETIC decoy: an invented out-of-range lantern number.",
  "SYNTHETIC decoy: Article 10.5provides runs two words together.",
];

function unit(index: number, text: string): JcimParagraph {
  return { id: `article-10-pdf81-unit${index}`, text, pdfPageNumber: 81, printedPageLabel: null,
    articleNumber: "10", qaId: null, heading: null };
}

function withArticle10(texts: string[]): JcimCache {
  const cache = structuredClone(createJcimSourceFixtureCache());
  cache.normalized.sections = cache.normalized.sections.map((section) => section.id === "article-10"
    ? { ...section, paragraphs: texts.map((text, index) => unit(index + 1, text)) } : section);
  return cache;
}

describe("KIA-jcim-sick-leave-10-5-1: sick_leave selects the Article 10.5 unit", () => {
  it("skips every decoy placed before the 10.5 body unit", () => {
    const citations = jcimTopicCitation(withArticle10([...DECOYS, TARGET]), "sick_leave");
    expect(citations.map((citation) => citation.paragraphId)).toEqual([`article-10-pdf81-unit${DECOYS.length + 1}`]);
    expect(citations[0].section).toBe("Article 10.5");
    expect(citations[0].articleNumber).toBe("10");
  });

  it.each(DECOYS.map((decoy, index) => [index, decoy] as const))("decoy %i alone is never selected: %s", (_index, decoy) => {
    expect(jcimTopicCitation(withArticle10([decoy]), "sick_leave")).toEqual([]);
    expect(jcimTopicCitation(withArticle10([decoy, TARGET]), "sick_leave").map((citation) => citation.paragraphId))
      .toEqual(["article-10-pdf81-unit2"]);
  });

  it("finds no sick_leave unit when only decoys remain", () => {
    expect(jcimTopicCitation(withArticle10(DECOYS), "sick_leave")).toEqual([]);
  });

  it("does not move annual_leave off Article 10.3.A", () => {
    const cache = withArticle10(["Article 10.3.A establishes SYNTHETIC body: an invented vacation calendar.", ...DECOYS, TARGET]);
    expect(jcimTopicCitation(cache, "annual_leave").map((citation) => citation.paragraphId)).toEqual(["article-10-pdf81-unit1"]);
    expect(jcimTopicCitation(cache, "sick_leave").map((citation) => citation.paragraphId))
      .toEqual([`article-10-pdf81-unit${DECOYS.length + 2}`]);
  });

  it("the shared synthetic fixture cites its Article 10.5 Section 513 unit, not 10.6", () => {
    const cache = createJcimSourceFixtureCache();
    const [citation] = jcimTopicCitation(cache, "sick_leave");
    expect(citation.paragraphId).toBe("article-10-pdf71-p05");
    expect(citation.section).toBe("Article 10.5");
    const paragraph = cache.normalized.sections.find((section) => section.id === "article-10")!
      .paragraphs.find((item) => item.id === citation.paragraphId)!;
    expect(paragraph.text).toMatch(/Section 513/);
    expect(jcimTopicCitation(cache, "annual_leave").map((item) => item.paragraphId)).toEqual(["article-10-pdf71-p01"]);
  });
});
