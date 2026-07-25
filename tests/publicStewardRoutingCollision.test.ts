import { describe, expect, it } from "vitest";
import { buildCbaAnswer } from "@/lib/cbaAnswer";
import {
  createChatSubmitSnapshot,
  resolveChatAnswerLane,
  routeChatQuestion,
} from "@/lib/chatAnswerRouter";
import {
  buildPublicGrievanceOutline,
  publicGrievanceOutlineToText,
} from "@/lib/publicGrievanceOutline";
import {
  PUBLIC_STEWARD_RESEARCH_CANDIDATES,
  PUBLIC_STEWARD_WORKFLOW_TOPICS,
  detectPublicStewardWorkflowTopic,
  publicStewardWorkflowMatch,
} from "@/lib/publicStewardWorkflowRegistry";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const source = createCbaSourceFixtureCache();
const publicSource = createPublicSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({
  buildDate: "20260725",
  gitSha: "routingmatrix",
});
const defaults = {
  mode: "Strict Research" as const,
  scope: "Official-Like" as const,
  detail: "Detailed" as const,
};

const routingMatrix = [
  ["annual_leave", "How is annual leave scheduling administered?"],
  ["overtime", "Was someone bypassed for overtime?"],
  ["holiday_scheduling", "When must the holiday schedule be posted?"],
  ["safety_health", "What process applies to an unsafe working condition?"],
  ["discipline_just_cause", "Does Article 16 require just cause for discipline?"],
  ["sick_leave", "Can a supervisor accept certification for a short sick leave absence?"],
  ["higher_level_assignments", "Was a written order required for this higher-level detail?"],
  ["uniforms_work_clothes", "How is work clothing allowance eligibility administered?"],
  ["employee_claims", "What is the Article 27 process for personal property damage?"],
  ["steward_grievance_handling", "May a steward review records while investigating a grievance?"],
] as const;

