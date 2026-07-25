import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  SavedAnswersPanel,
  SourcesPanel,
} from "@/components/KiaStickApp";
import {
  buildPublicStewardPacket,
  PUBLIC_STEWARD_PACKET_PRIVATE_WARNING,
  publicStewardPacketExportEligibility,
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
    expect(markdown).not.toMatch(/localStorage|cookie|proof_|\/home\/|process\.env|private path/i);
    expect(markdown).not.toMatch(/\b(member name|employee id|medical diagnosis|grievance file)\b/i);

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
});
