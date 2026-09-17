import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AssistantMessageCard, KiaStickApp } from "../components/KiaStickApp";
import { buildAnswer } from "../lib/answerGovernor";
import { createAssistantMessage } from "../lib/conversationModel";

const options = { mode: "Strict Research" as const, scope: "Official-Like" as const, detail: "Detailed" as const };
const source = readFileSync("components/KiaStickApp.tsx", "utf8");
function card(question: string) {
  const answer = buildAnswer(question, options);
  const message = createAssistantMessage({ threadId: "ux2-test", turnId: "turn-test", parentMessageId: "user-test", answer, modeScopeDetail: options, now: "2026-09-17T01:00:00Z" });
  return { answer, html: renderToStaticMarkup(React.createElement(AssistantMessageCard, { message, onRetry() {}, onSave() {}, canBuildArgument: true, canBuildGrievanceOutline: true, canBuildStewardArgumentPlan: true, onAddToStewardPacket() {} })) };
}

describe("UX-2 conversation presentation preservation", () => {
  it("keeps metadata inside closed technical details after answer, sources, next steps and actions", () => {
    const { answer, html } = card("Can annual leave be denied after I submitted inside the fake window?");
    const technical = html.match(/<details class="answerTechnicalDetails">([\s\S]*?)<\/details>/)?.[1];
    expect(technical).toBeDefined();
    for (const value of ["Selected lane:", "Actual lane:", "Provider:", "Prompt:", answer.version.provider, answer.version.promptVersion, "AnswerLane:", answer.footer.replaceAll("&", "&amp;")]) expect(technical).toContain(value);
    const visible = html.replace(/<details class="answerTechnicalDetails">[\s\S]*?<\/details>/, "");
    for (const value of ["Selected lane:", "Actual lane:", "Provider:", "Prompt:", "AnswerLane:"]) expect(visible).not.toContain(value);
    const sequence = ["shortAnswer", "Supporting sources", "What to do next", "Save to Library", "Technical details"].map(x => html.indexOf(x));
    expect(sequence.every(x => x >= 0)).toBe(true);
    expect(sequence).toEqual([...sequence].sort((a,b) => a-b));
    for (const citation of answer.citations) expect(visible).toContain(citation.title);
    for (const action of ["Show citations", "Show full packet", "Build cited argument", "Build cited grievance outline", "Build topic argument plan", "Add topic to steward packet"]) expect(visible).toContain(action);
  });

  it("preserves the full safety boundary and puts the unchanged lane selector in closed options", () => {
    const html = renderToStaticMarkup(React.createElement(KiaStickApp));
    expect(html).toContain("Fake samples / public data only — no private data");
    expect(html).toContain('<details class="safetyNoticeDetails">');
    expect(html).toContain("Fake sample mode remains isolated. PUBLIC DATA PILOT: two exact allowlisted official sources, local read-only, no private data. No cloud keys, real uploads, or unrestricted real-doc gate are active.");
    const optionsHtml = html.match(/<details class="composerDisclosure">([\s\S]*?)<\/details>/)?.[1];
    expect(optionsHtml).toContain("Answer lane");
    for (const value of ["auto", "cba", "nlrb", "fake"]) expect(optionsHtml).toContain(`value="${value}"`);
    expect(optionsHtml).toContain('value="auto" selected=""');
    expect(source).toContain('onChange={(event) => setChatSourceMode(event.target.value as ChatSourcePolicy)}');
  });

  it("preserves save guards and underlying save, packet and citation callbacks", () => {
    const { html } = card("What evidence should I get?");
    expect(html).toContain("No answer to save");
    expect(html).toContain("disabled");
    for (const binding of ["onClick={onSave}", "onClick={onBuildArgument}", "onClick={onBuildGrievanceOutline}", "onClick={onBuildStewardArgumentPlan}", "onClick={onAddToStewardPacket}", "onClick={() => onCitationNavigate(citation)}", "onSave={() => saveAssistantAnswer(message)}"]) expect(source).toContain(binding);
  });
});
