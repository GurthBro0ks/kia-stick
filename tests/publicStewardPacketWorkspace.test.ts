import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  addChatTopicToPacketSelection,
  PUBLIC_STEWARD_PACKET_TOPIC_LIMIT_NOTICE,
  SavedAnswersPanel,
  SourcesPanel,
} from "@/components/KiaStickApp";
import {
  buildPublicStewardPacket,
  PUBLIC_STEWARD_PACKET_PRIVATE_WARNING,
  defaultPublicStewardPacketSteps,
  publicStewardPacketExportEligibility,
  publicStewardPacketWithStepCompletion,
  publicStewardPacketToMarkdown,
  publicStewardPacketToText,
} from "@/lib/publicStewardPacket";
import {
  PUBLIC_STEWARD_RESEARCH_CANDIDATES,
  PUBLIC_STEWARD_WORKFLOW_TOPICS,
} from "@/lib/publicStewardWorkflowRegistry";
import {
  createSavedStewardPacketRecord,
  migrateSavedAnswers,
  upsertSavedAnswer,
} from "@/lib/savedAnswers";
import { buildSourceHierarchyGroups } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const cbaSource = createCbaSourceFixtureCache();
const publicSource = createPublicSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({
  buildDate: "20260725",
  gitSha: "bundle2packet",
});
const employeeClaimsIssue =
  "Whether verified Article 27 language may support a grievance concerning an employee’s personal-property claim, its handling, or its determination after coverage, the actual event, management's stated basis, and separately verified local rules are confirmed.";
const malformedEmployeeArticlePattern = new RegExp("\\ba " + "employee\\b", "i");

function packet(topicIds: Parameters<typeof buildPublicStewardPacket>[0]["topicIds"]) {
  const result = buildPublicStewardPacket({
    source: cbaSource,
    topicIds,
    runtimeVersion,
    createdAt: "2026-07-25T16:00:00.000Z",
  });
  expect(result).not.toBeNull();
  return result!;
}

function withoutTopicProvenance(value: string): string {
  return value.replace(/^[^:]+:\s*/, "").replace(/\s+/g, " ").trim();
}

