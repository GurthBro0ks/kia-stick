import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = resolve("scripts/proof-index.mjs");

interface ProofIndexModule {
  parseProofDirName(path: string): { phaseSlug: string; timestamp: string; path: string } | null;
  parseResultMarkdown(markdown: string, proofPath?: string): { phase: string; result: string; commit: string; pushed: string; flags: string[] };
  redactProofText(input: string): { text: string; flags: string[] };
  discoverProofDirs(root?: string): Array<{ phase: string; result: string; timestamp: string; path: string }>;
  selectLatestProof<T>(proofs: T[]): T | null;
}

async function loadModule(): Promise<ProofIndexModule> {
  return (await import(pathToFileURL(scriptPath).href)) as ProofIndexModule;
}

function createProof(root: string, name: string, result: string): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "RESULT.md"), result);
  return dir;
}

function createGitFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "kia-proof-index-git-"));
  writeFileSync(join(root, "README.md"), "fixture\n");
  execFileSync("git", ["init", "-b", "main"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["config", "user.email", "proof-index@example.invalid"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["config", "user.name", "Proof Index Test"], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["add", "."], { cwd: root, encoding: "utf8" });
  execFileSync("git", ["commit", "-m", "Initial fixture"], { cwd: root, encoding: "utf8" });
  return root;
}

describe("proof-index", () => {
  it("parses proof directory names and RESULT.md fields", async () => {
    const mod = await loadModule();
    const proofPath = "/tmp/proof_kia_stick_v0_5_5_demo_20260620T203000Z";
    const parsedDir = mod.parseProofDirName(proofPath);
    const parsedResult = mod.parseResultMarkdown(
      [
        "# Result",
        "- RESULT: PASS",
        "- Phase: KIA-Stick-v0.5.5-demo",
        "- Commit SHA: abc1234",
        "- Push performed: no",
        "",
      ].join("\n"),
      proofPath
    );

    expect(parsedDir?.phaseSlug).toBe("v0_5_5_demo");
    expect(parsedDir?.timestamp).toBe("20260620T203000Z");
    expect(parsedResult.phase).toBe("KIA-Stick-v0.5.5-demo");
    expect(parsedResult.result).toBe("PASS");
    expect(parsedResult.commit).toBe("abc1234");
    expect(parsedResult.pushed).toBe("no");
  });

  it("selects the latest proof by timestamp", async () => {
    const mod = await loadModule();
    const root = mkdtempSync(join(tmpdir(), "kia-proof-index-root-"));
    createProof(root, "proof_kia_stick_old_phase_20260620T201000Z", "- RESULT: PASS\n- Phase: old\n");
    const latestPath = createProof(root, "proof_kia_stick_new_phase_20260620T202000Z", "- RESULT: PASS\n- Phase: new\n");

    const proofs = mod.discoverProofDirs(root);
    const latest = mod.selectLatestProof(proofs);

    expect(proofs.map((proof) => proof.phase)).toEqual(["new", "old"]);
    expect(latest?.path).toBe(latestPath);
  });

  it("redacts and flags private paths, file inputs, and secrets-looking values", async () => {
    const mod = await loadModule();
    const syntheticApiKey = ["api", "_key=super", "secretvalue123"].join("");
    const syntheticToken = ["to", "ken=ghp_", "abcdefghijkl", "mnopqrstuvwx"].join("");
    const redacted = mod.redactProofText(
      [
        "path=/media/mint/SHARED/APWU/private.pdf",
        "vault=~/kia-stick-private-vault/doc.md",
        "<input type=\"file\" name=\"upload\" />",
        syntheticApiKey,
        syntheticToken,
      ].join("\n")
    );

    expect(redacted.text).not.toContain("/media/mint/SHARED/APWU");
    expect(redacted.text).not.toContain("kia-stick-private-vault");
    expect(redacted.text).not.toContain(["super", "secretvalue123"].join(""));
    expect(redacted.flags).toEqual(["apwu_path", "file_input", "private_vault", "secret_like"]);
  });

  it("prints latest RESULT.md and push_command.txt when present", () => {
    const root = mkdtempSync(join(tmpdir(), "kia-proof-index-latest-"));
    const latest = createProof(
      root,
      "proof_kia_stick_latest_20260620T204000Z",
      "- RESULT: PASS\n- Phase: KIA-Stick-latest\n- Commit SHA: cafe123\n- Push performed: no\n"
    );
    writeFileSync(join(latest, "push_command.txt"), "git push origin main\n");

    const result = spawnSync("node", [scriptPath, "latest", "--root", root, "--repo-root", createGitFixture()], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Latest proof:");
    expect(result.stdout).toContain("- RESULT: PASS");
    expect(result.stdout).toContain("--- push_command.txt ---");
    expect(result.stdout).toContain("git push origin main");
  });

  it("reports acceptance next action without executing git push", () => {
    const proofRoot = mkdtempSync(join(tmpdir(), "kia-proof-index-accept-"));
    createProof(
      proofRoot,
      "proof_kia_stick_accept_20260620T205000Z",
      "- RESULT: PASS\n- Phase: KIA-Stick-accept\n- Commit SHA: cafe123\n- Push performed: no\n"
    );
    const repoRoot = createGitFixture();
    const wrapperRoot = mkdtempSync(join(tmpdir(), "kia-proof-index-git-wrapper-"));
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

    const result = spawnSync("node", [scriptPath, "latest", "--root", proofRoot, "--repo-root", repoRoot], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        KIA_GIT_WRAPPER_LOG: logPath,
      },
    });
    const gitCalls = readFileSync(logPath, "utf8");

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("next_action=No push needed");
    expect(gitCalls).not.toMatch(/^push\b/m);
  });

  it("does not create push_command.txt or mutate proof directories", () => {
    const root = mkdtempSync(join(tmpdir(), "kia-proof-index-no-push-"));
    const proof = createProof(root, "proof_kia_stick_readonly_20260620T210000Z", "- RESULT: PASS\n- Phase: readonly\n");

    const result = spawnSync("node", [scriptPath, "list", "--root", root], { encoding: "utf8" });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("phase=readonly");
    expect(existsSync(join(proof, "push_command.txt"))).toBe(false);
  });
});
