import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { GET as healthGET } from "@/app/health/route";
import VersionPage from "@/app/version/page";
import { AssistantMessageCard, FakeUploadPanel, FullPacket, ImportWizardPanel, KiaStickApp, SavedAnswersPanel, SourcesPanel, UserMessageBubble, VaultPanel } from "@/components/KiaStickApp";
import { answerToMarkdown, buildAnswer } from "@/lib/answerGovernor";
import {
  appendTurn,
  createAssistantMessage,
  createConversationThread,
  createLoadingAssistantMessage,
  createUserMessage,
  migrateConversationThread,
  recentAnswerHistory,
  replaceAssistantMessage,
} from "@/lib/conversationModel";
import {
  applyImportWizardAction,
  assertImportWizardFakeOnly,
  createInitialImportWizardState,
  exportImportWizardAuditJson,
  exportImportWizardAuditMarkdown,
  importWizardAllowedTransitions,
  importWizardNextAction,
  importWizardNextActionLabel,
  importWizardScreenCopy,
  importWizardStepLabels,
  importWizardSteps,
  nextImportWizardStep,
  type ImportWizardAction,
  type ImportWizardState,
} from "@/lib/importWizardModel";
import {
  assertFakeRedactionMetadataSafe,
  redactionEligibilityImpactFor,
  redactionReviewOutcomeFor,
} from "@/lib/redactionMetadataModel";
import { createSavedAnswerRecord, migrateSavedAnswers, upsertSavedAnswer } from "@/lib/savedAnswers";
import { buildSourceHierarchyGroups, corpus, sourceHierarchyLabels, sourceHierarchyOrder } from "@/lib/sourceModel";
import { PUBLIC_ARGUMENT_BUILDER_PHASE } from "@/lib/publicArgumentPlan";
import { PRODUCT_VERSION, PROMPT_VERSION, createRuntimeVersion, runtimeVersionFields } from "@/lib/version";
import {
  applyVaultAction,
  assertFakeMetadataOnly,
  createInitialVaultState,
  exportVaultAuditJson,
  exportVaultAuditMarkdown,
  laneCounts,
  vaultLanes,
  workflowStateCounts,
} from "@/lib/vaultModel";

const baseOptions = {
  mode: "Strict Research" as const,
  scope: "All Fake" as const,
  detail: "Detailed" as const,
};

describe("fake corpus", () => {
  it("contains every source class required by the MVP", () => {
    for (const sourceClass of corpus.sourceClasses) {
      expect(corpus.docs.some((doc) => doc.class === sourceClass)).toBe(true);
    }
  });

  it("groups fake sources by the requested citation hierarchy", () => {
    const groups = buildSourceHierarchyGroups();

    expect(groups.map((group) => group.hierarchy)).toEqual(sourceHierarchyOrder);
    expect(groups.map((group) => group.label)).toEqual(sourceHierarchyOrder.map((hierarchy) => sourceHierarchyLabels[hierarchy]));
    expect(groups.flatMap((group) => group.docs)).toHaveLength(corpus.docs.length);
    expect(groups.find((group) => group.hierarchy === "local")?.docs.some((doc) => doc.class === "local_controlling_source")).toBe(true);
    expect(groups.find((group) => group.hierarchy === "national")?.docs.some((doc) => doc.class === "controlling_contract_language")).toBe(true);
    expect(groups.find((group) => group.hierarchy === "manuals_handbooks")?.docs.some((doc) => doc.title === "Fictional Manual Checklist for Step One Evidence")).toBe(true);
    expect(groups.find((group) => group.hierarchy === "steward_notes_evidence")?.docs.some((doc) => doc.title === "Fictional Steward Note on Attendance Interview")).toBe(true);
  });

  it("keeps every document fake-bannered", () => {
    for (const doc of corpus.docs) {
      expect(doc.body).toContain(corpus.requiredBanner);
    }
  });
});

describe("answer governor", () => {
  it("uses controlling fake language for annual leave", () => {
    const answer = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);

    expect(answer.noAnswer).toBe(false);
    expect(answer.bestGuessDisabled).toBe(false);
    expect(answer.citations.some((citation) => citation.class === "controlling_contract_language")).toBe(true);
    expect(answer.footer).toContain("Sources:");
    expect(answer.footer).toContain("Build:");
    expect(answer.footer).toContain("Mode:Strict Research");
    expect(answer.version.displayVersion).toMatch(/^0\.7\.0-dev\.\d{8}\+(?:[a-z0-9]+|unknown)$/);
  });

  it("blocks best guess for Step 1 evidence when no controlling language is present", () => {
    const answer = buildAnswer("What evidence belongs in a Step 1 fake file?", baseOptions);

    expect(answer.noAnswer).toBe(true);
    expect(answer.shortAnswer).toBe("I could not find controlling language for that exact issue.");
    expect(answer.bestGuessDisabled).toBe(true);
    expect(answer.evidenceChecklist).toContain("Issue statement");
  });

  it("keeps unknown one-click lunch rumor out of citable proof", () => {
    const answer = buildAnswer("Can I grieve a one-click lunch scanner issue?", baseOptions);

    expect(answer.noAnswer).toBe(true);
    expect(answer.relatedFakeSections.some((citation) => citation.class === "unknown_unverified")).toBe(true);
    expect(answer.citations.every((citation) => citation.citable)).toBe(true);
    expect(answer.conflicts.join(" ")).toContain("unverified");
  });

  it("resolves verbal follow-up questions against the prior annual-leave topic", () => {
    const first = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);
    const followUp = buildAnswer("What if the denial was only verbal?", {
      ...baseOptions,
      threadHistory: [
        { role: "user", content: first.question },
        { role: "assistant", content: first.shortAnswer, intent: first.intent, question: first.question },
      ],
    });

    expect(followUp.intent).toBe("annual_leave");
    expect(followUp.clarificationNeeded).toBe(false);
    expect(followUp.contextNote).toContain("prior annual leave denial context");
    expect(followUp.shortAnswer).toContain("verbal denial");
    expect(followUp.resolvedQuestion).toContain("annual leave denial");
  });

  it("asks for clarification when a follow-up has no prior topic", () => {
    const answer = buildAnswer("What evidence should I get?", baseOptions);

    expect(answer.clarificationNeeded).toBe(true);
    expect(answer.noAnswer).toBe(true);
    expect(answer.shortAnswer).toContain("Which topic");
    expect(answer.citations).toHaveLength(0);
  });
});

