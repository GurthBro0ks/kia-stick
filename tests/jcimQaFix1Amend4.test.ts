import { describe, expect, it } from "vitest";
import { cannedQuestions } from "@/lib/answerGovernor";
import { createChatSubmitSnapshot, resolveChatAnswerLane, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { publicStewardWorkflowMatch } from "@/lib/publicStewardWorkflowRegistry";
import { citationLabel } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-qa-fix-1 Amendment 4 (delta review 3, ea7b2397: B-3 BLOCKING, NB-F1, NB-F3, NB-F4, NB-E2, Employee Claim).
// Annual leave with a reason clause is selected only for the short vacation allowlist; personal illness / condition words
// block safety and health; auto mode never answers an unlabelled question from the fake samples.
const cbaSource = createCbaSourceFixtureCacheWithArticle19();
const jcimSource = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261024", gitSha: "qa-fix-1-amend-4" });

function ask(question: string) {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "All Fake", detail: "Detailed" });
  return { snapshot, answer: routeChatQuestion({ question, snapshot, publicSource: null, cbaSource, jcimSource, runtimeVersion, threadHistory: [] }) };
}

/** No topic, no fake, an honest no-answer with nothing cited (no CBA, no JCIM). */
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

/** Never the fake samples in auto, and never a safety and health answer. */
function expectNotFakeNotSafety(question: string) {
  expect(publicStewardWorkflowMatch(question).topicId).not.toBe("safety_health");
  expect(resolveChatAnswerLane(question, "auto")).not.toBe("fake");
  const { snapshot, answer } = ask(question);
  expect(snapshot.sourceMode).not.toBe("fake");
  expect(answer.version.provider).not.toBe("local-fake-deterministic");
}

describe("Amendment 4 B-3a: holiday-name variants with time off / PTO are no-answer by default", () => {
  it.each([
    "Time off for New Years",
    "Time off on New Years Day",
    "Can I take time off New Years Eve?",
    "Time off for Chrismas",
    "Time off on Christmass",
    "Time off for thanksgivng",
    "Time off on Independance Day",
    "Time off for Hanukah",
    "Time off Memorial weekend",
    "Time off for Black Friday",
    "Time off on Boxing Day",
    "Time off for Mardi Gras",
    "Time off for Halloween",
    "Time off for Valentine's Day",
    "Time off for Mother's Day",
    "Time off on Cesar Chavez Day",
    "PTO for spring break",
    "PTO for summer",
  ])("%s", expectNoAnswer);
});

describe("Amendment 4 B-3b: illness / medical-condition reasons are no-answer", () => {
  it.each([
    "Can I take time off for the flu?",
    "Time off for surgery",
    "Can I take PTO for my surgery?",
    "Time off because I have COVID",
    "Time off for my broken leg",
    "Time off for a sprained ankle",
    "Time off to recover",
    "Time off for therapy",
    "Time off for a colonoscopy",
    "PTO for a migraine",
    "Time off for chemo",
    "Time off for my mental health",
    "Time off for stress",
    "Vacation for my surgery recovery",
    "Vacation days for the flu",
    "Annual leave for my surgery",
    "My supervisor won't let me take time off for my kid's surgery",
  ])("%s", expectNoAnswer);
});

describe("Amendment 4 B-3c: other-leave reasons (military, court, bereavement, childbirth, emergencies) are no-answer", () => {
  it.each([
    "Time off for National Guard drill",
    "Time off for reserve duty",
    "Time off to testify as a witness",
    "Time off for a subpoena",
    "PTO for a deposition",
    "Time off because my dad died",
    "Time off after my mom passed away",
    "Time off for funerals",
    "Time off for bereavment",
    "Time off for jurry duty",
    "Time off for my newborn",
    "Time off for the birth of my child",
    "Time off to adopt",
    "Time off to look after my kid",
    "Time off for my kid's school event",
    "Time off for a hurricane",
    "Time off for a power outage",
    "Time off for a family emergency",
    "Time off for an emergency",
    "Can I take emergency time off?",
    "Emergency annual leave",
  ])("%s", expectNoAnswer);
});

