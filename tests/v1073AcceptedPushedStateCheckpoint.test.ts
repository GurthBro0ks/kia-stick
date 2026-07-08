import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = "KIA-Stick-v1.0.73-accepted-pushed-state-checkpoint";
const docPath = "docs/v1.0.73-accepted-pushed-state-checkpoint.md";

describe("v1.0.73 accepted pushed state checkpoint", () => {
  it("documents cf2be1f as the current accepted pushed closeout", () => {
    const doc = readFileSync(docPath, "utf8");
    for (const required of [phase, "Accepted pushed checkpoint: `v1.0.72 at cf2be1f`", "Accepted pushed commit: `cf2be1ffde6d52d6ad01f54f52ce8e8d7c937358`", "Accepted pushed proof: `/home/mint/kia-stick-local-proofs/proof_kia_stick_v1_0_68_to_v1_0_72_post_closeout_accepted_state_contract_refresh_20260708T172615Z/closeout_push_20260708T184656Z`", "Accepted equality: `HEAD == origin/main == cf2be1ffde6d52d6ad01f54f52ce8e8d7c937358`", "Prior current checkpoint `d099ff5` is historical only, not current.", "Prior checkpoints `73b3f38`, `5b7a575`, `720a58a`, `5c7f360`, `886631f`, `841dee7`, `870d3a7`, `87420e2`, `8b42744`, `b4b9fcf`, `20485da`, `97574a9`, `80e91c7`, `dfa7052`, `c72f14f`, `d20e125`, `bc8fbef`, `cfa7c2c`, `1465817` are historical only, not current."]) {
      expect(doc).toContain(required);
    }
  });

  it("tracks the accepted pushed checkpoint in feature state", () => {
    const state = JSON.parse(readFileSync("feature_list.json", "utf8")).v1073_accepted_pushed_state_checkpoint;
    expect(state.phase).toBe(phase);
    expect(state.status).toBe("accepted");
    expect(state.accepted_pushed_short_commit).toBe("cf2be1f");
    expect(state.prior_current_accepted_pushed_short_commit).toBe("d099ff5");
    expect(state.historical_prior_accepted_pushed_short_commits).toEqual(["d099ff5","73b3f38","5b7a575","720a58a","5c7f360","886631f","841dee7","870d3a7","87420e2","8b42744","b4b9fcf","20485da","97574a9","80e91c7","dfa7052","c72f14f","d20e125","bc8fbef","cfa7c2c","1465817"]);
    expect(state.accepted_pushed).toBe(true);
    expect(state.queue_015_status).toBe("blocked");
    expect(state.real_doc_implementation_approved).toBe(false);
  });
});
