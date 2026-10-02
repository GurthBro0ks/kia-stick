import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  libraryTechnicalDetailsLabel,
  libraryVerificationDisplay,
  SavedAnswersPanel,
} from "@/components/KiaStickApp";
import { buildCbaAnswer } from "@/lib/cbaAnswer";
import { buildPublicArgumentPlan } from "@/lib/publicArgumentPlan";
import { buildPublicGrievanceOutline } from "@/lib/publicGrievanceOutline";
import { buildPublicSourceAnswer } from "@/lib/publicSourceAnswer";
import { buildPublicStewardArgumentPlan } from "@/lib/publicStewardArgumentPlan";
import { buildPublicStewardPacket } from "@/lib/publicStewardPacket";
import {
  createSavedAnswerRecord,
  createSavedArgumentPlanRecord,
  createSavedGrievanceOutlineRecord,
  createSavedStewardArgumentPlanRecord,
  createSavedStewardPacketRecord,
  type SavedAnswer,
} from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const appSource = readFileSync("components/KiaStickApp.tsx", "utf8");
const design = readFileSync("DESIGN.md", "utf8");
const cbaSource = createCbaSourceFixtureCache();
const publicSource = createPublicSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261002", gitSha: "ux7details" });
const defaults = {
  mode: "Strict Research" as const,
  scope: "Official-Like" as const,
  detail: "Detailed" as const,
};

function records(): SavedAnswer[] {
  const cbaQuestion = "Can an annual leave request be denied under the CBA?";
  const cbaAnswer = buildCbaAnswer({
    question: cbaQuestion,
    source: cbaSource,
    nlrbSource: publicSource,
    runtimeVersion,
    ...defaults,
  });
  const publicAnswer = buildPublicSourceAnswer({
    question: "Can I have a steward during an investigative interview?",
    source: publicSource,
    runtimeVersion,
    ...defaults,
  });
  const argumentPlan = buildPublicArgumentPlan({
    answer: publicAnswer,
    source: publicSource,
    createdAt: "2026-10-02T11:59:00.000Z",
  })!;
  const topicPlan = buildPublicStewardArgumentPlan({
    source: cbaSource,
    topicId: "annual_leave",
    runtimeVersion,
    createdAt: "2026-10-02T11:59:01.000Z",
  })!;
  const outline = buildPublicGrievanceOutline({
    answer: cbaAnswer,
    source: cbaSource,
    createdAt: "2026-10-02T11:59:02.000Z",
  })!;
  const packet = buildPublicStewardPacket({
    source: cbaSource,
    topicIds: ["annual_leave"],
    runtimeVersion,
  })!;

  return [
    createSavedAnswerRecord({ answer: cbaAnswer, ...defaults, timestamp: "2026-10-02T12:00:00.000Z" }),
    createSavedArgumentPlanRecord({ plan: argumentPlan, question: publicAnswer.question, ...defaults, timestamp: "2026-10-02T12:00:01.000Z" }),
    createSavedStewardArgumentPlanRecord({ plan: topicPlan, timestamp: "2026-10-02T12:00:02.000Z" }),
    createSavedGrievanceOutlineRecord({ outline, question: cbaQuestion, ...defaults, timestamp: "2026-10-02T12:00:03.000Z" }),
    createSavedStewardPacketRecord({ packet, timestamp: "2026-10-02T12:00:04.000Z" }),
  ];
}

function render(saved: SavedAnswer[], sourceState: "available" | "unavailable" = "available") {
  return renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
    saved,
    onDelete: () => undefined,
    onResearchCba: () => undefined,
    cbaSourceState: sourceState === "available"
      ? { status: "available" as const, source: cbaSource }
      : { status: "unavailable" as const, reason: "cache_missing" as const },
  }));
}

describe("UX-7 Library technical-details disclosure", () => {
  it("uses closed item-aware native disclosures for every existing Library type", () => {
    const saved = records();
    const html = render(saved);
    const expected = [
      ["answer", "Saved answer details"],
      ["public_argument_plan", "Saved argument plan details"],
      ["public_steward_argument_plan", "Saved topic argument plan details"],
      ["public_grievance_outline", "Saved grievance outline details"],
      ["public_steward_packet_plan", "Saved packet details"],
    ] as const;

    expect(html.match(/<details class="packetDisclosure savedPacketDetails">/g)).toHaveLength(5);
    expect(html).not.toMatch(/<details[^>]*\sopen(?:=|>)/);
    for (const [savedType, label] of expected) {
      const item = saved.find((candidate) => candidate.savedType === savedType)!;
      expect(libraryTechnicalDetailsLabel(item)).toBe(label);
      expect(html).toContain(`<summary>${label}</summary>`);
      expect(html).toMatch(new RegExp(`<summary>${label}</summary>[\\s\\S]*?<dd>${savedType}</dd>`));
    }
  });

  it("keeps existing technical evidence accessible after expand without leaving a default-visible raw metadata rail", () => {
    const html = render(records());
    for (const field of ["Item type", "Product", "Prompt", "Build", "Provider", "Answer lane", "Normalized source hash", "PDF SHA-256", "Citation integrity"]) {
      expect(html).toContain(field);
    }
    expect(html).toContain('aria-label="Library item technical summary"');
    expect(appSource).toContain("{!item.stewardPacket && (");
    expect(appSource).toContain('<details className="packetDisclosure savedPacketDetails">');
    expect(appSource).not.toContain('const MetadataContainer = item.stewardPacket ? "details" : "div"');
    expect(design).toContain("behind a closed, item-aware native disclosure");
  });

  it("shows plain-language verification and keeps re-search warnings outside the closed disclosure", () => {
    const answer = records()[0];
    const currentHtml = render([answer]);
    expect(answer.citationVerificationStateAtSave).toBe("verified_current");
    expect(libraryVerificationDisplay("verified_current")).toBe("Verified current");
    expect(currentHtml).toContain("Verified current");
    expect(currentHtml).not.toContain("verified_current");

    const staleHtml = render([answer], "unavailable");
    const disclosureStart = staleHtml.indexOf('<details class="packetDisclosure savedPacketDetails">');
    const warningStart = staleHtml.indexOf('<div class="applicabilityWarning" role="alert">');
    expect(disclosureStart).toBeGreaterThan(-1);
    expect(warningStart).toBeGreaterThan(disclosureStart);
    expect(staleHtml.slice(disclosureStart, warningStart).trimEnd().endsWith("</details>")).toBe(true);
    expect(staleHtml.slice(warningStart)).toContain("Re-search current CBA");
    expect(appSource).toContain('cbaVerificationState && cbaVerificationState !== "verified_current"');
    expect(design).toContain("never hide a re-search-current-CBA warning in a disclosure");
  });

  it("preserves accepted Library identity, actions, packet disclosure, empty state, and save-banner cleanup", () => {
    const html = render(records());
    for (const visible of ["Answer", "Argument Plan", "Topic Argument Plan", "Grievance Outline", "Steward Packet", "Open saved plan", "Open saved topic plan", "Open saved outline", "Open saved packet"]) {
      expect(html).toContain(visible);
    }
    expect(html).toContain("Saved packet details");
    expect(html).toContain('aria-label="Delete saved answer"');
    expect(html).toContain('aria-label="Delete argument plan"');
    const empty = render([]);
    expect(empty).toContain("Nothing in your Library yet.");
    expect(empty).not.toContain("Saved to Library.");
    expect(empty).not.toContain("Open in Library");
  });
});
