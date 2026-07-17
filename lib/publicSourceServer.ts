import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync, type Stats } from "node:fs";
import path from "node:path";
import {
  PUBLIC_SOURCE_CACHE_RELATIVE_PATH,
  validatePublicSourceCache,
  type PublicSourceRouteResponse,
} from "@/lib/publicSource";

interface PublicSourceFileIo {
  cwd(): string;
  getuid(): number | undefined;
  lstat(target: string): Pick<Stats, "isDirectory" | "isFile" | "isSymbolicLink" | "mode" | "size" | "uid">;
  readFile(target: string): string;
  realpath(target: string): string;
}

const defaultIo: PublicSourceFileIo = {
  cwd: () => process.cwd(),
  getuid: () => process.getuid?.(),
  lstat: (target) => lstatSync(target),
  readFile: (target) => readFileSync(target, "utf8"),
  realpath: (target) => realpathSync(target),
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isMissingError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

export function readBoundedPublicSourceCache(io: PublicSourceFileIo = defaultIo): PublicSourceRouteResponse {
  try {
    const repositoryRoot = io.realpath(io.cwd());
    const cacheDirectory = path.join(repositoryRoot, ".kia-public-data");
    const cachePath = path.join(repositoryRoot, PUBLIC_SOURCE_CACHE_RELATIVE_PATH);
    const relative = path.relative(repositoryRoot, cachePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return { status: "unavailable", reason: "cache_unsafe" };

    const uid = io.getuid();
    const directoryStat = io.lstat(cacheDirectory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) return { status: "unavailable", reason: "cache_unsafe" };
    if ((uid !== undefined && directoryStat.uid !== uid) || (directoryStat.mode & 0o777) !== 0o700) {
      return { status: "unavailable", reason: "cache_unsafe" };
    }
    if (io.realpath(cacheDirectory) !== cacheDirectory) return { status: "unavailable", reason: "cache_unsafe" };

    const stat = io.lstat(cachePath);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 1_000_000) {
      return { status: "unavailable", reason: "cache_unsafe" };
    }
    if ((uid !== undefined && stat.uid !== uid) || (stat.mode & 0o777) !== 0o600) {
      return { status: "unavailable", reason: "cache_unsafe" };
    }
    if (io.realpath(cachePath) !== cachePath) return { status: "unavailable", reason: "cache_unsafe" };

    const raw = io.readFile(cachePath);
    if (Buffer.byteLength(raw, "utf8") > 1_000_000) return { status: "unavailable", reason: "cache_unsafe" };
    const parsed = JSON.parse(raw) as unknown;
    const validation = validatePublicSourceCache(parsed, sha256);
    return validation.ok
      ? { status: "available", source: validation.cache }
      : { status: "unavailable", reason: "cache_invalid" };
  } catch (error) {
    if (isMissingError(error)) return { status: "unavailable", reason: "cache_missing" };
    if (error instanceof SyntaxError) return { status: "unavailable", reason: "cache_invalid" };
    return { status: "unavailable", reason: "cache_unsafe" };
  }
}
