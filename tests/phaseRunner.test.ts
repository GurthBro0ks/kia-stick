import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = resolve("scripts/phase-runner.mjs");

function runGit(root: string, args: string[], env: NodeJS.ProcessEnv = process.env): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", env });
}

function createRunnerFixture(options: { lintExitCode?: number } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "kia-phase-runner-"));
  for (const dir of ["public", "app", "components", "lib", "tests", "scripts"]) mkdirSync(join(root, dir), { recursive: true });
  const ok = "echo stub pass";
  const fail = `echo stub fail >&2; exit ${options.lintExitCode ?? 1}`;
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "kia-phase-runner-fixture",
        version: "0.4.0",
        private: true,
        scripts: {
          "release:check": ok,
          lint: options.lintExitCode ? fail : ok,
          typecheck: ok,
          test: ok,
          build: ok,
          "scan:fake": ok,
          "scan:privacy": ok,
          qa: ok,
        },
      },
      null,
      2
    )
  );
  writeFileSync(join(root, "feature_list.json"), JSON.stringify({ phase: "KIA-Stick-fixture" }, null, 2));
  writeFileSync(join(root, "public/manifest.webmanifest"), JSON.stringify({ name: "fixture" }, null, 2));
  writeFileSync(join(root, "README.md"), "fixture\n");
  writeFileSync(join(root, "CLOSEOUT.md"), "fixture\n");
  writeFileSync(join(root, "claude-progress.md"), "fixture\n");
  writeFileSync(join(root, "scripts/placeholder.mjs"), "console.log('fixture');\n");
  runGit(root, ["init", "-b", "main"]);
  runGit(root, ["config", "user.email", "phase-runner@example.invalid"]);
  runGit(root, ["config", "user.name", "Phase Runner Test"]);
  runGit(root, ["add", "."]);
  runGit(root, ["commit", "-m", "Initial fixture"]);
  return root;
}

const npmScriptOrder = ["release:check", "lint", "typecheck", "test", "build", "scan:fake", "scan:privacy", "qa"];

type NpmInvocation = { args: string[]; cwd: string; status: number };

function createFakeNpm(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const binDir = mkdtempSync(join(tmpdir(), "kia-phase-runner-npm-bin-"));
  const executable = join(binDir, "npm");
  writeFileSync(executable, [
    "#!/usr/bin/env node",
    "const { appendFileSync, readFileSync } = require('node:fs');",
    "const { spawnSync } = require('node:child_process');",
    "const args = process.argv.slice(2);",
    "const scripts = JSON.parse(readFileSync('./package.json', 'utf8')).scripts;",
    "const command = args[0] === 'run' && Object.hasOwn(scripts, args[1]) ? scripts[args[1]] : undefined;",
    "const result = command === undefined ? { status: 1 } : spawnSync('sh', ['-c', command], { stdio: 'inherit' });",
    "const status = result.status ?? 1;",
    "appendFileSync(process.env.KIA_FAKE_NPM_LOG, JSON.stringify({ args, cwd: process.cwd(), status }) + '\\n');",
    "process.exit(status);",
    "",
  ].join("\n"));
  chmodSync(executable, 0o755);
  return {
    ...env,
    PATH: `${binDir}:${env.PATH ?? ""}`,
    KIA_FAKE_NPM_LOG: join(binDir, "invocations.jsonl"),
  };
}

