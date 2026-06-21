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
    proof: { exists: boolean; result: string; warnFailFree: boolean; flags: string[] };
    git: { dirty: boolean; ahead: number; branch: string };
    queue: { ok: boolean; item: { id: string; status: string } | null; error?: string };
  }): { status: string; nextAction: string; issues: Array<{ code: string }> };
  parseGitState(root?: string): { dirty: boolean; ahead: number; head: string; originMain: string };
  readLatestProof(root?: string): { exists: boolean; result: string; phase: string; warnFailFree: boolean; flags: string[] };
  resultHasWarnFail(markdown: string): boolean;
}

async function loadModule(): Promise<CloseoutModule> {
  return (await import(pathToFileURL(scriptPath).href)) as CloseoutModule;
}

function runGit(root: string, args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", env });
}

function createRepoFixture(queueStatus = "ready_to_push"): string {
  const root = mkdtempSync(join(tmpdir(), "kia-closeout-repo-"));
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "README.md"), "fixture\n");
  writeFileSync(join(root, "feature_list.json"), JSON.stringify({ phase }, null, 2));
  writeFileSync(
    join(root, "docs/phase-backlog.json"),
    JSON.stringify(
      {
        schema: "kia-stick-local-task-queue.v1",
        updated_at: "2026-06-20T21:00:00.000Z",
        items: [
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
        ],
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
    expect(assessment.nextAction).toContain("create a proof directory");
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
});
