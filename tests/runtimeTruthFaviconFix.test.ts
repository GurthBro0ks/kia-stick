import { existsSync, readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/health/route";
import { SettingsContent } from "@/components/KiaStickApp";
import { currentAcceptedPushedState } from "@/lib/acceptedState";
import { createRuntimeVersion } from "@/lib/version";
import { createCbaSourceFixtureCache } from "@/tests/fixtures/cbaSourceFixture";
import { createPublicSourceFixtureCache } from "@/tests/fixtures/publicSourceFixture";

const currentLocalPhase = "KIA-Stick-accessibility-and-saved-state-resilience-post-push-accepted-state-refresh";
const acceptedCommit = "996032370846952e59756caa23cde2eed9a1d458";
const repositoryRecordingCommit = "4d0f6e2338f2b327933a80e26ec2a83c56530350";

describe("Bundle 3 QA runtime truth and favicon correction", () => {
  it("separates the accepted pushed repair from the local bookkeeping refresh", async () => {
    expect(currentAcceptedPushedState.accepted_pushed_commit).toBe(acceptedCommit);
    expect(currentAcceptedPushedState.accepted_validation).toBe("PASS");
    expect(currentAcceptedPushedState.accepted_manual_qa).toBe("PASS");
    expect(currentAcceptedPushedState.accepted_pushed).toBe(true);
    expect(currentAcceptedPushedState.repository_recording_commit).toBe(repositoryRecordingCommit);
    expect(currentAcceptedPushedState.latest_pushed_closeout_commit).toBe(repositoryRecordingCommit);

    expect(currentAcceptedPushedState.local_bundle).toBe("Accessibility and Saved-State Resilience Post-Push Accepted-State Refresh");
    expect(currentAcceptedPushedState.local_bundle_phase).toBe(currentLocalPhase);
    expect(currentAcceptedPushedState.local_bundle_validation).toBe("PASS");
    expect(currentAcceptedPushedState.local_bundle_pushed).toBe(false);
    expect(currentAcceptedPushedState.local_bundle_manual_qa).toBe("PASS");

    const health = await GET().json();
    expect(health.phase).toBe(currentLocalPhase);
    expect(health.localValidation).toBe("PASS");
    expect(health.pushed).toBe(false);
    expect(health.manualQa).toBe("PASS");
    expect(health.acceptedCommit).toBe(acceptedCommit);
    expect(health.repositoryRecordingCommit).toBe(repositoryRecordingCommit);
    expect(health.latestPushedCloseoutCommit).toBe(repositoryRecordingCommit);
    expect(health.privateData).toBe("blocked");
    expect(health.externalAi).toBe("disabled");
    expect(health.supportedStewardTopicCount).toBe(10);
    expect(currentAcceptedPushedState.queue_015_status).toBe("blocked");
    expect(currentAcceptedPushedState.v0912c_status).toBe("blocked_pending_exact_target");
    expect(currentAcceptedPushedState.next_postcss_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");

    const html = renderToStaticMarkup(React.createElement(SettingsContent, {
      cbaSourceState: { status: "available", source: createCbaSourceFixtureCache() },
      publicSourceState: { status: "available", source: createPublicSourceFixtureCache() },
      runtimeVersion: createRuntimeVersion({ buildDate: "20260802", gitSha: "newsha1" }),
      operatorDiagnosticsOpen: false,
      onOperatorDiagnosticsToggle: () => undefined,
    }));
    expect(html).toContain("Current accepted capability");
    expect(html).toContain("Feature commit</dt><dd>9960323");
    expect(html).toContain("Operator QA</dt><dd>PASS");
    expect(html).toContain("Current application build");
    expect(html).toContain(currentLocalPhase);
    expect(html).toContain("Pushed</dt><dd>no");
    expect(html).toContain("Manual QA</dt><dd>PASS");
  });

  it("provides a non-empty framework-native ICO derived from the KIA mark", () => {
    const faviconPath = "app/favicon.ico";
    expect(existsSync(faviconPath)).toBe(true);
    const favicon = readFileSync(faviconPath);
    expect(favicon.byteLength).toBeGreaterThan(100);
    expect([...favicon.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
    expect(readFileSync("public/kia-stick-icon.svg", "utf8")).toContain('aria-label="KIA Stick"');
  });
});
