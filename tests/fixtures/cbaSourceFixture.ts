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
      if (articleNumber === 8) {
        lines.push(
          "",
          "Section 5. Overtime Assignments",
          "",
          "When needed, overtime work for regular full-time employees shall be scheduled among qualified employees doing similar work in the work location where the employees regularly work. Two weeks before each calendar quarter, employees desiring overtime shall place their names on an Overtime Desired List. Lists will be established by craft, section, or tour under local implementation.",
          "",
          "When overtime arises, employees with the necessary skills who listed their names will be selected in order of their seniority on a rotating basis. Those absent or on leave shall be passed over. If the voluntary Overtime Desired List does not provide sufficient qualified people, qualified full-time regular employees not on the list may be required to work overtime on a rotating basis, beginning with the junior employee.",
          "",
          "Employees on the Overtime Desired List shall be limited to no more than twelve (12) hours of work in a day and no more than sixty (60) hours in a service week. The Employer is not required to utilize employees on the Overtime Desired List at the penalty overtime rate when qualified listed employees not yet entitled to penalty overtime are available."
        );
      }
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
      if (articleNumber === 11) {
        lines.push(
          "",
          "Section 1. Holidays Observed",
          "",
          "The following eleven (11) days shall be considered holidays for full-time and part-time regular scheduled employees.",
          "",
          "Section 6. Holiday Schedule",
          "",
          "The Employer will determine the number and categories of employees needed for holiday work and a schedule shall be posted as of the Tuesday preceding the service week in which the holiday falls.",
          "",
          "As many full-time and part-time regular schedule employees as can be spared will be excused from duty on a holiday or day designated as their holiday. Such employees will not be required to work unless the stated categories and scheduling sequence have been exhausted, subject to the applicable Local Memorandum of Understanding."
        );
      }
      if (articleNumber === 14) {
        lines.push(
          "",
          "Section 1. Responsibilities",
          "",
          "It is the responsibility of management to provide safe working conditions in all present and future installations and to develop a safe working force.",
          "",
          "Section 2. Cooperation",
          "",
          "The Employer and the Union insist on correction of unsafe conditions. An employee may notify the supervisor, who will immediately investigate the condition and take corrective action if necessary, notify a steward, or use the stated grievance procedure.",
          "",
          "A safety grievance not resolved at Step 2 may be appealed to the Local Safety and Health Committee or appealed directly to arbitration within 21 days after receipt of the Employer's Step 2 decision."
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
        lines.push(
          "",
          "Section 1. Principles",
          "",
          "A basic principle shall be that discipline should be corrective in nature, rather than punitive. No employee may be disciplined or discharged except for just cause.",
          "",
          "Any such discipline or discharge shall be subject to the grievance-arbitration procedure provided for in this Agreement.",
          "",
          "Section 8. Review of Discipline",
          "",
          "No supervisor may impose suspension or discharge unless the proposed disciplinary action has first been reviewed and concurred in by the installation head or designee."
        );
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
