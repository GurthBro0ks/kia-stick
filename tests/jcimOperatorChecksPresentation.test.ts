import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as packetModule from "@/lib/publicStewardPacket";
import { buildPublicStewardPacket, publicStewardPacketToMarkdown, publicStewardPacketToText } from "@/lib/publicStewardPacket";
import { KiaStickApp, PublicStewardPacketView } from "@/components/KiaStickApp";
import { jcimPacketSourceVerifier, jcimTopicCitation } from "@/lib/jcimSource";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCacheWithArticle19 } from "@/tests/fixtures/cbaSourceArticle19Fixture";
import { createJcimSourceFixtureCache } from "@/tests/fixtures/jcimSourceFixture";

// KIA-jcim-operator-checks-1: presentation-only Section 11 de-duplication and source-count copy.
// Synthetic fixtures only; packets are built at runtime. Stored data and identity must not change.
const NEW =
  "This public pilot verifies only the admitted public sources and citations cited here. It does not determine whether a JCIM interpretation, LMOU, handbook rule, arbitration precedent, management policy, or local practice applies to a particular case.";
const OLD = "This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, or local practice.";
const OVERTIME_OLD_PREFIX = "This CBA-only pilot does not verify an LMOU, JCIM interpretation, handbook rule, arbitration precedent, management policy, local practice, or worked-off-assignment theory";

const cba = createCbaSourceFixtureCacheWithArticle19();
const jcim = createJcimSourceFixtureCache();
const verifier = jcimPacketSourceVerifier(jcim);
const version = createRuntimeVersion({ buildDate: "20261017", gitSha: "jcimops1" });
const createdAt = "2026-10-17T13:00:00.000Z";

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const section11 = (output: string) => output.split("11. Limitations and unsupported scope")[1].split("12. Complete verified-current source appendix")[0];

function threeTopicPacket() {
  const supplementalCitations = [
    ...jcimTopicCitation(jcim, "discipline_just_cause"),
    ...jcimTopicCitation(jcim, "steward_grievance_handling"),
  ];
  return buildPublicStewardPacket({
    source: cba,
    topicIds: ["discipline_just_cause", "overtime", "steward_grievance_handling"],
    runtimeVersion: version,
    createdAt,
    supplementalCitations,
    supplementalSourceVerifiers: [verifier],
  })!;
}

function singleTopicPacket(topicId: "overtime" | "discipline_just_cause") {
  return buildPublicStewardPacket({ source: cba, topicIds: [topicId], runtimeVersion: version, createdAt })!;
}

function view(packet: ReturnType<typeof threeTopicPacket>) {
  return renderToStaticMarkup(React.createElement(PublicStewardPacketView, {
    packet, source: cba, supplementalSourceVerifiers: [verifier], onCitationNavigate: () => undefined,
  }));
}

