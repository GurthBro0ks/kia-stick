import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { WorkProductPanel } from "../components/WorkProductPanel";
import { KiaStickApp, PublicStewardPacketView } from "../components/KiaStickApp";
import { buildPublicStewardPacket } from "../lib/publicStewardPacket";
import { createCbaSourceFixtureCache } from "./fixtures/cbaSourceFixture";
import { clientVersion } from "../lib/version";

const source = readFileSync("components/KiaStickApp.tsx", "utf8");
const panel = readFileSync("components/WorkProductPanel.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

describe("optional Steward Packet work product", () => {
  it("starts with conversation and keeps Packets navigation without a panel", () => {
    const html = renderToStaticMarkup(React.createElement(KiaStickApp));
    expect(html).toContain('aria-label="Current conversation"');
    expect(html).toContain('aria-label="Packets"');
    expect(html).not.toContain('id="steward-work-product"');
  });

  it("wraps the exact existing verified packet content and preserves all actions", () => {
    const source = createCbaSourceFixtureCache();
    const packet = buildPublicStewardPacket({ source, topicIds: ["annual_leave"], runtimeVersion: clientVersion })!;
    const view = React.createElement(PublicStewardPacketView, { packet, source, onSave() {}, onCitationNavigate() {} });
    const content = renderToStaticMarkup(view);
    const html = renderToStaticMarkup(React.createElement(WorkProductPanel, { title: packet.title, onClose() {}, onFullView() {}, children: view }));
    expect(html).toContain(content);
    for (const action of ["Copy packet as plain text", "Download packet as Markdown", "Print verified packet", "Save steward packet", "Close Steward Packet", "Back to conversation", "Open full view"]) expect(html).toContain(action);
    expect(html).toContain(packet.title);
  });

  it("keeps close separate from packet/thread/topic state and uses one shared workspace", () => {
    expect(source).toContain('onClose={() => setWorkPanelOpen(false)}');
    expect(source).toContain('const panelVisible = tab === "chat" && workPanelOpen');
    expect(source.match(/\{packetWorkspace\}/g)).toHaveLength(2);
    expect(source).toContain('onFullView={() => setTab("packets")}');
    expect(panel).not.toMatch(/localStorage|setStewardPacket|setThread|setPacketTopicIds/);
    expect(panel).toContain('event.key === "Escape"');
    expect(panel).toContain('opener.focus({ preventScroll: true })');
  });

  it("retains wide split and a single content surface below desktop with shared theme tokens", () => {
    expect(css).toContain('@media (min-width: 1200px)');
    expect(css).toContain('.workProductPanel { flex: 0 0 42%; }');
    expect(css).toContain('.workProductLayoutOpen > .conversationWorkspace { display: none; }');
    expect(css).toContain('background: var(--bg-surface); border-left: 1px solid var(--border-subtle)');
    expect(css).toContain('.workProductBody .publicStewardPacket { border-radius: var(--radius-lg); }');
  });
});
