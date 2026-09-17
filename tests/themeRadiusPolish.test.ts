import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const css = readFileSync("app/globals.css", "utf8");
describe("UX-2 theme and shape contract", () => {
  it("uses semantic radii for cards, controls, chips and the edge-attached drawer", () => {
    for (const [name, value] of Object.entries({ sm: "4px", md: "8px", lg: "14px", pill: "999px" }))
      expect(css).toContain(`--radius-${name}: ${value}`);
    const declarations = [...css.matchAll(/border-radius:\s*([^;]+);/g)].map(m => m[1]);
    expect(declarations.length).toBeGreaterThan(10);
    expect(declarations.every(value => value === "0" || value.includes("var(--radius-"))).toBe(true);
    for (const selector of [".sidebarItem", ".shellIconButton", ".sidebarMenuContents a", ".settingsSummaryCard", ".sourceCard", ".savedCard", ".mobileSidebarDrawer", ".chatComposerDock", ".messageBubble", ".publicArgumentPlan"])
      expect(css).toMatch(new RegExp(selector.replaceAll(".", "\\.") + "[^{}]*\\{[^}]*border-radius:.*var\\(--radius-"));
    expect(css).toContain('input:not([type="checkbox"]):not([type="radio"])');
  });
  it("keeps explicit Dark and OS Dark token values identical and layered", () => {
    const explicit = css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)?.[1];
    const system = css.match(/:root:not\(\[data-theme="light"\]\) \{([^}]+)\}/)?.[1];
    expect(explicit).toBe(system);
    const layers = ["bg-app", "bg-sidebar", "bg-surface", "bg-elevated", "input-bg", "hover-bg"].map(name => explicit?.match(new RegExp(`--${name}: ([^;]+)`))?.[1]);
    expect(layers.every(Boolean)).toBe(true);
    expect(new Set(layers).size).toBe(layers.length);
    for (const token of ["input-bg", "hover-bg", "button-bg", "button-primary-bg", "button-primary-text", "focus"])
      expect(css).toContain(`var(--${token})`);
  });
});
