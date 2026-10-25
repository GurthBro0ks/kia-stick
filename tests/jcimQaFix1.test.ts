import { describe, expect, it } from "vitest";
import { cannedQuestions } from "@/lib/answerGovernor";
import { createChatSubmitSnapshot, resolveChatAnswerLane, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { jcimCitation, type JcimCache } from "@/lib/jcimSource";
import { citationLabel } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-qa-fix-1: owner QA t766u regressions, in plain phrasing, on synthetic CBA + existing synthetic JCIM fixtures.
const cbaSource = createCbaSourceFixtureCacheWithArticle19();
const jcimSource = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261024", gitSha: "qa-fix-1" });

function ask(question: string) {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "Official-Like", detail: "Detailed" });
  return { snapshot, answer: routeChatQuestion({ question, snapshot, publicSource: null, cbaSource, jcimSource, runtimeVersion }) };
}

const qaTopics = [
  ["Annual Leave", "How much annual leave do I get?", "10", "Article 10.3.A"],
  ["Annual Leave (alt)", "How does annual leave work?", "10", "Article 10.3.A"],
  ["Sick Leave", "How does sick leave work?", "10", "Article 10.5"],
  ["Safety and Health", "What are my rights on an unsafe condition?", "14", "Article 14.1"],
  ["Safety and Health (alt)", "What about safety and health?", "14", "Article 14.1"],
  ["Overtime", "How does overtime work?", "8", "Article 8.5.F"],
  ["Holiday", "How does holiday scheduling work?", "11", "Article 11.6"],
  ["Uniforms", "How does the uniform allowance work?", "26", "Article 26.1"],
  ["Higher Level", "How does higher level pay work?", "25", "Article 25.1"],
  ["Employee Claim", "How do I file an employee claim?", "27", "Article 27"],
] as const;

describe("KIA-jcim-qa-fix-1 plain-phrasing routing to official CBA + mapped JCIM", () => {
  it.each(qaTopics)("%s: %s", (_topic, question, article, locator) => {
    const { snapshot, answer } = ask(question);
    expect(resolveChatAnswerLane(question, "auto")).toBe("cba");
    expect(snapshot.sourceMode).toBe("cba");
    expect(answer.noAnswer).toBe(false);
    expect(answer.version.provider).not.toBe("local-fake-deterministic");
    expect(answer.citations.every((citation) => citation.publicSourceType === "cba_contract" || citation.publicSourceType === "jcim_joint_interpretation")).toBe(true);
    expect(answer.citations.some((citation) => citation.publicSourceType === "cba_contract")).toBe(true);
    const jcim = answer.citations.filter((citation) => citation.publicSourceType === "jcim_joint_interpretation");
    expect(jcim).toHaveLength(1);
    expect(jcim[0].articleNumber).toBe(article);
    const paragraph = jcimSource.normalized.sections.find((section) => section.id === jcim[0].sectionId)
      ?.paragraphs.find((item) => item.id === jcim[0].paragraphId);
    expect(paragraph?.text).toContain(`${locator} `);
    expect(citationLabel(jcim[0])).toContain(locator);
  });

  it("never silently answers an official-topic question from fake samples", () => {
    for (const question of ["How much vacation do I get?", "Can my leave request be denied?"]) {
      expect(resolveChatAnswerLane(question, "auto")).not.toBe("fake");
      expect(ask(question).answer.version.provider).not.toBe("local-fake-deterministic");
    }
  });

  it("keeps the fake-sample path where it is explicitly labelled or selected", () => {
    expect(resolveChatAnswerLane("Can annual leave be denied after I submitted inside the fake window?", "auto")).toBe("fake");
    expect(resolveChatAnswerLane("How much annual leave do I get?", "fake")).toBe("fake");
    for (const question of cannedQuestions) expect(resolveChatAnswerLane(question, "auto")).toBe("fake");
  });
});

describe("KIA-jcim-qa-fix-1 JCIM citation render", () => {
  it("renders every routed citation label without undefined", () => {
    for (const [, question] of qaTopics) {
      for (const citation of ask(question).answer.citations) expect(citationLabel(citation)).not.toMatch(/undefined|null/);
    }
  });

  it("renders a real-shaped JCIM unit (heading null, unit index id) with its section locator", () => {
    const realShaped: JcimCache = structuredClone(jcimSource);
    const section = realShaped.normalized.sections.find((item) => item.id === "article-11")!;
    section.paragraphs = [{ ...section.paragraphs[0], id: "article-11-pdf95-unit1", heading: null, pdfPageNumber: 95,
      printedPageLabel: "11-3", text: "SYNTHETIC Article 11.6 HOLIDAY SCHEDULE: an imaginary pecking order for lantern day." }];
    const label = citationLabel(jcimCitation(realShaped, section, section.paragraphs[0]));
    expect(label).toBe("apwu-usps-jcim-2025 · Article 11.6 · PDF 95 · printed 11-3 · article-11-pdf95-unit1 · verified current source");
    expect(label).not.toContain("retrieved");
  });
});
