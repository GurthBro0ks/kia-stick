import { describe, expect, it } from "vitest";
import { buildCbaAnswer, citationForCbaParagraph } from "@/lib/cbaAnswer";
import { verifyCbaCitation } from "@/lib/cbaCitationIntegrity";
import { CBA_EXPECTED_PDF_PAGES, CBA_SOURCE_ID, CBA_SOURCE_PDF_URL, searchCba } from "@/lib/cbaSource";
import { readBoundedCbaSourceCache } from "@/lib/cbaSourceServer";
import { readBoundedPublicSourceCache } from "@/lib/publicSourceServer";
import {
  buildPublicGrievanceOutline,
  publicGrievanceOutlineEligibility,
} from "@/lib/publicGrievanceOutline";
import { createRuntimeVersion } from "@/lib/version";
import { cbaCitationIdentityKey, dedupeCitations } from "@/lib/sourceModel";
import {
  PUBLIC_STEWARD_WORKFLOW_TOPICS,
  topicParagraphs,
  type PublicStewardWorkflowTopicId,
} from "@/lib/publicStewardWorkflowRegistry";

const requireCache = process.env.KIA_REQUIRE_CBA_SOURCE_CACHE === "1";

const supportedTopicIds: PublicStewardWorkflowTopicId[] = [
  "annual_leave",
  "overtime",
  "holiday_scheduling",
  "safety_health",
  "discipline_just_cause",
  "sick_leave",
  "higher_level_assignments",
  "uniforms_work_clothes",
  "employee_claims",
  "steward_grievance_handling",
];

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

  it("builds the annual-leave grievance outline from the verified local Article 10 and Article 15 anchors", () => {
    const state = readBoundedCbaSourceCache();
    if (state.status === "unavailable") {
      if (requireCache) expect.fail(`required CBA cache unavailable: ${state.reason}`);
      return;
    }
    const runtimeVersion = createRuntimeVersion({ buildDate: "20260723", gitSha: "annual-local" });
    const answer = buildCbaAnswer({
      question: "Can an annual leave request be denied under the CBA?",
      source: state.source,
      nlrbSource: null,
      runtimeVersion,
      mode: "Strict Research",
      scope: "Official-Like",
      detail: "Detailed",
    });
    const eligibility = publicGrievanceOutlineEligibility({ answer, source: state.source });
    const outline = buildPublicGrievanceOutline({
      answer,
      source: state.source,
      createdAt: "2026-07-23T19:20:00.000Z",
    });
    expect(answer.noAnswer).toBe(false);
    expect(eligibility.eligible).toBe(true);
    expect(outline).not.toBeNull();
    expect(outline?.citations.every((citation) => citation.citationVerificationState === "verified_current")).toBe(true);
    expect(new Set(outline?.citations.map((citation) => citation.articleNumber))).toEqual(new Set(["10", "15"]));
  });

  it("builds the overtime grievance outline from the verified local Article 8 and Article 15 anchors", () => {
    const state = readBoundedCbaSourceCache();
    if (state.status === "unavailable") {
      if (requireCache) expect.fail(`required CBA cache unavailable: ${state.reason}`);
      return;
    }
    const runtimeVersion = createRuntimeVersion({ buildDate: "20260724", gitSha: "overtime-local" });
    const answer = buildCbaAnswer({
      question: "How should overtime opportunities be distributed under the CBA?",
      source: state.source,
      nlrbSource: null,
      runtimeVersion,
      mode: "Strict Research",
      scope: "Official-Like",
      detail: "Detailed",
    });
    const eligibility = publicGrievanceOutlineEligibility({ answer, source: state.source });
    const outline = buildPublicGrievanceOutline({
      answer,
      source: state.source,
      createdAt: "2026-07-24T14:30:00.000Z",
    });
    expect(answer.noAnswer).toBe(false);
    expect(eligibility).toMatchObject({ eligible: true, template: "overtime" });
    expect(outline).not.toBeNull();
    expect(outline?.template).toBe("overtime");
    expect(outline?.citations.every((citation) => citation.citationVerificationState === "verified_current")).toBe(true);
    expect(new Set(outline?.citations.map((citation) => citation.articleNumber))).toEqual(new Set(["8", "15"]));
  });

  it("builds every registry topic from verified current local CBA anchors", () => {
    const state = readBoundedCbaSourceCache();
    if (state.status === "unavailable") {
      if (requireCache) expect.fail(`required CBA cache unavailable: ${state.reason}`);
      return;
    }
    const runtimeVersion = createRuntimeVersion({
      buildDate: "20260724",
      gitSha: "workflow-local",
    });
    for (const topic of PUBLIC_STEWARD_WORKFLOW_TOPICS) {
      const answer = buildCbaAnswer({
        question: topic.exampleQuestion,
        source: state.source,
        nlrbSource: null,
        runtimeVersion,
        mode: "Strict Research",
        scope: "Official-Like",
        detail: "Detailed",
      });
      const outline = buildPublicGrievanceOutline({
        answer,
        source: state.source,
        createdAt: "2026-07-24T16:00:00.000Z",
      });
      expect(answer.noAnswer, topic.id).toBe(false);
      expect(outline?.template, topic.id).toBe(topic.id);
      expect(outline?.citations.every(
        (citation) => citation.citationVerificationState === "verified_current"
      ), topic.id).toBe(true);
      expect(new Set(outline?.citations.map((citation) => citation.articleNumber)), topic.id)
        .toEqual(new Set([topic.sourceSufficiency.primaryArticle, "15"]));
    }
  });

  it("resolves every configured topic citation spec and source-sufficiency declaration against the real cache", () => {
    const state = readBoundedCbaSourceCache();
    if (state.status === "unavailable") {
      if (requireCache) expect.fail(`required CBA cache unavailable: ${state.reason}`);
      return;
    }
    expect(PUBLIC_STEWARD_WORKFLOW_TOPICS.map((topic) => topic.id)).toEqual(supportedTopicIds);
    expect(new Set(PUBLIC_STEWARD_WORKFLOW_TOPICS.map((topic) => topic.id))).toHaveLength(10);

    const paragraphs = state.source.normalized.pages.flatMap((page) => page.paragraphs);
    const availableArticles = new Set(
      paragraphs.map((paragraph) => paragraph.articleNumber).filter(Boolean)
    );
    for (const topic of PUBLIC_STEWARD_WORKFLOW_TOPICS) {
      expect(topic.requiredSourceId, topic.id).toBe(state.source.source.id);
      expect(topic.sourceSufficiency.status, topic.id).toBe("supported");
      expect(topic.requiredArticles, topic.id).toEqual([
        topic.sourceSufficiency.primaryArticle,
        ...topic.sourceSufficiency.supportingArticles,
      ]);
      expect(topic.requiredArticles.every((article) => availableArticles.has(article)), topic.id).toBe(true);
      expect(topic.localVerification.trim().length, topic.id).toBeGreaterThan(0);

      const resolved = topicParagraphs(paragraphs, topic);
      expect(resolved, topic.id).not.toBeNull();
      expect([...resolved!.keys()], topic.id).toEqual(topic.citationSpecs.map((spec) => spec.key));
      expect(resolved!.size, topic.id).toBe(topic.citationSpecs.length);
      expect(resolved!.size, topic.id).toBeGreaterThanOrEqual(topic.sourceSufficiency.minimumTopicParagraphs);
      const resolvedCitations = [...resolved!.values()].map((paragraph) =>
        citationForCbaParagraph(state.source, paragraph)
      );
      expect(dedupeCitations(resolvedCitations).map(cbaCitationIdentityKey), topic.id).toEqual(
        [...new Set(resolvedCitations.map(cbaCitationIdentityKey))]
      );
      for (const spec of topic.citationSpecs) {
        const paragraph = resolved!.get(spec.key)!;
        expect(paragraph.articleNumber, `${topic.id}:${spec.key}`).toBe(spec.articleNumber);
        expect(spec.matches(paragraph), `${topic.id}:${spec.key}`).toBe(true);
        const citation = citationForCbaParagraph(state.source, paragraph);
        expect(citation.sourceInstanceId, `${topic.id}:${spec.key}`).toMatch(/^[a-f0-9]{64}$/);
        expect(citation.paragraphContentSha256, `${topic.id}:${spec.key}`).toMatch(/^[a-f0-9]{64}$/);
        expect(citation.citationAnchorSha256, `${topic.id}:${spec.key}`).toMatch(/^[a-f0-9]{64}$/);
        expect(verifyCbaCitation(citation, state.source).state, `${topic.id}:${spec.key}`).toBe("verified_current");
      }
    }
  });

  it("fails closed for invalid real-cache paragraph, anchor, paragraph hash, and source identities", () => {
    const state = readBoundedCbaSourceCache();
    if (state.status === "unavailable") {
      if (requireCache) expect.fail(`required CBA cache unavailable: ${state.reason}`);
      return;
    }
    const topic = PUBLIC_STEWARD_WORKFLOW_TOPICS[0];
    const resolved = topicParagraphs(
      state.source.normalized.pages.flatMap((page) => page.paragraphs),
      topic
    );
    expect(resolved).not.toBeNull();
    const citation = citationForCbaParagraph(state.source, resolved!.values().next().value!);

    expect(verifyCbaCitation({ ...citation, paragraphId: "invalid-real-cache-paragraph" }, state.source).state)
      .not.toBe("verified_current");
    expect(verifyCbaCitation({ ...citation, citationAnchorSha256: "0".repeat(64) }, state.source).state)
      .not.toBe("verified_current");
    expect(verifyCbaCitation({ ...citation, paragraphContentSha256: "1".repeat(64) }, state.source).state)
      .not.toBe("verified_current");
    expect(verifyCbaCitation({ ...citation, sourceId: "wrong-source-instance" }, state.source).state)
      .not.toBe("verified_current");
  });
});
