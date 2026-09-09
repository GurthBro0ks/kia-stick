import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assertFakeMetadataOnly } from "@/lib/vaultModel";

describe("Omarchy project paths", () => {
  it("discovers migrated evidence by default and resolves an old Mint proof reference", () => {
    const stateRoot = mkdtempSync(join(tmpdir(), "kia-migrated-state-"));
    const proofName = "proof_kia_stick_migration_20260909T000000Z";
    const proofRoot = join(stateRoot, "kia-stick", "proofs");
    const proofDir = join(proofRoot, proofName);
    mkdirSync(proofDir, { recursive: true });
    writeFileSync(join(proofDir, "RESULT.md"), "RESULT=PASS\nPHASE=migration-fixture\nPUSHED=no\nMANUAL_QA_STATUS=PENDING\n");
    const env = { ...process.env, XDG_STATE_HOME: stateRoot, KIA_PROOF_ROOT: "" };
    const run = (script: string, args: string[]) => execFileSync("node", [resolve("scripts", script), ...args], { env, encoding: "utf8" });

    expect(run("proof-index.mjs", ["list"])).toContain(proofDir);
    const summary = run("closeout-helper.mjs", ["summary", "--proof-dir", `/home/mint/kia-stick-local-proofs/${proofName}`]);
    expect(summary).toContain(`PROOF_DIR=${proofDir}`);
    expect(summary).toContain("PHASE=migration-fixture");
    run("local-proof-index.mjs", ["write"]);
    const index = JSON.parse(readFileSync(join(proofRoot, "LOCAL_PROOF_INDEX.json"), "utf8"));
    expect(index.latestProof).toBe(proofDir);
  });

  it("does not translate sibling paths or paths escaping the legacy proof root", () => {
    const modulePath = resolve("scripts/proof-paths.mjs");
    const output = execFileSync("node", ["--input-type=module", "-e", `
      const { resolveProofPath } = await import(process.argv[1]);
      console.log(JSON.stringify(process.argv.slice(2).map(resolveProofPath)));
    `, modulePath, "/home/mint/kia-stick-local-proofs-other/item", "/home/mint/kia-stick-local-proofs/../private/item"], { encoding: "utf8" });
    expect(JSON.parse(output)).toEqual(["/home/mint/kia-stick-local-proofs-other/item", "/home/mint/private/item"]);
  });

  it("continues blocking private shared-drive metadata on Omarchy", () => {
    expect(assertFakeMetadataOnly({ label: "/run/media/slimy/SHARED/APWU/private.pdf" }).ok).toBe(false);
  });
});