describe("Amendment 4 B-3 reason markers, noun phrases and preceding words gate every trigger", () => {
  it.each([
    "Vacation for Diwali",
    "Vacations for Diwali",
    "Annual leave for Diwali",
    "Vacation because of my divorce",
    "Annual leave due to a snowstorm",
    "Vacation after my divorce",
    "Annual leave to move house",
    "Vacation since my lease ended",
    "Annual leave on Diwali",
    "PTO Labor Day weekend",
    "Time off Labor Day weekend",
    "Can I take Chrismas time off?",
    "Can I take time off if I have a dentist appointment?",
    "Can I take a day off for my birthday?",
  ])("%s", expectNoAnswer);
});

describe("Amendment 4 NB-F3: a bare date ordinal is not a time expression", () => {
  it.each(["Can I take time off on the 4th?", "PTO on the 4th"])("%s", expectNoAnswer);
});

describe("Amendment 4 B-3 allowlisted vacation reasons keep annual leave working", () => {
  it.each([
    "Time off for vacation",
    "Time off for vacations",
    "Time off for a trip",
    "Time off for trips",
    "Time off to travel",
    "Time off to rest",
    "Time off for a family visit",
    "Time off for family visits",
    "Time off for my wedding",
    "Time off for weddings",
    "Time off for my honeymoon",
    "Time off for my birthday",
    "Time off for birthdays",
    "Annual leave request denied for my wedding",
    "Can I take PTO for a family visit?",
    "Can I use vacation for my trip?",
  ])("%s", (question) => expectWorks("annual_leave", question, "Article 10.3.A"));
});

describe("Amendment 4 B-3 no reason clause: annual leave behaviour unchanged", () => {
  it.each([
    "How much time off do I get?",
    "How much PTO do I get?",
    "How many PTO days do I get?",
    "How much PTO time do I have?",
    "Can I use PTO?",
    "Can I get time off?",
    "Can I take some time off?",
    "Can I take a PTO day?",
    "Request time off",
    "Time off request",
    "PTO denied by my supervisor",
    "How do I request time off from my supervisor?",
    "Can I take time off during prime-time?",
    "Can I take time off with no notice?",
    "Is PTO paid out?",
    "Do I get paid for unused PTO?",
    "My supervisor denied my PTO",
    "PTO / time off?",
    "How does annual leave work?",
    "Can I take annual leave during my probation?",
  ])("%s", (question) => expectWorks("annual_leave", question, "Article 10.3.A"));
});

describe("Amendment 4 B-3 time-only phrases are not reasons", () => {
  it.each([
    "Time off for a day",
    "Time off for the weekend",
    "Can I take time off next week?",
    "PTO this Friday",
    "Time off for 3 days",
    "Time off for 2 weeks",
    "Can I take time off tomorrow?",
    "Can I take PTO today?",
    "Can I take time off on Monday?",
    "Can I take time off on Tuesday?",
    "Can I take time off on Wednesday?",
    "Can I take time off on Thursday?",
    "Can I take time off on Friday?",
    "Can I take time off on Saturday?",
    "Can I take time off on Sunday?",
  ])("%s", (question) => expectWorks("annual_leave", question, "Article 10.3.A"));
});

