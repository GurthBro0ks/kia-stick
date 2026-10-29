import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicStewardPacketView } from "@/components/KiaStickApp";
import { createChatSubmitSnapshot, routeChatQuestion } from "@/lib/chatAnswerRouter";
import { jcimPacketSourceVerifier, jcimTopicCitation } from "@/lib/jcimSource";
import { buildPublicStewardPacket, publicStewardPacketExportEligibility, publicStewardPacketToMarkdown,
  publicStewardPacketToText } from "@/lib/publicStewardPacket";
import { createSavedAnswerRecord, createSavedStewardPacketRecord, migrateSavedAnswers } from "@/lib/savedAnswers";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-early-send-1, test 4: a saved answer, and a packet built without JCIM, carry the "JCIM not checked" disclosure.
const cba = createCbaSourceFixtureCacheWithArticle19();
const jcim = createJcimSourceFixtureCache();
const runtimeVersion = createRuntimeVersion({ buildDate: "20261029", gitSha: "e23ece0" });
const SICK = "How does sick leave work?";
const createdAt = "2026-10-29T12:00:00.000Z";

describe("KIA-jcim-early-send-1 test 4: saved answers and packets made without JCIM", () => {
  it("a saved chat answer made without JCIM carries the disclosure, also after migration", () => {
    const snapshot = createChatSubmitSnapshot({ question: SICK, sourcePolicy: "auto", mode: "Strict Research", scope: "Official-Like", detail: "Detailed" });
    const answer = routeChatQuestion({ question: SICK, snapshot, publicSource: null, cbaSource: cba, jcimSource: null,
      jcimStatus: "unavailable", runtimeVersion } as Parameters<typeof routeChatQuestion>[0]);
    expect(answer.noAnswer).toBe(false);
    const record = createSavedAnswerRecord({ answer, mode: "Strict Research", scope: "Official-Like", detail: "Detailed", timestamp: createdAt });
    expect(record.answer).toMatch(/JCIM not checked: .*unavailable right now/);
    const [migrated] = migrateSavedAnswers([record]);
    expect(migrated.answer).toMatch(/JCIM not checked/);
  });

  it("a packet built without JCIM discloses it in the packet, its text/markdown, its saved record and its view", () => {
    const packet = buildPublicStewardPacket({ source: cba, topicIds: ["sick_leave"], runtimeVersion, createdAt,
      supplementalCitations: jcimTopicCitation(null, "sick_leave"), supplementalSourceVerifiers: [jcimPacketSourceVerifier(null)],
      jcimStatus: "unavailable" } as Parameters<typeof buildPublicStewardPacket>[0])!;
    expect(packet).not.toBeNull();
    const disclosure = (packet as { jcimDisclosure?: string }).jcimDisclosure;
    expect(disclosure).toMatch(/^JCIM not checked: /);
    expect(publicStewardPacketToText(packet)).toContain(disclosure);
    expect(publicStewardPacketToMarkdown(packet)).toContain(`> ${disclosure}`);
    expect(publicStewardPacketExportEligibility(packet, cba, [jcimPacketSourceVerifier(null)])).toEqual({ eligible: true });
    const tampered = { ...packet, jcimDisclosure: undefined };
    expect(publicStewardPacketExportEligibility(tampered, cba, [jcimPacketSourceVerifier(null)]).eligible).toBe(false);
    const record = createSavedStewardPacketRecord({ packet, timestamp: createdAt });
    expect(record.answer).toContain(disclosure);
    const [migratedPacket] = migrateSavedAnswers([record]);
    expect((migratedPacket.stewardPacket as { jcimDisclosure?: string } | undefined)?.jcimDisclosure).toBe(disclosure);
    const html = renderToStaticMarkup(React.createElement(PublicStewardPacketView,
      { packet, source: cba, onCitationNavigate: () => undefined, supplementalSourceVerifiers: [jcimPacketSourceVerifier(null)] }));
    expect(html).toContain("JCIM not checked: this packet was built while the JCIM joint interpretation was not available");
  });

  it("a packet built with JCIM loaded, or without a JCIM status, carries no disclosure", () => {
    const withJcim = buildPublicStewardPacket({ source: cba, topicIds: ["sick_leave"], runtimeVersion, createdAt,
      supplementalCitations: jcimTopicCitation(jcim, "sick_leave"), supplementalSourceVerifiers: [jcimPacketSourceVerifier(jcim)],
      jcimStatus: "available" } as Parameters<typeof buildPublicStewardPacket>[0])!;
    const legacy = buildPublicStewardPacket({ source: cba, topicIds: ["sick_leave"], runtimeVersion, createdAt,
      supplementalCitations: jcimTopicCitation(jcim, "sick_leave"), supplementalSourceVerifiers: [jcimPacketSourceVerifier(jcim)] })!;
    expect("jcimDisclosure" in withJcim).toBe(false);
    expect(withJcim).toEqual(legacy);
    expect(publicStewardPacketToText(withJcim)).not.toMatch(/JCIM not checked/);
  });
});
