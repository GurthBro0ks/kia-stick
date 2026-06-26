import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = resolve("scripts/task-queue.mjs");

interface TaskQueueModule {
  loadQueue(root?: string): {
    schema: string;
    updated_at?: string;
    items: Array<{
      id: string;
      phase: string;
      title: string;
      status: string;
      model: string;
      risk: string;
      summary: string;
      next_action: string;
      history: unknown[];
    }>;
  };
  selectNextItem(queue: { items: Array<{ id: string; status: string }> }): { id: string } | null;
  updateQueueItemStatus(
    queue: { updated_at?: string; items: Array<Record<string, unknown>> },
    id: string,
    status: string,
    options?: { note?: string; nextAction?: string; at?: string }
  ): Record<string, unknown>;
  assertSafeQueueText(value: string, label?: string): void;
  validateQueue(queue: unknown): boolean;
}

async function loadModule(): Promise<TaskQueueModule> {
  return (await import(pathToFileURL(scriptPath).href)) as TaskQueueModule;
}

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "kia-task-queue-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  cpSync(resolve("docs/phase-backlog.json"), join(root, "docs/phase-backlog.json"));
  return root;
}

describe("task-queue", () => {
  it("parses the seeded backlog with valid fake-only items", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));

    expect(queue.schema).toBe("kia-stick-local-task-queue.v1");
    expect(queue.items).toHaveLength(31);
    expect(queue.items.map((item) => item.id)).toEqual([
      "queue-001-closeout-helper-hardening",
      "queue-002-fake-redaction-metadata-depth",
      "queue-003-citation-qa-fixtures",
      "queue-004-docs-release-pack",
      "queue-005-real-doc-pilot-plan-only",
      "queue-006-safety-review-checklist",
      "queue-007-fake-only-pilot-simulator",
      "queue-008-operator-approval-packet",
      "queue-009-local-redaction-policy-plan",
      "queue-010-future-implementation-gate-draft",
      "queue-011-v07-pause-stabilize",
      "queue-012-v07-product-version-bump-plan",
      "queue-013-v07-fake-only-ux-polish",
      "queue-014-v07-real-doc-gate-preparation",
      "queue-015-v07-first-real-doc-gate-request",
      "queue-016-v072-product-version-bump-implementation",
      "queue-017-v073-fake-only-ux-triage",
      "queue-018-v074-chat-saved-upload-stabilization",
      "queue-019-v075-sources-vault-import-polish",
      "queue-020-v076-design-md-fake-only-ux-contract",
      "queue-021-v077-design-contract-drift-guard",
      "queue-022-v078-v07-release-state-closeout",
      "queue-023-v079-operator-qa-smoke-pack",
      "queue-024-v0710b-persistent-smoke-evidence-closeout",
      "queue-025-v0711-persistent-proof-index-review-guide",
      "queue-026-v0712-fake-only-polish-and-real-doc-gate-planning",
      "queue-027-v0712-operator-qa-closeout-and-push",
      "queue-028-v0713-planning-only-real-doc-gate-rehearsal",
      "queue-029-v0714-synthetic-approval-packet-validator",
      "queue-030-v0715-synthetic-packet-report-runner",
      "queue-031-v0716-synthetic-packet-safety-drift-guard",
    ]);
    expect(queue.items.slice(0, 10).every((item) => item.status === "accepted")).toBe(true);
    expect(queue.items[10].status).toBe("planned");
    expect(queue.items[11].status).toBe("accepted");
    expect(queue.items[12].status).toBe("planned");
    expect(queue.items[13].status).toBe("planned");
    expect(queue.items[14].status).toBe("blocked");
    expect(queue.items[15].status).toBe("accepted");
    expect(queue.items[16].status).toBe("accepted");
    expect(queue.items[17].status).toBe("accepted");
    expect(queue.items[18].status).toBe("accepted");
    expect(queue.items[19].status).toBe("accepted");
    expect(queue.items[20].status).toBe("accepted");
    expect(queue.items[21].status).toBe("accepted");
    expect(queue.items[22].status).toBe("accepted");
    expect(queue.items[23].status).toBe("accepted");
    expect(queue.items[24].status).toBe("accepted");
    expect(queue.items[25].status).toBe("accepted");
    expect(queue.items[26].status).toBe("accepted");
    expect(queue.items[27].status).toBe("accepted");
    expect(queue.items[28].status).toBe("accepted");
    expect(queue.items[29].status).toBe("accepted");
    expect(queue.items[30].status).toBe("needs_review");
    expect(queue.items.every((item) => item.history.length > 0)).toBe(true);
    expect(mod.validateQueue(queue)).toBe(true);
  });

  it("selects the first non-accepted item", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    for (let index = 0; index < 10; index += 1) {
      queue.items[index].status = "accepted";
    }

    expect(mod.selectNextItem(queue)?.id).toBe("queue-011-v07-pause-stabilize");
  });

  it("keeps the first real-doc gate request blocked until separately approved", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");

    expect(realDocGate?.status).toBe("blocked");
    const gateText = `${realDocGate?.summary}\n${realDocGate?.next_action}`;
    expect(gateText).toContain("blocked");
    expect(gateText).toContain("exactly one gate");
    expect(gateText).toContain("exactly one document");
    expect(gateText).not.toMatch(/<input[^>]*type=["']file/i);
    expect(gateText).not.toMatch(/\bshowOpenFilePicker\b|\bFileReader\b|\breadAsText\b|\breadAsArrayBuffer\b/i);
  });

  it("tracks the selected v0.7.1 product-version bump planning phase without approving a runtime bump", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    const bumpPlan = queue.items.find((item) => item.id === "queue-012-v07-product-version-bump-plan");

    expect(bumpPlan?.phase).toBe("KIA-Stick-v0.7.1-product-version-bump-plan");
    expect(bumpPlan?.status).toBe("accepted");
    expect(bumpPlan?.model).toBe("GPT/Codex $100");
    const bumpText = `${bumpPlan?.summary}\n${bumpPlan?.next_action}`;
    expect(bumpText).toContain("docs/tests/state only");
    expect(bumpText).toContain("Accepted after the v0.7.2 product-version bump implementation");
    expect(bumpText).toContain("0.7.0");
    expect(bumpText).not.toMatch(/<input[^>]*type=["']file/i);
    expect(bumpText).not.toMatch(/\bshowOpenFilePicker\b|\bFileReader\b|\breadAsText\b|\breadAsArrayBuffer\b/i);
  });

  it("tracks the v0.7.2 product-version bump implementation without approving prompt or real-doc work", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    const implementation = queue.items.find((item) => item.id === "queue-016-v072-product-version-bump-implementation");

    expect(implementation?.phase).toBe("KIA-Stick-v0.7.2-product-version-bump-implementation-to-0.7.0");
    expect(implementation?.status).toBe("accepted");
    expect(implementation?.model).toBe("GPT/Codex $100");
    const text = `${implementation?.summary}\n${implementation?.next_action}`;
    expect(text).toContain("0.7.0");
    expect(text).toContain("promptVersion unchanged");
    expect(text).toContain("no real-doc capability");
    expect(text).toContain("179f883");
    expect(text).not.toMatch(/<input[^>]*type=["']file/i);
    expect(text).not.toMatch(/\bshowOpenFilePicker\b|\bFileReader\b|\breadAsText\b|\breadAsArrayBuffer\b/i);
  });

  it("tracks accepted v0.7.3 through v0.7.16 safety drift guard state", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    const triage = queue.items.find((item) => item.id === "queue-017-v073-fake-only-ux-triage");
    const v074 = queue.items.find((item) => item.id === "queue-018-v074-chat-saved-upload-stabilization");
    const v075 = queue.items.find((item) => item.id === "queue-019-v075-sources-vault-import-polish");
    const v076 = queue.items.find((item) => item.id === "queue-020-v076-design-md-fake-only-ux-contract");
    const v077 = queue.items.find((item) => item.id === "queue-021-v077-design-contract-drift-guard");
    const v078 = queue.items.find((item) => item.id === "queue-022-v078-v07-release-state-closeout");
    const nextChunk = queue.items.find((item) => item.id === "queue-023-v079-operator-qa-smoke-pack");
    const persistentSmokeEvidence = queue.items.find((item) => item.id === "queue-024-v0710b-persistent-smoke-evidence-closeout");
    const persistentProofIndex = queue.items.find((item) => item.id === "queue-025-v0711-persistent-proof-index-review-guide");
    const fakeOnlyPolish = queue.items.find((item) => item.id === "queue-026-v0712-fake-only-polish-and-real-doc-gate-planning");
    const operatorCloseout = queue.items.find((item) => item.id === "queue-027-v0712-operator-qa-closeout-and-push");
    const rehearsal = queue.items.find((item) => item.id === "queue-028-v0713-planning-only-real-doc-gate-rehearsal");
    const validator = queue.items.find((item) => item.id === "queue-029-v0714-synthetic-approval-packet-validator");
    const reportRunner = queue.items.find((item) => item.id === "queue-030-v0715-synthetic-packet-report-runner");
    const safetyGuard = queue.items.find((item) => item.id === "queue-031-v0716-synthetic-packet-safety-drift-guard");
    const realDocGate = queue.items.find((item) => item.id === "queue-015-v07-first-real-doc-gate-request");

    expect(triage?.phase).toBe("KIA-Stick-v0.7.3-fake-only-ux-triage-and-stabilization-plan");
    expect(triage?.status).toBe("accepted");
    expect(triage?.model).toBe("GPT/Codex $100");
    expect(`${triage?.summary}\n${triage?.next_action}`).toContain("Chat, Sources, Saved, Upload, Import, Vault, Settings");
    expect(`${triage?.summary}\n${triage?.next_action}`).toContain("38bff5f");

    expect(v074?.phase).toBe("KIA-Stick-v0.7.4-chat-saved-upload-stabilization");
    expect(v074?.status).toBe("accepted");
    expect(`${v074?.summary}\n${v074?.next_action}`).toContain("5a3758d");

    expect(v075?.phase).toBe("KIA-Stick-v0.7.5-sources-vault-import-scan-density-polish");
    expect(v075?.status).toBe("accepted");
    expect(`${v075?.summary}\n${v075?.next_action}`).toContain("303f12b");

    expect(v076?.phase).toBe("KIA-Stick-v0.7.6-design-md-fake-only-ux-contract");
    expect(v076?.status).toBe("accepted");
    expect(`${v076?.summary}\n${v076?.next_action}`).toContain("4e7ab62");

    expect(v077?.phase).toBe("KIA-Stick-v0.7.7-design-contract-drift-guard");
    expect(v077?.status).toBe("accepted");
    expect(`${v077?.summary}\n${v077?.next_action}`).toContain("design:check");
    expect(`${v077?.summary}\n${v077?.next_action}`).toContain("b086f85");

    expect(v078?.phase).toBe("KIA-Stick-v0.7.8-v0.7-release-state-closeout");
    expect(v078?.status).toBe("accepted");
    expect(`${v078?.summary}\n${v078?.next_action}`).toContain("release-state closeout");
    expect(`${v078?.summary}\n${v078?.next_action}`).toContain("b28a803");

    expect(nextChunk?.phase).toBe("KIA-Stick-v0.7.9-fake-only-operator-qa-smoke-pack");
    expect(nextChunk?.status).toBe("accepted");
    expect(`${nextChunk?.summary}\n${nextChunk?.next_action}`).toContain("operator QA smoke");
    expect(`${nextChunk?.summary}\n${nextChunk?.next_action}`).toContain("/health");
    expect(`${nextChunk?.summary}\n${nextChunk?.next_action}`).toContain("/version");
    expect(`${nextChunk?.summary}\n${nextChunk?.next_action}`).toContain("936ae5a");
    expect(`${nextChunk?.summary}\n${nextChunk?.next_action}`).toContain("queue-015 remains blocked");

    expect(persistentSmokeEvidence?.phase).toBe("KIA-Stick-v0.7.10b-closeout-project-state-update");
    expect(persistentSmokeEvidence?.status).toBe("accepted");
    expect(`${persistentSmokeEvidence?.summary}\n${persistentSmokeEvidence?.next_action}`).toContain("persistent operator smoke evidence");
    expect(`${persistentSmokeEvidence?.summary}\n${persistentSmokeEvidence?.next_action}`).toContain("8 accepted screenshots");
    expect(`${persistentSmokeEvidence?.summary}\n${persistentSmokeEvidence?.next_action}`).toContain("zero file inputs");
    expect(`${persistentSmokeEvidence?.summary}\n${persistentSmokeEvidence?.next_action}`).toContain("zero file chooser events");
    expect(`${persistentSmokeEvidence?.summary}\n${persistentSmokeEvidence?.next_action}`).toContain("queue-015 remains blocked");

    expect(persistentProofIndex?.phase).toBe("KIA-Stick-v0.7.11-persistent-proof-index-and-review-guide");
    expect(persistentProofIndex?.status).toBe("accepted");
    expect(`${persistentProofIndex?.summary}\n${persistentProofIndex?.next_action}`).toContain("persistent proof folders");
    expect(`${persistentProofIndex?.summary}\n${persistentProofIndex?.next_action}`).toContain("RESULT.md is missing");
    expect(`${persistentProofIndex?.summary}\n${persistentProofIndex?.next_action}`).toContain("operator QA PASS");
    expect(`${persistentProofIndex?.summary}\n${persistentProofIndex?.next_action}`).toContain("queue-015 remained blocked");
    expect(fakeOnlyPolish?.phase).toBe("KIA-Stick-v0.7.12-fake-only-polish-and-real-doc-gate-planning");
    expect(fakeOnlyPolish?.status).toBe("accepted");
    expect(`${fakeOnlyPolish?.summary}\n${fakeOnlyPolish?.next_action}`).toContain("fake-only UI copy");
    expect(`${fakeOnlyPolish?.summary}\n${fakeOnlyPolish?.next_action}`).toContain("planning-only");
    expect(`${fakeOnlyPolish?.summary}\n${fakeOnlyPolish?.next_action}`).toContain("operator QA PASS");
    expect(operatorCloseout?.phase).toBe("KIA-Stick-v0.7.12-operator-qa-closeout-and-push");
    expect(operatorCloseout?.status).toBe("accepted");
    expect(`${operatorCloseout?.summary}\n${operatorCloseout?.next_action}`).toContain("operator QA PASS");
    expect(`${operatorCloseout?.summary}\n${operatorCloseout?.next_action}`).toContain("HEAD equals origin/main");
    expect(rehearsal?.phase).toBe("KIA-Stick-v0.7.13-planning-only-real-doc-gate-rehearsal");
    expect(rehearsal?.status).toBe("accepted");
    expect(`${rehearsal?.summary}\n${rehearsal?.next_action}`).toContain("synthetic-only");
    expect(`${rehearsal?.summary}\n${rehearsal?.next_action}`).toContain("queue-015 blocked");
    expect(validator?.phase).toBe("KIA-Stick-v0.7.14-synthetic-approval-packet-validator");
    expect(validator?.status).toBe("accepted");
    expect(`${validator?.summary}\n${validator?.next_action}`).toContain("synthetic-only");
    expect(`${validator?.summary}\n${validator?.next_action}`).toContain("queue-015 remains blocked");
    expect(reportRunner?.phase).toBe("KIA-Stick-v0.7.15-synthetic-packet-report-runner");
    expect(reportRunner?.status).toBe("accepted");
    expect(`${reportRunner?.summary}\n${reportRunner?.next_action}`).toContain("built-in synthetic fixtures");
    expect(`${reportRunner?.summary}\n${reportRunner?.next_action}`).toContain("queue-015 remains blocked");
    expect(safetyGuard?.phase).toBe("KIA-Stick-v0.7.16-synthetic-packet-safety-drift-guard");
    expect(safetyGuard?.status).toBe("needs_review");
    expect(`${safetyGuard?.summary}\n${safetyGuard?.next_action}`).toContain("fixed allowlist");
    expect(`${safetyGuard?.summary}\n${safetyGuard?.next_action}`).toContain("queue-015 remains blocked");
    expect(realDocGate?.status).toBe("blocked");

    const joined = [triage, v074, v077, v078, nextChunk, fakeOnlyPolish, operatorCloseout, rehearsal, validator, reportRunner, safetyGuard]
      .map((item) => `${item?.summary}\n${item?.next_action}`)
      .join("\n");
    expect(joined).not.toMatch(/<input[^>]*type=["']file/i);
    expect(joined).not.toMatch(/\bshowOpenFilePicker\b|\bFileReader\b|\breadAsText\b|\breadAsArrayBuffer\b/i);
  });

  it("seeds the requested post-plan safety backlog without approving implementation", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    const postPlanItems = queue.items.slice(5, 10);

    expect(postPlanItems.map((item) => item.id)).toEqual([
      "queue-006-safety-review-checklist",
      "queue-007-fake-only-pilot-simulator",
      "queue-008-operator-approval-packet",
      "queue-009-local-redaction-policy-plan",
      "queue-010-future-implementation-gate-draft",
    ]);
    expect(postPlanItems.map((item) => item.title)).toEqual([
      "Safety review checklist",
      "Fake-only pilot simulator",
      "Operator approval packet",
      "Local-only redaction policy plan",
      "Future implementation gate draft",
    ]);

    const joined = postPlanItems.map((item) => `${item.summary}\n${item.next_action}`).join("\n");
    expect(joined).toContain("fictional metadata only");
    expect(joined).toContain("blocked-action matrix");
    expect(joined).toContain("no-real-document implementation");
    expect(joined).not.toMatch(/<input[^>]*type=["']file/i);
    expect(joined).not.toMatch(/\bshowOpenFilePicker\b|\bFileReader\b|\breadAsText\b|\breadAsArrayBuffer\b/i);
    expect(joined).not.toMatch(/\bapproved real\b|\breal-document implementation approved\b/i);
  });

  it("updates status, next action, timestamps, and history", async () => {
    const mod = await loadModule();
    const queue = mod.loadQueue(resolve("."));
    const updated = mod.updateQueueItemStatus(queue, "queue-001-closeout-helper-hardening", "running", {
      note: "Starting local fake-only queue test.",
      nextAction: "Run local validation only.",
      at: "2026-06-20T21:00:00.000Z",
    });

    expect(updated.status).toBe("running");
    expect(updated.next_action).toBe("Run local validation only.");
    expect(updated.updated_at).toBe("2026-06-20T21:00:00.000Z");
    expect((updated.history as unknown[])).toHaveLength(queue.items[0].history.length);
    expect(queue.updated_at).toBe("2026-06-20T21:00:00.000Z");
  });

  it("rejects private paths and secrets-looking values", async () => {
    const mod = await loadModule();
    const syntheticSecret = ["to", "ken=", "abcdefghijklmn"].join("");

    expect(() => mod.assertSafeQueueText("/media/mint/SHARED/APWU/private.pdf", "note")).toThrow(/private path/);
    expect(() => mod.assertSafeQueueText("~/kia-stick-private-vault/private.md", "note")).toThrow(/private path/);
    expect(() => mod.assertSafeQueueText(syntheticSecret, "note")).toThrow(/secrets-looking/);
  });

  it("queue:set mutates a temp queue and rejects unsafe notes", () => {
    const root = fixtureRoot();
    const ok = spawnSync(
      "node",
      [scriptPath, "set", "--root", root, "--id", "queue-001-closeout-helper-hardening", "--status", "needs_review", "--note", "Ready for local review."],
      { encoding: "utf8" }
    );
    const queue = JSON.parse(readFileSync(join(root, "docs/phase-backlog.json"), "utf8"));
    const item = queue.items.find((candidate: { id: string }) => candidate.id === "queue-001-closeout-helper-hardening");

    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain("updated=queue-001-closeout-helper-hardening");
    expect(item.status).toBe("needs_review");
    expect(item.history.at(-1).note).toBe("Ready for local review.");

    const unsafe = spawnSync(
      "node",
      [
        scriptPath,
        "set",
        "--root",
        root,
        "--id",
        "queue-001-closeout-helper-hardening",
        "--status",
        "blocked",
        "--note",
        "/media/mint/SHARED/APWU/private.pdf",
      ],
      { encoding: "utf8" }
    );

    expect(unsafe.status).toBe(1);
    expect(unsafe.stderr).toContain("Rejected unsafe private path");
  });

  it("queue:next prints a compact Codex-ready summary", () => {
    const result = spawnSync("node", [scriptPath, "next"], { cwd: resolve("."), encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("id=queue-011-v07-pause-stabilize");
    expect(result.stdout).toContain("Codex-ready summary:");
    expect(result.stdout).toContain("KIA-Stick-v0.7.0-pause-stabilize");
  });

  it("does not execute git push from queue commands", () => {
    const root = fixtureRoot();
    const wrapperRoot = mkdtempSync(join(tmpdir(), "kia-task-queue-git-wrapper-"));
    const binDir = join(wrapperRoot, "bin");
    const logPath = join(wrapperRoot, "git-wrapper.log");
    const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
    mkdirSync(binDir);
    writeFileSync(
      join(binDir, "git"),
      [
        "#!/usr/bin/env bash",
        "printf '%s\\n' \"$*\" >> \"$KIA_GIT_WRAPPER_LOG\"",
        "if [[ \"$1\" == \"push\" ]]; then echo 'push forbidden' >&2; exit 99; fi",
        `exec ${realGit} "$@"`,
        "",
      ].join("\n")
    );
    chmodSync(join(binDir, "git"), 0o755);

    const result = spawnSync("node", [scriptPath, "list", "--root", root], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        KIA_GIT_WRAPPER_LOG: logPath,
      },
    });

    expect(result.status).toBe(0);
    expect(existsSync(logPath) ? readFileSync(logPath, "utf8") : "").not.toMatch(/^push\b/m);
  });
});
