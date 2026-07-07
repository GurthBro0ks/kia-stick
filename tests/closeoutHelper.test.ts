import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = resolve("scripts/closeout-helper.mjs");
const phase = "KIA-Stick-v0.5.7-closeout-helper-hardening";

interface CloseoutModule {
  assessCloseout(input: {
    proof: { exists: boolean; result: string; warnFailFree: boolean; flags: string[]; manualQaStatus?: string; pushed?: string };
    git: { dirty: boolean; ahead: number; branch: string };
    queue: { ok: boolean; item: { id: string; status: string } | null; error?: string };
    proofDiscoveryMode?: string;
    queueGuidance?: string;
    nextActionState?: string;
  }): { status: string; nextAction: string; stopOnWarnFail: boolean; queueAcceptanceAllowed: boolean; issues: Array<{ code: string }> };
  classifySecretScanLine(line: string): string;
  parseGitState(root?: string): { dirty: boolean; ahead: number; head: string; originMain: string };
  readLatestProof(root?: string): { exists: boolean; result: string; phase: string; warnFailFree: boolean; flags: string[] };
  readProofDir(root: string): { exists: boolean; result: string; phase: string; manualQaStatus: string; pushed: string; warnFailFree: boolean; flags: string[] };
  resolveDefaultProofRoot(options?: { proofRoot?: string; env?: NodeJS.ProcessEnv }): { root: string; mode: string; note: string };
  resultHasWarnFail(markdown: string): boolean;
}

async function loadModule(): Promise<CloseoutModule> {
  return (await import(pathToFileURL(scriptPath).href)) as CloseoutModule;
}

function runGit(root: string, args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", env });
}

function createRepoFixture(queueStatus: string | null = "ready_to_push"): string {
  const root = mkdtempSync(join(tmpdir(), "kia-closeout-repo-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "README.md"), "fixture\n");
  writeFileSync(join(root, "feature_list.json"), JSON.stringify({ phase }, null, 2));
  const items = queueStatus
    ? [
        {
          id: "queue-001-closeout-helper-hardening",
          phase,
          title: "Closeout helper hardening",
          status: queueStatus,
          model: "GPT/Codex $100",
          risk: "low",
          summary: "Fixture closeout helper item.",
          next_action: "Review local proof output.",
          created_at: "2026-06-20T21:00:00.000Z",
          updated_at: "2026-06-20T21:00:00.000Z",
          history: [
            {
              at: "2026-06-20T21:00:00.000Z",
              from: "planned",
              to: queueStatus,
              note: "Fixture status.",
            },
          ],
        },
      ]
    : [];
  writeFileSync(
    join(root, "docs/phase-backlog.json"),
    JSON.stringify(
      {
        schema: "kia-stick-local-task-queue.v1",
        updated_at: "2026-06-20T21:00:00.000Z",
        items,
      },
      null,
      2
    )
  );
  runGit(root, ["init", "-b", "main"]);
  runGit(root, ["config", "user.email", "closeout-helper@example.invalid"]);
  runGit(root, ["config", "user.name", "Closeout Helper Test"]);
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "Initial fixture"]);
  runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
  return root;
}

function createProof(root: string, name: string, resultText: string): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "RESULT.md"), resultText);
  return dir;
}

