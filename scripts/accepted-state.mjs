import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const CURRENT_ACCEPTED_PUSHED_STATE_PATH = "data/current-accepted-pushed-state.json";

export function readCurrentAcceptedPushedState(root = process.cwd()) {
  const target = path.join(root, CURRENT_ACCEPTED_PUSHED_STATE_PATH);
  if (!existsSync(target)) return {};
  return JSON.parse(readFileSync(target, "utf8"));
}

export function acceptedStateProofLines(state) {
  return {
    checkpoint: state.accepted_pushed_short_commit || "unknown",
    commit: state.accepted_pushed_commit || "unknown",
    proof: state.accepted_pushed_proof_dir || "unknown",
  };
}

