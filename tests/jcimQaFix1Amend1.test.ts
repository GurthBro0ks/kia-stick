import { describe, expect, it } from "vitest";
import { createChatSubmitSnapshot, resolveChatAnswerLane, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { jcimCitation } from "@/lib/jcimSource";
import { publicStewardWorkflowMatch } from "@/lib/publicStewardWorkflowRegistry";
import { citationLabel } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-qa-fix-1 Amendment 1 (review 9ad386e6 NB-1/NB-2/NB-3/NB-5); synthetic CBA + existing synthetic JCIM fixtures.
const cbaSource = createCbaSourceFixtureCacheWithArticle19();
const jcimSource = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261024", gitSha: "qa-fix-1-amend-1" });

function ask(question: string) {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "All Fake", detail: "Detailed" });
  return { snapshot, answer: routeChatQuestion({ question, snapshot, publicSource: null, cbaSource, jcimSource, runtimeVersion, threadHistory: [] }) };
}

const everyday = [
  ["annual_leave", "How much vacation do I get?", "Article 10.3.A"],
  ["annual_leave", "How does vacation work?", "Article 10.3.A"],
  ["annual_leave", "How much PTO do I get?", "Article 10.3.A"],
  ["annual_leave", "Can I take time off next week?", "Article 10.3.A"],
  ["sick_leave", "How many sick days do I get?", "Article 10.5"],
  ["sick_leave", "What happens if I call in sick?", "Article 10.5"],
  ["sick_leave", "I called in sick yesterday. What now?", "Article 10.5"],
  ["safety_health", "Can my supervisor make me work in a dangerous area?", "Article 14.1"],
  ["safety_health", "Can I report a hazard?", "Article 14.1"],
  ["safety_health", "Can I file an OSHA complaint?", "Article 14.1"],
  // Amendment 3 (B-2) overrides this row: bare "injury" no longer selects safety_health. It is a no-answer row in jcimQaFix1Amend3.test.ts.
] as const;

describe("Amendment 1 NB-1/NB-3: everyday phrasings route to official CBA + mapped JCIM", () => {
  it.each(everyday)("%s: %s", (topicId, question, locator) => {
    expect(publicStewardWorkflowMatch(question).topicId).toBe(topicId);
    expect(resolveChatAnswerLane(question, "auto")).toBe("cba");
    const { answer } = ask(question);
    expect(answer.noAnswer).toBe(false);
    expect(answer.version.provider).not.toBe("local-fake-deterministic");
    expect(answer.citations.some((citation) => citation.publicSourceType === "cba_contract")).toBe(true);
    const jcim = answer.citations.filter((citation) => citation.publicSourceType === "jcim_joint_interpretation");
    expect(jcim).toHaveLength(1);
    expect(citationLabel(jcim[0])).toContain(`· ${locator} ·`);
  });
});

describe("Amendment 1 collision probes", () => {
  it.each([
    ["Can I take time off when I am sick?", null],
    ["Can I take time off for a sick day?", "sick_leave"],
    ["Do I get time off on holidays?", null],
    ["How much PTO do I get on a holiday?", null],
    ["Can I get workers' compensation for my injury?", null],
    ["Is my OWCP injury claim covered?", null],
  ] as const)("time off / injury does not steal from sick leave, holiday or compensation: %s", (question, topicId) => {
    expect(publicStewardWorkflowMatch(question).topicId).toBe(topicId);
    expect(resolveChatAnswerLane(question, "auto")).not.toBe("fake");
  });

  it("an injury property claim is ambiguous with employee claims and fails closed (never fake)", () => {
    const question = "Can I file an employee claim for damage from my injury?";
    expect(publicStewardWorkflowMatch(question)).toMatchObject({ topicId: null, ambiguous: true });
    expect(resolveChatAnswerLane(question, "auto")).toBe("cba");
  });
});

describe("Amendment 1 NB-2/NB-5 mutation gaps", () => {
  it("M7: registry-alias vocabulary alone keeps a fake-intent question off the fake lane", () => {
    const question = "What happens at a meeting with my supervisor about safety?";
    expect(publicStewardWorkflowMatch(question).topicId).toBeNull();
    expect(resolveChatAnswerLane(question, "auto")).toBe("safe_no_answer");
  });

  it("M9: a JCIM citation with no section and no article renders 'section unknown', never undefined", () => {
    const section = jcimSource.normalized.sections.find((item) => item.id === "preface")!;
    const citation = { ...jcimCitation(jcimSource, section, section.paragraphs[0]), section: "", articleNumber: null };
    const label = citationLabel(citation);
    expect(label).toBe(`apwu-usps-jcim-2025 · section unknown · PDF 3 · ${citation.paragraphId} · verified current source`);
    expect(label).not.toMatch(/undefined|null/);
  });
});
