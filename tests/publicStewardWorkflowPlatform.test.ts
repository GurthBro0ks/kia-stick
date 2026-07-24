import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  normalizeSavedTopicFilter,
  SourcesPanel,
  SavedAnswersPanel,
} from "@/components/KiaStickApp";
import { buildCbaAnswer, detectCbaIntent } from "@/lib/cbaAnswer";
import {
  createChatSubmitSnapshot,
  resolveChatAnswerLane,
  routeChatQuestion,
} from "@/lib/chatAnswerRouter";
import {
  buildPublicGrievanceOutline,
  PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING,
  publicGrievanceOutlineEligibility,
  publicGrievanceOutlineExportEligibility,
  publicGrievanceOutlineToMarkdown,
  publicGrievanceOutlineToText,
} from "@/lib/publicGrievanceOutline";
import {
  PUBLIC_STEWARD_WORKFLOW_TOPICS,
  detectPublicStewardWorkflowTopic,
} from "@/lib/publicStewardWorkflowRegistry";
import {
  createSavedAnswerRecord,
  createSavedGrievanceOutlineRecord,
  migrateSavedAnswers,
  upsertSavedAnswer,
} from "@/lib/savedAnswers";
import { buildSourceHierarchyGroups } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const cbaSource = createCbaSourceFixtureCache();
const nlrbSource = createPublicSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({
  buildDate: "20260724",
  gitSha: "workflowbundle",
});
const defaults = {
  mode: "Strict Research" as const,
  scope: "Official-Like" as const,
  detail: "Detailed" as const,
};

function answerFor(question: string) {
  return buildCbaAnswer({
    question,
    source: cbaSource,
    nlrbSource,
    runtimeVersion,
    ...defaults,
  });
}

function outlineFor(question: string) {
  const answer = answerFor(question);
  const outline = buildPublicGrievanceOutline({
    answer,
    source: cbaSource,
    createdAt: "2026-07-24T16:00:00.000Z",
  });
  expect(answer.noAnswer).toBe(false);
  expect(outline).not.toBeNull();
  return { answer, outline: outline! };
}

