import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssistantMessageCard } from "../components/KiaStickApp";
import { buildAnswer } from "../lib/answerGovernor";
import { createAssistantMessage } from "../lib/conversationModel";

const options = { mode: "Strict Research" as const, scope: "Official-Like" as const, detail: "Detailed" as const };
function card(question: string) {
  const answer = buildAnswer(question, options);
  const message = createAssistantMessage({ threadId: "ux2-test", turnId: "turn-test", parentMessageId: "user-test", answer, modeScopeDetail: options, now: "2026-09-17T01:00:00Z" });
  return { answer, html: renderToStaticMarkup(React.createElement(AssistantMessageCard, { message, onRetry() {}, onSave() {}, canBuildArgument: true, canBuildGrievanceOutline: true, canBuildStewardArgumentPlan: true, onAddToStewardPacket() {} })) };
}

describe("answer progressive disclosure", () => {
  it("reserves scrollbar width on the persistent chat scroll container with scoped flow rules", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain(".conversationShell .chatMain { scrollbar-gutter: stable; }");
    expect(css).toContain(".chatMain .assistantBubble > :is(.answerActions, .answerSources, .answerTechnicalDetails)");
    expect(css).toContain("display: block; margin: 8px 0 0; padding: 0; border: 0; background: transparent;");
    const source = readFileSync("components/KiaStickApp.tsx", "utf8");
    expect(source).toContain('className={tab === "chat" ? "mainArea chatMain" : "mainArea"} ref={chatScrollRef}');
  });
  it("keeps guidance visible and groups all actions inside a separate closed disclosure", () => {
    const { answer, html } = card("Can annual leave be denied after I submitted inside the fake window?");
    const evidence = html.match(/<details class="answerSources packetDisclosure" aria-label="Supporting sources">([\s\S]*?)<\/details>/)?.[1];
    expect(evidence).toBeDefined();
    expect(evidence).toContain("<summary>Sources &amp; citations</summary>");
    expect(evidence).toContain("Show citations");
    for (const citation of answer.citations) expect(evidence).toContain(citation.title);
    const visible = html.replace(/<details[\s\S]*?<\/details>/g, "");
    const actions = html.match(/<details class="answerActions">([\s\S]*?)<\/details>/)?.[1];
    expect(actions).toContain("<summary>Actions</summary>");
    for (const label of ["Short answer", "Confidence / authority", "What to do next"]) {
      expect(visible).toContain(label);
      expect(actions).not.toContain(label);
    }
    for (const label of ["Build cited argument", "Build cited grievance outline", "Build topic argument plan", "Add topic to steward packet", "Show full packet", "Save to Library"]) {
      expect(visible).not.toContain(label);
      expect(actions).toContain(label);
      expect(html.split(label)).toHaveLength(2);
      expect(evidence).not.toContain(label);
    }
    const sequence = ["Short answer", "Confidence / authority", "What to do next", "<summary>Actions</summary>", "Sources &amp; citations", "<summary>Technical details</summary>"].map(label => html.indexOf(label));
    expect(sequence.every(index => index >= 0)).toBe(true);
    expect(sequence).toEqual([...sequence].sort((a, b) => a - b));
    expect(html.indexOf("What to do next")).toBeLessThan(html.indexOf("Sources &amp; citations"));
    expect(html).toContain('<details class="answerTechnicalDetails">');
    expect(html).not.toMatch(/<details[^>]*\bopen(?:=|\s|>)/);
  });

  it("preserves visible no-answer explanation and disabled save", () => {
    const { answer, html } = card("What evidence should I get?");
    expect(answer.noAnswer).toBe(true);
    const visible = html.replace(/<details[\s\S]*?<\/details>/g, "");
    expect(visible).toContain(answer.shortAnswer);
    expect(visible).toContain("No Library record is created for no-answer responses.");
    expect(visible).toContain("Confidence / authority");
    expect(visible).toContain("What to do next");
    expect(visible).not.toContain("No answer to save");
    const actions = html.match(/<details class="answerActions">([\s\S]*?)<\/details>/)?.[1];
    expect(actions).toContain("No answer to save");
    expect(actions).toContain('disabled=""');
  });
});
