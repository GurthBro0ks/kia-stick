import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "../components/AppShell";
import { normalizeAppearance } from "../lib/appearance";

const css = readFileSync("app/globals.css", "utf8");
const shell = readFileSync("components/AppShell.tsx", "utf8");

describe("GUR-120 three visual themes", () => {
  it("adds hybrid beside light, dark, and system and keeps the collapse icon", () => {
    expect(normalizeAppearance("hybrid")).toBe("hybrid");
    expect(normalizeAppearance("light")).toBe("light");
    expect(normalizeAppearance("dark")).toBe("dark");
    expect(normalizeAppearance("system")).toBe("system");
    expect(normalizeAppearance("nope")).toBe("system");
    for (const option of ["hybrid", "light", "dark", "system"]) expect(shell).toContain(`<option value="${option}">`);
    expect(shell).toContain("PanelLeftClose");
    expect(shell).toContain("PanelLeftOpen");
  });

  it("does not invent the reference-only controls", () => {
    const html = renderToStaticMarkup(createElement(AppShell, {
      view: "chat", onNavigate: () => undefined, onNewConversation: () => undefined,
      conversationTitle: "Current test conversation", displayVersion: "test-build", children: "existing panels",
    }));
    for (const absent of ["Training", "Expert", "Suggested by KIA", "Search Sources", "Weingarten"]) expect(html).not.toContain(absent);
    expect(shell).not.toContain("Chat</option>");
  });

  it("paints a light hybrid workspace and a separate dark sidebar", () => {
    const hybrid = css.match(/:root\[data-theme="hybrid"\] \{([^}]+)\}/)?.[1] ?? "";
    const dark = css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)?.[1] ?? "";
    const hybridBg = hybrid.match(/--bg-app:\s*([^;]+)/)?.[1];
    const darkBg = dark.match(/--bg-app:\s*([^;]+)/)?.[1];
    const lightBg = css.match(/--bg-app:\s*([^;]+)/)?.[1];
    expect(hybridBg).toBe("#f3f6fb");
    expect(lightBg).toBe(hybridBg);
    expect(darkBg).toBe("#070f1f");
    expect(hybridBg).not.toBe(darkBg);
    expect(css).toContain(':root[data-theme="hybrid"] :is(.desktopSidebar, .mobileSidebarDrawer)');
    expect(css).toContain("backdrop-filter: blur(16px)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(":focus-visible");
    const explicit = css.match(/:root\[data-theme="dark"\] \{([^}]+)\}/)?.[1];
    const system = css.match(/:root:not\(\[data-theme="light"\]\) \{([^}]+)\}/)?.[1];
    expect(explicit).toBe(system);
  });

  it("recomputes ink and muted on the hybrid sidebar and mobile drawer", () => {
    const block = css.match(/:root\[data-theme="hybrid"\] :is\(\.desktopSidebar, \.mobileSidebarDrawer\) \{([^}]+)\}/)?.[1] ?? "";
    expect(block).toMatch(/--text-primary:\s*#f4f7fb/);
    expect(block).toMatch(/--text-secondary:\s*#c9d4e6/);
    expect(block).toContain("--ink: var(--text-primary)");
    expect(block).toContain("--muted: var(--text-secondary)");
    const interior = css.match(/:root\[data-theme="hybrid"\] \.mobileSidebarInterior \{([^}]+)\}/)?.[1] ?? "";
    expect(interior).toContain("--ink: var(--text-primary)");
    expect(interior).toContain("--muted: var(--text-secondary)");
    expect(interior).not.toContain("background");
    expect(interior).not.toContain("backdrop-filter");
    const rootAliases = css.match(/:root \{\s*--ink: var\(--text-primary\);\s*--muted: var\(--text-secondary\);/);
    expect(rootAliases).not.toBeNull();
    expect(block).not.toContain("#0f172a");
    expect(block).not.toContain("#475569");
    expect(css).toContain("color: var(--ink)");
    expect(css).toContain("color: var(--muted)");
  });
});
