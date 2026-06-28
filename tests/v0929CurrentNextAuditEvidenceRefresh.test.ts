import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.29-current-next-audit-evidence-refresh";
const docPath = "docs/v0.9.29-current-next-audit-evidence-refresh.md";

describe("v0.9.29 current Next audit evidence refresh", () => {
  it("records read-only npm audit and metadata evidence without approving mutation", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const required of [
      phase,
      "Network metadata status: `PASS`",
      "Lockfile `next`: `15.5.19`",
      "Lockfile `react`: `19.2.7`",
      "Lockfile `react-dom`: `19.2.7`",
      "Next transitive `postcss`: `8.4.31`",
      "Vite nested `postcss`: `8.5.15`",
      "npm registry `next` latest: `16.2.9`",
      "npm audit --json` exited with status `1`",
      "Audit vulnerability count: `2 moderate`",
      "`postcss` affected range: `<8.5.10`",
      "npm audit suggested fix: `next@9.3.3`, semver-major forced downgrade",
      "`next@16.2.9` is `not_proven_clean`",
      "Result: `WARN_SAFE_NEXT_TARGET_UNCLEAR`",
      "No `npm install`, `npm update`, `npm audit fix`, `npm dedupe`, or `npm prune` was run.",
    ]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks package state and audit result in feature state", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string; dependencies: Record<string, string> };
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as { packages: Record<string, { version?: string }> };
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v0929_current_next_audit_evidence_refresh: {
        phase: string;
        status: string;
        network_metadata_status: string;
        audit_exit_status: number;
        audit_moderate_count: number;
        current_next_lockfile: string;
        next_latest_from_npm_view: string;
        next_latest_postcss_dependency: string;
        package_lock_changed: boolean;
        npm_install_run: boolean;
        npm_update_run: boolean;
        npm_audit_fix_run: boolean;
      };
    };
    const state = featureList.v0929_current_next_audit_evidence_refresh;

    expect(pkg.version).toBe("0.7.0");
    expect(pkg.dependencies.next).toBe("^15.1.3");
    expect(lock.packages["node_modules/next"].version).toBe("15.5.19");
    expect(lock.packages["node_modules/postcss"].version).toBe("8.4.31");
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("ready_to_push");
    expect(state.network_metadata_status).toBe("PASS");
    expect(state.audit_exit_status).toBe(1);
    expect(state.audit_moderate_count).toBe(2);
    expect(state.current_next_lockfile).toBe("15.5.19");
    expect(state.next_latest_from_npm_view).toBe("16.2.9");
    expect(state.next_latest_postcss_dependency).toBe("8.4.31");
    expect(state.package_lock_changed).toBe(false);
    expect(state.npm_install_run).toBe(false);
    expect(state.npm_update_run).toBe(false);
    expect(state.npm_audit_fix_run).toBe(false);
  });
});
