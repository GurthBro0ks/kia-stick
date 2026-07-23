import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_GRIEVANCE_OUTLINE_PHASE } from "@/lib/publicGrievanceOutline";

const phase = "KIA-Stick-v0.8.9-mobile-narrow-operator-qa-polish";
const docPath = "docs/v0.8.9-mobile-narrow-operator-qa-polish.md";
const scriptPath = "scripts/operator-qa-smoke.mjs";

describe("v0.8.9 mobile/narrow operator QA polish", () => {
  it("documents mobile/narrow local-only QA support", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("Narrow views now wrap QA cue rails");
    expect(doc).toContain("Bottom nav labels keep stable dimensions");
    expect(doc).toContain("The smoke helper still accepts only loopback URLs");
    expect(doc).toContain("No service, cron, timer, tmux, Caddy, DNS");
  });

  it("keeps CSS responsive and scan-friendly for narrow QA", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("@media (max-width: 420px)");
    expect(css).toContain(".qaCueRail");
    expect(css).toContain(".navButton span");
    expect(css).toContain("white-space: nowrap;");
    expect(css).toContain("white-space: normal;");
  });

  it("prints bundle surfaces from operator smoke without requiring a server", () => {
    const result = spawnSync("node", [scriptPath, "--base-url", "http://127.0.0.1:9"], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Operator QA smoke PASS");
    expect(result.stdout).toContain("Project phase: KIA-Stick-v0.9.10-synthetic-governance-hardening-checkpoint");
    expect(result.stdout).toContain(`Runtime phase: ${PUBLIC_GRIEVANCE_OUTLINE_PHASE}`);
    expect(result.stdout).toContain("Bundle smoke surfaces:");
    for (const surface of [
      "Chat no-answer save blocking",
      "Sources citable/context labels",
      "Saved empty/detail/version metadata",
      "Upload fake metadata buttons only",
      "Import fake state machine",
      "Vault fake governance workflow",
      "Settings version identity",
      "/health local route",
      "/version local route",
      "Mobile narrow layout",
    ]) {
      expect(result.stdout).toContain(surface);
    }
    expect(result.stdout).toContain("local_route_checks=SKIPPED_SERVER_UNAVAILABLE");

    const reject = spawnSync("node", [scriptPath, "--base-url", "https://example.com"], { encoding: "utf8" });
    expect(reject.status).not.toBe(0);
    expect(reject.stderr).toContain("Base URL must stay on loopback");
  });

  it("tracks feature and queue state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v089_mobile_narrow_operator_qa_polish: {
        phase: string;
        status: string;
        queue_044_status: string;
        mobile_narrow_layout_polish: boolean;
        operator_smoke_surface_list_added: boolean;
        local_loopback_only_smoke: boolean;
        services_restarted: boolean;
        queue_015_status: string;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string }>;
    };
    const item = queue.items.find((candidate) => candidate.id === "queue-044-v089-mobile-narrow-operator-qa-polish");
    const state = featureList.v089_mobile_narrow_operator_qa_polish;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted_after_closeout_push");
    expect(state.queue_044_status).toBe("accepted");
    expect(state.mobile_narrow_layout_polish).toBe(true);
    expect(state.operator_smoke_surface_list_added).toBe(true);
    expect(state.local_loopback_only_smoke).toBe(true);
    expect(state.services_restarted).toBe(false);
    expect(state.queue_015_status).toBe("blocked");
    expect(item?.phase).toBe(phase);
    expect(item?.status).toBe("accepted");
  });
});
