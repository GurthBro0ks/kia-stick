import { describe, expect, it } from "vitest";
import { createChatSubmitSnapshot, resolveChatAnswerLane, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { publicStewardWorkflowMatch } from "@/lib/publicStewardWorkflowRegistry";
import { citationLabel } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-qa-fix-1 Amendment 3 (delta review 2, 9833090d: B-2 BLOCKING, NB-E1, NB-E2, NB-E4).
// Positive allowlists, default no-answer: safety_health only on explicit safety / reporting vocabulary; annual_leave only on
// vacation / annual leave / PTO / time off and sick_leave only on its reviewed triggers, each with no competing-family word.
const cbaSource = createCbaSourceFixtureCacheWithArticle19();
const jcimSource = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261024", gitSha: "qa-fix-1-amend-3" });

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

describe("Amendment 3 B-2a: comp / claim / coverage / doctor / danger money with injury never selects safety and health", () => {
  it.each([
    "Can I file a Dept of Labor claim for my injury?",
    "DOL claim for my injury",
    "file a claim for my injury",
    "I want to file a claim for my injury",
    "Can I claim for my injury?",
    "CA 1 for injury",
    "I was injured and my phone was damaged, can I file a claim?",
    "My uniform was damaged when I was injured",
    "Is my injury covered?",
    "Does insurance cover my injury?",
    "Can I see my own doctor for my injury?",
    "Is there danger money?",
  ])("%s", expectNoAnswer);
});

describe("Amendment 3 B-2b: time off / PTO for an injury never selects safety and health (6816de1a regression)", () => {
  it.each([
    "Time off for my injury",
    "PTO for my injury",
    "Time off because I was injured",
    "Can I take time off for my injury?",
    "Time off for an injury at work",
    "Can I use PTO while injured?",
  ])("%s", expectNoAnswer);
});

describe("Amendment 3 B-2c: contract holidays by alternate spelling never select annual leave", () => {
  it.each([
    "Can I take time off on July 4th?",
    "Can I take PTO on July 4?",
    "Can I take time off on Veteran's Day?",
    "Can I take time off on President's Day?",
    "Can I take time off for Xmas?",
    "PTO on xmas eve",
    "Time off for Dr. King's birthday",
    "Time off on Indigenous Peoples' Day",
  ])("%s", expectNoAnswer);
});

describe("Amendment 3 B-2d: definitionally non-annual leave never selects annual leave", () => {
  it.each([
    "Can I get administrative time off?",
    "administrative leave time off",
    "L.W.O.P. time off",
  ])("%s", expectNoAnswer);
});

describe("Amendment 3 NB-E4: other leave reasons and non-contract religious holidays are no-answer, never annual leave", () => {
  it.each([
    "Can I take time off for maternity leave?",
    "Can I use PTO for paternity leave?",
    "Can I take parental time off?",
    "Can I take time off after having a baby?",
    "Can I take time off to vote?",
    "Can I take time off to donate blood?",
    "Do I need to use PTO on a snow day?",
    "Can I take time off to care for a parent?",
    "Can I take time off for Hanukkah?",
    "Can I take time off for Eid?",
    "Can I take time off on Good Friday?",
  ])("%s", expectNoAnswer);
});

describe("Amendment 3 NB-E1: the three Amendment 2 survivors are now isolated rows", () => {
  it.each([
    "Can I take unpaid time off?",
    "Can I take time off for the dentist?",
    "Can I take time off when I am ill?",
    "Can I take time off for an illness?",
  ])("%s", expectNoAnswer);

  it.each(["My supervisor says I look ill", "My supervisor asked about my illness"])("router vocabulary keeps %s off the fakes", (question) => {
    expect(resolveChatAnswerLane(question, "auto")).toBe("safe_no_answer");
    expect(ask(question).answer.version.provider).not.toBe("local-fake-deterministic");
  });
});

// One row per competing-family term: the term is the only competing word next to an allowlisted trigger.
describe("Amendment 3 competing-family terms with annual-leave triggers are no-answer", () => {
  it.each([
    // sick family
    "Can I use PTO if I am sick?",
    // other leave types
    "Can I take admin time off?",
    "Time off without pay",
    "Can I take time off for jury duty?",
    "Can I take time off for court?",
    "Can I take time off for a funeral?",
    "Can I take bereavement time off?",
    "Can I take time off for military duty?",
    "Can I take time off for union business?",
    "Can I take time off because I am pregnant?",
    "Can I take time off for an adoption?",
    "Can I take time off for voting?",
    "Do I need to use PTO for bad weather?",
    "Can I take time off as a caregiver?",
    "Can I take time off to look after my parents?",
    // medical
    "Can I take time off for the doctor?",
    "Can I take time off for dental work?",
    "Can I take time off to see a physician?",
    "Can I take time off for an appointment?",
    "Can I take time off for a hospital stay?",
    "Can I take time off for treatment?",
    // holiday names and dates
    "Can I take time off on a holiday?",
    "Can I take time off on Christmas?",
    "Can I take time off on Thanksgiving?",
    "Can I take time off on New Year's Eve?",
    "Can I take time off for Martin Luther King's birthday?",
    "Can I use PTO on MLK?",
    "Can I take time off on King Day?",
    "Can I take time off for Washington's Birthday?",
    "Can I take time off on Memorial Day?",
    "Can I take time off on Juneteenth?",
    "Can I take time off on Independence Day?",
    "Can I take time off on the Fourth of July?",
    "Can I take time off on the 4th of July?",
    "Can I take time off on July fourth?",
    "Can I take time off on 4th July?",
    "Can I take time off on Turkey Day?",
    "Can I take time off on Vets Day?",
    "Can I take time off on Labour Day?",
    "Can I take time off on Columbus Day?",
    "Can I take time off on Veterans’ Day?",
    "Can I take time off on Armistice Day?",
    "Can I take time off for Easter?",
    "Can I take time off for Chanukah?",
    "Can I take time off for Passover?",
    "Can I take time off for Yom Kippur?",
    "Can I take time off for Rosh Hashanah?",
    "Can I take time off for Diwali?",
    "Can I take time off during Ramadan?",
    "Can I take time off for Kwanzaa?",
    "Time off for a religious observance",
    "Can I take time off on Dec 25?",
    "Can I take time off on 7/4?",
    // injury
    "Time off because I got hurt",
    "Time off after an accident",
    // claim / coverage
    "Can I claim PTO?",
    "Time off because my car was damaged",
    "Does insurance pay for time off?",
    "Am I insured during time off?",
    "Is my vacation covered?",
    "Vacation coverage",
    "Reimbursement for vacation",
    // comp
    "Comp time off",
    "Time off with compensation",
    "FECA time off",
    "Department of Labor time off",
    "Time off on light duty",
    "Time off on limited duty",
  ])("%s", expectNoAnswer);
});

describe("Amendment 3 competing families also gate sick leave, safety and health, and employee claims", () => {
  it.each([
    "Can I use sick leave for jury duty?",
    "Can I use sick leave on Christmas?",
    "Can I use sick leave after an accident?",
    "Sick leave on light duty",
    "Can I file an employee claim through OWCP?",
    "Is there pay for working in unsafe conditions?",
    "Unsafe conditions and wages",
    "Is there a differential for unsafe conditions?",
    "Do I get money for an unsafe condition?",
    "Who pays the bills for an unsafe condition?",
    "Can I see my own doctor about an unsafe condition?",
    "Unsafe condition: can I get workers comp?",
  ])("%s", expectNoAnswer);
});

describe("Amendment 3 contested no-answer: a dropped topic whose competing word belongs to another official topic is ambiguous", () => {
  it.each([
    ["Can I take time off when I am sick?", ["annual_leave", "sick_leave"]],
    ["Time off for my injury", ["annual_leave", "safety_health"]],
    ["Is my PTO covered?", ["annual_leave", "employee_claims"]],
    ["Is my sick leave covered?", ["sick_leave", "employee_claims"]],
    ["I reported an unsafe condition, can I file a claim?", ["safety_health", "employee_claims"]],
    ["Can I file an employee claim for damage from my injury?", ["safety_health", "employee_claims"]],
  ] as const)("%s", (question, topics) => {
    expect(publicStewardWorkflowMatch(question)).toMatchObject({ topicId: null, ambiguous: true });
    expect([...publicStewardWorkflowMatch(question).matchedTopicIds].sort()).toEqual([...topics].sort());
    const { snapshot, answer } = ask(question);
    expect(snapshot.sourceMode).toBe("cba");
    expect(answer.noAnswer).toBe(true);
    expect(answer.citations).toHaveLength(0);
  });
});

describe("Amendment 3 bare injury / danger / hazard wording no longer selects safety and health (overrides earlier rows)", () => {
  it.each([
    "I got an injury at work. What are my rights?",
    "There is a danger at my station",
    "Hazardous materials at work",
    "I was injured on the job",
    "My supervisor said I got injured",
    "Am I in danger?",
    "Is there a hazard?",
  ])("%s", expectNoAnswer);
});

describe("Amendment 3 allowlists keep explicit wording working", () => {
  it.each([
    ["safety_health", "What are my rights on an unsafe condition?", "Article 14.1"],
    ["safety_health", "Can I file an OSHA complaint?", "Article 14.1"],
    ["safety_health", "Dangerous conditions at my station", "Article 14.1"],
    ["safety_health", "Can my supervisor make me work in a dangerous area?", "Article 14.1"],
    ["safety_health", "Is it dangerous work?", "Article 14.1"],
    ["safety_health", "Are these conditions dangerous?", "Article 14.1"],
    ["safety_health", "Is this area dangerous?", "Article 14.1"],
    ["safety_health", "Is my workplace dangerous?", "Article 14.1"],
    ["safety_health", "How do I report an accident?", "Article 14.1"],
    ["safety_health", "How do I report an injury?", "Article 14.1"],
    ["safety_health", "Can I report a hazard?", "Article 14.1"],
    ["safety_health", "Where is the injury report form?", "Article 14.1"],
    ["safety_health", "Accident reports", "Article 14.1"],
    ["annual_leave", "How much annual leave do I get?", "Article 10.3.A"],
    ["annual_leave", "How much vacation do I get?", "Article 10.3.A"],
    ["annual_leave", "How much PTO do I get?", "Article 10.3.A"],
    ["annual_leave", "Can I take time off next week?", "Article 10.3.A"],
    ["annual_leave", "My supervisor denied my PTO", "Article 10.3.A"],
    ["sick_leave", "How does sick leave work?", "Article 10.6"],
    ["sick_leave", "Can I take time off for a sick day?", "Article 10.6"],
    ["sick_leave", "Can I use sick leave for a doctor's appointment?", "Article 10.6"],
  ] as const)("%s: %s", expectWorks);
});

describe("Amendment 3 labelled fake / sample questions keep the labelled fake lane", () => {
  it.each(["What is a sample answer about my supervisor and time off?", "sample sick leave answer for my supervisor"])("%s", (question) => {
    expect(resolveChatAnswerLane(question, "auto")).toBe("fake");
  });
});
