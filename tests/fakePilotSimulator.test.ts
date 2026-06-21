import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  applyFakePilotSimulatorAction,
  assertFakePilotPayloadSafe,
  createInitialFakePilotSimulatorState,
  exportFakePilotSimulatorProofJson,
  exportFakePilotSimulatorProofMarkdown,
  fakePilotGateResults,
  fakePilotProofResult,
  fakePilotSimulatorGateLabels,
  fakePilotSimulatorGates,
  type FakePilotSimulatorAction,
  type FakePilotSimulatorState,
} from "@/lib/fakePilotSimulatorModel";
import { createRuntimeVersion } from "@/lib/version";

const checklist = readFileSync("docs/v0.6-real-doc-safety-checklist.md", "utf8");
const runtimeVersion = createRuntimeVersion({ buildDate: "20260621", gitSha: "sim063" });

function runSimulator(actions: FakePilotSimulatorAction[]): FakePilotSimulatorState {
  return actions.reduce((state, action) => applyFakePilotSimulatorAction(state, action), createInitialFakePilotSimulatorState());
}

function happyPath(): FakePilotSimulatorState {
  return runSimulator([
    { type: "approve_operator", now: "2026-06-21T17:00:00.000Z" },
    { type: "confirm_scope", now: "2026-06-21T17:01:00.000Z", itemCount: 1, sourceCategoryLabel: "synthetic_local_policy_label" },
    { type: "confirm_nonrecursive", now: "2026-06-21T17:02:00.000Z" },
    { type: "assign_quarantine_label", now: "2026-06-21T17:03:00.000Z", quarantineLabel: "synthetic_private_holding_label" },
    { type: "record_provenance_label", now: "2026-06-21T17:04:00.000Z", provenanceLabel: "synthetic_receipt_label" },
    { type: "review_redaction", now: "2026-06-21T17:05:00.000Z", findingCounts: { fake_name_label: 1, fake_date_label: 1 } },
    { type: "review_metadata", now: "2026-06-21T17:06:00.000Z", metadataCounts: { authority_label: 1, sensitivity_label: 1 } },
    { type: "decide_eligibility", now: "2026-06-21T17:07:00.000Z", decision: "candidate_metadata_only" },
    { type: "confirm_audit", now: "2026-06-21T17:08:00.000Z" },
    { type: "confirm_rollback", now: "2026-06-21T17:09:00.000Z" },
    { type: "decide_retention", now: "2026-06-21T17:10:00.000Z", decision: "delete_synthetic_run" },
  ]);
}

function readRuntimeSources(): string {
  const candidates = [
    "app/health/route.ts",
    "app/layout.tsx",
    "app/page.tsx",
    "app/version/page.tsx",
    "components/KiaStickApp.tsx",
    "lib/answerGovernor.ts",
    "lib/conversationModel.ts",
    "lib/fakePilotSimulatorModel.ts",
    "lib/importWizardModel.ts",
    "lib/redactionMetadataModel.ts",
    "lib/savedAnswers.ts",
    "lib/serverVersion.ts",
    "lib/sourceModel.ts",
    "lib/vaultModel.ts",
    "lib/version.ts",
  ];

  const files: string[] = [];
  for (const file of candidates) {
    expect(existsSync(file)).toBe(true);
    files.push(readFileSync(file, "utf8"));
  }

  return files.join("\n");
}

