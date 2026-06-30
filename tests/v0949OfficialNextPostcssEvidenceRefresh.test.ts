import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v0.9.49-official-next-postcss-evidence-refresh";
const docPath = "docs/v0.9.49-official-next-postcss-evidence-refresh.md";

describe("v0.9.49 official Next PostCSS evidence refresh", () => {
  it("records official read-only evidence without approving package mutation", () => {
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
      "npm registry `postcss` latest: `8.5.16`",
      "npm audit --json` exited with status `1`",
      "Audit vulnerability count: `2 moderate`",
      "`postcss` affected range: `<8.5.10`",
      "npm audit suggested fix: `next@9.3.3`, semver-major forced downgrade",
      "Official advisory page was reachable for `GHSA-qx2v-qp2m-jg93`",
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
      v0949_official_next_postcss_evidence_refresh: {
        phase: string;
        status: string;
        network_metadata_status: string;
        audit_exit_status: number;
        audit_moderate_count: number;
        current_next_lockfile: string;
        next_latest_from_npm_view: string;
        next_latest_postcss_dependency: string;
        postcss_latest_from_npm_view: string;
        package_lock_changed: boolean;
        npm_install_run: boolean;
        npm_update_run: boolean;
        npm_audit_fix_run: boolean;
      };
    };
    const state = featureList.v0949_official_next_postcss_evidence_refresh;

    expect(pkg.version).toBe("0.7.0");
    expect(pkg.dependencies.next).toBe("^15.1.3");
    expect(lock.packages["node_modules/next"].version).toBe("15.5.19");
    expect(lock.packages["node_modules/postcss"].version).toBe("8.4.31");
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("needs_review");
    expect(state.network_metadata_status).toBe("PASS");
    expect(state.audit_exit_status).toBe(1);
    expect(state.audit_moderate_count).toBe(2);
    expect(state.current_next_lockfile).toBe("15.5.19");
    expect(state.next_latest_from_npm_view).toBe("16.2.9");
    expect(state.next_latest_postcss_dependency).toBe("8.4.31");
    expect(state.postcss_latest_from_npm_view).toBe("8.5.16");
    expect(state.package_lock_changed).toBe(false);
    expect(state.npm_install_run).toBe(false);
    expect(state.npm_update_run).toBe(false);
    expect(state.npm_audit_fix_run).toBe(false);
  });
});
