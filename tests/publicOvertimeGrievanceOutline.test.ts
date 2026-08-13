import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/health/route";
import {
  AssistantMessageCard,
  SavedAnswersPanel,
  SettingsContent,
} from "@/components/KiaStickApp";
import { buildAnswer } from "@/lib/answerGovernor";
import { detectCbaIntent } from "@/lib/cbaAnswer";
import {
  createChatSubmitSnapshot,
  isAutoCbaQuestion,
  resolveChatAnswerLane,
  routeChatQuestion,
  type ChatSourcePolicy,
} from "@/lib/chatAnswerRouter";
import { createAssistantMessage } from "@/lib/conversationModel";
import { currentAcceptedPushedState } from "@/lib/acceptedState";
import { verifyCbaCitation } from "@/lib/cbaCitationIntegrity";
import {
  buildPublicArgumentPlan,
  PUBLIC_ARGUMENT_PLAN_SAVED_TYPE,
} from "@/lib/publicArgumentPlan";
import {
  buildPublicGrievanceOutline,
  PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING,
  PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE,
  publicGrievanceOutlineEligibility,
} from "@/lib/publicGrievanceOutline";
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
const runtimeVersion = createRuntimeVersion({ buildDate: "20260724", gitSha: "overtimepilot" });
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

function overtimeAnswer(question = "How should overtime opportunities be distributed under the CBA?") {
  const result = submit(question);
  expect(result.answer.noAnswer).toBe(false);
  return result.answer;
}

function annualAnswer() {
  const result = submit("Can an annual leave request be denied under the CBA?");
  expect(result.answer.noAnswer).toBe(false);
  return result.answer;
}

function verifiedOvertimeOutline(createdAt = "2026-07-24T14:30:00.000Z") {
  const answer = overtimeAnswer();
  const outline = buildPublicGrievanceOutline({ answer, source: cbaSource, createdAt });
  expect(outline).not.toBeNull();
  return { answer, outline: outline! };
}

