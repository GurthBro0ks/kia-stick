import { existsSync, readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VaultPanel } from "@/components/KiaStickApp";
import { createRuntimeVersion } from "@/lib/version";
import { laneCounts, migrateVaultState, workflowStateCounts } from "@/lib/vaultModel";

const phase = "KIA-Stick-v0.8.8-sources-upload-import-vault-polish";
const docPath = "docs/v0.8.8-sources-upload-import-vault-polish.md";

describe("v0.8.8 Sources/Upload/Import/Vault polish", () => {
  it("documents fake-only scan-density polish", () => {
    expect(existsSync(docPath)).toBe(true);
    const doc = readFileSync(docPath, "utf8");

    expect(doc).toContain(phase);
    expect(doc).toContain("Sources summary now reports total fake sources");
    expect(doc).toContain("Upload now includes a QA cue rail");
    expect(doc).toContain("Vault now includes a QA cue rail");
    expect(doc).toContain("Import now includes a QA cue rail");
    expect(doc).toContain("Upload remains fake metadata buttons only");
    expect(doc).toContain("Import remains a fake metadata state machine only");
    expect(doc).toContain("Vault remains fake metadata and governance only");
  });

  it("adds runtime cue rails without file intake capability", () => {
    const component = readFileSync("components/KiaStickApp.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(component).toContain("Upload fake-only checks");
    expect(component).toContain("metadata buttons only");
    expect(component).toContain("no file chooser");
    expect(component).toContain("context-only guardrails");
    expect(component).toContain("citation role counts");
    expect(component).toContain("Vault operator QA summary");
    expect(component).toContain("Import wizard operator QA summary");
    expect(component).toContain("real actions disabled");
    expect(css).toContain(".qaCueRail");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(component).not.toMatch(/showOpenFilePicker|showDirectoryPicker|FileReader|readAsText|readAsArrayBuffer/i);
    expect(component).not.toMatch(/createVectorStore|VectorStore\.from|runOcr|multer|uploadHandler/i);
  });

  it("tracks feature and queue state", () => {
    const featureList = JSON.parse(readFileSync("feature_list.json", "utf8")) as {
      v088_sources_upload_import_vault_polish: {
        phase: string;
        status: string;
        queue_043_status: string;
        sources_citable_context_counts: boolean;
        upload_fake_metadata_cue_rail: boolean;
        import_fake_state_cue_rail: boolean;
        vault_fake_governance_cue_rail: boolean;
        upload_remains_fake_metadata_only: boolean;
        import_remains_fake_state_machine_only: boolean;
        vault_remains_fake_governance_only: boolean;
        queue_015_status: string;
      };
    };
    const queue = JSON.parse(readFileSync("docs/phase-backlog.json", "utf8")) as {
      items: Array<{ id: string; phase: string; status: string }>;
    };
    const item = queue.items.find((candidate) => candidate.id === "queue-043-v088-sources-upload-import-vault-polish");
    const state = featureList.v088_sources_upload_import_vault_polish;

    expect(state.phase).toBe(phase);
    expect(state.status).toBe("operator_qa_passed_ready_to_push");
    expect(state.queue_043_status).toBe("ready_to_push");
    expect(state.sources_citable_context_counts).toBe(true);
    expect(state.upload_fake_metadata_cue_rail).toBe(true);
    expect(state.import_fake_state_cue_rail).toBe(true);
    expect(state.vault_fake_governance_cue_rail).toBe(true);
    expect(state.upload_remains_fake_metadata_only).toBe(true);
    expect(state.import_remains_fake_state_machine_only).toBe(true);
    expect(state.vault_remains_fake_governance_only).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(item?.phase).toBe(phase);
    expect(item?.status).toBe("ready_to_push");
  });

  it("migrates stale Vault browser state before render/export arrays are used", () => {
    const staleState = {
      records: [
        {
          id: "fake-vault-member-only",
          lifecycleStep: "redaction_review",
          redactionStatus: "review_needed",
          metadataStatus: "needs_changes",
          lastBlockedReason: "stale fake browser state with no redaction arrays",
        },
      ],
      auditLog: [],
    };

    const state = migrateVaultState(staleState);
    const memberOnly = state.records.find((record) => record.id === "fake-vault-member-only");

    expect(memberOnly?.redactionFlags).toEqual(["fake-member-only-label"]);
    expect(memberOnly?.redactionMetadata).toHaveLength(1);
    expect(() =>
      renderToStaticMarkup(React.createElement(VaultPanel, {
        counts: laneCounts(state.records),
        workflowCounts: workflowStateCounts(state.records),
        state,
        view: "vault",
        runtimeVersion: createRuntimeVersion({ buildDate: "20260627", gitSha: "vaultfix" }),
        setView: () => undefined,
        onAction: () => undefined,
      }))
    ).not.toThrow();

    const html = renderToStaticMarkup(React.createElement(VaultPanel, {
      counts: laneCounts(state.records),
      workflowCounts: workflowStateCounts(state.records),
      state,
      view: "vault",
      runtimeVersion: createRuntimeVersion({ buildDate: "20260627", gitSha: "vaultfix" }),
      setView: () => undefined,
      onAction: () => undefined,
    }));

    expect(html).toContain("Vault operator QA summary");
    expect(html).toContain("fake metadata rows");
    expect(html).not.toContain("type=\"file\"");
  });
});