function readNpmInvocations(logPath: string): NpmInvocation[] {
  return readFileSync(logPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
}

function expectNpmOrder(logPath: string, root: string) {
  expect(readNpmInvocations(logPath).map(({ args, cwd }) => ({ args, cwd }))).toEqual(
    npmScriptOrder.map((name) => ({ args: ["run", name], cwd: root }))
  );
}

function runPhaseRunner(root: string, args: string[], env: NodeJS.ProcessEnv = process.env, realNpm = false) {
  const runnerEnv = realNpm ? env : createFakeNpm(env);
  const result = spawnSync("node", [scriptPath, "--root", root, ...args], {
    cwd: resolve("."),
    encoding: "utf8",
    env: {
      ...runnerEnv,
      KIA_PHASE_RUNNER_PROOF_ROOT: mkdtempSync(join(tmpdir(), "kia-phase-runner-proof-root-")),
    },
  });
  return { ...result, npmLogPath: runnerEnv.KIA_FAKE_NPM_LOG! };
}

function proofDirFromOutput(output: string): string {
  const match = output.match(/^PROOF_DIR=(.+)$/m);
  if (!match) throw new Error(`Missing PROOF_DIR in output: ${output}`);
  return match[1];
}

describe("phase-runner", () => {
  it("sanitizes phase names and generates manual push commands", () => {
    const moduleUrl = pathToFileURL(scriptPath).href;
    const output = execFileSync(
      "node",
      [
        "-e",
        "const m = await import(process.argv[1]); console.log(JSON.stringify({ slug: m.sanitizePhaseForProof('KIA-Stick-v0.5.4 Local Phase Runner!'), push: m.pushCommandForBranch('main') }));",
        moduleUrl,
      ],
      { encoding: "utf8" }
    );
    const parsed = JSON.parse(output);

    expect(parsed.slug).toBe("v0_5_4_local_phase_runner");
    expect(parsed.push).toBe("git push origin main");
  });

  it("writes RESULT.md summary for a passing validation run without committing by default", () => {
    const root = createRunnerFixture();
    writeFileSync(join(root, "README.md"), "fixture changed\n");

    const result = runPhaseRunner(root, ["--phase", "KIA-Stick-v0.5.4-self-test"]);
    const proofDir = proofDirFromOutput(result.stdout);
    const resultMd = readFileSync(join(proofDir, "RESULT.md"), "utf8");

    expectNpmOrder(result.npmLogPath, root);
    expect(result.status).toBe(0);
    expect(resultMd).toContain("- RESULT: PASS");
    expect(resultMd).toContain("- Phase: KIA-Stick-v0.5.4-self-test");
    expect(resultMd).toContain("- Commit status: not_requested");
    expect(resultMd).toContain("- M README.md");
    expect(existsSync(join(proofDir, "push_command.txt"))).toBe(false);
  });

  it("commits safe task files and writes push_command.txt only when --commit validation passes", () => {
    const root = createRunnerFixture();
    writeFileSync(join(root, "README.md"), "fixture changed for commit\n");

    const result = runPhaseRunner(root, ["--phase", "KIA-Stick-v0.5.4-commit-test", "--commit"]);
    const proofDir = proofDirFromOutput(result.stdout);
    const resultMd = readFileSync(join(proofDir, "RESULT.md"), "utf8");
    const pushCommand = readFileSync(join(proofDir, "push_command.txt"), "utf8").trim();
    const log = runGit(root, ["log", "-1", "--oneline"]);

    expectNpmOrder(result.npmLogPath, root);
    expect(result.status).toBe(0);
    expect(resultMd).toContain("- RESULT: PASS");
    expect(resultMd).toContain("- Commit status: committed");
    expect(resultMd).toContain("- M README.md");
    expect(log).toContain("Record KIA-Stick-v0.5.4-commit-test");
    expect(pushCommand).toBe("git push origin main");
  });

  it("does not commit or write a push command when validation fails", () => {
    const root = createRunnerFixture({ lintExitCode: 7 });
    const before = runGit(root, ["rev-parse", "--short", "HEAD"]).trim();
    writeFileSync(join(root, "README.md"), "fixture changed but failing\n");

    const result = runPhaseRunner(root, ["--phase", "KIA-Stick-v0.5.4-fail-test", "--commit"]);
    const proofDir = proofDirFromOutput(result.stdout);
    const after = runGit(root, ["rev-parse", "--short", "HEAD"]).trim();
    const resultMd = readFileSync(join(proofDir, "RESULT.md"), "utf8");
    const npmInvocations = readNpmInvocations(result.npmLogPath);

    // Stop-on-failure: lint fails, later validation npm scripts do not run; commit/push skipped.
    expect(npmInvocations.map(({ args, cwd }) => ({ args, cwd }))).toEqual([
      { args: ["run", "release:check"], cwd: root },
      { args: ["run", "lint"], cwd: root },
    ]);
    expect(npmInvocations[1].status).toBe(7);
    expect(resultMd).toContain("- FAIL 03_lint (03_lint.log)");
    expect(resultMd).not.toContain("04_typecheck");
    expect(resultMd).not.toContain("09_qa");
    expect(result.status).toBe(1);
    expect(after).toBe(before);
    expect(resultMd).toContain("- RESULT: FAIL");
    expect(resultMd).toContain("- Commit status: skipped_validation_failed");
    expect(existsSync(join(proofDir, "push_command.txt"))).toBe(false);
  });

  it("stops validation early after a failed step and does not run later validation steps", () => {
    const root = createRunnerFixture({ lintExitCode: 7 });
    const result = runPhaseRunner(root, ["--phase", "KIA-Stick-v0.5.4-stop-on-failure"]);
    const proofDir = proofDirFromOutput(result.stdout);
    const resultMd = readFileSync(join(proofDir, "RESULT.md"), "utf8");
    const npmInvocations = readNpmInvocations(result.npmLogPath);

    // Steps that ran before/at failure.
    expect(resultMd).toContain("- PASS 02_release_check (02_release_check.log)");
    expect(resultMd).toContain("- FAIL 03_lint (03_lint.log)");
    expect(npmInvocations.map((entry) => entry.args[1])).toEqual(["release:check", "lint"]);

    // Validation steps that no longer run after a failure (npm + shell).
    const skippedAfterFailure = [
      "04_typecheck",
      "05_test",
      "05b_real_public_cache",
      "06_build",
      "07_scan_fake",
      "08_scan_privacy",
      "09_qa",
      "10_manifest_parse",
      "11_feature_list_parse",
      "12_private_tracked_paths",
      "13_no_file_input_grep",
      "14_apwu_boundary_grep",
    ];
    for (const stepName of skippedAfterFailure) {
      expect(resultMd).not.toContain(stepName);
    }
    expect(npmInvocations.some((entry) => entry.args[1] === "typecheck")).toBe(false);
    expect(npmInvocations.some((entry) => entry.args[1] === "qa")).toBe(false);

    // Post-validation git trail still recorded; commit not attempted.
    expect(resultMd).toContain("- PASS 15_git_status_after (15_git_status_after.log)");
    expect(resultMd).toContain("- PASS 16_git_log_after (16_git_log_after.log)");
    expect(resultMd).toContain("- PASS 17_diff_stat_after (17_diff_stat_after.log)");
    expect(result.status).toBe(1);
    expect(resultMd).toContain("- RESULT: FAIL");
    expect(existsSync(join(proofDir, "03_lint.log"))).toBe(true);
    expect(existsSync(join(proofDir, "04_typecheck.log"))).toBe(false);
    expect(existsSync(join(proofDir, "09_qa.log"))).toBe(false);
  });

  function envWithoutRealCache(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env.KIA_REAL_PUBLIC_DATA_DIR;
    return { ...env, ...extra };
  }

  function writeFakeVitest(root: string): void {
    const binDir = join(root, "node_modules", ".bin");
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(binDir, "vitest"), [
      "#!/usr/bin/env node",
      "const { appendFileSync } = require('node:fs');",
      "const dir = Object.prototype.hasOwnProperty.call(process.env, 'KIA_REAL_PUBLIC_DATA_DIR') ? process.env.KIA_REAL_PUBLIC_DATA_DIR : null;",
      "appendFileSync(process.env.KIA_FAKE_VITEST_LOG, JSON.stringify({ argv: process.argv.slice(2), dir }) + '\\n');",
      "process.exit(Number(process.env.KIA_FAKE_VITEST_EXIT || '0'));",
      "",
    ].join("\n"), { mode: 0o755 });
  }

  it("leaves the real-cache step NOT_RUN and does not launch Vitest when the variable is unset or empty", () => {
    const source = readFileSync(scriptPath, "utf8");
    expect(source).not.toMatch(/KIA_REAL_PUBLIC_DATA_DIR\s*=/);

    for (const realPublicCacheDir of [undefined, ""] as const) {
      const root = createRunnerFixture();
      const vitestLog = join(root, "vitest-invocations.jsonl");
      writeFakeVitest(root);
      const extra: NodeJS.ProcessEnv = { KIA_FAKE_VITEST_LOG: vitestLog };
      if (realPublicCacheDir === "") extra.KIA_REAL_PUBLIC_DATA_DIR = "";
      const result = runPhaseRunner(root, ["--phase", "KIA-Stick-real-cache-not-run"], envWithoutRealCache(extra));
      const proofDir = proofDirFromOutput(result.stdout);

      expect(result.status).toBe(0);
      expect(existsSync(vitestLog)).toBe(false);
      expect(readFileSync(join(proofDir, "05b_real_public_cache.log"), "utf8")).toBe("NOT_RUN\n");
      expect(readFileSync(join(proofDir, "RESULT.md"), "utf8")).toContain("- PASS 05b_real_public_cache (05b_real_public_cache.log)");
      expect(readFileSync(join(proofDir, "RESULT.md"), "utf8")).toContain("- PASS 06_build (06_build.log)");
    }
  });

  it("passes a set real-cache directory through and stops later validation when that step fails", () => {
    const root = createRunnerFixture();
    const vitestLog = join(root, "vitest-invocations.jsonl");
    const realPublicCacheDir = join(root, "not-a-real-cache");
    writeFakeVitest(root);
    const result = runPhaseRunner(root, ["--phase", "KIA-Stick-real-cache-fail"], envWithoutRealCache({
      KIA_FAKE_VITEST_LOG: vitestLog,
      KIA_FAKE_VITEST_EXIT: "1",
      KIA_REAL_PUBLIC_DATA_DIR: realPublicCacheDir,
    }));
    const proofDir = proofDirFromOutput(result.stdout);
    const resultMd = readFileSync(join(proofDir, "RESULT.md"), "utf8");
    const invocations = readFileSync(vitestLog, "utf8").trim().split("\n").map((line) => JSON.parse(line));

    expect(invocations).toEqual([{
      argv: [
        "run",
        "tests/jcimSource.realCache.integration.test.ts",
        "tests/publicSourceSufficiencyMatrixV2.test.ts",
      ],
      dir: realPublicCacheDir,
    }]);
    expect(readNpmInvocations(result.npmLogPath).map((entry) => entry.args[1])).toEqual([
      "release:check",
      "lint",
      "typecheck",
      "test",
    ]);
    expect(result.status).toBe(1);
    expect(resultMd).toContain("- PASS 05_test (05_test.log)");
    expect(resultMd).toContain("- FAIL 05b_real_public_cache (05b_real_public_cache.log)");
    expect(resultMd).not.toContain("06_build");
    expect(resultMd).toContain("- RESULT: FAIL");
    expect(existsSync(realPublicCacheDir)).toBe(false);
  });

  it("never executes git push while producing the manual push command", () => {
    const root = createRunnerFixture();
    const binDir = join(root, "bin");
    const logPath = join(root, "git-wrapper.log");
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
    writeFileSync(join(root, "README.md"), "fixture changed for no push\n");

    const result = runPhaseRunner(root, ["--phase", "KIA-Stick-v0.5.4-no-push-test", "--commit"], {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      KIA_GIT_WRAPPER_LOG: logPath,
    });
    const proofDir = proofDirFromOutput(result.stdout);
    const gitCalls = readFileSync(logPath, "utf8");

    expectNpmOrder(result.npmLogPath, root);
    expect(result.status).toBe(0);
    expect(readFileSync(join(proofDir, "push_command.txt"), "utf8").trim()).toBe("git push origin main");
    expect(gitCalls).not.toMatch(/^push\b/m);
  });
});

const realNpmEnabled = process.env.KIA_PHASE_RUNNER_REAL_NPM === "1";
if (!realNpmEnabled) console.info("NOT_RUN: set KIA_PHASE_RUNNER_REAL_NPM=1");

describe.runIf(realNpmEnabled)("phase-runner real npm integration (opt-in)", () => {
  it("writes a passing RESULT.md using real npm", () => {
    const root = createRunnerFixture();
    const result = runPhaseRunner(root, ["--phase", "KIA-Stick-real-npm-integration"], process.env, true);
    const proofDir = proofDirFromOutput(result.stdout);

    expect(result.status).toBe(0);
    expect(readFileSync(join(proofDir, "RESULT.md"), "utf8")).toContain("- RESULT: PASS");
  });
});
