import { homedir } from "node:os";
import path from "node:path";

const stateRoot = process.env.XDG_STATE_HOME && path.isAbsolute(process.env.XDG_STATE_HOME)
  ? process.env.XDG_STATE_HOME
  : path.join(homedir(), ".local", "state");

export const PERSISTENT_KIA_PROOF_ROOT = path.join(stateRoot, "kia-stick", "proofs");
export const CODEX_DESKTOP_TMP_ROOT = path.join(stateRoot, "codex-desktop", "tmp");
const legacyProofRoots = ["/home/mint/kia-stick-local-proofs", path.join(homedir(), "kia-stick-local-proofs")];

// Keep recorded evidence paths intact; translate only when locating migrated files.
export function resolveProofPath(value) {
  const resolved = path.resolve(value);
  for (const root of legacyProofRoots) {
    const relative = path.relative(root, resolved);
    if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
      return path.join(PERSISTENT_KIA_PROOF_ROOT, relative);
    }
  }
  return resolved;
}
