import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const docPath = "docs/v0.9.12B-next-runtime-framework-security-plan.md";
const phase = "KIA-Stick-v0.9.12B-next-runtime-framework-security-plan";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";
const proofDir =
  "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_12B_next_runtime_framework_security_plan_20260627T155320Z";

describe("v0.9.12B Next runtime framework security plan", () => {
  it("documents the remaining Next/PostCSS advisory path and stops before implementation", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "f412bcf8e802f3ef0a800d46a0ab6b32da7f4da3",
      proofDir,
      "`next`: `^15.1.3`",
      "`next`: `15.5.19`",
      "`react`: `19.2.7`",
      "`react-dom`: `19.2.7`",
      "top-level `postcss`: `8.4.31`",
      "nested `node_modules/vite/node_modules/postcss`: `8.5.15`",
      "`next`: direct runtime/build framework dependency.",
      "`postcss`: transitive dependency affected through `next`.",
      "forced semver-major fix to `next@9.3.3`",
      "safe target remains unclear",
      "KIA-Stick-v0.9.12C-next-runtime-framework-security-implementation",
      "npm install --save-exact next@<operator-approved-version>",
      "Do not add a direct `postcss` dependency",
      "No `npm audit fix`, `npm update`, `npm install`, package-manager mutation",
      "No runtime code was changed.",
      "No dependency versions were changed.",
      `Product/package version remain \`${productVersion}\`.`,
      `Prompt version remains \`${promptVersion}\`.`,
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "No real-doc implementation is approved.",
      "Chat",
      "Sources",
      "Saved",
      "Upload",
      "Import",
      "Vault",
      "Settings",
      "`/version`",
      "`/health`",
      "`git revert`",
      "Result: `WARN_SAFE_NEXT_TARGET_UNCLEAR`",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks planning state without package, runtime, version, or queue drift", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      version: string;
      dependencies: Record<string, string>;
    };
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
      packages: Record<string, { version?: string }>;
    };
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      release_readiness: {
        product_version: string;
        prompt_version: string;
        queue_015_status: string;
      };
      features: string[];
      v0912b_next_runtime_framework_security_plan: {
        phase: string;
        status: string;
        document: string;
        proof_dir: string;
        closeout_push_proof_dir: string;
        accepted_baseline_commit: string;
        planning_only: boolean;
        safe_next_target_status: string;
        current_next_package_json: string;
        current_next_lockfile: string;
        current_next_postcss_lockfile: string;
        vite_nested_postcss_lockfile: string;
        npm_audit_total: number;
        npm_audit_remaining: string[];
        npm_audit_fix_available: string;
        next_latest_stable_from_npm_view: string;
        react_latest_from_npm_view: string;
        postcss_latest_from_npm_view: string;
        package_json_changed: boolean;
        package_lock_changed: boolean;
        dependency_versions_changed: boolean;
        runtime_code_changed: boolean;
        npm_audit_fix_run: boolean;
        npm_update_run: boolean;
        npm_install_run: boolean;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
        manual_qa_status: string;
        operator_qa_acceptance_text: string;
        pushed: boolean;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; status: string }>;
    };

    expect(pkg.version).toBe(productVersion);
    expect(pkg.dependencies.next).toBe("^15.1.3");
    expect(pkg.dependencies.react).toBe("^19.0.0");
    expect(pkg.dependencies["react-dom"]).toBe("^19.0.0");
    expect(lock.packages["node_modules/next"].version).toBe("15.5.19");
    expect(lock.packages["node_modules/react"].version).toBe("19.2.7");
    expect(lock.packages["node_modules/react-dom"].version).toBe("19.2.7");
    expect(lock.packages["node_modules/postcss"].version).toBe("8.4.31");
    expect(lock.packages["node_modules/vite/node_modules/postcss"].version).toBe("8.5.15");
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.release_readiness.queue_015_status).toBe("blocked");
    expect(featureList.features).toContain("v0912b_next_runtime_framework_security_plan");

    const state = featureList.v0912b_next_runtime_framework_security_plan;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted_warn_parked_after_closeout_push");
    expect(state.document).toBe(docPath);
    expect(state.proof_dir).toBe(proofDir);
    expect(state.closeout_push_proof_dir).toBe(`${proofDir}/warn_closeout_push_20260627T162001Z`);
    expect(state.accepted_baseline_commit).toBe("f412bcf8e802f3ef0a800d46a0ab6b32da7f4da3");
    expect(state.planning_only).toBe(true);
    expect(state.safe_next_target_status).toBe("unclear_from_npm_audit");
    expect(state.current_next_package_json).toBe("^15.1.3");
    expect(state.current_next_lockfile).toBe("15.5.19");
    expect(state.current_next_postcss_lockfile).toBe("8.4.31");
    expect(state.vite_nested_postcss_lockfile).toBe("8.5.15");
    expect(state.npm_audit_total).toBe(2);
    expect(state.npm_audit_remaining).toEqual(["next", "postcss"]);
    expect(state.npm_audit_fix_available).toBe("next@9.3.3 semver-major forced downgrade");
    expect(state.next_latest_stable_from_npm_view).toBe("16.2.9");
    expect(state.react_latest_from_npm_view).toBe("19.2.7");
    expect(state.postcss_latest_from_npm_view).toBe("8.5.15");
    expect(state.package_json_changed).toBe(false);
    expect(state.package_lock_changed).toBe(false);
    expect(state.dependency_versions_changed).toBe(false);
    expect(state.runtime_code_changed).toBe(false);
    expect(state.npm_audit_fix_run).toBe(false);
    expect(state.npm_update_run).toBe(false);
    expect(state.npm_install_run).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
    expect(state.manual_qa_status).toBe("PASS_ACCEPTED_WARN");
    expect(state.operator_qa_acceptance_text).toBe(`OPERATOR_QA_ACCEPTED_WARN for ${proofDir}`);
    expect(state.pushed).toBe(true);
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
  });
});
