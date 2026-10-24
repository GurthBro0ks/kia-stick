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

describe("Amendment 5 mutation follow-up: competing families still block sick leave, employee claims, and in-vocabulary annual / safety rows", () => {
  it.each([
    "Sick leave or admin leave",
    "Sick leave or administrative leave",
    "Sick leave or LWOP",
    "Sick leave without pay",
    "Unpaid sick leave",
    "Sick leave for jury duty",
    "Sick leave for court",
    "Sick leave for a funeral",
    "Sick leave for bereavement",
    "Sick leave for military duty",
    "Sick leave for union business",
    "Sick leave for maternity",
    "Sick leave for paternity",
    "Parental sick leave",
    "Sick leave for my baby",
    "Sick leave while pregnant",
    "Sick leave for an adoption",
    "Sick leave to vote",
    "Sick leave to give blood",
    "Sick leave for a snow day",
    "Sick leave for bad weather",
    "Sick leave for caring for my mom",
    "Sick leave as a caregiver",
    "Sick leave for my parents",
    "Sick leave for an emergency",
    "Sick leave on a holiday",
    "Sick leave on Christmas",
    "Sick leave on Xmas",
    "Sick leave on Thanksgiving",
    "Sick leave on New Year",
    "Sick leave on Martin Luther King",
    "Sick leave on MLK",
    "Sick leave on King Day",
    "Sick leave on Dr King",
    "Sick leave on Washington's Birthday",
    "Sick leave on Presidents Day",
    "Sick leave on Memorial Day",
    "Sick leave on Juneteenth",
    "Sick leave on Independence Day",
    "Sick leave on the Fourth of July",
    "Sick leave on the 4th of July",
    "Sick leave on 4th July",
    "Sick leave on Turkey Day",
    "Sick leave on Vets Day",
    "Sick leave on July 4",
    "Sick leave on Labor Day",
    "Sick leave on Columbus Day",
    "Sick leave on Indigenous Peoples Day",
    "Sick leave on Veterans Day",
    "Sick leave on Armistice Day",
    "Sick leave on Easter",
    "Sick leave on Good Friday",
    "Sick leave on Eid",
    "Sick leave on Hanukkah",
    "Sick leave on Chanukah",
    "Sick leave on Passover",
    "Sick leave on Yom Kippur",
    "Sick leave on Rosh Hashanah",
    "Sick leave on Diwali",
    "Sick leave during Ramadan",
    "Sick leave on Kwanzaa",
    "Sick leave for a religious day",
    "Sick leave on Dec 25",
    "Sick leave on 12/25",
    "Sick leave for an injury",
    "Sick leave because I got hurt",
    "Sick leave after an accident",
    "Sick leave claim",
    "Sick leave for damage",
    "Sick leave insurance",
    "Am I insured on sick leave?",
    "Is sick leave covered?",
    "Sick leave coverage",
    "Sick leave reimbursement",
    "Sick leave for my car",
    "Sick leave for my vehicle",
    "Sick leave or comp",
    "Sick leave or compensation",
    "Sick leave and FECA",
    "Sick leave and DOL",
    "Sick leave and the Department of Labor",
    "Sick leave and a CA-1",
    "Sick leave or light duty",
    "Sick leave or limited duty",
  ])("sick leave family isolation: %s", expectNoAnswer);
  it.each([
    "Employee claim for my injury",
    "Employee claim because I got hurt",
    "Employee claim for my glasses broken in an accident",
    "Employee claim or comp",
    "Employee claim for compensation",
    "Employee claim and OWCP",
    "Employee claim and FECA",
    "Employee claim and DOL",
    "Employee claim and the Department of Labor",
    "Employee claim and a CA-2",
    "Employee claim for light duty",
    "Employee claim for limited duty",
  ])("employee claims family isolation: %s", expectNoAnswer);
  it.each([
    "Can I take time off on 7/4?",
    "PTO for 12/25",
    "My health and safety rules at work",
  ])("words inside the closed vocabulary still meet the families: %s", expectNoAnswer);
});