describe("fake pilot simulator model", () => {
  it("ships every v0.6 pilot gate and starts with synthetic metadata only", () => {
    const state = createInitialFakePilotSimulatorState();

    expect(fakePilotSimulatorGates).toEqual([
      "approval",
      "scope",
      "nonrecursive",
      "quarantine_label",
      "provenance",
      "redaction_review",
      "metadata_review",
      "eligibility",
      "audit",
      "rollback",
      "retention",
    ]);
    expect(state.currentGate).toBe("approval");
    expect(state.fakeOnly).toBe(true);
    expect(state.realActionsDisabled).toBe(true);
    expect(state.record).toMatchObject({
      pilotId: "fake-pilot-001",
      itemCount: 1,
      recursiveDiscovery: false,
      eligibilityDecision: "not_indexable",
      retentionDecision: "delete_synthetic_run",
      syntheticOnly: true,
    });
    expect(fakePilotProofResult(state)).toBe("WARN");
    expect(fakePilotGateResults(state).every((result) => result.status === "WARN")).toBe(true);
  });

  it("moves through the happy path without touching files or real content", () => {
    const state = happyPath();
    const results = fakePilotGateResults(state);

    expect(state.currentGate).toBe("retention");
    expect(state.completedGates).toEqual(fakePilotSimulatorGates);
    expect(state.record.sourceCategoryLabel).toBe("synthetic_local_policy_label");
    expect(state.record.quarantineLabel).toBe("synthetic_private_holding_label");
    expect(state.record.provenanceLabel).toBe("synthetic_receipt_label");
    expect(state.record.redactionFindingCounts).toEqual({ fake_name_label: 1, fake_date_label: 1 });
    expect(state.record.metadataReviewCounts).toEqual({ authority_label: 1, sensitivity_label: 1 });
    expect(state.record.eligibilityDecision).toBe("candidate_metadata_only");
    expect(state.record.retentionDecision).toBe("delete_synthetic_run");
    expect(results.every((result) => result.status === "PASS")).toBe(true);
    expect(fakePilotProofResult(state)).toBe("PASS");
    expect(state.auditLog.map((entry) => entry.status)).toContain("PASS");
    expect(state.auditLog.map((entry) => entry.note).join(" ")).not.toMatch(/private\.pdf|raw document text|source file bytes/i);
  });

  it("records WARN labels without approving real content", () => {
    const state = applyFakePilotSimulatorAction(createInitialFakePilotSimulatorState(), {
      type: "record_warning",
      gate: "metadata_review",
      reasonCode: "operator_review_needed",
      label: "Metadata reviewer label needs operator review before any later content phase.",
      now: "2026-06-21T17:11:00.000Z",
    });
    const metadataResult = fakePilotGateResults(state).find((result) => result.gate === "metadata_review");

    expect(metadataResult?.status).toBe("WARN");
    expect(fakePilotProofResult(state)).toBe("WARN");
    expect(state.auditLog[0]).toMatchObject({
      gate: "metadata_review",
      status: "WARN",
      action: "record_fake_pilot_warning",
    });
  });

  it("blocks FAIL paths for skipped gates, batch scope, and recursive discovery", () => {
    const skipped = applyFakePilotSimulatorAction(createInitialFakePilotSimulatorState(), {
      type: "decide_eligibility",
      decision: "candidate_metadata_only",
      now: "2026-06-21T17:12:00.000Z",
    });
    const approved = applyFakePilotSimulatorAction(createInitialFakePilotSimulatorState(), {
      type: "approve_operator",
      now: "2026-06-21T17:13:00.000Z",
    });
    const batch = applyFakePilotSimulatorAction(approved, {
      type: "confirm_scope",
      itemCount: 2,
      now: "2026-06-21T17:14:00.000Z",
    });
    const scoped = applyFakePilotSimulatorAction(approved, {
      type: "confirm_scope",
      itemCount: 1,
      now: "2026-06-21T17:15:00.000Z",
    });
    const recursive = applyFakePilotSimulatorAction(scoped, {
      type: "confirm_nonrecursive",
      recursiveDiscovery: true,
      now: "2026-06-21T17:16:00.000Z",
    });

    expect(skipped.lastBlockedReason).toContain("blocked until Operator approval is complete");
    expect(batch.lastBlockedReason).toContain("exactly one synthetic document");
    expect(recursive.lastBlockedReason).toContain("Recursive discovery is blocked");
    expect(fakePilotProofResult(skipped)).toBe("FAIL");
    expect(fakePilotProofResult(batch)).toBe("FAIL");
    expect(fakePilotProofResult(recursive)).toBe("FAIL");
  });

  it("blocks unsafe payload fields before they can enter simulator state", () => {
    const unsafePrivate = ["/media", "mint", "SHARED", "APWU", "private.pdf"].join("/");
    const hashLike = "a".repeat(32);
    const state = createInitialFakePilotSimulatorState();
    const blocked = applyFakePilotSimulatorAction(state, {
      type: "confirm_scope",
      privatePath: unsafePrivate,
      hash: hashLike,
      itemCount: 1,
      now: "2026-06-21T17:17:00.000Z",
    } as Record<string, unknown>);

    expect(assertFakePilotPayloadSafe({ privatePath: unsafePrivate }).ok).toBe(false);
    expect(assertFakePilotPayloadSafe({ hash: hashLike }).ok).toBe(false);
    expect(blocked.lastBlockedReason).toContain("Blocked unsafe fake pilot payload");
    expect(blocked.lastBlockedReason).toContain("forbidden file/content field");
    expect(blocked.currentGate).toBe("approval");
    expect(fakePilotProofResult(blocked)).toBe("FAIL");
  });

  it("exports GitHub-safe proof with guard fields and no unsafe values", () => {
    const state = happyPath();
    const json = exportFakePilotSimulatorProofJson(state, runtimeVersion, "2026-06-21T17:18:00.000Z");
    const markdown = exportFakePilotSimulatorProofMarkdown(state, runtimeVersion, "2026-06-21T17:18:00.000Z");
    const payload = JSON.parse(json) as {
      guard: Record<string, boolean>;
      summary: { proofResult: string; passCount: number; warnCount: number; failCount: number };
      gateResults: Array<{ status: string }>;
    };

    expect(payload.guard).toMatchObject({
      fakeMetadataOnly: true,
      syntheticIdsLabelsCountsOnly: true,
      privatePathsIncluded: false,
      filenamesIncluded: false,
      fileContentIncluded: false,
      snippetsIncluded: false,
      ocrTextIncluded: false,
      hashValuesIncluded: false,
      identifiersIncluded: false,
      exportsIncluded: false,
      vectorDataIncluded: false,
      privateNotesIncluded: false,
      uploadHandlerIncluded: false,
      fileInputIncluded: false,
      realDocumentAccessed: false,
      realPilotImplemented: false,
    });
    expect(payload.summary.proofResult).toBe("PASS");
    expect(payload.summary.passCount).toBe(fakePilotSimulatorGates.length);
    expect(payload.summary.warnCount).toBe(0);
    expect(payload.summary.failCount).toBe(0);
    expect(payload.gateResults.every((result) => result.status === "PASS")).toBe(true);
    expect(json).toContain("synthetic_local_policy_label");
    expect(markdown).toContain("PASS Operator approval");
    expect(`${json}\n${markdown}`).not.toMatch(/\b[a-f0-9]{32,}\b/i);
    expect(`${json}\n${markdown}`).not.toMatch(/private\.pdf|OCR result|raw document text/i);
  });

  it("sanitizes tainted labels and audit text before proof export", () => {
    const unsafePrivate = ["/media", "mint", "SHARED", "APWU", "private.pdf"].join("/");
    const tainted: FakePilotSimulatorState = {
      ...happyPath(),
      record: {
        ...happyPath().record,
        quarantineLabel: unsafePrivate,
      },
      auditLog: [
        {
          ...happyPath().auditLog[0],
          note: `tainted ${unsafePrivate}`,
        },
      ],
    };
    const json = exportFakePilotSimulatorProofJson(tainted, runtimeVersion, "2026-06-21T17:19:00.000Z");
    const markdown = exportFakePilotSimulatorProofMarkdown(tainted, runtimeVersion, "2026-06-21T17:19:00.000Z");

    expect(json).not.toContain(unsafePrivate);
    expect(markdown).not.toContain(unsafePrivate);
    expect(json).toContain("synthetic_private_holding_label");
    expect(markdown).toContain("Sanitized fake-only audit note");
  });

  it("keeps runtime sources free of file inputs and real-doc code paths", () => {
    const runtime = readRuntimeSources();

    expect(runtime).not.toMatch(/<input[^>]*type=["']file/i);
    expect(runtime).not.toMatch(/\bshowOpenFilePicker\b/);
    expect(runtime).not.toMatch(/\bwebkitdirectory\b/);
    expect(runtime).not.toMatch(/\bFileReader\b/);
    expect(runtime).not.toMatch(/\breadAsText\b|\breadAsArrayBuffer\b/);
    expect(runtime).not.toMatch(/\breadRealDocument\b|\bquarantineRealDocument\b|\brunOcr\b|\bcreateVectorStore\b/);
  });

  it("stays aligned with the v0.6.2 safety checklist gate names", () => {
    const checklistPhrases: Record<string, string> = {
      approval: "Operator approval",
      scope: "Source scope",
      nonrecursive: "Non-recursive rule",
      quarantine_label: "Quarantine destination",
      provenance: "Hash and provenance",
      redaction_review: "Redaction review",
      metadata_review: "Metadata review",
      eligibility: "Index eligibility",
      audit: "Audit",
      rollback: "Rollback",
      retention: "Deletion and retention",
    };

    for (const gate of fakePilotSimulatorGates) {
      expect(fakePilotSimulatorGateLabels[gate]).toBeTruthy();
      expect(checklist).toContain(checklistPhrases[gate]);
    }

    expect(checklist).toContain("GitHub-Safe Proof Checklist");
    expect(checklist).toContain("PASS");
    expect(checklist).toContain("WARN");
    expect(checklist).toContain("FAIL");
  });
});
