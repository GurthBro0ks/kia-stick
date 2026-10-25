import { describe, expect, it } from "vitest";
import { createChatSubmitSnapshot, resolveChatAnswerLane, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { publicStewardWorkflowMatch } from "@/lib/publicStewardWorkflowRegistry";
import { citationLabel } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-qa-fix-1 Amendment 2 (delta review 35936931: B-1 BLOCKING, NB-D2, NB-D3).
// Principle: an unclear question gets no answer; a confident wrong official answer is worse; fakes are never acceptable.
const cbaSource = createCbaSourceFixtureCacheWithArticle19();
const jcimSource = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261024", gitSha: "qa-fix-1-amend-2" });

function ask(question: string) {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "All Fake", detail: "Detailed" });
  return { snapshot, answer: routeChatQuestion({ question, snapshot, publicSource: null, cbaSource, jcimSource, runtimeVersion, threadHistory: [] }) };
}

const WRONG_LOCATOR = { safety_health: "Article 14.1", annual_leave: "Article 10.3.A" } as const;

/** The question must not reach the wrong official topic, must not answer from that topic's JCIM locator, and must never reach the fakes. */
function expectNotRoutedTo(question: string, wrongTopic: keyof typeof WRONG_LOCATOR) {
  const match = publicStewardWorkflowMatch(question);
  expect(match.matchedTopicIds).not.toContain(wrongTopic);
  expect(match.topicId).toBeNull();
  expect(resolveChatAnswerLane(question, "auto")).not.toBe("fake");
  const { snapshot, answer } = ask(question);
  expect(snapshot.sourceMode).not.toBe("fake");
  expect(answer.version.provider).not.toBe("local-fake-deterministic");
  expect(answer.citations.map(citationLabel).join("\n")).not.toContain(`· ${WRONG_LOCATOR[wrongTopic]} ·`);
}

// B-1 family a: workers' comp / OWCP / FECA wording is out of scope (safety_health unsupportedScope) — never Article 14.
const compVariants = [
  "Can I get workers comp for my injury?",
  "Can I get workers' comp for my injury?",
  "Worker's comp after my injury",
  "Worker's compensation for my injury?",
  "WORKERS COMP INJURY",
  "workers comp injury",
  "Can I get comp for my injury?",
  "injury comp",
  "injury, comp claim",
  "Can I get compensation for my injury?",
  "Should I file a CA-1 for my injury?",
  "CA-2 for an injury",
  "FECA injury claim",
  "light duty after my injury",
  "Limited duty after an injury",
  "injury leave",
  "Who pays my medical bills after an injury?",
  "Can I get medical treatment for my injury?",
  "Do I get paid if I am injured at work?",
  "My injury claim",
];
// B-1 family b: non-safety "danger" / "hazard pay".
const nonSafetyDanger = [
  "Am I in danger of being fired?",
  "Is my job in danger?",
  "Am I in danger of losing my bid?",
  "Is there hazard pay?",
  "Do I get hazard pay?",
  "Is a hazard pay differential in the contract?",
];
// B-1 family c + the rest of the real Article 11 Section 1 holiday list (checked against the served CBA text) + Easter.
const namedHolidays = [
  "Do I get time off on Christmas?",
  "Can I take time off on Thanksgiving?",
  "Can I use PTO on Christmas Day?",
  "Can I take time off for New Year's Day?",
  "Can I take time off for New Year’s Day?",
  "Can I take time off on Martin Luther King Day?",
  "Can I use PTO on MLK Day?",
  "Can I take time off for Washington's Birthday?",
  "Can I use PTO on Presidents' Day?",
  "Time off on Memorial Day",
  "Can I take time off on Juneteenth?",
  "Can I take time off on Independence Day?",
  "Can I take time off on the Fourth of July?",
  "PTO on Labor Day",
  "Can I take time off on Columbus Day?",
  "Can I take time off on Veterans Day?",
  "Time off for Easter",
];
// B-1 family d: other leave types reached through "time off" / "PTO".
const otherLeaveTypes = [
  "Can I take time off for a doctor's appointment?",
  "Can I use PTO for a doctor appointment?",
  "Can I take time off for jury duty?",
  "Can I take time off for court?",
  "Can I take time off for a funeral?",
  "Can I take bereavement time off?",
  "Can I take time off for military duty?",
  "Time off without pay",
  "Can I take time off for union business?",
];