describe("public steward deterministic routing collision matrix", () => {
  it.each(routingMatrix)("routes the supported alias %s without a collision", (topicId, question) => {
    const match = publicStewardWorkflowMatch(question);
    expect(match).toMatchObject({
      topicId,
      matchedTopicIds: [topicId],
      ambiguous: false,
      unsupportedCandidateId: null,
    });
    expect(detectPublicStewardWorkflowTopic(question)).toBe(topicId);
    expect(resolveChatAnswerLane(question, "auto")).toBe("cba");
  });

  it.each([
    ["annual_leave", "I need FMLA or sick leave advice for an annual leave request."],
    ["overtime", "How does FMLA affect overtime and medical restrictions?"],
    ["holiday_scheduling", "Can I schedule a holiday party?"],
    ["safety_health", "Can you give a medical diagnosis for this safety concern?"],
    ["discipline_just_cause", "Give me criminal legal representation for discipline."],
    ["sick_leave", "Diagnose my medical treatment need for sick leave."],
    ["higher_level_assignments", "Calculate the amount owed for a permanent promotion."],
    ["uniforms_work_clothes", "How much money should I spend costume shopping?"],
    ["employee_claims", "Calculate my car claim dollar amount."],
    ["steward_grievance_handling", "What are my Weingarten rights in an investigatory interview?"],
  ] as const)("honors the negative guard for %s", (topicId, question) => {
    expect(publicStewardWorkflowMatch(question).matchedTopicIds).not.toContain(topicId);
    expect(detectPublicStewardWorkflowTopic(question)).not.toBe(topicId);
  });

  it("fails an overlapping supported-topic question closed with no builder or Saved-eligible answer", () => {
    const question = "How do holiday scheduling and an unsafe condition interact under the CBA?";
    const match = publicStewardWorkflowMatch(question);
    expect(match.ambiguous).toBe(true);
    expect(match.matchedTopicIds).toEqual(["holiday_scheduling", "safety_health"]);
    expect(detectPublicStewardWorkflowTopic(question)).toBeNull();
    const answer = buildCbaAnswer({
      question,
      source,
      nlrbSource: publicSource,
      runtimeVersion,
      ...defaults,
    });
    expect(answer.publicSourceRole).toBe("safe_no_answer");
    expect(answer.noAnswer).toBe(true);
    expect(answer.citations).toEqual([]);
    expect(buildPublicGrievanceOutline({ answer, source })).toBeNull();
  });

  it.each(
    PUBLIC_STEWARD_RESEARCH_CANDIDATES
      .filter((candidate) => candidate.id !== "grievance_procedure_timeliness")
      .map((candidate) => [candidate.id, {
        seniority_assignment_administration: "How does seniority control a bid assignment reassignment under the CBA?",
        hours_work_scheduling: "How is a work schedule change notice administered under the CBA?",
        craft_jurisdiction: "What does the CBA say about cross-craft jurisdiction?",
        training_qualification: "How does qualification training affect a bid assignment under the CBA?",
      }[candidate.id]!] as const)
  )("keeps research-only candidate %s in a safe no-answer workflow state", (candidateId, question) => {
    const answer = buildCbaAnswer({
      question,
      source,
      nlrbSource: publicSource,
      runtimeVersion,
      ...defaults,
    });
    expect(publicStewardWorkflowMatch(question).unsupportedCandidateId).toBe(candidateId);
    expect(answer.publicSourceRole).toBe("safe_no_answer");
    expect(answer.noAnswer).toBe(true);
    expect(answer.citations).toEqual([]);
    expect(buildPublicGrievanceOutline({ answer, source })).toBeNull();
  });

  it("preserves automatic CBA priority, explicit fake isolation, NLRB isolation, missing-source behavior, and general CBA retrieval", () => {
    expect(resolveChatAnswerLane("How is sick leave certification administered?", "auto")).toBe("cba");
    expect(resolveChatAnswerLane("How is sick leave certification administered?", "fake")).toBe("fake");
    expect(resolveChatAnswerLane("What are my Weingarten rights?", "auto")).toBe("nlrb");
    expect(resolveChatAnswerLane("What does Article 23 say?", "auto")).toBe("cba");

    const missingQuestion = "What does the CBA require for a higher-level assignment?";
    const missingSnapshot = createChatSubmitSnapshot({
      question: missingQuestion,
      sourcePolicy: "auto",
      ...defaults,
    });
    const missing = routeChatQuestion({
      question: missingQuestion,
      snapshot: missingSnapshot,
      publicSource,
      cbaSource: null,
      runtimeVersion,
    });
    expect(missing.noAnswer).toBe(true);
    expect(missing.publicSourceRole).toBe("cba_contract");
    expect(missing.citations).toEqual([]);

    const general = buildCbaAnswer({
      question: "What does Article 23 say?",
      source,
      nlrbSource: publicSource,
      runtimeVersion,
      ...defaults,
    });
    expect(general.publicSourceRole).toBe("cba_contract");
    expect(general.noAnswer).toBe(false);
    expect(general.citations.every((citation) => citation.articleNumber === "23")).toBe(true);
  });

  it("keeps generated registry copy grammatical, punctuated, article-matched, and free of visible internal IDs", () => {
    for (const topic of PUBLIC_STEWARD_WORKFLOW_TOPICS) {
      const answer = buildCbaAnswer({
        question: topic.exampleQuestion,
        source,
        nlrbSource: publicSource,
        runtimeVersion,
        ...defaults,
      });
      const outline = buildPublicGrievanceOutline({
        answer,
        source,
        createdAt: "2026-07-25T16:00:00.000Z",
      });
      expect(outline, topic.id).not.toBeNull();
      const text = publicGrievanceOutlineToText(outline!);
      const userCopy = [
        outline!.title,
        outline!.issue,
        ...outline!.governingContractLanguage.map((entry) => entry.text),
        ...outline!.factsToConfirm,
        ...outline!.questionsForManagement,
        ...outline!.limitations.map((entry) => entry.text),
      ].join(" ");
      expect(text, topic.id).not.toMatch(/\b(\w+)\s+\1\b/i);
      if (topic.id.includes("_")) expect(userCopy, topic.id).not.toContain(topic.id);
      expect(outline!.governingContractLanguage.every(
        (entry) => entry.text.includes(`Article ${topic.sourceSufficiency.primaryArticle}`)
      ), topic.id).toBe(true);
      expect(outline!.questionsForManagement.every(
        (question) => /[?]$/.test(question)
      ), topic.id).toBe(true);
      expect([
        ...outline!.factsToConfirm,
        ...outline!.governingContractLanguage.map((entry) => entry.text),
        ...outline!.limitations.map((entry) => entry.text),
      ].every((entry) => /[.!?]$/.test(entry)), topic.id).toBe(true);
    }
  });
});