describe("saved answers", () => {
  it("creates one saved card for a new chat answer", () => {
    const answer = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);
    const record = createSavedAnswerRecord({
      answer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:00:00.000Z",
    });
    const result = upsertSavedAnswer([], record);

    expect(result.status).toBe("created");
    expect(result.saved).toHaveLength(1);
    expect(result.saved[0].saveKey).toBe(record.saveKey);
    expect(result.saved[0].version.productVersion).toBe(PRODUCT_VERSION);
    expect(result.saved[0].version.promptVersion).toBe(PROMPT_VERSION);
  });

  it("blocks duplicate saves when the same chat has no new data", () => {
    const answer = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);
    const first = createSavedAnswerRecord({
      answer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:00:00.000Z",
    });
    const duplicate = createSavedAnswerRecord({
      answer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:05:00.000Z",
    });
    const result = upsertSavedAnswer([first], duplicate);

    expect(result.status).toBe("duplicate");
    expect(result.saved).toHaveLength(1);
    expect(result.saved[0].timestamp).toBe(first.timestamp);
  });

  it("dedupes legacy localStorage records and makes the migrated save key reusable", () => {
    const question = "Can annual leave be denied after I submitted inside the fake window?";
    const older = buildAnswer(question, {
      ...baseOptions,
      runtimeVersion: createRuntimeVersion({ buildDate: "20260619", gitSha: "old1111" }),
    });
    const newer = buildAnswer(question, {
      ...baseOptions,
      runtimeVersion: createRuntimeVersion({ buildDate: "20260620", gitSha: "new2222" }),
    });
    const legacyRecords = [
      {
        id: "legacy-a",
        question,
        answer: answerToMarkdown(older),
        mode: baseOptions.mode,
        citations: older.citations,
        version: older.version,
        provider: older.version.provider,
        timestamp: "2026-06-20T04:00:00.000Z",
      },
      {
        id: "legacy-b",
        question,
        answer: answerToMarkdown(newer),
        mode: baseOptions.mode,
        citations: newer.citations,
        version: newer.version,
        provider: newer.version.provider,
        timestamp: "2026-06-20T04:05:00.000Z",
      },
    ];

    const migrated = migrateSavedAnswers(legacyRecords);
    const currentRecord = createSavedAnswerRecord({
      answer: newer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:10:00.000Z",
    });
    const duplicate = upsertSavedAnswer(migrated, currentRecord);

    expect(migrated).toHaveLength(1);
    expect(migrated[0].timestamp).toBe("2026-06-20T04:05:00.000Z");
    expect(migrated[0].version.displayVersion).toContain("new2222");
    expect(migrated[0].scope).toBe("All Fake");
    expect(migrated[0].detail).toBe("Detailed");
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.saved).toHaveLength(1);
  });

  it("ignores timestamp and build identity when detecting unchanged same-chat saves", () => {
    const question = "Can annual leave be denied after I submitted inside the fake window?";
    const firstAnswer = buildAnswer(question, {
      ...baseOptions,
      runtimeVersion: createRuntimeVersion({ buildDate: "20260620", gitSha: "aaa1111" }),
    });
    const nextAnswer = buildAnswer(question, {
      ...baseOptions,
      runtimeVersion: createRuntimeVersion({ buildDate: "20260620", gitSha: "bbb2222" }),
    });
    const first = createSavedAnswerRecord({
      answer: firstAnswer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:00:00.000Z",
    });
    const duplicate = createSavedAnswerRecord({
      answer: nextAnswer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:05:00.000Z",
    });
    const result = upsertSavedAnswer([first], duplicate);

    expect(first.saveKey).toBe(duplicate.saveKey);
    expect(first.dataFingerprint).toBe(duplicate.dataFingerprint);
    expect(result.status).toBe("duplicate");
  });

  it("ignores citation and detail ordering noise in the saved fingerprint", () => {
    const answer = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);
    const reordered = {
      ...answer,
      citations: [...answer.citations].reverse(),
      conflicts: [...answer.conflicts].reverse(),
      evidenceChecklist: [...answer.evidenceChecklist].reverse(),
      missingFacts: [...answer.missingFacts].reverse(),
      followUps: [...answer.followUps].reverse(),
    };
    const first = createSavedAnswerRecord({
      answer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:00:00.000Z",
    });
    const duplicate = createSavedAnswerRecord({
      answer: reordered,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:05:00.000Z",
    });
    const result = upsertSavedAnswer([first], duplicate);

    expect(first.saveKey).toBe(duplicate.saveKey);
    expect(first.dataFingerprint).toBe(duplicate.dataFingerprint);
    expect(result.status).toBe("duplicate");
    expect(result.saved).toHaveLength(1);
  });

  it("replaces a same-chat save when metadata or details change", () => {
    const answer = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);
    const first = createSavedAnswerRecord({
      answer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: "Simple",
      timestamp: "2026-06-20T04:00:00.000Z",
    });
    const replacement = createSavedAnswerRecord({
      answer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: "Detailed",
      timestamp: "2026-06-20T04:05:00.000Z",
    });
    const result = upsertSavedAnswer([first], replacement);

    expect(result.status).toBe("replaced");
    expect(result.saved).toHaveLength(1);
    expect(result.saved[0].id).toBe(first.id);
    expect(result.saved[0].detail).toBe("Detailed");
    expect(result.saved[0].timestamp).toBe(replacement.timestamp);
  });

  it("keeps separate cards when the answer context changes", () => {
    const annualLeave = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);
    const steward = buildAnswer("What should a steward request include before talking to a supervisor?", baseOptions);
    const first = createSavedAnswerRecord({
      answer: annualLeave,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:00:00.000Z",
    });
    const changed = createSavedAnswerRecord({
      answer: steward,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:05:00.000Z",
    });
    const result = upsertSavedAnswer([first], changed);

    expect(result.status).toBe("created");
    expect(result.saved).toHaveLength(2);
  });
});

