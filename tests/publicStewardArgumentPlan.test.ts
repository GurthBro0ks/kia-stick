import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCbaAnswer } from "@/lib/cbaAnswer";
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
  publicGrievanceOutlineEligibility,
} from "@/lib/publicGrievanceOutline";
import {
  PUBLIC_STEWARD_WORKFLOW_TOPICS,
  detectPublicStewardWorkflowTopic,
} from "@/lib/publicStewardWorkflowRegistry";
import {
  createSavedStewardArgumentPlanRecord,
  migrateSavedAnswers,
  savedRecordId,
  upsertSavedAnswer,
} from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const source = createCbaSourceFixtureCache();
const publicSource = createPublicSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20260731", gitSha: "bundle3plan" });
const operatorQaTopicMatrix = [
  ["annual_leave", "Build an argument plan about an annual leave scheduling dispute."],
  ["overtime", "Build an argument plan about an overtime distribution dispute."],
  ["holiday_scheduling", "Build an argument plan about holiday scheduling."],
  ["safety_health", "Build an argument plan about a workplace safety and health issue."],
  ["discipline_just_cause", "Build an argument plan about discipline and just cause."],
  ["sick_leave", "Build an argument plan about sick leave."],
  ["higher_level_assignments", "Build an argument plan about a higher-level assignment."],
  ["uniforms_work_clothes", "Build an argument plan about uniforms or work clothes."],
  ["employee_claims", "Build an argument plan about an employee personal-property claim."],
  ["steward_grievance_handling", "Build an argument plan about steward grievance handling."],
] as const;

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
  it.each(operatorQaTopicMatrix)(
    "routes and builds the exact operator-QA argument plan for %s",
    (topicId, question) => {
      expect(detectPublicStewardWorkflowTopic(question)).toBe(topicId);
      const answer = buildCbaAnswer({
        question,
        source,
        nlrbSource: publicSource,
        runtimeVersion,
        mode: "Strict Research",
        scope: "Official-Like",
        detail: "Detailed",
      });
      expect(answer).toMatchObject({
        noAnswer: false,
        publicSourceRole: "cba_contract",
      });
      expect(answer.citations.length).toBeGreaterThan(0);
      expect(answer.citations.every(
        (citation) => citation.citationVerificationState === "verified_current"
      )).toBe(true);
      expect(publicGrievanceOutlineEligibility({ answer, source })).toMatchObject({
        eligible: true,
        template: topicId,
      });

      const result = plan(topicId);
      expect(result.evidenceRequests.length).toBeGreaterThan(0);
      expect(result.evidenceRequests.every((entry) =>
        entry.document.length > 0 &&
        entry.requestFrom.length > 0 &&
        entry.whyItMatters.length > 0 &&
        entry.citationIds.length > 0
      )).toBe(true);
      expect(publicStewardArgumentPlanExportEligibility(result, source)).toEqual({ eligible: true });
      expect(result.privateCaseWarning).toBe(PUBLIC_STEWARD_ARGUMENT_PLAN_PRIVATE_WARNING);
      expect(JSON.stringify(result)).not.toMatch(
        /employeeName|memberName|grievanceNumber|caseNumber|medicalDiagnosis/i
      );
    }
  );

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

  it("uses deterministic item-specific evidence rationales in saved and exported plans", () => {
    const annual = plan("annual_leave");
    const safety = plan("safety_health");
    const claims = plan("employee_claims");
    const oldGlobalRationale =
      "Use this case-neutral category to compare confirmed facts with the verified public contract language. Its existence, custody, and contents are not assumed.";

    expect(new Set(annual.evidenceRequests.map((entry) => entry.whyItMatters)).size).toBeGreaterThan(1);
    expect(new Set([
      ...annual.evidenceRequests,
      ...safety.evidenceRequests,
      ...claims.evidenceRequests,
    ].map((entry) => entry.whyItMatters)).size).toBeGreaterThan(3);
    expect(safety.evidenceRequests.map((entry) => entry.whyItMatters).join(" ")).toMatch(/hazard|inspection|corrective/i);
    expect(claims.evidenceRequests.map((entry) => entry.whyItMatters).join(" ")).toMatch(/claim|property|determination/i);

    for (const entry of [...annual.evidenceRequests, ...safety.evidenceRequests, ...claims.evidenceRequests]) {
      expect(entry.whyItMatters).not.toBe("");
      expect(entry.whyItMatters).not.toBe(oldGlobalRationale);
      expect(entry.whyItMatters).not.toMatch(/\b(?:document|record) exists\b|\bproves? (?:a )?violation\b/i);
    }

    const text = publicStewardArgumentPlanToText(annual);
    const markdown = publicStewardArgumentPlanToMarkdown(annual);
    for (const entry of annual.evidenceRequests) {
      expect(text).toContain(entry.whyItMatters);
      expect(markdown).toContain(entry.whyItMatters);
    }
    const repeated = plan("annual_leave");
    expect(repeated.evidenceRequests).toEqual(annual.evidenceRequests);

    const reopened = migrateSavedAnswers([createSavedStewardArgumentPlanRecord({
      plan: annual,
      timestamp: "2026-08-02T16:15:00.000Z",
    })])[0].stewardArgumentPlan;
    expect(reopened?.evidenceRequests).toEqual(annual.evidenceRequests);
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
