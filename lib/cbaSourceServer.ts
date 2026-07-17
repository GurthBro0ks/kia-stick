import { createHash } from "node:crypto";
import { lstatSync, readFileSync, realpathSync, type Stats } from "node:fs";
import path from "node:path";
import {
  CBA_JSON_CACHE_RELATIVE_PATH,
  CBA_MAX_CACHE_BYTES,
  CBA_MAX_RESPONSE_BYTES,
  CBA_PDF_CACHE_RELATIVE_PATH,
  validateCbaSourceCache,
  validatePdfMagic,
  type CbaSourceRouteResponse,
} from "@/lib/cbaSource";

interface CbaSourceFileIo {
  cwd(): string;
  getuid(): number | undefined;
  lstat(target: string): Pick<Stats, "isDirectory" | "isFile" | "isSymbolicLink" | "mode" | "size" | "uid">;
  readFile(target: string): Buffer;
  realpath(target: string): string;
}

const defaultIo: CbaSourceFileIo = {
  cwd: () => process.cwd(),
  getuid: () => process.getuid?.(),
  lstat: (target) => lstatSync(target),
  readFile: (target) => readFileSync(target),
  realpath: (target) => realpathSync(target),
};

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isMissingError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function fixedChildPath(repositoryRoot: string, relativePath: string): string | null {
  const target = path.join(repositoryRoot, relativePath);
  const relative = path.relative(repositoryRoot, target);
  return relative.startsWith("..") || path.isAbsolute(relative) ? null : target;
}

export function readBoundedCbaSourceCache(io: CbaSourceFileIo = defaultIo): CbaSourceRouteResponse {
  try {
    const repositoryRoot = io.realpath(io.cwd());
    const cacheDirectory = path.join(repositoryRoot, ".kia-public-data");
    const pdfPath = fixedChildPath(repositoryRoot, CBA_PDF_CACHE_RELATIVE_PATH);
    const jsonPath = fixedChildPath(repositoryRoot, CBA_JSON_CACHE_RELATIVE_PATH);
    if (!pdfPath || !jsonPath) return { status: "unavailable", reason: "cache_unsafe" };

    const uid = io.getuid();
    const directoryStat = io.lstat(cacheDirectory);
    if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) return { status: "unavailable", reason: "cache_unsafe" };
    if ((uid !== undefined && directoryStat.uid !== uid) || (directoryStat.mode & 0o777) !== 0o700 || io.realpath(cacheDirectory) !== cacheDirectory) {
      return { status: "unavailable", reason: "cache_unsafe" };
    }

    for (const [target, maxBytes] of [[pdfPath, CBA_MAX_RESPONSE_BYTES], [jsonPath, CBA_MAX_CACHE_BYTES]] as const) {
      const stat = io.lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > maxBytes) return { status: "unavailable", reason: "cache_unsafe" };
      if ((uid !== undefined && stat.uid !== uid) || (stat.mode & 0o777) !== 0o600 || io.realpath(target) !== target) {
        return { status: "unavailable", reason: "cache_unsafe" };
      }
    }

    const pdfBytes = io.readFile(pdfPath);
    const jsonBytes = io.readFile(jsonPath);
    if (pdfBytes.byteLength > CBA_MAX_RESPONSE_BYTES || jsonBytes.byteLength > CBA_MAX_CACHE_BYTES) return { status: "unavailable", reason: "cache_unsafe" };
    validatePdfMagic(pdfBytes);
    const parsed = JSON.parse(jsonBytes.toString("utf8")) as unknown;
    const validation = validateCbaSourceCache(parsed, (value) => sha256(value), sha256(pdfBytes));
    return validation.ok ? { status: "available", source: validation.cache } : { status: "unavailable", reason: "cache_invalid" };
  } catch (error) {
    if (isMissingError(error)) return { status: "unavailable", reason: "cache_missing" };
    if (error instanceof SyntaxError) return { status: "unavailable", reason: "cache_invalid" };
    return { status: "unavailable", reason: "cache_unsafe" };
  }
}