describe("public CBA overtime cited grievance outline", () => {
  it.each([
    "What does the CBA say about overtime?",
    "How is the overtime desired list administered?",
    "How does the ODL work under the contract?",
    "Was someone bypassed for overtime?",
    "What does Article 8 say about forced overtime?",
    "When can mandatory overtime be assigned?",
    "How are overtime assignments distributed?",
    "Who receives an overtime opportunity?",
    "Does Article 8 require equitable overtime rotation?",
    "Could overtime worked off assignment affect the ODL sequence?",
  ])("recognizes and routes the bounded overtime intent: %s", (question) => {
    expect(detectCbaIntent(question)).toBe("overtime");
    expect(isAutoCbaQuestion(question)).toBe(true);
    expect(resolveChatAnswerLane(question, "auto")).toBe("cba");
    const { answer, snapshot } = submit(question);
    expect(snapshot.sourceMode).toBe("cba");
    expect(answer.answerKind).toBe("public");
    expect(answer.publicSourceRole).toBe("cba_contract");
    expect(answer.noAnswer).toBe(false);
    expect(answer.version.provider).toBe("local-public-cba-deterministic");
    expect(answer.version.promptVersion).toBe("prompt.public-cba.v0.1-citation-first");
    expect(answer.citations).toHaveLength(3);
    expect(answer.citations.every((citation) => citation.articleNumber === "8")).toBe(true);
    expect(answer.citations.every((citation) => citation.citationVerificationState === "verified_current")).toBe(true);
    expect(publicGrievanceOutlineEligibility({ answer, source: cbaSource })).toMatchObject({
      eligible: true,
      template: "overtime",
    });
  });

  it.each([
    "How does work get assigned?",
    "What is my schedule?",
    "How many hours are there?",
    "Can I work extra?",
    "Which list applies?",
    "Tell me about an assignment.",
  ])("does not overroute a generic word: %s", (question) => {
    expect(isAutoCbaQuestion(question)).toBe(false);
    expect(resolveChatAnswerLane(question, "auto")).not.toBe("cba");
  });

  it("preserves public-CBA precedence, explicit fake isolation, missing-cache no-answer, and safe no-answer", () => {
    const question = "How are overtime assignments distributed?";
    expect(resolveChatAnswerLane(question, "auto")).toBe("cba");
    expect(resolveChatAnswerLane("What are my Weingarten rights?", "auto")).toBe("nlrb");
    expect(resolveChatAnswerLane("Can annual leave be denied after I submitted inside the fake window?", "auto")).toBe("fake");
    expect(resolveChatAnswerLane("Tell me about llamas", "auto")).toBe("safe_no_answer");

    const explicitFake = submit(question, { sourcePolicy: "fake" });
    expect(explicitFake.snapshot.sourceMode).toBe("fake");
    expect(explicitFake.answer.answerKind).toBe("fake");
    expect(explicitFake.answer.version.provider).toBe("local-fake-deterministic");
    expect(publicGrievanceOutlineEligibility({ answer: explicitFake.answer, source: cbaSource }).eligible).toBe(false);

    const missing = submit(question, { cache: null });
    expect(missing.snapshot.sourceMode).toBe("cba");
    expect(missing.answer.publicSourceRole).toBe("cba_contract");
    expect(missing.answer.noAnswer).toBe(true);
    expect(missing.answer.citations).toEqual([]);
    expect(buildPublicGrievanceOutline({ answer: missing.answer, source: null })).toBeNull();

    const unsupported = submit("Tell me about llamas");
    expect(unsupported.snapshot.sourceMode).toBe("safe_no_answer");
    expect(unsupported.answer.publicSourceRole).toBe("safe_no_answer");
    expect(unsupported.answer.noAnswer).toBe(true);
    expect(unsupported.answer.citations).toEqual([]);
  });

  it("fails eligibility closed for stale, legacy, forged, source, paragraph, anchor, and trusted-navigation mismatches", () => {
    const current = overtimeAnswer();
    const variants = [];

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
    variants.push(legacy);

    const sourceMismatch = structuredClone(current);
    sourceMismatch.citations[0].sourceInstanceId = "0".repeat(64);
    variants.push(sourceMismatch);

    const forgedCurrent = structuredClone(sourceMismatch);
    forgedCurrent.citations[0].citationVerificationState = "verified_current";
    variants.push(forgedCurrent);

    const paragraphMismatch = structuredClone(current);
    paragraphMismatch.citations[0].paragraphContentSha256 = "f".repeat(64);
    variants.push(paragraphMismatch);

    const anchorMismatch = structuredClone(current);
    anchorMismatch.citations[0].citationAnchorSha256 = "e".repeat(64);
    variants.push(anchorMismatch);

    const navigationMismatch = structuredClone(current);
    navigationMismatch.citations[0].officialUrl = "https://example.invalid/not-allowlisted";
    expect(verifyCbaCitation(navigationMismatch.citations[0], cbaSource).state).toBe("verified_current");
    variants.push(navigationMismatch);

    for (const answer of variants) {
      expect(publicGrievanceOutlineEligibility({ answer, source: cbaSource }).eligible).toBe(false);
      expect(buildPublicGrievanceOutline({ answer, source: cbaSource })).toBeNull();
    }

    const changedSource = structuredClone(cbaSource);
    changedSource.normalized.sha256 = "1".repeat(64);
    expect(publicGrievanceOutlineEligibility({ answer: current, source: changedSource }).eligible).toBe(false);
  });

  it("builds the same deterministic twelve-section overtime outline with verified current citations", () => {
    const first = verifiedOvertimeOutline();
    const second = verifiedOvertimeOutline("2026-07-24T14:31:00.000Z");
    expect(first.outline.template).toBe("overtime");
    expect(first.outline.topic).toBe("Overtime");
    expect(first.outline.type).toBe("overtime_assignment_or_distribution");
    expect(first.outline.id).toBe(second.outline.id);
    expect(first.outline.contentIdentity).toBe(second.outline.contentIdentity);

    const sections = [
      first.outline.issue,
      first.outline.governingContractLanguage,
      first.outline.elementsToEstablish,
      first.outline.factsToConfirm,
      first.outline.evidenceToRequest,
      first.outline.questionsForManagement,
      first.outline.stepOneArgument,
      first.outline.possibleRemedies,
      first.outline.timelinessAndProcedureLimits,
      first.outline.escalationReadiness,
      first.outline.limitations,
      first.outline.citations,
    ];
    expect(sections.every((section) => typeof section === "string" ? section.length > 0 : section.length > 0)).toBe(true);
    expect(new Set(first.outline.citations.map((citation) => citation.articleNumber))).toEqual(new Set(["8", "15"]));
    expect(first.outline.citations.every((citation) => verifyCbaCitation(citation, cbaSource).state === "verified_current")).toBe(true);
    expect(first.outline.privateCaseWarning).toBe(PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING);

    const citedItems = [
      ...first.outline.governingContractLanguage,
      ...first.outline.elementsToEstablish,
      ...first.outline.evidenceToRequest,
      ...first.outline.stepOneArgument,
      ...first.outline.possibleRemedies,
      ...first.outline.timelinessAndProcedureLimits,
      ...first.outline.escalationReadiness,
      ...first.outline.limitations,
    ];
    const citationIds = new Set(first.outline.citations.map((citation) => citation.id));
    for (const entry of citedItems) {
      expect(entry.citationIds.length).toBeGreaterThan(0);
      expect(entry.citationIds.every((citationId) => citationIds.has(citationId))).toBe(true);
    }
    expect(first.outline.factsToConfirm.join(" ")).toMatch(/separately verified|without entering employee names/i);
    expect(first.outline.possibleRemedies.map((entry) => entry.text).join(" ")).toMatch(/might|no entitlement|no outcome is promised/i);
    expect(first.outline.limitations.map((entry) => entry.text).join(" ")).toMatch(/unknown facts do not establish|does not determine a particular remedy|legal advice/i);
    expect(first.outline.evidenceToRequest.map((entry) => entry.text).join(" ")).not.toMatch(/management (?:has|possesses|keeps)/i);
  });

  it("renders the exact action, private-data warning, topic identity, twelve headings, citations, and separate save control", () => {
    const { answer, outline } = verifiedOvertimeOutline();
    const message = createAssistantMessage({
      threadId: "thread-overtime-outline",
      turnId: "turn-overtime-outline",
      parentMessageId: "message-user-overtime-outline",
      answer,
      modeScopeDetail: { ...defaults, sourceMode: "cba", sourceModePolicy: "auto" },
      now: "2026-07-24T14:30:00.000Z",
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
    expect(actionHtml).toContain("Save to Saved");
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
    expect(outlineHtml).toContain("Topic: Overtime");
    expect(outlineHtml).toContain("Template: overtime");
    expect(outlineHtml).toContain("Open supporting citation");
    expect(outlineHtml).toContain("Save cited grievance outline");
    expect(outlineHtml).toContain("Saved type: public_grievance_outline");
  });

  it("keeps annual leave and Weingarten builders intact and topic-separated", () => {
    const annual = buildPublicGrievanceOutline({
      answer: annualAnswer(),
      source: cbaSource,
      createdAt: "2026-07-24T14:32:00.000Z",
    });
    const overtime = verifiedOvertimeOutline().outline;
    expect(annual).not.toBeNull();
    expect(annual?.template).toBe("annual_leave");
    expect(annual?.topic).toBe("Annual leave");
    expect(annual?.type).toBe("annual_leave_denial_or_scheduling");
    expect(annual?.id).not.toBe(overtime.id);
    expect(annual?.contentIdentity).not.toBe(overtime.contentIdentity);

    const weingartenAnswer = buildPublicSourceAnswer({
      question: "What are my Weingarten rights?",
      source: nlrbSource,
      runtimeVersion,
      ...defaults,
    });
    const plan = buildPublicArgumentPlan({ answer: weingartenAnswer, source: nlrbSource });
    expect(plan).not.toBeNull();
    expect(plan?.savedType).toBe(PUBLIC_ARGUMENT_PLAN_SAVED_TYPE);
  });

  it("saves, reopens, deduplicates, migrates idempotently, coexists, deletes in isolation, and uses unique React keys", () => {
    const { answer: overtime, outline: overtimeOutline } = verifiedOvertimeOutline();
    const annual = buildPublicGrievanceOutline({
      answer: annualAnswer(),
      source: cbaSource,
      createdAt: "2026-07-24T14:33:00.000Z",
    })!;
    const weingartenAnswer = buildPublicSourceAnswer({
      question: "What are my Weingarten rights?",
      source: nlrbSource,
      runtimeVersion,
      ...defaults,
    });
    const plan = buildPublicArgumentPlan({ answer: weingartenAnswer, source: nlrbSource })!;

    const answerRecord = createSavedAnswerRecord({
      answer: overtime,
      ...defaults,
      timestamp: "2026-07-24T14:34:00.000Z",
    });
    const overtimeRecord = createSavedGrievanceOutlineRecord({
      outline: overtimeOutline,
      question: overtime.question,
      ...defaults,
      timestamp: "2026-07-24T14:35:00.000Z",
    });
    const annualRecord = createSavedGrievanceOutlineRecord({
      outline: annual,
      question: "Can an annual leave request be denied under the CBA?",
      ...defaults,
      timestamp: "2026-07-24T14:36:00.000Z",
    });
    const planRecord = createSavedArgumentPlanRecord({
      plan,
      question: weingartenAnswer.question,
      ...defaults,
      timestamp: "2026-07-24T14:37:00.000Z",
    });

    expect(overtimeRecord.savedType).toBe(PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE);
    expect(overtimeRecord.grievanceOutlineTopic).toBe("Overtime");
    expect(overtimeRecord.grievanceOutlineTemplate).toBe("overtime");
    expect(annualRecord.grievanceOutlineTemplate).toBe("annual_leave");
    expect(overtimeRecord.saveKey).toContain("|overtime|");
    expect(annualRecord.saveKey).toContain("|annual_leave|");
    expect(overtimeRecord.id).toBe(savedRecordId(PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE, overtimeRecord.saveKey));
    expect(new Set([answerRecord.id, overtimeRecord.id, annualRecord.id, planRecord.id])).toHaveLength(4);

    let saved = upsertSavedAnswer([], answerRecord).saved;
    saved = upsertSavedAnswer(saved, overtimeRecord).saved;
    saved = upsertSavedAnswer(saved, annualRecord).saved;
    saved = upsertSavedAnswer(saved, planRecord).saved;
    expect(saved).toHaveLength(4);

    const duplicate = createSavedGrievanceOutlineRecord({
      outline: { ...overtimeOutline, createdAt: "2026-07-24T14:38:00.000Z" },
      question: overtime.question,
      ...defaults,
      timestamp: "2026-07-24T14:38:00.000Z",
    });
    const deduped = upsertSavedAnswer(saved, duplicate);
    expect(deduped.status).toBe("duplicate");
    expect(deduped.saved).toHaveLength(4);

    const migrated = migrateSavedAnswers(structuredClone(deduped.saved));
    const migratedAgain = migrateSavedAnswers(structuredClone(migrated));
    expect(migratedAgain).toEqual(migrated);
    expect(migrated).toHaveLength(4);
    const reopenedOvertime = migrated.find((item) => item.grievanceOutlineTemplate === "overtime");
    const reopenedAnnual = migrated.find((item) => item.grievanceOutlineTemplate === "annual_leave");
    expect(reopenedOvertime?.grievanceOutline).toEqual(overtimeOutline);
    expect(reopenedOvertime?.grievanceOutline?.citations).toEqual(overtimeOutline.citations);
    expect(reopenedAnnual?.grievanceOutline).toEqual(annual);

    const afterOvertimeDelete = migrated.filter((item) => item.id !== overtimeRecord.id);
    expect(afterOvertimeDelete).toHaveLength(3);
    expect(afterOvertimeDelete.some((item) => item.grievanceOutlineTemplate === "annual_leave")).toBe(true);
    expect(afterOvertimeDelete.some((item) => item.savedType === "answer")).toBe(true);
    expect(afterOvertimeDelete.some((item) => item.savedType === PUBLIC_ARGUMENT_PLAN_SAVED_TYPE)).toBe(true);

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const html = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
        saved: migrated,
        onDelete: () => undefined,
        cbaSourceState: { status: "available", source: cbaSource },
      }));
      expect(html).toContain("Saved topic");
      expect(html).toContain("Saved template");
      expect(html).toContain("overtime");
      expect(html).toContain("annual_leave");
      expect(html.match(/Open saved outline/g)).toHaveLength(2);
      expect(html).toContain("Open saved plan");
      expect(consoleError.mock.calls.flat().join(" ")).not.toContain("same key");
    } finally {
      consoleError.mockRestore();
    }
  });

  it("migrates a legacy annual outline without a template exactly once", () => {
    const annual = buildPublicGrievanceOutline({
      answer: annualAnswer(),
      source: cbaSource,
      createdAt: "2026-07-24T14:39:00.000Z",
    })!;
    const record = createSavedGrievanceOutlineRecord({
      outline: annual,
      question: "Can an annual leave request be denied under the CBA?",
      ...defaults,
      timestamp: "2026-07-24T14:39:00.000Z",
    });
    const legacy = structuredClone(record);
    delete (legacy.grievanceOutline as Partial<typeof annual>).template;
    delete legacy.grievanceOutlineTemplate;
    legacy.id = "legacy-outline-id";
    legacy.saveKey = `${PUBLIC_GRIEVANCE_OUTLINE_SAVED_TYPE}|${annual.id}`;

    const migrated = migrateSavedAnswers([legacy]);
    const migratedAgain = migrateSavedAnswers(structuredClone(migrated));
    expect(migrated).toHaveLength(1);
    expect(migrated[0].grievanceOutline?.template).toBe("annual_leave");
    expect(migrated[0].grievanceOutlineTemplate).toBe("annual_leave");
    expect(migrated[0].saveKey).toContain("|annual_leave|");
    expect(migratedAgain).toEqual(migrated);
  });

  it("keeps Settings and health truthful with refreshed accepted identities and unchanged safety gates", async () => {
    const health = await GET().json();
    expect(health.phase).toBe(currentAcceptedPushedState.local_bundle_phase);
    expect(health.productVersion).toBe("0.7.0");
    expect(health.acceptedCommit).toBe("996032370846952e59756caa23cde2eed9a1d458");
    expect(health.repositoryRecordingCommit).toBe("4d0f6e2338f2b327933a80e26ec2a83c56530350");
    expect(health.latestPushedCloseoutCommit).toBe("4d0f6e2338f2b327933a80e26ec2a83c56530350");
    expect(health.dataModes.private_data).toBe("blocked");
    expect(health.dataModes.external_ai).toBe("disabled");
    expect(health.realDbTouched).toBe(false);
    expect(health.cloudRequired).toBe(false);
    expect(health.apiKeyRequired).toBe(false);

    const settings = renderToStaticMarkup(React.createElement(SettingsContent, {
      cbaSourceState: { status: "available", source: cbaSource },
      publicSourceState: { status: "available", source: nlrbSource },
      runtimeVersion,
      operatorDiagnosticsOpen: false,
      onOperatorDiagnosticsToggle: () => undefined,
    }));
    expect(settings).toContain("Accessibility and Saved-State Resilience Post-Push Accepted-State Refresh");
    expect(settings).toContain(currentAcceptedPushedState.local_bundle_phase);
    expect(settings).toContain("Manual QA</dt><dd>PASS");
    expect(settings).toContain(runtimeVersion.gitSha);
    expect(currentAcceptedPushedState.queue_015_status).toBe("blocked");
    expect(currentAcceptedPushedState.v0912c_status).toBe("blocked_pending_exact_target");
    expect(currentAcceptedPushedState.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
  });

  it("does not expose the builder for a fake answer even when a caller attempts to supply one", () => {
    const fake = buildAnswer("Can annual leave be denied after I submitted inside the fake window?", {
      ...defaults,
      scope: "All Fake",
      runtimeVersion,
    });
    expect(publicGrievanceOutlineEligibility({ answer: fake, source: cbaSource }).eligible).toBe(false);
    expect(buildPublicGrievanceOutline({ answer: fake, source: cbaSource })).toBeNull();
  });
});
