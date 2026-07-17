import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistantMessageCard, SavedAnswersPanel, SourcesPanel } from "@/components/KiaStickApp";
import {
  CBA_DOCUMENT_STATUS,
  CBA_PROMPT_VERSION,
  CBA_PROVIDER,
  CBA_SOURCE_ID,
  cbaParagraphAnchorId,
} from "@/lib/cbaSource";
import { createChatSubmitSnapshot, resolveChatAnswerLane, routeChatQuestion, type ChatSourcePolicy } from "@/lib/chatAnswerRouter";
import { createAssistantMessage, createUserMessage } from "@/lib/conversationModel";
import { PUBLIC_SOURCE_PROVIDER } from "@/lib/publicSource";
import { createSavedAnswerRecord } from "@/lib/savedAnswers";
import { buildSourceHierarchyGroups } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const runtimeVersion = createRuntimeVersion({ buildDate: "20260717", gitSha: "cbatest" });
const cbaSource = createCbaSourceFixtureCache();
const nlrbSource = createPublicSourceFixtureCache();
const defaults = { mode: "Strict Research" as const, scope: "Official-Like" as const, detail: "Detailed" as const };

function submit(question: string, options: { sourcePolicy?: ChatSourcePolicy; cache?: typeof cbaSource | null } = {}) {
  const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: options.sourcePolicy ?? "auto", ...defaults });
  const user = createUserMessage({ threadId: "thread-cba-test", content: question, modeScopeDetail: snapshot, now: "2026-07-17T14:00:00.000Z" });
  const answer = routeChatQuestion({
    question,
    snapshot,
    publicSource: nlrbSource,
    cbaSource: options.cache === undefined ? cbaSource : options.cache,
    runtimeVersion,
  });
  const assistant = createAssistantMessage({
    threadId: user.threadId,
    turnId: user.turnId,
    parentMessageId: user.messageId,
    answer,
    modeScopeDetail: snapshot,
    now: "2026-07-17T14:00:01.000Z",
  });
  const cardHtml = renderToStaticMarkup(React.createElement(AssistantMessageCard, {
    message: assistant,
    onRetry: () => undefined,
    onSave: () => undefined,
    onCitationNavigate: () => undefined,
  }));
  return { snapshot, answer, assistant, cardHtml };
}

