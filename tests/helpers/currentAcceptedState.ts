import { expect } from "vitest";
import currentAcceptedPushedState from "@/data/current-accepted-pushed-state.json";

export function expectCurrentCloseoutSummary(output: string): void {
  expect(output).toContain(`PROOF_CHAIN_ACCEPTED_PUSHED_CHECKPOINT=${currentAcceptedPushedState.accepted_pushed_short_commit}`);
  expect(output).toContain(`PROOF_CHAIN_LOCAL_IMPLEMENTATION_PROOF=${currentAcceptedPushedState.local_implementation_proof_dir}`);
  expect(output).toContain(`PROOF_CHAIN_OPERATOR_QA_PROOF=${currentAcceptedPushedState.operator_qa_pass_proof_dir}`);
  expect(output).toContain(`PROOF_CHAIN_CLOSEOUT_PUSH_PROOF=${currentAcceptedPushedState.accepted_pushed_proof_dir}`);
  expect(output).toContain(`PROOF_CHAIN_PENDING_LOCAL_BUNDLE=${currentAcceptedPushedState.local_bundle_status}`);
}

export function expectCurrentProofIndexOutput(output: string): void {
  const closeoutProof =
    currentAcceptedPushedState.latest_pushed_closeout_proof_dir ?? currentAcceptedPushedState.accepted_pushed_proof_dir;
  const closeoutCommit =
    currentAcceptedPushedState.latest_pushed_closeout_commit ??
    currentAcceptedPushedState.repository_recording_commit ??
    currentAcceptedPushedState.accepted_pushed_commit;

  expect(output).toContain(`Latest accepted pushed closeout proof: ${closeoutProof}`);
  expect(output).toContain(`Latest accepted pushed closeout commit: ${closeoutCommit}`);
  expect(output).toContain(`Accepted state contract checkpoint: ${currentAcceptedPushedState.accepted_pushed_short_commit}`);
  expect(output).toContain(`Accepted state contract commit: ${currentAcceptedPushedState.accepted_pushed_commit}`);
  expect(output).toContain(`Accepted state contract proof: ${currentAcceptedPushedState.accepted_pushed_proof_dir}`);
}
