import { normalizedCbaContentForHash, type CbaParagraph, type CbaSourceCache } from "@/lib/cbaSource";
import { cbaFixtureSha256, createCbaSourceFixtureCache } from "./cbaSourceFixture";

/** SYNTHETIC Article 19 extension; invented prose, no document extraction. */
export function createCbaSourceFixtureCacheWithArticle19(): CbaSourceCache {
  const cache = createCbaSourceFixtureCache();
  const page = cache.normalized.pages[126];
  const paragraph = (suffix: string, text: string, sectionNumber: string | null): CbaParagraph => ({
    id: `cba-pdf-p127-${suffix}`, text, contentHash: cbaFixtureSha256(text),
    pdfPageIndex: 126, pdfPageNumber: 127, printedPageLabel: page.printedPageLabel,
    structuralType: "article", articleNumber: "19", articleTitle: "HANDBOOKS AND MANUALS",
    sectionNumber, sectionTitle: sectionNumber ? "General" : null, subsection: null,
  });
  // The decoy tests that selection uses the exact heading and Section 1 matcher.
  const previousCount = page.paragraphs.length;
  page.paragraphs = [
    paragraph("p01", "SYNTHETIC decoy: imaginary manuals live in a yellow drawer.", null),
    // Exact heading tokens are required by the production selector.
    paragraph("p05", "ARTICLE 19 HANDBOOKS AND MANUALS", null),
    paragraph("p06", "Section 1. General SYNTHETIC handbooks and manuals catalogue imaginary lantern colors.", "1"),
  ];
  cache.normalized.paragraphCount += page.paragraphs.length - previousCount;
  cache.normalized.sha256 = cbaFixtureSha256(normalizedCbaContentForHash(cache.normalized.pages, cache.normalized.structures));
  return cache;
}
