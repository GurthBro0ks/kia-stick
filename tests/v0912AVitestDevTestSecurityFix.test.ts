import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const docPath = "docs/v0.9.12A-vitest-dev-test-security-fix.md";
const phase = "KIA-Stick-v0.9.12A-vitest-dev-test-security-fix";
const productVersion = "0.7.0";
const promptVersion = "prompt.fake-docs.v0.5-import-wizard-hardening";

describe("v0.9.12A Vitest dev/test security fix", () => {
  it("documents the targeted Vitest-only dependency fix and remaining runtime work", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "915b819cf9fdd9e688c62c210bf523c5e34741a0",
      "npm install --save-dev vitest@3.2.6",
      "vitest@2.1.9",
      "vitest@3.2.6",
      "vite@7.3.6",
      "vite-node@3.2.4",
      "@vitest/mocker@3.2.6",
      "esbuild@0.28.1",
      "After the targeted Vitest update, npm audit reports no remaining `vitest`, `vite`, `vite-node`, `@vitest/mocker`, or `esbuild` vulnerability entries.",
      "All four remained unchanged.",
      "KIA-Stick-v0.9.12B-next-runtime-framework-security-plan",
      `Product/package version remain \`${productVersion}\`.`,
      `Prompt version remains \`${promptVersion}\`.`,
      "`queue-015-v07-first-real-doc-gate-request` remains blocked.",
      "No real-doc implementation is approved.",
      "Push is not performed in this implementation phase.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks package and feature state without changing runtime packages or queue-015", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      version: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
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
      v0912a_vitest_dev_test_security_fix: {
        phase: string;
        status: string;
        direct_package_updated: string;
        direct_version_before: string;
        direct_version_after: string;
        remaining_vitest_chain_advisories: string;
        remaining_runtime_advisories_deferred_to: string;
        next_runtime_packages_changed: boolean;
        runtime_code_changed: boolean;
        queue_015_status: string;
        real_doc_implementation_approved: boolean;
        manual_qa_status: string;
        operator_qa_pass_proof_dir: string;
        ready_to_push: boolean;
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
    expect(pkg.devDependencies.vitest).toBe("^3.2.6");
    expect(lock.packages["node_modules/vitest"].version).toBe("3.2.6");
    expect(lock.packages["node_modules/vite"].version).toBe("7.3.6");
    expect(lock.packages["node_modules/vite-node"].version).toBe("3.2.4");
    expect(lock.packages["node_modules/@vitest/mocker"].version).toBe("3.2.6");
    expect(lock.packages["node_modules/esbuild"].version).toBe("0.28.1");
    expect(lock.packages["node_modules/next"].version).toBe("15.5.19");
    expect(lock.packages["node_modules/postcss"].version).toBe("8.4.31");
    expect(featureList.release_readiness.product_version).toBe(productVersion);
    expect(featureList.release_readiness.prompt_version).toBe(promptVersion);
    expect(featureList.release_readiness.queue_015_status).toBe("blocked");
    expect(featureList.v0912a_vitest_dev_test_security_fix.phase).toBe(phase);
    expect(featureList.v0912a_vitest_dev_test_security_fix.status).toBe("ready_to_push");
    expect(featureList.v0912a_vitest_dev_test_security_fix.direct_package_updated).toBe("vitest");
    expect(featureList.v0912a_vitest_dev_test_security_fix.direct_version_before).toBe("2.1.9");
    expect(featureList.v0912a_vitest_dev_test_security_fix.direct_version_after).toBe("3.2.6");
    expect(featureList.v0912a_vitest_dev_test_security_fix.remaining_vitest_chain_advisories).toBe("none");
    expect(featureList.v0912a_vitest_dev_test_security_fix.remaining_runtime_advisories_deferred_to).toBe("KIA-Stick-v0.9.12B-next-runtime-framework-security-plan");
    expect(featureList.v0912a_vitest_dev_test_security_fix.next_runtime_packages_changed).toBe(false);
    expect(featureList.v0912a_vitest_dev_test_security_fix.runtime_code_changed).toBe(false);
    expect(featureList.v0912a_vitest_dev_test_security_fix.queue_015_status).toBe("blocked");
    expect(featureList.v0912a_vitest_dev_test_security_fix.real_doc_implementation_approved).toBe(false);
    expect(featureList.v0912a_vitest_dev_test_security_fix.manual_qa_status).toBe("PASS");
    expect(featureList.v0912a_vitest_dev_test_security_fix.operator_qa_pass_proof_dir).toBe("/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_12A_vitest_dev_test_security_fix_20260627T153005Z");
    expect(featureList.v0912a_vitest_dev_test_security_fix.ready_to_push).toBe(true);
    expect(featureList.v0912a_vitest_dev_test_security_fix.pushed).toBe(false);
    expect(queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request")?.status).toBe("blocked");
  });
});
