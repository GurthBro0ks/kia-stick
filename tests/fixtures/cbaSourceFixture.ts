import { createHash } from "node:crypto";
import {
  CBA_CACHE_SCHEMA,
  CBA_CONTROLLING_SCOPE,
  CBA_DOCUMENT_STATUS,
  CBA_EFFECTIVE_END,
  CBA_EFFECTIVE_START,
  CBA_EXPECTED_PDF_PAGES,
  CBA_LEGAL_ADVICE,
  CBA_SCOPE_REQUIRES_FACT_MATCH,
  CBA_SOURCE_ACCESS_MODE,
  CBA_SOURCE_CLASS,
  CBA_SOURCE_ID,
  CBA_SOURCE_OWNER,
  CBA_SOURCE_PAGE_URL,
  CBA_SOURCE_PDF_URL,
  CBA_SOURCE_SENSITIVITY,
  CBA_SOURCE_TITLE,
  normalizeExtractedCbaText,
  type CbaSourceCache,
} from "@/lib/cbaSource";

export function cbaFixtureSha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export const cbaFixturePdfBytes = Buffer.from("%PDF-fixture-bounded-cba", "utf8");

export function syntheticCbaExtraction(): string {
  const pages = Array.from({ length: CBA_EXPECTED_PDF_PAGES }, (_, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const lines = [
      `Official CBA fixture page ${pageNumber}`,
      "",
      `Deterministic contract paragraph on PDF page ${pageNumber} for exact lexical indexing and stable citation validation.`,
      "",
      `Additional bounded fixture paragraph ${pageNumber} preserves page boundaries without private or case data.`,
    ];
    if (pageIndex === 5) lines.unshift("PREAMBLE", "AGREEMENT SCOPE", "");
    for (let articleNumber = 1; articleNumber <= 43; articleNumber += 1) {
      if (pageIndex !== 10 + (articleNumber - 1) * 4) continue;
      lines.unshift(`ARTICLE ${articleNumber}`, `ARTICLE ${articleNumber} FIXTURE TITLE`, "");
      if (articleNumber === 10) {
        lines.push(
          "",
          "Section 2. Leave Regulations",
          "",
          "Career employees will be given preference over noncareer employees when scheduling annual leave. This preference will take into consideration that scheduling is done on a tour-by-tour basis and that employee skills are a determining factor in this decision.",
          "",
          "Section 3. Choice of Vacation Period",
          "",
          "It is agreed to establish a nationwide program for vacation planning with emphasis upon the choice vacation period. The duration of the choice vacation period shall be determined pursuant to local implementation procedures. Annual leave shall be granted in the choice period within the stated employee options, and the remainder may be granted at other times as requested.",
          "",
          "Section 4. Vacation Planning",
          "",
          "The installation head shall determine a final date for submission of applications for vacation periods and provide official notice to each employee of the vacation schedule approved for each employee. A procedure in each office for submission of applications for annual leave for periods other than the choice period may be established pursuant to the local implementation procedure.",
          "",
          "All advance commitments for granting annual leave must be honored except in serious emergency situations."
        );
      }
      if (articleNumber === 15) {
        lines.push(
          "",
          "Section 1. Definition",
          "",
          "A grievance is defined as a dispute, difference, disagreement or complaint between the parties related to wages, hours, and conditions of employment. A grievance includes a complaint involving interpretation, application of, or compliance with this Agreement or any Local Memorandum of Understanding not in conflict with this Agreement.",
          "",
          "Section 2. Grievance Procedure Steps",
          "",
          "Step 1: (a) Any employee who feels aggrieved must discuss the grievance with the immediate supervisor within fourteen (14) days of the date on which the employee or Union first learned or may reasonably have been expected to have learned of its cause.",
          "",
          "(c) If no resolution is reached the supervisor shall render a decision stating the reasons. (d) The Union shall be entitled to appeal an adverse decision to Step 2 within ten (10) days after receipt of the supervisor decision. The standard grievance form shall include a detailed statement of facts, contentions, particular contractual provisions involved, and remedy sought.",
          "",
          "Step 2: (d) The Union representative and Employer representative shall make full and detailed statements of facts and contractual provisions relied upon. The parties shall cooperate fully to develop all necessary facts, including the exchange of copies of all relevant papers or documents."
        );
      }
      if (articleNumber === 16) {
        lines.push("", "Section 1. Principles", "", "Discipline should be corrective rather than punitive. No employee may be disciplined or discharged except for just cause. Discipline is subject to the grievance-arbitration procedure.");
      }
      if (articleNumber === 17) {
        lines.push("", "Section 1. Stewards", "", "Stewards may be designated for investigating, presenting and adjusting grievances.", "", "Section 3. Rights of Stewards", "", "A permission request shall not be unreasonably denied, and time reasonably necessary to write a grievance is compensated.");
      }
    }
    if (pageIndex === 190) lines.unshift("APPENDIX A — FIXTURE APPENDIX", "");
    if (pageIndex === 200) lines.unshift("MEMORANDUM OF UNDERSTANDING — FIXTURE MOU", "");
    if (pageIndex !== 0) lines.push("", String(pageNumber - 10));
    return lines.join("\n");
  });
  return `${pages.join("\f")}\f`;
}

export function createCbaSourceFixtureCache(): CbaSourceCache {
  const extracted = syntheticCbaExtraction();
  const normalized = normalizeExtractedCbaText(extracted, (value) => cbaFixtureSha256(value));
  return {
    schema: CBA_CACHE_SCHEMA,
    source: {
      id: CBA_SOURCE_ID,
      title: CBA_SOURCE_TITLE,
      owner: CBA_SOURCE_OWNER,
      sourcePageUrl: CBA_SOURCE_PAGE_URL,
      pdfUrl: CBA_SOURCE_PDF_URL,
      finalUrl: CBA_SOURCE_PDF_URL,
      sourceClass: CBA_SOURCE_CLASS,
      documentStatus: CBA_DOCUMENT_STATUS,
      sensitivity: CBA_SOURCE_SENSITIVITY,
      accessMode: CBA_SOURCE_ACCESS_MODE,
      effectiveStart: CBA_EFFECTIVE_START,
      effectiveEnd: CBA_EFFECTIVE_END,
      controllingForCoveredEmployees: CBA_CONTROLLING_SCOPE,
      scopeRequiresFactMatch: CBA_SCOPE_REQUIRES_FACT_MATCH,
      legalAdvice: CBA_LEGAL_ADVICE,
      readOnly: true,
    },
    retrievedAt: "2026-07-17T14:00:00.000Z",
    response: {
      contentType: "application/pdf",
      byteCount: cbaFixturePdfBytes.byteLength,
      sha256: cbaFixtureSha256(cbaFixturePdfBytes),
      redirectChain: [CBA_SOURCE_PDF_URL],
    },
    extraction: {
      tool: "pdftotext",
      toolVersion: "pdftotext version fixture",
      pdfinfoVersion: "pdfinfo version fixture",
      pageCount: CBA_EXPECTED_PDF_PAGES,
      characterCount: extracted.length,
      nonEmptyPageCount: CBA_EXPECTED_PDF_PAGES,
      emptyPageCount: 0,
      pageDelimiterCount: CBA_EXPECTED_PDF_PAGES,
      sha256: cbaFixtureSha256(extracted),
    },
    normalized,
  };
}