describe("conversation thread model", () => {
  it("appends multiple turns in chronological user-assistant order and keeps prior turns visible", () => {
    let thread = createConversationThread("2026-06-20T10:00:00.000Z");
    const firstUser = createUserMessage({
      threadId: thread.threadId,
      content: "Can annual leave be denied after I submitted inside the fake window?",
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:00.000Z",
    });
    const firstAnswer = buildAnswer(firstUser.content, baseOptions);
    const firstAssistant = createAssistantMessage({
      threadId: thread.threadId,
      turnId: firstUser.turnId,
      parentMessageId: firstUser.messageId,
      answer: firstAnswer,
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:01.000Z",
    });
    thread = appendTurn(thread, firstUser, firstAssistant);

    const secondUser = createUserMessage({
      threadId: thread.threadId,
      content: "What if the denial was only verbal?",
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:02:00.000Z",
    });
    const secondAnswer = buildAnswer(secondUser.content, {
      ...baseOptions,
      threadHistory: recentAnswerHistory(thread),
    });
    const secondAssistant = createAssistantMessage({
      threadId: thread.threadId,
      turnId: secondUser.turnId,
      parentMessageId: secondUser.messageId,
      answer: secondAnswer,
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:02:01.000Z",
    });
    thread = appendTurn(thread, secondUser, secondAssistant);

    expect(thread.messages.map((message) => message.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(thread.messages[0].content).toContain("annual leave");
    expect(thread.messages[2].content).toContain("verbal");
    expect(secondAssistant.answer.intent).toBe("annual_leave");
    expect(firstUser.messageId).not.toBe(firstUser.createdAt);
    expect(firstAssistant.parentMessageId).toBe(firstUser.messageId);
  });

  it("restores a fake thread from browser persistence without mixing saved answers", () => {
    const thread = createConversationThread("2026-06-20T10:00:00.000Z");
    const user = createUserMessage({
      threadId: thread.threadId,
      content: "Can annual leave be denied after I submitted inside the fake window?",
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:00.000Z",
    });
    const assistant = createAssistantMessage({
      threadId: thread.threadId,
      turnId: user.turnId,
      parentMessageId: user.messageId,
      answer: buildAnswer(user.content, baseOptions),
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:01.000Z",
    });
    const restored = migrateConversationThread(appendTurn(thread, user, assistant));

    expect(restored?.threadId).toBe(thread.threadId);
    expect(restored?.messages).toHaveLength(2);
    expect(restored?.messages[1].role).toBe("assistant");
  });

  it("replaces a loading assistant row without removing the submitted user message", () => {
    const thread = createConversationThread("2026-06-20T10:00:00.000Z");
    const user = createUserMessage({
      threadId: thread.threadId,
      content: "What should I do next?",
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:00.000Z",
    });
    const loading = createLoadingAssistantMessage({
      threadId: thread.threadId,
      turnId: user.turnId,
      parentMessageId: user.messageId,
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:01.000Z",
    });
    const pendingThread = appendTurn(thread, user, loading);
    const answer = buildAnswer(user.content, baseOptions);
    const complete = createAssistantMessage({
      threadId: thread.threadId,
      turnId: user.turnId,
      parentMessageId: user.messageId,
      answer,
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:02.000Z",
    });
    const completedThread = replaceAssistantMessage(pendingThread, loading.messageId, complete);

    expect(completedThread.messages).toHaveLength(2);
    expect(completedThread.messages[0].role).toBe("user");
    expect((completedThread.messages[1] as typeof complete).status).toBe("complete");
  });
});

describe("runtime build identity", () => {
  it("formats displayVersion from product milestone, channel, UTC build date, and git SHA", () => {
    const version = createRuntimeVersion({
      productVersion: "0.4.0",
      channel: "dev",
      buildDate: "20260620",
      gitSha: "c33c049",
      corpusVersion: "corpus.test",
      indexVersion: "index.test",
      promptVersion: "prompt.test",
      provider: "provider.test",
    });

    expect(version.displayVersion).toBe("0.4.0-dev.20260620+c33c049");
    expect(version.productVersion).toBe("0.4.0");
    expect(version.corpusVersion).toBe("corpus.test");
    expect(version.indexVersion).toBe("index.test");
  });

  it("exposes every build identity field through /health", async () => {
    const response = healthGET();
    const payload = await response.json();

    for (const field of runtimeVersionFields) {
      expect(payload).toHaveProperty(field);
      expect(payload.version).toHaveProperty(field);
      expect(payload[field]).toBe(payload.version[field]);
    }

    expect(payload.version.productVersion).toBe("0.7.0");
    expect(payload.phase).toBe(PUBLIC_ARGUMENT_BUILDER_PHASE);
    expect(payload.phase).not.toBe("KIA-Stick-v0.5.2-fake-wizard-state-machine-hardening");
    expect(payload.version.displayVersion).toMatch(/^0\.7\.0-dev\.\d{8}\+(?:[a-z0-9]+|unknown)$/);
    expect(payload.version.corpusVersion).toBe(corpus.corpusVersion);
    expect(payload.version.indexVersion).toBe(corpus.indexVersion);
  });

  it("renders full build metadata on the /version page", () => {
    const html = renderToStaticMarkup(VersionPage());

    expect(html).toContain("Build Identity");
    expect(html).toContain("Display Version");
    expect(html).toContain("Product Version");
    expect(html).toContain("Build Date");
    expect(html).toContain("Git SHA");
    expect(html).toContain("Corpus");
    expect(html).toContain("Index");
    expect(html).toContain("Prompt");
    expect(html).toContain("Provider");
    expect(html).toContain("Back to KIA Stick");
    expect(html).toContain("href=\"/\"");
    expect(html).toMatch(/0\.7\.0-dev\.\d{8}\+(?:[a-z0-9]+|unknown)/);
  });

  it("ships a valid static web manifest", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as { name?: string; start_url?: string };

    expect(manifest.name).toBe("KIA Stick");
    expect(manifest.start_url).toBe("/");
    expect(existsSync("app/manifest.ts")).toBe(false);
  });
});

describe("manual QA UX shell", () => {
  it("renders an empty threaded chat shell with a cleared composer and Send button", () => {
    const html = renderToStaticMarkup(React.createElement(KiaStickApp, {
      runtimeVersion: createRuntimeVersion({ buildDate: "20260620", gitSha: "abc123" }),
    }));

    expect(html).toContain("chatScrollArea");
    expect(html).toContain("chatComposer chatComposerDock");
    expect(html).toContain("New fake chat");
    expect(html).toContain("Message KIA Stick...");
    expect(html).toContain("New chat");
    expect(html).toContain("Send");
    expect(html).toContain("disabled=\"\"");
    expect(html).not.toContain("Answer</button>");
    expect(html).toContain("Prompt shortcuts");
    expect(html).toContain("Response options");
  });

  it("renders assistant messages compact by default with independent collapsed details and citations", () => {
    const thread = createConversationThread("2026-06-20T10:00:00.000Z");
    const answer = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);
    const user = createUserMessage({
      threadId: thread.threadId,
      content: answer.question,
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:00.000Z",
    });
    const assistant = createAssistantMessage({
      threadId: thread.threadId,
      turnId: user.turnId,
      parentMessageId: user.messageId,
      answer,
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:01.000Z",
    });
    const userHtml = renderToStaticMarkup(React.createElement(UserMessageBubble, { message: user, turnLabel: "Turn 1" }));
    const assistantHtml = renderToStaticMarkup(React.createElement(AssistantMessageCard, {
      message: assistant,
      turnLabel: "Turn 1",
      onRetry: () => undefined,
      onSave: () => undefined,
    }));

    expect(userHtml).toContain("messageBubble userBubble");
    expect(userHtml).toContain("Turn 1");
    expect(assistantHtml).toContain("messageBubble assistantBubble");
    expect(assistantHtml).toContain("Turn 1");
    expect(assistantHtml).toContain("Short answer");
    expect(assistantHtml).toContain("Confidence / authority");
    expect(assistantHtml).toContain("What to do next");
    expect(assistantHtml).toContain("Show full packet");
    expect(assistantHtml).toContain("Show citations");
    expect(assistantHtml).toContain("Save to Saved");
    expect(assistantHtml).toContain("aria-expanded=\"false\"");
    expect(assistantHtml).not.toContain("citationCards");
  });

  it("blocks saving no-answer assistant responses from the UI", () => {
    const user = createUserMessage({
      threadId: "thread-test",
      content: "What evidence should I get?",
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:00.000Z",
    });
    const answer = buildAnswer(user.content, baseOptions);
    const assistant = createAssistantMessage({
      threadId: user.threadId,
      turnId: user.turnId,
      parentMessageId: user.messageId,
      answer,
      modeScopeDetail: baseOptions,
      now: "2026-06-20T10:01:01.000Z",
    });
    const html = renderToStaticMarkup(React.createElement(AssistantMessageCard, {
      message: assistant,
      turnLabel: "Turn 1",
      onRetry: () => undefined,
      onSave: () => undefined,
    }));

    expect(answer.noAnswer).toBe(true);
    expect(html).toContain("No answer to save");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("No Saved record is created for no-answer responses.");
    expect(html).not.toContain("aria-label=\"Save this answer\"");
  });

  it("renders Saved empty and detail states with version metadata", () => {
    const emptyHtml = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
      saved: [],
      onDelete: () => undefined,
    }));
    const answer = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);
    const record = createSavedAnswerRecord({
      answer,
      mode: baseOptions.mode,
      scope: baseOptions.scope,
      detail: baseOptions.detail,
      timestamp: "2026-06-20T04:00:00.000Z",
    });
    const savedHtml = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
      saved: [record],
      onDelete: () => undefined,
    }));

    expect(emptyHtml).toContain("No saved fake answers yet.");
    expect(savedHtml).toContain("Saved answer metadata");
    expect(savedHtml).toContain("Product");
    expect(savedHtml).toContain(PRODUCT_VERSION);
    expect(savedHtml).toContain("Prompt");
    expect(savedHtml).toContain(PROMPT_VERSION);
    expect(savedHtml).toContain("Delete saved answer");
  });

  it("renders chronological chat layout before composer and bottom nav", () => {
    const html = renderToStaticMarkup(React.createElement(KiaStickApp, {
      runtimeVersion: createRuntimeVersion({ buildDate: "20260620", gitSha: "abc123" }),
    }));
    const messagesIndex = html.indexOf("chatScrollArea");
    const composerIndex = html.indexOf("chatComposer chatComposerDock");
    const navIndex = html.indexOf("bottomNav");

    expect(messagesIndex).toBeGreaterThan(-1);
    expect(composerIndex).toBeGreaterThan(messagesIndex);
    expect(navIndex).toBeGreaterThan(composerIndex);
  });

  it("keeps full packet detail sections collapsed by default", () => {
    const answer = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", baseOptions);
    const html = renderToStaticMarkup(React.createElement(FullPacket, { answer }));

    expect(html).toContain("Show authority stack");
    expect(html).toContain("Show conflicts");
    expect(html).toContain("Show evidence checklist");
    expect(html).toContain("Show missing facts");
    expect(html).toContain("Show follow-ups");
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
  });

  it("keeps the bottom navigation including Settings in the app shell", () => {
    const html = renderToStaticMarkup(React.createElement(KiaStickApp, {
      runtimeVersion: createRuntimeVersion({ buildDate: "20260620", gitSha: "abc123" }),
    }));

    expect(html).toContain("KIA Stick navigation");
    expect(html).toContain("Import");
    expect(html).toContain("Settings");
    expect(html).toContain("bottomNav");
  });

  it("renders Sources hierarchy traceability with fake source IDs and build identity", () => {
    const version = createRuntimeVersion({ buildDate: "20260625", gitSha: "v075abc" });
    const html = renderToStaticMarkup(React.createElement(SourcesPanel, {
      sourceHierarchyGroups: buildSourceHierarchyGroups(),
      runtimeVersion: version,
    }));

    expect(html).toContain("source traceability summary");
    expect(html).toContain("fake sources");
    expect(html).toContain("citable in answer citations");
    expect(html).toContain("Rank 1 in the fake citation hierarchy");
    expect(html).toContain("source id");
    expect(html).toContain("fake sample");
    expect(html).toContain(version.promptVersion);
    expect(html).toContain(version.displayVersion);
  });

  it("renders Vault guide mode and hides technical details by default", () => {
    const state = createInitialVaultState();
    const html = renderToStaticMarkup(React.createElement(VaultPanel, {
      counts: laneCounts(state.records),
      workflowCounts: workflowStateCounts(state.records),
      state,
      view: "vault",
      runtimeVersion: createRuntimeVersion({ buildDate: "20260620", gitSha: "abc123" }),
      setView: () => undefined,
      onAction: () => undefined,
    }));

    expect(html).toContain("Guide mode");
    expect(html).toContain("What this screen means");
    expect(html).toContain("What is safe");
    expect(html).toContain("What is blocked");
    expect(html).toContain("What happens next");
    expect(html).toContain("redaction review needed");
    expect(html).toContain("metadata review needed");
    expect(html).toContain("not indexable");
    expect(html).toContain("Audit export");
    expect(html).toContain("metadata and guard flags only");
    expect(html).toContain("Index gate");
    expect(html).toContain("Show technical details");
    expect(html).not.toContain("Lifecycle State Machine");
  });

  it("renders the fake Import Wizard scaffold with stop-sign labels and no file input", () => {
    const state = createInitialImportWizardState();
    const html = renderToStaticMarkup(React.createElement(ImportWizardPanel, {
      state,
      runtimeVersion: createRuntimeVersion({ buildDate: "20260620", gitSha: "abc123" }),
      onAction: () => undefined,
    }));

    expect(html).toContain("Import Wizard");
    expect(html).toContain("fake UI scaffold only");
    expect(html).toContain("Selection is not import");
    expect(html).toContain("Quarantine is not indexable");
    expect(html).toContain("Redaction is not approval");
    expect(html).toContain("Approval is not indexing");
    expect(html).toContain("No real import path exists");
    expect(html).toContain("Blocked-action matrix");
    expect(html).toContain("Proof export safety");
    expect(html).toContain("Export safety");
    expect(html).toContain("synthetic metadata only");
    expect(html).toContain("Verify file picker blocked");
    expect(html).toContain("Try skip to index");
    expect(html).toContain("Fake import proof");
    expect(html).toContain("Fake redaction metadata is advisory fixture data only");
    expect(html).toContain("Eligibility impact");
    expect(html).not.toContain("type=\"file\"");
  });
});

