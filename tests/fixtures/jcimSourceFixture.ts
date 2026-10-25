import {
  JCIM_AUTHORITY_CLASS, JCIM_AUTHORITY_LABEL, JCIM_BYTES, JCIM_EDITION,
  JCIM_LANDING_URL, JCIM_LAST_MODIFIED, JCIM_NORMALIZED_SHA256, JCIM_PDF_URL,
  JCIM_SECTION_IDS, JCIM_SHA256, JCIM_SOURCE_ID, JCIM_TITLE, type JcimCache,
} from "@/lib/jcimSource";

// SYNTHETIC: invented test prose, never extracted from a source document.
export function createJcimSourceFixtureCache(): JcimCache {
  const pages: Record<string, number> = {
    preface: 3, introduction: 29, "article-8": 51, "article-10": 71, "article-11": 93, "article-14": 134, "article-15": 139,
    "article-16": 150, "article-17": 158, "article-19": 169, "article-25": 177, "article-26": 179, "article-27": 182,
  };
  const texts: Record<string, string[]> = {
    preface: ["SYNTHETIC preface: the imaginary lantern workshop uses this test booklet."],
    introduction: ["SYNTHETIC introduction: paper robots arrange invented examples on blue shelves."],
    "article-8": ["SYNTHETIC Article 8.5.F provides an invented limit on pretend lantern shifts for paper robots."],
    "article-10": ["SYNTHETIC Article 10.3.A establishes an invented calendar for moon-lantern vacations.",
      "SYNTHETIC Article 10.6 provides an invented hundredth-of-a-lantern minimum charge.",
      // KIA-jcim-sick-leave-10-5-1: a heading-only decoy and an "also provides" decoy precede the 10.5 body unit.
      "SYNTHETIC Article 10.5 SICK LEAVE",
      "SYNTHETIC Article 10.5 also provides an invented sick-lantern call-in card.",
      "SYNTHETIC Article 10.5 provides an invented sick-lantern program kept in Section 513 of an imaginary manual."],
    "article-11": ["SYNTHETIC Article 11.6 HOLIDAY SCHEDULE: an imaginary pecking order for lantern day."],
    "article-14": ["SYNTHETIC Article 14.1 SAFETY: an imaginary lantern crew checks a pretend orange ladder."],
    "article-15": ["SYNTHETIC Article 15.1 GRIEVANCE: an imaginary robot records a purple ticket."],
    "article-16": ["SYNTHETIC Article 16.1 JUST CAUSE: a fictional lantern review considers a green token."],
    "article-17": ["SYNTHETIC Article 17.1 REPRESENTATION: an imaginary helper sorts grievance cards."],
    "article-19": ["SYNTHETIC Article 19 provides an invented handbooks and manuals index for moon lanterns."],
    "article-25": ["SYNTHETIC Article 25.1 HIGHER LEVEL: a fictional robot borrows a silver hat for one shift."],
    "article-26": ["SYNTHETIC Article 26.1 provides an invented committee for pretend silver hats."],
    "article-27": ["SYNTHETIC Article 27 provides an invented claims window for a lost paper kite."],
  };
  return {
    schema: "kia-jcim-cache.v1",
    source: { id: JCIM_SOURCE_ID, title: JCIM_TITLE, authorityClass: JCIM_AUTHORITY_CLASS,
      authorityLabel: JCIM_AUTHORITY_LABEL, landingUrl: JCIM_LANDING_URL,
      pdfUrl: JCIM_PDF_URL, edition: JCIM_EDITION, readOnly: true },
    response: { sha256: JCIM_SHA256, byteCount: JCIM_BYTES, lastModified: JCIM_LAST_MODIFIED },
    // Admission metadata only: the test narrowly maps this invented content's hash.
    normalized: { sha256: JCIM_NORMALIZED_SHA256, sectionCount: JCIM_SECTION_IDS.length as JcimCache["normalized"]["sectionCount"],
      sections: JCIM_SECTION_IDS.map((id) => ({
        id, title: `SYNTHETIC ${id}`,
        paragraphs: texts[id].map((text, index) => ({ id: `${id}-pdf${pages[id]}-p0${index + 1}`, text,
          pdfPageNumber: pages[id], printedPageLabel: id === "article-16" ? "16-1" : null,
          articleNumber: id.startsWith("article-") ? id.slice(8) : null,
          qaId: null, heading: `SYNTHETIC ${id} heading` })),
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
