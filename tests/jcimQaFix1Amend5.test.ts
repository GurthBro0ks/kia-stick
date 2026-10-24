import { describe, expect, it } from "vitest";
import { cannedQuestions } from "@/lib/answerGovernor";
import { createChatSubmitSnapshot, resolveChatAnswerLane, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { publicStewardWorkflowMatch } from "@/lib/publicStewardWorkflowRegistry";
import { citationLabel } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-qa-fix-1 Amendment 5 (delta review 4, 7988a289: B-4 BLOCKING). CLOSED VOCABULARY: annual leave answers only when
// every word is in a small known set (no unknown word, no reason-carrying second sentence, no plain "leave" with a reason,
// "rest" only as the last word); safety and health answers only on explicit workplace-hazard words, never with a personal
// health or condition word.
const cbaSource = createCbaSourceFixtureCacheWithArticle19();
const jcimSource = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261024", gitSha: "qa-fix-1-amend-5" });

function ask(question: string) {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "All Fake", detail: "Detailed" });
  return { snapshot, answer: routeChatQuestion({ question, snapshot, publicSource: null, cbaSource, jcimSource, runtimeVersion, threadHistory: [] }) };
}

/** No topic, no fake, an honest no-answer with nothing cited. */
function expectNoAnswer(question: string) {
  expect(publicStewardWorkflowMatch(question).topicId).toBeNull();
  expect(resolveChatAnswerLane(question, "auto")).not.toBe("fake");
  const { snapshot, answer } = ask(question);
  expect(snapshot.sourceMode).not.toBe("fake");
  expect(answer.version.provider).not.toBe("local-fake-deterministic");
  expect(answer.noAnswer).toBe(true);
  expect(answer.citations).toHaveLength(0);
}

/** Selected official topic, CBA lane, cited answer with the mapped JCIM locator. */
function expectWorks(topicId: string, question: string, locator: string) {
  expect(publicStewardWorkflowMatch(question).topicId).toBe(topicId);
  const { snapshot, answer } = ask(question);
  expect(snapshot.sourceMode).toBe("cba");
  expect(answer.noAnswer).toBe(false);
  expect(answer.citations.map(citationLabel).join("\n")).toContain(`· ${locator} ·`);
}

const annual = (question: string) => expectWorks("annual_leave", question, "Article 10.3.A");
const safety = (question: string) => expectWorks("safety_health", question, "Article 14.1");

describe("Amendment 5 B-4: every delta-4 WRONG row is a no-answer", () => {
  it.each([
    "Can I take time off? My dad passed away.",
    "Can I take time off? I start chemo next week.",
    "Can I take time off? My wife is due next week.",
    "Time off to rest after my chemo",
    "Time off for travel to my National Guard drill",
    "Time off for travel for my dad's chemo",
    "PTO for a trip to the ER",
    "Time off for a trip to my grandmother's burial",
    "Time off to rest after giving birth",
    "Time off with my newborn",
    "Time off during my chemo",
    "Can I take PTO during my dad's hospice care?",
    "I requested leave for chemo and my supervisor denied it",
    "Vacation while I recover from chemo",
    "Can I use annual leave while I recover from a stroke?",
    "Is it dangerous to work with a stomach bug?",
    "Is it unsafe to work after chemo?",
    "Is it unsafe to work with a migrane?",
  ])("%s", expectNoAnswer);
});

describe("Amendment 5 builder fresh sample: adversarial rows are no-answer", () => {
  it.each([
    "Can I take PTO? My mom is in the hospital.",
    "I need time off. My son has the flu.",
    "Can I take vacation days? I have jury duty.",
    "Time off next week. My father died.",
    "Annual leave request denied. I was sick.",
    "PTO while my wife recovers from surgery",
    "Time off with my sick kid",
    "Vacation during my recovery",
    "Annual leave after my surgery",
    "Time off after the funeral",
    "Time off for travel to the hospital",
    "PTO for a trip to the doctor",
    "Time off to rest after the flu",
    "Vacation for my family emergency",
    "Time off for my wedding and my cancer treatment",
    "Time off for a family visit to the ICU",
    "PTO for my birthday surgery",
    "Leave for my wedding",
    "I need leave for my trip",
    "Can I get leave for a family visit?",
    "Leave for travel next week",
    "Time off for my court date",
    "PTO for voting",
    "Time off for my union convention",
    "Time off for my religious holiday",
    "Can I take time off to care for my mother?",
    "PTO for my dog's surgery",
    "Is it unsafe to work with diabetes?",
    "Is it dangerous to work with my heart condition?",
    "Is it unsafe to work while I recover?",
    "Unsafe to work with the flu",
    "Is it unsafe to work during chemo?",
    "Health and safety rules for my illness",
    "Is my workplace dangerous for my asthma?",
    "OSHA rules for my disease",
    "Is it unsafe to work with a migraine?",
    "Report an injury from my illness",
  ])("%s", expectNoAnswer);
});

