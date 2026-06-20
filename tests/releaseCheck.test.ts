import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const scriptPath = resolve("scripts/release-check.mjs");

interface FixtureOptions {
  phase: string;
  packageVersion: string;
  productVersion: string;
  promptVersion: string;
  includeHold?: boolean;
  featureProductVersion?: string;
}

function createFixture(options: FixtureOptions): string {
  const root = mkdtempSync(join(tmpdir(), "kia-release-check-"));
  mkdirSync(join(root, "lib"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "kia-stick-fixture",
        version: options.packageVersion,
      },
      null,
      2
    )
  );
  writeFileSync(
    join(root, "lib/version.ts"),
    [
      `export const PRODUCT_VERSION = "${options.productVersion}";`,
      `export const PROMPT_VERSION = "${options.promptVersion}";`,
      "",
    ].join("\n")
  );

  const hold = options.includeHold
    ? [
        {
          field: "productVersion",
          actual: options.productVersion,
          expected: "0.5.x phase milestone",
          applies_to_phase_pattern: "^KIA-Stick-v0\\.5\\.",
          reason: "ProductVersion stays 0.4.0 during v0.5.x until an approved product milestone bump.",
        },
      ]
    : [];

  writeFileSync(
    join(root, "feature_list.json"),
    JSON.stringify(
      {
        phase: options.phase,
        release_readiness: {
          phase: options.phase,
          version_coherence: {
            package_version: options.packageVersion,
            product_version: options.featureProductVersion ?? options.productVersion,
            prompt_version: options.promptVersion,
            intentional_holds: hold,
          },
        },
      },
      null,
      2
    )
  );
  const docText = [
    `Phase: ${options.phase}`,
    `Product version: ${options.productVersion}`,
    `Prompt version: ${options.promptVersion}`,
    "",
  ].join("\n");
  writeFileSync(join(root, "README.md"), docText);
  writeFileSync(join(root, "CLOSEOUT.md"), docText);
  return root;
}

function runReleaseCheck(root: string): string {
  return execFileSync("node", [scriptPath, "--root", root], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function runReleaseCheckFail(root: string): string {
  const result = spawnSync("node", [scriptPath, "--root", root], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  expect(result.status).not.toBe(0);
  return `${result.stdout}${result.stderr}`;
}

describe("release-check", () => {
  it("passes when package, product, prompt, feature list, and docs are coherent", () => {
    const root = createFixture({
      phase: "KIA-Stick-v0.4.0-release-check-fixture",
      packageVersion: "0.4.0",
      productVersion: "0.4.0",
      promptVersion: "prompt.fake-docs.v0.4-fixture",
    });

    expect(runReleaseCheck(root)).toContain("Release readiness check PASS");
  });

  it("fails with a human-readable diff when unallowlisted drift is injected", () => {
    const root = createFixture({
      phase: "KIA-Stick-v0.4.0-release-check-fixture",
      packageVersion: "0.4.1",
      productVersion: "0.4.0",
      promptVersion: "prompt.fake-docs.v0.4-fixture",
    });

    const output = runReleaseCheckFail(root);

    expect(output).toContain("Release readiness check FAIL");
    expect(output).toContain("package.json version must match lib/version.ts PRODUCT_VERSION");
    expect(output).toContain("expected: 0.4.0");
    expect(output).toContain("actual:   0.4.1");
  });

  it("passes an allowlisted productVersion hold only when a reason is present", () => {
    const root = createFixture({
      phase: "KIA-Stick-v0.5.3-release-readiness-and-version-coherence-automation",
      packageVersion: "0.4.0",
      productVersion: "0.4.0",
      promptVersion: "prompt.fake-docs.v0.5-import-wizard-hardening",
      includeHold: true,
    });

    const output = runReleaseCheck(root);

    expect(output).toContain("Intentional holds:");
    expect(output).toContain("ProductVersion stays 0.4.0 during v0.5.x");
  });
});
