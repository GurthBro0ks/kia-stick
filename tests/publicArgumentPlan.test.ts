import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistantMessageCard, SavedAnswersPanel } from "@/components/KiaStickApp";
import { buildAnswer } from "@/lib/answerGovernor";
import {
  createChatSubmitSnapshot,
  resolveChatAnswerLane,
  routeChatQuestion,
} from "@/lib/chatAnswerRouter";
import { createAssistantMessage } from "@/lib/conversationModel";
import {
  buildPublicArgumentPlan,
  PUBLIC_ARGUMENT_PLAN_PRIVATE_WARNING,
  PUBLIC_ARGUMENT_PLAN_PREPARATION_WARNING,
  publicArgumentPlanToText,
  publicArgumentPlanEligibility,
} from "@/lib/publicArgumentPlan";
import {
  derivePublicCitationIntegrity,
  verifyPublicCitation,
} from "@/lib/publicCitationIntegrity";
import { buildPublicSourceAnswer, citationForPublicParagraph } from "@/lib/publicSourceAnswer";
import {
  createSavedAnswerRecord,
  createSavedArgumentPlanRecord,
  migrateSavedAnswers,
  upsertSavedAnswer,
} from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const source = createPublicSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20260722", gitSha: "argumentpilot" });
const defaults = {
  mode: "Strict Research" as const,
  scope: "Official-Like" as const,
  detail: "Detailed" as const,
};

function verifiedAnswer(question = "Can I have a steward during an investigative interview?") {
  return buildPublicSourceAnswer({ question, source, runtimeVersion, ...defaults });
}

function verifiedPlan() {
  const answer = verifiedAnswer();
  const plan = buildPublicArgumentPlan({ answer, source, createdAt: "2026-07-22T17:30:00.000Z" });
  expect(plan).not.toBeNull();
  return { answer, plan: plan! };
}

