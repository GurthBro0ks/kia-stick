import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ts from "typescript";
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
import { evidenceRequestsFromCitedItems } from "@/lib/publicGrievanceOutline";
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
  it("classifies steward certification and sick-leave evidence without crossing rationales", () => {
    const steward = packet(["annual_leave", "overtime", "steward_grievance_handling"]);
    const sick = packet(["sick_leave"]);
    for (const [result, term, rationale, article] of [
      [steward, "steward certification", "steward designation", "17"],
      [sick, "certification request", "sick-leave provisions", "10"],
    ] as const) {
      const outline = result.outlines.find((entry) =>
        entry.evidenceToRequest.some((item) => item.text.includes(term))
      )!;
      expect(outline).toBeDefined();
      const sourceItem = outline.evidenceToRequest.find((item) => item.text.includes(term))!;
      const request = outline.evidenceRequests.find((item) => item.document.includes(term))!;
      const combined = result.structuredEvidenceChecklist.find((item) => item.document.includes(term))!;
      expect(request.whyItMatters).toContain(rationale);
      expect(combined.whyItMatters).toBe(request.whyItMatters);
      expect(request.citationIds).toEqual([...new Set(sourceItem.citationIds)].sort());
      expect(combined.citationIds).toEqual(request.citationIds);
      expect(combined.citationIds.length).toBeGreaterThan(0);
      for (const id of combined.citationIds) {
        const citation = result.citations.find((entry) => entry.id === id)!;
        expect(citation.articleNumber).toBe(article);
        expect(citation.citationVerificationState).toBe("verified_current");
      }
      expect(outline.evidenceRequests.map((item) => item.document))
        .toEqual(outline.evidenceToRequest.map((item) => item.text));
    }
    const stewardRequest = steward.structuredEvidenceChecklist.find((item) =>
      item.document.includes("steward certification")
    )!;
    expect(stewardRequest.document).toMatch(/request and response.*records-access.*interview request.*grievance-handling purpose/);
    expect(stewardRequest.whyItMatters).not.toMatch(/absence category|sick-leave provisions/);
    // Stable packet identity survives the rationale repair; content identity must change.
    expect(steward.id).toBe("public-steward-packet-ad330246a4014b88a26d");
    expect(steward.contentIdentity).not.toBe("9458dfeb534580ed1e820cb122c2e7acaacbed6d66896e80ebddc1533163e082");
    const reordered = packet(["steward_grievance_handling", "overtime", "annual_leave"]);
    expect(reordered).toEqual(steward);
    expect(publicStewardPacketToText(steward)).toContain(stewardRequest.whyItMatters);
    expect(publicStewardPacketToMarkdown(steward)).toContain(stewardRequest.whyItMatters);
    expect(publicStewardPacketExportEligibility(steward, cbaSource)).toEqual({ eligible: true });
    expect(publicStewardPacketExportEligibility(sick, cbaSource)).toEqual({ eligible: true });
  });

  it("requires leave context for certification while retaining explicit sick-leave and absence rationales", () => {
    const requests = evidenceRequestsFromCitedItems([
      { text: "Steward certification request and records-access log", citationIds: ["article-17"] },
      { text: "Sick leave certification", citationIds: ["article-10"] },
      { text: "Neutral absence record", citationIds: ["article-10"] },
      { text: "Certification request for leave administration", citationIds: ["article-10"] },
    ]);
    expect(requests[0].whyItMatters).toContain("steward designation");
    for (const request of requests.slice(1)) {
      expect(request.whyItMatters).toContain("sick-leave provisions");
    }
  });

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

  it("keeps catalog toggle additions on the shared cap decision, including stale clicks and removal", () => {
    // Execute the actual component closure with controlled state setters; no DOM dependency
    // or production export is needed to exercise a click that the rendered button disables.
    const source = ts.createSourceFile("KiaStickApp.tsx",
      readFileSync("components/KiaStickApp.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler = "";
    function findHandler(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === "togglePacketTopic") {
        handler = node.getText(source);
      }
      ts.forEachChild(node, findHandler);
    }
    findHandler(source);
    expect(handler).not.toBe("");
    type TopicId = Parameters<typeof addChatTopicToPacketSelection>[1];
    let selected: TopicId[] = ["overtime"];
    const sharedAdd = vi.fn(addChatTopicToPacketSelection);
    const setNotice = vi.fn();
    const invalidatePacket = vi.fn();
    const toggle = new Function("setPacketTopicIds", "setStewardPacket", "setSaveNotice",
      "addChatTopicToPacketSelection",
      ts.transpile(handler, { target: ts.ScriptTarget.ES2022 }) + "\nreturn togglePacketTopic;")(
      (update: (current: TopicId[]) => TopicId[]) => { selected = update(selected); },
      invalidatePacket, setNotice, sharedAdd
    ) as (topicId: TopicId) => void;

    for (const candidate of ["annual_leave", "sick_leave", "safety_health", "safety_health"] as const) {
      const before = [...selected];
      const expected = addChatTopicToPacketSelection(before, candidate);
      sharedAdd.mockClear();
      toggle(candidate);
      expect(sharedAdd).toHaveBeenCalledExactlyOnceWith(before, candidate);
      expect(selected).toEqual(expected.topicIds);
      expect(selected.length).toBeLessThanOrEqual(3);
      expect(setNotice).toHaveBeenLastCalledWith(expected.notice
        ? { status: "duplicate", text: expected.notice } : null);
      expect(invalidatePacket).toHaveBeenLastCalledWith(null);
    }
    sharedAdd.mockClear();
    toggle("overtime");
    expect(sharedAdd).not.toHaveBeenCalled();
    expect(selected).toEqual(["annual_leave", "sick_leave"]);
    expect(setNotice).toHaveBeenLastCalledWith(null);
    expect(invalidatePacket).toHaveBeenLastCalledWith(null);
    const expected = addChatTopicToPacketSelection(selected, "safety_health");
    toggle("safety_health");
    expect(selected).toEqual(expected.topicIds);
    expect(setNotice).toHaveBeenLastCalledWith(null);
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

  it.each([
    ["overtime"],
    ["annual_leave", "overtime", "sick_leave"],
  ] as const)("places one workspace above the catalog with individual ordered controls: %s", (...topicIds) => {
    const html = renderToStaticMarkup(React.createElement(SourcesPanel, {
      cbaSourceState: { status: "available", source: cbaSource },
      sourceHierarchyGroups: buildSourceHierarchyGroups(),
      packetTopicIds: [...topicIds],
      onTogglePacketTopic: () => undefined,
      onClearPacketSelection: () => undefined,
      onBuildStewardPacket: () => undefined,
      runtimeVersion,
    }));
    expect(html.match(/id="steward-packet-workspace"/g)).toHaveLength(1);
    expect(html.indexOf('id="steward-packet-workspace"')).toBeLessThan(html.indexOf('aria-label="official final APWU USPS CBA source"'));
    expect(html.indexOf('id="steward-packet-workspace"')).toBeLessThan(html.indexOf('class="workflowTopicCard"'));
    const workspace = html.slice(html.indexOf('class="stewardPacketWorkspace"'), html.indexOf('aria-label="official final APWU USPS CBA source"'));
    let previousPosition = -1;
    for (const topicId of topicIds) {
      const name = PUBLIC_STEWARD_WORKFLOW_TOPICS.find((topic) => topic.id === topicId)!.displayName;
      // A named group keeps the visible topic and its uniquely named action together.
      const group = workspace.slice(workspace.indexOf(`role="group" aria-label="${name}"`));
      const groupMarkup = group.slice(0, group.indexOf("</div>"));
      expect(groupMarkup).toContain(`aria-label="Remove ${name} from packet"`);
      // The compact control is a semantic button whose only visible content is the close glyph.
      expect(groupMarkup).toMatch(/<button[^>]*class="[^"]*packetSelectedTopicRemove[^"]*"[^>]*>\s*<span aria-hidden="true">\u00d7<\/span>\s*<\/button>/);
      const position = workspace.indexOf(`aria-label="Remove ${name} from packet"`);
      expect(position).toBeGreaterThan(previousPosition);
      previousPosition = position;
    }
    expect(workspace.match(/<span aria-hidden="true">\u00d7<\/span>/g)).toHaveLength(topicIds.length);
    // The bulky visible "Remove" label is gone while every accessible name still names its topic.
    expect(workspace).not.toMatch(/>Remove<|>\s+Remove\s+</);
    expect(workspace.match(/aria-label="Remove [^"]+ from packet"/g)).toHaveLength(topicIds.length);
    expect(workspace).toContain("Clear selection");
    expect(workspace).toContain("No private input field exists");
    if (topicIds.length === 3) {
      expect(html.match(/disabled=""/g)).toHaveLength(PUBLIC_STEWARD_WORKFLOW_TOPICS.length - 3);
    }
  });

  it("keeps the empty workspace below discovery with no selected-topic actions", () => {
    const html = renderToStaticMarkup(React.createElement(SourcesPanel, {
      cbaSourceState: { status: "available", source: cbaSource },
      sourceHierarchyGroups: buildSourceHierarchyGroups(),
      onTogglePacketTopic: () => undefined,
      onClearPacketSelection: () => undefined,
      onBuildStewardPacket: () => undefined,
      runtimeVersion,
    }));
    expect(html.match(/id="steward-packet-workspace"/g)).toHaveLength(1);
    expect(html.indexOf('id="steward-packet-workspace"')).toBeGreaterThan(html.indexOf('class="workflowTopicCard"'));
    expect(html).toContain("No topics selected");
    expect(html).not.toContain("Clear selection");
    expect(html).not.toContain('aria-label="Remove ');
    expect(html).toMatch(/disabled=""[^>]*>.*Build case-neutral steward packet/s);
  });

  it("clears only active packet state and permits a fresh verified build", () => {
    // Exercise the real owner closure, as in the cap-parity test above. Its only
    // available setters are packet selection, derived packet and transient notice.
    const source = ts.createSourceFile("KiaStickApp.tsx",
      readFileSync("components/KiaStickApp.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler = "";
    function findHandler(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === "clearPacketSelection") handler = node.getText(source);
      ts.forEachChild(node, findHandler);
    }
    findHandler(source);
    expect(handler).not.toBe("");
    let selected = ["annual_leave", "overtime"] as Parameters<typeof buildPublicStewardPacket>[0]["topicIds"];
    const invalidatePacket = vi.fn();
    const clearNotice = vi.fn();
    const clear = new Function("setPacketTopicIds", "setStewardPacket", "setSaveNotice",
      ts.transpile(handler, { target: ts.ScriptTarget.ES2022 }) + "\nreturn clearPacketSelection;")(
      (ids: typeof selected) => { selected = ids; }, invalidatePacket, clearNotice
    );
    clear();
    expect(selected).toEqual([]);
    expect(invalidatePacket).toHaveBeenCalledExactlyOnceWith(null);
    expect(clearNotice).toHaveBeenCalledExactlyOnceWith(null);
    selected = addChatTopicToPacketSelection(selected, "overtime").topicIds;
    selected = addChatTopicToPacketSelection(selected, "annual_leave").topicIds;
    expect(packet(selected).selectedTopicIds).toEqual(["annual_leave", "overtime"]);
  });

  it("routes all verified public Copy controls through the shared clipboard helper", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    expect(component).toContain('import { copyPublicExportText } from "@/lib/publicClipboard"');
    expect(component.match(/copyPublicExportText\(/g)).toHaveLength(3);
    expect(component.match(/Automatic copy could not be verified\./g)).toHaveLength(3);
    expect(component).not.toContain("Copy was blocked by the browser.");
    expect(component).not.toContain('document.execCommand("copy")');
  });
});