describe("official CBA Chat and UI integration", () => {
  it("routes the grievance deadline to Article 15 Section 2 Step 1(a) with a qualified fourteen-day rule", () => {
    const result = submit("How many days do I have to file a grievance?");
    expect(result.snapshot.sourceMode).toBe("cba");
    expect(result.answer.publicSourceRole).toBe("cba_contract");
    expect(result.answer.noAnswer).toBe(false);
    expect(result.answer.shortAnswer).toContain("fourteen-day period");
    expect(result.answer.shortAnswer).toContain("first learned or reasonably");
    expect(result.answer.shortAnswer).toContain("not an unqualified deadline");
    expect(result.answer.version.provider).toBe(CBA_PROVIDER);
    expect(result.answer.version.promptVersion).toBe(CBA_PROMPT_VERSION);
    expect(result.answer.citations[0]).toMatchObject({
      sourceId: CBA_SOURCE_ID,
      publicSourceType: "cba_contract",
      articleNumber: "15",
      sectionId: "section-2",
      subsection: "Step 1(a)",
    });
    expect(result.answer.citations[0].pdfPageNumber).toBeGreaterThan(0);
    expect(result.answer.citations[0].retrievedAt).toBe(cbaSource.retrievedAt);
    expect(result.answer.citations[0].contentHash).toBe(cbaSource.normalized.sha256);
    expect(result.cardHtml).toContain("Official APWU-USPS CBA");
    expect(result.cardHtml).toContain("Actual lane: public_cba");
    expect(result.cardHtml).toContain(`Provider: ${CBA_PROVIDER}`);
    expect(result.cardHtml).toContain("Save to Saved");
    expect(result.cardHtml).not.toContain("local-fake-deterministic");
  });

  it.each([
    ["What does Article 17 say about representation?", "17", "investigate, present, and adjust grievances"],
    ["What are the just-cause and discipline protections?", "16", "corrective rather than punitive"],
  ])("routes supported CBA intent %s", (question, article, answerText) => {
    const result = submit(question);
    expect(result.snapshot.sourceMode).toBe("cba");
    expect(result.answer.noAnswer).toBe(false);
    expect(result.answer.shortAnswer).toContain(answerText);
    expect(result.answer.citations.some((citation) => citation.articleNumber === article)).toBe(true);
    expect(result.answer.citations.every((citation) => citation.publicSourceType === "cba_contract")).toBe(true);
  });

  it("answers the cross-source question with separate CBA and NLRB authority identities", () => {
    const result = submit("Does the NLRB Weingarten page override the APWU-USPS CBA?");
    expect(result.snapshot.sourceMode).toBe("cba");
    expect(result.answer.publicSourceRole).toBe("cross_source");
    expect(result.answer.shortAnswer).toContain("No automatic override");
    expect(result.answer.shortAnswer).toContain("controlling contract language");
    expect(result.answer.shortAnswer).toContain("official general statutory guidance");
    expect(new Set(result.answer.citations.map((citation) => citation.publicSourceType))).toEqual(new Set(["cba_contract", "nlrb_guidance"]));
    expect(result.answer.citations.find((citation) => citation.publicSourceType === "cba_contract")?.sourceId).toBe(CBA_SOURCE_ID);
    expect(result.answer.citations.find((citation) => citation.publicSourceType === "nlrb_guidance")?.sourceId).toBe("nlrb-weingarten-rights");
  });

  it("refuses a specific case outcome, identifies missing facts, and remains unsaveable", () => {
    const result = submit("Did management violate the contract in my specific case?");
    expect(result.snapshot.sourceMode).toBe("cba");
    expect(result.answer.noAnswer).toBe(true);
    expect(result.answer.shortAnswer).toContain("cannot determine");
    expect(result.answer.missingFacts.join(" ")).toMatch(/what occurred|coverage|witnesses/i);
    expect(result.cardHtml).toContain("No answer to save");
    expect(result.cardHtml).not.toContain("local-fake-deterministic");
  });

  it("keeps a missing CBA cache in the CBA lane without NLRB or fake fallback", () => {
    const result = submit("How many days do I have to file a grievance?", { cache: null });
    expect(result.answer.noAnswer).toBe(true);
    expect(result.answer.version.provider).toBe(CBA_PROVIDER);
    expect(result.answer.shortAnswer).toContain("CBA cache is unavailable");
    expect(result.cardHtml).not.toContain(PUBLIC_SOURCE_PROVIDER);
    expect(result.cardHtml).not.toContain("local-fake-deterministic");
  });

  it("preserves full CBA citation and authority metadata in Saved", () => {
    const result = submit("How many days do I have to file a grievance?");
    const saved = createSavedAnswerRecord({ answer: result.answer, ...defaults, timestamp: "2026-07-17T14:01:00.000Z" });
    expect(saved.answerLane).toBe("public_cba");
    expect(saved.sourceId).toBe(CBA_SOURCE_ID);
    expect(saved.sourceStatus).toBe(CBA_DOCUMENT_STATUS);
    expect(saved.pdfSha256).toBe(cbaSource.response.sha256);
    expect(saved.normalizedSourceHash).toBe(cbaSource.normalized.sha256);
    expect(saved.provider).toBe(CBA_PROVIDER);
    expect(saved.citations[0].pdfPageNumber).toBeGreaterThan(0);
    const html = renderToStaticMarkup(React.createElement(SavedAnswersPanel, { saved: [saved], onDelete: () => undefined }));
    expect(html).toContain("PUBLIC DATA PILOT — CBA");
    expect(html).toContain("official controlling CBA");
    expect(html).toContain(cbaSource.response.sha256);
  });

  it("renders two separate public sources, visible search, and the exact internal citation anchor", () => {
    const answer = submit("How many days do I have to file a grievance?").answer;
    const targetId = answer.citations[0].paragraphId!;
    const html = renderToStaticMarkup(React.createElement(SourcesPanel, {
      cbaSourceState: { status: "available", source: cbaSource },
      cbaCitationTargetId: targetId,
      publicSourceState: { status: "available", source: nlrbSource },
      sourceHierarchyGroups: buildSourceHierarchyGroups(),
      runtimeVersion,
    }));
    expect(html).toContain("OFFICIAL FINAL CBA");
    expect(html).toContain("CONTROLLING CONTRACT LANGUAGE");
    expect(html).toContain("OFFICIAL GENERAL GUIDANCE");
    expect(html).toContain("Deterministic lexical search");
    expect(html).toContain("Article 15");
    expect(html.match(new RegExp(`id="${cbaParagraphAnchorId(targetId)}"`, "g"))).toHaveLength(1);
    expect(html).toContain("Official PDF");
  });

  it("preserves automatic NLRB and known fake routing after adding the higher-priority CBA classifier", () => {
    expect(resolveChatAnswerLane("What role may the representative play?", "auto")).toBe("nlrb");
    expect(resolveChatAnswerLane("What evidence belongs in a Step 1 fake file?", "auto")).toBe("fake");
    expect(resolveChatAnswerLane("Tell me an unsupported legal conclusion", "auto")).toBe("safe_no_answer");
    const safe = submit("Tell me an unsupported legal conclusion");
    expect(safe.answer.version.provider).toBe("local-source-router-deterministic");
  });
});