describe("Amendment 2 B-1a: workers' comp wording never reaches safety and health", () => {
  it.each(compVariants)("%s", (question) => expectNotRoutedTo(question, "safety_health"));
});

describe("Amendment 2 B-1b: non-safety danger and hazard pay never reach safety and health", () => {
  it.each(nonSafetyDanger)("%s", (question) => expectNotRoutedTo(question, "safety_health"));
});

describe("Amendment 2 B-1c: named holidays never reach annual leave through time off / PTO", () => {
  it.each(namedHolidays)("%s", (question) => expectNotRoutedTo(question, "annual_leave"));
});

describe("Amendment 2 B-1d: other leave types never reach annual leave through time off / PTO", () => {
  it.each(otherLeaveTypes)("%s", (question) => expectNotRoutedTo(question, "annual_leave"));
});

describe("Amendment 2 B-1e: a property claim with injury wording never reaches safety and health", () => {
  it("My glasses broke when I was injured, can I file a claim?", () =>
    expectNotRoutedTo("My glasses broke when I was injured, can I file a claim?", "safety_health"));
});

describe("Amendment 2 narrowing keeps genuine safety and time-off wording working", () => {
  it.each([
    ["safety_health", "Is this area dangerous?", "Article 14.1"],
    // Amendment 3 (B-2) overrides three rows here: bare danger / hazard / injured wording no longer selects safety_health.
    // "There is a danger at my station", "Hazardous materials at work", "I was injured on the job" are no-answer rows in jcimQaFix1Amend3.test.ts.
    ["annual_leave", "How much time off do I get?", "Article 10.3.A"],
    ["annual_leave", "My supervisor denied my PTO", "Article 10.3.A"],
  ] as const)("%s: %s", (topicId, question, locator) => {
    expect(publicStewardWorkflowMatch(question).topicId).toBe(topicId);
    const { snapshot, answer } = ask(question);
    expect(snapshot.sourceMode).toBe("cba");
    expect(answer.noAnswer).toBe(false);
    expect(answer.citations.map(citationLabel).join("\n")).toContain(`· ${locator} ·`);
  });
});

describe("Amendment 2 NB-D2: supervisor-phrased official-topic questions never reach the fakes", () => {
  it.each([
    ["My supervisor told me to take time off when I'm sick", null],
    ["My supervisor won't let me take PTO when I am ill", null],
    ["Is my supervisor allowed to deny PTO for a holiday?", null],
    ["My supervisor wants me to work hurt", null],
    ["My supervisor made me work on Christmas", null],
    ["My supervisor says I am sick too often", null],
    // Amendment 3 (B-2) overrides the earlier "safety_health" expectation: bare "injured" no longer selects a topic.
    ["My supervisor said I got injured", null],
  ] as const)("%s", (question, topicId) => {
    expect(publicStewardWorkflowMatch(question).topicId).toBe(topicId);
    const { snapshot, answer } = ask(question);
    expect(snapshot.sourceMode).not.toBe("fake");
    expect(answer.version.provider).not.toBe("local-fake-deterministic");
    expect(answer.citations.every((citation) => Boolean(citation.publicSourceType))).toBe(true);
  });

  it("a fake/sample-labelled supervisor question still uses the labelled fake lane", () => {
    expect(resolveChatAnswerLane("What is a sample answer about my supervisor and time off?", "auto")).toBe("fake");
  });
});

describe("Amendment 2 NB-D3: injury questions that straddle OWCP stay a safe no-answer", () => {
  it.each([
    "Can I file an employee claim for damage from my injury?",
    "Can I use sick leave for my injury?",
  ])("%s", (question) => {
    expect(publicStewardWorkflowMatch(question).topicId).toBeNull();
    const { snapshot, answer } = ask(question);
    expect(snapshot.sourceMode).toBe("cba");
    expect(answer.noAnswer).toBe(true);
    expect(answer.citations.filter((citation) => citation.publicSourceType === "jcim_joint_interpretation")).toHaveLength(0);
  });
});
