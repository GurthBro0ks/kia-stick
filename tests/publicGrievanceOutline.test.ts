import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  AssistantMessageCard,
  FakeUploadPanel,
  SavedAnswersPanel,
  SettingsContent,
} from "@/components/KiaStickApp";
import { GET } from "@/app/health/route";
import { buildAnswer } from "@/lib/answerGovernor";
import {
  createChatSubmitSnapshot,
  resolveChatAnswerLane,
  routeChatQuestion,
  type ChatSourcePolicy,
} from "@/lib/chatAnswerRouter";
import { createAssistantMessage } from "@/lib/conversationModel";
import { currentAcceptedPushedState } from "@/lib/acceptedState";
import {
  buildPublicArgumentPlan,
  PUBLIC_ARGUMENT_PLAN_SAVED_TYPE,
} from "@/lib/publicArgumentPlan";
import {
  buildPublicGrievanceOutline,
  PUBLIC_GRIEVANCE_OUTLINE_PHASE,
  PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING,
  PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE,
  publicGrievanceOutlineEligibility,
} from "@/lib/publicGrievanceOutline";
import { verifyCbaCitation } from "@/lib/cbaCitationIntegrity";
import { buildPublicSourceAnswer } from "@/lib/publicSourceAnswer";
import {
  createSavedAnswerRecord,
  createSavedArgumentPlanRecord,
  createSavedGrievanceOutlineRecord,
  migrateSavedAnswers,
  savedRecordId,
  upsertSavedAnswer,
} from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const cbaSource = createCbaSourceFixtureCache();
const nlrbSource = createPublicSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20260723", gitSha: "annualoutline" });
const defaults = {
  mode: "Strict Research" as const,
  scope: "Official-Like" as const,
  detail: "Detailed" as const,
};

function submit(
  question: string,
  options: { sourcePolicy?: ChatSourcePolicy; cache?: typeof cbaSource | null } = {}
) {
  const snapshot = createChatSubmitSnapshot({
    question,
    sourcePolicy: options.sourcePolicy ?? "auto",
    ...defaults,
  });
  const answer = routeChatQuestion({
    question,
    snapshot,
    publicSource: nlrbSource,
    cbaSource: options.cache === undefined ? cbaSource : options.cache,
    runtimeVersion,
  });
  return { answer, snapshot };
}

function annualAnswer(question = "Can an annual leave request be denied under the CBA?") {
  const result = submit(question);
  expect(result.answer.noAnswer).toBe(false);
  return result.answer;
}

function verifiedOutline() {
  const answer = annualAnswer();
  const outline = buildPublicGrievanceOutline({
    answer,
    source: cbaSource,
    createdAt: "2026-07-23T19:15:00.000Z",
  });
  expect(outline).not.toBeNull();
  return { answer, outline: outline! };
}

