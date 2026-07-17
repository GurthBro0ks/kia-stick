import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AssistantMessageCard,
  KiaStickApp,
  SavedAnswersPanel,
  SourcesPanel,
} from "@/components/KiaStickApp";
import {
  createChatSubmitSnapshot,
  resolveChatAnswerLane,
  routeChatQuestion,
  type ChatSourcePolicy,
} from "@/lib/chatAnswerRouter";
import {
  createAssistantMessage,
  createLoadingAssistantMessage,
  createUserMessage,
} from "@/lib/conversationModel";
import {
  PUBLIC_SOURCE_CONTROLLING_FOR_USPS,
  PUBLIC_SOURCE_ID,
  PUBLIC_SOURCE_OWNER,
  PUBLIC_SOURCE_POSTAL_APPLICABILITY,
  PUBLIC_SOURCE_PROMPT_VERSION,
  PUBLIC_SOURCE_PROVIDER,
  publicSourceParagraphAnchorId,
} from "@/lib/publicSource";
import { createSavedAnswerRecord } from "@/lib/savedAnswers";
import { buildSourceHierarchyGroups } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const runtimeVersion = createRuntimeVersion({ buildDate: "20260717", gitSha: "repairtest" });
const source = createPublicSourceFixtureCache();
const defaults = {
  mode: "Strict Research" as const,
  scope: "Official-Like" as const,
  detail: "Detailed" as const,
};

function submitThroughComponentRouter(
  question: string,
  options: { sourcePolicy?: ChatSourcePolicy; cache?: typeof source | null } = {}
) {
  const snapshot = createChatSubmitSnapshot({
    question,
    sourcePolicy: options.sourcePolicy ?? "auto",
    ...defaults,
  });
  const user = createUserMessage({
    threadId: "thread-public-routing-integration",
    content: question,
    modeScopeDetail: snapshot,
    now: "2026-07-17T13:00:00.000Z",
  });
  const loading = createLoadingAssistantMessage({
    threadId: user.threadId,
    turnId: user.turnId,
    parentMessageId: user.messageId,
    modeScopeDetail: snapshot,
    now: "2026-07-17T13:00:00.100Z",
  });
  const answer = routeChatQuestion({
    question: user.content,
    snapshot,
    publicSource: options.cache === undefined ? source : options.cache,
    runtimeVersion,
  });
  const assistant = createAssistantMessage({
    threadId: user.threadId,
    turnId: user.turnId,
    parentMessageId: user.messageId,
    answer,
    modeScopeDetail: snapshot,
    now: "2026-07-17T13:00:01.000Z",
  });
  const cardHtml = renderToStaticMarkup(React.createElement(AssistantMessageCard, {
    message: assistant,
    onRetry: () => undefined,
    onSave: () => undefined,
    onCitationNavigate: () => undefined,
  }));
  return { snapshot, loading, answer, assistant, cardHtml };
}

