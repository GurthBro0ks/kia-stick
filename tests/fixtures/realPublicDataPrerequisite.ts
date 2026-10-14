import { statSync } from "node:fs";
import path from "node:path";

export const realPublicDataDirectory = process.env.KIA_REAL_PUBLIC_DATA_DIR;
export const realPublicDataRequiredFiles = [
  "apwu-usps-jcim-2025.json", "apwu-usps-jcim-2025.pdf",
  "apwu-usps-cba-2024-2027.json", "apwu-usps-cba-2024-2027.pdf",
];

function missingPrerequisite(): string | undefined {
  if (!realPublicDataDirectory) return "KIA_REAL_PUBLIC_DATA_DIR is not set";
  if (!path.isAbsolute(realPublicDataDirectory) || path.basename(realPublicDataDirectory) !== ".kia-public-data")
    return "KIA_REAL_PUBLIC_DATA_DIR must be an absolute path to a directory named .kia-public-data";
  try {
    if (!statSync(realPublicDataDirectory).isDirectory()) return "KIA_REAL_PUBLIC_DATA_DIR must be an existing directory";
    for (const name of realPublicDataRequiredFiles) {
      if (!statSync(path.join(realPublicDataDirectory, name)).isFile()) return `required file ${name} is missing`;
    }
  } catch {
    return "KIA_REAL_PUBLIC_DATA_DIR or a required JCIM/CBA json/pdf file is missing";
  }
}

export const realPublicDataMissingPrerequisite = missingPrerequisite();
export const realPublicDataAvailable = realPublicDataMissingPrerequisite === undefined;

export const realPublicDataSuppliedButUnusable = Boolean(realPublicDataDirectory) && !realPublicDataAvailable;
