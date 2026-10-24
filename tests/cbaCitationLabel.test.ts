import { describe, expect, it } from "vitest";
import { citationForCbaParagraph } from "@/lib/cbaAnswer";
import { citationLabel } from "@/lib/sourceModel";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";

// NB-E3: CBA citation labels showed the raw sectionId ("Section section-6") and "Article unknown · Section section-unknown".
const source = createCbaSourceFixtureCacheWithArticle19();
const paragraphs = source.normalized.pages.flatMap((page) => page.paragraphs);

describe("NB-E3: CBA citation label locator", () => {
  it("shows the section number, never the raw sectionId", () => {
    const paragraph = paragraphs.find((item) => item.articleNumber && item.sectionNumber)!;
    const label = citationLabel(citationForCbaParagraph(source, paragraph));
    expect(label).toContain(`· Article ${paragraph.articleNumber} · Section ${paragraph.sectionNumber} · PDF`);
    expect(label).not.toContain("section-");
  });
  it("drops an unknown section and keeps the article", () => {
    const paragraph = paragraphs.find((item) => item.articleNumber && !item.sectionNumber)!;
    const label = citationLabel(citationForCbaParagraph(source, paragraph));
    expect(label).toContain(`· Article ${paragraph.articleNumber} · PDF`);
    expect(label).not.toMatch(/unknown · PDF|section-unknown/);
  });
  it("says section unknown once when neither article nor section is known", () => {
    const paragraph = { ...paragraphs[0], articleNumber: null, sectionNumber: null };
    const label = citationLabel(citationForCbaParagraph(source, paragraph));
    expect(label).toContain("apwu-usps-cba-2024-2027 · section unknown · PDF");
    expect(label).not.toContain("Article unknown");
  });
});
