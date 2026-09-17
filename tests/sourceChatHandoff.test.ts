import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { SourcesPanel, addChatTopicToPacketSelection } from "../components/KiaStickApp";
import { buildSourceHierarchyGroups } from "../lib/sourceModel";
import { clientVersion } from "../lib/version";

const source = readFileSync("components/KiaStickApp.tsx", "utf8");
function handler(name: string, bindings: Record<string, unknown>) {
  const tree = ts.createSourceFile("app.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let code = "";
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) code = node.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  expect(code).not.toBe("");
  return new Function(...Object.keys(bindings), ts.transpile(code, { target: ts.ScriptTarget.ES2022 }) + `;return ${name};`)(...Object.values(bindings));
}

describe("UX-3 UI handoffs", () => {
  it("prepares an explicit editable prompt without overwriting an unfinished draft or sending", () => {
    let draft = "My unfinished question";
    const setSourceHandoff = vi.fn(), setChatSourceMode = vi.fn(), setTab = vi.fn();
    const prepare = handler("prepareSourceQuestion", {
      setDraft: (update: (value: string) => string) => { draft = update(draft); },
      setSourceHandoff, setChatSourceMode, setTab,
    });
    prepare("Fake source", "Visible source reference", "fake");
    expect(draft).toBe("My unfinished question\n\nVisible source reference");
    expect(setSourceHandoff).toHaveBeenCalledWith("Fake source");
    expect(setChatSourceMode).toHaveBeenCalledWith("fake");
    expect(setTab).toHaveBeenCalledWith("chat");
  });

  it("routes fake citation identity to the matching source row", () => {
    const scrollIntoView = vi.fn(), setTab = vi.fn();
    const getElementById = vi.fn(() => ({ scrollIntoView }));
    handler("navigateToCitation", { setTab, document: { getElementById }, window: { setTimeout: (f: () => void) => f() } })({id: "fake-id"});
    expect(setTab).toHaveBeenCalledWith("sources");
    expect(getElementById).toHaveBeenCalledWith("fake-source-fake-id");
    expect(scrollIntoView).toHaveBeenCalledOnce();
  });

  it("lands additions and duplicate selections in Packets while retaining the three-topic guard", () => {
    for (const selected of [[], ["overtime"], ["annual_leave", "sick_leave", "safety_health"]]) {
      const setTab = vi.fn(), setPacketTopicIds = vi.fn(), setStewardPacket = vi.fn(), setSaveNotice = vi.fn();
      handler("addChatTopicToPacket", { packetTopicIds: selected, addChatTopicToPacketSelection, setTab, setPacketTopicIds, setStewardPacket, setSaveNotice })("overtime");
      if (selected.length === 3) {
        expect(setTab).not.toHaveBeenCalled();
        expect(setPacketTopicIds).not.toHaveBeenCalled();
        expect(setSaveNotice).toHaveBeenCalled();
      } else {
        expect(setTab).toHaveBeenCalledWith("packets");
        if (selected.length) expect(setStewardPacket).not.toHaveBeenCalled();
        else expect(setPacketTopicIds).toHaveBeenCalledWith(["overtime"]);
      }
    }
  });

  it("keeps source identities and metadata alongside discoverable conversation actions", () => {
    const groups = buildSourceHierarchyGroups();
    const html = renderToStaticMarkup(React.createElement(SourcesPanel, { sourceHierarchyGroups: groups, runtimeVersion: clientVersion, onAskSource() {}, onReturnToChat() {} }));
    for (const doc of groups.flatMap(group => group.docs)) {
      expect(html).toContain(`id="fake-source-${doc.id}"`);
      expect(html).toContain(`source id ${doc.id}`);
    }
    expect(html.match(/Ask KIA Stick about this/g)).toHaveLength(groups.flatMap(group => group.docs).length);
    expect(html).toContain("Back to conversation");
    expect(source).toContain("A visible prompt has been added below");
    expect(source).toContain("Conversation text and case facts are not added");
  });
});
