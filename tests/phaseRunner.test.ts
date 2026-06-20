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

function createRunnerFixture(options: { lintFails?: boolean } = {}): string {
  const root = mkdtempSync(join(tmpdir(), "kia-phase-runner-"));
  for (const dir of ["public", "app", "components", "lib", "tests", "scripts"]) mkdirSync(join(root, dir), { recursive: true });
  const ok = "node -e \"console.log('stub pass')\"";
  const fail = "node -e \"console.error('stub fail'); process.exit(1)\"";
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify(
      {
        name: "kia-phase-runner-fixture",
        version: "0.4.0",
        private: true,
        scripts: {
          "release:check": ok,
          lint: options.lintFails ? fail : ok,
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

function runPhaseRunner(root: string, args: string[], env: NodeJS.ProcessEnv = process.env) {
  return spawnSync("node", [scriptPath, "--root", root, ...args], {
    cwd: resolve("."),
    encoding: "utf8",
    env,
  });
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

    expect(result.status).toBe(0);
    expect(resultMd).toContain("- RESULT: PASS");
    expect(resultMd).toContain("- Commit status: committed");
    expect(resultMd).toContain("- M README.md");
    expect(log).toContain("Record KIA-Stick-v0.5.4-commit-test");
    expect(pushCommand).toBe("git push origin main");
  });

  it("does not commit or write a push command when validation fails", () => {
    const root = createRunnerFixture({ lintFails: true });
    const before = runGit(root, ["rev-parse", "--short", "HEAD"]).trim();
    writeFileSync(join(root, "README.md"), "fixture changed but failing\n");

    const result = runPhaseRunner(root, ["--phase", "KIA-Stick-v0.5.4-fail-test", "--commit"]);
    const proofDir = proofDirFromOutput(result.stdout);
    const after = runGit(root, ["rev-parse", "--short", "HEAD"]).trim();
    const resultMd = readFileSync(join(proofDir, "RESULT.md"), "utf8");

    expect(result.status).toBe(1);
    expect(after).toBe(before);
    expect(resultMd).toContain("- RESULT: FAIL");
    expect(resultMd).toContain("- Commit status: skipped_validation_failed");
    expect(existsSync(join(proofDir, "push_command.txt"))).toBe(false);
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

    expect(result.status).toBe(0);
    expect(readFileSync(join(proofDir, "push_command.txt"), "utf8").trim()).toBe("git push origin main");
    expect(gitCalls).not.toMatch(/^push\b/m);
  });
});
