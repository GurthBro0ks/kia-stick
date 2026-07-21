import currentAcceptedPushedStateJson from "@/data/current-accepted-pushed-state.json";

export interface AcceptedCheckpoint {
  checkpoint: string;
  commit: string;
  short_commit: string;
  status: "historical_only_not_current";
}

export interface CurrentAcceptedPushedState {
  schema: string;
  phase: string;
  checkpoint_kind?: "capability";
  checkpoint: string;
  checkpoint_label: string;
  accepted_bundle?: string;
  accepted_pushed_commit: string;
  accepted_pushed_short_commit: string;
  accepted_pushed_proof_dir: string;
  local_implementation_proof_dir: string;
  local_bundle_operator_qa_pass_proof_dir?: string;
  operator_qa_pass_proof_dir: string;
  accepted_pushed_phase: string;
  accepted_validation: string;
  accepted_manual_qa: string;
  accepted_pushed: boolean;
  accepted_equality: string;
  local_bundle_phase: string;
  local_bundle_status: string;
  historical_prior_checkpoints: AcceptedCheckpoint[];
  next_postcss_status: string;
  v0912c_status: string;
  queue_015_status: string;
  real_doc_implementation_approved: boolean;
  package_version: string;
  product_version: string;
  prompt_version: string;
  public_data_pilot_approved?: boolean;
  public_source_ids?: string[];
  public_pilot_provider?: string;
  public_pilot_prompt_version?: string;
  cba_public_provider?: string;
  cba_public_prompt_version?: string;
  data_modes?: {
    fake_corpus: string;
    public_sources: string;
    private_data: string;
    external_ai: string;
  };
  package_json_changed: boolean;
  package_lock_changed: boolean;
}

export const currentAcceptedPushedState = currentAcceptedPushedStateJson as CurrentAcceptedPushedState;

export const historicalAcceptedPushedShortCommits = currentAcceptedPushedState.historical_prior_checkpoints
  .map((checkpoint) => checkpoint.short_commit)
  .join(", ");
