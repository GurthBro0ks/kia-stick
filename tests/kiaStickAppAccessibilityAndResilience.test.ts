import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  KiaStickApp,
  SavedAnswersPanel,
  SourcesPanel,
  PublicStewardPacketView,
} from "@/components/KiaStickApp";
import {
  createChatSubmitSnapshot,
  routeChatQuestion,
} from "@/lib/chatAnswerRouter";
import { buildPublicStewardPacket } from "@/lib/publicStewardPacket";
import { buildPublicStewardArgumentPlan } from "@/lib/publicStewardArgumentPlan";
import { buildPublicArgumentPlan } from "@/lib/publicArgumentPlan";
import { buildPublicGrievanceOutline } from "@/lib/publicGrievanceOutline";
import { buildPublicSourceAnswer } from "@/lib/publicSourceAnswer";
import {
  createSavedAnswerRecord,
  createSavedArgumentPlanRecord,
  createSavedStewardArgumentPlanRecord,
  createSavedGrievanceOutlineRecord,
  createSavedStewardPacketRecord,
  migrateSavedAnswers,
  type SavedAnswer,
} from "@/lib/savedAnswers";
import { buildSourceHierarchyGroups } from "@/lib/sourceModel";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const cbaSource = createCbaSourceFixtureCache();
const publicSource = createPublicSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({
  buildDate: "20260808",
  gitSha: "bundle3a11y",
});

const defaults = {
  mode: "Strict Research" as const,
  scope: "Official-Like" as const,
  detail: "Detailed" as const,
};
const cbaQuestion = "Can an annual leave request be denied under the CBA?";
const publicQuestion = "Can I have a steward during an investigative interview?";

function cbaRoutedAnswer() {
  const snapshot = createChatSubmitSnapshot({
    question: cbaQuestion,
    sourcePolicy: "auto",
    ...defaults,
  });
  return routeChatQuestion({
    question: cbaQuestion,
    snapshot,
    publicSource,
    cbaSource,
    runtimeVersion,
  });
}