describe("fake import wizard model", () => {
  it("ships every planned wizard screen and starts fake-only", () => {
    const state = createInitialImportWizardState();

    expect(importWizardSteps).toEqual([
      "start_safety",
      "source_placeholder",
      "scope_confirm",
      "quarantine_confirm",
      "provenance_hash",
      "redaction_detection",
      "admin_redaction_review",
      "metadata_review",
      "index_eligibility",
      "audit_summary",
    ]);
    expect(importWizardAllowedTransitions).toEqual({
      start_safety: ["source_placeholder"],
      source_placeholder: ["scope_confirm"],
      scope_confirm: ["quarantine_confirm"],
      quarantine_confirm: ["provenance_hash"],
      provenance_hash: ["redaction_detection"],
      redaction_detection: ["admin_redaction_review"],
      admin_redaction_review: ["metadata_review"],
      metadata_review: ["index_eligibility"],
      index_eligibility: ["audit_summary"],
      audit_summary: [],
    });
    expect(state.currentStep).toBe("start_safety");
    expect(state.fakeOnly).toBe(true);
    expect(state.realActionsDisabled).toBe(true);
    expect(state.record.redactionMetadata).toHaveLength(3);
    expect(state.record.redactionMetadata[0]).toMatchObject({
      category: "fake_name",
      severity: "moderate",
      safeExampleLabel: "fake-person-label",
      eligibilityImpact: "redaction_required",
    });
    expect(state.record.redactionReviewOutcome).toBe("needs_more_redaction");
    expect(state.record.redactionEligibilityImpact).toBe("redaction_required");
    expect(assertFakeRedactionMetadataSafe(state.record.redactionMetadata).ok).toBe(true);
    expect(assertImportWizardFakeOnly(state).ok).toBe(true);
  });

  it("derives deterministic fake redaction review outcomes and eligibility impacts", () => {
    const state = createInitialImportWizardState();

    expect(redactionReviewOutcomeFor([])).toBe("approve_redaction");
    expect(redactionReviewOutcomeFor(state.record.redactionMetadata)).toBe("needs_more_redaction");
    expect(redactionEligibilityImpactFor(state.record.redactionMetadata)).toBe("redaction_required");
    expect(
      redactionReviewOutcomeFor([
        {
          category: "fake_date",
          severity: "low",
          reviewerNote: "Needs fake authority metadata.",
          confidence: 0.7,
          reason: "Synthetic dates need context.",
          safeExampleLabel: "fake-date-label",
          eligibilityImpact: "metadata_required",
        },
      ])
    ).toBe("metadata_incomplete");
    expect(
      redactionReviewOutcomeFor([
        {
          category: "fake_restricted_marker",
          severity: "restricted",
          reviewerNote: "Reject synthetic restricted marker.",
          confidence: 1,
          reason: "Restricted fake marker.",
          safeExampleLabel: "fake-restricted-label",
          eligibilityImpact: "not_indexable",
        },
      ])
    ).toBe("reject_sensitive");
  });

  it("keeps wizard helper labels, copy, steps, and next actions deterministic", () => {
    expect(importWizardStepLabels.start_safety).toBe("Start / safety");
    expect(importWizardStepLabels.audit_summary).toBe("Audit summary");
    expect(importWizardScreenCopy.source_placeholder.title).toBe("Source Placeholder");
    expect(importWizardScreenCopy.source_placeholder.plain).toContain("no file picker");
    expect(importWizardScreenCopy.index_eligibility.stopSign).toContain("metadata review");
    expect(nextImportWizardStep("start_safety")).toBe("source_placeholder");
    expect(nextImportWizardStep("audit_summary")).toBe("audit_summary");
    expect(importWizardNextAction("metadata_review")).toBe("approve_fake_metadata");
    expect(importWizardNextAction("audit_summary")).toBe("complete_fake_audit");
    expect(importWizardNextActionLabel("index_eligibility")).toBe("Record fake index decision");
    expect(importWizardNextActionLabel("audit_summary")).toBe("Complete fake audit");
  });

  it("moves fake records through the full scaffold without reading files", () => {
    const audited = runImportWizardHappyPath();

    expect(audited.currentStep).toBe("audit_summary");
    expect(audited.auditComplete).toBe(true);
    expect(audited.acknowledgedSafety).toBe(true);
    expect(audited.sourceSelected).toBe(true);
    expect(audited.scopeConfirmed).toBe(true);
    expect(audited.quarantineConfirmed).toBe(true);
    expect(audited.provenanceRecorded).toBe(true);
    expect(audited.redactionPreviewed).toBe(true);
    expect(audited.redactionApproved).toBe(true);
    expect(audited.metadataApproved).toBe(true);
    expect(audited.record.scopeMode).toBe("explicit_fake_batch");
    expect(audited.record.itemCount).toBe(2);
    expect(audited.record.indexDecision).toBe("eligible_fake_only");
    expect(audited.record.redactionReviewOutcome).toBe("approve_redaction");
    expect(audited.record.redactionEligibilityImpact).toBe("metadata_required");
    expect(audited.auditLog.map((entry) => entry.action)).toContain("fake_import_audit_complete");
    expect(audited.auditLog.map((entry) => entry.at)).toEqual([
      "2026-06-20T05:09:00.000Z",
      "2026-06-20T05:08:00.000Z",
      "2026-06-20T05:07:00.000Z",
      "2026-06-20T05:06:00.000Z",
      "2026-06-20T05:05:00.000Z",
      "2026-06-20T05:04:00.000Z",
      "2026-06-20T05:03:00.000Z",
      "2026-06-20T05:02:00.000Z",
      "2026-06-20T05:01:00.000Z",
      "2026-06-20T05:00:00.000Z",
      "2026-06-20T00:00:00.000Z",
    ]);
    expect(audited.auditLog.map((entry) => entry.note).join(" ")).not.toContain("file content");
  });

  it("blocks skipped gates with visible reasons", () => {
    const state = createInitialImportWizardState();
    const blocked = applyImportWizardAction(state, {
      type: "jump_to_step",
      targetStep: "index_eligibility",
      now: "2026-06-20T05:10:00.000Z",
    });
    const blockedScope = applyImportWizardAction(state, {
      type: "confirm_fake_scope",
      now: "2026-06-20T05:11:00.000Z",
    });

    expect(blocked.currentStep).toBe("start_safety");
    expect(blocked.lastBlockedReason).toContain("Direct jump blocked");
    expect(blocked.auditLog[0].action).toBe("blocked_invalid_import_wizard_transition");
    expect(blockedScope.lastBlockedReason).toContain("Select a fake source placeholder");
  });

  it("blocks every high-risk fake wizard jump with a deterministic reason", () => {
    const started = runImportWizardActions([
      { type: "start_fake_wizard", now: "2026-06-20T06:00:00.000Z" },
    ]);
    const scoped = runImportWizardActions([
      { type: "start_fake_wizard", now: "2026-06-20T06:00:00.000Z" },
      { type: "select_fake_source", now: "2026-06-20T06:01:00.000Z" },
      { type: "confirm_fake_scope", now: "2026-06-20T06:02:00.000Z" },
    ]);
    const detection = runImportWizardActions([
      { type: "start_fake_wizard", now: "2026-06-20T06:00:00.000Z" },
      { type: "select_fake_source", now: "2026-06-20T06:01:00.000Z" },
      { type: "confirm_fake_scope", now: "2026-06-20T06:02:00.000Z" },
      { type: "confirm_fake_quarantine", now: "2026-06-20T06:03:00.000Z" },
      { type: "record_fake_provenance", now: "2026-06-20T06:04:00.000Z" },
    ]);
    const redaction = runImportWizardActions([
      { type: "start_fake_wizard", now: "2026-06-20T06:00:00.000Z" },
      { type: "select_fake_source", now: "2026-06-20T06:01:00.000Z" },
      { type: "confirm_fake_scope", now: "2026-06-20T06:02:00.000Z" },
      { type: "confirm_fake_quarantine", now: "2026-06-20T06:03:00.000Z" },
      { type: "record_fake_provenance", now: "2026-06-20T06:04:00.000Z" },
      { type: "preview_fake_redaction", now: "2026-06-20T06:05:00.000Z" },
    ]);
    const metadata = runImportWizardActions([
      { type: "start_fake_wizard", now: "2026-06-20T06:00:00.000Z" },
      { type: "select_fake_source", now: "2026-06-20T06:01:00.000Z" },
      { type: "confirm_fake_scope", now: "2026-06-20T06:02:00.000Z" },
      { type: "confirm_fake_quarantine", now: "2026-06-20T06:03:00.000Z" },
      { type: "record_fake_provenance", now: "2026-06-20T06:04:00.000Z" },
      { type: "preview_fake_redaction", now: "2026-06-20T06:05:00.000Z" },
      { type: "approve_fake_redaction", now: "2026-06-20T06:06:00.000Z" },
    ]);

    const selectToIndex = applyImportWizardAction(started, { type: "jump_to_step", targetStep: "index_eligibility", now: "2026-06-20T06:10:00.000Z" });
    const quarantineToIndex = applyImportWizardAction(scoped, { type: "jump_to_step", targetStep: "index_eligibility", now: "2026-06-20T06:12:00.000Z" });
    const detectionToApproval = applyImportWizardAction(detection, { type: "jump_to_step", targetStep: "metadata_review", now: "2026-06-20T06:13:00.000Z" });
    const redactionToIndex = applyImportWizardAction(redaction, { type: "jump_to_step", targetStep: "index_eligibility", now: "2026-06-20T06:14:00.000Z" });
    const metadataToIndexWithoutAction = applyImportWizardAction(metadata, { type: "jump_to_step", targetStep: "index_eligibility", now: "2026-06-20T06:15:00.000Z" });
    const metadataToAuditWithoutDecision = applyImportWizardAction(metadata, { type: "jump_to_step", targetStep: "audit_summary", now: "2026-06-20T06:16:00.000Z" });

    expect(selectToIndex.lastBlockedReason).toContain("Select-to-index blocked");
    expect(quarantineToIndex.lastBlockedReason).toContain("Quarantine-to-index blocked");
    expect(detectionToApproval.lastBlockedReason).toContain("Detection-to-approval blocked");
    expect(redactionToIndex.lastBlockedReason).toContain("Redaction-to-index blocked");
    expect(metadataToIndexWithoutAction.lastBlockedReason).toContain("Metadata-to-index blocked");
    expect(metadataToAuditWithoutDecision.lastBlockedReason).toContain("Metadata-to-audit blocked");
    for (const state of [
      selectToIndex,
      quarantineToIndex,
      detectionToApproval,
      redactionToIndex,
      metadataToIndexWithoutAction,
      metadataToAuditWithoutDecision,
    ]) {
      expect(state.auditLog[0].action).toBe("blocked_invalid_import_wizard_transition");
      expect(state.auditLog[0].note).not.toContain("/media/mint/SHARED/APWU");
    }
  });

  it("blocks real file/path payloads without leaking the private value", () => {
    const state = createInitialImportWizardState();
    const blocked = applyImportWizardAction(state, {
      type: "select_fake_source",
      privatePath: "/media/mint/SHARED/APWU/private.pdf",
      rawText: "do not accept document text",
      ocrText: "do not accept OCR text",
      realIdentifier: "member_id=123456",
      now: "2026-06-20T05:12:00.000Z",
    } as Record<string, unknown>);

    expect(blocked.currentStep).toBe("start_safety");
    expect(blocked.auditLog[0].action).toBe("blocked_real_import_attempt");
    expect(blocked.auditLog[0].note).toContain("forbidden private reference");
    expect(blocked.auditLog[0].note).toContain("forbidden file/content field");
    expect(blocked.auditLog[0].note).not.toContain("/media/mint/SHARED/APWU");
  });

  it("exports fake-only proof with build identity and no private paths", () => {
    const state = applyImportWizardAction(createInitialImportWizardState(), {
      type: "block_future_real_action",
      reason: "Future real file picker disabled for fake scaffold.",
      now: "2026-06-20T05:13:00.000Z",
    });
    const version = createRuntimeVersion({
      productVersion: "0.4.0",
      buildDate: "20260620",
      gitSha: "bf2248b",
    });
    const json = exportImportWizardAuditJson(state, version, "2026-06-20T05:14:00.000Z");
    const markdown = exportImportWizardAuditMarkdown(state, version, "2026-06-20T05:14:00.000Z");
    const payload = JSON.parse(json);

    expect(payload.version.displayVersion).toBe("0.4.0-dev.20260620+bf2248b");
    expect(payload.guard.fakeMetadataOnly).toBe(true);
    expect(payload.guard.privatePathsIncluded).toBe(false);
    expect(payload.guard.fileContentIncluded).toBe(false);
    expect(payload.guard.fileObjectsIncluded).toBe(false);
    expect(payload.guard.ocrTextIncluded).toBe(false);
    expect(payload.guard.snippetsIncluded).toBe(false);
    expect(payload.guard.uploadsIncluded).toBe(false);
    expect(payload.guard.vectorStoreIncluded).toBe(false);
    expect(payload.guard.privateNotesIncluded).toBe(false);
    expect(payload.guard.realIdentifiersIncluded).toBe(false);
    expect(payload.record.redactionMetadata[0].safeExampleLabel).toBe("fake-person-label");
    expect(payload.record.redactionMetadata[0]).not.toHaveProperty("snippet");
    expect(payload.guard.realImportImplemented).toBe(false);
    expect(payload.guard.filePickerImplemented).toBe(false);
    expect(payload.fakeState.currentStep).toBe("start_safety");
    expect(payload.fakeState.fakeOnly).toBe(true);
    expect(payload.fakeState.realActionsDisabled).toBe(true);
    expect(json).toContain("fake-import-wizard-record-001");
    expect(markdown).toContain("Real import implemented: false");
    expect(markdown).toContain("Real identifiers included: false");
    expect(markdown).toContain("fake-person-label");
    expect(json).not.toContain("/media/mint/SHARED/APWU");
    expect(markdown).not.toContain("/media/mint/SHARED/APWU");
  });

  it("sanitizes tainted audit text before fake proof export", () => {
    const state: ImportWizardState = {
      ...createInitialImportWizardState(),
      auditLog: [
        {
          id: "tainted",
          action: "tampered_audit",
          actor: "local-fake-admin",
          at: "2026-06-20T05:15:00.000Z",
          step: "start_safety",
          note: "tampered private path /media/mint/SHARED/APWU/private.pdf",
        },
      ],
    };
    const version = createRuntimeVersion({ productVersion: "0.4.0", buildDate: "20260620", gitSha: "bf2248b" });
    const json = exportImportWizardAuditJson(state, version, "2026-06-20T05:16:00.000Z");
    const markdown = exportImportWizardAuditMarkdown(state, version, "2026-06-20T05:16:00.000Z");

    expect(json).toContain("[sanitized fake-only audit text]");
    expect(markdown).toContain("[sanitized fake-only audit text]");
    expect(json).not.toContain("/media/mint/SHARED/APWU");
    expect(markdown).not.toContain("/media/mint/SHARED/APWU");
  });

  it("sanitizes tainted fake redaction metadata before import proof export", () => {
    const state: ImportWizardState = {
      ...createInitialImportWizardState(),
      record: {
        ...createInitialImportWizardState().record,
        redactionMetadata: [
          {
            category: "fake_name",
            severity: "moderate",
            reviewerNote: "unsafe /media/mint/SHARED/APWU/private.pdf",
            confidence: 0.9,
            reason: "member_id=123456",
            safeExampleLabel: "fake-tainted-label",
            eligibilityImpact: "redaction_required",
          },
        ],
      },
    };
    const version = createRuntimeVersion({ productVersion: "0.4.0", buildDate: "20260620", gitSha: "bf2248b" });
    const json = exportImportWizardAuditJson(state, version, "2026-06-20T05:18:00.000Z");
    const markdown = exportImportWizardAuditMarkdown(state, version, "2026-06-20T05:18:00.000Z");
    const payload = JSON.parse(json);

    expect(payload.record.redactionMetadata).toEqual([]);
    expect(payload.record.redactionFlags).toEqual(["sanitized-fake-redaction-metadata"]);
    expect(json).not.toContain("/media/mint/SHARED/APWU");
    expect(json).not.toContain("member_id=123456");
    expect(markdown).not.toContain("/media/mint/SHARED/APWU");
    expect(markdown).not.toContain("member_id=123456");
  });

  it("keeps Upload as fake buttons with no file input", () => {
    const html = renderToStaticMarkup(React.createElement(FakeUploadPanel, {
      fakeOnlyConfirmed: true,
      onFakeOnlyConfirmedChange: () => undefined,
      onQueueFakeUpload: () => undefined,
      quarantine: [
        {
          id: "fake-upload-test",
          name: "fake-upload-sample-single.md",
          size: 1280,
          review: "queued_fake_review",
          privacy: "local_browser_only",
          timestamp: "2026-06-20T05:17:00.000Z",
        },
      ],
    }));

    expect(html).toContain("Queue fake sample");
    expect(html).toContain("Queue fake batch");
    expect(html).toContain("No file picker is present");
    expect(html).toContain("synthetic_metadata_only");
    expect(html).toContain("fake-upload-sample-single.md");
    expect(html).toContain("not_indexable");
    expect(html).not.toContain("type=\"file\"");
  });
});