describe("public steward workflow platform registry", () => {
  it("has five deterministic, unique, source-supported topic and template identities", () => {
    expect(PUBLIC_STEWARD_WORKFLOW_TOPICS).toHaveLength(5);
    expect(new Set(PUBLIC_STEWARD_WORKFLOW_TOPICS.map((topic) => topic.id))).toHaveLength(5);
    expect(new Set(PUBLIC_STEWARD_WORKFLOW_TOPICS.map((topic) => topic.templateId))).toHaveLength(5);
    expect(PUBLIC_STEWARD_WORKFLOW_TOPICS.map((topic) => topic.id)).toEqual([
      "annual_leave",
      "overtime",
      "holiday_scheduling",
      "safety_health",
      "discipline_just_cause",
    ]);
    for (const topic of PUBLIC_STEWARD_WORKFLOW_TOPICS) {
      expect(topic.requiredSourceId).toBe("apwu-usps-cba-2024-2027");
      expect(topic.sourceSufficiency.status).toBe("supported");
      expect(topic.requiredArticles).toContain("15");
      expect(topic.citationSpecs.length).toBeGreaterThanOrEqual(3);
      expect(topic.unsupportedScope.length).toBeGreaterThan(20);
      expect(topic.localVerification.length).toBeGreaterThan(20);
    }
  });

  it.each(
    PUBLIC_STEWARD_WORKFLOW_TOPICS.map((topic) => [
      topic.id,
      topic.exampleQuestion,
      topic.sourceSufficiency.primaryArticle,
    ] as const)
  )("routes, verifies, and generates the shared twelve-section model for %s", (topicId, question, article) => {
    expect(detectPublicStewardWorkflowTopic(question)).toBe(topicId);
    expect(detectCbaIntent(question)).toBe(topicId);
    expect(resolveChatAnswerLane(question, "auto")).toBe("cba");
    const { answer, outline } = outlineFor(question);
    expect(answer.citations.every((citation) => citation.articleNumber === article)).toBe(true);
    expect(publicGrievanceOutlineEligibility({ answer, source: cbaSource })).toMatchObject({
      eligible: true,
      template: topicId,
    });
    expect(outline.template).toBe(topicId);
    expect(outline.templateId).toBe(`public-grievance-outline.${topicId}.v1`);
    expect(outline.privateCaseWarning).toBe(PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING);
    expect(outline.governingContractLanguage.length).toBeGreaterThan(0);
    expect(outline.elementsToEstablish.length).toBeGreaterThan(0);
    expect(outline.factsToConfirm.length).toBeGreaterThan(0);
    expect(outline.evidenceToRequest.length).toBeGreaterThan(0);
    expect(outline.questionsForManagement.length).toBeGreaterThan(0);
    expect(outline.stepOneArgument.length).toBeGreaterThan(0);
    expect(outline.possibleRemedies.length).toBeGreaterThan(0);
    expect(outline.timelinessAndProcedureLimits.length).toBeGreaterThan(0);
    expect(outline.escalationReadiness.length).toBeGreaterThan(0);
    expect(outline.limitations.length).toBeGreaterThan(0);
    expect(outline.citations.length).toBeGreaterThanOrEqual(7);
    expect(outline.citations.every((citation) => citation.citationVerificationState === "verified_current")).toBe(true);
    for (const section of [
      outline.governingContractLanguage,
      outline.elementsToEstablish,
      outline.evidenceToRequest,
      outline.stepOneArgument,
      outline.possibleRemedies,
      outline.timelinessAndProcedureLimits,
      outline.escalationReadiness,
      outline.limitations,
    ]) {
      expect(section.every((entry) => entry.citationIds.length > 0)).toBe(true);
    }
  });

  it.each([
    "Tell me about workplace culture",
    "What is my schedule?",
    "Can I have a holiday party?",
    "I need medical diagnosis advice",
    "Tell me about discipline in sports",
    "Which list applies?",
  ])("does not overroute ambiguous or guarded wording: %s", (question) => {
    expect(detectPublicStewardWorkflowTopic(question)).toBeNull();
  });

  it("preserves CBA, NLRB, explicit fake, missing-cache, and safe-no-answer boundaries", () => {
    expect(resolveChatAnswerLane("What does the CBA require for discipline and just cause?", "auto")).toBe("cba");
    expect(resolveChatAnswerLane("What are my Weingarten rights?", "auto")).toBe("nlrb");
    expect(resolveChatAnswerLane("What does the fake leave sample say?", "fake")).toBe("fake");
    expect(resolveChatAnswerLane("Tell me about llamas", "auto")).toBe("safe_no_answer");

    const question = "What CBA process applies to an unsafe working condition?";
    const snapshot = createChatSubmitSnapshot({ question, sourcePolicy: "auto", ...defaults });
    const missing = routeChatQuestion({
      question,
      snapshot,
      publicSource: nlrbSource,
      cbaSource: null,
      runtimeVersion,
    });
    expect(missing.publicSourceRole).toBe("cba_contract");
    expect(missing.noAnswer).toBe(true);
    expect(missing.citations).toEqual([]);
    expect(buildPublicGrievanceOutline({ answer: missing, source: null })).toBeNull();
  });
});

