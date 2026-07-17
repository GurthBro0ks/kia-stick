import { describe, expect, it } from "vitest";
import { buildCbaAnswer } from "@/lib/cbaAnswer";
import { CBA_EXPECTED_PDF_PAGES, CBA_SOURCE_ID, CBA_SOURCE_PDF_URL, searchCba } from "@/lib/cbaSource";
import { readBoundedCbaSourceCache } from "@/lib/cbaSourceServer";
import { readBoundedPublicSourceCache } from "@/lib/publicSourceServer";
import { createRuntimeVersion } from "@/lib/version";

const requireCache = process.env.KIA_REQUIRE_CBA_SOURCE_CACHE === "1";

describe("local exact official CBA integration", () => {
  it("loads only the fixed PDF/cache pair or reports safe absence", () => {
    const state = readBoundedCbaSourceCache();
    if (requireCache) expect(state.status).toBe("available");
    if (state.status === "unavailable") {
      expect(state.reason).toBe("cache_missing");
      return;
    }
    expect(state.source.source.id).toBe(CBA_SOURCE_ID);
    expect(state.source.source.pdfUrl).toBe(CBA_SOURCE_PDF_URL);
    expect(state.source.extraction.pageCount).toBe(CBA_EXPECTED_PDF_PAGES);
    expect(state.source.normalized.articleCount).toBe(43);
    expect(state.source.normalized.paragraphCount).toBeGreaterThan(500);
  });

  it("answers all CBA demonstrations from real local anchors when present", () => {
    const state = readBoundedCbaSourceCache();
    if (state.status === "unavailable") {
      if (requireCache) expect.fail(`required CBA cache unavailable: ${state.reason}`);
      return;
    }
    const nlrb = readBoundedPublicSourceCache();
    const runtimeVersion = createRuntimeVersion({ buildDate: "20260717", gitSha: "cba-local" });
    const common = {
      source: state.source,
      nlrbSource: nlrb.status === "available" ? nlrb.source : null,
      runtimeVersion,
      mode: "Strict Research" as const,
      scope: "Official-Like" as const,
      detail: "Detailed" as const,
    };
    const answers = [
      "How many days do I have to file a grievance?",
      "What does Article 17 say about representation?",
      "What are the just-cause and discipline protections?",
      "Does the NLRB Weingarten page override the APWU-USPS CBA?",
    ].map((question) => buildCbaAnswer({ ...common, question }));
    expect(answers.every((answer) => !answer.noAnswer)).toBe(true);
    expect(answers[0].citations[0]).toMatchObject({ articleNumber: "15", sectionId: "section-2", subsection: "Step 1(a)", pdfPageNumber: 97, printedPageLabel: "83" });
    expect(answers[1].citations.some((citation) => citation.articleNumber === "17")).toBe(true);
    expect(answers[2].citations.some((citation) => citation.articleNumber === "16")).toBe(true);
    expect(answers[3].shortAnswer).toContain("No automatic override");
    const search = searchCba(state.source, "Article 15 grievance", 5);
    expect(search[0].paragraph.articleNumber).toBe("15");
  });
});
