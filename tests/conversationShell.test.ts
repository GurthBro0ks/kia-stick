import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { AppShell } from "../components/AppShell";

const app = readFileSync("components/KiaStickApp.tsx", "utf8");
const shell = readFileSync("components/AppShell.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");

describe("conversation shell preservation", () => {
  it("exposes primary and secondary destinations without inventing records", () => {
    const html = renderToStaticMarkup(createElement(AppShell, {
      view: "chat", onNavigate: () => undefined, onNewConversation: () => undefined,
      conversationTitle: "Current test conversation", displayVersion: "test-build", children: "existing panels",
    }));
    for (const label of ["New conversation", "Packets", "Sources", "Library", "Pinned", "Nothing pinned yet", "Projects", "No projects yet", "Chats", "Current test conversation", "Settings", "Advanced / Tools", "Upload", "Vault", "Import", "Version / About", "Appearance", "Light", "Dark", "System"])
      expect(html).toContain(label);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('<dialog');
    expect(html).toContain('aria-label="Navigation"');
    expect(html).toContain("Only the current conversation is stored");
    expect(shell).not.toContain("localStorage");
  });

  it("keeps all panels and live Settings dependencies in the original state owner", () => {
    for (const panel of ["SourcesPanel", "SavedAnswersPanel", "FakeUploadPanel", "VaultPanel", "ImportWizardPanel", "SettingsPanel"])
      expect(app).toContain(`<${panel}`);
    expect(app).toMatch(/<SettingsPanel\s+cbaSourceState=\{cbaSourceState\}\s+publicSourceState=\{publicSourceState\}\s+runtimeVersion=\{runtimeVersion\}/);
    expect(app).toContain('useState<Tab>("chat")');
    expect(app).toContain('ref={chatScrollRef}');
    expect(app).toContain('onNewConversation={startNewChat}');
    expect(app).toContain('Start a new chat and clear the current thread?');
    expect(app).toContain('onCitationNavigate={navigateToCitation} onStepCompletionChange={updateStewardPacketStep}');
    expect(app).toContain("Fake sample mode remains isolated. PUBLIC DATA PILOT:");
  });

  it("uses shell-relative layout and semantic themes, preserving print colors separately", () => {
    for (const token of ["bg-app", "bg-sidebar", "bg-surface", "text-primary", "text-secondary", "border-subtle", "accent", "warning", "danger", "success"])
      expect(css).toContain(`--${token}:`);
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain(':root:not([data-theme="light"])');
    expect(css).toContain('100dvh');
    expect(css).not.toContain('--chat-top-offset');
    expect(css).not.toContain('--bottom-nav-stack');
    expect(css).not.toContain('--chat-composer-height');
    expect(shell).toContain('showModal()');
    expect(shell).toContain('onClose={() => opener.current?.focus()}');
  });
});