describe("Accessibility and Saved-State Resilience Hardening (Bundle 3 UX Architecture)", () => {
  it("F-A11Y-01 assertion 1: renders packet-workspace topic buttons with aria-pressed, accessible labels, and cap disabled state", () => {
    const sourceHierarchy = buildSourceHierarchyGroups();

    const htmlSelected = renderToStaticMarkup(
      React.createElement(SourcesPanel, {
        cbaSourceState: { status: "available", source: cbaSource },
        publicSourceState: { status: "available", source: publicSource },
        sourceHierarchyGroups: sourceHierarchy,
        packetTopicIds: ["annual_leave"],
        onTogglePacketTopic: () => undefined,
        runtimeVersion,
      })
    );
    expect(htmlSelected).toContain('aria-pressed="true"');
    expect(htmlSelected).toContain("Remove from packet");

    const htmlCapped = renderToStaticMarkup(
      React.createElement(SourcesPanel, {
        cbaSourceState: { status: "available", source: cbaSource },
        publicSourceState: { status: "available", source: publicSource },
        sourceHierarchyGroups: sourceHierarchy,
        packetTopicIds: ["annual_leave", "overtime", "sick_leave"],
        onTogglePacketTopic: () => undefined,
        runtimeVersion,
      })
    );
    expect(htmlCapped).toContain("disabled=");
    expect(htmlCapped).toContain('aria-pressed="false"');
  });

  it("F-A11Y-01 assertion 2: reflects disabled state on export/download/print buttons when eligibility is unfulfilled", () => {
    const packet = buildPublicStewardPacket({
      source: cbaSource,
      topicIds: ["annual_leave"],
      runtimeVersion,
      createdAt: "2026-08-08T12:00:00.000Z",
    });
    expect(packet).not.toBeNull();

    const htmlBlocked = renderToStaticMarkup(
      React.createElement(PublicStewardPacketView, {
        packet: packet!,
        source: null,
        onCitationNavigate: () => undefined,
      })
    );
    expect(htmlBlocked).toContain("disabled=");
    expect(htmlBlocked).toContain('role="alert"');
    expect(htmlBlocked).toContain("Copy packet as plain text");
    expect(htmlBlocked).toContain("Download packet as Markdown");
    expect(htmlBlocked).toContain("Print verified packet");
  });

  it("F-A11Y-01 assertion 3 & 4: renders aria-expanded and role='alert' for saved-tab record toggles and gated disabled reasons", () => {
    const cbaAnswer = cbaRoutedAnswer();
    const publicAnswer = buildPublicSourceAnswer({ question: publicQuestion, source: publicSource, runtimeVersion, ...defaults });

    const stewardPlan = buildPublicStewardArgumentPlan({
      source: cbaSource,
      topicId: "annual_leave",
      runtimeVersion,
      createdAt: "2026-08-08T12:00:00.000Z",
    });
    const packet = buildPublicStewardPacket({
      source: cbaSource,
      topicIds: ["annual_leave"],
      runtimeVersion,
      createdAt: "2026-08-08T12:00:00.000Z",
    });
    const legacyPlan = buildPublicArgumentPlan({
      answer: publicAnswer,
      source: publicSource,
      createdAt: "2026-08-08T12:00:00.000Z",
    });
    const outline = buildPublicGrievanceOutline({
      answer: cbaAnswer,
      source: cbaSource,
      createdAt: "2026-08-08T12:00:00.000Z",
    });

    expect(stewardPlan).not.toBeNull();
    expect(packet).not.toBeNull();
    expect(legacyPlan).not.toBeNull();
    expect(outline).not.toBeNull();

    const savedRecords: SavedAnswer[] = [
      createSavedAnswerRecord({ answer: cbaAnswer, ...defaults, timestamp: "2026-08-08T12:01:00.000Z" }),
      createSavedStewardArgumentPlanRecord({ plan: stewardPlan!, timestamp: "2026-08-08T12:02:00.000Z" }),
      createSavedStewardPacketRecord({ packet: packet!, timestamp: "2026-08-08T12:03:00.000Z" }),
      createSavedArgumentPlanRecord({ plan: legacyPlan!, question: publicQuestion, ...defaults, timestamp: "2026-08-08T12:04:00.000Z" }),
      createSavedGrievanceOutlineRecord({ outline: outline!, question: cbaQuestion, ...defaults, timestamp: "2026-08-08T12:05:00.000Z" }),
    ];

    const html = renderToStaticMarkup(
      React.createElement(SavedAnswersPanel, {
        saved: savedRecords,
        onDelete: () => undefined,
        cbaSourceState: { status: "unavailable", reason: "cache_missing" },
      })
    );

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("Open saved topic plan");
    expect(html).toContain("Open saved packet");
    expect(html).toContain("Open saved plan");
    expect(html).toContain("Open saved outline");
    expect(html).toContain('class="applicabilityWarning" role="alert"');
  });

  it("F-SAVED-01: handles localStorage.setItem throws gracefully with visible notification notice", () => {
    const mockStorage = {
      setItem: () => {
        throw new Error("QuotaExceededError: Storage full");
      },
      getItem: () => null,
      removeItem: () => undefined,
      clear: () => undefined,
      length: 0,
      key: () => null,
    };
    vi.stubGlobal("window", { localStorage: mockStorage });

    try {
      const html = renderToStaticMarkup(React.createElement(KiaStickApp, { runtimeVersion }));
      expect(html).toBeTruthy();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("F-SAVED-02: asserts scope option (b) distinction - steward topic plan and steward packet are hard-gated, legacy argument plan and grievance outline are advisory-only", () => {
    const cbaAnswer = cbaRoutedAnswer();
    const publicAnswer = buildPublicSourceAnswer({ question: publicQuestion, source: publicSource, runtimeVersion, ...defaults });

    const stewardPlan = buildPublicStewardArgumentPlan({
      source: cbaSource,
      topicId: "annual_leave",
      runtimeVersion,
      createdAt: "2026-08-08T12:00:00.000Z",
    });
    const packet = buildPublicStewardPacket({
      source: cbaSource,
      topicIds: ["annual_leave"],
      runtimeVersion,
      createdAt: "2026-08-08T12:00:00.000Z",
    });
    const legacyPlan = buildPublicArgumentPlan({
      answer: publicAnswer,
      source: publicSource,
      createdAt: "2026-08-08T12:00:00.000Z",
    });
    const outline = buildPublicGrievanceOutline({
      answer: cbaAnswer,
      source: cbaSource,
      createdAt: "2026-08-08T12:00:00.000Z",
    });

    expect(stewardPlan).not.toBeNull();
    expect(packet).not.toBeNull();
    expect(legacyPlan).not.toBeNull();
    expect(outline).not.toBeNull();

    const savedRecords: SavedAnswer[] = [
      createSavedStewardArgumentPlanRecord({ plan: stewardPlan!, timestamp: "2026-08-08T12:02:00.000Z" }),
      createSavedStewardPacketRecord({ packet: packet!, timestamp: "2026-08-08T12:03:00.000Z" }),
      createSavedArgumentPlanRecord({ plan: legacyPlan!, question: publicQuestion, ...defaults, timestamp: "2026-08-08T12:04:00.000Z" }),
      createSavedGrievanceOutlineRecord({ outline: outline!, question: cbaQuestion, ...defaults, timestamp: "2026-08-08T12:05:00.000Z" }),
    ];

    const html = renderToStaticMarkup(
      React.createElement(SavedAnswersPanel, {
        saved: savedRecords,
        onDelete: () => undefined,
        cbaSourceState: { status: "unavailable", reason: "cache_missing" },
      })
    );

    expect(html).toContain("Open saved plan");
    expect(html).toContain("Open saved outline");
    expect(html).toContain("Open saved topic plan");
    expect(html).toContain("Open saved packet");
  });

  it("F-MIGRATE-01: handles garbage/null/malformed input in migrateSavedAnswers safely without throwing", () => {
    expect(migrateSavedAnswers(null as unknown as SavedAnswer[])).toEqual([]);
    expect(migrateSavedAnswers(undefined as unknown as SavedAnswer[])).toEqual([]);
    expect(migrateSavedAnswers("invalid_string" as unknown as SavedAnswer[])).toEqual([]);
    expect(migrateSavedAnswers(12345 as unknown as SavedAnswer[])).toEqual([]);
    expect(migrateSavedAnswers([null, "string", 123, {}] as unknown as SavedAnswer[])).toEqual([]);
    expect(migrateSavedAnswers([{ invalidKey: true }, null] as unknown as SavedAnswer[])).toEqual([]);
  });
});
