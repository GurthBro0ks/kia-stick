import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkPublicDataPermissions,
  isPublicDataPermissionOk,
  type PermissionStat,
} from "@/lib/publicDataPermissions";

// Synthetic mkdtemp fixtures only. chmod is used ONLY on these temp fixtures.
const roots: string[] = [];
function fixture(): { root: string; dir: string; file: string } {
  const root = mkdtempSync(join(tmpdir(), "kia-perm-test-"));
  roots.push(root);
  const dir = join(root, "cache");
  mkdirSync(dir);
  chmodSync(dir, 0o700);
  const file = join(dir, "index.json");
  writeFileSync(file, "{}");
  chmodSync(file, 0o600);
  return { root, dir, file };
}
afterEach(() => {
  while (roots.length) rmSync(roots.pop() as string, { recursive: true, force: true });
});

const uid = process.getuid ? process.getuid() : 0;
const fakeStat = (over: Partial<{ mode: number; uid: number; dir: boolean; file: boolean; link: boolean }>): PermissionStat => ({
  mode: over.mode ?? 0o40700,
  uid: over.uid ?? uid,
  isDirectory: () => over.dir ?? true,
  isFile: () => over.file ?? false,
  isSymbolicLink: () => over.link ?? false,
});

describe("publicDataPermissions (read-only drift detector, GUR-97 item 3)", () => {
  it("ok: dir 0700, file 0600, current uid", () => {
    const { dir } = fixture();
    const r = checkPublicDataPermissions(dir);
    expect(r.status).toBe("ok");
    expect(r.entries).toEqual([]);
    expect(r.checked).toBe(2);
    expect(isPublicDataPermissionOk(r)).toBe(true);
  });

  it("dir 0755 (restore drift) is unsafe with dir_mode", () => {
    const { dir } = fixture();
    chmodSync(dir, 0o755);
    const r = checkPublicDataPermissions(dir);
    expect(r.status).toBe("unsafe");
    expect(r.entries).toEqual([{ name: ".", mode: "0755", reasons: ["dir_mode"] }]);
  });

  it("nested subdir 0755 is unsafe with dir_mode", () => {
    const { dir } = fixture();
    mkdirSync(join(dir, "sub"));
    chmodSync(join(dir, "sub"), 0o755);
    const r = checkPublicDataPermissions(dir);
    expect(r.status).toBe("unsafe");
    expect(r.entries).toEqual([{ name: "sub", mode: "0755", reasons: ["dir_mode"] }]);
  });

  it("file 0644 is unsafe with file_mode", () => {
    const { dir, file } = fixture();
    chmodSync(file, 0o644);
    const r = checkPublicDataPermissions(dir);
    expect(r.status).toBe("unsafe");
    expect(r.entries).toEqual([{ name: "index.json", mode: "0644", reasons: ["file_mode"] }]);
  });

  it("symlinked dir (root) is unsafe with symlink and is not followed", () => {
    const { root, dir } = fixture();
    const link = join(root, "link");
    symlinkSync(dir, link);
    const r = checkPublicDataPermissions(link);
    expect(r.status).toBe("unsafe");
    expect(r.entries[0].reasons).toContain("symlink");
    expect(r.checked).toBe(1);
  });

  it("symlinked file inside the dir is unsafe with symlink", () => {
    const { root, dir } = fixture();
    const outside = join(root, "outside.txt");
    writeFileSync(outside, "x");
    chmodSync(outside, 0o600);
    symlinkSync(outside, join(dir, "link.txt"));
    const r = checkPublicDataPermissions(dir);
    expect(r.status).toBe("unsafe");
    expect(r.entries).toEqual([expect.objectContaining({ name: "link.txt", reasons: ["symlink"] })]);
  });

  it("wrong uid (injected) is unsafe with wrong_uid", () => {
    const { dir } = fixture();
    const r = checkPublicDataPermissions(dir, { uid: uid + 4242 });
    expect(r.status).toBe("unsafe");
    expect(r.entries.every((e) => e.reasons.includes("wrong_uid"))).toBe(true);
    expect(r.entries).toHaveLength(2);
  });

  it("unknown uid (null) fails closed as unknown", () => {
    const { dir } = fixture();
    expect(checkPublicDataPermissions(dir, { uid: null }).status).toBe("unknown");
  });

  it("missing dir is missing (not ok)", () => {
    const { root } = fixture();
    const r = checkPublicDataPermissions(join(root, "nope"));
    expect(r.status).toBe("missing");
    expect(isPublicDataPermissionOk(r)).toBe(false);
  });

  it("a regular file as the root is unsafe with not_dir", () => {
    const { file } = fixture();
    const r = checkPublicDataPermissions(file);
    expect(r.status).toBe("unsafe");
    expect(r.entries[0].reasons).toEqual(["not_dir"]);
  });

  it("lstat error (EACCES) maps to unknown, never ok, and never throws", () => {
    const err = Object.assign(new Error("denied"), { code: "EACCES" });
    const thrower = () => {
      throw err;
    };
    expect(() => checkPublicDataPermissions("/synthetic/root", { lstat: thrower })).not.toThrow();
    const r = checkPublicDataPermissions("/synthetic/root", { lstat: thrower });
    expect(r.status).toBe("unknown");
    expect(isPublicDataPermissionOk(r)).toBe(false);
  });

  it("child lstat error and readdir error map to unknown", () => {
    const childErr = checkPublicDataPermissions("/synthetic/root", {
      lstat: (p) => {
        if (p === "/synthetic/root") return fakeStat({});
        throw Object.assign(new Error("io"), { code: "EIO" });
      },
      readdir: () => ["a"],
      uid,
    });
    expect(childErr.status).toBe("unknown");
    expect(childErr.entries).toEqual([{ name: "a", mode: null, reasons: ["lstat_error"] }]);
    const dirErr = checkPublicDataPermissions("/synthetic/root", {
      lstat: () => fakeStat({}),
      readdir: () => {
        throw new Error("EACCES");
      },
      uid,
    });
    expect(dirErr.status).toBe("unknown");
  });

  it("never descends through an entry flagged as symlink (injected stat)", () => {
    let readdirCalls = 0;
    const r = checkPublicDataPermissions("/synthetic/root", {
      lstat: () => fakeStat({ link: true, dir: true }),
      readdir: () => {
        readdirCalls += 1;
        return [];
      },
      uid,
    });
    expect(r.status).toBe("unsafe");
    expect(readdirCalls).toBe(0);
  });

  // Fix round (review f1cfc550 conditions 1-3).
  it("setgid/sticky/setuid dirs (2700, 1700, 4700) are unsafe with 4-digit mode", () => {
    for (const [mode, label] of [[0o2700, "2700"], [0o1700, "1700"], [0o4700, "4700"]] as const) {
      const { dir } = fixture();
      chmodSync(dir, mode);
      expect(lstatSync(dir).mode & 0o7777, label).toBe(mode);
      const r = checkPublicDataPermissions(dir);
      expect(r.status, label).toBe("unsafe");
      expect(r.entries, label).toEqual([{ name: ".", mode: label, reasons: ["dir_mode"] }]);
    }
  });

  it("setgid/setuid files (2600, 4600) are unsafe with 4-digit mode", () => {
    for (const [mode, label] of [[0o2600, "2600"], [0o4600, "4600"]] as const) {
      const { dir, file } = fixture();
      chmodSync(file, mode);
      expect(lstatSync(file).mode & 0o7777, label).toBe(mode);
      const r = checkPublicDataPermissions(dir);
      expect(r.status, label).toBe("unsafe");
      expect(r.entries, label).toEqual([{ name: "index.json", mode: label, reasons: ["file_mode"] }]);
    }
  });

  it("trailing slash on a symlinked root is still flagged as symlink (<symlink>/)", () => {
    const { root, dir } = fixture();
    const link = join(root, "link");
    symlinkSync(dir, link);
    for (const p of [link + "/", link + "///"]) {
      const r = checkPublicDataPermissions(p);
      expect(r.status, p).toBe("unsafe");
      expect(r.entries[0].reasons, p).toContain("symlink");
    }
    expect(checkPublicDataPermissions(dir + "/").status).toBe("ok");
  });

  it("other-only bits are unsafe: dir 0701, file 0604", () => {
    const a = fixture();
    chmodSync(a.dir, 0o701);
    expect(checkPublicDataPermissions(a.dir).entries).toEqual([{ name: ".", mode: "0701", reasons: ["dir_mode"] }]);
    const b = fixture();
    chmodSync(b.file, 0o604);
    expect(checkPublicDataPermissions(b.dir).entries).toEqual([{ name: "index.json", mode: "0604", reasons: ["file_mode"] }]);
  });

  it("under-permissive modes are not the expected exact mode: dir 0500, file 0400", () => {
    const r1 = checkPublicDataPermissions("/synthetic/root", {
      lstat: () => fakeStat({ mode: 0o40500 }),
      readdir: () => [],
      uid,
    });
    expect(r1.status).toBe("unsafe");
    expect(r1.entries).toEqual([{ name: ".", mode: "0500", reasons: ["dir_mode"] }]);
    const b = fixture();
    chmodSync(b.file, 0o400);
    expect(checkPublicDataPermissions(b.dir).entries).toEqual([{ name: "index.json", mode: "0400", reasons: ["file_mode"] }]);
  });

  it("a stat object that throws maps to unknown via the outer guard", () => {
    const bad = {
      mode: 0o40700,
      uid,
      isDirectory: () => {
        throw new Error("malformed");
      },
      isFile: () => false,
      isSymbolicLink: () => false,
    } as PermissionStat;
    expect(() => checkPublicDataPermissions("/synthetic/root", { lstat: () => bad, readdir: () => [], uid })).not.toThrow();
    expect(checkPublicDataPermissions("/synthetic/root", { lstat: () => bad, readdir: () => [], uid }).status).toBe("unknown");
  });

  it("depth cap (endless 0700 nesting) gives unknown with too_deep", () => {
    const r = checkPublicDataPermissions("/synthetic/root", { lstat: () => fakeStat({}), readdir: () => ["d"], uid });
    expect(r.status).toBe("unknown");
    expect(r.entries.some((e) => e.reasons.includes("too_deep"))).toBe(true);
    expect(isPublicDataPermissionOk(r)).toBe(false);
  });

  it("entry cap (10001 safe files) gives unknown with entry_cap", () => {
    const names = Array.from({ length: 10001 }, (_, i) => `f${i}`);
    const r = checkPublicDataPermissions("/synthetic/root", {
      lstat: (p) => (p === "/synthetic/root" ? fakeStat({}) : fakeStat({ mode: 0o100600, dir: false, file: true })),
      readdir: () => names,
      uid,
    });
    expect(r.status).toBe("unknown");
    expect(r.entries).toEqual([{ name: ".", mode: "0700", reasons: ["entry_cap"] }]);
  });

  it("a FIFO inside the dir is unsafe with special_entry (real mkfifo on temp fixture, plus injected)", () => {
    const { dir } = fixture();
    execFileSync("mkfifo", ["-m", "600", join(dir, "pipe")]);
    const r = checkPublicDataPermissions(dir);
    expect(r.status).toBe("unsafe");
    expect(r.entries).toEqual([{ name: "pipe", mode: "0600", reasons: ["special_entry"] }]);
    const inj = checkPublicDataPermissions("/synthetic/root", {
      lstat: (p) => (p === "/synthetic/root" ? fakeStat({}) : fakeStat({ mode: 0o10600, dir: false, file: false })),
      readdir: () => ["fifo"],
      uid,
    });
    expect(inj.entries).toEqual([{ name: "fifo", mode: "0600", reasons: ["special_entry"] }]);
  });

  // Fix round 2 (re-review cf96c5e9).
  it("dot segments are rejected as unknown, never ok (<symlink>/., /./, /./., ..)", () => {
    const { root, dir } = fixture();
    const link = join(root, "link");
    symlinkSync(dir, link);
    for (const p of [link + "/.", link + "/./", link + "/./.", link + "/.//", dir + "/.", dir + "/../cache", root + "/./cache", "./cache", ".."]) {
      const r = checkPublicDataPermissions(p);
      expect(r.status, p).toBe("unknown");
      expect(r.entries, p).toEqual([{ name: ".", mode: null, reasons: ["path_dot_segment"] }]);
      expect(isPublicDataPermissionOk(r), p).toBe(false);
    }
    // Names that merely contain dots are fine.
    mkdirSync(join(root, "cache.v2"));
    chmodSync(join(root, "cache.v2"), 0o700);
    expect(checkPublicDataPermissions(join(root, "cache.v2")).status).toBe("ok");
    expect(checkPublicDataPermissions(join(root, "..cache")).status).toBe("missing");
  });

  const wide = (children: number) =>
    checkPublicDataPermissions("/synthetic/root", {
      lstat: (p) => (p === "/synthetic/root" ? fakeStat({}) : fakeStat({ mode: 0o100600, dir: false, file: true })),
      readdir: () => Array.from({ length: children }, (_, i) => `f${i}`),
      uid,
    });

  it("entry limit pinned: 10000 entries total (root + 9999) is ok; 10001 total (root + 10000) is entry_cap", () => {
    const at = wide(9999);
    expect(at.status).toBe("ok");
    expect(at.checked).toBe(10000);
    const over = wide(10000);
    expect(over.status).toBe("unknown");
    expect(over.checked).toBe(10000);
    expect(over.entries).toEqual([{ name: ".", mode: "0700", reasons: ["entry_cap"] }]);
  });

  const chain = (levels: number) =>
    checkPublicDataPermissions("/synthetic/root", {
      lstat: () => fakeStat({}),
      readdir: (p) => (p.split("/").length - 3 < levels ? ["n"] : []),
      uid,
    });

  it("depth limit pinned: a folder at depth 7 is ok; a folder at depth 8 is too_deep", () => {
    const seven = chain(7);
    expect(seven.status).toBe("ok");
    expect(seven.checked).toBe(8);
    const eight = chain(8);
    expect(eight.status).toBe("unknown");
    expect(eight.checked).toBe(9);
    expect(eight.entries).toEqual([{ name: "n/n/n/n/n/n/n/n", mode: "0700", reasons: ["too_deep"] }]);
  });

  it("empty or non-string path is unknown", () => {
    expect(checkPublicDataPermissions("").status).toBe("unknown");
    expect(checkPublicDataPermissions(undefined as unknown as string).status).toBe("unknown");
  });

  it("does not auto-fix: modes, mtime and contents unchanged after the call", () => {
    const { dir, file } = fixture();
    chmodSync(dir, 0o755);
    chmodSync(file, 0o644);
    const before = [lstatSync(dir), lstatSync(file)].map((s) => [s.mode, s.uid, s.mtimeMs, s.ctimeMs]);
    expect(checkPublicDataPermissions(dir).status).toBe("unsafe");
    const after = [lstatSync(dir), lstatSync(file)].map((s) => [s.mode, s.uid, s.mtimeMs, s.ctimeMs]);
    expect(after).toEqual(before);
    expect(statSync(dir).mode & 0o777).toBe(0o755);
    expect(readFileSync(file, "utf8")).toBe("{}");
  });

  it("static grep: no permission changes, content reads or process spawning in the source", () => {
    const src = readFileSync(join(process.cwd(), "lib/publicDataPermissions.ts"), "utf8");
    expect(src).not.toMatch(/chmod|chown|writeFile|open\(|readFile|createReadStream|child_process|exec/);
    expect(src).not.toMatch(/utimes|appendFile|unlink|rmSync|rename|umask|process\.env/);
  });
});
