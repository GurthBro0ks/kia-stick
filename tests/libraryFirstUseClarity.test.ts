import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  deleteLibraryItemWithConfirmation,
  KiaStickApp,
  libraryItemCopy,
  SavedAnswersPanel,
} from "../components/KiaStickApp";

const appSource = readFileSync("components/KiaStickApp.tsx", "utf8");
const shellSource = readFileSync("components/AppShell.tsx", "utf8");
const design = readFileSync("DESIGN.md", "utf8");

describe("UX-6 Library and first-use clarity", () => {
  it("uses Library terminology and plain-language empty copy", () => {
    const html = renderToStaticMarkup(React.createElement(SavedAnswersPanel, {
      saved: [],
      onDelete: () => undefined,
    }));

    expect(html).toContain("<h2>Library</h2>");
    expect(html).toContain('aria-label="Library filters"');
    expect(html).toContain("0 items");
    expect(html).toContain("Nothing in your Library yet.");
    expect(html).toContain("Save an answer or Steward Packet and it will appear here.");
    expect(html).not.toContain("Saved to Library.");
    expect(html).not.toContain("Open in Library");
    expect(html).not.toContain("No saved fake answers yet");
    expect(appSource).not.toContain('<PanelHeader title="Saved"');
    expect(design).toContain("Primary surfaces: Conversation, Sources, Library");
    expect(design).toContain("Use stable nouns for primary surfaces: Conversation, Sources, Library");
  });

  it("keeps packet save feedback on origin surfaces but never renders it in Library", () => {
    const packetsRoute = appSource.slice(appSource.indexOf('{tab === "packets"'), appSource.indexOf('{tab === "sources"'));
    const sourcesRoute = appSource.slice(appSource.indexOf('{tab === "sources"'), appSource.indexOf('{tab === "saved"'));
    const libraryRoute = appSource.slice(appSource.indexOf('{tab === "saved"'), appSource.indexOf('{tab === "upload"'));
    const libraryPanel = appSource.slice(appSource.indexOf("export function SavedAnswersPanel"), appSource.indexOf("export function VaultPanel"));

    expect(appSource).toContain("const packetSaveConfirmation = saveNotice?.savedPacketId ? (");
    expect(appSource).toContain('>Open in Library</button>');
    expect(packetsRoute).toContain("{packetSaveConfirmation}");
    expect(sourcesRoute).toContain("saveConfirmation={packetSaveConfirmation}");
    expect(appSource).toContain("{packetSaveConfirmation}\n          {saveNotice && !saveNotice.savedPacketId");
    expect(libraryRoute).not.toContain("saveConfirmation");
    expect(libraryPanel).not.toContain("saveConfirmation");
  });

  it("provides item-aware delete copy for every existing Library type", () => {
    expect(libraryItemCopy({ id: "answer", savedType: "answer" })).toEqual({ display: "Answer", deleteNoun: "saved answer" });
    expect(libraryItemCopy({ id: "plan", savedType: "public_argument_plan" })).toEqual({ display: "Argument Plan", deleteNoun: "argument plan" });
    expect(libraryItemCopy({ id: "topic-plan", savedType: "public_steward_argument_plan" })).toEqual({ display: "Topic Argument Plan", deleteNoun: "topic argument plan" });
    expect(libraryItemCopy({ id: "outline", savedType: "public_grievance_outline" })).toEqual({ display: "Grievance Outline", deleteNoun: "grievance outline" });
    expect(libraryItemCopy({ id: "packet", savedType: "public_steward_packet_plan" })).toEqual({ display: "Steward Packet", deleteNoun: "Steward Packet" });
    expect(appSource).toContain('aria-label={`Delete ${itemCopy.deleteNoun}`}');
    expect(appSource).not.toContain('aria-label="Delete saved answer"');
  });

  it("preserves an item on cancel and invokes the existing delete callback only on confirm", () => {
    const onDelete = vi.fn();
    const packet = { id: "packet", savedType: "public_steward_packet_plan" as const };
    const cancel = vi.fn(() => false);

    expect(deleteLibraryItemWithConfirmation(packet, onDelete, cancel)).toBe(false);
    expect(cancel).toHaveBeenCalledWith("Delete this Steward Packet?");
    expect(onDelete).not.toHaveBeenCalled();

    const confirm = vi.fn(() => true);
    expect(deleteLibraryItemWithConfirmation(packet, onDelete, confirm)).toBe(true);
    expect(confirm).toHaveBeenCalledWith("Delete this Steward Packet?");
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledWith("packet");
  });

  it("shows compact examples using the same shortcut list and selection handler as Tools", () => {
    const html = renderToStaticMarkup(React.createElement(KiaStickApp));
    const emptyState = html.slice(html.indexOf('class="emptyChatState"'), html.indexOf('class="composerHeader"'));

    expect(emptyState).toContain("Ask KIA Stick");
    expect(emptyState).toContain("Try an example");
    expect(emptyState).toContain('aria-label="Example questions"');
    expect(emptyState.match(/class="promptChip"/g)).toHaveLength(3);
    expect(appSource).toContain("promptShortcuts.slice(0, 3).map");
    expect(appSource).toContain("{promptShortcuts.map((prompt) => (");
    expect(appSource.match(/onClick=\{\(\) => selectPromptShortcut\(prompt\)\}/g)).toHaveLength(2);
    const handler = appSource.slice(appSource.indexOf("function selectPromptShortcut"), appSource.indexOf("useEffect", appSource.indexOf("function selectPromptShortcut")));
    expect(handler).toContain("setDraft(prompt)");
    expect(handler).toContain("composerInputRef.current?.focus()");
    expect(handler).not.toContain("sendMessage");
  });

  it("labels Pinned and Projects as unavailable without adding controls or storage", () => {
    expect(shellSource).toContain('<h2>Pinned</h2><p>Coming later</p>');
    expect(shellSource).toContain('<h2>Projects</h2><p>Coming later</p>');
    expect(shellSource).not.toContain("Nothing pinned yet");
    expect(shellSource).not.toContain("No projects yet");
    expect(shellSource).not.toContain("localStorage");
  });
});
