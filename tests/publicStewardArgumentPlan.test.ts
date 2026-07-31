import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildPublicStewardArgumentPlan,
  PUBLIC_STEWARD_ARGUMENT_PLAN_PRIVATE_WARNING,
  PUBLIC_STEWARD_ARGUMENT_PLAN_SAVED_TYPE,
  publicStewardArgumentPlanExportEligibility,
  publicStewardArgumentPlanToMarkdown,
  publicStewardArgumentPlanToText,
} from "@/lib/publicStewardArgumentPlan";
import {
  PUBLIC_STEWARD_CONTACT_DIRECTORY_WARNING,
} from "@/lib/publicGrievanceOutline";
import { PUBLIC_STEWARD_WORKFLOW_TOPICS } from "@/lib/publicStewardWorkflowRegistry";
import {
  createSavedStewardArgumentPlanRecord,
  migrateSavedAnswers,
  savedRecordId,
  upsertSavedAnswer,
} from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";

const source = createCbaSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20260731", gitSha: "bundle3plan" });

function plan(topicId: (typeof PUBLIC_STEWARD_WORKFLOW_TOPICS)[number]["id"]) {
  const result = buildPublicStewardArgumentPlan({
    source,
    topicId,
    runtimeVersion,
    createdAt: "2026-07-31T16:40:35.000Z",
  });
  expect(result).not.toBeNull();
  return result!;
}

describe("Bundle 3 topic-grounded public steward argument plans", () => {
  it.each(PUBLIC_STEWARD_WORKFLOW_TOPICS.map((topic) => [topic.id, topic.displayName] as const))(
    "builds a verified-current structured plan for %s",
    (topicId, displayName) => {
      const result = plan(topicId);
      expect(result.savedType).toBe(PUBLIC_STEWARD_ARGUMENT_PLAN_SAVED_TYPE);
      expect(result.topic).toBe(displayName);
      expect(result.argumentSteps).toHaveLength(7);
      expect(result.evidenceRequests.length).toBeGreaterThan(0);
      expect(result.evidenceRequests.every((entry) =>
        entry.document.length > 0 &&
        entry.requestFrom.length > 0 &&
        entry.whyItMatters.length > 0 &&
        entry.citationIds.length > 0
      )).toBe(true);
      expect(result.citations.every(
        (citation) => citation.citationVerificationState === "verified_current"
      )).toBe(true);
      expect(result.escalationReadiness.map((entry) => entry.text)).toContain(
        PUBLIC_STEWARD_CONTACT_DIRECTORY_WARNING
      );
      expect(result.privateCaseWarning).toBe(PUBLIC_STEWARD_ARGUMENT_PLAN_PRIVATE_WARNING);
      expect(publicStewardArgumentPlanExportEligibility(result, source)).toEqual({ eligible: true });
    }
  );

  it("fails closed when the source is unavailable or a citation anchor drifts", () => {
    const current = plan("annual_leave");
    expect(buildPublicStewardArgumentPlan({
      source: null,
      topicId: "annual_leave",
      runtimeVersion,
    })).toBeNull();
    expect(publicStewardArgumentPlanExportEligibility(current, null)).toMatchObject({ eligible: false });

    const stale = structuredClone(current);
    stale.citations[0].citationAnchorSha256 = "0".repeat(64);
    expect(publicStewardArgumentPlanExportEligibility(stale, source)).toMatchObject({ eligible: false });
  });

  it("keeps topic-plan Saved identity, dedupe, reopen, and migration type-aware", () => {
    const current = plan("employee_claims");
    const record = createSavedStewardArgumentPlanRecord({
      plan: current,
      timestamp: "2026-07-31T16:41:00.000Z",
    });
    expect(record.id).toBe(savedRecordId(PUBLIC_STEWARD_ARGUMENT_PLAN_SAVED_TYPE, record.saveKey));
    expect(record.id).toMatch(/^saved-public-steward-argument-plan-[a-f0-9]{64}$/);
    expect(record.stewardArgumentPlanTopicId).toBe("employee_claims");

    const created = upsertSavedAnswer([], record);
    const duplicate = upsertSavedAnswer(created.saved, {
      ...record,
      timestamp: "2026-07-31T16:42:00.000Z",
    });
    expect(created.status).toBe("created");
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.saved).toHaveLength(1);

    const migrated = migrateSavedAnswers(structuredClone(duplicate.saved));
    expect(migrated).toHaveLength(1);
    expect(migrated[0].savedType).toBe(PUBLIC_STEWARD_ARGUMENT_PLAN_SAVED_TYPE);
    expect(migrated[0].stewardArgumentPlan).toEqual(current);
    expect(migrateSavedAnswers(structuredClone(migrated))).toEqual(migrated);
  });

  it("exports structured evidence and preserves the public/private safety boundary", () => {
    const current = plan("steward_grievance_handling");
    const text = publicStewardArgumentPlanToText(current);
    const markdown = publicStewardArgumentPlanToMarkdown(current);
    for (const heading of [
      "Structured evidence or record requests",
      "Step-by-step argument",
      "Procedure and timing cautions",
      "Escalation readiness",
      "Limitations and unsupported scope",
    ]) {
      expect(text).toContain(heading);
      expect(markdown).toContain(heading);
    }
    expect(text).toContain("Request from:");
    expect(markdown).toContain("**Why it matters:**");
    expect(text).toContain(PUBLIC_STEWARD_CONTACT_DIRECTORY_WARNING);
    expect(markdown).not.toMatch(/localStorage|cookie|proof_|\/home\/|process\.env|private path/i);
    expect(markdown).not.toMatch(/\b(member name|employee id|medical diagnosis|grievance file)\b/i);
  });

  it("uses the shared routed topic and native print architecture without adding a routing chain", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const styles = readFileSync("app/globals.css", "utf8");
    const registry = readFileSync("lib/publicStewardWorkflowRegistry.ts", "utf8");
    expect(component).toContain("Build topic argument plan");
    expect(component).toContain("Print verified outline");
    expect(component).toContain("Print verified packet");
    expect(component).toContain("window.print()");
    expect(styles).toContain("@media print");
    expect(styles).toContain(".publicPrintTarget");
    expect(registry).not.toContain("argumentPlanPositive");
    expect(registry).not.toContain("argumentPlanNegative");
  });
});
