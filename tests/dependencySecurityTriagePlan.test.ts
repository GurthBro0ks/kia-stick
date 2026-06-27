import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const docPath = "docs/v0.9.11-dependency-security-triage-plan.md";
const phase = "KIA-Stick-v0.9.11-dependency-security-triage-plan";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.9.11 dependency security triage plan", () => {
  it("records npm audit risk without applying dependency changes", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "48abdbeafd14dd5729bab9d6460d35e457f01eae",
      "Direct vulnerable packages: 2",
      "`next`",
      "`vitest`",
      "No safe non-breaking fix is applied or proven in this phase.",
      "`package.json` was not changed.",
      "`package-lock.json` was not changed.",
      "No dependency versions were changed.",
      `Product/package version remain \`${productVersion}\`.`,
      `Prompt version remains \`${promptVersion}\`.`,
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "No real-doc implementation is approved.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the planning phase in feature state without changing the accepted release phase or queue", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      phase: string;
      release_readiness: {
        phase: string;
        product_version: string;
        prompt_version: string;
        queue_015_status: string;
      };
      v0911_dependency_security_triage_plan: {
        phase: string;
        status: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        dependency_versions_changed: boolean;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
        recommended_future_phase: string;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };

    expect(featureList.phase).toBe("KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint");
    expect(featureList.release_readiness.phase).toBe(featureList.phase);
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.release_readiness.queue_015_status).toBe("blocked");
    expect(featureList.v0911_dependency_security_triage_plan.phase).toBe(phase);
    expect(featureList.v0911_dependency_security_triage_plan.status).toBe("needs_operator_review");
    expect(featureList.v0911_dependency_security_triage_plan.package_json_changed).toBe(false);
    expect(featureList.v0911_dependency_security_triage_plan.package_lock_changed).toBe(false);
    expect(featureList.v0911_dependency_security_triage_plan.dependency_versions_changed).toBe(false);
    expect(featureList.v0911_dependency_security_triage_plan.queue_015_status).toBe("blocked");
    expect(featureList.v0911_dependency_security_triage_plan.real_doc_implementation_approved).toBe(false);
    expect(featureList.v0911_dependency_security_triage_plan.recommended_future_phase).toBe("KIA-Stick-v0.9.12-dependency-security-fix-plan-or-implementation");
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
    expect(queue.items.some((item) => item.id === "queue-056-v0911-dependency-security-triage-plan")).toBe(false);
  });
});
