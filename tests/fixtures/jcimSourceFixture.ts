import {
  JCIM_AUTHORITY_CLASS, JCIM_AUTHORITY_LABEL, JCIM_BYTES, JCIM_EDITION,
  JCIM_LANDING_URL, JCIM_LAST_MODIFIED, JCIM_NORMALIZED_SHA256, JCIM_PDF_URL,
  JCIM_SECTION_IDS, JCIM_SHA256, JCIM_SOURCE_ID, JCIM_TITLE, type JcimCache,
} from "@/lib/jcimSource";

// SYNTHETIC: invented test prose, never extracted from a source document.
export function createJcimSourceFixtureCache(): JcimCache {
  const pages = [3, 29, 139, 150, 158, 169];
  const texts = [
    "SYNTHETIC preface: the imaginary lantern workshop uses this test booklet.",
    "SYNTHETIC introduction: paper robots arrange invented examples on blue shelves.",
    "SYNTHETIC Article 15.1 GRIEVANCE: an imaginary robot records a purple ticket.",
    "SYNTHETIC Article 16.1 JUST CAUSE: a fictional lantern review considers a green token.",
    "SYNTHETIC Article 17.1 REPRESENTATION: an imaginary helper sorts grievance cards.",
    "SYNTHETIC Article 19 provides an invented handbooks and manuals index for moon lanterns.",
  ];
  return {
    schema: "kia-jcim-cache.v1",
    source: { id: JCIM_SOURCE_ID, title: JCIM_TITLE, authorityClass: JCIM_AUTHORITY_CLASS,
      authorityLabel: JCIM_AUTHORITY_LABEL, landingUrl: JCIM_LANDING_URL,
      pdfUrl: JCIM_PDF_URL, edition: JCIM_EDITION, readOnly: true },
    response: { sha256: JCIM_SHA256, byteCount: JCIM_BYTES, lastModified: JCIM_LAST_MODIFIED },
    // Admission metadata only: the test narrowly maps this invented content's hash.
    normalized: { sha256: JCIM_NORMALIZED_SHA256, sectionCount: 6,
      sections: JCIM_SECTION_IDS.map((id, index) => ({
        id, title: `SYNTHETIC ${id}`,
        paragraphs: [{ id: `${id}-pdf${pages[index]}-p01`, text: texts[index],
          pdfPageNumber: pages[index], printedPageLabel: id === "article-16" ? "16-1" : null,
          articleNumber: id.startsWith("article-") ? id.slice(8) : null,
          qaId: null, heading: `SYNTHETIC ${id} heading` }],
      })) },
  };
}

// Generated at runtime; deliberately not a committed PDF or actual document.
export function createSyntheticJcimPdfBytes(): Buffer<ArrayBuffer> {
  return Buffer.from(Uint8Array.from({ length: JCIM_BYTES }, (_, index) => (index % 251) + 1));
}

export function syntheticJcimStableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(syntheticJcimStableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${syntheticJcimStableJson(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

// Exact additional synthetic input for the isolated mocked-hash length guard.
export function createSyntheticShortJcimPdfBytes(): Buffer<ArrayBuffer> {
  return Buffer.from(createSyntheticJcimPdfBytes().subarray(0, JCIM_BYTES - 1));
}
