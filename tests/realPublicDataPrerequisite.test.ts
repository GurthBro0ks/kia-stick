import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { realPublicDataPermissionProblem, realPublicDataRequiredFiles, realPublicDataUsabilityProblem } from "@/tests/fixtures/realPublicDataPrerequisite";

const parents: string[] = [];
function syntheticCache() {
  const parent = mkdtempSync(path.join(tmpdir(), "kia-prerequisite-"));
  parents.push(parent);
  const dir = path.join(parent, ".kia-public-data");
  mkdirSync(dir, { mode: 0o700 });
  for (const name of realPublicDataRequiredFiles) {
    writeFileSync(path.join(dir, name), "synthetic placeholder", { mode: 0o600 });
  }
  return dir;
}
afterEach(() => {
  for (const parent of parents.splice(0)) rmSync(parent, { recursive: true, force: true });
});

describe("real public data prerequisites (hermetic synthetic files)", () => {
  it.each([undefined, ""])("reports an unset directory for %s", (dir) => {
    expect(realPublicDataUsabilityProblem(dir)).toContain("not set");
  });
  it("rejects relative paths", () => {
    expect(realPublicDataUsabilityProblem(".kia-public-data")).toContain("absolute path");
  });
  it("rejects the wrong basename", () => {
    expect(realPublicDataUsabilityProblem(path.dirname(syntheticCache()))).toContain("named .kia-public-data");
  });
  it("rejects missing directories", () => {
    const dir = syntheticCache();
    rmSync(dir, { recursive: true });
    expect(realPublicDataUsabilityProblem(dir)).toContain("missing");
  });
  it("rejects a missing required file", () => {
    const dir = syntheticCache();
    rmSync(path.join(dir, realPublicDataRequiredFiles[0]));
    expect(realPublicDataUsabilityProblem(dir)).toContain("missing");
  });
  it("accepts a usable cache with safe 0700/0600 permissions", () => {
    const dir = syntheticCache();
    expect(realPublicDataUsabilityProblem(dir)).toBeUndefined();
    expect(realPublicDataPermissionProblem(dir)).toBeUndefined();
  });
  it("rejects directory mode 0755", () => {
    const dir = syntheticCache();
    chmodSync(dir, 0o755);
    const problem = realPublicDataPermissionProblem(dir);
    expect(problem).toContain(dir);
    expect(problem).toContain("0755");
    expect(problem).toContain("0700");
  });
  it("rejects file mode 0644 and identifies the file", () => {
    const dir = syntheticCache();
    const file = path.join(dir, realPublicDataRequiredFiles[0]);
    chmodSync(file, 0o644);
    const problem = realPublicDataPermissionProblem(dir);
    expect(problem).toContain(file);
    expect(problem).toContain("0644");
    expect(problem).toContain("0600");
  });
  it("rejects a symlinked file", () => {
    const dir = syntheticCache();
    const file = path.join(dir, realPublicDataRequiredFiles[0]);
    rmSync(file);
    symlinkSync(path.join(dir, realPublicDataRequiredFiles[1]), file);
    expect(realPublicDataUsabilityProblem(dir)).toBeUndefined();
    expect(realPublicDataPermissionProblem(dir)).toContain(file);
    expect(realPublicDataPermissionProblem(dir)).toContain("symlink");
  });
  it("rejects a symlinked directory", () => {
    const dir = syntheticCache();
    const other = syntheticCache();
    rmSync(other, { recursive: true });
    symlinkSync(dir, other);
    expect(realPublicDataPermissionProblem(other)).toContain("symlink");
  });
  it("rejects a wrong uid", () => {
    const dir = syntheticCache();
    const uid = process.getuid!();
    expect(realPublicDataPermissionProblem(dir, uid + 1)).toContain(dir);
    expect(realPublicDataPermissionProblem(dir, uid + 1)).toContain(`current uid ${uid + 1}`);
  });
});
