import {
  JCIM_AUTHORITY_CLASS,
  JCIM_AUTHORITY_LABEL,
  JCIM_BYTES,
  JCIM_EDITION,
  JCIM_LANDING_URL,
  JCIM_LAST_MODIFIED,
  JCIM_PDF_URL,
  JCIM_SECTION_IDS,
  JCIM_SHA256,
  JCIM_SOURCE_ID,
  JCIM_TITLE,
  type JcimCache,
} from "@/lib/jcimSource";

// Invented test data only; these paragraphs do not reproduce any source document.
export function createJcimSyntheticFixtureCache(): JcimCache {
  return {
    schema: "kia-jcim-cache.v1",
    source: {
      id: JCIM_SOURCE_ID,
      title: JCIM_TITLE,
      authorityClass: JCIM_AUTHORITY_CLASS,
      authorityLabel: JCIM_AUTHORITY_LABEL,
      landingUrl: JCIM_LANDING_URL,
      pdfUrl: JCIM_PDF_URL,
      edition: JCIM_EDITION,
      readOnly: true,
    },
    response: {
      sha256: JCIM_SHA256,
      byteCount: JCIM_BYTES,
      lastModified: JCIM_LAST_MODIFIED,
    },
    normalized: {
      sha256: "0123456789abcdef".repeat(4), // Synthetic marker, not a document hash.
      sectionCount: JCIM_SECTION_IDS.length as JcimCache["normalized"]["sectionCount"],
      sections: JCIM_SECTION_IDS.map((id, index) => {
        const articleNumber = id.startsWith("article-") ? id.slice("article-".length) : null;
        const text = id === "article-15"
          ? "SYNTHETIC TEST FIXTURE: Article 15.1 GRIEVANCE example uses an imaginary violet folder to exercise citation rendering."
          : id === "article-16"
            ? "SYNTHETIC TEST FIXTURE: Article 16.1 JUST CAUSE example uses an imaginary amber card to exercise citation rendering."
            : id === "article-17"
              ? "SYNTHETIC TEST FIXTURE: Article 17.1 REPRESENTATION example uses an imaginary teal token to exercise citation rendering."
              : `SYNTHETIC TEST FIXTURE: Invented ${id} placeholder for citation tests; no contractual guidance.`;
        return {
          id,
          title: `SYNTHETIC TEST FIXTURE: ${id}`,
          paragraphs: [{
            id: `synthetic-${id}-paragraph-1`,
            text,
            pdfPageNumber: index + 1,
            printedPageLabel: null,
            articleNumber,
            qaId: null,
            heading: `SYNTHETIC TEST FIXTURE: ${id}`,
          }],
        };
      }),
    },
  };
}
