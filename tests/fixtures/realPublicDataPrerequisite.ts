import { lstatSync, statSync } from "node:fs";
import path from "node:path";

export const realPublicDataDirectory = process.env.KIA_REAL_PUBLIC_DATA_DIR;
export const realPublicDataRequiredFiles = [
  "apwu-usps-jcim-2025.json", "apwu-usps-jcim-2025.pdf",
  "apwu-usps-cba-2024-2027.json", "apwu-usps-cba-2024-2027.pdf",
];

export function realPublicDataUsabilityProblem(dir: string | undefined): string | undefined {
  if (!dir) return "KIA_REAL_PUBLIC_DATA_DIR is not set";
  if (!path.isAbsolute(dir) || path.basename(dir) !== ".kia-public-data")
    return "KIA_REAL_PUBLIC_DATA_DIR must be an absolute path to a directory named .kia-public-data";
  try {
    if (!statSync(dir).isDirectory()) return "KIA_REAL_PUBLIC_DATA_DIR must be an existing directory";
    for (const name of realPublicDataRequiredFiles) {
      if (!statSync(path.join(dir, name)).isFile()) return `required file ${name} is missing`;
    }
  } catch {
    return "KIA_REAL_PUBLIC_DATA_DIR or a required JCIM/CBA json/pdf file is missing";
  }
}

export function realPublicDataPermissionProblem(dir: string, uid = process.getuid?.()): string | undefined {
  if (uid === undefined) return `Cannot verify supplied cache ownership: ${dir}; current uid unavailable (required mode 0700)`;
  for (const [target, requiredMode, directory] of [
    [dir, 0o700, true],
    ...realPublicDataRequiredFiles.map((name) => [path.join(dir, name), 0o600, false] as const),
  ] as const) {
    let stat;
    try {
      stat = lstatSync(target);
    } catch {
      return `Unsafe supplied cache: ${target}; actual mode unavailable, required mode 0${requiredMode.toString(8)} (cannot stat path)`;
    }
    const actualMode = stat.mode & 0o7777;
    if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile()) ||
        actualMode !== requiredMode || stat.uid !== uid) {
      return `Unsafe supplied cache: ${target}; actual mode 0${actualMode.toString(8)}, required mode 0${requiredMode.toString(8)}; must be a ${directory ? "real directory" : "regular file"}, not a symlink, owned by current uid ${uid} (actual uid ${stat.uid})`;
    }
  }
}

const usabilityProblem = realPublicDataUsabilityProblem(realPublicDataDirectory);
const permissionProblem = usabilityProblem === undefined
  ? realPublicDataPermissionProblem(realPublicDataDirectory!) : undefined;
export const realPublicDataStatus: "not_supplied" | "unusable" | "unsafe" | "ready" =
  !realPublicDataDirectory ? "not_supplied" : usabilityProblem ? "unusable" : permissionProblem ? "unsafe" : "ready";
export const realPublicDataReason = usabilityProblem ?? permissionProblem ?? "Supplied cache is ready";
export const realPublicDataMissingPrerequisite = usabilityProblem ?? permissionProblem;
export const realPublicDataAvailable = realPublicDataStatus === "ready";
export const realPublicDataSuppliedButUnusable = realPublicDataStatus === "unusable";
export const realPublicDataUnsafe = realPublicDataStatus === "unsafe";
