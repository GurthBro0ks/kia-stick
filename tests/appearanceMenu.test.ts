import { afterEach, describe, expect, it, vi } from "vitest";
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppShell } from "../components/AppShell";
import { APPEARANCE_INIT_SCRIPT, APPEARANCE_KEY, applyAppearance, normalizeAppearance, readAppearance } from "../lib/appearance";

const read = (path: string) => readFileSync(path, "utf8");
afterEach(() => vi.unstubAllGlobals());

describe("operator QA appearance and menu fixes", () => {
  it("has one menu trigger and exactly one Settings item inside each desktop/mobile footer", () => {
    const html = renderToStaticMarkup(createElement(AppShell, {
      view: "settings", onNavigate: () => undefined, onNewConversation: () => undefined,
      conversationTitle: "Synthetic conversation", displayVersion: "test", children: "test",
    }));
    const footers = [...html.matchAll(/<div class="sidebarFooter">([\s\S]*?)<\/aside>|<div class="sidebarFooter">([\s\S]*?)<\/dialog>/g)].map(m => m[1] ?? m[2]);
    expect(footers).toHaveLength(2);
    for (const footer of footers) {
      expect(footer).toMatch(/^<details class="sidebarMenu">/);
      expect(footer.match(/aria-label="Menu"/g)).toHaveLength(1);
      expect(footer.match(/>Settings<\/button>/g)).toHaveLength(1);
      expect(footer).not.toContain("secondarySettings");
      for (const text of ["Appearance", "Light", "Dark", "System", "Advanced / Tools", "Upload", "Vault", "Import", "Version / About"])
        expect(footer).toContain(text);
    }
  });

  it.each(["light", "dark", "system", null, "", "invalid", "LIGHT"])("bootstraps %s consistently on every route", (stored) => {
    const dataset: Record<string, string> = {};
    const storage = { getItem: vi.fn(() => stored), setItem: vi.fn() };
    vi.stubGlobal("window", { sessionStorage: storage });
    runInNewContext(APPEARANCE_INIT_SCRIPT, { sessionStorage: storage, document: { documentElement: { dataset } } });
    expect(dataset.theme).toBe(normalizeAppearance(stored));
    expect(readAppearance()).toBe(dataset.theme);
    expect(storage.getItem).toHaveBeenCalledWith(APPEARANCE_KEY);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("stores only appearance and applies it immediately; denied storage falls back safely", () => {
    const dataset: Record<string, string> = {};
    const storage = { getItem: vi.fn(() => { throw new Error("unavailable"); }), setItem: vi.fn() };
    vi.stubGlobal("window", { sessionStorage: storage });
    vi.stubGlobal("document", { documentElement: { dataset } });
    for (const value of ["light", "dark", "system"] as const) {
      applyAppearance(value);
      expect(dataset.theme).toBe(value);
      expect(storage.setItem).toHaveBeenLastCalledWith(APPEARANCE_KEY, value);
    }
    expect(storage.setItem).toHaveBeenCalledTimes(3);
    expect(readAppearance()).toBe("system");
    runInNewContext(APPEARANCE_INIT_SCRIPT, { sessionStorage: storage, document: { documentElement: { dataset } } });
    expect(dataset.theme).toBe("system");
    storage.setItem.mockImplementation(() => { throw new Error("unavailable"); });
    expect(() => applyAppearance("light")).not.toThrow();
    expect(dataset.theme).toBe("light");
  });

  it("initializes theme before route content and preserves Version/Settings diagnostics", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain('import { APPEARANCE_INIT_SCRIPT }');
    expect(layout.indexOf('__html: APPEARANCE_INIT_SCRIPT')).toBeLessThan(layout.indexOf('<body>'));
    expect(read("components/AppShell.tsx")).not.toContain('delete document.documentElement.dataset.theme');
    const version = read("app/version/page.tsx");
    for (const label of ["Display Version", "Product Version", "Channel", "Build Date", "Git SHA", "Corpus", "Index", "Prompt", "Provider", "Current Local Phase", "Current Local Validation", "Current Local Pushed", "Current Local Manual QA", "Accepted Capability", "Source Classes"])
      expect(version).toContain(label);
    const app = read("components/KiaStickApp.tsx");
    for (const marker of ["settingsSummaryCard", "settings-safety-boundaries", "operatorDiagnosticsRegion", "Show operator diagnostics", "runtimeVersion={runtimeVersion}", "cbaSourceState={cbaSourceState}", "publicSourceState={publicSourceState}"])
      expect(app).toContain(marker);
    const card = read("app/globals.css").match(/\.settingsSummaryCard \{([^}]+)\}/)?.[1];
    expect(card).toContain("var(--border-strong)");
    expect(card).toContain("var(--bg-elevated)");
  });
});