describe("public steward packet workspace", () => {
  it.each([
    [["annual_leave"]],
    [["annual_leave", "overtime"]],
    [["annual_leave", "overtime", "sick_leave"]],
  ] as const)("builds a verified case-neutral one-to-three-topic packet: %s", (topicIds) => {
    const result = packet(topicIds);
    expect(result.savedType).toBe("public_steward_packet_plan");
    expect(result.selectedTopicIds).toEqual([...topicIds].sort());
    expect(result.topicSummaries).toHaveLength(topicIds.length);
    expect(result.outlines).toHaveLength(topicIds.length);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations.every(
      (citation) => citation.citationVerificationState === "verified_current"
    )).toBe(true);
    expect(result.sourceAppendix.every(
      (entry) =>
        entry.verificationState === "verified_current" &&
        entry.sourceInstanceId.length === 64 &&
        entry.paragraphContentSha256.length === 64 &&
        entry.citationAnchorSha256.length === 64
    )).toBe(true);
    expect(result.privateCaseWarning).toBe(PUBLIC_STEWARD_PACKET_PRIVATE_WARNING);
    expect(result.structuredEvidenceChecklist.length).toBeGreaterThan(0);
    expect(result.structuredEvidenceChecklist.every(
      (entry) => entry.document && entry.requestFrom && entry.whyItMatters && entry.citationIds.length > 0
    )).toBe(true);
    expect(result.sequencedSteps).toEqual(defaultPublicStewardPacketSteps());
    expect(publicStewardPacketExportEligibility(result, cbaSource)).toEqual({ eligible: true });
  });

  it("uses order-independent identity and Saved dedupe while keeping different topic sets distinct", () => {
    const first = packet(["overtime", "annual_leave"]);
    const reordered = packet(["annual_leave", "overtime"]);
    const different = packet(["annual_leave", "sick_leave"]);
    expect(first.id).toBe(reordered.id);
    expect(first.contentIdentity).toBe(reordered.contentIdentity);
    expect(first.id).not.toBe(different.id);

    const savedFirst = createSavedStewardPacketRecord({
      packet: first,
      timestamp: "2026-07-25T16:01:00.000Z",
    });
    const savedReordered = createSavedStewardPacketRecord({
      packet: reordered,
      timestamp: "2026-07-25T16:02:00.000Z",
    });
    const savedDifferent = createSavedStewardPacketRecord({
      packet: different,
      timestamp: "2026-07-25T16:03:00.000Z",
    });
    const created = upsertSavedAnswer([], savedFirst);
    const duplicate = upsertSavedAnswer(created.saved, savedReordered);
    const distinct = upsertSavedAnswer(duplicate.saved, savedDifferent);
    expect(created.status).toBe("created");
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.saved).toHaveLength(1);
    expect(distinct.status).toBe("created");
    expect(distinct.saved).toHaveLength(2);

    const migrated = migrateSavedAnswers(structuredClone(distinct.saved));
    expect(migrated).toHaveLength(2);
    expect(migrated.every((item) => item.savedType === "public_steward_packet_plan")).toBe(true);
    expect(migrateSavedAnswers(structuredClone(migrated))).toEqual(migrated);
  });

  it("deduplicates shared multi-topic rows before rendering combined provenance", () => {
    const twoTopic = packet(["annual_leave", "overtime"]);
    const threeTopic = packet(["annual_leave", "overtime", "sick_leave"]);
    const oneTopic = packet(["annual_leave"]);
    const sharedTimingFact =
      "When the employee or Union learned or reasonably should have learned of the grievance cause; keep actual dates outside this public pilot.";
    const sections = [
      threeTopic.governingContractLanguage.map((entry) => entry.text),
      threeTopic.factsToConfirm,
      threeTopic.evidenceChecklist.map((entry) => entry.text),
      threeTopic.structuredEvidenceChecklist.map((entry) => entry.document),
      threeTopic.managementQuestions,
      threeTopic.stepOnePreparation.map((entry) => entry.text),
      threeTopic.escalationReadiness.map((entry) => entry.text),
    ];

    for (const section of sections) {
      const canonicalRows = section.map(withoutTopicProvenance);
      expect(new Set(canonicalRows).size).toBe(canonicalRows.length);
    }
    expect(twoTopic.factsToConfirm.find((entry) => entry.endsWith(sharedTimingFact))).toBe(
      `Annual leave + Overtime: ${sharedTimingFact}`
    );
    expect(threeTopic.factsToConfirm.find((entry) => entry.endsWith(sharedTimingFact))).toBe(
      `Annual leave + Overtime + Sick leave administration: ${sharedTimingFact}`
    );
    expect(oneTopic.factsToConfirm.find((entry) => entry.endsWith(sharedTimingFact))).toBe(
      `Annual leave: ${sharedTimingFact}`
    );
    expect(threeTopic.factsToConfirm.some((entry) =>
      entry.startsWith("Overtime: ") && /Overtime Desired List/i.test(entry)
    )).toBe(true);

    const text = publicStewardPacketToText(threeTopic);
    const markdown = publicStewardPacketToMarkdown(threeTopic);
    expect(text.split(sharedTimingFact)).toHaveLength(2);
    expect(markdown.split(sharedTimingFact)).toHaveLength(2);

    const saved = createSavedStewardPacketRecord({
      packet: threeTopic,
      timestamp: "2026-08-02T16:10:00.000Z",
    });
    const reopened = migrateSavedAnswers([structuredClone(saved)])[0].stewardPacket;
    expect(reopened?.factsToConfirm).toEqual(threeTopic.factsToConfirm);
    expect(reopened?.stepOnePreparation).toEqual(threeTopic.stepOnePreparation);
  });

  it("rejects a fourth chat topic without evicting or mutating the selected three", () => {
    const selected = ["annual_leave", "overtime", "sick_leave"] as const;
    const firstAttempt = addChatTopicToPacketSelection(selected, "safety_health");
    const repeatedAttempt = addChatTopicToPacketSelection(firstAttempt.topicIds, "safety_health");

    expect(firstAttempt).toEqual({
      topicIds: [...selected],
      added: false,
      notice: PUBLIC_STEWARD_PACKET_TOPIC_LIMIT_NOTICE,
    });
    expect(repeatedAttempt).toEqual(firstAttempt);

    const afterRemoval = firstAttempt.topicIds.filter((topicId) => topicId !== "sick_leave");
    expect(addChatTopicToPacketSelection(afterRemoval, "safety_health")).toEqual({
      topicIds: ["annual_leave", "overtime", "safety_health"],
      added: true,
      notice: null,
    });
    expect(buildPublicStewardPacket({
      source: cbaSource,
      topicIds: [...selected, "safety_health"],
      runtimeVersion,
    })).toBeNull();
  });

  it("exports only current verified content and blocks stale packet identity", () => {
    const current = packet(["higher_level_assignments", "employee_claims"]);
    const text = publicStewardPacketToText(current);
    const markdown = publicStewardPacketToMarkdown(current);
    for (const heading of [
      "Selected topic summary",
      "Governing public articles and verified citations",
      "Cross-topic overlap or conflict notes",
      "Combined facts-to-confirm checklist",
      "Combined evidence-category checklist",
      "Ordered preparation and completion steps",
      "Combined management-question checklist",
      "Conditional Step 1 preparation outline",
      "Procedural and timeliness caveats",
      "Step 2 or escalation readiness checklist",
      "Limitations and unsupported scope",
      "Complete verified-current source appendix",
    ]) {
      expect(text).toContain(heading);
      expect(markdown).toContain(heading);
    }
    expect(text).toContain(PUBLIC_STEWARD_PACKET_PRIVATE_WARNING);
    expect(current.outlines.find((outline) => outline.template === "employee_claims")?.issue)
      .toBe(employeeClaimsIssue);
    expect(text).toContain(employeeClaimsIssue);
    expect(markdown).toContain(employeeClaimsIssue);
    expect(text).not.toMatch(malformedEmployeeArticlePattern);
    expect(markdown).not.toMatch(malformedEmployeeArticlePattern);
    expect(markdown).not.toMatch(/localStorage|cookie|proof_|\/home\/|process\.env|private path/i);
    expect(markdown).not.toMatch(/\b(member name|employee id|medical diagnosis|grievance file)\b/i);

    const completed = publicStewardPacketWithStepCompletion(current, "verify-citations", true);
    expect(completed.id).toBe(current.id);
    expect(completed.contentIdentity).toBe(current.contentIdentity);
    expect(completed.sequencedSteps.find((step) => step.stepId === "verify-citations")?.completed).toBe(true);
    expect(publicStewardPacketExportEligibility(completed, cbaSource)).toEqual({ eligible: true });
    expect(publicStewardPacketToText(completed)).toContain("[x] Verify every governing citation");

    const stale = structuredClone(current);
    stale.outlines[0].citations[0].citationAnchorSha256 = "0".repeat(64);
    expect(publicStewardPacketExportEligibility(stale, cbaSource)).toMatchObject({
      eligible: false,
    });
    expect(buildPublicStewardPacket({
      source: null,
      topicIds: current.selectedTopicIds,
      runtimeVersion,
    })).toBeNull();
    expect(buildPublicStewardPacket({
      source: cbaSource,
      topicIds: [],
      runtimeVersion,
    })).toBeNull();
    expect(buildPublicStewardPacket({
      source: cbaSource,
      topicIds: ["annual_leave", "overtime", "sick_leave", "safety_health"],
      runtimeVersion,
    })).toBeNull();
  });

  it("migrates pre-Bundle-3 packets with structured evidence and all steps incomplete", () => {
    const current = packet(["annual_leave", "overtime"]);
    const record = createSavedStewardPacketRecord({
      packet: current,
      timestamp: "2026-07-25T16:05:00.000Z",
    });
    const legacy = structuredClone(record) as unknown as {
      stewardPacket: {
        structuredEvidenceChecklist?: unknown;
        sequencedSteps?: unknown;
      };
    };
    delete legacy.stewardPacket.structuredEvidenceChecklist;
    delete legacy.stewardPacket.sequencedSteps;

    const migrated = migrateSavedAnswers([legacy]);
    expect(migrated).toHaveLength(1);
    expect(migrated[0].stewardPacket?.structuredEvidenceChecklist.length).toBeGreaterThan(0);
    expect(migrated[0].stewardPacket?.sequencedSteps).toEqual(defaultPublicStewardPacketSteps());
    expect(migrated[0].stewardPacket?.sequencedSteps.every((step) => !step.completed)).toBe(true);
    expect(migrateSavedAnswers(structuredClone(migrated))).toEqual(migrated);
  });

  it("renders supported and research-only discovery, obvious workflow actions, packet controls, and Saved filters", () => {
    const current = packet(["annual_leave", "overtime"]);
    const sourcesHtml = renderToStaticMarkup(
      React.createElement(SourcesPanel, {
        cbaSourceState: { status: "available", source: cbaSource },
        publicSourceState: { status: "available", source: publicSource },
        sourceHierarchyGroups: buildSourceHierarchyGroups(),
        onAskCbaQuestion: () => undefined,
        onBuildStewardPacket: () => undefined,
        onTogglePacketTopic: () => undefined,
        packet: current,
        packetTopicIds: current.selectedTopicIds,
        runtimeVersion,
      })
    );
    expect(sourcesHtml.match(/Open workflow/g)).toHaveLength(PUBLIC_STEWARD_WORKFLOW_TOPICS.length);
    expect(sourcesHtml).toContain("Build steward packet");
    expect(sourcesHtml).toContain("Build case-neutral steward packet");
    expect(sourcesHtml).toContain("No private input field exists");
    expect(sourcesHtml).toContain("Research-only or rejected candidates");
    for (const candidate of PUBLIC_STEWARD_RESEARCH_CANDIDATES) {
      expect(sourcesHtml).toContain(candidate.displayName);
      expect(sourcesHtml).toContain(candidate.reason);
    }

    const savedRecord = createSavedStewardPacketRecord({
      packet: current,
      timestamp: "2026-07-25T16:04:00.000Z",
    });
    const savedHtml = renderToStaticMarkup(
      React.createElement(SavedAnswersPanel, {
        saved: [savedRecord],
        onDelete: () => undefined,
        cbaSourceState: { status: "available", source: cbaSource },
      })
    );
    expect(savedHtml).toContain("Steward Packet");
    expect(savedHtml).toContain("public_steward_packet_plan");
    expect(savedHtml).toContain("Filter Saved by type");
    expect(savedHtml).toContain("Filter Saved by topic");
    expect(savedHtml).toContain("Open saved packet");
  });

  it("keeps verified outline and packet copy usable when the modern Clipboard API is denied", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    expect(component).toContain("function copyPublicExportText");
    expect(component).toContain('document.execCommand("copy")');
    expect(component).toContain("await navigator.clipboard?.writeText(text)");
    expect(component.match(/copyPublicExportText\(/g)).toHaveLength(4);
  });
});
