import { readFileSync } from "node:fs";
import React from "react";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SourcesPanel } from "../components/KiaStickApp";
import { buildSourceHierarchyGroups } from "../lib/sourceModel";
import { createRuntimeVersion } from "../lib/version";
import { createCbaSourceFixtureCache } from "./fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "./fixtures/publicSourceFixture";

describe("Tools and Sources operator polish", () => {
  it("populates the exact shortcut, closes Tools and focuses the composer without submitting", () => {
    const source = readFileSync("components/KiaStickApp.tsx", "utf8");
    const tree = ts.createSourceFile("app.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler = "";
    function visit(node: ts.Node) {
      if (ts.isArrowFunction(node) && node.getText(tree).includes("setDraft(prompt);")) handler = node.getText(tree);
      ts.forEachChild(node, visit);
    }
    visit(tree);
    expect(handler).not.toBe("");
    const setDraft = vi.fn(), focus = vi.fn(), sendMessage = vi.fn();
    const composerToolsRef = { current: { open: true } };
    const prompt = "What does Article 17 say about representation?";
    const bindings = { setDraft, composerToolsRef, composerInputRef: { current: { focus } }, prompt, sendMessage };
    const run = new Function(...Object.keys(bindings), "return " + ts.transpile(handler, { target: ts.ScriptTarget.ES2022 }))(...Object.values(bindings));
    run();
    expect(setDraft).toHaveBeenCalledExactlyOnceWith(prompt);
    expect(composerToolsRef.current.open).toBe(false);
    expect(focus).toHaveBeenCalledOnce();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("keeps both official references separate from the closed fictional collection without losing details", () => {
    const cba = createCbaSourceFixtureCache();
    const nlrb = createPublicSourceFixtureCache();
    const groups = buildSourceHierarchyGroups();
    const html = renderToStaticMarkup(React.createElement(SourcesPanel, {
      cbaSourceState: { status: "available", source: cba },
      publicSourceState: { status: "available", source: nlrb },
      sourceHierarchyGroups: groups,
      runtimeVersion: createRuntimeVersion({ buildDate: "20260919", gitSha: "polishtest" }),
      onAskCbaQuestion() {}, onAskSource() {}, onTogglePacketTopic() {},
    }));
    const [official, fake] = html.split('<section class="sourceGroup fakeSourceGroup"');
    expect(official).toContain('aria-labelledby="official-public-sources"');
    expect(official).toContain("Official public sources");
    expect(official).toContain("official final APWU USPS CBA source");
    expect(official).toContain("official NLRB public source");
    expect(official).toContain("Controlling contract language");
    expect(official).toContain("does not establish controlling USPS contract rules");
    expect(official.match(/<details class="packetDisclosure sourceTechnicalDetails">/g)).toHaveLength(2);
    expect(official).toContain(cba.response.sha256);
    expect(official).toContain(nlrb.response.sha256);
    expect(official).toContain('<details class="packetDisclosure sourceWorkflows">');
    expect(official).toContain("Select for packet");
    expect(official).toContain("Ask KIA Stick about this workflow");
    expect(fake).toContain("Fictional local examples for testing and demonstration. They are not real authority");
    expect(fake).toContain('<details class="packetDisclosure fakeSourceCollection"><summary>Fake sample collection details</summary>');
    for (const doc of groups.flatMap(group => group.docs)) {
      expect(fake).toContain(`id="fake-source-${doc.id}"`);
      expect(official).not.toContain(`id="fake-source-${doc.id}"`);
    }
    expect(fake).toContain("Context only; cannot support an answer");
    expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
  });
  it("uses one desktop disclosure width and full-width touch targets on phones", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain("--answer-disclosure-width: 20rem");
    expect(css).toContain("width: min(100%, var(--answer-disclosure-width))");
    expect(css).toContain("width: 100%; min-height: var(--control-height)");
  });
});
