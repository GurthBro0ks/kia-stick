import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.21-proof-acceptance-readiness-helper";
const docPath = "docs/v0.9.21-proof-acceptance-readiness-helper.md";
const scriptPath = resolve("scripts/fake-browser-qa-evidence.mjs");

interface QaModule {
  buildFakeBrowserQaEvidence(options?: { root?: string; phase?: string }): {
    phase: string;
    proofReviewField: string;
    manualQaStatus: string;
    pushedState: string;
    dirtyState: string;
    packageLockUnchangedExpected: boolean;
    queue015Status: string;
    nextPostcssStatus: string;
    v0912cStatus: string;
    realDocCapabilityBlocked: boolean;
    browserDocumentIntakeBlocked: boolean;
  };
  renderMarkdownEvidence(packet: unknown): string;
}

async function loadModule(): Promise<QaModule> {
  return (await import(pathToFileURL(scriptPath).href)) as QaModule;
}

describe("v0.9.21 proof acceptance readiness helper", () => {
  it("documents the readiness fields required for operator closeout review", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "proof PASS/WARN/FAIL review field",
      "manual QA status",
      "pushed state",
      "dirty state",
      "package-lock unchanged expectation",
      "queue-015-v07-first-real-doc-gate-request",
      "WARN_SAFE_NEXT_TARGET_UNCLEAR",
      "real-doc and browser file capability blocked status",
      "local-only and no-push",
      "Manual QA remains `PENDING`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("renders readiness output without accepting, pushing, or claiming Next/PostCSS fixed", async () => {
    const mod = await loadModule();
    const packet = mod.buildFakeBrowserQaEvidence({ root: process.cwd(), phase });
    const markdown = mod.renderMarkdownEvidence(packet);
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0921_proof_acceptance_readiness_helper: {
        phase: string;
        status: string;
        proof_pass_warn_fail_field: boolean;
        pushed_state_field: boolean;
        dirty_state_field: boolean;
        package_lock_unchanged_field: boolean;
        next_postcss_parked_field: string;
        real_doc_capability_blocked_field: boolean;
        manual_qa_status: string;
      };
    };
    const state = featureList.v0921_proof_acceptance_readiness_helper;

    expect(packet.phase).toBe(phase);
    expect(packet.proofReviewField).toBe("PENDING_OPERATOR_REVIEW");
    expect(packet.manualQaStatus).toBe("PENDING");
    expect(packet.pushedState).toBe("no");
    expect(packet.dirtyState).toBe("operator_must_check_git_status");
    expect(packet.packageLockUnchangedExpected).toBe(true);
    expect(packet.queue015Status).toBe("blocked");
    expect(packet.nextPostcssStatus).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(packet.v0912cStatus).toBe("blocked_pending_exact_operator_approved_next_target");
    expect(packet.realDocCapabilityBlocked).toBe(true);
    expect(packet.browserDocumentIntakeBlocked).toBe(true);
    expect(markdown).toContain("PUSHED_STATE=no");
    expect(markdown).toContain("NEXT_POSTCSS_STATUS=WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.proof_pass_warn_fail_field).toBe(true);
    expect(state.pushed_state_field).toBe(true);
    expect(state.dirty_state_field).toBe(true);
    expect(state.package_lock_unchanged_field).toBe(true);
    expect(state.next_postcss_parked_field).toBe("WARN_SAFE_NEXT_TARGET_UNCLEAR");
    expect(state.real_doc_capability_blocked_field).toBe(true);
    expect(state.manual_qa_status).toBe("PENDING");
  });
});