describe("closeout-helper", () => {
  it("parses proof results and detects WARN/FAIL text outside the RESULT line", async () => {
    const mod = await loadModule();
    const proofRoot = mkdtempSync(join(tmpdir(), "kia-closeout-proof-"));
    createProof(
      proofRoot,
      "proof_kia_stick_v0_5_7_closeout_20260620T220000Z",
      ["- RESULT: PASS", `- Phase: ${phase}`, "- Commit SHA: abc1234", "- Push performed: no"].join("\n")
    );

    const proof = mod.readLatestProof(proofRoot);

    expect(proof.exists).toBe(true);
    expect(proof.result).toBe("PASS");
    expect(proof.phase).toBe(phase);
    expect(mod.resultHasWarnFail("- RESULT: PASS\n- Step: WARN review needed\n")).toBe(true);
    expect(mod.resultHasWarnFail("- RESULT: PASS\n- Step: clean\n")).toBe(false);
  });

  it("redacts and flags private paths, file inputs, and secrets-looking values in proof text", async () => {
    const mod = await loadModule();
    const proofRoot = mkdtempSync(join(tmpdir(), "kia-closeout-redact-"));
    const syntheticApiKey = ["api", "_key=super", "secretvalue123"].join("");
    createProof(
      proofRoot,
      "proof_kia_stick_redact_20260620T220100Z",
      [
        "- RESULT: PASS",
        `- Phase: ${phase}`,
        "path=/media/mint/SHARED/APWU/private.pdf",
        "vault=~/kia-stick-private-vault/doc.md",
        "<input type=\"file\" name=\"upload\" />",
        syntheticApiKey,
      ].join("\n")
    );

    const proof = mod.readLatestProof(proofRoot);

    expect(proof.flags).toEqual(["apwu_path", "file_input", "private_vault", "secret_like"]);
  });

  it("returns PASS only when proof, git, and queue state are clean", async () => {
    const mod = await loadModule();
    const assessment = mod.assessCloseout({
      proof: { exists: true, result: "PASS", warnFailFree: true, flags: [] },
      git: { dirty: false, ahead: 0, branch: "main" },
      queue: { ok: true, item: { id: "queue-001-closeout-helper-hardening", status: "ready_to_push" } },
    });

    expect(assessment.status).toBe("PASS");
    expect(assessment.nextAction).toContain("No push needed");
    expect(assessment.stopOnWarnFail).toBe(false);
    expect(assessment.queueAcceptanceAllowed).toBe(true);
  });

  it("warns when proof is missing", async () => {
    const mod = await loadModule();
    const proofRoot = mkdtempSync(join(tmpdir(), "kia-closeout-missing-"));
    const proof = mod.readLatestProof(proofRoot);
    const assessment = mod.assessCloseout({
      proof,
      git: { dirty: false, ahead: 0, branch: "main" },
      queue: { ok: true, item: { id: "queue-001-closeout-helper-hardening", status: "ready_to_push" } },
    });

    expect(assessment.status).toBe("WARN");
    expect(assessment.issues.map((issue) => issue.code)).toContain("proof_missing");
    expect(assessment.stopOnWarnFail).toBe(true);
    expect(assessment.queueAcceptanceAllowed).toBe(false);
    expect(assessment.nextAction).toContain("create a proof directory");
  });

  it("blocks queue acceptance guidance while proof WARN/FAIL text exists", async () => {
    const mod = await loadModule();
    const assessment = mod.assessCloseout({
      proof: { exists: true, result: "PASS", warnFailFree: false, flags: [] },
      git: { dirty: false, ahead: 0, branch: "main" },
      queue: { ok: true, item: { id: "queue-001-closeout-helper-hardening", status: "ready_to_push" } },
    });

    expect(assessment.status).toBe("WARN");
    expect(assessment.issues.map((issue) => issue.code)).toContain("proof_warn_fail_text");
    expect(assessment.stopOnWarnFail).toBe(true);
    expect(assessment.queueAcceptanceAllowed).toBe(false);
    expect(assessment.nextAction).toContain("fix proof warnings");
  });

  it("does not add queue_item_missing for an intentional no-actionable queue gate before closeout", async () => {
    const mod = await loadModule();
    const assessment = mod.assessCloseout({
      proof: { exists: true, result: "PASS", warnFailFree: true, flags: [], manualQaStatus: "PENDING", pushed: "no" },
      git: { dirty: false, ahead: 1, branch: "main" },
      queue: { ok: true, item: null },
      proofDiscoveryMode: "default_latest_from_persistent_kia_proof_root",
      queueGuidance: "No actionable queue items. Accepted, blocked, and parked items are intentionally skipped.",
      nextActionState: "closeout_push_needed",
    });
    const issueCodes = assessment.issues.map((issue) => issue.code);

    expect(assessment.status).toBe("WARN");
    expect(assessment.queueAcceptanceAllowed).toBe(false);
    expect(issueCodes).toContain("manual_qa_pending");
    expect(issueCodes).toContain("local_commit_without_push");
    expect(issueCodes).not.toContain("queue_item_missing");
  });

  it("does not add queue_item_missing after an accepted pushed closeout is recorded", async () => {
    const mod = await loadModule();
    const assessment = mod.assessCloseout({
      proof: { exists: true, result: "PASS", warnFailFree: true, flags: [], manualQaStatus: "PASS", pushed: "yes" },
      git: { dirty: false, ahead: 0, branch: "main" },
      queue: { ok: true, item: null },
      proofDiscoveryMode: "default_latest_from_persistent_kia_proof_root",
      queueGuidance: "No actionable queue items. Accepted, blocked, and parked items are intentionally skipped.",
      nextActionState: "accepted_pushed_state_recorded",
    });

    expect(assessment.status).toBe("PASS");
    expect(assessment.issues.map((issue) => issue.code)).not.toContain("queue_item_missing");
    expect(assessment.stopOnWarnFail).toBe(false);
    expect(assessment.queueAcceptanceAllowed).toBe(true);
  });

  it("detects local-ahead and dirty git states", async () => {
    const mod = await loadModule();
    const root = createRepoFixture();
    writeFileSync(join(root, "LOCAL_CHANGE.md"), "dirty\n");

    const dirty = mod.parseGitState(root);
    expect(dirty.dirty).toBe(true);

    runGit(root, ["add", "."]);
    runGit(root, ["commit", "-m", "Local ahead fixture"]);
    const ahead = mod.parseGitState(root);

    expect(ahead.dirty).toBe(false);
    expect(ahead.ahead).toBe(1);
  });

  it("prints review and summary guidance without mutating queue status", () => {
    const root = createRepoFixture("planned");
    const proofRoot = mkdtempSync(join(tmpdir(), "kia-closeout-cli-proof-"));
    createProof(
      proofRoot,
      "proof_kia_stick_v0_5_7_closeout_20260620T220200Z",
      ["- RESULT: PASS", `- Phase: ${phase}`, "- Commit SHA: abc1234", "- Push performed: no"].join("\n")
    );

    const review = spawnSync("node", [scriptPath, "review", "--root", root, "--proof-root", proofRoot], { encoding: "utf8" });
    const summary = spawnSync("node", [scriptPath, "summary", "--root", root, "--proof-root", proofRoot], { encoding: "utf8" });
    const queue = JSON.parse(readFileSync(join(root, "docs/phase-backlog.json"), "utf8"));

    expect(review.status).toBe(0);
    expect(review.stdout).toContain("Closeout review: WARN");
    expect(review.stdout).toContain("stop_on_warn_fail=true");
    expect(review.stdout).toContain("queue_acceptance_allowed=false");
    expect(review.stdout).toContain("suggested_queue_command=npm run queue:set");
    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("CLOSEOUT_HELPER_RESULT=WARN");
    expect(queue.items[0].status).toBe("planned");
  });

  it("never executes git push", () => {
    const root = createRepoFixture();
    const proofRoot = mkdtempSync(join(tmpdir(), "kia-closeout-no-push-proof-"));
    const binDir = join(root, "bin");
    const logPath = join(root, "git-wrapper.log");
    const realGit = execFileSync("which", ["git"], { encoding: "utf8" }).trim();
    mkdirSync(binDir);
    createProof(
      proofRoot,
      "proof_kia_stick_v0_5_7_no_push_20260620T220300Z",
      ["- RESULT: PASS", `- Phase: ${phase}`, "- Commit SHA: abc1234", "- Push performed: no"].join("\n")
    );
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

    const result = spawnSync("node", [scriptPath, "review", "--root", root, "--proof-root", proofRoot], {
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

  it("reviews an explicit proof dir without falling back to generic latest-proof discovery", async () => {
    const mod = await loadModule();
    const root = createRepoFixture("accepted");
    const proofRoot = mkdtempSync(join(tmpdir(), "kia-closeout-explicit-proof-"));
    const proofDir = createProof(
      proofRoot,
      "proof_kia_stick_v0_9_37_closeout_20260628T165303Z",
      [
        "PHASE=KIA-Stick-v0.9.33-to-v0.9.37-accepted-warn-state-and-fake-only-proof-report-operator-ux-bundle-closeout-and-push",
        "RESULT=PASS",
        "COMMIT_SHA=12aca976c85b3c45a9dc06a33fef31f36074ae96",
        "PUSHED=yes",
        "MANUAL_QA_STATUS=PASS",
      ].join("\n")
    );

    const proof = mod.readProofDir(proofDir);
    const review = spawnSync("node", [scriptPath, "review", "--root", root, "--proof-dir", proofDir], { encoding: "utf8" });
    const summary = spawnSync("node", [scriptPath, "summary", "--root", root, "--proof-dir", proofDir], { encoding: "utf8" });

    expect(proof.phase).toContain("v0.9.33-to-v0.9.37");
    expect(proof.manualQaStatus).toBe("PASS");
    expect(proof.pushed).toBe("yes");
    expect(review.status).toBe(0);
    expect(review.stdout).toContain("proof_discovery_mode=explicit_proof_dir");
    expect(review.stdout).toContain(`supplied_proof_dir=${proofDir}`);
    expect(review.stdout).toContain("manual_qa_status=PASS");
    expect(review.stdout).toContain("pushed=yes");
    expect(summary.stdout).toContain("RESULT=PASS");
    expect(summary.stdout).toContain("PROOF_DISCOVERY_MODE=explicit_proof_dir");
    expect(summary.stdout).toContain("PUSHED=yes");
    expect(summary.stdout).toContain("MANUAL_QA_STATUS=PASS");
  });

  it("labels default proof discovery so operators know summary output may be generic", () => {
    const root = createRepoFixture("accepted");
    const proofRoot = mkdtempSync(join(tmpdir(), "kia-closeout-default-proof-"));
    createProof(
      proofRoot,
      "proof_kia_stick_v0_5_7_default_20260620T220500Z",
      ["RESULT=PASS", `PHASE=${phase}`, "PUSHED=no", "MANUAL_QA_STATUS=PENDING"].join("\n")
    );

    const summary = spawnSync("node", [scriptPath, "summary", "--root", root, "--proof-root", proofRoot], { encoding: "utf8" });

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain(`PHASE=${phase}`);
    expect(summary.stdout).toContain("PROOF_DISCOVERY_MODE=default_latest_from_explicit_proof_root");
    expect(summary.stdout).toContain("PROOF_DISCOVERY_NOTE=explicit --proof-root supplied");
  });

  it("prefers KIA_PROOF_ROOT over the persistent root when supplied safely", async () => {
    const mod = await loadModule();
    const proofRoot = mkdtempSync(join(tmpdir(), "kia-closeout-env-proof-"));
    createProof(
      proofRoot,
      "proof_kia_stick_v0_9_75_env_20260701T000000Z",
      ["RESULT=PASS", "PHASE=env-proof-root", "PUSHED=yes", "MANUAL_QA_STATUS=PASS"].join("\n")
    );

    const selected = mod.resolveDefaultProofRoot({ env: { ...process.env, KIA_PROOF_ROOT: proofRoot } });

    expect(selected.root).toBe(proofRoot);
    expect(selected.mode).toBe("env_kia_proof_root");
    expect(selected.note).toContain("KIA_PROOF_ROOT supplied");
  });

  it("rejects unsafe KIA_PROOF_ROOT instead of scanning arbitrary folders", async () => {
    const mod = await loadModule();

    expect(() => mod.resolveDefaultProofRoot({ env: { ...process.env, KIA_PROOF_ROOT: "/home/mint" } })).toThrow(
      "Refusing to inspect proof dir outside allowed proof roots"
    );
  });

  it("defaults to the persistent KIA proof root when available", () => {
    createProof(
      tmpdir(),
      "proof_kia_stick_stale_tmp_default_discovery_20200101T000000Z",
      ["RESULT=PASS", "PHASE=stale-tmp-proof", "PUSHED=yes", "MANUAL_QA_STATUS=PASS"].join("\n")
    );
    const summary = spawnSync("node", [scriptPath, "summary"], { encoding: "utf8" });

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_DISCOVERY_MODE=default_latest_from_persistent_kia_proof_root");
    expect(summary.stdout).toContain("PROOF_DISCOVERY_NOTE=persistent KIA proof root selected");
    expect(summary.stdout).toContain("PROOF_DIR=/home/mint/kia-stick-local-proofs/");
    expect(summary.stdout).not.toContain("PHASE=stale-tmp-proof");
  });

  it("omits queue_item_missing from default persistent-root review when no actionable queue is expected", () => {
    const review = spawnSync("node", [scriptPath, "review"], { encoding: "utf8" });
    const issueLines = review.stdout
      .split("\n")
      .filter((line) => line.startsWith("- WARN") || line.startsWith("- FAIL"))
      .join("\n");

    expect(review.status).toBe(0);
    expect(review.stdout).toContain("proof_discovery_mode=default_latest_from_persistent_kia_proof_root");
    expect(review.stdout).toContain("queue_id=none");
    expect(review.stdout).toContain("queue_status=none");
    expect(review.stdout).toContain("queue_acceptance_allowed=false");
    expect(review.stdout).toContain("no_actionable_queue_guidance=No actionable queue items.");
    expect(review.stdout).toMatch(/next_action_state=(operator_qa_needed|closeout_push_needed|accepted_pushed_state_recorded)/);
    expect(issueLines).toMatch(/local_commit_without_push|worktree_dirty/);
    expect(issueLines).not.toContain("queue_item_missing");
  });

  it("reports the current accepted pushed baseline from the shared contract instead of stale proof-chain checkpoints", () => {
    const currentResearchProof =
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_83_to_v0_9_87_fake_only_proof_report_operator_ux_polish_20260701T165216Z";
    const currentOperatorQaProof =
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v0_9_93_to_v0_9_97_operator_qa_pass_recording_20260702T124930Z";
    const currentCloseoutProof =
      "/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_53_to_v1_0_57_post_closeout_accepted_state_contract_refresh_20260707T061535Z/closeout_push_20260707T062624Z";

    const summary = spawnSync("node", [scriptPath, "summary", "--proof-dir", currentResearchProof], { encoding: "utf8" });

    expect(summary.status).toBe(0);
    expect(summary.stdout).toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=5b7a575");
    expect(summary.stdout).toContain(
      "PROOF_CHAIN_LOCAL_IMPLEMENTATION_PROOF=/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_53_to_v1_0_57_post_closeout_accepted_state_contract_refresh_20260707T061535Z"
    );
    expect(summary.stdout).toContain(`PROOF_CHAIN_OPERATOR_QA_PROOF=${currentOperatorQaProof}`);
    expect(summary.stdout).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${currentCloseoutProof}`);
    expect(summary.stdout).toContain(
      "PROOF_CHAIN_PENDING_LOCAL_BUNDLE=KIA-Stick-v0.9.97-next-safe-work-checkpoint; result=WARN_SAFE_NEXT_TARGET_UNCLEAR; manual_qa=PASS; pushed=review_required"
    );
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=97574a9");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=c72f14f");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=d20e125");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=bc8fbef");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=cfa7c2c");
    expect(summary.stdout).not.toContain("PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=8358e63");
  });

  it("keeps synthetic secret fixture hits visible while classifying real-looking hits for review", async () => {
    const mod = await loadModule();

    const syntheticFixtureLine = ['tests/proofIndex.test.ts:81: const syntheticToken = ["to", "ken=', "gh", 'p_", "abcdefghijkl"].join("");'].join("");
    expect(mod.classifySecretScanLine(syntheticFixtureLine)).toBe("known_synthetic_secret_fixture");
    expect(mod.classifySecretScanLine(["docs/example.md:1: ", "gh", "p_actuallookingtokenvalue"].join(""))).toBe("secret_review_required");
  });
});