describe("public Chat submit orchestration regression", () => {
  it.each([
    "When may a represented employee request a union representative during an investigatory interview?",
    "What role may the representative play?",
  ])("automatically routes supported question through the public card path: %s", (question) => {
    const result = submitThroughComponentRouter(question);

    expect(result.snapshot.sourceModePolicy).toBe("auto");
    expect(result.snapshot.sourceMode).toBe("nlrb");
    expect(result.snapshot.scope).toBe("Official-Like");
    expect(result.loading.answer.answerKind).toBe("public");
    expect(result.answer.answerKind).toBe("public");
    expect(result.answer.noAnswer).toBe(false);
    expect(result.answer.version.provider).toBe(PUBLIC_SOURCE_PROVIDER);
    expect(result.answer.version.promptVersion).toBe(PUBLIC_SOURCE_PROMPT_VERSION);
    expect(result.answer.citations.length).toBeGreaterThan(0);
    expect(result.answer.citations.every((citation) => (
      citation.sourceId === PUBLIC_SOURCE_ID &&
      Boolean(citation.sectionId?.startsWith("section-")) &&
      Boolean(citation.paragraphId?.match(/-p\d{2}$/))
    ))).toBe(true);
    expect(result.cardHtml).toContain("NLRB Weingarten public pilot");
    expect(result.cardHtml).toContain("Actual lane: public_nlrb");
    expect(result.cardHtml).toContain(`Provider: ${PUBLIC_SOURCE_PROVIDER}`);
    expect(result.cardHtml).toContain(`Prompt: ${PUBLIC_SOURCE_PROMPT_VERSION}`);
    expect(result.cardHtml).toContain("Save to Saved");
    expect(result.cardHtml).not.toContain("No answer to save");
    expect(result.cardHtml).not.toContain("local-fake-deterministic");
  });

  it("routes USPS applicability through public governance without inventing controlling authority", () => {
    const result = submitThroughComponentRouter(
      "Does this source by itself establish the controlling rule for USPS employees?"
    );

    expect(result.snapshot.sourceMode).toBe("nlrb");
    expect(result.answer.noAnswer).toBe(false);
    expect(result.answer.shortAnswer).toContain("No.");
    expect(result.answer.shortAnswer).toContain("Postal applicability is unverified");
    expect(result.answer.postalApplicability).toBe(PUBLIC_SOURCE_POSTAL_APPLICABILITY);
    expect(result.answer.controllingForUsps).toBe(PUBLIC_SOURCE_CONTROLLING_FOR_USPS);
    expect(result.answer.version.provider).toBe(PUBLIC_SOURCE_PROVIDER);
    expect(result.answer.shortAnswer).not.toMatch(/CBA|collective.bargaining agreement/i);
  });

  it("returns the exact unsupported demonstration as an unsaveable public-lane no-answer", () => {
    const result = submitThroughComponentRouter(
      "What is the contractual deadline for filing an APWU grievance?",
      { sourcePolicy: "nlrb" }
    );

    expect(result.snapshot.sourceMode).toBe("nlrb");
    expect(result.answer.answerKind).toBe("public");
    expect(result.answer.noAnswer).toBe(true);
    expect(result.answer.citations).toEqual([]);
    expect(result.answer.shortAnswer).toContain("does not support the requested claim");
    expect(result.answer.version.provider).toBe(PUBLIC_SOURCE_PROVIDER);
    expect(result.cardHtml).toContain("Actual lane: public_nlrb");
    expect(result.cardHtml).toContain("No answer to save");
    expect(result.cardHtml).not.toContain("Name the exact fake issue");
    expect(result.cardHtml).not.toContain("controlling fake source");
    expect(result.cardHtml).not.toContain("local-fake-deterministic");
  });

  it("keeps a missing cache in the public lane and does not fall through to fake", () => {
    const result = submitThroughComponentRouter(
      "What role may the representative play?",
      { cache: null }
    );

    expect(result.snapshot.sourceMode).toBe("nlrb");
    expect(result.answer.answerKind).toBe("public");
    expect(result.answer.noAnswer).toBe(true);
    expect(result.answer.citations).toEqual([]);
    expect(result.answer.shortAnswer).toContain("bounded local cache");
    expect(result.answer.version.provider).toBe(PUBLIC_SOURCE_PROVIDER);
    expect(result.cardHtml).not.toContain("local-fake-deterministic");
  });

  it("keeps known fake questions on the isolated fake provider in automatic mode", () => {
    const question = "What evidence belongs in a Step 1 fake file?";
    const result = submitThroughComponentRouter(question);

    expect(resolveChatAnswerLane(question, "auto")).toBe("fake");
    expect(result.snapshot.sourceMode).toBe("fake");
    expect(result.answer.answerKind).toBe("fake");
    expect(result.answer.version.provider).toBe("local-fake-deterministic");
    expect(result.cardHtml).toContain("Actual lane: fake");
    expect(result.cardHtml).not.toContain(PUBLIC_SOURCE_PROVIDER);
  });

  it("preserves the full public identity in Saved and public paragraph navigation", () => {
    const result = submitThroughComponentRouter("What role may the representative play?");
    const saved = createSavedAnswerRecord({
      answer: result.answer,
      ...defaults,
      timestamp: "2026-07-17T13:01:00.000Z",
    });
    const savedHtml = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
      saved: [saved],
      onDelete: () => undefined,
    }));
    const sourcesHtml = renderToStaticMarkup(React.createElement(SourcesPanel, {
      publicSourceState: { status: "available", source },
      sourceHierarchyGroups: buildSourceHierarchyGroups(),
      runtimeVersion,
    }));

    expect(saved.answerLane).toBe("public");
    expect(saved.sourceId).toBe(PUBLIC_SOURCE_ID);
    expect(saved.sourceOwner).toBe(PUBLIC_SOURCE_OWNER);
    expect(saved.sourceRetrievedAt).toBe(source.retrievedAt);
    expect(saved.normalizedSourceHash).toBe(source.normalized.sha256);
    expect(saved.postalApplicability).toBe(PUBLIC_SOURCE_POSTAL_APPLICABILITY);
    expect(saved.controllingForUsps).toBe(PUBLIC_SOURCE_CONTROLLING_FOR_USPS);
    expect(saved.provider).toBe(PUBLIC_SOURCE_PROVIDER);
    expect(saved.version.promptVersion).toBe(PUBLIC_SOURCE_PROMPT_VERSION);
    expect(savedHtml).toContain("PUBLIC DATA PILOT");
    expect(savedHtml).toContain(PUBLIC_SOURCE_OWNER);
    expect(savedHtml).toContain(source.retrievedAt);
    expect(savedHtml).toContain(source.normalized.sha256);
    for (const citation of result.answer.citations) {
      const anchorId = publicSourceParagraphAnchorId(citation.paragraphId!);
      expect(sourcesHtml).toContain(`id="${anchorId}"`);
    }
  });

  it("makes automatic routing visible by default and binds the component to the tested router", () => {
    const shellHtml = renderToStaticMarkup(React.createElement(KiaStickApp, { runtimeVersion }));
    const componentSource = readFileSync("components/KiaStickApp.tsx", "utf8");

    expect(shellHtml).toContain("Chat answer lane policy");
    expect(shellHtml).toContain("Automatic — official public intents first");
    expect(shellHtml).toMatch(/<option value="auto" selected=""/);
    expect(componentSource).toContain("createChatSubmitSnapshot({");
    expect(componentSource).toContain("routeChatQuestion({");
  });
});
