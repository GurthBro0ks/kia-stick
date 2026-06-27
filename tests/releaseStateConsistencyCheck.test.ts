import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.3-release-state-consistency-check";
const currentPhase = "KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint";
const currentStatus = "v096_v0910_synthetic_governance_hardening_bundle_accepted_after_closeout_push";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";
const acceptedCloseoutCommit = "8044eaf6756c5e8303483d44017a29cf9514ed44";

describe("v0.9.3 release-state consistency check", () => {
  it("documents the cross-file release state contract", () => {
    const doc = readFileSync("docs/v0.9.3-release-state-consistency-check.md", "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain(currentPhase.replace("KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint", "KIA-Stick-v0.9.1-to-v0.9.5-release-state-consolidation-and-proof-durability-bundle"));
    expect(doc).toContain(acceptedCloseoutCommit);
    expect(doc).toContain(`Product version remains \`${productVersion}\``);
    expect(doc).toContain(`Prompt version remains \`${promptVersion}\``);
    expect(doc).toContain("`queue-015-v07-first-real-doc-gate-request` remains blocked");
    expect(doc).toContain("`queue-041` through `queue-045` remain accepted");
  });

  it("keeps README, CLOSEOUT, progress, feature state, and queue aligned", () => {
    const readme = readFileSync("README.md", "utf8");
    const closeout = readFileSync("CLOSEOUT.md", "utf8");
    const progress = readFileSync("claude-progress.md", "utf8");
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        status: string;
        product_version: string;
        prompt_version: string;
        queue_015_status: string;
        queue_041_status: string;
        queue_045_status: string;
        queue_046_status: string;
        queue_050_status: string;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };

    for (const text of [readme, closeout, progress]) {
      expect(text).toContain("KIA-Stick-v0.9.1-to-v0.9.5-release-state-consolidation-and-proof-durability-bundle");
      expect(text).toContain(acceptedCloseoutCommit);
      expect(text).toContain(productVersion);
      expect(text).toContain(promptVersion);
      expect(text).toContain("queue-015");
      expect(text).toContain("queue-046");
      expect(text).toContain("queue-050");
    }

    expect(featureList.phase).toBe(currentPhase);
    expect(featureList.release_readiness.phase).toBe(currentPhase);
    expect(featureList.release_readiness.status).toBe(currentStatus);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.release_readiness.queue_015_status).toBe("blocked");
    expect(featureList.release_readiness.queue_041_status).toBe("accepted");
    expect(featureList.release_readiness.queue_045_status).toBe("accepted");
    expect(featureList.release_readiness.queue_046_status).toBe("accepted");
    expect(featureList.release_readiness.queue_050_status).toBe("accepted");
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.find((item) => item.id === "queue-041-v086-runtime-ux-reality-audit")?.status).toBe("accepted");
    expect(queue.items.find((item) => item.id === "queue-045-v090-fake-runtime-ux-checkpoint")?.status).toBe("accepted");
    expect(queue.items.find((item) => item.id === "queue-046-v091-accepted-state-reality-audit")?.status).toBe("accepted");
    expect(queue.items.find((item) => item.id === "queue-050-v095-next-work-decision-checkpoint")?.status).toBe("accepted");
  });
});
