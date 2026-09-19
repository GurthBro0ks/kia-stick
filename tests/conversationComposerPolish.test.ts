import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KiaStickApp } from "../components/KiaStickApp";

const source = readFileSync("components/KiaStickApp.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const polish = css.slice(css.indexOf("/* UX-4 conversation polish:"));

describe("conversation composer presentation contracts", () => {
  it("groups both existing capabilities inside a closed native Tools disclosure", () => {
    const html = renderToStaticMarkup(React.createElement(KiaStickApp));
    const toolsStart = html.indexOf('<details class="composerTools"><summary>Tools</summary>');
    expect(toolsStart).toBeGreaterThan(0);
    const tools = html.slice(toolsStart, html.indexOf('<div class="chatActions">', toolsStart));
    for (const markup of ['<details class="composerDisclosure">', '<summary>Response options</summary>', '<details class="promptDetails">', '<summary>Prompt shortcuts</summary>', 'Answer lane', 'Mode', 'Scope', 'Detail', 'class="promptChip"']) expect(tools).toContain(markup);
    expect(tools).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
    expect(tools).toContain('value="auto" selected=""');
    expect(html).toContain('aria-label="Message KIA Stick"');
    expect(html).toContain('class="button primary" type="button" disabled=""');
    expect(html).toContain('Send</button>');
  });

  it("retains Send, Enter, Shift+Enter, draft and selection bindings without toggle handlers", () => {
    for (const binding of ['onClick={() => sendMessage()}', 'if (event.key === "Enter" && !event.shiftKey)', 'event.preventDefault();\n                  sendMessage();', 'onChange={(event) => setDraft(event.target.value)}', 'onClick={() => setDraft(prompt)}', 'onChange={(event) => setChatSourceMode(event.target.value as ChatSourcePolicy)}', 'onChange={(event) => setMode(event.target.value as Mode)}', 'onChange={(event) => setScope(event.target.value as Scope)}', 'onChange={(event) => setDetail(event.target.value as Detail)}']) expect(source).toContain(binding);
    expect(source).toContain('<details className="composerTools">');
  });

  it("uses a shared wider workspace with bounded prose and a compact usable phone input", () => {
    expect(polish).toContain('--conversation-workspace-max: 1280px');
    expect(polish).toContain('max-width: calc(var(--conversation-workspace-max) - 48px)');
    expect(polish).toContain('.chatMain .assistantBubble :is(p, li) { max-width: var(--content-max-readable); }');
    expect(polish).toContain('justify-self: end');
    expect(polish).toContain('.composerFooter .chatActions > .button { width: auto;');
    expect(polish).toContain('height: 56px; min-height: 56px; max-height: 120px');
    expect(polish).toContain('min-height: var(--control-height)');
    expect(polish).not.toMatch(/#[0-9a-f]{3,8}\b|position:\s*(fixed|absolute)/i);
  });
});
