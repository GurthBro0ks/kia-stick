import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PublicStewardArgumentPlanView,
  PublicStewardPacketView,
} from "@/components/KiaStickApp";
import {
  buildPublicStewardArgumentPlan,
  publicStewardArgumentPlanExportEligibility,
  publicStewardArgumentPlanToMarkdown,
  publicStewardArgumentPlanToText,
} from "@/lib/publicStewardArgumentPlan";
import {
  buildPublicStewardPacket,
  publicStewardPacketExportEligibility,
  publicStewardPacketToMarkdown,
  publicStewardPacketToText,
} from "@/lib/publicStewardPacket";
import {
  createSavedStewardArgumentPlanRecord,
  createSavedStewardPacketRecord,
  migrateSavedAnswers,
} from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";

const source = createCbaSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({
  buildDate: "20260813",
  gitSha: "printqa1",
});

function overtimePlan() {
  const result = buildPublicStewardArgumentPlan({
    source,
    topicId: "overtime",
    runtimeVersion,
    createdAt: "2026-08-13T17:00:00.000Z",
  });
  expect(result).not.toBeNull();
  return result!;
}

function annualLeaveOvertimePacket() {
  const result = buildPublicStewardPacket({
    source,
    topicIds: ["annual_leave", "overtime"],
    runtimeVersion,
    createdAt: "2026-08-13T17:00:00.000Z",
  });
  expect(result).not.toBeNull();
  return result!;
}

