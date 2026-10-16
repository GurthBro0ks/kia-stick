/**
 * Public data cache permission-drift detector (GUR-97 item 3) -- READ-ONLY.
 *
 * Inspects a cache directory passed by the caller using lstat metadata only
 * (mode, type, symlink, uid) and directory listings. It never touches file
 * contents and never changes permissions, ownership or timestamps. It does not
 * repair drift: it only reports it. It never throws; any error maps to
 * `unknown`, which is never ok (fail closed).
 *
 * Expected: directories 0700, regular files 0600, owned by the current uid,
 * no symlinks anywhere.
 */
import { lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type PublicDataPermissionStatus = "ok" | "unsafe" | "missing" | "unknown";
export type PublicDataPermissionReason =
  | "dir_mode"
  | "file_mode"
  | "symlink"
  | "wrong_uid"
  | "not_dir"
  | "special_entry"
  | "lstat_error"
  | "readdir_error"
  | "too_deep"
  | "entry_cap";

export interface PermissionStat {
  mode: number;
  uid: number;
  isDirectory(): boolean;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}

export interface PublicDataPermissionDeps {
  lstat: (path: string) => PermissionStat;
  readdir: (path: string) => string[];
  /** Expected owner uid; null means unknown, which fails closed. */
  uid: number | null;
}

export interface PublicDataPermissionEntry {
  /** Path relative to the checked dir ("." for the dir itself). */
  name: string;
  /** 4-digit octal incl. setuid/setgid/sticky, e.g. "0755", "2700"; null when lstat failed. */
  mode: string | null;
  reasons: PublicDataPermissionReason[];
}

export interface PublicDataPermissionResult {
  status: PublicDataPermissionStatus;
  /** Only entries with at least one reason. */
  entries: PublicDataPermissionEntry[];
  checked: number;
}

export const EXPECTED_DIR_MODE = 0o700;
export const EXPECTED_FILE_MODE = 0o600;
const MAX_DEPTH = 8;
const MAX_ENTRIES = 10000;

function defaultUid(): number | null {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

export const defaultPublicDataPermissionDeps: PublicDataPermissionDeps = {
  lstat: (p) => lstatSync(p),
  readdir: (p) => readdirSync(p),
  uid: defaultUid(),
};

const PERM_MASK = 0o7777;

function octal(mode: number): string {
  return (mode & PERM_MASK).toString(8).padStart(4, "0");
}

/** Strip trailing slashes so lstat never resolves a symlinked root ("<link>/"). */
function normalizeRoot(dir: string): string {
  const stripped = dir.replace(/\/+$/, "");
  return stripped === "" ? "/" : stripped;
}

function isMissing(error: unknown): boolean {
  return !!error && typeof error === "object" && (error as { code?: unknown }).code === "ENOENT";
}

function inspect(dir: string, deps: PublicDataPermissionDeps): PublicDataPermissionResult {
  const entries: PublicDataPermissionEntry[] = [];
  let unknown = false;
  let checked = 0;

  let rootStat: PermissionStat;
  try {
    rootStat = deps.lstat(dir);
  } catch (error) {
    if (isMissing(error)) return { status: "missing", entries: [], checked: 0 };
    return { status: "unknown", entries: [{ name: ".", mode: null, reasons: ["lstat_error"] }], checked: 0 };
  }

  const visit = (abs: string, rel: string, st: PermissionStat, depth: number): void => {
    checked += 1;
    const reasons: PublicDataPermissionReason[] = [];
    // Full mask: setuid, setgid and sticky bits make an entry unsafe.
    const perm = st.mode & PERM_MASK;
    if (deps.uid === null) unknown = true;
    else if (st.uid !== deps.uid) reasons.push("wrong_uid");

    if (st.isSymbolicLink()) {
      reasons.push("symlink");
    } else if (st.isDirectory()) {
      if (perm !== EXPECTED_DIR_MODE) reasons.push("dir_mode");
    } else if (st.isFile()) {
      if (rel === ".") reasons.push("not_dir");
      else if (perm !== EXPECTED_FILE_MODE) reasons.push("file_mode");
    } else {
      reasons.push(rel === "." ? "not_dir" : "special_entry");
    }
    if (reasons.length) entries.push({ name: rel, mode: octal(st.mode), reasons });

    // Never descend through symlinks or non-directories.
    if (!st.isDirectory() || st.isSymbolicLink()) return;
    if (depth >= MAX_DEPTH || checked >= MAX_ENTRIES) {
      unknown = true;
      entries.push({ name: rel, mode: octal(st.mode), reasons: ["too_deep"] });
      return;
    }
    let names: string[];
    try {
      names = deps.readdir(abs);
    } catch {
      unknown = true;
      entries.push({ name: rel, mode: octal(st.mode), reasons: ["readdir_error"] });
      return;
    }
    for (const name of [...names].sort()) {
      if (checked >= MAX_ENTRIES) {
        unknown = true;
        entries.push({ name: rel, mode: octal(st.mode), reasons: ["entry_cap"] });
        return;
      }
      const childAbs = join(abs, name);
      const childRel = rel === "." ? name : `${rel}/${name}`;
      let childStat: PermissionStat;
      try {
        childStat = deps.lstat(childAbs);
      } catch {
        unknown = true;
        entries.push({ name: childRel, mode: null, reasons: ["lstat_error"] });
        continue;
      }
      visit(childAbs, childRel, childStat, depth + 1);
    }
  };

  visit(dir, ".", rootStat, 0);
  const unsafe = entries.some((e) =>
    e.reasons.some((r) => r !== "lstat_error" && r !== "readdir_error" && r !== "too_deep" && r !== "entry_cap"),
  );
  const status: PublicDataPermissionStatus = unsafe ? "unsafe" : unknown ? "unknown" : "ok";
  return { status, entries, checked };
}

/** Read-only, never throws. Anything other than "ok" means not safe. */
export function checkPublicDataPermissions(
  dir: string,
  deps: Partial<PublicDataPermissionDeps> = {},
): PublicDataPermissionResult {
  try {
    if (typeof dir !== "string" || dir.trim() === "") {
      return { status: "unknown", entries: [], checked: 0 };
    }
    const merged: PublicDataPermissionDeps = { ...defaultPublicDataPermissionDeps, ...deps };
    return inspect(normalizeRoot(dir), merged);
  } catch {
    return { status: "unknown", entries: [], checked: 0 };
  }
}

export function isPublicDataPermissionOk(result: PublicDataPermissionResult): boolean {
  return result.status === "ok";
}
