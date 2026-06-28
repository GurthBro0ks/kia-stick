import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.26-cross-surface-review-clarity";
const docPath = "docs/v0.9.26-cross-surface-review-clarity.md";
const scriptPath = resolve("scripts/fake-browser-qa-evidence.mjs");
const acceptedCommit = "c5d12a004f4c9d270260ee860781b99421a938dd";

interface QaModule {
  buildFakeBrowserQaEvidence(options?: { root?: string; phase?: string }): {
    acceptedPushedCommit: string;
    operatorStatusSurface: string;
    manualQaStatus: string;
    queue015Status: string;
  };
}

async function loadModule(): Promise<QaModule> {
  return (await import(pathToFileURL(scriptPath).href)) as QaModule;
}

describe("v0.9.26 cross-surface review clarity", () => {
  it("documents the same accepted baseline and current local PASS state across surfaces", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Settings shows the accepted pushed checkpoint and current manual QA `PASS`.",
      "`scripts/fake-browser-qa-evidence.mjs` exports the same accepted pushed commit",
      "`feature_list.json` records v0.9.23-to-v0.9.27 as local implementation work with no push claimed.",
      acceptedCommit,
      "separate operator prompts required for closeout and push",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("keeps Settings, helper, docs, and feature state aligned", async () => {
    const mod = await loadModule();
    const packet = mod.buildFakeBrowserQaEvidence({ root: process.cwd() });
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0926_cross_surface_review_clarity: {
        phase: string;
        status: string;
        settings_surface_aligned: boolean;
        helper_surface_aligned: boolean;
        docs_surface_aligned: boolean;
        feature_state_aligned: boolean;
        current_manual_qa_status: string;
        pushed: boolean;
        queue_015_status: string;
      };
    };
    const state = featureList.v0926_cross_surface_review_clarity;

    expect(component).toContain(acceptedCommit);
    expect(component).toContain("manual QA PASS for v0.9.23-to-v0.9.27");
    expect(packet.acceptedPushedCommit).toBe(acceptedCommit);
    expect(packet.operatorStatusSurface).toBe("Settings");
    expect(packet.manualQaStatus).toBe("PASS");
    expect(packet.queue015Status).toBe("blocked");
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.settings_surface_aligned).toBe(true);
    expect(state.helper_surface_aligned).toBe(true);
    expect(state.docs_surface_aligned).toBe(true);
    expect(state.feature_state_aligned).toBe(true);
    expect(state.current_manual_qa_status).toBe("PASS");
    expect(state.pushed).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
  });
});