describe("public Weingarten cited argument builder", () => {
  it.each([
    "Can I have a steward during an investigative interview?",
    "May I request a union representative when questioning may lead to discipline?",
    "What are my Weingarten rights?",
  ])("routes the supported investigatory-interview alias to NLRB guidance: %s", (question) => {
    expect(resolveChatAnswerLane(question, "auto")).toBe("nlrb");
    const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", ...defaults });
    const answer = routeChatQuestion({ question, snapshot, publicSource: source, runtimeVersion });
    expect(answer.noAnswer).toBe(false);
    expect(publicArgumentPlanEligibility({ answer, source }).eligible).toBe(true);
  });

  it("exposes the Build cited argument action only for an eligible current public answer", () => {
    const answer = verifiedAnswer();
    const message = createAssistantMessage({
      threadId: "thread-argument-plan",
      turnId: "turn-argument-plan",
      parentMessageId: "message-user",
      answer,
      modeScopeDetail: { ...defaults, sourceMode: "nlrb", sourceModePolicy: "auto" },
      now: "2026-07-22T17:30:00.000Z",
    });
    const eligibleHtml = renderToStaticMarkup(React.createElement(AssistantMessageCard, {
      message,
      onRetry: () => undefined,
      onSave: () => undefined,
      canBuildArgument: true,
    }));
    const ineligibleHtml = renderToStaticMarkup(React.createElement(AssistantMessageCard, {
      message,
      onRetry: () => undefined,
      onSave: () => undefined,
    }));
    expect(eligibleHtml).toContain("Build cited argument");
    expect(ineligibleHtml).not.toContain("Build cited argument");
  });

  it("blocks unrelated, fake, no-answer, missing-cache, legacy, and stale answers", () => {
    const fake = buildAnswer("What evidence belongs in a Step 1 fake file?", {
      ...defaults,
      scope: "All Fake",
      runtimeVersion,
    });
    const unrelated = routeChatQuestion({
      question: "Tell me about llamas",
      snapshot: createChatSubmitSnapshot({ question: "Tell me about llamas", sourcePolicy: "auto", ...defaults }),
      publicSource: source,
      runtimeVersion,
    });
    const unsupported = buildPublicSourceAnswer({ question: "How much annual leave do I have?", source, runtimeVersion, ...defaults });
    const current = verifiedAnswer();
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
    const statusOnlyLegacy = structuredClone(current);
    statusOnlyLegacy.citations[0].citationVerificationState = "legacy_unverifiable";

    expect(publicArgumentPlanEligibility({ answer: fake, source }).eligible).toBe(false);
    expect(publicArgumentPlanEligibility({ answer: unrelated, source }).eligible).toBe(false);
    expect(publicArgumentPlanEligibility({ answer: unsupported, source }).eligible).toBe(false);
    expect(publicArgumentPlanEligibility({ answer: current, source: null }).eligible).toBe(false);
    expect(publicArgumentPlanEligibility({ answer: legacy, source }).eligible).toBe(false);
    expect(publicArgumentPlanEligibility({ answer: stale, source }).eligible).toBe(false);
    expect(publicArgumentPlanEligibility({ answer: statusOnlyLegacy, source }).eligible).toBe(false);
  });

  it("verifies source instance, paragraph content, and citation anchor metadata", () => {
    const section = source.normalized.sections[0];
    const paragraph = section.paragraphs[0];
    const citation = citationForPublicParagraph(source, section, paragraph);
    const integrity = derivePublicCitationIntegrity(source, section, paragraph);
    expect(citation).toMatchObject(integrity);
    expect(verifyPublicCitation(citation, source).state).toBe("verified_current");

    const staleInstance = { ...citation, sourceInstanceId: "0".repeat(64) };
    expect(verifyPublicCitation(staleInstance, source).state).toBe("source_instance_changed");
    const changedSource = structuredClone(source);
    changedSource.normalized.sections[0].paragraphs[0].text += " changed";
    expect(verifyPublicCitation(citation, changedSource).state).toBe("paragraph_changed");
    const legacy = { sourceId: citation.sourceId, sectionId: citation.sectionId, paragraphId: citation.paragraphId };
    expect(verifyPublicCitation(legacy, source).state).toBe("legacy_unverifiable");
  });

  it("builds every required section with conditional, citation-grounded content", () => {
    const { plan } = verifiedPlan();
    expect(plan.issueSummary).toBeTruthy();
    for (const list of [
      plan.thresholdElements,
      plan.factsToConfirm,
      plan.memberActions,
      plan.stewardActions,
      plan.employerQuestions,
      plan.argumentSteps,
      plan.escalationTriggers,
      plan.limitations,
      plan.citations,
    ]) expect(list.length).toBeGreaterThan(0);
    expect(plan.sourceRule.text).toContain("employee must make the request");
    expect(plan.thresholdElements.some((entry) => entry.text.includes("reasonably believes"))).toBe(true);
    expect(plan.argumentSteps.some((entry) => entry.text.includes("unknown case facts do not establish"))).toBe(true);
    expect(plan.privateCaseWarning).toBe(PUBLIC_ARGUMENT_PLAN_PRIVATE_WARNING);
    expect(plan.escalationTriggers.map((entry) => entry.text).join(" ")).toContain("local or designated union representative");
    expect(plan.escalationTriggers.map((entry) => entry.text).join(" ")).toContain("verified national contact-directory source is not included");
    expect(plan.limitations.map((entry) => entry.text).join(" ")).toContain("No CBA article is asserted");
    expect(plan.limitations.map((entry) => entry.text).join(" ")).toContain("does not replace local union advice or legal advice");
    expect(plan.stewardActions[0].citationIds.length).toBeGreaterThanOrEqual(2);
    expect(plan.stewardActions[1].citationIds.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(plan)).not.toMatch(/\b(?:202|203|204|205)[-. )]?\d{3}[-. ]?\d{4}\b/);
  });

  it("backs every substantive plan rule with citations verified against the current source", () => {
    const { plan } = verifiedPlan();
    const citedItems = [
      plan.sourceRule,
      ...plan.thresholdElements,
      ...plan.evidenceRequestPreparation!,
      ...plan.postInterviewFollowUp!,
      ...plan.memberActions,
      ...plan.stewardActions,
      ...plan.argumentSteps,
      ...plan.escalationTriggers,
      ...plan.limitations,
    ];
    const citationIds = new Set(plan.citations.map((citation) => citation.id));
    for (const entry of citedItems) {
      expect(entry.citationIds.length).toBeGreaterThan(0);
      expect(entry.citationIds.every((id) => citationIds.has(id))).toBe(true);
    }
    expect(plan.citations.every((citation) => verifyPublicCitation(citation, source).state === "verified_current")).toBe(true);
    expect(plan.sourceInstanceIds).toHaveLength(1);
  });

  it("renders the extended sections, private warning, citation navigation controls, and save action", () => {
    const { answer, plan } = verifiedPlan();
    const message = createAssistantMessage({
      threadId: "thread-argument-render",
      turnId: "turn-argument-render",
      parentMessageId: "message-user-render",
      answer,
      modeScopeDetail: { ...defaults, sourceMode: "nlrb", sourceModePolicy: "auto" },
      now: "2026-07-22T17:30:00.000Z",
    });
    const html = renderToStaticMarkup(React.createElement(AssistantMessageCard, {
      message,
      onRetry: () => undefined,
      onSave: () => undefined,
      canBuildArgument: true,
      argumentPlan: plan,
      onSaveArgumentPlan: () => undefined,
    }));
    for (const heading of [
      "1. Issue",
      "2. Governing public rule",
      "3. Conditions that must be present",
      "4. Facts to confirm",
      "5. Immediate member actions",
      "6. Steward actions",
      "7. Questions to ask management",
      "8. Step-by-step argument",
      "9. Escalation triggers",
      "10. Limitations and uncertainty",
      "11. Sources",
      "Evidence / RFI-request preparation categories",
      "Post-interview follow-up",
    ]) expect(html).toContain(heading);
    expect(html).toContain(PUBLIC_ARGUMENT_PLAN_PRIVATE_WARNING);
    expect(html).toContain(PUBLIC_ARGUMENT_PLAN_PREPARATION_WARNING);
    expect(html).toContain("Open supporting citation");
    expect(html).toContain("Save to Saved");
    expect(html).toContain("Save cited argument plan");
    expect(html).toContain("Saved type: public_argument_plan");
  });

  it("saves, deterministically deduplicates, migrates, and reopens a typed public argument plan", () => {
    const { answer, plan } = verifiedPlan();
    const first = createSavedArgumentPlanRecord({
      plan,
      question: answer.question,
      ...defaults,
      timestamp: "2026-07-22T17:31:00.000Z",
    });
    const duplicate = createSavedArgumentPlanRecord({
      plan: { ...plan, createdAt: "2026-07-22T17:32:00.000Z" },
      question: answer.question,
      ...defaults,
      timestamp: "2026-07-22T17:32:00.000Z",
    });
    const inserted = upsertSavedAnswer([], first);
    const deduped = upsertSavedAnswer(inserted.saved, duplicate);
    const normalAnswer = createSavedAnswerRecord({
      answer,
      ...defaults,
      timestamp: "2026-07-22T17:33:00.000Z",
    });
    const migrated = migrateSavedAnswers(deduped.saved);
    const html = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
      saved: migrated,
      onDelete: () => undefined,
    }));

    expect(first.savedType).toBe("public_argument_plan");
    expect(normalAnswer.savedType).toBe("answer");
    expect(normalAnswer.argumentPlan).toBeUndefined();
    expect(first.argumentPlan?.citations.every((citation) => citation.citationVerificationState === "verified_current")).toBe(true);
    expect(first.argumentPlan?.provider).toBe(plan.provider);
    expect(first.argumentPlan?.promptVersion).toBe(plan.promptVersion);
    expect(first.argumentPlan?.buildIdentity).toBe(plan.buildIdentity);
    expect(first.argumentPlan?.sourceInstanceIds).toEqual(plan.sourceInstanceIds);
    expect(deduped.status).toBe("duplicate");
    expect(deduped.saved).toHaveLength(1);
    expect(migrated[0].argumentPlan).toEqual(first.argumentPlan);
    expect(html).toContain("public_argument_plan");
    expect(html).toContain("Open saved plan");
  });
  it("includes preparation and follow-up in saved text with explicit scope limits", () => {
    const { answer, plan } = verifiedPlan();
    const text = publicArgumentPlanToText(plan);
    expect(plan.evidenceRequestPreparation).toHaveLength(5);
    expect(plan.postInterviewFollowUp).toHaveLength(4);
    expect(text).toContain(PUBLIC_ARGUMENT_PLAN_PREPARATION_WARNING);
    for (const entry of [...plan.evidenceRequestPreparation!, ...plan.postInterviewFollowUp!]) {
      expect(text).toContain(entry.text);
    }
    expect(text).toContain("this plan supplies neither a filing deadline nor a remedy determination");
    const saved = createSavedArgumentPlanRecord({ plan, question: answer.question, ...defaults, timestamp: "2026-09-13T17:00:00.000Z" });
    expect(migrateSavedAnswers([saved])[0].argumentPlan).toEqual(plan);
    expect(buildPublicArgumentPlan({ answer, source, createdAt: "different-time" })?.contentIdentity).toBe(plan.contentIdentity);
  });

  it("preserves historical saved plans without adding unreviewed extension content", () => {
    const { answer, plan } = verifiedPlan();
    delete plan.evidenceRequestPreparation;
    delete plan.postInterviewFollowUp;
    const saved = createSavedArgumentPlanRecord({ plan, question: answer.question, ...defaults, timestamp: "2026-09-13T17:00:00.000Z" });
    const reopened = migrateSavedAnswers([saved])[0].argumentPlan!;
    expect(reopened).toEqual(plan);
    expect(publicArgumentPlanToText(reopened)).not.toContain("Post-interview follow-up");
    expect(publicArgumentPlanToText(reopened)).not.toContain("undefined");
  });

  it.each([null, "bad", [], [{ text: "Bad reference", citationIds: ["missing"] }], [null]])(
    "rejects malformed saved extension content: %j", (invalid) => {
      const { answer, plan } = verifiedPlan();
      for (const field of ["evidenceRequestPreparation", "postInterviewFollowUp"]) {
        const saved = createSavedArgumentPlanRecord({ plan, question: answer.question, ...defaults, timestamp: "2026-09-13T17:00:00.000Z" });
        const malformed = { ...saved, argumentPlan: { ...plan, [field]: invalid } };
        expect(migrateSavedAnswers([malformed]).every((record) => record.argumentPlan === undefined)).toBe(true);
      }
    }
  );

});
