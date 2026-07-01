import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.70-health-version-phase-status-freshness-polish";
const bundlePhase = "KIA-Stick-v0.9.68-to-v0.9.72-accepted-pushed-state-and-runtime-status-freshness-bundle";
const docPath = "docs/v0.9.70-health-version-phase-status-freshness-polish.md";

function constantValue(source: string, name: string): string {
  const match = source.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*"([^"]+)"`));
  if (!match) throw new Error(`Missing ${name}`);
  return match[1];
}

describe("v0.9.70 health/version phase-status freshness polish", () => {
  it("documents /health freshness while preserving /version identity semantics", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "`/health` phase is `" + bundlePhase + "`",
      "/health` remains fake-only and local",
      "/health` keeps `fakeOnly: true`",
      "/health` keeps `realDbTouched: false`",
      "/version` keeps displayVersion semantics as `productVersion-channel.buildDate+gitSha`",
      "/version` keeps productVersion `0.7.0`",
      "/version` keeps promptVersion `prompt.fake-docs.v0.5-import-wizard-hardening`",
      "Provider remains `local-fake-deterministic`.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("updates shared runtime phase without changing product or prompt identity", () => {
    const versionSource = readFileSync("lib/version.ts", "utf8");
    const healthRoute = readFileSync("app/health/route.ts", "utf8");
    const versionPage = readFileSync("app/version/page.tsx", "utf8");

    expect(constantValue(versionSource, "CURRENT_PHASE")).toBe(bundlePhase);
    expect(constantValue(versionSource, "PRODUCT_VERSION")).toBe("0.7.0");
    expect(constantValue(versionSource, "PROMPT_VERSION")).toBe("prompt.fake-docs.v0.5-import-wizard-hardening");
    expect(healthRoute).toContain("fakeOnly");
    expect(healthRoute).toContain("realDbTouched");
    expect(healthRoute).toContain("CURRENT_PHASE");
    expect(versionPage).toContain("Display Version");
    expect(versionPage).toContain("Product Version");
    expect(versionPage).toContain("Prompt");
    expect(versionPage).toContain("Provider");
  });

  it("tracks runtime freshness metadata in feature state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0970_health_version_phase_status_freshness_polish: {
        phase: string;
        status: string;
        runtime_phase: string;
        product_version: string;
        prompt_version: string;
        version_semantics_changed: boolean;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        real_doc_capability_added: boolean;
      };
    };
    const state = featureList.v0970_health_version_phase_status_freshness_polish;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.runtime_phase).toBe(bundlePhase);
    expect(state.product_version).toBe("0.7.0");
    expect(state.prompt_version).toBe("prompt.fake-docs.v0.5-import-wizard-hardening");
    expect(state.version_semantics_changed).toBe(false);
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.real_doc_capability_added).toBe(false);
  });
});