describe("public steward workflow exports, persistence, and discovery", () => {
  it("resets a topic filter whose last saved record was deleted", () => {
    expect(normalizeSavedTopicFilter("Holiday scheduling", [
      "Annual leave",
      "Overtime",
    ])).toBe("all");
    expect(normalizeSavedTopicFilter("Overtime", [
      "Annual leave",
      "Overtime",
    ])).toBe("Overtime");
    expect(normalizeSavedTopicFilter("all", [])).toBe("all");
  });

  it("exports only a verified-current outline with identity, twelve sections, citations, and warnings", () => {
    const { outline } = outlineFor(
      "How does the CBA govern holiday scheduling and who may be required to work?"
    );
    expect(publicGrievanceOutlineExportEligibility(outline, cbaSource)).toEqual({
      eligible: true,
    });
    const text = publicGrievanceOutlineToText(outline);
    const markdown = publicGrievanceOutlineToMarkdown(outline);
    for (let section = 1; section <= 12; section += 1) {
      expect(text).toContain(`${section}.`);
      expect(markdown).toContain(`## ${section}.`);
    }
    expect(text).toContain("Generated build:");
    expect(text).toContain("Source instance:");
    expect(markdown).toContain(PUBLIC_GRIEVANCE_OUTLINE_PRIVATE_WARNING);
    expect(markdown).toContain("No predetermined violation, remedy, monetary calculation, or legal advice.");
    expect(markdown).not.toMatch(/localStorage|cookie|proof_|\/home\/|process\.env|private path/i);

    const stale = structuredClone(outline);
    stale.citations[0].citationAnchorSha256 = "0".repeat(64);
    expect(publicGrievanceOutlineExportEligibility(stale, cbaSource)).toMatchObject({
      eligible: false,
    });
  });

  it("keeps answers and every outline topic distinct through save, dedupe, migration, and delete", () => {
    const ordinary = answerFor("What does Article 17 say about representation?");
    const answerRecord = createSavedAnswerRecord({
      answer: ordinary,
      timestamp: "2026-07-24T16:00:00.000Z",
      ...defaults,
    });
    const outlineRecords = PUBLIC_STEWARD_WORKFLOW_TOPICS.map((topic, index) => {
      const { outline } = outlineFor(topic.exampleQuestion);
      return createSavedGrievanceOutlineRecord({
        outline,
        question: topic.exampleQuestion,
        timestamp: `2026-07-24T16:0${index + 1}:00.000Z`,
        ...defaults,
      });
    });
    expect(new Set(outlineRecords.map((record) => record.id))).toHaveLength(5);
    expect(outlineRecords.every((record) => record.saveKey.includes(record.grievanceOutlineTemplate!))).toBe(true);

    let saved = upsertSavedAnswer([], answerRecord).saved;
    for (const record of outlineRecords) saved = upsertSavedAnswer(saved, record).saved;
    expect(saved).toHaveLength(6);
    const duplicate = upsertSavedAnswer(saved, structuredClone(outlineRecords[0]));
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.saved).toHaveLength(6);
    const migrated = migrateSavedAnswers(structuredClone(duplicate.saved));
    expect(migrateSavedAnswers(structuredClone(migrated))).toEqual(migrated);
    const afterDelete = migrated.filter((record) => record.id !== outlineRecords[2].id);
    expect(afterDelete).toHaveLength(5);
    expect(afterDelete.some((record) => record.id === answerRecord.id)).toBe(true);
    expect(afterDelete.some((record) => record.id === outlineRecords[3].id)).toBe(true);

    const html = renderToStaticMarkup(
      React.createElement(SavedAnswersPanel, {
        saved: migrated,
        onDelete: () => undefined,
        cbaSourceState: { status: "available", source: cbaSource },
      })
    );
    expect(html).toContain("Filter Saved by type");
    expect(html).toContain("Filter Saved by topic");
    expect(html).toContain("Grievance Outline");
    expect(html).toContain("verified_current");
  });

  it("renders one registry-derived compact catalog with all supported topics", () => {
    const html = renderToStaticMarkup(
      React.createElement(SourcesPanel, {
        cbaSourceState: { status: "available", source: cbaSource },
        publicSourceState: { status: "available", source: nlrbSource },
        sourceHierarchyGroups: buildSourceHierarchyGroups(),
        onAskCbaQuestion: () => undefined,
        runtimeVersion,
      })
    );
    expect(html).toContain("Supported public workflows");
    expect(html).toContain("5 bounded CBA topics");
    for (const topic of PUBLIC_STEWARD_WORKFLOW_TOPICS) {
      expect(html).toContain(topic.displayName);
      expect(html).toContain(topic.shortDescription);
    }
    expect(html).toContain("Other grievance topics require additional verified sources or local review.");
  });
});
