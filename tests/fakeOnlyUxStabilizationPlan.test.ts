import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.7.3-fake-only-ux-triage-and-stabilization-plan";
const v074Phase = "KIA-Stick-v0.7.4-chat-saved-upload-stabilization";
const currentPhase = "KIA-Stick-v0.7.8-v0.7-release-state-closeout";
const acceptedPlanCommit = "38bff5f";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";
const planPath = "docs/v0.7.3-fake-only-ux-stabilization-plan.md";
const plan = readFileSync(planPath, "utf8");

function readRuntimeSources(): string {
  const candidates = [
    "app/health/route.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "app/version/page.tsx",
    "components/KiaStickApp.tsx",
    "lib/answerGovernor.ts",
    "lib/conversationModel.ts",
    "lib/fakePilotSimulatorModel.ts",
    "lib/importWizardModel.ts",
    "lib/redactionMetadataModel.ts",
    "lib/savedAnswers.ts",
    "lib/serverVersion.ts",
    "lib/sourceModel.ts",
    "lib/vaultModel.ts",
    "lib/version.ts",
  ];

  const files: string[] = [];
  for (const file of candidates) {
    expect(existsSync(file)).toBe(true);
    files.push(readFileSync(file, "utf8"));
  }
  return files.join("\n");
}

describe("v0.7.3 fake-only UX stabilization plan", () => {
  it("keeps the accepted v0.7.3 plan traceable while v0.7.8 is current", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
      };
      v073_fake_only_ux_stabilization_plan: {
        phase: string;
        status: string;
        previous_accepted_phase: string;
        previous_accepted_commit: string;
        recommended_next_phase: string;
      };
    };

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.product_version).toBe("0.7.0");
    expect(featureList.release_readiness.package_version).toBe("0.7.0");
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v073_fake_only_ux_stabilization_plan.phase).toBe(phase);
    expect(featureList.v073_fake_only_ux_stabilization_plan.status).toContain("accepted");
    expect(featureList.v073_fake_only_ux_stabilization_plan.previous_accepted_phase).toBe(
      "KIA-Stick-v0.7.2-product-version-bump-implementation-to-0.7.0"
    );
    expect(featureList.v073_fake_only_ux_stabilization_plan.previous_accepted_commit).toBe("179f883");
    expect(featureList.v073_fake_only_ux_stabilization_plan.recommended_next_phase).toBe(v074Phase);

    expect(plan).toContain(phase);
    expect(plan).toContain("docs/tests/state planning phase");
    expect(plan).toContain("Accepted pushed baseline: `179f883`");
    expect(plan).toContain("Product version: `0.7.0`");
    expect(plan).toContain(`Prompt version: \`${promptVersion}\``);
  });

  it("inventories every required fake-only surface and ranks the stabilization work", () => {
    for (const surface of ["Chat", "Sources", "Saved", "Upload", "Import", "Vault", "Settings", "`/health`", "`/version`"]) {
      expect(plan).toContain(surface);
    }

    for (const ranked of [
      "Chat/Saved handoff clarity",
      "Upload/Import fake-only guard consistency",
      "Vault workflow scan density",
      "Sources/version confidence",
      "Settings copy drift",
    ]) {
      expect(plan).toContain(ranked);
    }

    expect(plan).toContain("Recommended v0.7.4 Implementation Chunk");
    expect(plan).toContain(v074Phase);
    expect(plan).toContain("Fake-only Chat/Saved/Upload UX stabilization");
  });

  it("keeps real-doc work explicitly blocked and free of private path literals", () => {
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; next_action: string }>;
    };
    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");

    expect(plan).toContain("This plan does **not** approve real-doc work.");
    expect(plan).toContain("Real-doc request remains blocked");
    expect(plan).toContain("Do not add:");
    expect(realDocGate?.status).toBe("blocked");
    expect(realDocGate?.next_action).toContain("Blocked.");

    const realMount = ["/media", "mint", "SHARED", "APWU"].join("/");
    const privateVault = ["kia-stick", "private-vault"].join("-");
    expect(plan).not.toContain(realMount);
    expect(plan).not.toContain(privateVault);
  });

  it("records v0.7.3 through v0.7.7 as accepted and advances v0.7.8 to the validation push gate", () => {
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const v072 = queue.items.find((item) => item.id === "queue-016-v072-product-version-bump-implementation");
    const v073 = queue.items.find((item) => item.id === "queue-017-v073-fake-only-ux-triage");
    const v074 = queue.items.find((item) => item.id === "queue-018-v074-chat-saved-upload-stabilization");
    const v075 = queue.items.find((item) => item.id === "queue-019-v075-sources-vault-import-polish");
    const v076 = queue.items.find((item) => item.id === "queue-020-v076-design-md-fake-only-ux-contract");
    const v077 = queue.items.find((item) => item.id === "queue-021-v077-design-contract-drift-guard");
    const v078 = queue.items.find((item) => item.id === "queue-022-v078-v07-release-state-closeout");

    expect(v072?.status).toBe("accepted");
    expect(v072?.next_action).toContain("179f883");
    expect(v073?.phase).toBe(phase);
    expect(v073?.status).toBe("accepted");
    expect(v073?.next_action).toContain(acceptedPlanCommit);
    expect(v074?.phase).toBe(v074Phase);
    expect(v074?.status).toBe("accepted");
    expect(`${v074?.summary}\n${v074?.next_action}`).toContain("Chat save feedback");
    expect(`${v074?.summary}\n${v074?.next_action}`).toContain("fake-only");
    expect(v075?.phase).toBe("KIA-Stick-v0.7.5-sources-vault-import-scan-density-polish");
    expect(v075?.status).toBe("accepted");
    expect(`${v075?.summary}\n${v075?.next_action}`).toContain("Sources hierarchy traceability");
    expect(`${v075?.summary}\n${v075?.next_action}`).toContain("fake-only");
    expect(v076?.phase).toBe("KIA-Stick-v0.7.6-design-md-fake-only-ux-contract");
    expect(v076?.status).toBe("accepted");
    expect(`${v076?.summary}\n${v076?.next_action}`).toContain("DESIGN.md");
    expect(`${v076?.summary}\n${v076?.next_action}`).toContain("fake-only");
    expect(v077?.phase).toBe("KIA-Stick-v0.7.7-design-contract-drift-guard");
    expect(v077?.status).toBe("accepted");
    expect(`${v077?.summary}\n${v077?.next_action}`).toContain("design:check");
    expect(`${v077?.summary}\n${v077?.next_action}`).toContain("b086f85");
    expect(v078?.phase).toBe(currentPhase);
    expect(v078?.status).toBe("ready_to_push");
    expect(`${v078?.summary}\n${v078?.next_action}`).toContain("release-state closeout");
    expect(`${v078?.summary}\n${v078?.next_action}`).toContain("queue-015 remains blocked");
  });

  it("does not add file input, picker, reader, OCR, upload, vector, or real-doc runtime code paths", () => {
    const runtime = readRuntimeSources();

    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b/);
    expect(runtime).not.toMatch(/\bwebkitdirectory\b/);
    expect(runtime).not.toMatch(/\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
    expect(runtime).not.toMatch(/\breadRealDocument\b|\bquarantineRealDocument\b|\brunOcr\b|\bcreateVectorStore\b/);
    expect(runtime).not.toMatch(/\bmulter\b|\buploadHandler\b/i);
  });
});