describe("Amendment 5 builder fresh sample: closed-vocabulary rows keep working", () => {
  it.each([
    "Can I take PTO next Friday?",
    "How do I request vacation days?",
    "My supervisor denied my annual leave request",
    "Can my supervisor cancel my PTO?",
    "Time off for my trip next week",
    "Can I take time off to rest",
    "Vacation for my honeymoon",
    "Can I carry over vacation days?",
    "Annual leave for a family visit",
    "How do I schedule annual leave during prime-time?",
  ])("annual leave: %s", annual);
  it.each([
    "How do I report an unsafe condition to my supervisor?",
    "Is my workplace unsafe?",
    "Can I file an OSHA complaint about a hazard?",
    "Dangerous working conditions on the dock",
    "Report a hazard at my plant",
  ])("safety and health: %s", safety);
});

describe("Amendment 5 annual leave: a second sentence must name the leave or only ask about the contract", () => {
  it.each([
    "My annual leave request was denied. What does the CBA say?",
    "Can I take time off? What does the contract say?",
    "I forgot to submit my leave today and I still need tomorrow off. Is my supervisor allowed to deny my leave?",
  ])("%s", annual);
  it.each([
    "Can I take time off? My supervisor says no.",
    "Can I take time off? Next week.",
    "PTO? Today.",
  ])("%s", expectNoAnswer);
});

describe("Amendment 5 annual leave: rest only as the last word, family only in family visit, reason slots", () => {
  it.each(["Time off to rest", "PTO for rest", "Can I take time off for a family visit?", "Time off for 3 days", "PTO for my birthday next week"])("%s", annual);
  it.each([
    "Time off to rest next week",
    "PTO for rest after my trip",
    "Time off to rest. What does the CBA say?",
    "Time off for my family",
    "Time off to visit",
    "Time off for visits",
    "Time off for my supervisor",
    "PTO for",
    "Time off for the contract",
    "Can I take time off to submit?",
  ])("%s", expectNoAnswer);
});

describe("Amendment 5 annual leave: plain leave with a reason is a no-answer; without one it still works", () => {
  it.each(["Can my supervisor deny my leave request tomorrow?", "Can my supervisor deny my annual leave for my wedding?"])("%s", annual);
  it.each([
    "Leave for my wedding",
    "Leave for vacation",
    "Can my supervisor deny my leave for a trip tomorrow?",
    "Can my supervisor deny my leave request for tomorrow?",
    "My supervisor denied my leave request for my birthday tomorrow",
    "Can my supervisor deny my leave request tomorrow to travel?",
    "Can my supervisor deny my leave request tomorrow for a family visit?",
    "Can my supervisor deny my leave tomorrow to rest",
  ])("%s", expectNoAnswer);
});

describe("Amendment 5: a topic the closed vocabulary rejects never hands the question to another topic", () => {
  it.each(["Do I get higher level pay during annual leave?"])("%s", expectNoAnswer);
  it("a competing family still hands its question to the family owner", () => {
    expect(publicStewardWorkflowMatch("Can I take time off for a sick day?").topicId).toBe("sick_leave");
  });
});

describe("Amendment 5 safety and health: no personal health or condition word, condition only as a workplace condition", () => {
  it.each([
    "What are my rights on an unsafe condition?",
    "Are these conditions dangerous?",
    "Dangerous working conditions on the dock",
    "Unhealthful conditions at my station",
    "Hazardous conditions at my plant are a safety hazard",
    "What about safety and health?",
    "Health and safety rules at my station",
  ])("%s", safety);
  it.each([
    "Health and safety rules for my pregnancy",
    "Is it unsafe to work while pregnant?",
    "Health concerns about my working hours",
    "Is it unsafe to work 16 hours?",
    "Is my condition unsafe?",
    "Are these conditions unsafe for my condition?",
    "Are these conditions unsafe for my health?",
    "Is my safety condition dangerous?",
    "Safety and my health",
    "Are my conditions dangerous?",
    "Are these conditions a safety concern?",
  ])("%s", expectNoAnswer);
});

describe("Amendment 5: Gurth's 10 phrasings and the 5 canned questions keep working", () => {
  it.each([
    ["annual_leave", "How much annual leave do I get?", "Article 10.3.A"],
    ["annual_leave", "How does annual leave work?", "Article 10.3.A"],
    ["sick_leave", "How does sick leave work?", "Article 10.6"],
    ["safety_health", "What are my rights on an unsafe condition?", "Article 14.1"],
    ["safety_health", "What about safety and health?", "Article 14.1"],
    ["overtime", "How does overtime work?", "Article 8.5.F"],
    ["holiday_scheduling", "How does holiday scheduling work?", "Article 11.6"],
    ["uniforms_work_clothes", "How does the uniform allowance work?", "Article 26.1"],
    ["higher_level_assignments", "How does higher level pay work?", "Article 25.1"],
    ["employee_claims", "How do I file an employee claim?", "Article 27"],
  ])("%s: %s", expectWorks);
  it.each(cannedQuestions)("canned question keeps the fake lane: %s", (question) => {
    expect(resolveChatAnswerLane(question, "auto")).toBe("fake");
  });
});
