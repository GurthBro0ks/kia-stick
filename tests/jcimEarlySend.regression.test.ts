import { describe, expect, it } from "vitest";
import { createChatSubmitSnapshot, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-early-send-1 regression: the 19 B-5 rows stay no-answer with 0 citations for every JCIM status,
// and never pick up the JCIM-not-checked disclosure.
const B5_ROWS = [
  "Is it unsafe to work with a cold?", "Is it dangerous to work with an injury?", "I got an injury, is it unsafe to work?",
  "Is it unsafe to work with an injury?", "Is it unsafe to work with my injury?", "Is it dangerous to work with injuries?",
  "Is it unsafe for me to work with an injury?", "Is it unsafe to work if I have an injury?", "I have an injury, is it unsafe to work?",
  "I have a cold, is it unsafe to work?", "Is it dangerous to work with a cold?", "Is it unsafe to work with a cold? What does the contract say?",
  "Is it unsafe to work if I have a cold?", "I have been in an accident, is it unsafe to work?", "Is it unsafe to work on my injury?",
  "Is it unsafe for my injury to work?", "I got a cold, is it dangerous to work?", "Is it unsafe to work? I have a cold.",
  "Is it unsafe to work? I got an injury.",
];
const cba = createCbaSourceFixtureCacheWithArticle19();
const jcim = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261029", gitSha: "e23ece0" });

describe("KIA-jcim-early-send-1 regression: B-5 rows", () => {
  it("has 19 rows", () => { expect(B5_ROWS).toHaveLength(19); });
  for (const [label, jcimSource, jcimStatus] of [["available", jcim, "available"], ["loading", null, "loading"],
    ["unavailable", null, "unavailable"], ["legacy", jcim, undefined]] as const) {
    it(`JCIM ${label}: all 19 rows are no-answer with 0 citations and no disclosure`, () => {
      for (const question of B5_ROWS) {
        const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "Official-Like", detail: "Detailed" });
        const answer = routeChatQuestion({ question, snapshot, publicSource: null, cbaSource: cba, jcimSource, jcimStatus,
          runtimeVersion } as Parameters<typeof routeChatQuestion>[0]);
        expect(answer.noAnswer, question).toBe(true);
        expect(answer.citations, question).toHaveLength(0);
        expect(answer.shortAnswer, question).not.toMatch(/JCIM not checked/);
      }
    });
  }
});