describe("F-EXPORT-01 and F-EXPORT-02 hardening", () => {
  it("exports a complete deterministic single-topic plan as plain text and Markdown", () => {
    const plan = overtimePlan();
    const text = publicStewardArgumentPlanToText(plan);
    const markdown = publicStewardArgumentPlanToMarkdown(plan);

    expect(text).toContain(plan.title);
    expect(text).toContain(`Topic: ${plan.topic}`);
    expect(text).toContain(plan.issueSummary);
    expect(text).toContain("6. Step-by-step argument");
    expect(text).toContain("7. Procedure and timing cautions");
    expect(text).toContain("10. Complete verified-current source appendix");
    expect(markdown).toContain(`# ${plan.title}`);
    expect(markdown).toContain("## 4. Structured evidence or record requests");
    expect(markdown).toContain("## 10. Complete verified-current source appendix");
    expect(markdown).toContain(`> ${plan.privateCaseWarning}`);

    for (const [index, entry] of plan.evidenceRequests.entries()) {
      expect(text).toContain(entry.document);
      expect(text).toContain(entry.whyItMatters);
      expect(markdown).toContain(`**Why it matters:** ${entry.whyItMatters}`);
      expect(text.indexOf(entry.document)).toBeLessThan(text.length);
      expect(index).toBeGreaterThanOrEqual(0);
    }
    for (const citation of plan.citations) {
      expect(text).toContain(citation.paragraphId ?? "");
      expect(markdown).toContain(citation.citationAnchorSha256 ?? "");
    }
    for (const step of plan.argumentSteps) expect(text).toContain(step.text);
    expect(text).not.toContain("[object Object]");
    expect(markdown).not.toContain("[object Object]");
    expect(publicStewardArgumentPlanToText(plan)).toBe(text);
    expect(publicStewardArgumentPlanToMarkdown(plan)).toBe(markdown);
  });

  it("exports a complete deduplicated two-topic packet in stable topic order", () => {
    const packet = annualLeaveOvertimePacket();
    const text = publicStewardPacketToText(packet);
    const markdown = publicStewardPacketToMarkdown(packet);
    const sharedTimingFact =
      "When the employee or Union learned or reasonably should have learned of the grievance cause; keep actual dates outside this public pilot.";

    expect(packet.selectedTopicIds).toEqual(["annual_leave", "overtime"]);
    expect(text).toContain("Topics: annual_leave, overtime");
    expect(markdown).toContain("- Topics: annual_leave, overtime");
    expect(text).toContain("Annual leave + Overtime:");
    expect(markdown).toContain("Annual leave + Overtime:");
    expect(text).toMatch(/Overtime Desired List/i);
    expect(markdown).toMatch(/choice-period|annual-leave/i);
    expect(text.split(sharedTimingFact)).toHaveLength(2);
    expect(markdown.split(sharedTimingFact)).toHaveLength(2);
    expect(text).toContain("6. Ordered preparation and completion steps");
    expect(markdown).toContain("## 12. Complete verified-current source appendix");
    expect(text).toContain(packet.privateCaseWarning);
    for (const entry of packet.structuredEvidenceChecklist) {
      expect(text).toContain(entry.whyItMatters);
      expect(markdown).toContain(`**Why it matters:** ${entry.whyItMatters}`);
    }
    for (const entry of packet.sourceAppendix) {
      expect(text).toContain(entry.citationAnchorSha256);
      expect(markdown).toContain(entry.paragraphContentSha256);
    }
    expect(text).not.toContain("[object Object]");
    expect(markdown).not.toContain("[object Object]");
    expect(publicStewardPacketToText(packet)).toBe(text);
    expect(publicStewardPacketToMarkdown(packet)).toBe(markdown);
  });

  it("keeps Saved/reopened structured artifacts exportable without weakening stale gates", () => {
    const plan = overtimePlan();
    const packet = annualLeaveOvertimePacket();
    const reopened = migrateSavedAnswers([
      createSavedStewardArgumentPlanRecord({ plan, timestamp: "2026-08-13T17:01:00.000Z" }),
      createSavedStewardPacketRecord({ packet, timestamp: "2026-08-13T17:02:00.000Z" }),
    ]);
    const reopenedPlan = reopened.find((item) => item.stewardArgumentPlan)?.stewardArgumentPlan;
    const reopenedPacket = reopened.find((item) => item.stewardPacket)?.stewardPacket;

    expect(reopenedPlan).toBeDefined();
    expect(reopenedPacket).toBeDefined();
    expect(publicStewardArgumentPlanToText(reopenedPlan!)).toBe(publicStewardArgumentPlanToText(plan));
    expect(publicStewardPacketToMarkdown(reopenedPacket!)).toBe(publicStewardPacketToMarkdown(packet));
    expect(publicStewardArgumentPlanExportEligibility(plan, source)).toEqual({ eligible: true });
    expect(publicStewardPacketExportEligibility(packet, source)).toEqual({ eligible: true });

    const stalePlan = structuredClone(plan);
    stalePlan.citations[0].citationAnchorSha256 = "0".repeat(64);
    const stalePacket = structuredClone(packet);
    stalePacket.outlines[0].citations[0].citationAnchorSha256 = "0".repeat(64);
    expect(publicStewardArgumentPlanExportEligibility(stalePlan, source)).toMatchObject({ eligible: false });
    expect(publicStewardPacketExportEligibility(stalePacket, source)).toMatchObject({ eligible: false });

    const stalePlanHtml = renderToStaticMarkup(React.createElement(PublicStewardArgumentPlanView, {
      plan: stalePlan,
      source,
      onCitationNavigate: () => undefined,
      onSave: () => undefined,
    }));
    const stalePacketHtml = renderToStaticMarkup(React.createElement(PublicStewardPacketView, {
      packet: stalePacket,
      source,
      onCitationNavigate: () => undefined,
      onSave: () => undefined,
    }));
    expect(stalePlanHtml.match(/<button[^>]*disabled=""/g)?.length).toBe(4);
    expect(stalePacketHtml.match(/<button[^>]*disabled=""/g)?.length).toBe(4);
  });

  it("applies reusable print semantics to rendered plans and packets", () => {
    const planHtml = renderToStaticMarkup(React.createElement(PublicStewardArgumentPlanView, {
      plan: overtimePlan(),
      source,
      onCitationNavigate: () => undefined,
      onSave: () => undefined,
    }));
    const packetHtml = renderToStaticMarkup(React.createElement(PublicStewardPacketView, {
      packet: annualLeaveOvertimePacket(),
      source,
      onCitationNavigate: () => undefined,
      onSave: () => undefined,
    }));
    const styles = readFileSync("app/globals.css", "utf8");
    const printStyles = styles.slice(styles.indexOf("@media print"));

    for (const html of [planHtml, packetHtml]) {
      expect(html).toContain("print-document");
      expect(html).toContain("print-section");
      expect(html).toContain("print-heading");
      expect(html).toContain("print-atomic");
      expect(html).toContain("print-hide");
      expect(html).toContain("Why it matters");
    }
    expect(planHtml).toContain("Print verified plan");
    expect(packetHtml).toContain("Print verified packet");
    expect(packetHtml).toContain("Complete verified-current source appendix");
    expect(printStyles).toMatch(/\.print-atomic[^{]*{[^}]*break-inside:\s*avoid/s);
    expect(printStyles).toMatch(/\.print-section[^{]*{[^}]*break-inside:\s*auto/s);
    expect(printStyles).toMatch(/\.print-heading[^{]*{[^}]*break-after:\s*avoid/s);
    expect(printStyles).toMatch(/\.print-hide[^{]*{[^}]*display:\s*none\s*!important/s);
    expect(printStyles).not.toMatch(/\.publicPrintTarget\s+button[^{]*{[^}]*display:\s*none/s);
  });

  it("preserves deterministic Markdown filenames and the existing export formats", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    expect(component).toContain("`kia-public-${plan.topicId}-argument-plan.md`");
    expect(component).toContain("`kia-public-steward-packet-${packet.selectedTopicIds.join(\"-\")}.md`");
    expect(component.match(/text\/markdown;charset=utf-8/g)?.length).toBeGreaterThanOrEqual(3);
    expect(component).not.toMatch(/application\/pdf|\.docx|\.zip|text\/html/);
  });
});
