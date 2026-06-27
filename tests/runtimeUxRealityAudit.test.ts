import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.8.6-runtime-ux-reality-audit";
const docPath = "docs/v0.8.6-runtime-ux-reality-audit.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.8.6 runtime UX reality audit", () => {
  it("documents repo-owned runtime evidence and highest-value fake-only polish", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(`Product version: \`${productVersion}\``);
    expect(doc).toContain(`Prompt version: \`${promptVersion}\``);
    for (const surface of ["Chat", "Sources", "Saved", "Upload", "Import", "Vault", "Settings", "`/health`", "`/version`"]) {
      expect(doc).toContain(surface);
    }
    for (const file of [
      "components/KiaStickApp.tsx",
      "lib/answerGovernor.ts",
      "lib/sourceModel.ts",
      "lib/savedAnswers.ts",
      "lib/importWizardModel.ts",
      "lib/vaultModel.ts",
      "app/health/route.ts",
      "app/version/page.tsx",
    ]) {
      expect(doc).toContain(file);
    }
    expect(doc).toContain("Improve no-answer and Saved clarity");
    expect(doc).toContain("Add citable/context-only density to Sources");
    expect(doc).toContain("Update the smoke helper");
  });

  it("tracks queue and feature state accepted after closeout validation", () => {
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: { status: string; manual_qa_status: string; queue_015_status: string; queue_041_status: string };
      v086_runtime_ux_reality_audit: {
        phase: string;
        status: string;
        queue_041_status: string;
        runtime_ui_changed: boolean;
        runtime_capability_changed: boolean;
        queue_015_status: string;
      };
    };
    const item = queue.items.find((candidate) => candidate.id === "queue-041-v086-runtime-ux-reality-audit");

    expect(featureList.phase).toBe("KIA-Stick-v0.9.0-fake-runtime-ux-checkpoint");
    expect(featureList.release_readiness.status).toBe("v086_v090_fake_runtime_ux_bundle_closeout_accepted_pending_push");
    expect(featureList.release_readiness.manual_qa_status).toBe("PASS");
    expect(featureList.release_readiness.queue_015_status).toBe("blocked");
    expect(featureList.release_readiness.queue_041_status).toBe("accepted");
    expect(featureList.v086_runtime_ux_reality_audit.phase).toBe(phase);
    expect(featureList.v086_runtime_ux_reality_audit.status).toBe("accepted_after_closeout_validation_pending_push");
    expect(featureList.v086_runtime_ux_reality_audit.queue_041_status).toBe("accepted");
    expect(featureList.v086_runtime_ux_reality_audit.runtime_ui_changed).toBe(false);
    expect(featureList.v086_runtime_ux_reality_audit.runtime_capability_changed).toBe(false);
    expect(featureList.v086_runtime_ux_reality_audit.queue_015_status).toBe("blocked");
    expect(item?.phase).toBe(phase);
    expect(item?.status).toBe("accepted");
    expect(`${item?.summary}\n${item?.next_action}`).toContain("repo-owned fake-only evidence");
  });

  it("keeps the audit out of real-doc implementation", () => {
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain("does not inspect private folders");
    expect(doc).toContain("does not approve real-doc");
    expect(doc).toContain("`queue-015-v07-first-real-doc-gate-request` remains blocked");
    expect(doc).not.toMatch(/showOpenFilePicker|showDirectoryPicker|readAsText|readAsArrayBuffer|multer|createVectorStore|VectorStore\.from/i);
  });
});
