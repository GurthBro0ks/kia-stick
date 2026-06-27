import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.13-post-security-accepted-state-checkpoint";
const docPath = "docs/v0.9.13-post-security-accepted-state-checkpoint.md";

describe("v0.9.13 post-security accepted-state checkpoint", () => {
  it("records accepted security state without dependency or real-doc drift", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "dd20bf72fc00bb9d69c0d116009ef392e9948218",
      "v0.9.12A fixed only the Vitest/dev-test path",
      "WARN_SAFE_NEXT_TARGET_UNCLEAR",
      "`next` and transitive `postcss`",
      "next@9.3.3",
      "KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation",
      "`package.json` remains unchanged",
      "`package-lock.json` remains unchanged",
      "Product/package version remains `0.7.0`",
      "Prompt version remains `prompt.fake-docs.v0.5-import-wizard-hardening`",
      "`queue-015-v07-first-real-doc-gate-request` remains blocked",
      "No real-doc implementation is approved",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks local bundle state and keeps queue-015 blocked", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0913_post_security_accepted_state_checkpoint: {
        phase: string;
        status: string;
        vitest_dev_test_path_fixed: boolean;
        next_runtime_path_status: string;
        next_postcss_advisories_fixed: boolean;
        v0912c_blocked_pending_exact_target: boolean;
        package_lock_changed: boolean;
        queue_015_status: string;
        manual_qa_status: string;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };
    const realDocGate = queue.items.find((candidate) => candidate.id === "queue-015-v07-first-real-doc-gate-request");
    const state = featureList.v0913_post_security_accepted_state_checkpoint;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.vitest_dev_test_path_fixed).toBe(true);
    expect(state.next_runtime_path_status).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.next_postcss_advisories_fixed).toBe(false);
    expect(state.v0912c_blocked_pending_exact_target).toBe(true);
    expect(state.package_lock_changed).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.manual_qa_status).toBe("PENDING");
    expect(realDocGate?.status).toBe("blocked");
  });
});