describe("Amendment 5 mutation follow-up: every closed-vocabulary word and rule is load-bearing", () => {
  it.each([
    "I'm on PTO next week",
    "I'll take time off next week, okay?",
    "Do we get PTO?",
    "Can our supervisor deny PTO?",
    "Can you take PTO tomorrow?",
    "Is your PTO paid out?",
    "It's my annual leave request",
    "Annual leave and its approval",
    "Can my supervisor deny PTO that I submitted?",
    "Am I allowed to take PTO?",
    "My PTO has been denied",
    "Did my supervisor deny my PTO?",
    "Could I take PTO tomorrow?",
    "May I take PTO?",
    "Will my PTO be approved?",
    "Would my supervisor approve PTO?",
    "Should I request PTO?",
    "Must I submit annual leave by the deadline?",
    "When can I take PTO?",
    "I got my PTO request denied",
    "How much annual leave do I get as a part-time flexible?",
    "My supervisor says no to PTO",
    "PTO requests",
    "My supervisor cancelled my vacation",
    "Vacation choice period",
    "Vacation pay",
    "What governs PTO?",
    "Annual leave dispute",
    "Can a PTF take PTO?",
    "How much vacation time do PTFs get?",
    "Time off for our wedding",
    "PTO for this Friday",
    "Can I take 1.5 days of PTO?",
    "Can I take PTO? What about vacations?",
    "Can my supervisor deny my leave request from today to tomorrow?",
  ])("annual leave keeps working: %s", annual);
  it.each([
    "Report hazards at work",
    "How do I report accidents?",
    "reporting injuries",
    "I reported an injury and my supervisor got mad",
    "Injury report deadline",
    "Do I have to report an injury the same day?",
    "Can I be fired for reporting an injury?",
    "Will I be disciplined for reporting an accident?",
    "I need to report a hazard",
    "What does Article 14 say about safety?",
    "Are these conditions unsafe?",
  ])("safety and health keeps working: %s", safety);
  it.each([
    "Can I take PTO? Tomorrow off?",
    "Can I take PTO and visit?",
    "Can my supervisor deny my leave tomorrow, family visit?",
    "Can I use PTO and recover?",
    "Can I take PTO with a bug?",
    "Can I take PTO with a migrane?",
    "Can I take PTO after my trip?",
    "Can I take PTO while on vacation?",
    "Health PTO",
    "Can I take PTO with a condition?",
    "Can I take PTO with a disease?",
    "I passed and need PTO",
    "Can I take PTO when due?",
    "Can I take PTO in the ER?",
    "Can I take PTO at a drill?",
    "Can I take PTO at a burial?",
    "Can I take PTO at a birth?",
    "Can I take PTO with care?",
    "Can I take PTO in hospice?",
    "Can I take PTO with a stroke?",
    "PTO for my condition",
    "PTO for my health",
    "PTO for a drill",
  ])("one unknown word or rule miss gives annual leave a no-answer: %s", expectNoAnswer);
  it.each([
    "Is it unsafe to work with chemo?",
    "Is it unsafe to work and recover?",
    "Is it unsafe to work pregnant?",
    "Is it unsafe to work with a bug?",
    "Is it unsafe to work with a newborn?",
    "Is it unsafe to work after an accident?",
    "Is it unsafe to work while on a dock?",
    "Is it unsafe to work with family?",
    "Is it unsafe to visit my work area?",
    "Is it unsafe to work with no rest?",
    "Is it unsafe to work when I passed out?",
    "Is it unsafe to work when due?",
    "Is it unsafe to work in the ER?",
    "Is it unsafe to work at a drill?",
    "Is it unsafe to work at a burial?",
    "Is it unsafe to work in birth?",
    "Is it unsafe to work in care?",
    "Is it unsafe to work in hospice?",
    "Is it unsafe to work with a stroke?",
    "Are these condition dangerous?",
    "Are these conditions a safety hazard?",
    "Is my health unsafe?",
    "Safety or health hazard at work",
    "Health or safety hazard at work",
  ])("one unknown word or rule miss gives safety and health a no-answer: %s", expectNoAnswer);
});
