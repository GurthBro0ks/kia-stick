/**
 * Local proof root opt-in (KIA-proof-root-optin-1).
 *
 * Some checkpoint tests need the laptop-only proof root
 * (default /home/mint/kia-stick-local-proofs). On CI and the box it is absent,
 * so those tests are skipped with a visible NOT_RUN reason. Set
 * KIA_LOCAL_PROOF_ROOT to point at another root to opt in.
 *
 * Read-only: existence check only. Never creates, writes or changes anything.
 * The gate checks ONLY that the root exists, never specific proof
 * subdirectories, so a missing proof inside an opted-in root fails loudly.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_LOCAL_PROOF_ROOT = "/home/mint/kia-stick-local-proofs";

const configured = process.env.KIA_LOCAL_PROOF_ROOT?.trim();

export const localProofRoot: string = configured ? configured.replace(/\/+$/, "") || "/" : DEFAULT_LOCAL_PROOF_ROOT;

export const localProofRootAvailable: boolean = existsSync(localProofRoot);

export const localProofRootSkipReason = `NOT_RUN: local proof root ${localProofRoot} not present; set KIA_LOCAL_PROOF_ROOT to opt in`;

/** Build a path under the local proof root. */
export function proofPath(relative = ""): string {
  return relative ? join(localProofRoot, relative) : localProofRoot;
}

/** Test-name suffix: visible skip reason when the root is absent, empty otherwise. */
export function proofRootGateLabel(name: string): string {
  return localProofRootAvailable ? name : `${name} [${localProofRootSkipReason}]`;
}
