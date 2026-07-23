import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SavedAnswersPanel } from "@/components/KiaStickApp";
import { buildPublicArgumentPlan } from "@/lib/publicArgumentPlan";
import { buildPublicSourceAnswer } from "@/lib/publicSourceAnswer";
import {
  createSavedAnswerRecord,
  createSavedArgumentPlanRecord,
  migrateSavedAnswers,
  savedAnswerKey,
  savedRecordId,
  upsertSavedAnswer,
  type SavedAnswer,
} from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const source = createPublicSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20260722", gitSha: "savedidentity" });
const defaults = {
  mode: "Strict Research" as const,
  scope: "Official-Like" as const,
  detail: "Detailed" as const,
};
const question = "Can I have a steward during an investigative interview?";

function savedPair() {
  const answer = buildPublicSourceAnswer({ question, source, runtimeVersion, ...defaults });
  const plan = buildPublicArgumentPlan({
    answer,
    source,
    createdAt: "2026-07-22T17:30:00.000Z",
  });
  expect(plan).not.toBeNull();
  const answerRecord = createSavedAnswerRecord({
    answer,
    ...defaults,
    timestamp: "2026-07-22T17:31:00.000Z",
  });
  const planRecord = createSavedArgumentPlanRecord({
    plan: plan!,
    question,
    ...defaults,
    timestamp: "2026-07-22T17:32:00.000Z",
  });
  return { answer, plan: plan!, answerRecord, planRecord };
}

function byType(saved: SavedAnswer[], savedType: SavedAnswer["savedType"]): SavedAnswer {
  const record = saved.find((item) => item.savedType === savedType);
  expect(record).toBeDefined();
  return record!;
}

describe("Saved persistent record identity", () => {
  it("separates answer and plan record IDs while keeping type-aware content deduplication", () => {
    const { answerRecord, planRecord, plan } = savedPair();

    expect(answerRecord.id).toBe(savedRecordId("answer", answerRecord.saveKey));
    expect(planRecord.id).toBe(savedRecordId("public_argument_plan", planRecord.saveKey));
    expect(answerRecord.id).toMatch(/^saved-answer-[a-f0-9]{64}$/);
    expect(planRecord.id).toMatch(/^saved-public-argument-plan-[a-f0-9]{64}$/);
    expect(answerRecord.id).not.toBe(planRecord.id);
    expect(answerRecord.saveKey).not.toBe(planRecord.saveKey);
    expect(answerRecord.savedType).toBe("answer");
    expect(planRecord.savedType).toBe("public_argument_plan");

    const answerInserted = upsertSavedAnswer([], answerRecord);
    const bothInserted = upsertSavedAnswer(answerInserted.saved, planRecord);
    const answerDuplicate = upsertSavedAnswer(bothInserted.saved, {
      ...answerRecord,
      timestamp: "2026-07-22T17:33:00.000Z",
    });
    const planDuplicate = upsertSavedAnswer(answerDuplicate.saved, {
      ...planRecord,
      timestamp: "2026-07-22T17:34:00.000Z",
      argumentPlan: { ...plan, createdAt: "2026-07-22T17:34:00.000Z" },
    });

    expect(bothInserted.status).toBe("created");
    expect(bothInserted.saved).toHaveLength(2);
    expect(answerDuplicate.status).toBe("duplicate");
    expect(planDuplicate.status).toBe("duplicate");
    expect(planDuplicate.saved).toHaveLength(2);
    expect(new Set(planDuplicate.saved.map((item) => item.id)).size).toBe(2);
  });

  it("normalizes a legacy cross-type collision deterministically and idempotently without data loss", () => {
    const { answer, answerRecord, planRecord } = savedPair();
    const legacy = [
      {
        ...answerRecord,
        id: "saved-fwe39g",
        saveKey: savedAnswerKey(answer, defaults.mode, defaults.scope),
      },
      { ...planRecord, id: "saved-fwe39g" },
    ];

    const migrated = migrateSavedAnswers(legacy);
    const migratedAgain = migrateSavedAnswers(structuredClone(migrated));
    const migratedAnswer = byType(migrated, "answer");
    const migratedPlan = byType(migrated, "public_argument_plan");

    expect(migrated).toHaveLength(2);
    expect(migratedAgain).toEqual(migrated);
    expect(new Set(migrated.map((item) => item.id)).size).toBe(2);
    expect(migratedAnswer.id).toBe(answerRecord.id);
    expect(migratedPlan.id).toBe(planRecord.id);
    expect(migratedAnswer.answer).toBe(answerRecord.answer);
    expect(migratedAnswer.citations).toEqual(answerRecord.citations);
    expect(migratedAnswer.provider).toBe(answerRecord.provider);
    expect(migratedAnswer.version).toEqual(answerRecord.version);
    expect(migratedPlan.argumentPlan).toEqual(planRecord.argumentPlan);
    expect(migratedPlan.argumentPlan?.citations).toHaveLength(planRecord.argumentPlan!.citations.length);
    expect(migratedPlan.argumentPlan?.thresholdElements).toHaveLength(4);
    expect(migratedPlan.argumentPlan?.argumentSteps).toHaveLength(5);
  });

  it("collapses exact same-type duplicates and keeps cross-type deletion isolated", () => {
    const { answerRecord, planRecord } = savedPair();
    const migrated = migrateSavedAnswers([
      { ...answerRecord, id: "saved-fwe39g" },
      {
        ...answerRecord,
        id: "another-legacy-answer-id",
        timestamp: "2026-07-22T17:35:00.000Z",
      },
      { ...planRecord, id: "saved-fwe39g" },
    ]);

    expect(migrated).toHaveLength(2);
    expect(migrated.filter((item) => item.savedType === "answer")).toHaveLength(1);
    expect(byType(migrated, "answer").timestamp).toBe("2026-07-22T17:35:00.000Z");

    const answerId = byType(migrated, "answer").id;
    const afterAnswerDelete = migrated.filter((item) => item.id !== answerId);
    expect(afterAnswerDelete).toHaveLength(1);
    expect(afterAnswerDelete[0].savedType).toBe("public_argument_plan");
    expect(afterAnswerDelete[0].argumentPlan).toEqual(planRecord.argumentPlan);
  });

  it("renders both normalized records with unique persistent keys and no duplicate-key warning", () => {
    const { answerRecord, planRecord } = savedPair();
    const migrated = migrateSavedAnswers([
      { ...answerRecord, id: "saved-fwe39g" },
      { ...planRecord, id: "saved-fwe39g" },
    ]);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const html = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
        saved: migrated,
        onDelete: () => undefined,
      }));

      expect(html).toContain("<dd>answer</dd>");
      expect(html).toContain("public_argument_plan");
      expect(html).toContain("Open saved plan");
      expect(new Set(migrated.map((item) => item.id)).size).toBe(migrated.length);
      expect(consoleError.mock.calls.flat().join(" ")).not.toContain("same key");
    } finally {
      consoleError.mockRestore();
    }
  });
});
