import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const designPath = "DESIGN.md";
const design = readFileSync(designPath, "utf8");
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("DESIGN.md fake-only UX contract", () => {
  it("exists as repo-owned project knowledge for the v0.7.6 phase", () => {
    expect(existsSync(designPath)).toBe(true);
    expect(design).toContain("KIA-Stick-v0.7.6-design-md-fake-only-ux-contract");
    expect(design).toContain("repo-owned design and UX contract");
    expect(design).toContain("project knowledge only");
  });

  it("keeps the fake-only boundary explicit and blocks real-doc affordances", () => {
    expect(design).toContain("fake-doc");
    expect(design).toContain("fake-only");
    expect(design).toContain("bundled fake corpus data and synthetic metadata only");

    for (const forbidden of [
      "file pickers",
      "directory pickers",
      "file inputs",
      "path readers",
      "real uploads",
      "upload handlers",
      "OCR",
      "embeddings",
      "indexing",
      "vector stores",
      "private-vault inspection",
      "APWU access",
    ]) {
      expect(design).toContain(forbidden);
    }
  });

  it("keeps productVersion 0.7.0 and the unchanged promptVersion visible", () => {
    expect(design).toContain("productVersion");
    expect(design).toContain(productVersion);
    expect(design).toContain("displayVersion");
    expect(design).toContain("promptVersion");
    expect(design).toContain(promptVersion);
    expect(design).toContain("provider");
  });

  it("covers required app, health, and version surfaces", () => {
    for (const surface of ["Chat", "Sources", "Saved", "Upload", "Import", "Vault", "Settings", "`/health`", "`/version`"]) {
      expect(design).toContain(surface);
    }

    expect(design).toContain("/health` must expose the current phase");
    expect(design).toContain("/version` must show `displayVersion`");
  });

  it("defines scan-density, safety-label, state, accessibility, and proof-safe rules", () => {
    for (const required of [
      "Scan-Density Rules",
      "Safety-Label Language",
      "Component And State Labels",
      "Empty, Loading, Error, And No-Answer States",
      "Accessibility And Mobile",
      "Proof-Safe Output Expectations",
      "metadata and guard flags only",
      "no file chooser opens",
      "no document bytes read",
      "not indexable",
      "export blocked",
    ]) {
      expect(design).toContain(required);
    }
  });

  it("does not approve real-doc work and keeps the real-doc queue item blocked", () => {
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string; next_action: string }>;
    };
    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");

    expect(design).toContain("does not approve real-doc work");
    expect(design).toContain("does not authorize implementation");
    expect(design).toContain("Any future real-doc path remains blocked");
    expect(realDocGate?.status).toBe("blocked");
    expect(realDocGate?.next_action).toContain("Blocked.");
  });

  it("routes future design and fake-only work through DESIGN.md from AGENTS.md", () => {
    const agents = readFileSync("AGENTS.md", "utf8");

    expect(agents).toContain("For design, UI, UX, layout, copy, scan-density, or interaction work, read `DESIGN.md` first.");
    expect(agents).toContain("read `docs/v0.7.3-fake-only-ux-stabilization-plan.md` and `DESIGN.md`");
  });
});
