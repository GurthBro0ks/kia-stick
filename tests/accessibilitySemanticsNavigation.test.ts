import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AppShell } from "../components/AppShell";
import { KiaStickApp } from "../components/KiaStickApp";

const appSource = readFileSync("components/KiaStickApp.tsx", "utf8");
const shellSource = readFileSync("components/AppShell.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

describe("UX-8 accessibility semantics and navigation", () => {
  it("mounts one empty polite answer region before a request and keeps the static safety notice intact", () => {
    const html = renderToStaticMarkup(React.createElement(KiaStickApp));
    expect(html.match(/class="answerAnnouncement"/g)).toHaveLength(1);
    expect(html).toContain('<div class="answerAnnouncement" aria-live="polite" aria-atomic="true"></div>');
    expect(html).toContain('<div class="fakeNotice"><svg');
    expect(html).toContain("Fake samples / public data only — no private data");
    expect(html).toContain("Fake sample mode remains isolated. PUBLIC DATA PILOT:");
    expect(html).not.toMatch(/class="fakeNotice"[^>]*(?:role="status"|aria-live=)/);
    expect(html).toContain('<main id="main-content" tabindex="-1"');
  });

  it("updates the region once in each completion path and clears stale text for a new request or retry", () => {
    const complete = appSource.slice(appSource.indexOf("function completeAssistantTurn"), appSource.indexOf("function sendMessage"));
    expect(complete).toContain('setAnswerAnnouncement("Answer ready.")');
    expect(complete).toContain('setAnswerAnnouncement("Answer failed. Please try again.")');
    expect(complete.match(/setAnswerAnnouncement\(/g)).toHaveLength(2);
    expect(complete).not.toContain("setDraft(");
    expect(complete).not.toContain(".focus(");
    expect(complete).not.toContain("answer.shortAnswer");
    const send = appSource.slice(appSource.indexOf("function sendMessage"), appSource.indexOf("function retryAssistant"));
    const retry = appSource.slice(appSource.indexOf("function retryAssistant"), appSource.indexOf("function saveAssistantAnswer"));
    expect(send).toContain('setAnswerAnnouncement("")');
    expect(retry).toContain('setAnswerAnnouncement("")');
    expect(appSource.match(/setAnswerAnnouncement\(/g)).toHaveLength(5);
    expect(appSource).not.toContain('className="messageRow assistantMessage" aria-live=');
    expect(appSource).toContain("composerInputRef.current?.focus()");
    expect(appSource).not.toContain("chatScrollRef.current?.focus()");
  });

  it("puts the skip link first and preserves the mobile drawer and primary heading", () => {
    const html = renderToStaticMarkup(React.createElement(AppShell, {
      view: "chat", onNavigate: () => undefined, onNewConversation: () => undefined,
      conversationTitle: "Current test conversation", displayVersion: "test-build", children: "main content",
    }));
    expect(html).toMatch(/^<div class="appShell conversationShell"><a href="#main-content" class="skipLink">Skip to main content<\/a>/);
    expect(html).toContain('<h1>Conversation</h1>');
    expect(html).toContain('<dialog');
    expect(html).toContain('aria-label="Navigation"');
    expect(shellSource).toContain('onClose={() => opener.current?.focus()}');
    expect(css).toContain(".skipLink:focus-visible");
    expect(css).toContain("clip-path: inset(50%)");
  });

  it("uses navigation labels instead of sidebar headings before the h1", () => {
    const html = renderToStaticMarkup(React.createElement(AppShell, {
      view: "chat", onNavigate: () => undefined, onNewConversation: () => undefined,
      conversationTitle: "Current test conversation", displayVersion: "test-build", children: "main content",
    }));
    for (const label of ["Pinned", "Projects", "Chats"]) {
      expect(html).toContain(`<div class="sidebarSectionLabel">${label}</div>`);
      expect(html).not.toContain(`<h2>${label}</h2>`);
    }
    expect(html).not.toContain("<h2");
    expect(css).toContain(".sidebarSectionLabel { font-size: .7rem; color: var(--muted); font-weight: 600; padding: 0 10px; margin-block: .83em; }");
  });
});