describe("JCIM operator checks: Section 11 shows each display sentence once (presentation only)", () => {
  it("(a) the three-topic JCIM packet shows the mapped sentence exactly once in UI, plain text and Markdown", () => {
    const packet = threeTopicPacket();
    expect(packet.supplementalSourceAppendix?.length).toBeGreaterThan(0);
    // Precondition: two different stored legacy literals both map to the same display sentence.
    expect(packet.limitations.filter((item) => item.text === OLD)).toHaveLength(1);
    expect(packet.limitations.filter((item) => item.text.startsWith(OVERTIME_OLD_PREFIX))).toHaveLength(1);
    for (const output of [view(packet), publicStewardPacketToText(packet), publicStewardPacketToMarkdown(packet)]) {
      const limits = section11(output);
      expect(count(limits, NEW)).toBe(1);
      expect(limits).not.toContain(OLD);
      expect(limits).not.toContain(OVERTIME_OLD_PREFIX);
    }
  });

  it("(b) the merged display entry carries the union of the collapsed entries' citation ids, first-seen order", () => {
    const packet = threeTopicPacket();
    const helper = (packetModule as Record<string, unknown>).publicStewardPacketDisplayLimitations as
      | ((items: typeof packet.limitations) => typeof packet.limitations)
      | undefined;
    expect(typeof helper).toBe("function");
    const collapsed = packet.limitations.filter((item) => packetModule.publicStewardPacketLimitationText(item.text) === NEW);
    expect(collapsed).toHaveLength(2);
    const union = [...new Set(collapsed.flatMap((item) => item.citationIds))];
    const display = helper!(packet.limitations);
    const merged = display.filter((item) => item.text === NEW);
    expect(merged).toHaveLength(1);
    expect(merged[0].citationIds).toEqual(union);
    // First-occurrence order of display sentences is preserved and nothing else is dropped.
    const expectedOrder = [...new Set(packet.limitations.map((item) => packetModule.publicStewardPacketLimitationText(item.text)))];
    expect(display.map((item) => item.text)).toEqual(expectedOrder);
    // Every citation of the merged entry is rendered as a link in the UI Section 11.
    const limits = section11(view(packet));
    for (const id of union) expect(limits).toContain(`Open packet citation ${id}`);
  });

  it("(c) rendering leaves packet.limitations, the serialized packet and contentIdentity unchanged", () => {
    const packet = threeTopicPacket();
    const storedLimitations = structuredClone(packet.limitations);
    const serialized = JSON.stringify(packet);
    const identity = packet.contentIdentity;
    view(packet);
    publicStewardPacketToText(packet);
    publicStewardPacketToMarkdown(packet);
    expect(packet.limitations).toEqual(storedLimitations);
    expect(JSON.stringify(packet)).toBe(serialized);
    expect(packet.contentIdentity).toBe(identity);
    expect(threeTopicPacket().contentIdentity).toBe(identity);
    expect(packet.limitations.some((item) => item.text === OLD)).toBe(true);
  });

  it.each(["overtime", "discipline_just_cause"] as const)("(d) single-topic %s packet still shows NEW once and OLD never", (topicId) => {
    const packet = singleTopicPacket(topicId);
    const rendered = renderToStaticMarkup(React.createElement(PublicStewardPacketView, {
      packet, source: cba, onCitationNavigate: () => undefined,
    }));
    for (const output of [rendered, publicStewardPacketToText(packet), publicStewardPacketToMarkdown(packet)]) {
      expect(count(output, NEW)).toBe(1);
      expect(output).not.toContain(OLD);
      expect(output).not.toContain(OVERTIME_OLD_PREFIX);
    }
    expect(section11(publicStewardPacketToText(packet)).trim().split("\n")).toHaveLength(packet.limitations.length);
  });

  it("(e) the UI Sources summary shows 1 CBA + 1 JCIM entry for one instance and 2 JCIM entries for distinct instances", () => {
    const packet = threeTopicPacket();
    const summary = (html: string) => html.split("<strong>Sources:</strong>")[1].split("</p>")[0];
    const one = summary(view(packet));
    expect(one.match(/Controlling contract \(CBA\)/g)).toHaveLength(1);
    expect(one.match(/apwu-usps-jcim-2025/g)).toHaveLength(1);
    const distinct = threeTopicPacket();
    distinct.supplementalSourceAppendix![1].sourceInstanceId += "-distinct";
    expect(summary(view(distinct)).match(/apwu-usps-jcim-2025/g)).toHaveLength(2);
  });

  it("(f) the safety notice and empty-chat copy no longer say two sources", () => {
    const html = renderToStaticMarkup(React.createElement(KiaStickApp));
    expect(html).not.toContain("two exact allowlisted official sources");
    expect(html).not.toContain("the two allowlisted public sources");
    expect(html).toContain("PUBLIC DATA PILOT: three bounded public sources (the APWU-USPS contract, JCIM joint interpretation, and NLRB general guidance), local read-only, no private data.");
    expect(html).toContain("Use fake samples or the three bounded public sources (the APWU-USPS contract, JCIM joint interpretation, and NLRB general guidance); keep private information out.");
  });
});
