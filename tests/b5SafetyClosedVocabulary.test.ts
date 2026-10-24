import { describe, expect, it } from "vitest";
import { createChatSubmitSnapshot, resolveChatAnswerLane, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { publicStewardWorkflowMatch } from "@/lib/publicStewardWorkflowRegistry";
import { citationLabel } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// B-5 (delta review 5, proposed fix): the closed safety vocabulary admitted personal injury and illness questions. accident /
// injury now count only as the thing reported, cold only in "in (the) cold", exposed only before "electrical"; every sentence
// must name the hazard, the reporting or the contract; and a question that names an accident or injury may not also ask
// whether to work. The 19 delta-5 rows live outside the repo (B-5-rows.md); the four named in I-0 are pinned first, then the
// reproduced class.
const cbaSource = createCbaSourceFixtureCacheWithArticle19();
const jcimSource = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261024", gitSha: "b5-safety-fix" });

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
  expect(answer.noAnswer).toBe(true);
  expect(answer.citations).toHaveLength(0);
}

function safety(question: string) {
  expect(publicStewardWorkflowMatch(question).topicId).toBe("safety_health");
  const { snapshot, answer } = ask(question);
  expect(snapshot.sourceMode).toBe("cba");
  expect(answer.noAnswer).toBe(false);
  expect(answer.citations.map(citationLabel).join("\n")).toContain("· Article 14.1 ·");
}

describe("B-5: the four rows named in I-0 are a no-answer", () => {
  it.each([
    "Is it unsafe to work with a cold?",
    "Is it dangerous to work with an injury?",
    "I have an injury, is it unsafe to work?",
    "Is it unsafe to work? I have a cold.",
  ])("%s", expectNoAnswer);
});

describe("B-5: personal injury / illness constructions are a no-answer", () => {
  it.each([
    "Is it unsafe to work with an injury?",
    "Is it dangerous to work with a cold?",
    "Is it unsafe to work if I have a cold?",
    "Is it unsafe to work if I have an injury?",
    "Is it dangerous to work if I have an injury?",
    "Is it unsafe to work if I got a cold?",
    "I got a cold, is it unsafe to work?",
    "I have a cold. Is it unsafe to work?",
    "I have an injury. Is it dangerous to work?",
    "I got an injury, is it unsafe to work?",
    "I have been in an accident, is it unsafe to work?",
    "I was in an accident, is it unsafe to work?",
    "I have been in an accident. Is it unsafe to work?",
    "Is it unsafe to work with injuries?",
    "Is it unsafe to work with my injury?",
    "Is it unsafe for me to work with a cold?",
    "Is it dangerous for me to work with an injury?",
    "Is it unsafe to work on my injury?",
    "Is it unsafe to work at the dock with an injury?",
    "Is it dangerous to work with accidents?",
    "Is working with a cold dangerous?",
    "Is it unsafe? I have an injury.",
    "Is it dangerous to work with a cold in the plant?",
  ])("%s", expectNoAnswer);
});

describe("B-5 rules: each new context rule is load-bearing", () => {
  it.each([
    // exposed only before "electrical" (I-0c)
    "I was exposed, is it unsafe to work?",
    "Is it unsafe to work if I have been exposed?",
    // cold only in "in (the) cold"
    "Is it unsafe to work in the cold if I have a cold?",
    "Is it unsafe to work if I have the cold?",
    // accident / injury only next to a report word
    "Is it unsafe to work with an accident?",
    "Is the dock unsafe with my injury?",
    "Is it dangerous to work in the cold with an injury?",
    // every sentence needs a hazard / reporting / contract anchor
    "Is the dock unsafe? I am mad.",
    // naming an accident / injury and asking whether to work
    "I reported an injury. Is it unsafe to work?",
    "I reported an injury, is it unsafe to work with it?",
    "I reported an injury, is working with it unsafe?",
    "Is it unsafe to work? I have an accident report.",
  ])("%s", expectNoAnswer);
});

describe("B-5: workplace safety and reporting keep working", () => {
  it.each([
    "Is it dangerous to work in the cold?",
    "Is it dangerous to work in the cold at the dock?",
    "How do I report an injury?",
    "How do I report an accident?",
    "Is there a deadline to report an injury?",
    "Accident report form",
    "Injury report deadline",
    "Can I be fired for reporting an injury?",
    "I reported an injury and my supervisor got mad",
    "Is it unsafe to work with exposed electrical panel?",
    "There is an exposed electrical panel on the dock, is that unsafe?",
    "Is the dock unsafe? What does the contract say?",
    "I have an injury report. What does the contract say?",
    "Can my supervisor make me work in a dangerous area?",
  ])("%s", safety);
});
