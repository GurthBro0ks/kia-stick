import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PublicStewardPacketView, SourcesPanel, SavedAnswersPanel } from "../components/KiaStickApp";
import { buildPublicStewardPacket } from "../lib/publicStewardPacket";
import { createSavedStewardPacketRecord, upsertSavedAnswer } from "../lib/savedAnswers";
import { createCbaSourceFixtureCache } from "./fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "./fixtures/publicSourceFixture";
import { clientVersion } from "../lib/version";

const source = createCbaSourceFixtureCache();
const packet = buildPublicStewardPacket({ source, topicIds: ["annual_leave"], runtimeVersion: clientVersion })!;
const code = readFileSync("components/KiaStickApp.tsx", "utf8");
const renderPacket = () => renderToStaticMarkup(React.createElement(PublicStewardPacketView, {packet, source, onCitationNavigate() {}, onSave() {}}));

describe("operator QA packet, source and saved-work simplification", () => {
  it("keeps packet purpose and every action outside collapsed technical and full-section disclosures", () => {
    const html = renderPacket();
    expect(html).toContain("What this packet helps with:");
    expect(html).toMatch(/<details class="packetDisclosure packetTechnicalDetails"><summary>Packet details<\/summary>[\s\S]*?Packet identity:[\s\S]*?<\/details>/);
    expect(html).toMatch(/<details class="packetDisclosure packetFullSections"><summary>Full packet sections/);
    const withoutDetails = html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, "");
    expect(withoutDetails.replace(/<[^>]*>/g, "")).not.toContain(packet.id);
    for (const action of ["Copy packet as plain text", "Download packet as Markdown", "Print verified packet", "Save steward packet"]) expect(withoutDetails).toContain(action);
    for (let n = 1; n <= 12; n++) expect(html).toContain(`>${n}. `);
    expect(html).toContain(packet.sourceInstanceIds[0]);
    expect(html).toContain(packet.sourceAppendix[0].paragraphId);
  });

  it("leads source cards with plain descriptions and preserves hashes in closed disclosures", () => {
    const html = renderToStaticMarkup(React.createElement(SourcesPanel, {
      cbaSourceState: {status: "available", source},
      publicSourceState: {status: "available", source: createPublicSourceFixtureCache()},
      sourceHierarchyGroups: [], runtimeVersion: clientVersion,
      onAskCbaQuestion() {}, onAskSource() {}, onTogglePacketTopic() {},
    }));
    expect(html.match(/<details class="packetDisclosure sourceTechnicalDetails">/g)).toHaveLength(2);
    expect(html).not.toMatch(/<details[^>]*\bopen(?:=|>)/);
    expect(html).toContain("What you can use this for:");
    expect(html).toContain("Supported topics:");
    expect(html).toContain("Explore supported topics and workflows");
    for (const text of ["Source SHA-256", "Normalized SHA-256", "PDF SHA-256", "Source-instance algorithm", "Official PDF", "Official NLRB page", "Ask KIA Stick about this", "Select for packet"]) expect(html).toContain(text);
    expect(html.indexOf('sourceTechnicalDetails')).toBeLessThan(html.indexOf(source.response.sha256));
  });

  it("offers explicit Library navigation only after a successful existing save, without duplicate records", () => {
    const save = code.slice(code.indexOf("  function saveStewardPacketWorkspace"), code.indexOf("  function updateStewardPacketStep"));
    expect(save.indexOf("if (!publicStewardPacketExportEligibility")).toBeLessThan(save.indexOf("createSavedStewardPacketRecord"));
    expect(save).toContain("upsertSavedAnswer(current, record)");
    expect(save).toContain("savedPacketId: result.record.id");
    expect(save).toContain('"Saved to Library."');
    expect(save).not.toContain('setTab(');
    expect(code).toContain('setLibraryPacketTarget(saveNotice.savedPacketId!)');
    expect(code).toContain('>Open in Library</button>');
    const record = createSavedStewardPacketRecord({packet, timestamp: "2026-09-17T00:00:00.000Z"});
    const first = upsertSavedAnswer([], record);
    const second = upsertSavedAnswer(first.saved, record);
    expect(second.saved).toHaveLength(1);
    expect(second.saved[0].id).toBe(record.id);
    expect(second.status).toBe("duplicate");
    const html = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {saved: second.saved, highlightedPacketId: record.id, cbaSourceState: {status: "available", source}, onDelete() {}}));
    expect(html).toContain('savedPacketHighlighted');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('Your saved packet');
    expect(html).toContain('Close saved packet');
    expect(html).toContain('<details class="packetDisclosure savedPacketDetails"><summary>Saved packet details</summary>');
    const legacy = {...record, id: "existing-packet-identity"};
    expect(upsertSavedAnswer([legacy], record).record.id).toBe(legacy.id);
  });

  it("reveals collapsed print content and restores disclosure state without changing serialization", () => {
    const view = code.slice(code.indexOf("export function PublicStewardPacketView"), code.indexOf("function authoritySummary"));
    expect(view).toContain('publicStewardPacketToText(packet)');
    expect(view).toContain('publicStewardPacketToMarkdown(packet)');
    expect(view).toContain('details.open = true');
    expect(view).toContain('finally {');
    expect(view).toContain('details.open = previouslyOpen[index]');
  });
});
