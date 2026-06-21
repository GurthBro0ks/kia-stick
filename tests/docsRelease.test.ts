import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const releasePack = readFileSync("docs/RELEASE_v0.5.md", "utf8");

describe("v0.5 docs release pack", () => {
  it("covers the current phase, fake-only identity, and operator workflows", () => {
    expect(releasePack).toContain("KIA-Stick-v0.5.10-docs-release-pack");
    expect(releasePack).toContain("Product version remains `0.4.0`");
    expect(releasePack).toContain("prompt.fake-docs.v0.5-import-wizard-hardening");
    expect(releasePack).toContain("## Operator Quick Checklist");
    expect(releasePack).toContain("npm run qa");
    expect(releasePack).toContain("npm run proof:latest");
    expect(releasePack).toContain("npm run closeout:review");
    expect(releasePack).toContain("npm run closeout:summary");
    expect(releasePack).toContain("npm run queue:next");
    expect(releasePack).toContain("git push origin main");
  });

  it("keeps the real-document boundary and explicit non-approvals visible", () => {
    expect(releasePack).toContain("## Safe Boundaries");
    expect(releasePack).toContain("## What Is Not Approved");
    expect(releasePack).toContain("/media/mint/SHARED/APWU");
    expect(releasePack).toContain("~/kia-stick-private-vault");

    for (const forbiddenApproval of [
      "Real import code",
      "Browser file pickers",
      "Path readers",
      "File reads, copies, uploads, OCR",
      "Real vector stores",
      "Private-vault inspection",
      "Cloud or external API calls",
      "Auto-push from scripts",
    ]) {
      expect(releasePack).toContain(forbiddenApproval);
    }
  });

  it("documents validation commands and v0.5.1 through v0.5.10 changelog", () => {
    for (const command of [
      "npm run release:check",
      "npm run lint",
      "npm run typecheck",
      "npm run test",
      "npm run build",
      "npm run scan:fake",
      "npm run scan:privacy",
      "npm run phase:run -- --phase KIA-Stick-v0.5.10-docs-release-self-test",
    ]) {
      expect(releasePack).toContain(command);
    }

    for (const version of ["v0.5.1", "v0.5.2", "v0.5.3", "v0.5.4", "v0.5.5", "v0.5.6", "v0.5.7", "v0.5.8", "v0.5.9", "v0.5.10"]) {
      expect(releasePack).toContain(`${version}:`);
    }
  });
});
