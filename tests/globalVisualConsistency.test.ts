import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const css = readFileSync("app/globals.css", "utf8");
const ui = readFileSync("components/KiaStickApp.tsx", "utf8");
const polish = css.slice(css.indexOf("/* UX-4 visual polish:"));
describe("UX-4 visual consistency contracts (visual review remains required)", () => {
  it("defines a small semantic type/control scale using existing fonts and palette", () => {
    for (const token of ["content-max-readable", "control-height", "control-padding-inline", "action-gap", "stack-gap", "type-page", "type-section", "type-body", "type-label", "type-small", "weight-body", "weight-label", "weight-heading", "weight-button"]) expect(polish).toContain(`var(--${token})`);
    expect(polish).toContain("--control-height: 44px");
    expect(polish).toContain("--weight-body: 400");
    expect(polish).not.toMatch(/#[0-9a-f]{3,8}\b|@font-face|font-family:/i);
    for (const token of ["warning", "warning-bg", "warning-border", "text-primary", "input-bg", "border-subtle", "bg-surface", "bg-elevated", "focus", "hover-bg", "radius-md"]) expect(polish).toContain(`var(--${token})`);
  });
  it("bounds source controls while leaving their card content wide", () => {
    expect(polish).toContain(".publicSourceHeader .button { flex: 0 1 auto; width: auto; }");
    expect(polish).toContain(".workflowTopicCard .button { width: fit-content;");
    expect(polish).toContain("max-width: var(--content-max-readable)");
    expect(polish).toContain(".publicSourceCard { padding: 16px; }");
    expect(polish).not.toMatch(/\.publicSourceCard\s*\{[^}]*max-width/);
  });
  it("uses intentional full-width phone action stacks, consistent targets and icon exceptions", () => {
    const phone = polish.slice(polish.indexOf("@media screen and (max-width: 640px)"));
    for (const group of [".compactActions", ".packetWorkspaceActions", ".workProductHeaderActions", ".chatActions", ".packetSaveConfirmation", ".savedPlanActions", ".publicSourceHeader"]) expect(phone).toContain(group);
    expect(phone).toContain("flex-direction: column; align-items: stretch");
    expect(phone).toContain("width: 100%; flex: 0 1 auto; margin-left: 0");
    expect(phone).toContain("white-space: normal; text-align: left");
    expect(polish).toContain(".button.iconOnly, .shellIconButton, .packetSelectedTopic .button");
    expect(polish).toContain("min-width: var(--control-height)");
  });
  it("retains disclosure, save handoff, theme, radius and panel contracts", () => {
    for (const value of ["packetTechnicalDetails", "packetFullSections", "sourceTechnicalDetails", "sourceWorkflows", "Saved to Library.", "Open in Library", "savedPacketHighlighted", "setLibraryPacketTarget", "<WorkProductPanel"]) expect(ui).toContain(value);
    for (const value of ['--radius-sm: 4px', '--radius-md: 8px', '--radius-lg: 14px', ':root[data-theme="dark"]', ':root:not([data-theme="light"])']) expect(css).toContain(value);
    expect(polish).not.toMatch(/(?:^|[;{])\s*content:\s*|display:\s*none|visibility:\s*hidden/);
  });
});
