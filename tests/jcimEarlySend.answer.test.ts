import { describe, expect, it } from "vitest";
import { createChatSubmitSnapshot, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { JCIM_SOURCE_ID } from "@/lib/jcimSource";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-early-send-1, test 1: answer code with JCIM missing must never skip JCIM silently.
// SYNTHETIC fixtures only; no network.
const cba = createCbaSourceFixtureCacheWithArticle19();
const jcim = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261029", gitSha: "e23ece0" });
const SICK = "How does sick leave work?";

function ask(question: string, jcimSource: typeof jcim | null, jcimStatus?: "available" | "loading" | "unavailable") {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", mode: "Strict Research", scope: "Official-Like", detail: "Detailed" });
  return routeChatQuestion({ question, snapshot, publicSource: null, cbaSource: cba, jcimSource, jcimStatus, runtimeVersion } as Parameters<typeof routeChatQuestion>[0]);
}

describe("KIA-jcim-early-send-1 test 1: answer code with JCIM missing", () => {
  it.each(["loading", "unavailable"] as const)("JCIM %s: the sick-leave answer is no-answer or says JCIM was not checked", (status) => {
    const answer = ask(SICK, null, status);
    expect(answer.citations.some((citation) => citation.sourceId === JCIM_SOURCE_ID)).toBe(false);
    if (!answer.noAnswer) {
      expect(answer.citations[0].publicSourceType).toBe("cba_contract");
      expect(answer.shortAnswer).toMatch(/JCIM not checked/);
      expect(answer.shortAnswer).toMatch(/only the contract language was reviewed/);
    }
    expect(answer.noAnswer || /JCIM not checked/.test(answer.shortAnswer)).toBe(true);
  });

  it("the loading and unavailable disclosures say different, plain things", () => {
    expect(ask(SICK, null, "loading").shortAnswer).toMatch(/still loading/);
    expect(ask(SICK, null, "unavailable").shortAnswer).toMatch(/unavailable right now/);
  });

  it("with JCIM present, sick leave still cites JCIM Article 10.5 and has no disclosure", () => {
    const answer = ask(SICK, jcim, "available");
    expect(answer.noAnswer).toBe(false);
    const jcimCitations = answer.citations.filter((citation) => citation.sourceId === JCIM_SOURCE_ID);
    expect(jcimCitations.map((citation) => citation.section)).toEqual(["Article 10.5"]);
    expect(answer.shortAnswer).not.toMatch(/JCIM not checked/);
    expect({ ...answer, generatedAt: "" }).toEqual({ ...ask(SICK, jcim), generatedAt: "" });
  });

  it("callers that pass no JCIM status keep the previous contract-only answer", () => {
    expect(ask(SICK, null).shortAnswer).not.toMatch(/JCIM not checked/);
  });
});
