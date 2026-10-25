import { describe, expect, it } from "vitest";
import { createChatSubmitSnapshot, resolveChatAnswerLane, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { publicStewardWorkflowMatch } from "@/lib/publicStewardWorkflowRegistry";
import { citationLabel } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-qa-fix-1 Amendment 2 mutation-gap rows: isolate guards whose words were always accompanied by another guard word
// in tests/jcimQaFix1Amend2.test.ts (mutants S4 "drop feca" and R3 "drop pto / time off from official vocabulary" survived).
const cbaSource = createCbaSourceFixtureCacheWithArticle19();
const jcimSource = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261024", gitSha: "qa-fix-1-amend-2-gaps" });

function ask(question: string) {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "All Fake", detail: "Detailed" });
  return { snapshot, answer: routeChatQuestion({ question, snapshot, publicSource: null, cbaSource, jcimSource, runtimeVersion, threadHistory: [] }) };
}

describe("Amendment 2 gap S4: FECA wording alone keeps an injury question off safety and health", () => {
  it.each(["Can I file under FECA for my injury?", "Does FECA cover my injury?"])("%s", (question) => {
    expect(publicStewardWorkflowMatch(question).matchedTopicIds).not.toContain("safety_health");
    expect(resolveChatAnswerLane(question, "auto")).not.toBe("fake");
    expect(ask(question).answer.citations.map(citationLabel).join("\n")).not.toContain("· Article 14.1 ·");
  });
});

describe("Amendment 2 gap R3: supervisor + PTO / time off alone never reaches the fakes", () => {
  it.each(["My supervisor won't give me time off for jury duty", "My supervisor denied my PTO for a funeral"])("%s", (question) => {
    expect(publicStewardWorkflowMatch(question).topicId).toBeNull();
    const { snapshot, answer } = ask(question);
    expect(snapshot.sourceMode).toBe("safe_no_answer");
    expect(answer.version.provider).not.toBe("local-fake-deterministic");
  });
});
