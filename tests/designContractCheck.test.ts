import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface DesignContractCheckModule {
  runDesignContractCheck(root?: string): {
    ok: boolean;
    problems: string[];
    productVersion: string;
    promptVersion: string;
    queue015Status: string;
  };
}

async function loadModule(): Promise<DesignContractCheckModule> {
  return (await import(pathToFileURL(resolve("scripts/design-contract-check.mjs")).href)) as DesignContractCheckModule;
}

function writeFixture(overrides: { design?: string; agents?: string; version?: string; queueStatus?: string; skillDir?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "kia-design-contract-"));
  mkdirSync(join(root, "lib"), { recursive: true });
  mkdirSync(join(root, "docs"), { recursive: true });

  writeFileSync(join(root, "DESIGN.md"), overrides.design ?? readFileSync("DESIGN.md", "utf8"));
  writeFileSync(join(root, "AGENTS.md"), overrides.agents ?? readFileSync("AGENTS.md", "utf8"));
  writeFileSync(join(root, "lib/version.ts"), overrides.version ?? readFileSync("lib/version.ts", "utf8"));
  writeFileSync(
    join(root, "docs/phase-backlog.json"),
    JSON.stringify(
      {
        schema: "kia-stick-local-task-queue.v1",
        items: [
          {
            id: "queue-015-v07-first-real-doc-gate-request",
            phase: "KIA-Stick-v0.7.0-first-real-doc-gate-request",
            title: "v0.7 first real-doc gate request",
            status: overrides.queueStatus ?? "blocked",
          },
        ],
      },
      null,
      2
    )
  );

  if (overrides.skillDir) mkdirSync(join(root, ".agents/skills"), { recursive: true });
  return root;
}

describe("design-contract-check", () => {
  it("passes the current repo contract", async () => {
    const mod = await loadModule();
    const result = mod.runDesignContractCheck(resolve("."));

    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
    expect(result.productVersion).toBe("0.7.0");
    expect(result.promptVersion).toBe("prompt.fake-docs.v0.5-import-wizard-hardening");
    expect(result.queue015Status).toBe("blocked");
  });

  it("fails when the real-doc gate is unblocked", async () => {
    const mod = await loadModule();
    const result = mod.runDesignContractCheck(writeFixture({ queueStatus: "ready_to_push" }));

    expect(result.ok).toBe(false);
    expect(result.problems.join("\n")).toContain("queue-015-v07-first-real-doc-gate-request must remain blocked");
  });

  it("fails when version identity drifts", async () => {
    const mod = await loadModule();
    const version = readFileSync("lib/version.ts", "utf8").replace('export const PRODUCT_VERSION = "0.7.0";', 'export const PRODUCT_VERSION = "0.8.0";');
    const result = mod.runDesignContractCheck(writeFixture({ version }));

    expect(result.ok).toBe(false);
    expect(result.problems.join("\n")).toContain("PRODUCT_VERSION must stay 0.7.0");
  });

  it("fails when AGENTS.md no longer routes design work through DESIGN.md", async () => {
    const mod = await loadModule();
    const agents = readFileSync("AGENTS.md", "utf8").replace("For design, UI, UX, layout, copy, scan-density, or interaction work, read `DESIGN.md` first.", "");
    const result = mod.runDesignContractCheck(writeFixture({ agents }));

    expect(result.ok).toBe(false);
    expect(result.problems.join("\n")).toContain("AGENTS.md must contain");
  });

  it("fails when repo-local skill directories appear", async () => {
    const mod = await loadModule();
    const result = mod.runDesignContractCheck(writeFixture({ skillDir: true }));

    expect(result.ok).toBe(false);
    expect(result.problems.join("\n")).toContain("Forbidden repo-local skill/config path exists");
  });
});
