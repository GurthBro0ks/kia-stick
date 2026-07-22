import { describe, expect, it } from "vitest";
import { buildAnswer } from "@/lib/answerGovernor";
import { buildPublicSourceAnswer } from "@/lib/publicSourceAnswer";
import { createSavedAnswerRecord, migrateSavedAnswers } from "@/lib/savedAnswers";
import { PUBLIC_SOURCE_APPLICABILITY_WARNING, PUBLIC_SOURCE_ID, PUBLIC_SOURCE_PROMPT_VERSION, PUBLIC_SOURCE_PROVIDER } from "@/lib/publicSource";
import { createRuntimeVersion } from "@/lib/version";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const runtimeVersion = createRuntimeVersion({ buildDate: "20260717", gitSha: "80e53c7" });
const common = {
  source: createPublicSourceFixtureCache(),
  runtimeVersion,
  mode: "Strict Research" as const,
  scope: "Official-Like" as const,
  detail: "Detailed" as const,
};

describe("citation-first public answers", () => {
  it("answers the represented-employee request question with exact public anchors", () => {
    const answer = buildPublicSourceAnswer({
      ...common,
      question: "When may a represented employee request a union representative during an investigatory interview?",
    });
    expect(answer.noAnswer).toBe(false);
    expect(answer.answerKind).toBe("public");
    expect(answer.shortAnswer).toContain("reasonably believes");
    expect(answer.version.provider).toBe(PUBLIC_SOURCE_PROVIDER);
    expect(answer.version.promptVersion).toBe(PUBLIC_SOURCE_PROMPT_VERSION);
    expect(answer.citations.length).toBe(3);
    for (const citation of answer.citations) {
      expect(citation.sourceId).toBe(PUBLIC_SOURCE_ID);
      expect(citation.sectionId).toMatch(/^section-/);
      expect(citation.paragraphId).toMatch(/-p\d{2}$/);
      expect(citation.retrievedAt).toBe(common.source.retrievedAt);
      expect(citation.contentHash).toBe(common.source.normalized.sha256);
      expect(citation.publicSourceType).toBe("nlrb_guidance");
      expect(citation.citationVerificationState).toBe("verified_current");
      expect(citation.sourceInstanceId).toMatch(/^[a-f0-9]{64}$/);
      expect(citation.paragraphContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(citation.citationAnchorSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("answers representative role without claiming unlimited conduct", () => {
    const answer = buildPublicSourceAnswer({ ...common, question: "What role may the representative play?" });
    expect(answer.noAnswer).toBe(false);
    expect(answer.shortAnswer).toContain("advisor and witness");
    expect(answer.shortAnswer).toContain("may not disrupt");
  });

  it("rejects a controlling USPS claim and states unverified applicability", () => {
    const answer = buildPublicSourceAnswer({
      ...common,
      question: "Does this source by itself establish the controlling rule for USPS employees?",
    });
    expect(answer.noAnswer).toBe(false);
    expect(answer.shortAnswer).toContain("No.");
    expect(answer.shortAnswer).toContain(PUBLIC_SOURCE_APPLICABILITY_WARNING);
    expect(answer.shortAnswer).toContain("Postal applicability is unverified");
    expect(answer.shortAnswer).not.toMatch(/(?:is|establishes|provides) controlling USPS authority/i);
  });

  it("returns no-answer for unsupported public questions and unavailable cache", () => {
    const unsupported = buildPublicSourceAnswer({ ...common, question: "How much annual leave do I have?" });
    expect(unsupported.noAnswer).toBe(true);
    expect(unsupported.citations).toEqual([]);
    const unavailable = buildPublicSourceAnswer({ ...common, source: null, question: "What role may the representative play?" });
    expect(unavailable.noAnswer).toBe(true);
    expect(unavailable.shortAnswer).toContain("cache");
  });

  it("preserves public source identity, hashes, and anchors in Saved", () => {
    const answer = buildPublicSourceAnswer({ ...common, question: "What role may the representative play?" });
    const saved = createSavedAnswerRecord({
      answer,
      mode: common.mode,
      scope: common.scope,
      detail: common.detail,
      timestamp: "2026-07-17T12:30:00.000Z",
    });
    expect(saved.provider).toBe(PUBLIC_SOURCE_PROVIDER);
    expect(saved.citations[0].sourceId).toBe(PUBLIC_SOURCE_ID);
    expect(saved.citations[0].contentHash).toBe(common.source.normalized.sha256);
    expect(saved.citations[0].paragraphId).toMatch(/-p\d{2}$/);
    expect(migrateSavedAnswers([saved])[0].citations).toEqual(saved.citations);
  });

  it("keeps fake and public provider identities separate", () => {
    const fake = buildAnswer("What evidence belongs in a Step 1 fake file?", {
      mode: "Strict Research",
      scope: "All Fake",
      detail: "Detailed",
      runtimeVersion,
    });
    const publicAnswer = buildPublicSourceAnswer({ ...common, question: "What role may the representative play?" });
    expect(fake.answerKind).toBe("fake");
    expect(fake.version.provider).toBe("local-fake-deterministic");
    expect(publicAnswer.version.provider).toBe(PUBLIC_SOURCE_PROVIDER);
    expect(publicAnswer.relatedFakeSections).toEqual([]);
  });
});