function runImportWizardHappyPath(): ImportWizardState {
  return runImportWizardActions([
    { type: "start_fake_wizard", now: "2026-06-20T05:00:00.000Z" },
    { type: "select_fake_source", scopeMode: "explicit_fake_batch", itemCount: 2, now: "2026-06-20T05:01:00.000Z" },
    { type: "confirm_fake_scope", now: "2026-06-20T05:02:00.000Z" },
    { type: "confirm_fake_quarantine", now: "2026-06-20T05:03:00.000Z" },
    { type: "record_fake_provenance", now: "2026-06-20T05:04:00.000Z" },
    { type: "preview_fake_redaction", now: "2026-06-20T05:05:00.000Z" },
    { type: "approve_fake_redaction", now: "2026-06-20T05:06:00.000Z" },
    { type: "approve_fake_metadata", now: "2026-06-20T05:07:00.000Z" },
    { type: "decide_fake_index", decision: "eligible_fake_only", now: "2026-06-20T05:08:00.000Z" },
    { type: "complete_fake_audit", now: "2026-06-20T05:09:00.000Z" },
  ]);
}

function runImportWizardActions(actions: ImportWizardAction[]): ImportWizardState {
  return actions.reduce<ImportWizardState>((state, action) => applyImportWizardAction(state, action), createInitialImportWizardState());
}

