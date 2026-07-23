import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import VersionPage from "@/app/version/page";
import { SettingsContent } from "@/components/KiaStickApp";
import { currentAcceptedPushedState, localDataModeLabel } from "@/lib/acceptedState";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const runtimeVersion = createRuntimeVersion({ buildDate: "20260722", gitSha: "9773768" });
const cbaSourceState = { status: "available" as const, source: createCbaSourceFixtureCache() };
const publicSourceState = { status: "available" as const, source: createPublicSourceFixtureCache() };

function renderSettings(operatorDiagnosticsOpen: boolean) {
  return renderToStaticMarkup(React.createElement(SettingsContent, {
    cbaSourceState,
    publicSourceState,
    runtimeVersion,
    operatorDiagnosticsOpen,
    onOperatorDiagnosticsToggle: () => undefined,
  }));
}

describe("public Settings summary and operator diagnostics split", () => {
  it("shows a concise accepted capability, build, source, privacy, and safety summary by default", () => {
    const html = renderSettings(false);

    expect(html).toContain("Data and privacy mode");
    expect(html).toContain("local public pilot + fake samples");
    expect(html).toContain("Public Settings User Summary and Operator Diagnostics Split");
    expect(html).toContain("76c7312");
    expect(html).toContain("Validation</dt><dd>PASS");
    expect(html).toContain("Operator QA</dt><dd>PASS");
    expect(html).toContain("Pushed</dt><dd>yes");
    expect(html).toContain("KIA Stick 0.7.0");
    expect(html).toContain("Current build</dt><dd>9773768");
    expect(html).toContain("public CBA annual-leave cited grievance-outline pilot");
    expect(html).toContain("validation PASS");
    expect(html).toContain("pushed no");
    expect(html).toContain("automatic public-CBA routing repair");
    expect(html).toContain("manual QA pending operator rerun");
    expect(html).not.toContain("stale local-bundle push-status repair");
    expect(html).toContain("APWU-USPS CBA");
    expect(html).toContain("current source instance verified");
    expect(html).toContain("NLRB guidance");
    expect(html).toContain("Private data blocked");
    expect(html).toContain("External AI disabled");
    expect(html).toContain("queue-015 blocked");
    expect(html).toContain("Show operator diagnostics");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="settings-operator-diagnostics"');
    expect(html).toContain("not an authentication or authorization boundary");
    expect(html).not.toContain('id="settings-operator-diagnostics"');
    expect(html).not.toContain(currentAcceptedPushedState.accepted_pushed_proof_dir);
    expect(html).not.toContain("Historical accepted-WARN proof");
    expect(html).not.toContain("Public Data Pilot 1B at 006da8dc");
  });

  it("renders the complete existing governance ledger only when diagnostics are opened", () => {
    const html = renderSettings(true);

    expect(html).toContain("Hide operator diagnostics");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('id="settings-operator-diagnostics"');
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-labelledby="settings-operator-diagnostics-toggle"');
    expect(html).toContain("Public Data Pilot 1B");
    expect(html).toContain("v1.1.77");
    expect(html).toContain("Historical accepted-WARN proof");
    expect(html).toContain(currentAcceptedPushedState.accepted_pushed_proof_dir);
    expect(html).toContain("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(html).toContain("v0.9.12C remains blocked");
    expect(html).toContain("queue-015 blocked");
    expect(html).toContain("Package lock</dt><dd>unchanged");
    expect(html).toContain("repository equality verified at 3690c74");
    expect(html).toContain("accepted feature checkpoint is distinct from the repository/closeout recording point");
    expect(html).toContain("Accepted-state recording baseline</dt><dd>3690c74650d0fb19395bd046adee1bf236950f9e");
    expect(html).toContain("Latest pushed repository closeout commit</dt><dd>0695680047608462b5f154a9ed82593e6923932a");
    expect(html).toContain("Latest pushed repository closeout");
    expect(html).toContain(currentAcceptedPushedState.latest_pushed_closeout_short_commit as string);
    expect(html).toContain(currentAcceptedPushedState.local_bundle_status);
    expect(currentAcceptedPushedState.local_bundle_status).toContain("pushed no");
    expect(currentAcceptedPushedState.local_bundle_status).toContain("manual QA pending operator rerun");
    expect(currentAcceptedPushedState.accepted_pushed_short_commit).toBe("76c7312");
    expect(currentAcceptedPushedState.repository_recording_short_commit).toBe("3690c74");
    expect(currentAcceptedPushedState.latest_pushed_closeout_short_commit).toBe("0695680");
    expect(html).not.toContain("HEAD == origin/main at 76c7312");
    expect(html).not.toContain("HEAD equal to origin/main at 76c7312");
    expect(html).toContain("Build Date");
    expect(html).toContain("Provider");
  });

  it("uses a semantic accessible toggle and narrow-safe styles without changing bottom navigation", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(component).toMatch(/<button[\s\S]*aria-controls=\{operatorDiagnosticsRegionId\}[\s\S]*aria-expanded=\{props\.operatorDiagnosticsOpen\}[\s\S]*type="button"/);
    expect(component).toContain("setOperatorDiagnosticsOpen((open) => !open)");
    expect(css).toContain(".operatorDiagnosticsToggle:focus-visible");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain(".operatorDiagnosticsGrid");
    expect(css).toMatch(/\.operatorDiagnosticsGrid dd\s*\{[^}]*min-width:\s*0/s);
    expect(css).toContain(".bottomNav");
  });

  it("keeps /version technical identity while deriving truthful data-mode wording from shared state", () => {
    const html = renderToStaticMarkup(VersionPage());
    const page = readFileSync("app/version/page.tsx", "utf8");

    expect(localDataModeLabel()).toBe("local public pilot + fake samples");
    expect(page).toContain('import { localDataModeLabel } from "@/lib/acceptedState"');
    expect(page).not.toContain("fake-only local");
    expect(html).toContain("local public pilot + fake samples");
    for (const label of ["Product Version", "Channel", "Build Date", "Git SHA", "Corpus", "Index", "Prompt", "Provider", "Source Classes"]) {
      expect(html).toContain(label);
    }
  });
});
