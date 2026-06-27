import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.7.8-v0.7-release-state-closeout";
const currentPhase = "KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint";
const closeoutPath = "docs/RELEASE_v0.7-closeout.md";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

const acceptedPhases = [
  ["KIA-Stick-v0.7.2-product-version-bump-implementation-to-0.7.0", "179f883"],
  ["KIA-Stick-v0.7.3-fake-only-ux-triage-and-stabilization-plan", "38bff5f"],
  ["KIA-Stick-v0.7.4-chat-saved-upload-stabilization", "5a3758d"],
  ["KIA-Stick-v0.7.5-sources-vault-import-scan-density-polish", "303f12b"],
  ["KIA-Stick-v0.7.6-design-md-fake-only-ux-contract", "4e7ab62"],
  ["KIA-Stick-v0.7.7-design-contract-drift-guard", "b086f85"],
] as const;

describe("v0.7.8 release-state closeout", () => {
  it("creates a traceable v0.7 release-state closeout document", () => {
    expect(existsSync(closeoutPath)).toBe(true);
    const closeout = readFileSync(closeoutPath, "utf8");

    expect(closeout).toContain("# KIA Stick v0.7 Release-State Closeout");
    expect(closeout).toContain(phase);
    expect(closeout).toContain(`Product version: \`${productVersion}\``);
    expect(closeout).toContain(`Prompt version: \`${promptVersion}\``);

    for (const [acceptedPhase, commit] of acceptedPhases) {
      expect(closeout).toContain(acceptedPhase);
      expect(closeout).toContain(commit);
    }
  });

  it("documents the command surface and next safe choices", () => {
    const closeout = readFileSync(closeoutPath, "utf8");

    for (const command of [
      "npm run design:check",
      "npm run release:check",
      "npm run qa",
      "npm run proof:latest",
      "npm run proof:list",
      "npm run queue:next",
      "npm run queue:list",
      "npm run closeout:review",
      "npm run closeout:summary",
      "npm run scan:fake",
      "npm run scan:privacy",
    ]) {
      expect(closeout).toContain(command);
    }

    expect(closeout).toContain("pause and accept v0.7 state");
    expect(closeout).toContain("continue fake-only polish");
    expect(closeout).toContain("real-doc gate preparation planning only");
    expect(closeout).toContain("Do not begin real-doc implementation");
  });

  it("keeps the real-doc gate blocked and rejects real-doc implementation affordances", () => {
    const closeout = readFileSync(closeoutPath, "utf8");
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string; summary: string; next_action: string }>;
    };

    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");
    const releaseCloseout = queue.items.find((item) => item.id === "queue-022-v078-v07-release-state-closeout");

    expect(realDocGate?.status).toBe("blocked");
    expect(releaseCloseout?.phase).toBe(phase);
    expect(releaseCloseout?.status).toBe("accepted");
    expect(closeout).toContain("queue-015-v07-first-real-doc-gate-request");
    expect(closeout).toContain("remains `blocked`");

    for (const forbidden of [
      "file pickers",
      "directory pickers",
      "path readers",
      "file reads",
      "file inputs",
      "real uploads",
      "upload handlers",
      "OCR",
      "embeddings",
      "indexing",
      "vector stores",
      "private-vault inspection",
    ]) {
      expect(closeout).toContain(forbidden);
    }
  });

  it("keeps the v0.7.8 closeout traceable after later v0.7 phases become current", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
      };
      v077_design_contract_drift_guard: {
        status: string;
        accepted_commit: string;
      };
      v078_v07_release_state_closeout: {
        phase: string;
        status: string;
        product_version: string;
        package_version: string;
        prompt_version: string;
        previous_accepted_commit: string;
        queue_015_status: string;
        queue_021_status: string;
        queue_022_status: string;
        authorizes_real_doc_work: boolean;
        real_document_access: boolean;
        private_vault_inspected: boolean;
        accepted_commit: string;
      };
    };

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.package_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.v077_design_contract_drift_guard.status).toBe("accepted_after_push_verified");
    expect(featureList.v077_design_contract_drift_guard.accepted_commit).toBe("b086f85");
    expect(featureList.v078_v07_release_state_closeout.phase).toBe(phase);
    expect(featureList.v078_v07_release_state_closeout.status).toBe("accepted_after_push_verified");
    expect(featureList.v078_v07_release_state_closeout.accepted_commit).toBe("b28a803");
    expect(featureList.v078_v07_release_state_closeout.product_version).toBe(productVersion);
    expect(featureList.v078_v07_release_state_closeout.package_version).toBe(productVersion);
    expect(featureList.v078_v07_release_state_closeout.prompt_version).toBe(promptVersion);
    expect(featureList.v078_v07_release_state_closeout.previous_accepted_commit).toBe("b086f85");
    expect(featureList.v078_v07_release_state_closeout.queue_015_status).toBe("blocked");
    expect(featureList.v078_v07_release_state_closeout.queue_021_status).toBe("accepted_after_push_verified");
    expect(featureList.v078_v07_release_state_closeout.queue_022_status).toBe("accepted_after_push_verified");
    expect(featureList.v078_v07_release_state_closeout.authorizes_real_doc_work).toBe(false);
    expect(featureList.v078_v07_release_state_closeout.real_document_access).toBe(false);
    expect(featureList.v078_v07_release_state_closeout.private_vault_inspected).toBe(false);
  });
});