describe("fake vault governance model", () => {
  it("ships fake metadata fixtures for every vault lane", () => {
    const state = createInitialVaultState();

    for (const lane of vaultLanes) {
      expect(state.records.some((record) => record.lane === lane)).toBe(true);
    }
    expect(assertFakeMetadataOnly(state.records).ok).toBe(true);
    expect(state.records.every((record) => assertFakeRedactionMetadataSafe(record.redactionMetadata).ok)).toBe(true);
    expect(state.records.find((record) => record.id === "fake-vault-steward-note")?.redactionReviewOutcome).toBe("needs_more_redaction");
    expect(state.records.find((record) => record.id === "fake-vault-restricted")?.redactionReviewOutcome).toBe("reject_sensitive");
  });

  it("advances lifecycle gates with audit entries but does not make quarantine indexable", () => {
    const state = createInitialVaultState();
    const advanced = applyVaultAction(state, {
      type: "advance",
      recordId: "fake-vault-quarantine",
      now: "2026-06-20T01:00:00.000Z",
    });

    const record = advanced.records.find((item) => item.id === "fake-vault-quarantine");

    expect(record?.lifecycleStep).toBe("hash_provenance");
    expect(record?.workflowState).toBe("quarantine_only");
    expect(advanced.auditLog[0].action).toBe("advance_fake_gate");
    expect(advanced.auditLog[0].note).toContain("no file content was accessed");
  });

  it("blocks invalid transitions with visible reasons", () => {
    const state = createInitialVaultState();
    const blocked = applyVaultAction(state, {
      type: "advance",
      recordId: "fake-vault-member-only",
      targetStep: "metadata_review",
      now: "2026-06-20T01:30:00.000Z",
    });

    const record = blocked.records.find((item) => item.id === "fake-vault-member-only");

    expect(record?.lifecycleStep).toBe("redaction_review");
    expect(record?.workflowState).toBe("redaction_required");
    expect(record?.lastBlockedReason).toContain("redaction review must be approved");
    expect(blocked.auditLog[0].action).toBe("blocked_invalid_transition");
  });

  it("requires redaction and metadata review before fake eligibility", () => {
    const state = createInitialVaultState();
    const redactionApproved = applyVaultAction(state, {
      type: "approve_redaction",
      recordId: "fake-vault-member-only",
      now: "2026-06-20T02:00:00.000Z",
    });
    const movedToMetadata = applyVaultAction(redactionApproved, {
      type: "advance",
      recordId: "fake-vault-member-only",
      now: "2026-06-20T02:01:00.000Z",
    });
    const metadataApproved = applyVaultAction(movedToMetadata, {
      type: "approve_metadata",
      recordId: "fake-vault-member-only",
      now: "2026-06-20T02:02:00.000Z",
    });
    const eligible = applyVaultAction(metadataApproved, {
      type: "advance",
      recordId: "fake-vault-member-only",
      now: "2026-06-20T02:03:00.000Z",
    });

    const record = eligible.records.find((item) => item.id === "fake-vault-member-only");

    expect(record?.lifecycleStep).toBe("index_eligibility");
    expect(record?.redactionStatus).toBe("approved_redacted");
    expect(record?.metadataStatus).toBe("reviewed");
    expect(record?.redactionReviewOutcome).toBe("approve_redaction");
    expect(record?.redactionEligibilityImpact).toBe("metadata_required");
    expect(record?.workflowState).toBe("eligible_fake_only");
    expect(eligible.auditLog.map((entry) => entry.action)).toContain("approve_fake_redaction");
    expect(eligible.auditLog.map((entry) => entry.action)).toContain("approve_fake_metadata");
  });

  it("tracks rejected reviews as not indexable states", () => {
    const state = createInitialVaultState();
    const rejected = applyVaultAction(state, {
      type: "reject_review",
      recordId: "fake-vault-member-only",
      reason: "Fake reviewer found unresolved redaction flags.",
      now: "2026-06-20T02:10:00.000Z",
    });

    const record = rejected.records.find((item) => item.id === "fake-vault-member-only");

    expect(record?.workflowState).toBe("review_rejected");
    expect(record?.lastBlockedReason).toContain("unresolved redaction flags");
    expect(rejected.auditLog[0].action).toBe("reject_fake_review");
  });

  it("blocks vault actions carrying real paths or raw content fields", () => {
    const state = createInitialVaultState();
    const blocked = applyVaultAction(state, {
      type: "advance",
      recordId: "fake-vault-quarantine",
      privatePath: "/media/mint/SHARED/APWU/private.pdf",
      rawText: "do not accept content",
      ocrText: "do not accept OCR text",
      realIdentifier: "case_id=123456",
      now: "2026-06-20T02:00:00.000Z",
    });

    const record = blocked.records.find((item) => item.id === "fake-vault-quarantine");

    expect(record?.lifecycleStep).toBe("quarantine");
    expect(blocked.auditLog[0].action).toBe("blocked_real_file_access");
    expect(blocked.auditLog[0].note).toContain("forbidden private reference");
    expect(blocked.auditLog[0].note).toContain("forbidden file/content field");
    expect(blocked.auditLog[0].note).not.toContain("/media/mint/SHARED/APWU");
  });

  it("exports fake audit JSON and Markdown with build identity and no private paths", () => {
    const state = createInitialVaultState();
    const version = createRuntimeVersion({
      productVersion: "0.4.0",
      buildDate: "20260620",
      gitSha: "dd4b997",
    });
    const json = exportVaultAuditJson(state, version, "2026-06-20T03:00:00.000Z");
    const markdown = exportVaultAuditMarkdown(state, version, "2026-06-20T03:00:00.000Z");
    const payload = JSON.parse(json);

    expect(payload.version.displayVersion).toBe("0.4.0-dev.20260620+dd4b997");
    expect(payload.guard.fakeMetadataOnly).toBe(true);
    expect(payload.guard.privatePathsIncluded).toBe(false);
    expect(payload.guard.ocrTextIncluded).toBe(false);
    expect(payload.guard.snippetsIncluded).toBe(false);
    expect(payload.guard.realIdentifiersIncluded).toBe(false);
    expect(payload.records[0]).not.toHaveProperty("lastBlockedReason");
    expect(payload.records.find((record: { id: string }) => record.id === "fake-vault-member-only").redactionMetadata[0].safeExampleLabel).toBe("fake-member-only-label");
    expect(json).toContain("eligible_fake_only");
    expect(markdown).toContain("Display version: 0.4.0-dev.20260620+dd4b997");
    expect(markdown).toContain("Real identifiers included: false");
    expect(markdown).toContain("Fake redaction labels");
    expect(json).not.toContain("/media/mint/SHARED/APWU");
    expect(markdown).not.toContain("/media/mint/SHARED/APWU");
  });

  it("blocks unsafe fake redaction metadata from vault proof export", () => {
    const state = createInitialVaultState();
    const tainted = {
      ...state,
      records: state.records.map((record) =>
        record.id === "fake-vault-member-only"
          ? {
              ...record,
              redactionMetadata: [
                {
                  category: "fake_name" as const,
                  severity: "moderate" as const,
                  reviewerNote: "unsafe /media/mint/SHARED/APWU/private.pdf",
                  confidence: 0.9,
                  reason: "case_id=123456",
                  safeExampleLabel: "fake-tainted-label",
                  eligibilityImpact: "redaction_required" as const,
                },
              ],
            }
          : record
      ),
    };
    const version = createRuntimeVersion({ productVersion: "0.4.0", buildDate: "20260620", gitSha: "dd4b997" });
    const json = exportVaultAuditJson(tainted, version, "2026-06-20T03:10:00.000Z");
    const payload = JSON.parse(json);

    expect(payload.records).toEqual([]);
    expect(payload.auditLog[0].action).toBe("blocked_export_guard");
    expect(json).not.toContain("/media/mint/SHARED/APWU");
    expect(json).not.toContain("case_id=123456");
  });
});