describe("Amendment 4 NB-F1: sick / ill / illness / surgery and personal health conditions never select safety and health", () => {
  it.each([
    "Is it dangerous to work while sick?",
    "Is it dangerous to work when I'm ill?",
    "Safety condition caused my illness",
    "Is my work area dangerous after my surgery?",
    "Is it dangerous to work with my broken arm?",
    "Is working with a cast dangerous?",
    "Dangerous work and the flu",
    "I have a health condition, can I keep working?",
    "My health is getting worse from working nights",
    "Is it dangerous to work with a fever?",
    "Is it unsafe to work with a cough?",
    "Is it dangerous to work with covid?",
    "Is it dangerous to work while I'm contagious?",
    "Is it unsafe to work with an infection?",
    "Is it unsafe to work with a virus?",
    "Is it unsafe to work with a concussion?",
    "Is it unsafe to work with a sprained wrist?",
    "Is it unsafe to work with a fractured wrist?",
    "Is it unsafe to work with a migraine?",
    "Unsafe to work with back pain?",
    "Is it dangerous to work on my medication?",
    "Is it unsafe to work with asthma?",
    "Is it unsafe to work with diabetes?",
    "Is it unsafe to work when I'm dizzy?",
    "Unsafe conditions are giving me symptoms",
  ])("%s", expectNoAnswer);
  it.each([
    ["sick_leave", "Sick leave for surgery", "Article 10.6"],
    ["sick_leave", "Sick leave for the flu", "Article 10.6"],
    ["safety_health", "Is it dangerous to work with chemicals?", "Article 14.1"],
    ["safety_health", "Is it dangerous to work in the cold?", "Article 14.1"],
  ] as const)("%s keeps working: %s", expectWorks);
});

describe("Amendment 4: a damaged car / vehicle is a property question, never a safety and health answer", () => {
  it.each(["Report an accident with my personal vehicle", "Report an accident with my car"])("%s", expectNoAnswer);
});

describe("Amendment 4 NB-F4: bare report needs accident / injury / hazard; day off and time-off stay no-answer", () => {
  it.each(["How do I report my supervisor?", "Can I report my supervisor for yelling?", "I want to report my coworker"])("%s", expectNotFakeNotSafety);
  it.each(["Can I take a day off?", "Can I take days off?", "Time-off request", "Can I get time-off?"])("%s", expectNoAnswer);
  it.each([
    ["safety_health", "How do I report an injury?", "Article 14.1"],
    ["safety_health", "Can I report a hazard?", "Article 14.1"],
    ["safety_health", "How do I report an accident?", "Article 14.1"],
  ] as const)("%s still works: %s", expectWorks);
});

describe("Amendment 4 Employee Claim: the accident wording keeps the phone-damage claim a no-answer (re-QA)", () => {
  it("Employee claim for my phone damaged in an accident", () => {
    const question = "Employee claim for my phone damaged in an accident";
    expect(publicStewardWorkflowMatch(question).ambiguous).toBe(true);
    expectNoAnswer(question);
  });
});

describe("Amendment 4 acceptance probe: auto never answers an unlabelled question from the fake samples", () => {
  it.each([
    "Can I bring a steward to a meeting?",
    "My supervisor is harassing me",
    "Can my supervisor search my locker?",
    "My supervisor wants a meeting",
    "Step 1 grievance timeline",
    "What should a steward ask before a meeting?",
    "Can I record my supervisor?",
    "Lunch scanner issue",
    "My supervisor changed my schedule",
    "My supervisor yelled at me during a meeting",
    "My supervisor said I'll be disciplined",
  ])("%s", (question) => {
    expect(resolveChatAnswerLane(question, "auto")).toBe("safe_no_answer");
    const { snapshot, answer } = ask(question);
    expect(snapshot.sourceMode).not.toBe("fake");
    expect(answer.version.provider).not.toBe("local-fake-deterministic");
    expect(answer.noAnswer).toBe(true);
  });
  it.each(cannedQuestions)("canned question keeps the fake lane: %s", (question) => {
    expect(resolveChatAnswerLane(question, "auto")).toBe("fake");
    expect(resolveChatAnswerLane(question.toUpperCase(), "auto")).toBe("fake");
  });
  it.each(["Give me a sample vacation request", "What evidence belongs in a fake Step 1 file?"])("labelled fake / sample keeps the fake lane: %s", (question) => {
    expect(resolveChatAnswerLane(question, "auto")).toBe("fake");
  });
});