describe("public CBA annual-leave cited grievance outline", () => {
  it.each([
    "My annual leave request was denied. What does the CBA say?",
    "How does the CBA govern annual leave scheduling?",
    "What CBA rules apply to approval or denial of a vacation request?",
    "How is annual leave administration handled under the contract?",
  ])("routes a supported bounded alias to the CBA and exposes eligibility: %s", (question) => {
    expect(resolveChatAnswerLane(question, "auto")).toBe("cba");
    const { answer } = submit(question);
    expect(answer.publicSourceRole).toBe("cba_contract");
    expect(answer.noAnswer).toBe(false);
    expect(answer.citations.length).toBeGreaterThanOrEqual(3);
    expect(answer.citations.every((citation) => citation.articleNumber === "10")).toBe(true);
    expect(publicGrievanceOutlineEligibility({ answer, source: cbaSource }).eligible).toBe(true);
  });

  it.each([
    "If I forget to submit my prime-time annual leave by the deadline, can I still take any time off during prime-time?",
    "I forgot to submit my leave today and I still need tomorrow off. Is my supervisor allowed to deny my leave?",
  ])("keeps the operator-QA annual-leave wording in the official CBA lane: %s", (question) => {
    expect(resolveChatAnswerLane(question, "auto")).toBe("cba");
    const { answer, snapshot } = submit(question);
    expect(snapshot.sourceMode).toBe("cba");
    expect(answer.publicSourceRole).toBe("cba_contract");
    expect(answer.version.provider).toBe("local-public-cba-deterministic");
    expect(answer.version.promptVersion).toBe("prompt.public-cba.v0.1-citation-first");
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.citations.every((citation) => citation.citationVerificationState === "verified_current")).toBe(true);
    expect(publicGrievanceOutlineEligibility({ answer, source: cbaSource }).eligible).toBe(true);
    const outline = buildPublicGrievanceOutline({ answer, source: cbaSource });
    expect(outline).not.toBeNull();
    expect([
      outline!.issue,
      outline!.governingContractLanguage,
      outline!.elementsToEstablish,
      outline!.factsToConfirm,
      outline!.evidenceToRequest,
      outline!.questionsForManagement,
      outline!.stepOneArgument,
      outline!.possibleRemedies,
      outline!.timelinessAndProcedureLimits,
      outline!.escalationReadiness,
      outline!.limitations,
      outline!.citations,
    ].every((section) => typeof section === "string" ? section.length > 0 : section.length > 0)).toBe(true);
  });

  it("keeps explicit fake selection isolated and fails a recognized Automatic public intent closed without the CBA cache", () => {
    const question = "If I forget to submit my prime-time annual leave by the deadline, can I still take any time off during prime-time?";
    const explicitFake = submit(question, { sourcePolicy: "fake" });
    expect(explicitFake.snapshot.sourceMode).toBe("fake");
    expect(explicitFake.answer.answerKind).toBe("fake");
    expect(explicitFake.answer.version.provider).toBe("local-fake-deterministic");
    expect(publicGrievanceOutlineEligibility({ answer: explicitFake.answer, source: cbaSource }).eligible).toBe(false);

    const missingSource = submit(question, { cache: null });
    expect(missingSource.snapshot.sourceMode).toBe("cba");
    expect(missingSource.answer.answerKind).toBe("public");
    expect(missingSource.answer.publicSourceRole).toBe("cba_contract");
    expect(missingSource.answer.noAnswer).toBe(true);
    expect(missingSource.answer.version.provider).toBe("local-public-cba-deterministic");
    expect(missingSource.answer.citations).toEqual([]);
    expect(publicGrievanceOutlineEligibility({ answer: missingSource.answer, source: null }).eligible).toBe(false);
  });

  it("keeps known fake annual-leave wording isolated and preserves unrelated routes", () => {
    expect(resolveChatAnswerLane("Can annual leave be denied after I submitted inside the fake window?", "auto")).toBe("fake");
    expect(resolveChatAnswerLane("What does the contract say about overtime?", "auto")).toBe("cba");
    expect(resolveChatAnswerLane("What are my Weingarten rights?", "auto")).toBe("nlrb");
    expect(resolveChatAnswerLane("Tell me about llamas", "auto")).toBe("safe_no_answer");
  });

  it("blocks fake, NLRB, unrelated CBA, no-answer, missing-cache, stale, legacy, and forged-current inputs", () => {
    const current = annualAnswer();
    const fake = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", {
      ...defaults,
      scope: "All Fake",
      runtimeVersion,
    });
    const nlrb = buildPublicSourceAnswer({
      question: "What are my Weingarten rights?",
      source: nlrbSource,
      runtimeVersion,
      ...defaults,
    });
    const unrelated = submit("What does the contract say about overtime?").answer;
    const noAnswer = submit("Tell me about llamas").answer;
    const legacy = structuredClone(current);
    for (const citation of legacy.citations) {
      delete citation.sourceInstanceId;
      delete citation.sourceInstanceAlgorithmVersion;
      delete citation.paragraphContentSha256;
      delete citation.paragraphHashAlgorithmVersion;
      delete citation.citationAnchorSha256;
      delete citation.citationAnchorAlgorithmVersion;
      delete citation.citationVerificationState;
    }
    const stale = structuredClone(current);
    stale.citations[0].sourceInstanceId = "0".repeat(64);
    const forgedCurrent = structuredClone(stale);
    forgedCurrent.citations[0].citationVerificationState = "verified_current";

    for (const answer of [fake, nlrb, unrelated, noAnswer, legacy, stale, forgedCurrent]) {
      expect(publicGrievanceOutlineEligibility({ answer, source: cbaSource }).eligible).toBe(false);
      expect(buildPublicGrievanceOutline({ answer, source: cbaSource })).toBeNull();
    }
    expect(publicGrievanceOutlineEligibility({ answer: current, source: null }).eligible).toBe(false);
    expect(buildPublicGrievanceOutline({ answer: current, source: null })).toBeNull();
  });

  it("requires the complete current source set and does not trust a status label alone", () => {
    const current = annualAnswer();
    const incomplete = structuredClone(cbaSource);
    const stepTwo = incomplete.normalized.pages
      .flatMap((page) => page.paragraphs)
      .find((paragraph) => /develop all necessary facts/i.test(paragraph.text));
    expect(stepTwo).toBeDefined();
    stepTwo!.text = "Required Step 2 fixture support removed.";
    expect(publicGrievanceOutlineEligibility({ answer: current, source: incomplete }).eligible).toBe(false);

    const forged = structuredClone(current);
    forged.citations[0].paragraphContentSha256 = "f".repeat(64);
    forged.citations[0].citationVerificationState = "verified_current";
    expect(verifyCbaCitation(forged.citations[0], cbaSource).state).not.toBe("verified_current");
    expect(publicGrievanceOutlineEligibility({ answer: forged, source: cbaSource }).eligible).toBe(false);
  });

  it("builds all 12 bounded sections with current citations and conditional content", () => {
    const { outline } = verifiedOutline();
    const sections = [
      outline.issue,
      outline.governingContractLanguage,
      outline.elementsToEstablish,
      outline.factsToConfirm,
      outline.evidenceToRequest,
      outline.questionsForManagement,
      outline.stepOneArgument,
      outline.possibleRemedies,
      outline.timelinessAndProcedureLimits,
      outline.escalationReadiness,
      outline.limitations,
      outline.citations,
    ];
    for (const section of sections) {
      expect(typeof section === "string" ? section.length : section.length).toBeGreaterThan(0);
    }

    const citedItems = [
      ...outline.governingContractLanguage,
      ...outline.elementsToEstablish,
      ...outline.evidenceToRequest,
      ...outline.stepOneArgument,
      ...outline.possibleRemedies,
      ...outline.timelinessAndProcedureLimits,
      ...outline.escalationReadiness,
      ...outline.limitations,
    ];
    const citationIds = new Set(outline.citations.map((citation) => citation.id));
    for (const entry of citedItems) {
      expect(entry.citationIds.length).toBeGreaterThan(0);
      expect(entry.citationIds.every((citationId) => citationIds.has(citationId))).toBe(true);
    }
    expect(outline.citations.every((citation) => verifyCbaCitation(citation, cbaSource).state === "verified_current")).toBe(true);
    expect(new Set(outline.citations.map((citation) => citation.articleNumber))).toEqual(new Set(["10", "15"]));
    expect(outline.privateCaseWarning).toBe(PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING);
    expect(outline.factsToConfirm.join(" ")).toMatch(/confirm|verified|applicable/i);
    expect(outline.possibleRemedies.map((entry) => entry.text).join(" ")).toMatch(/might|conditional|no remedy is promised/i);
    expect(outline.timelinessAndProcedureLimits.map((entry) => entry.text).join(" ")).toMatch(/qualified|does not calculate/i);
    expect(outline.limitations.map((entry) => entry.text).join(" ")).toContain("does not replace local union advice or legal advice");
    expect(outline.limitations.map((entry) => entry.text).join(" ")).toContain("unknown facts do not establish that management violated");
    expect(outline.limitations.map((entry) => entry.text).join(" ")).toContain("does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, or local practice");
    expect(outline.evidenceToRequest.map((entry) => entry.text).join(" ")).not.toMatch(/management (?:has|possesses|keeps)/i);
    expect(JSON.stringify(outline)).not.toMatch(/\b(?:EIN|employee ID|grievance ID|case number|installation number)\b/i);
  });

  it("renders the exact builder action, all section headings, warning, citation controls, and Saved type", () => {
    const { answer, outline } = verifiedOutline();
    const message = createAssistantMessage({
      threadId: "thread-annual-outline",
      turnId: "turn-annual-outline",
      parentMessageId: "message-user-annual-outline",
      answer,
      modeScopeDetail: { ...defaults, sourceMode: "cba", sourceModePolicy: "auto" },
      now: "2026-07-23T19:15:00.000Z",
    });
    const actionHtml = renderToStaticMarkup(React.createElement(AssistantMessageCard, {
      message,
      onRetry: () => undefined,
      onSave: () => undefined,
      canBuildGrievanceOutline: true,
    }));
    const outlineHtml = renderToStaticMarkup(React.createElement(AssistantMessageCard, {
      message,
      onRetry: () => undefined,
      onSave: () => undefined,
      canBuildGrievanceOutline: true,
      grievanceOutline: outline,
      onSaveGrievanceOutline: () => undefined,
    }));
    expect(actionHtml).toContain("Build cited grievance outline");
    for (const heading of [
      "1. Issue",
      "2. Governing contract language",
      "3. Elements that must be established",
      "4. Facts still to confirm",
      "5. Evidence or records to request",
      "6. Questions to ask management",
      "7. Step 1 argument outline",
      "8. Possible remedy categories",
      "9. Timeliness and procedural limits",
      "10. Step 2 or escalation readiness",
      "11. Limitations and uncertainty",
      "12. Sources",
    ]) expect(outlineHtml).toContain(heading);
    expect(outlineHtml).toContain(PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING);
    expect(outlineHtml).toContain("Open supporting citation");
    expect(outlineHtml).toContain("Save cited grievance outline");
    expect(outlineHtml).toContain("Saved type: public_grievance_outline");
  });

  it("coexists with a normal answer and Weingarten plan, deduplicates stably, reopens, and deletes by isolated ID", () => {
    const { answer, outline } = verifiedOutline();
    const answerRecord = createSavedAnswerRecord({
      answer,
      ...defaults,
      timestamp: "2026-07-23T19:16:00.000Z",
    });
    const outlineRecord = createSavedGrievanceOutlineRecord({
      outline,
      question: answer.question,
      ...defaults,
      timestamp: "2026-07-23T19:17:00.000Z",
    });
    const weingartenAnswer = buildPublicSourceAnswer({
      question: "What are my Weingarten rights?",
      source: nlrbSource,
      runtimeVersion,
      ...defaults,
    });
    const weingartenPlan = buildPublicArgumentPlan({
      answer: weingartenAnswer,
      source: nlrbSource,
      createdAt: "2026-07-23T19:18:00.000Z",
    });
    expect(weingartenPlan).not.toBeNull();
    const planRecord = createSavedArgumentPlanRecord({
      plan: weingartenPlan!,
      question: weingartenAnswer.question,
      ...defaults,
      timestamp: "2026-07-23T19:18:00.000Z",
    });

    expect(answerRecord.id).toBe(savedRecordId("answer", answerRecord.saveKey));
    expect(outlineRecord.id).toBe(savedRecordId(PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE, outlineRecord.saveKey));
    expect(planRecord.id).toBe(savedRecordId(PUBLIC_ARGUMENT_PLAN_SAVED_TYPE, planRecord.saveKey));
    expect(new Set([answerRecord.id, outlineRecord.id, planRecord.id])).toHaveLength(3);
    expect(outlineRecord.id).toMatch(/^saved-public-grievance-outline-[a-f0-9]{64}$/);

    const insertedAnswer = upsertSavedAnswer([], answerRecord);
    const insertedOutline = upsertSavedAnswer(insertedAnswer.saved, outlineRecord);
    const insertedPlan = upsertSavedAnswer(insertedOutline.saved, planRecord);
    const duplicateOutline = createSavedGrievanceOutlineRecord({
      outline: { ...outline, createdAt: "2026-07-23T19:19:00.000Z" },
      question: answer.question,
      ...defaults,
      timestamp: "2026-07-23T19:19:00.000Z",
    });
    const deduped = upsertSavedAnswer(insertedPlan.saved, duplicateOutline);
    expect(deduped.status).toBe("duplicate");
    expect(deduped.saved).toHaveLength(3);

    const migrated = migrateSavedAnswers(structuredClone(deduped.saved));
    expect(migrated).toHaveLength(3);
    const reopened = migrated.find((item) => item.savedType === PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE);
    expect(reopened?.grievanceOutline).toEqual(outline);
    expect(reopened?.grievanceOutline?.citations).toHaveLength(outline.citations.length);
    expect(reopened?.grievanceOutline?.stepOneArgument).toHaveLength(outline.stepOneArgument.length);
    expect(reopened?.grievanceOutline?.limitations).toHaveLength(outline.limitations.length);

    const afterAnswerDelete = migrated.filter((item) => item.id !== answerRecord.id);
    expect(afterAnswerDelete).toHaveLength(2);
    expect(afterAnswerDelete.some((item) => item.savedType === PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE)).toBe(true);
    expect(afterAnswerDelete.some((item) => item.savedType === PUBLIC_ARGUMENT_PLAN_SAVED_TYPE)).toBe(true);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const html = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
        saved: migrated,
        onDelete: () => undefined,
        cbaSourceState: { status: "available", source: cbaSource },
      }));
      expect(html).toContain("public_grievance_outline");
      expect(html).toContain("Open saved outline");
      expect(html).toContain("public_argument_plan");
      expect(html).toContain("Open saved plan");
      expect(consoleError.mock.calls.flat().join(" ")).not.toContain("same key");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("keeps Settings, health, accepted identities, product, and blocked gates truthful", async () => {
    expect(currentAcceptedPushedState.local_bundle_phase).toBe(PUBLIC_GRIEVANCE_OUTLINE_PHASE);
    expect(currentAcceptedPushedState.local_bundle_status).toBe(
      "public CBA annual-leave cited grievance-outline pilot; automatic public-CBA routing repair; validation PASS; pushed no; manual QA PASS"
    );
    expect(currentAcceptedPushedState.accepted_pushed_commit).toBe("76c73122a87cb23b5b8595a002d54d7a127fbba8");
    expect(currentAcceptedPushedState.repository_recording_commit).toBe("3690c74650d0fb19395bd046adee1bf236950f9e");
    expect(currentAcceptedPushedState.latest_pushed_closeout_commit).toBe("0695680047608462b5f154a9ed82593e6923932a");

    const healthResponse = GET();
    const health = await healthResponse.json();
    expect(health.phase).toBe(PUBLIC_GRIEVANCE_OUTLINE_PHASE);
    expect(health.productVersion).toBe("0.7.0");
    expect(health.dataModes.private_data).toBe("blocked");
    expect(health.dataModes.external_ai).toBe("disabled");
    expect(health.realDbTouched).toBe(false);
    expect(health.acceptedCommit).toBe(currentAcceptedPushedState.accepted_pushed_commit);
    expect(health.repositoryRecordingCommit).toBe(currentAcceptedPushedState.repository_recording_commit);
    expect(health.latestPushedCloseoutCommit).toBe(currentAcceptedPushedState.latest_pushed_closeout_commit);

    const settingsHtml = renderToStaticMarkup(React.createElement(SettingsContent, {
      cbaSourceState: { status: "available", source: cbaSource },
      publicSourceState: { status: "available", source: nlrbSource },
      runtimeVersion,
      operatorDiagnosticsOpen: false,
      onOperatorDiagnosticsToggle: () => undefined,
    }));
    expect(settingsHtml).toContain(currentAcceptedPushedState.local_bundle_status);
    expect(settingsHtml).toContain(currentAcceptedPushedState.accepted_pushed_short_commit);

    const uploadHtml = renderToStaticMarkup(React.createElement(FakeUploadPanel, {
      fakeOnlyConfirmed: false,
      onFakeOnlyConfirmedChange: () => undefined,
      onQueueFakeUpload: () => undefined,
      quarantine: [],
    }));
    expect(uploadHtml).toContain("No file picker is present");
    expect(uploadHtml).not.toContain('type="file"');

    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(currentAcceptedPushedState.v0912c_status).toBe("blocked_pending_exact_target");
    expect(currentAcceptedPushedState.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
  });
});
