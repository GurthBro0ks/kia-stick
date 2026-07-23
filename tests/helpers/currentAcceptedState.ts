import { readFileSync } from "node:fs";
import { expect } from "vitest";
import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";

export function expectCurrentCloseoutSummary(output: string): void {
  expect(output).toContain(`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=${currentAcceptedPushedState.accepted_pushed_short_commit}`);
  expect(output).toContain(`PROOF_CHAIN_LOCAL_IMPLEMENTATION_PROOF=${currentAcceptedPushedState.local_implementation_proof_dir}`);
  expect(output).toContain(
    `PROOF_CHAIN_OPERATOR_QA_PROOF=${
      currentAcceptedPushedState.local_bundle_operator_qa_pass_proof_dir ??
      currentAcceptedPushedState.operator_qa_pass_proof_dir
    }`
  );
  expect(output).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${currentAcceptedPushedState.accepted_pushed_proof_dir}`);
  expect(output).toContain(`PROOF_CHAIN_PENDING_LOCAL_BUNDLE=${currentAcceptedPushedState.local_bundle_status}`);
}

export function expectCurrentProofIndexOutput(output: string): void {
  const observedProof = output.match(/^Latest accepted pushed closeout proof: (.+)$/m)?.[1];
  const observedCommit = output.match(/^Latest accepted pushed closeout commit: ([0-9a-f]{40})$/m)?.[1];

  expect(observedProof).toBeTruthy();
  expect(observedCommit).toMatch(/^[0-9a-f]{40}$/);
  const observedResult = readFileSync(`${observedProof}/RESULT.md`, "utf8");
  expect(observedResult).toContain("RESULT=PASS");
  expect(observedResult).toContain("PUSHED=yes");
  expect(observedResult).toMatch(
    new RegExp(`(?:COMMIT_SHA|CLOSEOUT_COMMIT|HEAD)=${observedCommit}`)
  );
  expect(output).toContain(`Accepted state contract checkpoint: ${currentAcceptedPushedState.accepted_pushed_short_commit}`);
  expect(output).toContain(`Accepted state contract commit: ${currentAcceptedPushedState.accepted_pushed_commit}`);
  expect(output).toContain(`Accepted state contract proof: ${currentAcceptedPushedState.accepted_pushed_proof_dir}`);
}
